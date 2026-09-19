import { expect, test } from '@playwright/test'
import { addDaysISO, FIXED_TODAY_ISO, installFixedClock, readStore, waitForPlanReady, type SeedTopic } from './utils.js'

/** F1: Subjects, exams and topics setup (with quick-add). Feature owner: P3. */

test.beforeEach(async ({ page }) => {
  await installFixedClock(page)
  await page.goto('/setup')
  await waitForPlanReady(page)
})

test('AC-P3-1: adding a subject with a colour shows it with that swatch and it survives a reload', async ({ page }) => {
  await page.getByTestId('subject-name-input').fill('Biology')
  await page.getByTestId('subject-color-rose').click()
  await page.getByTestId('subject-add').click()

  const item = page.getByTestId('subject-item').filter({ hasText: 'Biology' })
  await expect(item).toBeVisible()
  await expect(item.getByTestId('subject-swatch')).toHaveAttribute('data-color', '#f43f5e')

  await page.reload()
  const itemAfterReload = page.getByTestId('subject-item').filter({ hasText: 'Biology' })
  await expect(itemAfterReload).toBeVisible()
  await expect(itemAfterReload.getByTestId('subject-swatch')).toHaveAttribute('data-color', '#f43f5e')
})

test('AC-P3-2: adding an exam dated today+12 shows the countdown "in 12 days"', async ({ page }) => {
  await page.getByTestId('subject-name-input').fill('Biology')
  await page.getByTestId('subject-add').click()
  const subjectItem = page.getByTestId('subject-item').filter({ hasText: 'Biology' })
  await expect(subjectItem).toBeVisible()
  const subjectCard = subjectItem.locator('xpath=..')

  // A brand-new subject has no exams, so the exam form is open by default (no exam-add-open button).
  const examForm = subjectCard.getByTestId('exam-form')
  await examForm.getByTestId('exam-name-input').fill('Cell Biology Final')
  await examForm.getByTestId('exam-date-input').fill(addDaysISO(FIXED_TODAY_ISO, 12))
  await examForm.getByTestId('exam-add').click()

  const examItem = subjectCard.getByTestId('exam-item').filter({ hasText: 'Cell Biology Final' })
  await expect(examItem).toBeVisible()
  await expect(examItem.getByTestId('exam-countdown')).toHaveText('in 12 days')
})

test('AC-P3-3: quick-add with a blank line creates exactly 3 topics, estimate 2 / medium', async ({ page }) => {
  await page.getByTestId('subject-name-input').fill('Biology')
  await page.getByTestId('subject-add').click()
  const subjectItem = page.getByTestId('subject-item').filter({ hasText: 'Biology' })
  const subjectCard = subjectItem.locator('xpath=..')

  const examForm = subjectCard.getByTestId('exam-form')
  await examForm.getByTestId('exam-name-input').fill('Cell Biology Final')
  await examForm.getByTestId('exam-date-input').fill(addDaysISO(FIXED_TODAY_ISO, 12))
  await examForm.getByTestId('exam-add').click()

  const examItem = subjectCard.getByTestId('exam-item').filter({ hasText: 'Cell Biology Final' })
  await expect(examItem).toBeVisible()
  const examCard = examItem.locator('xpath=..')

  // A brand-new exam has no topics yet, so quick-add is expanded by default (per P3 handoff).
  const quickAddInput = examCard.getByTestId('quick-add-input')
  await quickAddInput.fill('Cells\nGenetics\n\nEvolution')
  await expect(examCard.getByTestId('quick-add-submit')).toHaveText('Add 3 topics')
  await examCard.getByTestId('quick-add-submit').click()

  const topics = examCard.getByTestId('topic-item')
  await expect(topics).toHaveCount(3)
  await expect(examCard.getByTestId('topic-name').getByText('Cells')).toBeVisible()
  await expect(examCard.getByTestId('topic-name').getByText('Genetics')).toBeVisible()
  await expect(examCard.getByTestId('topic-name').getByText('Evolution')).toBeVisible()
  for (const row of await topics.all()) {
    await expect(row.getByTestId('topic-estimate')).toHaveValue('2')
    await expect(row.getByTestId('topic-difficulty')).toHaveValue('medium')
  }
  await expect(page.getByTestId('toast').filter({ hasText: 'Added 3 topics' })).toBeVisible()
})

test('AC-P3-4: editing estimate/difficulty persists, and exam delete cascade works with a working cancel', async ({ page }) => {
  // Use the seeded "Chain Rule" topic under Calculus Midterm.
  const examItem = page.getByTestId('exam-item').filter({ hasText: 'Calculus Midterm' })
  await expect(examItem).toBeVisible()
  const examCard = examItem.locator('xpath=..')
  const topicRow = examCard.getByTestId('topic-item').filter({ hasText: 'Chain Rule' })
  await expect(topicRow).toBeVisible()

  await topicRow.getByTestId('topic-estimate').fill('4')
  await topicRow.getByTestId('topic-estimate').press('Enter')
  await topicRow.getByTestId('topic-difficulty').selectOption('hard')

  // Both writes are async (Dexie); wait for them to land before reloading.
  await expect
    .poll(async () => {
      const topics = await readStore<SeedTopic>(page, 'topics')
      const chainRule = topics.find((t) => t.name === 'Chain Rule')
      return chainRule ? `${chainRule.estimatePomodoros}:${chainRule.difficulty}` : null
    })
    .toBe('4:hard')

  await page.reload()
  const examItemAfter = page.getByTestId('exam-item').filter({ hasText: 'Calculus Midterm' })
  const topicRowAfter = examItemAfter.locator('xpath=..').getByTestId('topic-item').filter({ hasText: 'Chain Rule' })
  await expect(topicRowAfter.getByTestId('topic-estimate')).toHaveValue('4')
  await expect(topicRowAfter.getByTestId('topic-difficulty')).toHaveValue('hard')

  // Cancel removes nothing.
  const calcExam = page.getByTestId('exam-item').filter({ hasText: 'Calculus Midterm' })
  await calcExam.getByTestId('exam-delete').click()
  await expect(page.getByTestId('confirm-dialog')).toBeVisible()
  await page.getByTestId('confirm-cancel').click()
  await expect(page.getByTestId('exam-item').filter({ hasText: 'Calculus Midterm' })).toBeVisible()

  // Confirm removes the exam (and its topics/blocks).
  await calcExam.getByTestId('exam-delete').click()
  await expect(page.getByTestId('confirm-dialog')).toBeVisible()
  await page.getByTestId('confirm-ok').click()
  await expect(page.getByTestId('exam-item').filter({ hasText: 'Calculus Midterm' })).toHaveCount(0)
})

test('AC-P3-5: empty names, a past exam date and an out-of-range estimate are all rejected', async ({ page }) => {
  // Empty subject name.
  await page.getByTestId('subject-add').click()
  await expect(page.getByTestId('subject-name-input-error')).toBeVisible()

  // Empty exam name + past exam date, under an existing subject with existing exams (exam-add-open present).
  const mathSubject = page.getByTestId('subject-item').filter({ hasText: 'Mathematics' })
  const mathCard = mathSubject.locator('xpath=..')
  await mathCard.getByTestId('exam-add-open').click()
  const examForm = mathCard.getByTestId('exam-form')
  await examForm.getByTestId('exam-add').click()
  await expect(examForm.getByTestId('exam-name-input-error')).toBeVisible()

  await examForm.getByTestId('exam-name-input').fill('Past Exam')
  await examForm.getByTestId('exam-date-input').fill(addDaysISO(FIXED_TODAY_ISO, -1))
  await examForm.getByTestId('exam-add').click()
  await expect(examForm.getByTestId('exam-date-input-error')).toBeVisible()
  await expect(page.getByTestId('exam-item').filter({ hasText: 'Past Exam' })).toHaveCount(0)

  // Estimate outside 1-20 on an existing topic.
  const examItem = page.getByTestId('exam-item').filter({ hasText: 'Calculus Midterm' })
  const examCard = examItem.locator('xpath=..')
  const topicRow = examCard.getByTestId('topic-item').filter({ hasText: 'Chain Rule' })
  await topicRow.getByTestId('topic-estimate').fill('25')
  await topicRow.getByTestId('topic-estimate').press('Enter')
  await expect(topicRow.getByTestId('topic-estimate-error')).toBeVisible()
  // Reverts to the last saved value (2) on blur/invalid submit.
  await topicRow.getByTestId('topic-estimate').blur()
  await expect(topicRow.getByTestId('topic-estimate')).toHaveValue('2')
})
