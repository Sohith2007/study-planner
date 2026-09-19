import { execSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { getNotifications, installFixedClock, readStore, stubNotifications, waitForPlanReady } from './utils.js'

/** F5: Pomodoro timer linked to blocks (timestamp-based, notifications, title, Flowtime). Owner: P2. */

test.beforeEach(async ({ page }) => {
  await installFixedClock(page)
  await stubNotifications(page, 'granted')
})

test('AC-P2-1: idle shows 25:00/Focus; Start counts down; Pause freezes; Resume continues', async ({ page }) => {
  await page.goto('/focus')
  await expect(page.getByTestId('timer-phase')).toHaveText('Focus')
  await expect(page.getByTestId('timer-display')).toHaveText('25:00')

  await page.getByTestId('timer-start').click()
  await page.clock.fastForward('00:03')
  await expect(page.getByTestId('timer-display')).not.toHaveText('25:00')

  await page.getByTestId('timer-pause').click()
  const paused = await page.getByTestId('timer-display').textContent()
  await page.clock.fastForward('00:05')
  await expect(page.getByTestId('timer-display')).toHaveText(paused!)

  await page.getByTestId('timer-resume').click()
  await page.clock.fastForward('00:02')
  await expect(page.getByTestId('timer-display')).not.toHaveText(paused!)
})

test('AC-P2-2: fast-forwarding 10 minutes shows ~15:00, and a reload keeps the timer running', async ({ page }) => {
  await page.goto('/focus')
  await page.getByTestId('timer-start').click()
  await page.clock.fastForward('10:00')
  await expect(page.getByTestId('timer-display')).toHaveText(/1[45]:0[0-9]|14:59/)

  await page.reload()
  await expect(page.getByTestId('timer-phase')).toHaveText('Focus')
  await expect(page.getByTestId('timer-pause')).toBeVisible()
  await expect(page.getByTestId('timer-display')).toHaveText(/1[45]:[0-5][0-9]/)
})

test('AC-P2-3: focus expiry goes to Short break 05:00; 4th focus gives Long break 15:00; Skip and Reset behave', async ({ page }) => {
  await page.goto('/focus')

  const doOneFocus = async () => {
    await page.getByTestId('timer-start').click()
    await page.clock.fastForward('25:01')
  }

  await doOneFocus()
  await expect(page.getByTestId('timer-phase')).toHaveText('Short break')
  await expect(page.getByTestId('timer-display')).toHaveText('05:00')

  // Skip the break (no crediting involved) and repeat for focuses 2-4.
  for (let i = 0; i < 2; i++) {
    await page.getByTestId('timer-skip').click()
    await expect(page.getByTestId('timer-phase')).toHaveText('Focus')
    await doOneFocus()
    await expect(page.getByTestId('timer-phase')).toHaveText('Short break')
  }
  await page.getByTestId('timer-skip').click()
  await expect(page.getByTestId('timer-phase')).toHaveText('Focus')
  await doOneFocus()
  await expect(page.getByTestId('timer-phase')).toHaveText('Long break')
  await expect(page.getByTestId('timer-display')).toHaveText('15:00')

  // Skip during a running focus doesn't credit a pomodoro.
  await page.getByTestId('timer-skip').click()
  await expect(page.getByTestId('timer-phase')).toHaveText('Focus')
  await page.getByTestId('timer-start').click()
  await page.clock.fastForward('00:05')
  const before = await readStore(page, 'sessions')
  await page.getByTestId('timer-skip').click()
  const after = await readStore(page, 'sessions')
  expect(after.length).toBe(before.length)

  // Reset returns to idle Focus 25:00.
  await page.getByTestId('timer-reset').click()
  await expect(page.getByTestId('timer-phase')).toHaveText('Focus')
  await expect(page.getByTestId('timer-display')).toHaveText('25:00')
})

test('AC-P2-4: document.title shows MM:SS - Focus - FocusPlan while running, and FocusPlan after Reset', async ({ page }) => {
  await page.goto('/focus')
  await page.getByTestId('timer-start').click()
  await page.clock.fastForward('00:02')
  await expect.poll(() => page.title()).toMatch(/^\d{2}:\d{2} · Focus — FocusPlan$/)

  await page.getByTestId('timer-reset').click()
  await expect.poll(() => page.title()).toBe('FocusPlan')
})

test('AC-P2-5: completing focuses on a planned 2-pomodoro block updates progress and status', async ({ page }) => {
  await page.goto('/today')
  await waitForPlanReady(page)
  const alkanesRow = page.getByTestId('today-block').filter({ has: page.getByTestId('block-title').getByText('Alkanes', { exact: true }) })
  await expect(alkanesRow).toBeVisible()
  await expect(alkanesRow.getByTestId('block-progress')).toHaveText('0/2 pomodoros')
  await alkanesRow.getByTestId('block-start').click()

  await expect(page.getByTestId('timer-active-block')).toBeVisible()
  await expect(page.getByTestId('timer-active-block-progress')).toContainText('0/2')

  await page.getByTestId('timer-start').click()
  await page.clock.fastForward('25:01')
  await expect(page.getByTestId('timer-active-block-progress')).toContainText('1/2')

  const sessions = await readStore<{ kind: string; completed: boolean; actualMinutes: number; plannedMinutes: number }>(page, 'sessions')
  const focusSessions = sessions.filter((s) => s.kind === 'focus' && s.completed)
  expect(focusSessions.some((s) => s.actualMinutes === 25 && s.plannedMinutes === 25)).toBe(true)

  await page.goto('/today')
  await waitForPlanReady(page)
  await expect(
    page.getByTestId('today-block').filter({ has: page.getByTestId('block-title').getByText('Alkanes', { exact: true }) }).getByTestId('block-progress'),
  ).toHaveText('1/2 pomodoros')

  // Second focus completes the block. The first focus left the timer idle in Short break, so skip
  // that break first to get back to an idle Focus for the same block before starting again.
  await page
    .getByTestId('today-block')
    .filter({ has: page.getByTestId('block-title').getByText('Alkanes', { exact: true }) })
    .getByTestId('block-start')
    .click()
  await expect(page.getByTestId('timer-phase')).toHaveText('Short break')
  await page.getByTestId('timer-skip').click()
  await expect(page.getByTestId('timer-phase')).toHaveText('Focus')
  await page.getByTestId('timer-start').click()
  await page.clock.fastForward('25:01')
  await expect(page.getByTestId('timer-active-block-progress')).toContainText('2/2')
})

test('AC-P2-6: a notification fires with permission granted; denied still completes with the inline hint and no errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/focus')
  await page.getByTestId('timer-start').click()
  await page.clock.fastForward('25:01')
  const notes = await getNotifications(page)
  expect(notes.some((n) => n.title.includes('Focus complete'))).toBe(true)
  expect(errors).toEqual([])
})

test('AC-P2-6b: with notifications denied, the timer still completes and shows the inline hint', async ({ page }) => {
  const errors: string[] = []
  await stubNotifications(page, 'denied')
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/focus')
  await expect(page.getByTestId('notifications-hint')).toBeVisible()
  await page.getByTestId('timer-start').click()
  await page.clock.fastForward('25:01')
  await expect(page.getByTestId('timer-phase')).toHaveText('Short break')
  expect(errors).toEqual([])
})

test('AC-P2-7: custom focus/short-break lengths from Settings apply to the idle timer and the next break', async ({ page }) => {
  await page.goto('/settings')
  await waitForPlanReady(page)
  await page.getByTestId('focus-minutes').fill('50')
  await page.getByTestId('short-break-minutes').fill('10')
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('toast').filter({ hasText: 'Settings saved' })).toBeVisible()

  await page.goto('/focus')
  await expect(page.getByTestId('timer-display')).toHaveText('50:00')
  await page.getByTestId('timer-start').click()
  await page.clock.fastForward('50:01')
  await expect(page.getByTestId('timer-phase')).toHaveText('Short break')
  await expect(page.getByTestId('timer-display')).toHaveText('10:00')
})

test('AC-P2-8: Flowtime counts up, and End focus starts a break of 1/5th the elapsed time', async ({ page }) => {
  await page.goto('/focus')
  await page.getByTestId('timer-mode-flowtime').click()
  await expect(page.getByTestId('timer-display')).toHaveText('00:00')
  await page.getByTestId('timer-start').click()
  await page.clock.fastForward('20:00')
  await expect(page.getByTestId('timer-display')).toHaveText(/20:0[0-2]/)

  await page.getByTestId('timer-end-flow').click()
  await expect(page.getByTestId('timer-phase')).toHaveText('Short break')
  await expect(page.getByTestId('timer-display')).toHaveText('04:00')

  const sessions = await readStore<{ kind: string; actualMinutes: number }>(page, 'sessions')
  expect(sessions.some((s) => s.kind === 'focus' && s.actualMinutes === 20)).toBe(true)
})

test('AC-P2-9: npm run test:unit passes >= 8 timer reducer tests', () => {
  const raw = execSync('npx vitest run src/logic/timer --reporter=default', { cwd: process.cwd(), encoding: 'utf-8' })
  // eslint-disable-next-line no-control-regex
  const out = raw.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
  const match = out.match(/Tests\s+(\d+)\s+passed/)
  expect(match, `expected a "Tests N passed" line in vitest output:\n${out}`).toBeTruthy()
  expect(Number(match![1])).toBeGreaterThanOrEqual(8)
  expect(out).not.toMatch(/\bfailed\b/i)
})
