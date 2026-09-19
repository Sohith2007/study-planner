import { expect, test } from '@playwright/test'
import { FIXED_TODAY_ISO, installFixedClock, readStore, waitForPlanReady, type SeedBlock } from './utils.js'

/** F7: Auto catch-up rescheduling (on open, Replan button, over-capacity warning). Owner: P1. */

test.beforeEach(async ({ page }) => {
  await installFixedClock(page)
})

test('AC-P1-6: on first open, no planned block is before today; catchup-notice reads "Moved 2 missed blocks"', async ({ page }) => {
  await page.goto('/today')
  await expect(page.getByTestId('catchup-notice')).toHaveText('Moved 2 missed blocks')

  const blocks = await readStore<SeedBlock>(page, 'blocks')
  expect(blocks.some((b) => b.status === 'planned' && b.date < FIXED_TODAY_ISO)).toBe(false)
  expect(blocks.some((b) => b.title === 'Derivatives' && b.date >= FIXED_TODAY_ISO)).toBe(true)
  expect(blocks.some((b) => b.title === 'Alkanes' && b.date >= FIXED_TODAY_ISO)).toBe(true)
})

test('AC-P1-7: replan leaves done/partial/skipped/manual/pinned blocks unchanged and is idempotent', async ({ page }) => {
  await page.goto('/today')
  await waitForPlanReady(page)

  const before = await readStore<SeedBlock>(page, 'blocks')
  const protectedBefore = before.filter((b) => b.status !== 'planned' || b.source === 'manual' || b.pinned)

  await page.getByTestId('replan-button').click()
  // Use .last() (not a bare filter): the previous toast's fade-out clone can still match
  // the same test id + text for a moment, which would otherwise violate strict mode.
  await expect(page.getByTestId('toast').filter({ hasText: 'Plan rebuilt' }).last()).toBeVisible()
  await waitForPlanReady(page)

  const afterFirst = await readStore<SeedBlock>(page, 'blocks')
  await page.getByTestId('replan-button').click()
  await expect(page.getByTestId('toast').filter({ hasText: 'Plan rebuilt' }).last()).toBeVisible()
  await waitForPlanReady(page)
  const afterSecond = await readStore<SeedBlock>(page, 'blocks')

  // Protected blocks keep the same id and date across both replans.
  for (const b of protectedBefore) {
    const a1 = afterFirst.find((x) => x.id === b.id)
    const a2 = afterSecond.find((x) => x.id === b.id)
    expect(a1, `${b.id} should survive replan #1`).toBeTruthy()
    expect(a1!.date).toBe(b.date)
    expect(a2, `${b.id} should survive replan #2`).toBeTruthy()
    expect(a2!.date).toBe(b.date)
  }

  // Running replan twice in a row yields the identical block set (ids + dates).
  const norm = (list: SeedBlock[]) =>
    list
      .map((b) => `${b.id}:${b.date}`)
      .sort()
      .join('|')
  expect(norm(afterSecond)).toBe(norm(afterFirst))
})

test('AC-P1-8: capacity 1 shows the over-capacity banner (44); Trim reviews lowers it; restoring capacity hides it', async ({ page }) => {
  await page.goto('/settings')
  await waitForPlanReady(page)
  for (const wd of [0, 1, 2, 3, 4, 5, 6]) {
    await page.getByTestId(`capacity-${wd}`).fill('1')
  }
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('toast').filter({ hasText: 'Settings saved' })).toBeVisible()
  await waitForPlanReady(page)

  await page.goto('/today')
  await waitForPlanReady(page)
  await expect(page.getByTestId('overcapacity-banner')).toBeVisible()
  await expect(page.getByTestId('overcapacity-total')).toContainText('44')

  await page.getByTestId('trim-reviews').click()
  await waitForPlanReady(page)
  await expect
    .poll(async () => {
      const text = await page.getByTestId('overcapacity-total').textContent().catch(() => null)
      return text
    })
    .not.toContain('44')

  // Restore the seed capacities.
  await page.goto('/settings')
  await waitForPlanReady(page)
  await page.getByTestId('capacity-1').fill('6')
  await page.getByTestId('capacity-2').fill('6')
  await page.getByTestId('capacity-3').fill('6')
  await page.getByTestId('capacity-4').fill('6')
  await page.getByTestId('capacity-5').fill('6')
  await page.getByTestId('capacity-6').fill('8')
  await page.getByTestId('capacity-0').fill('4')
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('toast').filter({ hasText: 'Settings saved' })).toBeVisible()
  await waitForPlanReady(page)

  await page.goto('/today')
  await waitForPlanReady(page)
  await expect(page.getByTestId('overcapacity-banner')).toHaveCount(0)
})
