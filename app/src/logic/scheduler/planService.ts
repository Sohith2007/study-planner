/**
 * Plan service contract (master-plan 4.3). Reads and writes Dexie. Implemented by P1.
 * Frozen exports: PlanSummary, replan, catchUpOnOpen. P1 adds helper exports only.
 */
import type { Block, OverflowItem, PlanMeta } from '@/types'
import { db, getPlanMeta, getSettings, saveSettings } from '@/db'
import { todayISO } from '@/lib/dates'
import { generatePlan } from './engine'
import { isMovedBlock, largestReviewOffset, trimmedReviewOffsets } from './rules'

export interface PlanSummary {
  movedCount: number
  createdCount: number
  overflow: OverflowItem[]
  overCapacity: boolean
}

const BLOCK_FIELDS: (keyof Block)[] = [
  'date',
  'order',
  'kind',
  'topicId',
  'examId',
  'subjectId',
  'title',
  'pomodoros',
  'completedPomodoros',
  'status',
  'source',
  'pinned',
  'reviewOffset',
]

function sameBlock(a: Block, b: Block): boolean {
  return BLOCK_FIELDS.every((k) => a[k] === b[k])
}

/**
 * One Dexie transaction: read inputs, generate the plan, write only what changed, store meta.plan.
 * `recordCatchUp` always records lastCatchUp (catch-up on open). A plain replan records it only when it
 * actually moved past-due blocks (e.g. the app stayed open overnight, or after a demo reset).
 */
async function runPlan(today: string, recordCatchUp: boolean): Promise<PlanSummary> {
  return db.transaction('rw', [db.subjects, db.exams, db.topics, db.blocks, db.settings, db.meta], async () => {
    const [subjects, exams, topics, existingBlocks, settings, meta] = await Promise.all([
      db.subjects.toArray(),
      db.exams.toArray(),
      db.topics.toArray(),
      db.blocks.toArray(),
      getSettings(),
      getPlanMeta(),
    ])
    const now = new Date().toISOString()
    const movedCount = existingBlocks.filter((b) => isMovedBlock(b, today)).length
    const result = generatePlan({ today, subjects, exams, topics, settings, existingBlocks, now })

    // Write only the difference, so live queries (Today, Week) do not churn on a no-op replan.
    const existingById = new Map(existingBlocks.map((b) => [b.id, b]))
    const createIds = new Set(result.create.map((b) => b.id))
    const toDelete = result.removeIds.filter((id) => !createIds.has(id))
    const toPut = result.create.filter((b) => {
      const old = existingById.get(b.id)
      return !old || !sameBlock(old, b)
    })
    if (toDelete.length) await db.blocks.bulkDelete(toDelete)
    if (toPut.length) await db.blocks.bulkPut(toPut)

    const next: PlanMeta = {
      ...meta,
      key: 'plan',
      lastPlannedAt: now,
      overflow: result.overflow,
      lastCatchUp: recordCatchUp || movedCount > 0 ? { movedCount, at: now } : meta.lastCatchUp,
    }
    await db.meta.put(next)
    return {
      movedCount,
      createdCount: result.create.length,
      overflow: result.overflow,
      overCapacity: result.overflow.length > 0,
    }
  })
}

/** Rebuilds the plan (rule 7): keeps done/partial/skipped/pinned/manual blocks, regenerates the rest. */
export function replan(opts?: { today?: string }): Promise<PlanSummary> {
  return runPlan(opts?.today ?? todayISO(), false)
}

/** Moves past-due planned auto blocks (by replanning) and records meta.plan.lastCatchUp. */
export function catchUpOnOpen(): Promise<PlanSummary> {
  return runPlan(todayISO(), true)
}

/**
 * "Trim reviews" (over-capacity banner): drops the largest review offset from settings and replans.
 * Returns the removed offset (null when there was nothing to trim) and the new plan summary.
 */
export async function trimLargestReview(opts?: { today?: string }): Promise<{ removed: number | null; summary: PlanSummary }> {
  const settings = await getSettings()
  const removed = largestReviewOffset(settings.reviewOffsets)
  if (removed !== null) await saveSettings({ reviewOffsets: trimmedReviewOffsets(settings.reviewOffsets) })
  const summary = await replan(opts)
  return { removed, summary }
}
