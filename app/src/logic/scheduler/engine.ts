/**
 * The FocusPlan scheduler (F3). Pure and deterministic: same input, same output (ids, dates, order).
 *
 * Rules (master-plan 4.3), with the details P1 owns:
 *  1. Remaining new work = estimate - completed new pomodoros - pomodoros still planned in kept new
 *     blocks dated today or later. 0 when the topic is covered.
 *  2. New work goes in blocks of at most 2 pomodoros; at most one new block per topic per day.
 *  3. Reviews are 1 pomodoro, at each `settings.reviewOffsets` offset after the topic's last new block
 *     (the anchor). `confidence === 1` adds one extra review at `extraReviewOffset()`. At most one review
 *     per topic per day. A review is pushed later when its day is full. Offsets whose date would fall
 *     after the review deadline "don't fit" and are dropped (not overflow). Overdue offsets (anchor in
 *     the past) collapse into a single review due today.
 *  4. New blocks go on or before exam - 2; reviews on or before exam - 1 (the day before the exam is
 *     reserved for review). Nothing on or after the exam date.
 *  5. Days are filled from today, earliest deadline first, round-robin across subjects (one item per
 *     subject per round). Day capacity = dailyCapacity[weekday] - pomodoros of kept, non-skipped blocks
 *     on that day. Blackout days get nothing.
 *  6. Work that does not fit is returned as overflow. New work of a passed exam is `exam-passed`.
 *     Reviews of a topic whose new work did not fit are overflow too (they cannot be planned either).
 *  7. Kept blocks: see `isKeptBlock`. Every other block is removed and regenerated.
 *
 * Pacing: the engine first builds a *paced* plan that spreads each exam's new work evenly from today
 * to a little before its new-work deadline (exam-backward planning; always at least one block per exam
 * today). If the paced plan leaves overflow, it also builds a *greedy* plan (fill every day to capacity)
 * and returns whichever overflows less. Paced plans also get an interleaving guarantee: a day holding
 * one subject only pulls one block of another subject forward (a new block, or else that subject's
 * next review if it is due within EARLY_REVIEW_DAYS; it still lands after the last new block).
 */
import type { Block, Exam, OverflowItem, Settings, Topic } from '@/types'
import { addDaysISO, daysBetween, weekdayOf } from '@/lib/dates'
import { autoBlockId } from '@/lib/ids'
import type { PlanInput, PlanResult } from './types'
import {
  MAX_NEW_BLOCK_POMODOROS,
  capacityFor,
  extraReviewOffset,
  isKeptBlock,
  normalizeReviewOffsets,
} from './rules'

type Mode = 'paced' | 'greedy'

/**
 * Interleaving repair may pull a review of another subject forward by at most this many days
 * (it still lands after the topic's last new block and in review order).
 */
export const EARLY_REVIEW_DAYS = 2

interface TopicInfo {
  topic: Topic
  exam: Exam
  subjectId: string
  initialRemaining: number
  /** Latest date of a kept (non-skipped or credited) new block, any status. */
  keptLastNewDate: string | null
  /** Today, or tomorrow when the user skipped this topic's new block today. */
  earliestNewDay: string
  /** Review offsets still to plan (configured ones not yet satisfied, plus the extra one). */
  slotOffsets: number[]
  keptReviewDays: Set<string>
}

interface Context {
  today: string
  now: string
  settings: Settings
  blackout: Set<string>
  keep: Block[]
  removeIds: string[]
  keptUsed: Map<string, number>
  keptSubjectsByDay: Map<string, Set<string>>
  takenIds: Set<string>
  existingCreatedAt: Map<string, string>
  /** Exams dated after today, earliest first. */
  futureExams: Exam[]
  /** Topics of future exams, in deterministic rank order (exam date, topic order, id). */
  futureTopics: TopicInfo[]
  topicsByExam: Map<string, TopicInfo[]>
  pastTopics: TopicInfo[]
  lastDay: string | null
  /** Day index (from today) -> number of usable days in [today, day]. */
  usablePrefix: number[]
  paceEnd: Map<string, string>
}

interface Slot {
  offset: number
  due: string
}

interface TopicState {
  info: TopicInfo
  remaining: number
  lastNew: string | null
  /** Date reviews count from (set when armed). */
  anchor: string | null
  armed: boolean
  slots: Slot[]
  newDays: Set<string>
  reviewDays: Set<string>
}

interface Item {
  kind: 'new' | 'review'
  ts: TopicState
  size: number
}

const maxDate = (a: string | null, b: string | null): string | null => (a === null ? b : b === null ? a : a > b ? a : b)

function addTo<K>(map: Map<K, number>, key: K, n: number) {
  map.set(key, (map.get(key) ?? 0) + n)
}

function buildContext(input: PlanInput): Context {
  const { today, settings } = input
  const now = input.now ?? new Date().toISOString()
  const offsets = normalizeReviewOffsets(settings.reviewOffsets)
  const blackout = new Set(settings.blackoutDates ?? [])

  const keep: Block[] = []
  const removeIds: string[] = []
  const existingCreatedAt = new Map<string, string>()
  for (const b of input.existingBlocks) {
    existingCreatedAt.set(b.id, b.createdAt)
    if (isKeptBlock(b)) keep.push(b)
    else removeIds.push(b.id)
  }

  const keptUsed = new Map<string, number>()
  const keptSubjectsByDay = new Map<string, Set<string>>()
  for (const b of keep) {
    if (b.status === 'skipped') continue
    addTo(keptUsed, b.date, b.pomodoros)
    if (b.subjectId) {
      const set = keptSubjectsByDay.get(b.date) ?? new Set<string>()
      set.add(b.subjectId)
      keptSubjectsByDay.set(b.date, set)
    }
  }

  const exams = [...input.exams].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  const examRank = new Map(exams.map((e, i) => [e.id, i]))
  const examById = new Map(exams.map((e) => [e.id, e]))
  const futureExams = exams.filter((e) => e.date > today)

  const topics = input.topics
    .filter((t) => examById.has(t.examId))
    .sort(
      (a, b) =>
        examRank.get(a.examId)! - examRank.get(b.examId)! || (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id),
    )

  const tomorrow = addDaysISO(today, 1)
  const futureTopics: TopicInfo[] = []
  const pastTopics: TopicInfo[] = []
  const topicsByExam = new Map<string, TopicInfo[]>()

  for (const t of topics) {
    const exam = examById.get(t.examId)!
    const keptNew = keep.filter((b) => b.topicId === t.id && b.kind === 'new')
    let completed = 0
    let stillPlanned = 0
    let keptLastNewDate: string | null = null
    let skippedToday = false
    for (const b of keptNew) {
      const done = b.status === 'done' ? Math.max(b.pomodoros, b.completedPomodoros) : b.completedPomodoros
      completed += done
      if ((b.status === 'planned' || b.status === 'partial') && b.date >= today) {
        stillPlanned += Math.max(0, b.pomodoros - b.completedPomodoros)
      }
      if (b.status !== 'skipped' || b.completedPomodoros > 0) keptLastNewDate = maxDate(keptLastNewDate, b.date)
      if (b.status === 'skipped' && b.date === today) skippedToday = true
    }
    const estimate = Math.max(0, Math.round(Number(t.estimatePomodoros) || 0))
    const initialRemaining = t.covered ? 0 : Math.max(0, estimate - completed - stillPlanned)

    const keptReviews = keep.filter((b) => b.topicId === t.id && b.kind === 'review')
    const satisfied = new Set<number>()
    let unmatched = 0
    for (const r of keptReviews) {
      if (r.reviewOffset !== null && offsets.includes(r.reviewOffset) && !satisfied.has(r.reviewOffset)) {
        satisfied.add(r.reviewOffset)
      } else unmatched++
    }
    const slotOffsets = offsets.filter((o) => !satisfied.has(o))
    if (t.confidence === 1 && unmatched === 0) slotOffsets.push(extraReviewOffset(offsets))
    slotOffsets.sort((a, b) => a - b)

    const info: TopicInfo = {
      topic: t,
      exam,
      subjectId: exam.subjectId,
      initialRemaining,
      keptLastNewDate,
      earliestNewDay: skippedToday ? tomorrow : today,
      slotOffsets,
      keptReviewDays: new Set(keptReviews.map((r) => r.date)),
    }
    if (exam.date > today) {
      futureTopics.push(info)
      const list = topicsByExam.get(exam.id) ?? []
      list.push(info)
      topicsByExam.set(exam.id, list)
    } else pastTopics.push(info)
  }

  const lastDay = futureExams.length ? addDaysISO(futureExams[futureExams.length - 1].date, -1) : null

  const ctx: Context = {
    today,
    now,
    settings,
    blackout,
    keep,
    removeIds,
    keptUsed,
    keptSubjectsByDay,
    takenIds: new Set(keep.map((b) => b.id)),
    existingCreatedAt,
    futureExams,
    futureTopics,
    topicsByExam,
    pastTopics,
    lastDay,
    usablePrefix: [],
    paceEnd: new Map(),
  }

  if (lastDay) {
    let count = 0
    for (let d = today; d <= lastDay; d = addDaysISO(d, 1)) {
      if (baseCapacity(ctx, d) > 0) count++
      ctx.usablePrefix.push(count)
    }
  }
  for (const exam of futureExams) {
    const newDeadline = addDaysISO(exam.date, -2)
    const span = daysBetween(today, newDeadline)
    const slack = span > 0 ? Math.min(3, Math.floor(span / 4)) : 0
    ctx.paceEnd.set(exam.id, addDaysISO(newDeadline, -slack))
  }
  return ctx
}

/** Capacity left on `d` after kept blocks (0 on blackout days). */
function baseCapacity(ctx: Context, d: string): number {
  if (ctx.blackout.has(d)) return 0
  return capacityFor(ctx.settings, weekdayOf(d)) - (ctx.keptUsed.get(d) ?? 0)
}

/** Usable days in [from, to], both within the horizon. */
function usableDaysBetween(ctx: Context, from: string, to: string): number {
  if (to < from) return 0
  const i = daysBetween(ctx.today, from)
  const j = Math.min(daysBetween(ctx.today, to), ctx.usablePrefix.length - 1)
  if (j < i) return 0
  return ctx.usablePrefix[j] - (i > 0 ? ctx.usablePrefix[i - 1] : 0)
}

function arm(ctx: Context, ts: TopicState) {
  const anchor = maxDate(ts.lastNew, ts.info.keptLastNewDate) ?? ctx.today
  ts.anchor = anchor
  const deadline = addDaysISO(ts.info.exam.date, -1)
  const targets = ts.info.slotOffsets.map((offset) => ({ offset, target: addDaysISO(anchor, offset) }))
  const overdue = targets.filter((s) => s.target <= ctx.today)
  const slots: Slot[] = []
  if (overdue.length) slots.push({ offset: overdue[overdue.length - 1].offset, due: ctx.today })
  for (const s of targets) if (s.target > ctx.today) slots.push({ offset: s.offset, due: s.target })
  ts.slots = slots.filter((s) => s.due <= deadline)
  ts.armed = true
}

interface SimResult {
  create: Block[]
  overflow: OverflowItem[]
  overflowTotal: number
}

function simulate(ctx: Context, mode: Mode): SimResult {
  const { today } = ctx
  const takenIds = new Set(ctx.takenIds)
  const nextN = new Map<string, number>()
  const states = new Map<string, TopicState>()
  for (const info of ctx.futureTopics) {
    const ts: TopicState = {
      info,
      remaining: info.initialRemaining,
      lastNew: null,
      anchor: null,
      armed: false,
      slots: [],
      newDays: new Set(),
      reviewDays: new Set(info.keptReviewDays),
    }
    if (ts.remaining === 0) arm(ctx, ts)
    states.set(info.topic.id, ts)
  }

  const create: Block[] = []
  const createdUsed = new Map<string, number>()
  const createdSubjects = new Map<string, Set<string>>()

  const nextId = (topicId: string, kind: 'new' | 'review') => {
    const key = `${topicId}:${kind}`
    let n = nextN.get(key) ?? 1
    while (takenIds.has(autoBlockId(topicId, kind, n))) n++
    const id = autoBlockId(topicId, kind, n)
    takenIds.add(id)
    nextN.set(key, n + 1)
    return id
  }

  const examHasWork = (exam: Exam) =>
    (ctx.topicsByExam.get(exam.id) ?? []).some((i) => {
      const ts = states.get(i.topic.id)!
      return ts.remaining > 0 || ts.slots.length > 0
    })

  if (ctx.lastDay) {
    for (let d = today; d <= ctx.lastDay; d = addDaysISO(d, 1)) {
      let capLeft = baseCapacity(ctx, d)
      if (capLeft <= 0) continue

      const activeExams = ctx.futureExams.filter((e) => e.date > d && examHasWork(e))
      if (!activeExams.length) continue

      const quotas = new Map<string, number>()
      for (const exam of activeExams) quotas.set(exam.id, mode === 'greedy' ? Infinity : paceQuota(ctx, exam, d, states))

      const subjectOrder: string[] = []
      for (const e of activeExams) if (!subjectOrder.includes(e.subjectId)) subjectOrder.push(e.subjectId)

      const pick = (subjectId: string, ignoreQuota: boolean): Item | null => {
        for (const exam of activeExams) {
          if (exam.subjectId !== subjectId) continue
          const infos = ctx.topicsByExam.get(exam.id) ?? []
          // Due reviews first (earliest due, then topic rank).
          let best: TopicState | null = null
          for (const info of infos) {
            const ts = states.get(info.topic.id)!
            if (!ts.armed || !ts.slots.length || ts.slots[0].due > d || ts.reviewDays.has(d)) continue
            if (!best || ts.slots[0].due < best.slots[0].due) best = ts
          }
          if (best) return { kind: 'review', ts: best, size: 1 }
          if (d <= addDaysISO(exam.date, -2) && (ignoreQuota || (quotas.get(exam.id) ?? 0) > 0)) {
            for (const info of infos) {
              const ts = states.get(info.topic.id)!
              if (ts.remaining > 0 && info.earliestNewDay <= d && !ts.newDays.has(d)) {
                return { kind: 'new', ts, size: Math.min(MAX_NEW_BLOCK_POMODOROS, ts.remaining, capLeft) }
              }
            }
          }
        }
        return null
      }

      /** Interleaving repair only: a review of this subject due within EARLY_REVIEW_DAYS, pulled forward. */
      const pickEarlyReview = (subjectId: string): Item | null => {
        const horizon = addDaysISO(d, EARLY_REVIEW_DAYS)
        for (const exam of activeExams) {
          if (exam.subjectId !== subjectId) continue
          for (const info of ctx.topicsByExam.get(exam.id) ?? []) {
            const ts = states.get(info.topic.id)!
            const slot = ts.slots[0]
            // slots[0] is the topic's next review; earlier ones are already placed (days run forward).
            if (!ts.armed || !slot || slot.due > horizon || ts.reviewDays.has(d) || !ts.anchor || d <= ts.anchor) continue
            return { kind: 'review', ts, size: 1 }
          }
        }
        return null
      }

      const place = (item: Item) => {
        const { ts } = item
        const { topic, exam, subjectId } = ts.info
        let reviewOffset: number | null = null
        if (item.kind === 'review') {
          reviewOffset = ts.slots.shift()!.offset
          ts.reviewDays.add(d)
        } else {
          ts.remaining -= item.size
          ts.lastNew = d
          ts.newDays.add(d)
          quotas.set(exam.id, (quotas.get(exam.id) ?? 0) - 1)
          if (ts.remaining === 0) arm(ctx, ts)
        }
        const id = nextId(topic.id, item.kind)
        create.push({
          id,
          date: d,
          order: 0,
          kind: item.kind,
          topicId: topic.id,
          examId: exam.id,
          subjectId,
          title: topic.name,
          pomodoros: item.size,
          completedPomodoros: 0,
          status: 'planned',
          source: 'auto',
          pinned: false,
          reviewOffset,
          createdAt: ctx.existingCreatedAt.get(id) ?? ctx.now,
        })
        capLeft -= item.size
        addTo(createdUsed, d, item.size)
        const set = createdSubjects.get(d) ?? new Set<string>()
        set.add(subjectId)
        createdSubjects.set(d, set)
      }

      // Round-robin across subjects, earliest deadline first.
      let progress = true
      while (capLeft > 0 && progress) {
        progress = false
        for (const sid of subjectOrder) {
          if (capLeft <= 0) break
          const item = pick(sid, false)
          if (item) {
            place(item)
            progress = true
          }
        }
      }

      // Interleaving guarantee for paced plans: never leave a day to a single subject when another
      // subject has new work that could be done today.
      if (mode === 'paced' && capLeft > 0) {
        const present = new Set([...(ctx.keptSubjectsByDay.get(d) ?? []), ...(createdSubjects.get(d) ?? [])])
        if (present.size === 1) {
          for (const sid of subjectOrder) {
            if (present.has(sid)) continue
            const item = pick(sid, true) ?? pickEarlyReview(sid)
            if (item) {
              place(item)
              break
            }
          }
        }
      }
    }
  }

  // Overflow, in rank order (exam date, then topic order).
  const overflow: OverflowItem[] = []
  for (const info of ctx.pastTopics) {
    if (info.initialRemaining > 0) {
      overflow.push({
        examId: info.exam.id,
        topicId: info.topic.id,
        kind: 'new',
        pomodoros: info.initialRemaining,
        reason: 'exam-passed',
      })
    }
  }
  for (const info of ctx.futureTopics) {
    const ts = states.get(info.topic.id)!
    if (ts.remaining > 0) {
      overflow.push({ examId: info.exam.id, topicId: info.topic.id, kind: 'new', pomodoros: ts.remaining, reason: 'no-capacity' })
      if (info.slotOffsets.length) {
        overflow.push({
          examId: info.exam.id,
          topicId: info.topic.id,
          kind: 'review',
          pomodoros: info.slotOffsets.length,
          reason: 'no-capacity',
        })
      }
    } else if (ts.slots.length) {
      overflow.push({ examId: info.exam.id, topicId: info.topic.id, kind: 'review', pomodoros: ts.slots.length, reason: 'no-capacity' })
    }
  }
  // Past exams come first in date order already (they are dated before every future exam).
  return { create, overflow, overflowTotal: overflow.reduce((s, o) => s + o.pomodoros, 0) }
}

/** Blocks of new work the exam should get on `d` in a paced plan. */
function paceQuota(ctx: Context, exam: Exam, d: string, states: Map<string, TopicState>): number {
  const newDeadline = addDaysISO(exam.date, -2)
  if (d > newDeadline) return 0
  let blocks = 0
  for (const info of ctx.topicsByExam.get(exam.id) ?? []) {
    const rem = states.get(info.topic.id)!.remaining
    if (rem > 0) blocks += Math.ceil(rem / MAX_NEW_BLOCK_POMODOROS)
  }
  if (blocks === 0) return 0
  const paceEnd = ctx.paceEnd.get(exam.id)!
  if (d > paceEnd) return Infinity
  const days = usableDaysBetween(ctx, d, paceEnd)
  if (days <= 0) return Infinity
  let quota = Math.round(blocks / days)
  if (d === ctx.today) quota = Math.max(quota, 1)
  return quota
}

export function generatePlan(input: PlanInput): PlanResult {
  const ctx = buildContext(input)
  let best = simulate(ctx, 'paced')
  if (best.overflowTotal > 0) {
    const greedy = simulate(ctx, 'greedy')
    if (greedy.overflowTotal < best.overflowTotal) best = greedy
  }

  // Order within each day: kept blocks keep their order; created blocks follow in placement order.
  const nextOrder = new Map<string, number>()
  for (const b of ctx.keep) nextOrder.set(b.date, Math.max(nextOrder.get(b.date) ?? 0, b.order + 1))
  for (const b of best.create) {
    b.order = nextOrder.get(b.date) ?? 0
    nextOrder.set(b.date, b.order + 1)
  }
  return { keep: ctx.keep, create: best.create, removeIds: ctx.removeIds, overflow: best.overflow }
}
