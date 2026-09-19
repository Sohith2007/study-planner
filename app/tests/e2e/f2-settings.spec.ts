import { expect, test } from '@playwright/test'
import { addDaysISO, FIXED_TODAY_ISO, installFixedClock, waitForPlanReady } from './utils.js'

/** F2: Study availability settings (weekday capacity, timer lengths, blackout dates, daily goal). Owner: P3. */

test.beforeEach(async ({ page }) => {
  await installFixedClock(page)
  await page.goto('/settings')
  await waitForPlanReady(page)
})

test('AC-P3-6: capacity inputs are prefilled Mon-Fri 6 / Sat 8 / Sun 4, and an edited value persists after reload', async ({ page }) => {
  await expect(page.getByTestId('capacity-1')).toHaveValue('6') // Mon
  await expect(page.getByTestId('capacity-2')).toHaveValue('6') // Tue
  await expect(page.getByTestId('capacity-3')).toHaveValue('6') // Wed
  await expect(page.getByTestId('capacity-4')).toHaveValue('6') // Thu
  await expect(page.getByTestId('capacity-5')).toHaveValue('6') // Fri
  await expect(page.getByTestId('capacity-6')).toHaveValue('8') // Sat
  await expect(page.getByTestId('capacity-0')).toHaveValue('4') // Sun

  await page.getByTestId('capacity-3').fill('3')
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('toast').filter({ hasText: 'Settings saved' })).toBeVisible()

  await page.reload()
  await expect(page.getByTestId('capacity-3')).toHaveValue('3')
})

test('AC-P3-7: timer/goal fields save and persist; out-of-range values show inline errors and are not saved', async ({ page }) => {
  // Invalid values: nothing is saved.
  await page.getByTestId('focus-minutes').fill('200')
  await page.getByTestId('daily-goal').fill('0')
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('focus-minutes-error')).toBeVisible()
  await expect(page.getByTestId('daily-goal-error')).toBeVisible()
  await expect(page.getByTestId('toast').filter({ hasText: 'Settings saved' })).toHaveCount(0)

  // Valid values: save and persist.
  await page.getByTestId('focus-minutes').fill('50')
  await page.getByTestId('short-break-minutes').fill('10')
  await page.getByTestId('long-break-minutes').fill('20')
  await page.getByTestId('long-break-every').fill('3')
  await page.getByTestId('daily-goal').fill('5')
  await page.getByTestId('timer-mode-default-flowtime').click()
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('toast').filter({ hasText: 'Settings saved' })).toBeVisible()

  await page.reload()
  await expect(page.getByTestId('focus-minutes')).toHaveValue('50')
  await expect(page.getByTestId('short-break-minutes')).toHaveValue('10')
  await expect(page.getByTestId('long-break-minutes')).toHaveValue('20')
  await expect(page.getByTestId('long-break-every')).toHaveValue('3')
  await expect(page.getByTestId('daily-goal')).toHaveValue('5')
  await expect(page.getByTestId('timer-mode-default-flowtime')).toBeChecked()
})

test('AC-P3-8: a blackout date can be added and removed; past dates are rejected', async ({ page }) => {
  const future = addDaysISO(FIXED_TODAY_ISO, 5)
  await page.getByTestId('blackout-date-input').fill(future)
  await page.getByTestId('blackout-add').click()
  await expect(page.locator(`[data-testid="blackout-item"][data-date="${future}"]`)).toBeVisible()

  // Past date rejected.
  const past = addDaysISO(FIXED_TODAY_ISO, -3)
  await page.getByTestId('blackout-date-input').fill(past)
  await page.getByTestId('blackout-add').click()
  await expect(page.getByTestId('blackout-date-input-error')).toBeVisible()
  await expect(page.locator(`[data-testid="blackout-item"][data-date="${past}"]`)).toHaveCount(0)

  // Remove the valid one.
  await page.locator(`[data-testid="blackout-item"][data-date="${future}"]`).getByTestId('blackout-remove').click()
  await expect(page.locator(`[data-testid="blackout-item"][data-date="${future}"]`)).toHaveCount(0)
})
