/**
 * Test helpers for the scheduler (imported by *.test.ts only; not used by the app).
 */
import type { Block, Exam, Settings, Subject, Topic } from '@/types'
import { buildDemoSeed } from '@/db/seed'
import { addDaysISO, weekdayOf } from '@/lib/dates'
import type { PlanInput, PlanResult } from './types'
import { EARLY_REVIEW_DAYS } from './engine'
import { capacityFor, extraReviewOffset, normalizeReviewOffsets } from './rules'

export const NOW = '2026-01-01T00:00:00.000Z'

/** A PlanInput built from the demo seed for `today`, with optional overrides. */
export function seedInput(today: string, patch: Partial<Omit<PlanInput, 'settings'>> & { settings?: Partial<Settings> } = {}): PlanInput {
  const s = buildDemoSeed(today)
  return {
    today,
    subjects: patch.subjects ?? s.subjects,
    exams: patch.exams ?? s.exams,
    topics: patch.topics ?? s.topics,
    existingBlocks: patch.existingBlocks ?? s.blocks,
    settings: { ...s.settings, ...(patch.settings ?? {}) },
    now: patch.now ?? NOW,
  }
}

/** The block table after applying a plan result. */
export function applied(result: PlanResult): Block[] {
  return [...result.keep, ...result.create].sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order || a.id.localeCompare(b.id))
}

export function overflowTotal(result: PlanResult): number {
  return result.overflow.reduce((s, o) => s + o.pomodoros, 0)
}

export function subject(id: string, name = id): Subject {
  return { id, name, color: '#6366F1', createdAt: NOW }
}
export function exam(id: string, subjectId: string, date: string): Exam {
  return { id, subjectId, name: id, date, createdAt: NOW }
}
export function topic(id: string, examId: string, estimatePomodoros: number, extra: Partial<Topic> = {}): Topic {
  return { id, examId, name: id, estimatePomodoros, difficulty: 'medium', covered: false, confidence: null, order: 0, ...extra }
}
export function block(id: string, patch: Partial<Block>): Block {
  return {
    id,
    date: '2026-01-01',
    order: 0,
    kind: 'new',
    topicId: null,
    examId: null,
    subjectId: null,
    title: id,
    pomodoros: 1,
    completedPomodoros: 0,
    status: 'planned',
    source: 'auto',
    pinned: false,
    reviewOffset: null,
    createdAt: NOW,
    ...patch,
  }
}

/**
 * Checks the invariants every plan must satisfy and returns human-readable violations
 * (an empty array means the plan is valid).
 */
export function planViolations(input: PlanInput, result: PlanResult): string[] {
  const out: string[] = []
  const blocks = applied(result)
  const examById = new Map(input.exams.map((e) => [e.id, e]))
  const blackout = new Set(input.settings.blackoutDates)

  // Capacity per future day (created blocks may never push a day over capacity).
  const load = new Map<string, number>()
  for (const b of blocks) if (b.status !== 'skipped' && b.date >= input.today) load.set(b.date, (load.get(b.date) ?? 0) + b.pomodoros)
  const createdDays = new Set(result.create.map((b) => b.date))
  for (const d of createdDays) {
    const cap = blackout.has(d) ? 0 : capacityFor(input.settings, weekdayOf(d))
    if ((load.get(d) ?? 0) > cap) out.push(`capacity exceeded on ${d}: ${load.get(d)} > ${cap}`)
  }

  for (const b of result.create) {
    if (b.date < input.today) out.push(`created block ${b.id} is in the past (${b.date})`)
    if (blackout.has(b.date)) out.push(`created block ${b.id} on blackout ${b.date}`)
    const e = b.examId ? examById.get(b.examId) : undefined
    if (!e) {
      out.push(`created block ${b.id} has no exam`)
      continue
    }
    if (b.date >= e.date) out.push(`${b.id} on/after exam date ${e.date}`)
    if (b.kind === 'new' && b.date > addDaysISO(e.date, -2)) out.push(`new block ${b.id} on ${b.date}, later than exam-2 (${e.date})`)
    if (b.kind === 'new' && (b.pomodoros < 1 || b.pomodoros > 2)) out.push(`new block ${b.id} has ${b.pomodoros} pomodoros`)
    if (b.kind === 'review' && b.pomodoros !== 1) out.push(`review block ${b.id} has ${b.pomodoros} pomodoros`)
    if (b.source !== 'auto' || b.pinned || b.status !== 'planned') out.push(`created block ${b.id} is not a fresh auto block`)
    if (b.id !== `auto:${b.topicId}:${b.kind}:${b.id.split(':').pop()}`) out.push(`bad id ${b.id}`)
  }

  // Ids are unique.
  const ids = blocks.map((b) => b.id)
  if (new Set(ids).size !== ids.length) out.push('duplicate block ids')

  // Reviews come after the topic's last new block, at most one review and one new block per topic per day.
  const offsets = normalizeReviewOffsets(input.settings.reviewOffsets)
  for (const t of input.topics) {
    const mine = blocks.filter((b) => b.topicId === t.id && (b.status !== 'skipped' || b.completedPomodoros > 0))
    const news = mine.filter((b) => b.kind === 'new')
    const lastNew = news.reduce<string | null>((m, b) => (m === null || b.date > m ? b.date : m), null)
    const reviews = result.create.filter((b) => b.topicId === t.id && b.kind === 'review')
    for (const r of reviews) {
      if (lastNew && r.date <= lastNew) out.push(`review ${r.id} (${r.date}) not after last new block (${lastNew})`)
      const allowed = [...offsets, ...(t.confidence === 1 ? [extraReviewOffset(offsets)] : [])]
      if (r.reviewOffset === null || !allowed.includes(r.reviewOffset)) out.push(`review ${r.id} has offset ${r.reviewOffset}`)
      // Interleaving may pull a review forward by up to EARLY_REVIEW_DAYS; overdue ones land today.
      else if (lastNew && r.date < addDaysISO(lastNew, r.reviewOffset - EARLY_REVIEW_DAYS) && r.date !== input.today)
        out.push(`review ${r.id} (${r.date}) earlier than its offset +${r.reviewOffset} from ${lastNew}`)
    }
    const perDay = new Map<string, number>()
    for (const r of result.create.filter((b) => b.topicId === t.id)) {
      const k = `${r.kind}:${r.date}`
      perDay.set(k, (perDay.get(k) ?? 0) + 1)
    }
    for (const [k, n] of perDay) if (n > 1) out.push(`${t.id} has ${n} blocks of ${k}`)
  }
  return out
}

/**
 * AC-P1-4 as QA reads it: on every day with capacity >= 4 that holds blocks, while two or more
 * exams still have planned work on that day or later, the day holds blocks of >= 2 subjects.
 */
export function interleavingViolations(input: PlanInput, result: PlanResult): string[] {
  const out: string[] = []
  const blocks = applied(result).filter((b) => b.status === 'planned' && b.date >= input.today && b.examId)
  const days = [...new Set(blocks.map((b) => b.date))].sort()
  for (const d of days) {
    if (capacityFor(input.settings, weekdayOf(d)) < 4 || input.settings.blackoutDates.includes(d)) continue
    const pendingExams = new Set(blocks.filter((b) => b.date >= d).map((b) => b.examId))
    if (pendingExams.size < 2) continue
    const subjects = new Set(blocks.filter((b) => b.date === d).map((b) => b.subjectId))
    if (subjects.size < 2) out.push(`${d} holds only ${[...subjects].join(',')} while ${pendingExams.size} exams are pending`)
  }
  return out
}
