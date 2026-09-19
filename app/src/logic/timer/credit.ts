/**
 * Timer -> database (P2). Saves a `sessions` row when a phase completes and credits the linked block.
 * Uses only the P0 `db` (Dexie) and the entity types.
 */
import { db } from '@/db'
import type { Block, BlockStatus, FocusSession } from '@/types'
import type { PhaseEndEffect, TimerLink } from './engine'

/**
 * Deterministic session id per phase start, so the same completion is never saved twice
 * (StrictMode, two open tabs, a restore racing a tick).
 */
export function sessionIdFor(effect: Pick<PhaseEndEffect, 'phase' | 'startedAt'>): string {
  return `timer:${effect.phase}:${effect.startedAt}`
}

/** New status of a block after `completed` pomodoros: done when full, partial when started. */
export function creditedStatus(block: Pick<Block, 'pomodoros' | 'status'>, completed: number): BlockStatus {
  if (completed >= block.pomodoros) return 'done'
  if (completed > 0) return 'partial'
  return block.status
}

export interface RecordResult {
  /** False when the same phase was already saved. */
  saved: boolean
  /** True when the linked block existed and was credited. */
  blockCredited: boolean
}

/**
 * Save the session for a completed phase and, for a focus, add its pomodoros to the linked block
 * (status `done` when full, else `partial`). If the block no longer exists the session is still saved
 * with the topic/exam/subject captured at Start.
 */
export async function recordPhaseEnd(effect: PhaseEndEffect): Promise<RecordResult> {
  return db.transaction('rw', db.sessions, db.blocks, async () => {
    const id = sessionIdFor(effect)
    if (await db.sessions.get(id)) return { saved: false, blockCredited: false }

    const block = effect.blockId ? await db.blocks.get(effect.blockId) : undefined
    const link: TimerLink = effect.link ?? { topicId: null, examId: null, subjectId: null, label: null }
    const isFocus = effect.phase === 'focus'

    const session: FocusSession = {
      id,
      kind: effect.phase,
      blockId: isFocus ? (effect.blockId ?? null) : null,
      topicId: isFocus ? (block ? block.topicId : link.topicId) : null,
      examId: isFocus ? (block ? block.examId : link.examId) : null,
      subjectId: isFocus ? (block ? block.subjectId : link.subjectId) : null,
      startedAt: new Date(effect.startedAt).toISOString(),
      endedAt: new Date(effect.endedAt).toISOString(),
      plannedMinutes: effect.plannedMinutes,
      actualMinutes: effect.actualMinutes,
      completed: true,
      pomodorosCredited: isFocus ? effect.pomodorosCredited : 0,
    }
    await db.sessions.add(session)

    let blockCredited = false
    if (isFocus && block && effect.pomodorosCredited > 0) {
      const completed = block.completedPomodoros + effect.pomodorosCredited
      await db.blocks.update(block.id, { completedPomodoros: completed, status: creditedStatus(block, completed) })
      blockCredited = true
    }
    return { saved: true, blockCredited }
  })
}

/** Look up what a block belongs to, for the session link and the completion message. null if missing. */
export async function lookupLink(blockId: string): Promise<TimerLink | null> {
  const block = await db.blocks.get(blockId)
  if (!block) return null
  const topic = block.topicId ? await db.topics.get(block.topicId) : undefined
  return {
    topicId: block.topicId,
    examId: block.examId,
    subjectId: block.subjectId,
    label: topic?.name ?? block.title ?? null,
  }
}
