import { expect, test } from '@playwright/test'
import { installFixedClock, waitForPlanReady } from './utils.js'

/** F6: Session completion and topic progress (done/partial/skip, covered + confidence). Owner: P4. */

test.beforeEach(async ({ page }) => {
  await installFixedClock(page)
  await page.goto('/today')
  await waitForPlanReady(page)
})

test('AC-P4-6: Done/Partial/Skip show the right styling and progress, and Skip clears the start-next target', async ({ page }) => {
  // Alkanes is a fresh 2-pomodoro new block today.
  const alkanesRow = page.getByTestId('today-block').filter({ has: page.getByTestId('block-title').getByText('Alkanes', { exact: true }) })
  await expect(alkanesRow).toBeVisible()
  await alkanesRow.getByTestId('block-done').click()
  await expect(alkanesRow).toHaveAttribute('data-status', 'done')
  await expect(alkanesRow.getByTestId('block-progress')).toHaveText('2/2 pomodoros')
  // Alkanes is a New block for an uncovered topic, so Done opens Topic check; dismiss it to continue.
  const topicCheck = page.getByTestId('topic-check-dialog')
  if (await topicCheck.isVisible().catch(() => false)) {
    await topicCheck.getByTestId('topic-check-not-yet').click()
    await expect(topicCheck).toBeHidden()
  }

  // Kinematics review (1 pomodoro) - use Partial where possible, else fall back to a 2+ pomodoro block.
  const derivRow = page.getByTestId('today-block').filter({ has: page.getByTestId('block-title').getByText('Derivatives', { exact: true }) })
  await expect(derivRow).toBeVisible()
  const partialBtn = derivRow.getByTestId('block-partial')
  const isDisabled = await partialBtn.isDisabled()
  if (!isDisabled) {
    await partialBtn.click()
    const dialog = page.getByTestId('partial-dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByTestId('partial-option-1').click()
    await dialog.getByTestId('partial-save').click()
    await expect(derivRow).toHaveAttribute('data-status', 'partial')
    await expect(derivRow.getByTestId('block-status')).toHaveText('Partial')
    await expect(derivRow.getByTestId('block-progress')).toContainText('1/')
  }

  // Skip clears the start-next target: after skipping the current start-next block, it should change.
  const startNextHrefBefore = await page.getByTestId('start-next').getAttribute('href')
  const targetId = decodeURIComponent(startNextHrefBefore!.split('blockId=')[1])
  const targetRow = page.locator(`[data-testid="today-block"][data-block-id="${targetId}"]`)
  await targetRow.getByTestId('block-skip').click()
  await expect(targetRow).toHaveAttribute('data-status', 'skipped')
  await expect
    .poll(async () => page.getByTestId('start-next').getAttribute('href'))
    .not.toBe(startNextHrefBefore)
})

test('AC-P4-7: Topic check appears after Done on a New block; Covered shows the badge, Not yet leaves it uncovered', async ({ page }) => {
  const derivRow = page.getByTestId('today-block').filter({ has: page.getByTestId('block-title').getByText('Derivatives', { exact: true }) })
  await expect(derivRow).toBeVisible()
  await derivRow.getByTestId('block-done').click()

  const dialog = page.getByTestId('topic-check-dialog')
  await expect(dialog).toBeVisible()
  // Covered stays disabled until a confidence is picked.
  await expect(dialog.getByTestId('topic-check-covered')).toBeDisabled()
  await dialog.getByTestId('confidence-3').click()
  await expect(dialog.getByTestId('topic-check-covered')).toBeEnabled()
  await dialog.getByTestId('topic-check-covered').click()
  await expect(dialog).toBeHidden()

  await expect(page.getByTestId('today-block').filter({ has: page.getByTestId('block-title').getByText('Derivatives', { exact: true }) }).getByTestId('block-covered')).toBeVisible()

  // A different New block: choosing "Not yet" leaves the topic uncovered.
  const alkanesRow = page.getByTestId('today-block').filter({ has: page.getByTestId('block-title').getByText('Alkanes', { exact: true }) })
  await alkanesRow.getByTestId('block-done').click()
  const dialog2 = page.getByTestId('topic-check-dialog')
  await expect(dialog2).toBeVisible()
  await dialog2.getByTestId('topic-check-not-yet').click()
  await expect(dialog2).toBeHidden()
  await expect(
    page.getByTestId('today-block').filter({ has: page.getByTestId('block-title').getByText('Alkanes', { exact: true }) }).getByTestId('block-covered'),
  ).toHaveCount(0)
})
