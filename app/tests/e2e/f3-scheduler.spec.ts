import { execSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { FIXED_TODAY_ISO, installFixedClock, readStore, SEED, waitForPlanReady, type SeedBlock, type SeedTopic } from './utils.js'

/** F3: Auto plan generator (spaced, exam-backward, capacity-aware). Owner: P1. */

test.beforeEach(async ({ page }) => {
  await installFixedClock(page)
  await page.goto('/today')
  await waitForPlanReady(page)
})

test('AC-P1-1: uncovered topics get new blocks summing to their estimate; covered topics get no extra new blocks', async ({ page }) => {
  const blocks = await readStore<SeedBlock>(page, 'blocks')
  const topics = await readStore<SeedTopic>(page, 'topics')

  for (const topic of topics) {
    const newBlocks = blocks.filter((b) => b.topicId === topic.id && b.kind === 'new')
    if (topic.covered) {
      // Limits and Kinematics: only the single seeded, already-done block; no additional new work.
      expect(newBlocks.length, `${topic.name} covered topic should have exactly 1 new block`).toBe(1)
      expect(newBlocks[0].status).toBe('done')
    } else {
      const sum = newBlocks.reduce((n, b) => n + b.pomodoros, 0)
      expect(sum, `${topic.name} new-block pomodoros should sum to its estimate`).toBe(topic.estimatePomodoros)
    }
  }
})

test('AC-P1-2: no day exceeds its weekday capacity, and a blackout day gets no blocks', async ({ page }) => {
  const settings = (await readStore<{ dailyCapacity: number[] }>(page, 'settings'))[0]
  let blocks = await readStore<SeedBlock>(page, 'blocks')
  const byDate = new Map<string, number>()
  for (const b of blocks) {
    if (b.status === 'skipped') continue
    byDate.set(b.date, (byDate.get(b.date) ?? 0) + b.pomodoros)
  }
  for (const [date, total] of byDate) {
    const weekday = new Date(`${date}T00:00:00`).getDay()
    expect(total, `${date} (weekday ${weekday}) should be within capacity`).toBeLessThanOrEqual(settings.dailyCapacity[weekday])
  }

  // Now blacklist a date that currently has blocks and confirm it becomes empty after replan.
  const busyDate = [...byDate.keys()].find((d) => (byDate.get(d) ?? 0) > 0 && d >= FIXED_TODAY_ISO)
  expect(busyDate).toBeTruthy()
  await page.goto('/settings')
  await waitForPlanReady(page)
  await page.getByTestId('blackout-date-input').fill(busyDate!)
  await page.getByTestId('blackout-add').click()
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('toast').filter({ hasText: 'Settings saved' })).toBeVisible()
  await waitForPlanReady(page)
  await expect
    .poll(async () => {
      blocks = await readStore<SeedBlock>(page, 'blocks')
      return blocks.filter((b) => b.date === busyDate && b.source === 'auto' && !b.pinned).length
    })
    .toBe(0)
})

test('AC-P1-3: no block is on/after its exam date, no new block is the day before the exam', async ({ page }) => {
  const blocks = await readStore<SeedBlock>(page, 'blocks')
  const exams = await readStore<{ id: string; date: string }>(page, 'exams')
  const examById = new Map(exams.map((e) => [e.id, e.date]))
  for (const b of blocks) {
    if (!b.examId) continue
    const examDate = examById.get(b.examId)
    if (!examDate) continue
    expect(b.date < examDate, `block ${b.id} on ${b.date} should be before exam ${examDate}`).toBe(true)
    if (b.kind === 'new') {
      const dayBefore = new Date(`${examDate}T00:00:00`)
      dayBefore.setDate(dayBefore.getDate() - 1)
      const dayBeforeIso = dayBefore.toISOString().slice(0, 10)
      expect(b.date, `new block for exam ${b.examId} should not be the day before it`).not.toBe(dayBeforeIso)
    }
  }
})

test('AC-P1-4: a day with capacity >= 4 and 2+ pending exams has blocks from 2+ subjects', async ({ page }) => {
  const blocks = await readStore<SeedBlock>(page, 'blocks')
  const settings = (await readStore<{ dailyCapacity: number[] }>(page, 'settings'))[0]
  const exams = await readStore<{ id: string; date: string }>(page, 'exams')
  const today = FIXED_TODAY_ISO

  const byDate = new Map<string, SeedBlock[]>()
  for (const b of blocks) {
    if (b.date < today) continue
    if (!byDate.has(b.date)) byDate.set(b.date, [])
    byDate.get(b.date)!.push(b)
  }
  for (const [date, dayBlocks] of byDate) {
    const weekday = new Date(`${date}T00:00:00`).getDay()
    if (settings.dailyCapacity[weekday] < 4) continue
    const pendingExams = exams.filter(
      (e) => e.date > date && blocks.some((b) => b.examId === e.id && b.date >= date && b.status === 'planned'),
    )
    if (pendingExams.length < 2) continue
    const subjects = new Set(dayBlocks.map((b) => b.subjectId).filter(Boolean))
    expect(subjects.size, `${date} should interleave >= 2 subjects`).toBeGreaterThanOrEqual(2)
  }
})

test('AC-P1-5: marking a topic covered with confidence 1 adds exactly one extra review block', async ({ page }) => {
  // Cover an uncovered topic via Setup directly through Dexie writes would bypass the app;
  // instead do it the same way the product does: mark today's Derivatives block done, then Topic check.
  await page.goto('/today')
  await waitForPlanReady(page)

  const before = await readStore<SeedBlock>(page, 'blocks')
  const derivativesReviewsBefore = before.filter((b) => b.topicId === SEED.topics.derivatives && b.kind === 'review').length

  const row = page.getByTestId('today-block').filter({ has: page.getByTestId('block-title').getByText('Derivatives', { exact: true }) })
  await expect(row).toBeVisible()
  await row.getByTestId('block-done').click()

  const dialog = page.getByTestId('topic-check-dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByTestId('confidence-1').click()
  await dialog.getByTestId('topic-check-covered').click()
  await waitForPlanReady(page)

  await expect
    .poll(async () => {
      const after = await readStore<SeedBlock>(page, 'blocks')
      return after.filter((b) => b.topicId === SEED.topics.derivatives && b.kind === 'review').length
    })
    .toBe(derivativesReviewsBefore + 1)
})

test('AC-P1-9: npm run test:unit passes >= 12 scheduler/service tests', () => {
  const raw = execSync('npx vitest run src/logic/scheduler --reporter=default', { cwd: process.cwd(), encoding: 'utf-8' })
  // eslint-disable-next-line no-control-regex
  const out = raw.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
  const match = out.match(/Tests\s+(\d+)\s+passed/)
  expect(match, `expected a "Tests N passed" line in vitest output:\n${out}`).toBeTruthy()
  const count = Number(match![1])
  expect(count).toBeGreaterThanOrEqual(12)
  expect(out).not.toMatch(/\bfailed\b/i)
})
