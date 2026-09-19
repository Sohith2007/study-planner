import { expect, test } from '@playwright/test'
import { addDaysISO, FIXED_TODAY_ISO, installFixedClock, waitForPlanReady } from './utils.js'

/** F4: Today and Week views (queue, grid, add/edit/move/delete, ad-hoc tasks). Owner: P4. */

test.beforeEach(async ({ page }) => {
  await installFixedClock(page)
})

test('AC-P4-1: Today shows blocks with topic, subject, kind badge and 0/n pomodoros; the manual task has a Task badge', async ({ page }) => {
  await page.goto('/today')
  await waitForPlanReady(page)

  const rows = page.getByTestId('today-block')
  await expect(rows.first()).toBeVisible()
  const count = await rows.count()
  expect(count).toBeGreaterThan(0)
  for (const row of await rows.all()) {
    await expect(row.getByTestId('block-title')).toBeVisible()
    await expect(row.getByTestId('block-kind')).toBeVisible()
    await expect(row.getByTestId('block-subject')).toBeVisible()
    await expect(row.getByTestId('block-progress')).toContainText('/')
  }

  const taskRow = rows.filter({ has: page.getByTestId('block-title').getByText('Problem set 3', { exact: true }) })
  await expect(taskRow).toBeVisible()
  await expect(taskRow.getByTestId('block-kind')).toHaveText('Task')
  await expect(taskRow.getByTestId('block-subject')).toContainText('Physics')
})

test('AC-P4-2: start-next opens Focus for the first planned block; all-done shows the empty state', async ({ page }) => {
  await page.goto('/today')
  await waitForPlanReady(page)

  const startNext = page.getByTestId('start-next')
  await expect(startNext).toBeVisible()
  const href = await startNext.getAttribute('href')
  expect(href).toMatch(/^\/focus\?blockId=/)
  await startNext.click()
  await expect(page).toHaveURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  await expect(page.getByTestId('timer-active-block')).toBeVisible()

  // Skip every row on Today (rows stay in the DOM, muted, once done/skipped per the design), then
  // check the all-done empty state. A tall viewport keeps the fixed toast region from overlapping
  // the queue (which would otherwise intercept clicks meant for the next row's Skip button).
  await page.setViewportSize({ width: 1280, height: 2400 })
  await page.goto('/today')
  await waitForPlanReady(page)
  await expect(page.getByTestId('today-block').first()).toBeVisible()
  // Re-query fresh each round (rows may reorder once skipped) and stop once none remain open.
  for (let i = 0; i < 20; i++) {
    const rows = page.getByTestId('today-block')
    const count = await rows.count()
    let target = null
    for (let j = 0; j < count; j++) {
      const r = rows.nth(j)
      const status = await r.getAttribute('data-status')
      if (status !== 'done' && status !== 'skipped') {
        target = r
        break
      }
    }
    if (!target) break
    await target.getByTestId('block-skip').click()
    await expect(target).toHaveAttribute('data-status', 'skipped')
  }
  await expect(page.getByTestId('today-empty')).toBeVisible()
  await expect(page.getByTestId('today-empty')).toContainText('All done for today')
})

test('AC-P4-3: Week shows 7 columns Mon-Sun with today highlighted; Next/Prev shift the week', async ({ page }) => {
  await page.goto('/week')
  await waitForPlanReady(page)

  const monday = '2026-06-15'
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i))
  for (const d of days) {
    await expect(page.locator(`[data-testid="week-day-${d}"]`)).toBeVisible()
  }
  await expect(page.locator(`[data-testid="week-day-${FIXED_TODAY_ISO}"]`)).toHaveAttribute('data-today', 'true')

  await page.getByTestId('week-next').click()
  const nextMonday = addDaysISO(monday, 7)
  await expect(page).toHaveURL(new RegExp(`start=${nextMonday}`))
  await expect(page.locator(`[data-testid="week-day-${nextMonday}"]`)).toBeVisible()

  await page.getByTestId('week-prev').click()
  await page.getByTestId('week-prev').click()
  const prevMonday = addDaysISO(monday, -7)
  await expect(page).toHaveURL(new RegExp(`start=${prevMonday}`))
})

test('AC-P4-4: adding a task shows it in Week with a Task badge, and it survives a replan', async ({ page }) => {
  await page.goto('/today')
  await waitForPlanReady(page)

  await page.getByTestId('add-task-open').click()
  const dialog = page.getByTestId('add-task-dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByTestId('add-task-title').fill('Read chapter 4')
  await dialog.getByTestId('add-task-date').fill(addDaysISO(FIXED_TODAY_ISO, 1))
  await dialog.getByTestId('add-task-pomodoros').fill('2')
  await dialog.getByTestId('add-task-subject').selectOption({ label: 'Physics' })
  await dialog.getByTestId('add-task-submit').click()
  await expect(page.getByTestId('toast').filter({ hasText: 'Task added' })).toBeVisible()

  await page.goto(`/week?start=${addDaysISO(FIXED_TODAY_ISO, 1)}`)
  await waitForPlanReady(page)
  const targetDay = page.locator(`[data-testid="week-day-${addDaysISO(FIXED_TODAY_ISO, 1)}"]`)
  const card = targetDay.getByTestId('block-card').filter({ hasText: 'Read chapter 4' })
  await expect(card).toBeVisible()
  await expect(card).toContainText('Task')

  await page.goto('/today')
  await waitForPlanReady(page)
  await page.getByTestId('replan-button').click()
  await expect(page.getByTestId('toast').filter({ hasText: 'Plan rebuilt' })).toBeVisible()
  await waitForPlanReady(page)

  await page.goto(`/week?start=${addDaysISO(FIXED_TODAY_ISO, 1)}`)
  await waitForPlanReady(page)
  await expect(
    page.locator(`[data-testid="week-day-${addDaysISO(FIXED_TODAY_ISO, 1)}"]`).getByTestId('block-card').filter({ hasText: 'Read chapter 4' }),
  ).toBeVisible()
})

test('AC-P4-5: moving a block (dialog + drag), editing its pomodoros, and deleting it all work', async ({ page }) => {
  await page.goto('/today')
  await waitForPlanReady(page)

  // Move via the dialog.
  const derivRow = page.getByTestId('today-block').filter({ has: page.getByTestId('block-title').getByText('Derivatives', { exact: true }) })
  await expect(derivRow).toBeVisible()
  await derivRow.getByTestId('block-menu').click()
  await derivRow.getByTestId('block-move').click()
  const moveDialog = page.getByTestId('block-move-dialog')
  await expect(moveDialog).toBeVisible()
  const target = addDaysISO(FIXED_TODAY_ISO, 2)
  await moveDialog.getByTestId('block-move-date').fill(target)
  await moveDialog.getByTestId('block-move-save').click()
  await expect(page.getByTestId('toast').filter({ hasText: 'Moved to' })).toBeVisible()

  await page.reload()
  await waitForPlanReady(page)
  await page.goto(`/week?start=${target}`)
  await waitForPlanReady(page)
  const movedCard = page.locator(`[data-testid="week-day-${target}"]`).getByTestId('block-card').filter({ hasText: 'Derivatives' })
  await expect(movedCard).toBeVisible()

  // Editing pomodoros persists.
  await movedCard.click()
  const editMenuItem = page.getByTestId('block-edit')
  await editMenuItem.click()
  const editDialog = page.getByTestId('block-edit-dialog')
  await expect(editDialog).toBeVisible()
  await editDialog.getByTestId('block-edit-pomodoros').fill('1')
  await editDialog.getByTestId('block-edit-save').click()
  await expect(page.getByTestId('toast').filter({ hasText: 'Block updated' })).toBeVisible()
  await page.reload()
  await waitForPlanReady(page)
  await expect(page.locator(`[data-testid="week-day-${target}"]`).getByTestId('block-card').filter({ hasText: 'Derivatives' })).toContainText('/1')

  // Drag to another column.
  const dragTarget = addDaysISO(FIXED_TODAY_ISO, 3)
  const sourceCard = page.locator(`[data-testid="week-day-${target}"]`).getByTestId('block-card').filter({ hasText: 'Derivatives' })
  const destColumn = page.locator(`[data-testid="week-day-${dragTarget}"]`)
  await sourceCard.dragTo(destColumn)
  await expect(destColumn.getByTestId('block-card').filter({ hasText: 'Derivatives' })).toBeVisible()
  await page.reload()
  await waitForPlanReady(page)
  await expect(page.locator(`[data-testid="week-day-${dragTarget}"]`).getByTestId('block-card').filter({ hasText: 'Derivatives' })).toBeVisible()

  // Delete after confirm.
  const cardToDelete = page.locator(`[data-testid="week-day-${dragTarget}"]`).getByTestId('block-card').filter({ hasText: 'Derivatives' })
  await cardToDelete.click()
  await page.getByTestId('block-delete').click()
  await expect(page.getByTestId('confirm-dialog')).toBeVisible()
  await page.getByTestId('confirm-ok').click()
  await expect(page.getByTestId('toast').filter({ hasText: 'Block deleted' })).toBeVisible()
  await expect(page.locator(`[data-testid="week-day-${dragTarget}"]`).getByTestId('block-card').filter({ hasText: 'Derivatives' })).toHaveCount(0)
})
