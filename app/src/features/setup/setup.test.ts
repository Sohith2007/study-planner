import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, resetToDemo } from '@/db'
import type { Subject } from '@/types'
import {
  MSG,
  defaultSubjectColor,
  examCountdown,
  examDeleteMessage,
  parseEstimate,
  parseQuickAdd,
  quickAddLabel,
  subjectDeleteMessage,
  validateExamDate,
  validateExamName,
  validateSubjectName,
  validateTopicName,
} from './setupLogic'
import {
  addExam,
  addSubject,
  addTopics,
  deleteExamCascade,
  deleteTopic,
  examDeleteCounts,
  subjectDeleteCounts,
  uncoverTopic,
  updateTopic,
} from './setupRepo'

const subj = (id: string, name: string, color = '#6366F1'): Subject => ({ id, name, color, createdAt: '2026-01-01' })

describe('setup validation', () => {
  it('rejects empty and duplicate subject names (case-insensitive)', () => {
    const list = [subj('a', 'Biology')]
    expect(validateSubjectName('   ', list)).toBe(MSG.subjectEmpty)
    expect(validateSubjectName('biology ', list)).toBe('You already have a subject called Biology.')
    expect(validateSubjectName('Biology', list, 'a')).toBeNull()
    expect(validateSubjectName('Physics', list)).toBeNull()
  })

  it('validates exam name and date (today allowed, past rejected)', () => {
    expect(validateExamName('')).toBe(MSG.examEmpty)
    expect(validateExamDate('', '2026-09-19')).toBe(MSG.examDateMissing)
    expect(validateExamDate('2026-09-18', '2026-09-19')).toBe(MSG.examDatePast)
    expect(validateExamDate('2026-09-19', '2026-09-19')).toBeNull()
    expect(validateExamDate('2026-10-01', '2026-09-19')).toBeNull()
  })

  it('validates topic names and estimates 1-20', () => {
    expect(validateTopicName(' ')).toBe(MSG.topicEmpty)
    expect(parseEstimate('0')).toBeNull()
    expect(parseEstimate('21')).toBeNull()
    expect(parseEstimate('2.5')).toBeNull()
    expect(parseEstimate('')).toBeNull()
    expect(parseEstimate('1')).toBe(1)
    expect(parseEstimate(' 20 ')).toBe(20)
  })

  it('parses quick add: one per line, blanks skipped', () => {
    expect(parseQuickAdd('Cells\nGenetics\n\nEvolution')).toEqual(['Cells', 'Genetics', 'Evolution'])
    expect(parseQuickAdd('  \r\n \n')).toEqual([])
    expect(quickAddLabel(0)).toBe('Add topics')
    expect(quickAddLabel(1)).toBe('Add 1 topic')
    expect(quickAddLabel(3)).toBe('Add 3 topics')
  })

  it('formats the countdown', () => {
    const today = '2026-09-19'
    expect(examCountdown('2026-10-01', today)).toEqual({ label: 'in 12 days', tone: 'normal' })
    expect(examCountdown('2026-09-19', today)).toEqual({ label: 'today', tone: 'soon' })
    expect(examCountdown('2026-09-20', today).label).toBe('tomorrow')
    expect(examCountdown('2026-09-22', today).tone).toBe('soon')
    expect(examCountdown('2026-09-18', today)).toEqual({ label: '1 day ago', tone: 'past' })
    expect(examCountdown('2026-09-16', today).label).toBe('3 days ago')
  })

  it('picks the first unused preset colour', () => {
    expect(defaultSubjectColor([])).toBe('#6366F1')
    expect(defaultSubjectColor([{ color: '#6366f1' }, { color: '#F59E0B' }, { color: '#10B981' }])).toBe('#F43F5E')
  })

  it('writes delete confirm copy with plurals', () => {
    expect(subjectDeleteMessage({ exams: 1, topics: 5, plannedBlocks: 9 })).toBe(
      'This also deletes 1 exam, 5 topics and 9 planned blocks. Your focus history stays in your stats.',
    )
    expect(examDeleteMessage({ topics: 5, blocks: 9 })).toBe(
      'This also deletes its 5 topics and 9 blocks. Your focus history stays in your stats.',
    )
    expect(examDeleteMessage({ topics: 1, blocks: 0 })).toBe(
      'This also deletes its 1 topic. Your focus history stays in your stats.',
    )
  })
})

describe('setup repo', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('adds a subject, an exam and quick-add topics with defaults and increasing order', async () => {
    const s = await addSubject('  Biology ', '#F43F5E')
    const e = await addExam(s, 'Cell Biology Final', '2026-10-01')
    const ids = await addTopics(e, parseQuickAdd('Cells\nGenetics\n\nEvolution').map((name) => ({ name })))
    expect(ids).toHaveLength(3)
    expect((await db.subjects.get(s))?.name).toBe('Biology')
    const topics = await db.topics.where('examId').equals(e).sortBy('order')
    expect(topics.map((t) => [t.name, t.estimatePomodoros, t.difficulty, t.covered, t.order])).toEqual([
      ['Cells', 2, 'medium', false, 0],
      ['Genetics', 2, 'medium', false, 1],
      ['Evolution', 2, 'medium', false, 2],
    ])
    await addTopics(e, [{ name: 'Ecology', estimatePomodoros: 4, difficulty: 'hard' }])
    const last = (await db.topics.where('examId').equals(e).sortBy('order')).at(-1)
    expect(last).toMatchObject({ name: 'Ecology', estimatePomodoros: 4, difficulty: 'hard', order: 3 })
  })

  it('edits and un-covers topics', async () => {
    await resetToDemo()
    await updateTopic('seed-topic-derivatives', { estimatePomodoros: 4, difficulty: 'hard' })
    expect(await db.topics.get('seed-topic-derivatives')).toMatchObject({ estimatePomodoros: 4, difficulty: 'hard' })
    await uncoverTopic('seed-topic-limits')
    expect(await db.topics.get('seed-topic-limits')).toMatchObject({ covered: false, confidence: null })
  })

  it('counts and cascades an exam delete; a topic delete keeps finished blocks', async () => {
    await resetToDemo()
    const exam = await db.topics.get('seed-topic-limits').then((t) => t!.examId)
    const counts = await examDeleteCounts(exam)
    expect(counts.topics).toBe(5)
    expect(counts.blocks).toBeGreaterThan(0)
    const subjectCounts = await subjectDeleteCounts('seed-subject-math')
    expect(subjectCounts).toMatchObject({ exams: 1, topics: 5 })

    // Topic delete: the done Limits block stays, the topic goes.
    await deleteTopic('seed-topic-limits')
    expect(await db.topics.get('seed-topic-limits')).toBeUndefined()
    const limitsBlocks = await db.blocks.where('topicId').equals('seed-topic-limits').toArray()
    expect(limitsBlocks.every((b) => b.status !== 'planned')).toBe(true)
    expect(limitsBlocks.length).toBeGreaterThan(0)

    await deleteExamCascade(exam)
    expect(await db.exams.get(exam)).toBeUndefined()
    expect(await db.topics.where('examId').equals(exam).count()).toBe(0)
    expect(await db.blocks.where('examId').equals(exam).count()).toBe(0)
  })
})
