import { describe, expect, it } from 'vitest'
import { SEED_IDS } from '@/db/seed'
import { addDaysISO, weekdayOf } from '@/lib/dates'
import type { Block } from '@/types'
import {
  extraReviewOffset,
  generatePlan,
  isKeptBlock,
  largestReviewOffset,
  normalizeReviewOffsets,
  summarizeOverflow,
  trimmedReviewOffsets,
} from './index'
import {
  applied,
  block,
  exam,
  interleavingViolations,
  overflowTotal,
  planViolations,
  seedInput,
  subject,
  topic,
} from './testUtils'

const T = SEED_IDS.topics
const E = SEED_IDS.exams
/** Seven consecutive days (Mon 2026-09-14 ... Sun 2026-09-20), so every weekday is "today" once. */
const WEEK = Array.from({ length: 7 }, (_, i) => addDaysISO('2026-09-14', i))
const TODAY = '2026-09-16' // a Wednesday

const sum = (bs: Block[]) => bs.reduce((s, b) => s + b.pomodoros, 0)

describe('generatePlan on the demo seed', () => {
  it.each(WEEK)('AC-P1-1: plans every uncovered topic in full and nothing for covered ones (today %s)', (today) => {
    const input = seedInput(today)
    const result = generatePlan(input)
    expect(result.overflow).toEqual([])
    const blocks = applied(result)
    for (const t of input.topics) {
      const newBlocks = blocks.filter((b) => b.topicId === t.id && b.kind === 'new' && b.status === 'planned')
      if (t.covered) expect(newBlocks, t.name).toHaveLength(0)
      else expect(sum(newBlocks), t.name).toBe(t.estimatePomodoros)
      for (const b of newBlocks) expect(b.source).toBe('auto')
    }
  })

  it.each(WEEK)('keeps every invariant: capacity, cutoffs, block sizes, review order (today %s)', (today) => {
    const input = seedInput(today)
    expect(planViolations(input, generatePlan(input))).toEqual([])
  })

  it.each(WEEK)('AC-P1-4: interleaves subjects on every day with capacity >= 4 (today %s)', (today) => {
    const input = seedInput(today)
    expect(interleavingViolations(input, generatePlan(input))).toEqual([])
  })

  it('AC-P1-6: moves the two missed blocks to today or later and counts them as removed', () => {
    const input = seedInput(TODAY)
    const result = generatePlan(input)
    const missed = input.existingBlocks.filter((b) => b.status === 'planned' && b.date < TODAY).map((b) => b.id)
    expect(missed).toHaveLength(2)
    for (const id of missed) expect(result.removeIds).toContain(id)
    const blocks = applied(result)
    expect(blocks.filter((b) => b.status === 'planned' && b.date < TODAY)).toEqual([])
    for (const t of [T.derivatives, T.alkanes]) {
      expect(blocks.some((b) => b.topicId === t && b.kind === 'new' && b.date >= TODAY)).toBe(true)
    }
  })

  it('schedules something from every exam today, next to the manual task', () => {
    const result = generatePlan(seedInput(TODAY))
    const today = applied(result).filter((b) => b.date === TODAY)
    expect(today.map((b) => b.id)).toContain(SEED_IDS.manualTask)
    expect(new Set(today.map((b) => b.examId).filter(Boolean)).size).toBe(3)
    // The kept task keeps order 0; created blocks follow it.
    expect(today[0].id).toBe(SEED_IDS.manualTask)
    expect(today.map((b) => b.order)).toEqual(today.map((_, i) => i))
  })
})

describe('capacity and blackout days', () => {
  it('AC-P1-2: never exceeds the weekday capacity, counting kept blocks', () => {
    const input = seedInput(TODAY, { settings: { dailyCapacity: [2, 3, 3, 3, 3, 3, 2] } })
    const result = generatePlan(input)
    const load = new Map<string, number>()
    for (const b of applied(result)) if (b.date >= TODAY) load.set(b.date, (load.get(b.date) ?? 0) + b.pomodoros)
    for (const [d, n] of load) expect(n, d).toBeLessThanOrEqual(input.settings.dailyCapacity[weekdayOf(d)])
  })

  it('AC-P1-2: puts nothing on blackout dates, and a kept block uses up that day', () => {
    const blackoutDates = [TODAY, addDaysISO(TODAY, 1), addDaysISO(TODAY, 4)]
    const input = seedInput(TODAY, { settings: { blackoutDates } })
    const result = generatePlan(input)
    for (const d of blackoutDates) expect(result.create.filter((b) => b.date === d)).toEqual([])
    expect(planViolations(input, result)).toEqual([])
    // The manual task on today (a blackout) is kept where the user put it.
    expect(result.keep.map((b) => b.id)).toContain(SEED_IDS.manualTask)
  })

  it('a day with capacity 0 gets nothing', () => {
    const cap = [6, 6, 6, 0, 6, 6, 6] // Wednesdays off
    const result = generatePlan(seedInput(TODAY, { settings: { dailyCapacity: cap } }))
    expect(result.create.filter((b) => weekdayOf(b.date) === 3)).toEqual([])
  })
})

describe('exam cutoffs and reviews', () => {
  it('AC-P1-3: nothing on/after the exam, no new block on the day before, reviews after the last new block', () => {
    for (const today of WEEK) {
      const input = seedInput(today)
      const result = generatePlan(input)
      const examDate = new Map(input.exams.map((e) => [e.id, e.date]))
      for (const b of result.create) {
        const d = examDate.get(b.examId!)!
        expect(b.date < d).toBe(true)
        if (b.kind === 'new') expect(b.date <= addDaysISO(d, -2)).toBe(true)
      }
    }
  })

  it('reserves the day before an exam for reviews', () => {
    const input = {
      today: TODAY,
      subjects: [subject('s1')],
      exams: [exam('e1', 's1', addDaysISO(TODAY, 3))],
      topics: [topic('t1', 'e1', 4)],
      existingBlocks: [],
      settings: { ...seedInput(TODAY).settings, dailyCapacity: [8, 8, 8, 8, 8, 8, 8] },
      now: 'x',
    }
    const result = generatePlan(input)
    const dayBefore = addDaysISO(TODAY, 2)
    expect(result.create.filter((b) => b.date === dayBefore).map((b) => b.kind)).toEqual(['review'])
    expect(result.create.filter((b) => b.kind === 'new').every((b) => b.date <= addDaysISO(TODAY, 1))).toBe(true)
  })

  it('places reviews exactly at the configured offsets when there is room', () => {
    const input = {
      today: TODAY,
      subjects: [subject('s1')],
      exams: [exam('e1', 's1', addDaysISO(TODAY, 20))],
      topics: [topic('t1', 'e1', 2)],
      existingBlocks: [],
      settings: { ...seedInput(TODAY).settings, dailyCapacity: [8, 8, 8, 8, 8, 8, 8] },
      now: 'x',
    }
    const result = generatePlan(input)
    const news = result.create.filter((b) => b.kind === 'new')
    expect(news.map((b) => [b.date, b.pomodoros])).toEqual([[TODAY, 2]])
    const reviews = result.create.filter((b) => b.kind === 'review')
    expect(reviews.map((b) => [b.date, b.reviewOffset])).toEqual([
      [addDaysISO(TODAY, 1), 1],
      [addDaysISO(TODAY, 3), 3],
      [addDaysISO(TODAY, 7), 7],
    ])
  })

  it('drops review offsets that would land after the review deadline (not overflow)', () => {
    const input = {
      today: TODAY,
      subjects: [subject('s1')],
      exams: [exam('e1', 's1', addDaysISO(TODAY, 4))],
      topics: [topic('t1', 'e1', 2)],
      existingBlocks: [],
      settings: { ...seedInput(TODAY).settings, dailyCapacity: [8, 8, 8, 8, 8, 8, 8] },
      now: 'x',
    }
    const result = generatePlan(input)
    expect(result.overflow).toEqual([])
    // New today, +1 and +3 fit (deadline = exam - 1 = today + 3); +7 does not.
    expect(result.create.filter((b) => b.kind === 'review').map((b) => b.reviewOffset)).toEqual([1, 3])
  })

  it('AC-P1-5: confidence 1 adds exactly one extra review', () => {
    const base = seedInput(TODAY)
    const markCovered = (confidence: 1 | 2 | 3) =>
      base.topics.map((t) => (t.id === T.chainRule ? { ...t, covered: true, confidence } : t))
    const reviewsFor = (topics: typeof base.topics) =>
      generatePlan({ ...base, topics }).create.filter((b) => b.topicId === T.chainRule && b.kind === 'review')
    const conf2 = reviewsFor(markCovered(2))
    const conf1 = reviewsFor(markCovered(1))
    expect(conf1.length).toBe(conf2.length + 1)
    expect(conf1.map((b) => b.reviewOffset)).toContain(extraReviewOffset(base.settings.reviewOffsets))
    // And no new block for a covered topic.
    const plan = generatePlan({ ...base, topics: markCovered(1) })
    expect(plan.create.filter((b) => b.topicId === T.chainRule && b.kind === 'new')).toEqual([])
  })

  it('a done review satisfies its offset and is not planned again', () => {
    const base = seedInput(TODAY)
    const first = generatePlan(base)
    const r = first.create.find((b) => b.topicId === T.alkanes && b.kind === 'review')!
    const doneReview = { ...r, status: 'done' as const, completedPomodoros: 1 }
    const again = generatePlan({ ...base, existingBlocks: [...applied(first).filter((b) => b.id !== r.id), doneReview] })
    const offsets = applied(again)
      .filter((b) => b.topicId === T.alkanes && b.kind === 'review')
      .map((b) => b.reviewOffset)
    expect(offsets.filter((o) => o === r.reviewOffset)).toHaveLength(1)
  })

  it('overdue reviews collapse into one review today', () => {
    // Limits was studied at today-3 (seed): +1 and +3 are due; only one review lands today.
    const result = generatePlan(seedInput(TODAY))
    const limitsToday = result.create.filter((b) => b.topicId === T.limits && b.kind === 'review' && b.date === TODAY)
    expect(limitsToday).toHaveLength(1)
    expect(limitsToday[0].reviewOffset).toBe(3)
    expect(result.create.some((b) => b.topicId === T.limits && b.reviewOffset === 1)).toBe(false)
  })
})

describe('overflow and over-capacity', () => {
  it('AC-P1-8: capacity 1 overflows; trimming the largest offset lowers it; seed capacity clears it', () => {
    const tight = seedInput(TODAY, { settings: { dailyCapacity: [1, 1, 1, 1, 1, 1, 1] } })
    const r1 = generatePlan(tight)
    expect(overflowTotal(r1)).toBeGreaterThan(0)
    expect(planViolations(tight, r1)).toEqual([])
    const perExam = summarizeOverflow(r1.overflow)
    expect(perExam.byExam.map((e) => e.examId).sort()).toEqual(Object.values(E).sort())
    expect(perExam.total).toBe(overflowTotal(r1))

    const trimmed = { ...tight, settings: { ...tight.settings, reviewOffsets: trimmedReviewOffsets(tight.settings.reviewOffsets) } }
    expect(trimmed.settings.reviewOffsets).toEqual([1, 3])
    const r2 = generatePlan(trimmed)
    expect(overflowTotal(r2)).toBeLessThan(overflowTotal(r1))

    expect(generatePlan(seedInput(TODAY)).overflow).toEqual([])
  })

  it('reports new work of a passed exam as exam-passed', () => {
    const input = {
      ...seedInput(TODAY),
      exams: [exam('past', 's1', addDaysISO(TODAY, -1)), exam('today', 's1', TODAY)],
      topics: [topic('a', 'past', 3), topic('b', 'today', 2), topic('c', 'past', 2, { covered: true })],
      existingBlocks: [],
    }
    const result = generatePlan(input)
    expect(result.create).toEqual([])
    expect(result.overflow).toEqual([
      { examId: 'past', topicId: 'a', kind: 'new', pomodoros: 3, reason: 'exam-passed' },
      { examId: 'today', topicId: 'b', kind: 'new', pomodoros: 2, reason: 'exam-passed' },
    ])
    expect(summarizeOverflow(result.overflow).byExam.every((e) => e.examPassed)).toBe(true)
  })

  it('reports no-capacity overflow when the exam is tomorrow (no day left for new work)', () => {
    const input = {
      ...seedInput(TODAY),
      exams: [exam('e', 's1', addDaysISO(TODAY, 1))],
      topics: [topic('a', 'e', 2)],
      existingBlocks: [],
    }
    const result = generatePlan(input)
    expect(result.create).toEqual([])
    expect(result.overflow[0]).toMatchObject({ kind: 'new', pomodoros: 2, reason: 'no-capacity' })
    expect(summarizeOverflow(result.overflow).byExam[0].examPassed).toBe(false)
  })

  it('falls back to filling days when spreading work would not fit', () => {
    // 10 pomodoros, 5 days before the new-work deadline, 2 per day: only a full fill fits.
    const input = {
      today: TODAY,
      subjects: [subject('s1')],
      exams: [exam('e', 's1', addDaysISO(TODAY, 7))],
      topics: [1, 2, 3, 4, 5].map((i) => topic(`t${i}`, 'e', 2, { order: i })),
      existingBlocks: [],
      settings: { ...seedInput(TODAY).settings, dailyCapacity: [2, 2, 2, 2, 2, 2, 2], reviewOffsets: [] },
      now: 'x',
    }
    const result = generatePlan(input)
    expect(result.overflow).toEqual([])
    expect(sum(result.create)).toBe(10)
    expect(new Set(result.create.map((b) => b.date)).size).toBe(5)
  })
})

describe('determinism and kept blocks', () => {
  it('AC-P1-7: running the plan twice yields identical blocks (ids, dates, order)', () => {
    for (const today of WEEK) {
      const input = seedInput(today)
      const first = generatePlan(input)
      const second = generatePlan({ ...input, existingBlocks: applied(first) })
      const shape = (bs: Block[]) => bs.map((b) => `${b.id}@${b.date}#${b.order}x${b.pomodoros}`)
      expect(shape(applied(second))).toEqual(shape(applied(first)))
      expect(second.overflow).toEqual(first.overflow)
      // createdAt survives for blocks that already existed.
      const created = new Map(first.create.map((b) => [b.id, b.createdAt]))
      for (const b of second.create) expect(b.createdAt).toBe(created.get(b.id))
    }
  })

  it('AC-P1-7: keeps done, partial, skipped, pinned, manual and in-progress blocks unchanged', () => {
    const base = seedInput(TODAY)
    const first = applied(generatePlan(base))
    const autos = first.filter((b) => b.source === 'auto' && b.status === 'planned' && b.date >= TODAY)
    const [a, b, c, d, e] = autos
    const edited: Block[] = first.map((x) => {
      if (x.id === a.id) return { ...x, status: 'done', completedPomodoros: x.pomodoros }
      if (x.id === b.id) return { ...x, status: 'skipped' }
      if (x.id === c.id) return { ...x, pinned: true, date: addDaysISO(TODAY, 2) }
      if (x.id === d.id && x.pomodoros === 2) return { ...x, status: 'partial', completedPomodoros: 1 }
      if (x.id === e.id) return { ...x, completedPomodoros: x.pomodoros > 1 ? 1 : 0 }
      return x
    })
    const task = block('task-x', { kind: 'task', source: 'manual', date: addDaysISO(TODAY, 1), pomodoros: 2, title: 'Read chapter 4' })
    const before = [...edited, task]
    const result = generatePlan({ ...base, existingBlocks: before })
    const after = new Map(applied(result).map((x) => [x.id, x]))
    for (const x of before.filter(isKeptBlock)) {
      expect(after.get(x.id), x.id).toEqual(x)
    }
    expect(result.removeIds.every((id) => !before.find((x) => x.id === id && isKeptBlock(x)))).toBe(true)
    expect(planViolations({ ...base, existingBlocks: before }, result)).toEqual([])
  })

  it('isKeptBlock follows rule 7 and protects in-progress timer blocks', () => {
    const planned = block('p', {})
    expect(isKeptBlock(planned)).toBe(false)
    expect(isKeptBlock({ ...planned, status: 'done' })).toBe(true)
    expect(isKeptBlock({ ...planned, status: 'partial' })).toBe(true)
    expect(isKeptBlock({ ...planned, status: 'skipped' })).toBe(true)
    expect(isKeptBlock({ ...planned, pinned: true })).toBe(true)
    expect(isKeptBlock({ ...planned, source: 'manual' })).toBe(true)
    expect(isKeptBlock({ ...planned, completedPomodoros: 1, pomodoros: 2 })).toBe(true)
  })

  it('counts completed and still-planned kept work against the estimate', () => {
    const input = {
      today: TODAY,
      subjects: [subject('s1')],
      exams: [exam('e', 's1', addDaysISO(TODAY, 12))],
      topics: [topic('t', 'e', 7)],
      existingBlocks: [
        block('auto:t:new:1', { topicId: 't', examId: 'e', subjectId: 's1', date: addDaysISO(TODAY, -2), pomodoros: 2, completedPomodoros: 2, status: 'done' }),
        block('auto:t:new:2', { topicId: 't', examId: 'e', subjectId: 's1', date: addDaysISO(TODAY, -1), pomodoros: 2, completedPomodoros: 1, status: 'partial' }),
        block('auto:t:new:3', { topicId: 't', examId: 'e', subjectId: 's1', date: addDaysISO(TODAY, 5), pomodoros: 2, pinned: true }),
      ],
      settings: { ...seedInput(TODAY).settings, reviewOffsets: [] },
      now: 'x',
    }
    // 7 - (2 done + 1 partial) - 2 pinned still planned = 2 left.
    const result = generatePlan(input)
    expect(sum(result.create.filter((b) => b.kind === 'new'))).toBe(2)
    // Ids skip the ones already taken by kept blocks.
    expect(result.create.map((b) => b.id)).toEqual(['auto:t:new:4'])
  })

  it('does not re-plan a topic on the day the user skipped it', () => {
    const base = seedInput(TODAY)
    const first = applied(generatePlan(base))
    const target = first.find((b) => b.date === TODAY && b.kind === 'new')!
    const skipped = first.map((b) => (b.id === target.id ? { ...b, status: 'skipped' as const } : b))
    const result = generatePlan({ ...base, existingBlocks: skipped })
    const redo = result.create.filter((b) => b.topicId === target.topicId && b.kind === 'new')
    expect(sum(redo)).toBeGreaterThanOrEqual(target.pomodoros)
    expect(redo.every((b) => b.date > TODAY)).toBe(true)
  })

  it('handles an empty setup and a topic whose exam was deleted', () => {
    const empty = generatePlan({ ...seedInput(TODAY), subjects: [], exams: [], topics: [], existingBlocks: [] })
    expect(empty).toEqual({ keep: [], create: [], removeIds: [], overflow: [] })
    const orphan = generatePlan({ ...seedInput(TODAY), exams: [], existingBlocks: [] })
    expect(orphan.create).toEqual([])
    expect(orphan.overflow).toEqual([])
  })
})

describe('review offset helpers', () => {
  it('normalizes, trims and picks the extra offset', () => {
    expect(normalizeReviewOffsets([7, 1, 3, 3, 0, -2, 2.5])).toEqual([1, 2, 3, 7])
    expect(largestReviewOffset([1, 3, 7])).toBe(7)
    expect(largestReviewOffset([])).toBeNull()
    expect(trimmedReviewOffsets([7, 1, 3])).toEqual([1, 3])
    expect(extraReviewOffset([1, 3, 7])).toBe(2)
    expect(extraReviewOffset([1, 2, 3])).toBe(4)
    expect(extraReviewOffset([])).toBe(1)
  })
})

describe('property sweep', () => {
  const capacities: number[][] = [
    [4, 6, 6, 6, 6, 6, 8],
    [4, 4, 4, 4, 4, 4, 4],
    [5, 8, 8, 8, 8, 8, 5],
    [0, 6, 6, 6, 6, 6, 0],
  ]
  const days = Array.from({ length: 14 }, (_, i) => addDaysISO('2026-09-07', i))
  it('keeps all invariants and interleaving for 14 start days x 4 capacity profiles', () => {
    const problems: string[] = []
    for (const today of days) {
      for (const dailyCapacity of capacities) {
        for (const blackoutDates of [[], [addDaysISO(today, 2), addDaysISO(today, 5)]]) {
          const input = seedInput(today, { settings: { dailyCapacity, blackoutDates } })
          const result = generatePlan(input)
          const tag = `${today} cap=${dailyCapacity.join('')} bo=${blackoutDates.length}`
          for (const v of planViolations(input, result)) problems.push(`${tag}: ${v}`)
          if (result.overflow.length === 0) for (const v of interleavingViolations(input, result)) problems.push(`${tag}: ${v}`)
          const again = generatePlan({ ...input, existingBlocks: applied(result) })
          if (JSON.stringify(applied(again)) !== JSON.stringify(applied(result))) problems.push(`${tag}: not idempotent`)
        }
      }
    }
    expect(problems).toEqual([])
  })
})

describe('AC-P1-5 through the Today flow', () => {
  it('Done on a New block, then Covered with confidence 1, adds exactly one review (14 start days)', () => {
    const problems: string[] = []
    for (let i = 0; i < 14; i++) {
      const today = addDaysISO('2026-09-07', i)
      const base = seedInput(today)
      const first = applied(generatePlan(base))
      for (const b of first.filter((x) => x.date === today && x.kind === 'new')) {
        const blocks = first.map((x) => (x.id === b.id ? { ...x, status: 'done' as const, completedPomodoros: x.pomodoros } : x))
        const reviews = (confidence: 1 | 3) => {
          const topics = base.topics.map((t) => (t.id === b.topicId ? { ...t, covered: true, confidence } : t))
          return applied(generatePlan({ ...base, topics, existingBlocks: blocks })).filter(
            (x) => x.topicId === b.topicId && x.kind === 'review',
          ).length
        }
        const before = first.filter((x) => x.topicId === b.topicId && x.kind === 'review').length
        const conf1 = reviews(1)
        if (conf1 !== before + 1 || conf1 !== reviews(3) + 1) problems.push(`${today} ${b.title}`)
      }
    }
    expect(problems).toEqual([])
  })
})
