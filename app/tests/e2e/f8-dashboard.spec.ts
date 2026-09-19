import { expect, test } from '@playwright/test'
import { addDaysISO, FIXED_TODAY_ISO, installFixedClock, readStore, waitForChart, waitForPlanReady } from './utils.js'

/** Monday of the week containing `iso` (matches the app's Monday-start week). */
function startOfWeekISO(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const jsDay = dt.getDay() // 0 = Sun
  const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay
  return addDaysISO(iso, diffToMonday)
}

/** F8: Dashboard and stats (readiness, countdown, focus minutes, 7-day chart, streak). Owner: P5. */

test.beforeEach(async ({ page }) => {
  await installFixedClock(page)
  await page.goto('/dashboard')
  await waitForPlanReady(page)
  await waitForChart(page)
})

test('AC-P5-1: 3 exam cards ordered by date, each with a 0-100% readiness and correct topic coverage', async ({ page }) => {
  const cards = page.getByTestId('exam-card')
  await expect(cards).toHaveCount(3)
  const names = await cards.locator('[data-testid="exam-card-name"]').allTextContents()
  expect(names).toEqual(['Organic Chemistry Quiz', 'Calculus Midterm', 'Mechanics Test'])

  const countdowns = await cards.locator('[data-testid="exam-countdown"]').allTextContents()
  expect(countdowns).toEqual(['in 7 days', 'in 10 days', 'in 14 days'])

  for (const card of await cards.all()) {
    const readinessText = await card.getByTestId('readiness').textContent()
    const pct = Number(readinessText!.replace('%', ''))
    expect(pct).toBeGreaterThanOrEqual(0)
    expect(pct).toBeLessThanOrEqual(100)
  }

  const coverage = await cards.locator('[data-testid="topics-covered"]').allTextContents()
  expect(coverage[0]).toContain('0/3')
  expect(coverage[1]).toContain('1/5')
  expect(coverage[2]).toContain('1/4')
})

test('AC-P5-2: marking a planned Calculus block Done increases Calculus readiness live', async ({ page }) => {
  const calcCard = page.getByTestId('exam-card').filter({ hasText: 'Calculus Midterm' })
  const before = Number((await calcCard.getByTestId('readiness').textContent())!.replace('%', ''))

  await page.goto('/today')
  await waitForPlanReady(page)
  const derivRow = page.getByTestId('today-block').filter({ has: page.getByTestId('block-title').getByText('Derivatives', { exact: true }) })
  await expect(derivRow).toBeVisible()
  await derivRow.getByTestId('block-done').click()
  const topicCheck = page.getByTestId('topic-check-dialog')
  if (await topicCheck.isVisible().catch(() => false)) {
    await topicCheck.getByTestId('topic-check-not-yet').click()
  }

  await page.goto('/dashboard')
  await waitForPlanReady(page)
  await waitForChart(page)
  await expect
    .poll(async () => {
      const card = page.getByTestId('exam-card').filter({ hasText: 'Calculus Midterm' })
      const text = await card.getByTestId('readiness').textContent()
      return Number(text!.replace('%', ''))
    })
    .toBeGreaterThan(before)
})

test('AC-P5-3: focus-week equals 25x(sessions this week) and focus-today is 0; after one session focus-today is 25', async ({ page }) => {
  const sessions = await readStore<{ kind: string; startedAt: string; actualMinutes: number }>(page, 'sessions')
  const weekStart = startOfWeekISO(FIXED_TODAY_ISO)
  const weekEnd = addDaysISO(weekStart, 7)
  const expectedWeekMinutes = sessions
    .filter((s) => s.kind === 'focus' && s.startedAt.slice(0, 10) >= weekStart && s.startedAt.slice(0, 10) < weekEnd)
    .reduce((n, s) => n + s.actualMinutes, 0)

  await expect(page.getByTestId('focus-today')).toHaveText('0')
  await expect(page.getByTestId('focus-week')).toHaveText(String(expectedWeekMinutes))

  await page.goto('/focus')
  await page.getByTestId('timer-start').click()
  await page.clock.fastForward('25:01')

  await page.goto('/dashboard')
  await waitForPlanReady(page)
  await waitForChart(page)
  await expect(page.getByTestId('focus-today')).toHaveText('25')
})

test('AC-P5-4: the chart renders 7 days with a legend naming Mathematics, Physics and Chemistry', async ({ page }) => {
  await expect(page.getByTestId('focus-chart')).toBeVisible()
  const legend = page.getByTestId('focus-chart-legend')
  await expect(legend).toContainText('Mathematics')
  await expect(legend).toContainText('Physics')
  await expect(legend).toContainText('Chemistry')
  const rows = page.getByTestId('focus-chart-table').locator('tbody tr')
  await expect(rows).toHaveCount(7)
})

test('AC-P5-5: streak-count is 5 on a fresh seed and 6 after completing 4 focus sessions today', async ({ page }) => {
  await expect(page.getByTestId('streak-count')).toHaveText('5')

  await page.goto('/focus')
  for (let i = 0; i < 4; i++) {
    await page.getByTestId('timer-start').click()
    await page.clock.fastForward('25:01')
    // Skip the break to go straight to the next idle focus.
    const phase = await page.getByTestId('timer-phase').textContent()
    if (phase !== 'Focus') {
      await page.getByTestId('timer-skip').click()
    }
  }

  await page.goto('/dashboard')
  await waitForPlanReady(page)
  await waitForChart(page)
  await expect(page.getByTestId('streak-count')).toHaveText('6')
})
