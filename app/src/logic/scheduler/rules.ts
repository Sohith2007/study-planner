/**
 * Small pure helpers shared by the scheduler engine, the plan service and the plan-status UI.
 */
import type { Block, OverflowItem, Settings } from '@/types'

/** Rule 2: new work is split into blocks of at most this many pomodoros. */
export const MAX_NEW_BLOCK_POMODOROS = 2

/**
 * Rule 7: blocks a replan keeps untouched (same id, same date).
 * Done / partial / skipped, pinned, manual, and planned blocks that already have credited
 * pomodoros (a 2-pomodoro block with 1 focus logged by the timer is still `planned`).
 */
export function isKeptBlock(b: Block): boolean {
  return b.status !== 'planned' || b.pinned || b.source === 'manual' || b.completedPomodoros > 0
}

/** A past-due block that catch-up removes and re-plans ("moved"). */
export function isMovedBlock(b: Block, today: string): boolean {
  return !isKeptBlock(b) && b.date < today
}

/** Positive integer offsets, unique, ascending. */
export function normalizeReviewOffsets(offsets: readonly number[] | undefined): number[] {
  const clean = (offsets ?? []).map((o) => Math.floor(Number(o))).filter((o) => Number.isFinite(o) && o >= 1)
  return [...new Set(clean)].sort((a, b) => a - b)
}

/**
 * Offset of the extra review a `confidence === 1` topic gets: one day after the first offset,
 * skipping values already used, so it never collides with a configured offset
 * ([1,3,7] gives 2, [1,2,3] gives 4, [] gives 1).
 */
export function extraReviewOffset(offsets: readonly number[]): number {
  const norm = normalizeReviewOffsets(offsets)
  let o = (norm[0] ?? 0) + 1
  while (norm.includes(o)) o++
  return o
}

/** The offset "Trim reviews" drops, or null when there is nothing left to trim. */
export function largestReviewOffset(offsets: readonly number[] | undefined): number | null {
  const norm = normalizeReviewOffsets(offsets)
  return norm.length ? norm[norm.length - 1] : null
}

/** Settings.reviewOffsets without its largest offset. */
export function trimmedReviewOffsets(offsets: readonly number[] | undefined): number[] {
  const norm = normalizeReviewOffsets(offsets)
  return norm.slice(0, -1)
}

/** Daily capacity for a JS weekday, clamped to a non-negative integer. */
export function capacityFor(settings: Pick<Settings, 'dailyCapacity'>, weekday: number): number {
  const v = Math.floor(Number(settings.dailyCapacity?.[weekday] ?? 0))
  return Number.isFinite(v) && v > 0 ? v : 0
}

export interface ExamOverflow {
  examId: string
  pomodoros: number
  /** True when every overflow item for this exam is because the exam date has passed. */
  examPassed: boolean
}

/** Groups overflow items per exam (input order preserved) for the over-capacity banner. */
export function summarizeOverflow(overflow: readonly OverflowItem[]): { total: number; byExam: ExamOverflow[] } {
  const map = new Map<string, ExamOverflow>()
  for (const item of overflow) {
    if (item.pomodoros <= 0) continue
    const cur = map.get(item.examId) ?? { examId: item.examId, pomodoros: 0, examPassed: true }
    cur.pomodoros += item.pomodoros
    cur.examPassed = cur.examPassed && item.reason === 'exam-passed'
    map.set(item.examId, cur)
  }
  const byExam = [...map.values()]
  return { total: byExam.reduce((s, e) => s + e.pomodoros, 0), byExam }
}
