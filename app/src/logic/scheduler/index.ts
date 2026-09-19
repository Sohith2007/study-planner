/**
 * Scheduler engine contract (master-plan 4.3). Pure, no I/O.
 * P0 STAND-IN: a naive, capacity-aware planner that places `new` blocks only
 * (no reviews, no round-robin interleaving). P1 replaces the body; the exported
 * names and signatures are frozen (P1 may add exports).
 */
import type { Block, Exam, OverflowItem, Settings, Subject, Topic } from '@/types'
import { addDaysISO, weekdayOf } from '@/lib/dates'
import { autoBlockId } from '@/lib/ids'

export type { OverflowItem } from '@/types'

export interface PlanInput {
  today: string
  subjects: Subject[]
  exams: Exam[]
  topics: Topic[]
  settings: Settings
  existingBlocks: Block[]
}

export interface PlanResult {
  keep: Block[]
  create: Block[]
  removeIds: string[]
  overflow: OverflowItem[]
}

/** Replan rule 7: keep done/partial/skipped/pinned/manual blocks; planned unpinned auto blocks are regenerated. */
function isKept(b: Block): boolean {
  return b.status !== 'planned' || b.pinned || b.source === 'manual'
}

export function generatePlan(input: PlanInput): PlanResult {
  const { today, exams, topics, settings, existingBlocks } = input
  const keep = existingBlocks.filter(isKept)
  const removeIds = existingBlocks.filter((b) => !isKept(b)).map((b) => b.id)
  const create: Block[] = []
  const overflow: OverflowItem[] = []

  const used = new Map<string, number>()
  for (const b of keep) {
    if (b.status === 'planned' || b.status === 'partial') {
      used.set(b.date, (used.get(b.date) ?? 0) + (b.pomodoros - b.completedPomodoros))
    }
  }
  const capacityLeft = (date: string) =>
    settings.blackoutDates.includes(date)
      ? 0
      : (settings.dailyCapacity[weekdayOf(date)] ?? 0) - (used.get(date) ?? 0)

  const takenIds = new Set(keep.map((b) => b.id))
  const examById = new Map(exams.map((e) => [e.id, e]))
  const sortedTopics = topics
    .filter((t) => examById.has(t.examId))
    .sort((a, b) => {
      const ea = examById.get(a.examId)!
      const eb = examById.get(b.examId)!
      return ea.date.localeCompare(eb.date) || a.order - b.order || a.id.localeCompare(b.id)
    })

  for (const t of sortedTopics) {
    if (t.covered) continue
    const exam = examById.get(t.examId)!
    const accounted = keep
      .filter((b) => b.topicId === t.id && b.kind === 'new')
      .reduce((s, b) => s + (b.status === 'planned' || b.status === 'partial' ? b.pomodoros : b.completedPomodoros), 0)
    let remaining = Math.max(0, t.estimatePomodoros - accounted)
    const lastNewDay = addDaysISO(exam.date, -2)
    let n = 1
    let day = today
    while (remaining > 0) {
      if (day > lastNewDay) {
        overflow.push({
          examId: exam.id,
          topicId: t.id,
          kind: 'new',
          pomodoros: remaining,
          reason: exam.date <= today ? 'exam-passed' : 'no-capacity',
        })
        break
      }
      const size = Math.min(2, remaining, capacityLeft(day))
      if (size <= 0) {
        day = addDaysISO(day, 1)
        continue
      }
      while (takenIds.has(autoBlockId(t.id, 'new', n))) n++
      const id = autoBlockId(t.id, 'new', n++)
      takenIds.add(id)
      create.push({
        id,
        date: day,
        order: 0,
        kind: 'new',
        topicId: t.id,
        examId: exam.id,
        subjectId: exam.subjectId,
        title: t.name,
        pomodoros: size,
        completedPomodoros: 0,
        status: 'planned',
        source: 'auto',
        pinned: false,
        reviewOffset: null,
        createdAt: new Date().toISOString(),
      })
      used.set(day, (used.get(day) ?? 0) + size)
      remaining -= size
    }
  }

  // Order within each day: kept blocks first, then created ones.
  const nextOrder = new Map<string, number>()
  for (const b of keep) nextOrder.set(b.date, Math.max(nextOrder.get(b.date) ?? 0, b.order + 1))
  for (const b of create) {
    b.order = nextOrder.get(b.date) ?? 0
    nextOrder.set(b.date, b.order + 1)
  }
  return { keep, create, removeIds, overflow }
}
