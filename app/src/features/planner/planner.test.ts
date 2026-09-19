import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildDemoSeed, db, SEED_IDS } from '@/db'
import type { Block } from '@/types'
import {
  addTask,
  deleteBlock,
  editBlock,
  formatWeekRange,
  markDone,
  markPartial,
  markSkipped,
  markTopicCovered,
  moveBlock,
  moveErrorText,
  nextTarget,
  normaliseWeekStart,
  plannedLoad,
  progressText,
  undoBlock,
  undoStatus,
  validateEdit,
  validateMoveDate,
  validateTask,
} from './planner'

const TODAY = '2026-09-19'

function block(p: Partial<Block>): Block {
  return {
    id: 'b',
    date: TODAY,
    order: 0,
    kind: 'new',
    topicId: null,
    examId: null,
    subjectId: null,
    title: 'x',
    pomodoros: 2,
    completedPomodoros: 0,
    status: 'planned',
    source: 'auto',
    pinned: false,
    reviewOffset: null,
    createdAt: '2026-09-19T00:00:00.000Z',
    ...p,
  }
}

describe('pure rules', () => {
  it('progress text is singular for one pomodoro', () => {
    expect(progressText(0, 2)).toBe('0/2 pomodoros')
    expect(progressText(0, 1)).toBe('0/1 pomodoro')
  })

  it('start-next target is the first planned or partial block by order', () => {
    const bs = [
      block({ id: 'c', order: 2 }),
      block({ id: 'a', order: 0, status: 'done' }),
      block({ id: 'b', order: 1, status: 'skipped' }),
      block({ id: 'd', order: 3, status: 'partial' }),
    ]
    expect(nextTarget(bs)?.id).toBe('c')
    expect(nextTarget(bs.filter((b) => b.id !== 'c'))?.id).toBe('d')
    expect(nextTarget([block({ status: 'done' })])).toBeNull()
  })

  it('planned load ignores skipped blocks', () => {
    expect(plannedLoad([block({ pomodoros: 2 }), block({ pomodoros: 3, status: 'skipped' }), block({ pomodoros: 1, status: 'done' })])).toBe(3)
  })

  it('undo status', () => {
    expect(undoStatus(0, 2)).toBe('planned')
    expect(undoStatus(1, 2)).toBe('partial')
    expect(undoStatus(2, 2)).toBe('planned')
  })

  it('formats week ranges within a month, across months and across years', () => {
    expect(formatWeekRange('2026-09-14')).toBe('14 – 20 Sep 2026')
    expect(formatWeekRange('2026-09-28')).toBe('28 Sep – 4 Oct 2026')
    expect(formatWeekRange('2026-12-28')).toBe('28 Dec 2026 – 3 Jan 2027')
  })

  it('normalises ?start= to a Monday or null', () => {
    expect(normaliseWeekStart('2026-09-17')).toBe('2026-09-14')
    expect(normaliseWeekStart('2026-09-14')).toBe('2026-09-14')
    expect(normaliseWeekStart('garbage')).toBeNull()
    expect(normaliseWeekStart(null)).toBeNull()
  })

  it('validates move dates', () => {
    const exam = { date: '2026-09-29' }
    expect(validateMoveDate('', TODAY, exam)).toBe('required')
    expect(validateMoveDate('2026-09-18', TODAY, exam)).toBe('past')
    expect(validateMoveDate('2026-09-29', TODAY, exam)).toBe('exam')
    expect(validateMoveDate('2026-09-21', TODAY, exam)).toBeNull()
    expect(validateMoveDate('2026-09-21', TODAY, exam, { blackoutDates: ['2026-09-21'] })).toBe('blackout')
    expect(moveErrorText('exam', '2026-09-29', '2026-09-30')).toBe(
      "That's on or after the exam (Tue 29 Sep). Pick an earlier day.",
    )
    expect(moveErrorText('past', undefined, '2026-09-18', true)).toBe("Can't move a block to a past day.")
    expect(moveErrorText('blackout', undefined, '2026-09-22')).toBe('Tue 22 Sep is a blackout day.')
  })

  it('validates the add-task form', () => {
    expect(validateTask({ title: '', date: '', pomodoros: '9', subjectId: '' }, TODAY)).toEqual({
      title: 'Give the task a title.',
      date: 'Pick a date.',
      pomodoros: 'Pomodoros must be 1–8.',
    })
    expect(validateTask({ title: 'A', date: '2026-09-18', pomodoros: '2', subjectId: '' }, TODAY)).toEqual({
      date: 'Pick today or a later date.',
    })
    expect(validateTask({ title: 'A', date: TODAY, pomodoros: '8', subjectId: '' }, TODAY)).toEqual({})
  })

  it('validates edits', () => {
    expect(validateEdit(block({ completedPomodoros: 1 }), { title: '', pomodoros: '0' })).toEqual({
      pomodoros: 'Pomodoros must be 1–8.',
    })
    expect(validateEdit(block({ completedPomodoros: 2, pomodoros: 3 }), { title: '', pomodoros: '1' })).toEqual({
      pomodoros: "Can't be less than the 2 pomodoros already done.",
    })
    expect(validateEdit(block({ kind: 'task' }), { title: ' ', pomodoros: '1' })).toEqual({
      title: 'Give the task a title.',
    })
  })
})

describe('Dexie actions', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
    const seed = buildDemoSeed(TODAY)
    await db.subjects.bulkAdd(seed.subjects)
    await db.exams.bulkAdd(seed.exams)
    await db.topics.bulkAdd(seed.topics)
    await db.blocks.bulkAdd([
      block({ id: 'b1', order: 0, pomodoros: 3 }),
      block({ id: 'b2', order: 1 }),
      block({ id: 'b3', date: '2026-09-21', order: 0 }),
    ])
  })

  it('done → undo restores the previous completed count and status', async () => {
    await markPartial('b1', 1)
    expect(await db.blocks.get('b1')).toMatchObject({ status: 'partial', completedPomodoros: 1 })
    await markDone('b1')
    expect(await db.blocks.get('b1')).toMatchObject({ status: 'done', completedPomodoros: 3 })
    await undoBlock('b1')
    expect(await db.blocks.get('b1')).toMatchObject({ status: 'partial', completedPomodoros: 1 })
  })

  it('skip → undo returns to planned', async () => {
    await markSkipped('b2')
    expect((await db.blocks.get('b2'))?.status).toBe('skipped')
    await undoBlock('b2')
    expect((await db.blocks.get('b2'))?.status).toBe('planned')
  })

  it('rejects an invalid partial count', async () => {
    await expect(markPartial('b2', 2)).rejects.toThrow()
  })

  it('move appends to the end of the target day and pins auto blocks', async () => {
    await moveBlock('b1', '2026-09-21')
    expect(await db.blocks.get('b1')).toMatchObject({ date: '2026-09-21', order: 1, pinned: true })
  })

  it('edit pins auto blocks and changes pomodoros', async () => {
    await editBlock('b2', { pomodoros: 1 })
    expect(await db.blocks.get('b2')).toMatchObject({ pomodoros: 1, pinned: true })
  })

  it('adds a manual task at the end of its day, and deletes it', async () => {
    const t = await addTask({ title: ' Read chapter 4 ', date: TODAY, pomodoros: 2, subjectId: SEED_IDS.subjects.physics })
    expect(t).toMatchObject({ kind: 'task', source: 'manual', title: 'Read chapter 4', order: 2, status: 'planned' })
    expect(await db.blocks.get(t.id)).toBeTruthy()
    await deleteBlock(t.id)
    expect(await db.blocks.get(t.id)).toBeUndefined()
  })

  it('topic check writes covered and confidence', async () => {
    const topicId = SEED_IDS.topics.derivatives
    await markTopicCovered(topicId, 3)
    expect(await db.topics.get(topicId)).toMatchObject({ covered: true, confidence: 3 })
  })
})
