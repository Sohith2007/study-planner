import { expect, test } from '@playwright/test'
import { installFixedClock, waitForPlanReady } from './utils.js'

/** F9: Local-first persistence, JSON export/import, reset demo / clear data. Owner: P5. */

test.beforeEach(async ({ page }) => {
  await installFixedClock(page)
  await page.goto('/data')
  await waitForPlanReady(page)
})

test('AC-P5-6: exporting downloads focusplan-backup-<today>.json with app/version/counts', async ({ page }) => {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-button').click()])
  expect(download.suggestedFilename()).toBe('focusplan-backup-2026-06-17.json')
  const path = await download.path()
  expect(path).toBeTruthy()
  const fs = await import('node:fs/promises')
  const content = JSON.parse(await fs.readFile(path!, 'utf-8'))
  expect(content.app).toBe('focusplan')
  expect(content.version).toBe(1)
  expect(content.subjects).toHaveLength(3)
  expect(content.exams).toHaveLength(3)
  expect(content.topics).toHaveLength(12)
})

test('AC-P5-7: clear-all empties everything and Today/Dashboard show empty states; import restores; a bad file errors and changes nothing', async ({ page }) => {
  // Export first so we have something valid to re-import later.
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-button').click()])
  const backupPath = await download.path()
  expect(backupPath).toBeTruthy()

  // Clear all.
  await page.getByTestId('clear-all').click()
  await expect(page.getByTestId('confirm-dialog')).toBeVisible()
  await page.getByTestId('confirm-ok').click()
  await expect(page.getByTestId('toast').filter({ hasText: 'All data cleared' })).toBeVisible()
  await expect(page.getByTestId('data-summary')).toContainText('0 subjects')

  await page.goto('/today')
  await waitForPlanReady(page)
  await expect(page.getByTestId('today-empty')).toBeVisible()
  await expect(page.getByTestId('empty-setup-link')).toBeVisible()

  await page.goto('/dashboard')
  await waitForPlanReady(page)
  await expect(page.getByTestId('exam-card')).toHaveCount(0)

  // Malformed import: nothing changes.
  await page.goto('/data')
  await waitForPlanReady(page)
  const badFile = { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('not json') }
  await page.getByTestId('import-input').setInputFiles(badFile)
  await expect(page.getByTestId('import-error')).toBeVisible()
  await expect(page.getByTestId('data-summary')).toContainText('0 subjects')

  // Valid import: restores the backup.
  await page.getByTestId('import-input').setInputFiles(backupPath!)
  await expect(page.getByTestId('confirm-dialog')).toBeVisible()
  await page.getByTestId('confirm-ok').click()
  await expect(page.getByTestId('toast').filter({ hasText: 'Backup imported' })).toBeVisible()
  await expect(page.getByTestId('data-summary')).toContainText('3 subjects')
  await expect(page.getByTestId('data-summary')).toContainText('3 exams')
  await expect(page.getByTestId('data-summary')).toContainText('12 topics')
})

test('AC-P5-8: reset-demo restores the seed (3 subjects, streak 5)', async ({ page }) => {
  await page.getByTestId('clear-all').click()
  await page.getByTestId('confirm-ok').click()
  await expect(page.getByTestId('toast').filter({ hasText: 'All data cleared' })).toBeVisible()

  await page.getByTestId('reset-demo').click()
  await expect(page.getByTestId('confirm-dialog')).toBeVisible()
  await page.getByTestId('confirm-ok').click()
  await expect(page.getByTestId('toast').filter({ hasText: 'Demo semester loaded' })).toBeVisible()
  await expect(page.getByTestId('data-summary')).toContainText('3 subjects')

  await page.goto('/dashboard')
  await waitForPlanReady(page)
  await expect(page.getByTestId('streak-count')).toHaveText('5')
})

test('AC-P5-9: no requests to any other origin during a full session, and Setup data survives a reload', async ({ page }) => {
  const foreign: string[] = []
  page.on('request', (r) => {
    if (!r.url().startsWith('http://localhost:5173')) foreign.push(r.url())
  })

  for (const route of ['/today', '/week', '/setup', '/settings', '/dashboard', '/data']) {
    await page.goto(route)
    await waitForPlanReady(page)
  }
  // plan-status is not rendered on /focus, so it doesn't go through waitForPlanReady.
  await page.goto('/focus')
  await expect(page.getByTestId('timer-display')).toBeVisible()
  await page.getByTestId('timer-start').click()
  await page.clock.fastForward('00:05')

  await page.goto('/setup')
  await waitForPlanReady(page)
  await page.getByTestId('subject-name-input').fill('Geography')
  await page.getByTestId('subject-add').click()
  await expect(page.getByTestId('subject-item').filter({ hasText: 'Geography' })).toBeVisible()

  await page.reload()
  await waitForPlanReady(page)
  await expect(page.getByTestId('subject-item').filter({ hasText: 'Geography' })).toBeVisible()

  expect(foreign).toEqual([])
})
