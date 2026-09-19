import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, seedIfEmpty, SEED_IDS } from '@/db'
import type { Block } from '@/types'
import { notificationFor, phaseEndAnnouncement, spokenDuration } from './copy'
import { creditedStatus, lookupLink, recordPhaseEnd, sessionIdFor } from './credit'
import type { PhaseEndEffect } from './engine'

const T0 = Date.UTC(2026, 8, 19, 9, 0, 0)

function block(over: Partial<Block> = {}): Block {
  return {
    id: 'b1',
    date: '2026-09-19',
    order: 0,
    kind: 'new',
    topicId: 'seed-topic-derivatives',
    examId: 'seed-exam-calculus-midterm',
    subjectId: 'seed-subject-math',
    title: 'Derivatives',
    pomodoros: 2,
    completedPomodoros: 0,
    status: 'planned',
    source: 'auto',
    pinned: false,
    reviewOffset: null,
    createdAt: new Date(T0).toISOString(),
    ...over,
  }
}

function focusEnd(over: Partial<PhaseEndEffect> = {}): PhaseEndEffect {
  return {
    type: 'phaseEnd',
    phase: 'focus',
    mode: 'classic',
    blockId: 'b1',
    link: { topicId: 't-x', examId: 'e-x', subjectId: 's-x', label: 'X' },
    startedAt: T0,
    endedAt: T0 + 25 * 60_000,
    plannedMinutes: 25,
    actualMinutes: 25,
    pomodorosCredited: 1,
    next: 'shortBreak',
    nextDurationMs: 5 * 60_000,
    ...over,
  }
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('recordPhaseEnd', () => {
  it('stores a completed 25-minute focus session and credits the block (1/2 partial, then 2/2 done)', async () => {
    await db.blocks.put(block())
    await recordPhaseEnd(focusEnd())
    let b = await db.blocks.get('b1')
    expect(b).toMatchObject({ completedPomodoros: 1, status: 'partial' })
    const s = await db.sessions.get(sessionIdFor(focusEnd()))
    expect(s).toMatchObject({
      kind: 'focus',
      blockId: 'b1',
      topicId: 'seed-topic-derivatives',
      subjectId: 'seed-subject-math',
      plannedMinutes: 25,
      actualMinutes: 25,
      completed: true,
      pomodorosCredited: 1,
      startedAt: new Date(T0).toISOString(),
    })
    await recordPhaseEnd(focusEnd({ startedAt: T0 + 30 * 60_000, endedAt: T0 + 55 * 60_000 }))
    b = await db.blocks.get('b1')
    expect(b).toMatchObject({ completedPomodoros: 2, status: 'done' })
  })

  it('never saves the same completion twice', async () => {
    await db.blocks.put(block())
    expect((await recordPhaseEnd(focusEnd())).saved).toBe(true)
    expect((await recordPhaseEnd(focusEnd())).saved).toBe(false)
    expect(await db.sessions.count()).toBe(1)
    expect((await db.blocks.get('b1'))?.completedPomodoros).toBe(1)
  })

  it('saves the session with the captured link when the block was deleted', async () => {
    const r = await recordPhaseEnd(focusEnd())
    expect(r).toEqual({ saved: true, blockCredited: false })
    const s = await db.sessions.get(sessionIdFor(focusEnd()))
    expect(s).toMatchObject({ blockId: 'b1', topicId: 't-x', examId: 'e-x', subjectId: 's-x', pomodorosCredited: 1 })
  })

  it('break sessions credit nothing and carry no block link', async () => {
    await db.blocks.put(block())
    await recordPhaseEnd(focusEnd({ phase: 'shortBreak', pomodorosCredited: 0, plannedMinutes: 5, actualMinutes: 5 }))
    const [s] = await db.sessions.toArray()
    expect(s).toMatchObject({ kind: 'shortBreak', blockId: null, subjectId: null, pomodorosCredited: 0 })
    expect((await db.blocks.get('b1'))?.completedPomodoros).toBe(0)
  })

  it('lookupLink reads the topic name from the demo seed', async () => {
    await seedIfEmpty()
    const blk = await db.blocks.where('topicId').equals(SEED_IDS.topics.limits).first()
    expect(blk).toBeTruthy()
    const link = await lookupLink(blk!.id)
    expect(link).toMatchObject({ topicId: 'seed-topic-limits', label: 'Limits' })
    expect(await lookupLink('nope')).toBeNull()
  })

  it('creditedStatus', () => {
    expect(creditedStatus({ pomodoros: 2, status: 'planned' }, 1)).toBe('partial')
    expect(creditedStatus({ pomodoros: 2, status: 'partial' }, 2)).toBe('done')
    expect(creditedStatus({ pomodoros: 2, status: 'planned' }, 0)).toBe('planned')
  })
})

describe('timer copy', () => {
  it('notification and announcement text', () => {
    expect(notificationFor(focusEnd())).toEqual({ title: 'Focus complete', body: 'Nice work. Take a 5-minute break.' })
    expect(notificationFor(focusEnd({ nextDurationMs: 15 * 60_000 })).body).toBe('Nice work. Take a 15-minute break.')
    expect(notificationFor(focusEnd({ phase: 'shortBreak' }))).toEqual({ title: 'Break over', body: 'Ready for the next pomodoro?' })
    expect(phaseEndAnnouncement(focusEnd())).toBe('Focus complete. Short break, 5 minutes.')
    expect(spokenDuration(18 * 60_000 + 42_000)).toBe('18 minutes 42 seconds')
  })
})
