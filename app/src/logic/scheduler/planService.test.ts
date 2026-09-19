import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, getPlanMeta, getSettings, resetToDemo, saveSettings, SEED_IDS } from '@/db'
import { addDaysISO, todayISO } from '@/lib/dates'
import type { Block } from '@/types'
import { catchUpOnOpen, replan, trimLargestReview } from './planService'

const TODAY = '2026-09-16' // a Wednesday

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 8, 16, 9, 0, 0))
  expect(todayISO()).toBe(TODAY)
  await resetToDemo()
})
afterEach(() => {
  vi.useRealTimers()
})

const shape = (bs: Block[]) => bs.map((b) => `${b.id}@${b.date}#${b.order}`).sort()
const total = (o: { pomodoros: number }[]) => o.reduce((s, x) => s + x.pomodoros, 0)

describe('catchUpOnOpen', () => {
  it('AC-P1-6: moves the 2 missed blocks and records lastCatchUp', async () => {
    const summary = await catchUpOnOpen()
    expect(summary.movedCount).toBe(2)
    expect(summary.overCapacity).toBe(false)
    const blocks = await db.blocks.toArray()
    expect(blocks.filter((b) => b.status === 'planned' && b.date < TODAY)).toEqual([])
    for (const t of [SEED_IDS.topics.derivatives, SEED_IDS.topics.alkanes]) {
      expect(blocks.some((b) => b.topicId === t && b.kind === 'new' && b.date >= TODAY)).toBe(true)
    }
    const meta = await getPlanMeta()
    expect(meta.lastCatchUp?.movedCount).toBe(2)
    expect(meta.lastPlannedAt).not.toBeNull()
    expect(meta.overflow).toEqual([])
  })

  it('a second open moves nothing and records 0 (the notice hides)', async () => {
    await catchUpOnOpen()
    const second = await catchUpOnOpen()
    expect(second.movedCount).toBe(0)
    expect((await getPlanMeta()).lastCatchUp?.movedCount).toBe(0)
  })

  it('a plain replan keeps the catch-up record when it moves nothing', async () => {
    await catchUpOnOpen()
    const at = (await getPlanMeta()).lastCatchUp?.at
    vi.setSystemTime(new Date(2026, 8, 16, 9, 5, 0))
    await replan()
    expect((await getPlanMeta()).lastCatchUp).toEqual({ movedCount: 2, at })
  })

  it('a replan on a later day counts the blocks it moved (app left open overnight)', async () => {
    await catchUpOnOpen()
    const planned = (await db.blocks.toArray()).filter(
      (b) => b.status === 'planned' && b.source === 'auto' && !b.pinned && b.date === TODAY,
    )
    expect(planned.length).toBeGreaterThan(0)
    vi.setSystemTime(new Date(2026, 8, 17, 8, 0, 0))
    const summary = await replan()
    expect(summary.movedCount).toBe(planned.length)
    expect((await getPlanMeta()).lastCatchUp?.movedCount).toBe(planned.length)
    // Auto blocks move; the user's manual task stays where they put it (rule 7).
    const stale = (await db.blocks.toArray()).filter((b) => b.status === 'planned' && b.date < '2026-09-17')
    expect(stale.map((b) => b.id)).toEqual([SEED_IDS.manualTask])
  })
})

describe('replan', () => {
  it('AC-P1-7: is idempotent and does not rewrite unchanged blocks', async () => {
    await catchUpOnOpen()
    const first = await db.blocks.toArray()
    const hook = vi.fn()
    db.blocks.hook('creating', hook)
    db.blocks.hook('deleting', hook)
    db.blocks.hook('updating', hook)
    try {
      await replan()
      await replan({ today: TODAY })
    } finally {
      db.blocks.hook('creating').unsubscribe(hook)
      db.blocks.hook('deleting').unsubscribe(hook)
      db.blocks.hook('updating').unsubscribe(hook)
    }
    expect(hook).not.toHaveBeenCalled()
    expect(shape(await db.blocks.toArray())).toEqual(shape(first))
  })

  it('AC-P1-7: keeps done, partial, skipped, manual and pinned blocks (same id and date)', async () => {
    await catchUpOnOpen()
    const autos = (await db.blocks.where('date').aboveOrEqual(TODAY).toArray()).filter(
      (b) => b.source === 'auto' && b.status === 'planned',
    )
    const [a, b, c, d] = autos
    await db.blocks.update(a.id, { status: 'done', completedPomodoros: a.pomodoros })
    await db.blocks.update(b.id, { status: 'skipped' })
    await db.blocks.update(c.id, { pinned: true, date: addDaysISO(TODAY, 3) })
    await db.blocks.update(d.id, { status: 'partial', completedPomodoros: 1, pomodoros: Math.max(2, d.pomodoros) })
    await db.blocks.add({
      ...c,
      id: 'manual-1',
      source: 'manual',
      kind: 'task',
      topicId: null,
      pinned: false,
      date: addDaysISO(TODAY, 1),
      title: 'Read chapter 4',
    })
    const ids = [a.id, b.id, c.id, d.id, 'manual-1', SEED_IDS.manualTask]
    const kept = await db.blocks.bulkGet(ids)
    await replan()
    expect(await db.blocks.bulkGet(ids)).toEqual(kept)
  })

  it('AC-P1-2: a new blackout date empties that day on the next replan', async () => {
    await catchUpOnOpen()
    const day = addDaysISO(TODAY, 2)
    expect(await db.blocks.where('date').equals(day).count()).toBeGreaterThan(0)
    await saveSettings({ blackoutDates: [day] })
    await replan()
    expect(await db.blocks.where('date').equals(day).count()).toBe(0)
    expect((await getPlanMeta()).overflow).toEqual([])
  })

  it('AC-P1-8: capacity 1 stores overflow; trimming lowers it; seed capacity clears it', async () => {
    await catchUpOnOpen()
    await saveSettings({ dailyCapacity: [1, 1, 1, 1, 1, 1, 1] })
    const tight = await replan()
    expect(tight.overCapacity).toBe(true)
    expect(total((await getPlanMeta()).overflow)).toBe(total(tight.overflow))

    const { removed, summary } = await trimLargestReview()
    expect(removed).toBe(7)
    expect((await getSettings()).reviewOffsets).toEqual([1, 3])
    expect(total(summary.overflow)).toBeLessThan(total(tight.overflow))

    await saveSettings({ dailyCapacity: [4, 6, 6, 6, 6, 6, 8] })
    const restored = await replan()
    expect(restored.overCapacity).toBe(false)
    expect((await getPlanMeta()).overflow).toEqual([])
  })

  it('trimLargestReview with no offsets left removes nothing', async () => {
    await saveSettings({ reviewOffsets: [] })
    const { removed } = await trimLargestReview()
    expect(removed).toBeNull()
    expect(await db.blocks.filter((b) => b.kind === 'review').count()).toBe(0)
  })

  it('AC-P1-5: covered with confidence 1 has exactly one more review than confidence 3', async () => {
    await catchUpOnOpen()
    const topicId = SEED_IDS.topics.chainRule
    const reviews = () =>
      db.blocks
        .where('topicId')
        .equals(topicId)
        .filter((b) => b.kind === 'review')
        .count()
    await db.topics.update(topicId, { covered: true, confidence: 3 })
    await replan()
    const conf3 = await reviews()
    await db.topics.update(topicId, { confidence: 1 })
    await replan()
    expect(await reviews()).toBe(conf3 + 1)
  })

  it('removes the planned auto blocks of a deleted exam', async () => {
    await catchUpOnOpen()
    await db.exams.delete(SEED_IDS.exams.chemistry)
    await replan()
    const chem = await db.blocks.where('examId').equals(SEED_IDS.exams.chemistry).toArray()
    expect(chem.filter((b) => b.status === 'planned' && b.source === 'auto' && !b.pinned)).toEqual([])
  })
})
