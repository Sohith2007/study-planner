import { describe, expect, it } from 'vitest'
import { buildDemoSeed, SEED_IDS } from '@/db/seed'
import { addDaysISO } from '@/lib/dates'
import type { Block, FocusSession, OverflowItem } from '@/types'
import {
  completedFocusToday,
  focusMinutesThisWeek,
  focusMinutesToday,
  hoursMinutesLabel,
  minuteTicks,
  last7DaysSeries,
  readiness,
  streak,
  topicsCoverage,
  UNLINKED_KEY,
  upcomingExams,
} from './stats'

const TODAY = '2026-09-19' // a Saturday; Monday of that week is 2026-09-14
const seed = buildDemoSeed(TODAY, new Date('2026-09-19T08:00:00'))

function blk(p: Partial<Block>): Block {
  return {
    id: Math.random().toString(36).slice(2),
    date: TODAY,
    order: 0,
    kind: 'new',
    topicId: 't',
    examId: 'e1',
    subjectId: 's',
    title: 'x',
    pomodoros: 2,
    completedPomodoros: 0,
    status: 'planned',
    source: 'auto',
    pinned: false,
    reviewOffset: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    ...p,
  }
}

function focus(date: string, p: Partial<FocusSession> = {}, hh = 12): FocusSession {
  const start = new Date(`${date}T${String(hh).padStart(2, '0')}:00:00`)
  return {
    id: Math.random().toString(36).slice(2),
    kind: 'focus',
    blockId: null,
    topicId: null,
    examId: null,
    subjectId: SEED_IDS.subjects.math,
    startedAt: start.toISOString(),
    endedAt: new Date(start.getTime() + 25 * 60_000).toISOString(),
    plannedMinutes: 25,
    actualMinutes: 25,
    completed: true,
    pomodorosCredited: 1,
    ...p,
  }
}

describe('readiness', () => {
  const exam = { id: 'e1' }

  it('is round(100 * done / (done + remaining))', () => {
    const blocks = [
      blk({ status: 'done', completedPomodoros: 2, date: addDaysISO(TODAY, -2) }),
      blk({ status: 'planned', date: TODAY }),
      blk({ status: 'planned', date: addDaysISO(TODAY, 3), pomodoros: 3 }),
    ]
    // done 2, remaining 2 + 3 = 5 -> 29%
    expect(readiness(exam, blocks, [], TODAY)).toEqual({ done: 2, remaining: 5, percent: 29 })
  })

  it('counts partial progress and caps completed at pomodoros', () => {
    const blocks = [
      blk({ status: 'partial', completedPomodoros: 1, pomodoros: 3 }),
      blk({ status: 'done', completedPomodoros: 5, pomodoros: 2, kind: 'review' }),
    ]
    // done 1 + 2 = 3, remaining 2 -> 60%
    expect(readiness(exam, blocks, [], TODAY)).toEqual({ done: 3, remaining: 2, percent: 60 })
  })

  it('ignores past planned blocks, skipped blocks, tasks and other exams', () => {
    const blocks = [
      blk({ status: 'planned', date: addDaysISO(TODAY, -1) }),
      blk({ status: 'skipped' }),
      blk({ kind: 'task', status: 'planned' }),
      blk({ examId: 'other', status: 'done', completedPomodoros: 2 }),
      blk({ status: 'done', completedPomodoros: 1, pomodoros: 1 }),
    ]
    expect(readiness(exam, blocks, [], TODAY)).toEqual({ done: 1, remaining: 0, percent: 100 })
  })

  it('adds the exam overflow to remaining', () => {
    const overflow: OverflowItem[] = [
      { examId: 'e1', topicId: 't', kind: 'new', pomodoros: 4, reason: 'no-capacity' },
      { examId: 'e2', topicId: 't', kind: 'new', pomodoros: 9, reason: 'no-capacity' },
    ]
    const blocks = [blk({ status: 'done', completedPomodoros: 2 }), blk({ status: 'planned', pomodoros: 2 })]
    expect(readiness(exam, blocks, overflow, TODAY)).toEqual({ done: 2, remaining: 6, percent: 25 })
  })

  it('is 0 with no work at all', () => {
    expect(readiness(exam, [], [], TODAY).percent).toBe(0)
  })

  it('rises when a planned block is marked done (AC-P5-2)', () => {
    const planned = blk({ status: 'planned', pomodoros: 2 })
    const before = readiness(exam, [blk({ status: 'done', completedPomodoros: 2 }), planned], [], TODAY).percent
    const after = readiness(
      exam,
      [blk({ status: 'done', completedPomodoros: 2 }), { ...planned, status: 'done', completedPomodoros: 2 }],
      [],
      TODAY,
    ).percent
    expect(after).toBeGreaterThan(before)
  })
})

describe('exams and topics', () => {
  it('lists upcoming exams by date (seed order, AC-P5-1)', () => {
    const past = { ...seed.exams[0], id: 'past', name: 'Old', date: addDaysISO(TODAY, -1) }
    const list = upcomingExams([...seed.exams].reverse().concat(past), TODAY)
    expect(list.map((e) => e.name)).toEqual(['Organic Chemistry Quiz', 'Calculus Midterm', 'Mechanics Test'])
  })

  it('keeps an exam dated today', () => {
    expect(upcomingExams([{ name: 'A', date: TODAY }], TODAY)).toHaveLength(1)
  })

  it('counts covered topics on the seed (Calculus 1/5, Mechanics 1/4, Chemistry 0/3)', () => {
    const E = SEED_IDS.exams
    expect(topicsCoverage(E.math, seed.topics)).toEqual({ covered: 1, total: 5 })
    expect(topicsCoverage(E.physics, seed.topics)).toEqual({ covered: 1, total: 4 })
    expect(topicsCoverage(E.chemistry, seed.topics)).toEqual({ covered: 0, total: 3 })
  })
})

describe('focus minutes', () => {
  it('is 0 today and 25 x this-week sessions on the seed (AC-P5-3)', () => {
    expect(focusMinutesToday(seed.sessions, TODAY)).toBe(0)
    // Seed days are Mon 14 .. Fri 18 -> all 20 sessions are this week.
    expect(focusMinutesThisWeek(seed.sessions, TODAY)).toBe(500)
  })

  it('adds a completed 25-minute focus today', () => {
    const s = [...seed.sessions, focus(TODAY)]
    expect(focusMinutesToday(s, TODAY)).toBe(25)
    expect(focusMinutesThisWeek(s, TODAY)).toBe(525)
  })

  it('starts the week on Monday and ignores breaks', () => {
    const monday = '2026-09-14'
    const s = [
      focus(monday, { actualMinutes: 30 }),
      focus('2026-09-13', { actualMinutes: 40 }), // previous Sunday
      focus(TODAY, { kind: 'shortBreak', actualMinutes: 5 }),
      focus(TODAY, { actualMinutes: 12, completed: false }),
    ]
    expect(focusMinutesThisWeek(s, TODAY)).toBe(42)
    expect(focusMinutesToday(s, TODAY)).toBe(12)
    // On a Monday the week is just that day.
    expect(focusMinutesThisWeek(s, monday)).toBe(30)
  })

  it('counts only completed focus sessions toward the daily goal', () => {
    const s = [focus(TODAY), focus(TODAY, { completed: false }), focus(TODAY, { kind: 'longBreak' })]
    expect(completedFocusToday(s, TODAY)).toBe(1)
  })

  it('formats hours and minutes', () => {
    expect(hoursMinutesLabel(300)).toBe('5 h 0 min')
    expect(hoursMinutesLabel(500)).toBe('8 h 20 min')
    expect(hoursMinutesLabel(25)).toBe('25 min')
  })
})

describe('streak', () => {
  it('is 5 on the seed (AC-P5-5)', () => {
    expect(streak(seed.sessions, TODAY, 4)).toBe(5)
  })

  it('is 6 after 4 completed focus sessions today', () => {
    const today4 = [9, 10, 11, 12].map((h) => focus(TODAY, {}, h))
    expect(streak([...seed.sessions, ...today4], TODAY, 4)).toBe(6)
  })

  it('does not count today until the goal is met', () => {
    const today3 = [9, 10, 11].map((h) => focus(TODAY, {}, h))
    expect(streak([...seed.sessions, ...today3], TODAY, 4)).toBe(5)
  })

  it('breaks on a gap and ignores incomplete sessions', () => {
    const y = addDaysISO(TODAY, -1)
    const s = [
      ...[9, 10].map((h) => focus(y, {}, h)),
      focus(y, { completed: false }, 11),
      ...[9, 10].map((h) => focus(addDaysISO(TODAY, -3), {}, h)),
    ]
    expect(streak(s, TODAY, 2)).toBe(1)
    expect(streak(s, TODAY, 3)).toBe(0)
  })

  it('is 0 with no sessions', () => {
    expect(streak([], TODAY, 4)).toBe(0)
  })
})

describe('last 7 days series', () => {
  it('covers the 7 days ending today with the three seed subjects (AC-P5-4)', () => {
    const series = last7DaysSeries(seed.sessions, seed.subjects, TODAY)
    expect(series.days.map((d) => d.date)).toEqual([
      '2026-09-13',
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
    ])
    expect(series.keys.map((k) => k.name)).toEqual(['Mathematics', 'Physics', 'Chemistry'])
    expect(series.hasData).toBe(true)
    expect(series.days[0].total).toBe(0)
    expect(series.days[6].total).toBe(0)
    expect(series.days.slice(1, 6).map((d) => d.total)).toEqual([100, 100, 100, 100, 100])
    const sum = series.days.reduce((a, d) => a + d.values[SEED_IDS.subjects.math], 0)
    expect(sum).toBe(7 * 25) // 7 Mathematics sessions in the seed
  })

  it('puts sessions without an existing subject under Free focus', () => {
    const s = [focus(TODAY, { subjectId: null }), focus(TODAY, { subjectId: 'deleted' })]
    const series = last7DaysSeries(s, seed.subjects, TODAY)
    expect(series.keys).toEqual([{ key: UNLINKED_KEY, name: 'Free focus', color: 'var(--fp-chart-unlinked)' }])
    expect(series.days[6].values[UNLINKED_KEY]).toBe(50)
  })

  it('orders subjects by minutes in the range, then by name', () => {
    const P = SEED_IDS.subjects
    const s = [focus(TODAY, { subjectId: P.chemistry }), focus(TODAY, { subjectId: P.chemistry }), focus(TODAY, { subjectId: P.physics })]
    const series = last7DaysSeries(s, seed.subjects, TODAY)
    expect(series.keys.map((k) => k.name)).toEqual(['Chemistry', 'Physics'])
  })

  it('makes nice minute ticks', () => {
    expect(minuteTicks(100)).toEqual([0, 25, 50, 75, 100])
    expect(minuteTicks(25)).toEqual([0, 10, 20, 30])
    expect(minuteTicks(0)).toEqual([0, 5])
    expect(minuteTicks(180)).toEqual([0, 50, 100, 150, 200])
  })

  it('reports no data when nothing falls in the range', () => {
    const series = last7DaysSeries([focus(addDaysISO(TODAY, -7))], seed.subjects, TODAY)
    expect(series.hasData).toBe(false)
    expect(series.keys).toEqual([])
  })
})
