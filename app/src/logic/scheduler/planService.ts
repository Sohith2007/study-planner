/**
 * Plan service contract (master-plan 4.3). Reads and writes Dexie.
 * P0 STAND-IN: a working replan/catch-up built on the naive generatePlan.
 * P1 owns the real implementation; exported names and signatures are frozen.
 */
import type { OverflowItem, PlanMeta } from '@/types'
import { db, getPlanMeta, getSettings } from '@/db'
import { todayISO } from '@/lib/dates'
import { generatePlan } from './index'

export interface PlanSummary {
  movedCount: number
  createdCount: number
  overflow: OverflowItem[]
  overCapacity: boolean
}

async function runPlan(today: string, recordCatchUp: boolean): Promise<PlanSummary> {
  return db.transaction('rw', [db.subjects, db.exams, db.topics, db.blocks, db.settings, db.meta], async () => {
    const subjects = await db.subjects.toArray()
    const exams = await db.exams.toArray()
    const topics = await db.topics.toArray()
    const existingBlocks = await db.blocks.toArray()
    const settings = await getSettings()
    const meta = await getPlanMeta()
    const movedCount = existingBlocks.filter(
      (b) => b.status === 'planned' && !b.pinned && b.source === 'auto' && b.date < today,
    ).length
    const result = generatePlan({ today, subjects, exams, topics, settings, existingBlocks })
    await db.blocks.bulkDelete(result.removeIds)
    await db.blocks.bulkPut(result.create)
    const now = new Date().toISOString()
    const next: PlanMeta = {
      ...meta,
      lastPlannedAt: now,
      overflow: result.overflow,
      lastCatchUp: recordCatchUp ? { movedCount, at: now } : meta.lastCatchUp,
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

export function replan(opts?: { today?: string }): Promise<PlanSummary> {
  return runPlan(opts?.today ?? todayISO(), false)
}

/** Moves past-due planned auto blocks (by replanning) and records meta.plan.lastCatchUp. */
export function catchUpOnOpen(): Promise<PlanSummary> {
  return runPlan(todayISO(), true)
}
