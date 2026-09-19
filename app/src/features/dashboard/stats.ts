/**
 * Dashboard statistics (plan P5 task 1). Pure functions: no database, no clock.
 * Every function takes `today` explicitly so tests (and Playwright's page.clock) are deterministic.
 */
import type { Block, Exam, FocusSession, ISODate, OverflowItem, Subject, Topic } from '@/types'
import { addDaysISO, isoDateOfTimestamp, startOfWeekISO } from '@/lib/dates'

/** Series key used for focus sessions with no (existing) subject. */
export const UNLINKED_KEY = 'unlinked'

export interface ReadinessParts {
  /** Σ min(completedPomodoros, pomodoros) over the exam's new/review blocks. */
  done: number
  /** Unfinished pomodoros of planned/partial new/review blocks dated >= today, plus the exam's overflow. */
  remaining: number
  /** round(100 × done ÷ (done + remaining)); 0 when there is no work at all. */
  percent: number
}

/**
 * Exam readiness (master-plan P5 task 1):
 * readiness = round(100 * done / (done + remaining)).
 */
export function readiness(
  exam: Pick<Exam, 'id'>,
  blocks: readonly Block[],
  overflow: readonly OverflowItem[],
  today: ISODate,
): ReadinessParts {
  let done = 0
  let remaining = 0
  for (const b of blocks) {
    if (b.examId !== exam.id || (b.kind !== 'new' && b.kind !== 'review')) continue
    const completed = Math.max(0, Math.min(b.completedPomodoros, b.pomodoros))
    done += completed
    if ((b.status === 'planned' || b.status === 'partial') && b.date >= today) {
      remaining += Math.max(0, b.pomodoros - completed)
    }
  }
  remaining += overflowFor(exam.id, overflow)
  const total = done + remaining
  const percent = total > 0 ? Math.max(0, Math.min(100, Math.round((100 * done) / total))) : 0
  return { done, remaining, percent }
}

/** Total overflow pomodoros recorded for an exam in `meta.plan`. */
export function overflowFor(examId: string, overflow: readonly OverflowItem[]): number {
  return overflow.reduce((sum, o) => (o.examId === examId ? sum + Math.max(0, o.pomodoros) : sum), 0)
}

/** Topics covered for an exam: `{ covered, total }`. */
export function topicsCoverage(examId: string, topics: readonly Topic[]): { covered: number; total: number } {
  let covered = 0
  let total = 0
  for (const t of topics) {
    if (t.examId !== examId) continue
    total += 1
    if (t.covered) covered += 1
  }
  return { covered, total }
}

/** Exams dated today or later, sorted by date ascending (then name). */
export function upcomingExams<T extends Pick<Exam, 'date' | 'name'>>(exams: readonly T[], today: ISODate): T[] {
  return exams
    .filter((e) => e.date >= today)
    .sort((a, b) => (a.date === b.date ? a.name.localeCompare(b.name) : a.date < b.date ? -1 : 1))
}

function isFocus(s: FocusSession): boolean {
  return s.kind === 'focus'
}

/** Local date of a session (by its start). */
export function sessionDate(s: Pick<FocusSession, 'startedAt'>): ISODate {
  return isoDateOfTimestamp(s.startedAt)
}

function minutesOf(s: FocusSession): number {
  return Number.isFinite(s.actualMinutes) ? Math.max(0, s.actualMinutes) : 0
}

/** Focus minutes on `today` (Σ actualMinutes of focus sessions). */
export function focusMinutesToday(sessions: readonly FocusSession[], today: ISODate): number {
  return Math.round(sessions.reduce((sum, s) => (isFocus(s) && sessionDate(s) === today ? sum + minutesOf(s) : sum), 0))
}

/** Focus minutes this week: Monday of today's week through today. */
export function focusMinutesThisWeek(sessions: readonly FocusSession[], today: ISODate): number {
  const monday = startOfWeekISO(today)
  return Math.round(
    sessions.reduce((sum, s) => {
      if (!isFocus(s)) return sum
      const d = sessionDate(s)
      return d >= monday && d <= today ? sum + minutesOf(s) : sum
    }, 0),
  )
}

/** Number of completed focus sessions per local date. */
export function completedFocusByDay(sessions: readonly FocusSession[]): Map<ISODate, number> {
  const map = new Map<ISODate, number>()
  for (const s of sessions) {
    if (!isFocus(s) || !s.completed) continue
    const d = sessionDate(s)
    map.set(d, (map.get(d) ?? 0) + 1)
  }
  return map
}

/** Completed focus sessions today. */
export function completedFocusToday(sessions: readonly FocusSession[], today: ISODate): number {
  return completedFocusByDay(sessions).get(today) ?? 0
}

/**
 * Streak: consecutive days with completed focus sessions >= goal, counting back from today,
 * or from yesterday when today has not reached the goal yet.
 */
export function streak(sessions: readonly FocusSession[], today: ISODate, dailyGoal: number): number {
  const goal = Math.max(1, Math.floor(dailyGoal) || 1)
  const byDay = completedFocusByDay(sessions)
  const met = (d: ISODate) => (byDay.get(d) ?? 0) >= goal
  let day = met(today) ? today : addDaysISO(today, -1)
  let count = 0
  while (met(day)) {
    count += 1
    day = addDaysISO(day, -1)
  }
  return count
}

export interface SeriesKey {
  /** Subject id, or `UNLINKED_KEY` for free focus. */
  key: string
  name: string
  /** A subject hex colour, or a CSS variable for free focus. */
  color: string
}

export interface DayPoint {
  date: ISODate
  /** Minutes per series key. Every key in `keys` is present (0 when nothing). */
  values: Record<string, number>
  total: number
}

export interface WeekSeries {
  /** The 7 dates ending today, oldest first. */
  days: DayPoint[]
  /** Series with at least one focus session in the range: subjects by minutes (desc, then name), then free focus. */
  keys: SeriesKey[]
  /** True when there is at least one focus session in the range. */
  hasData: boolean
}

/**
 * Focus minutes by subject for the 7 days ending `today`.
 * Sessions with no subject, or whose subject was deleted, count as free focus.
 */
export function last7DaysSeries(
  sessions: readonly FocusSession[],
  subjects: readonly Pick<Subject, 'id' | 'name' | 'color'>[],
  today: ISODate,
  unlinkedColor = 'var(--fp-chart-unlinked)',
): WeekSeries {
  const dates = Array.from({ length: 7 }, (_, i) => addDaysISO(today, i - 6))
  const first = dates[0]
  const known = new Set(subjects.map((s) => s.id))
  const minutes = new Map<ISODate, Map<string, number>>()
  const used = new Set<string>()
  let hasData = false

  for (const s of sessions) {
    if (!isFocus(s)) continue
    const d = sessionDate(s)
    if (d < first || d > today) continue
    hasData = true
    const key = s.subjectId && known.has(s.subjectId) ? s.subjectId : UNLINKED_KEY
    used.add(key)
    const day = minutes.get(d) ?? new Map<string, number>()
    day.set(key, (day.get(key) ?? 0) + minutesOf(s))
    minutes.set(d, day)
  }

  const totalFor = (key: string) => {
    let t = 0
    for (const day of minutes.values()) t += day.get(key) ?? 0
    return t
  }
  // Largest contributor first (bottom of the stack and first in the legend), ties by name.
  const keys: SeriesKey[] = subjects
    .filter((s) => used.has(s.id))
    .map((s) => ({ key: s.id, name: s.name, color: s.color }))
    .sort((a, b) => totalFor(b.key) - totalFor(a.key) || a.name.localeCompare(b.name))
  if (used.has(UNLINKED_KEY)) keys.push({ key: UNLINKED_KEY, name: 'Free focus', color: unlinkedColor })

  const days = dates.map((date) => {
    const values: Record<string, number> = {}
    let total = 0
    for (const k of keys) {
      const v = Math.round(minutes.get(date)?.get(k.key) ?? 0)
      values[k.key] = v
      total += v
    }
    return { date, values, total }
  })

  return { days, keys, hasData }
}

/** "5 h 0 min" / "25 min". */
export function hoursMinutesLabel(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes))
  const h = Math.floor(m / 60)
  return h > 0 ? `${h} h ${m % 60} min` : `${m} min`
}

/** Nice Y-axis ticks from 0 covering `max` in at most 4 steps (e.g. 100 -> 0, 25, 50, 75, 100). */
export function minuteTicks(max: number): number[] {
  const steps = [5, 10, 15, 20, 25, 30, 50, 60, 75, 100, 120, 150, 200, 250, 300, 500, 600, 1000]
  const top = Math.max(1, Math.ceil(max))
  const step = steps.find((s) => s * 4 >= top) ?? Math.ceil(top / 4 / 100) * 100
  const n = Math.max(1, Math.ceil(top / step))
  return Array.from({ length: n + 1 }, (_, i) => i * step)
}
