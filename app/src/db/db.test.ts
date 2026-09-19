import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { todayISO, addDaysISO } from '@/lib/dates'
import {
  buildDemoSeed,
  clearAll,
  db,
  deleteExamCascade,
  deleteSubjectCascade,
  getSettings,
  resetToDemo,
  saveSettings,
  seedIfEmpty,
  SEED_IDS,
} from './index'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('demo seed', () => {
  it('builds the master-plan seed relative to today', () => {
    const today = '2026-09-16'
    const s = buildDemoSeed(today)
    expect(s.subjects.map((x) => x.name)).toEqual(['Mathematics', 'Physics', 'Chemistry'])
    expect(s.exams.map((e) => [e.name, e.date])).toEqual([
      ['Organic Chemistry Quiz', '2026-09-23'],
      ['Calculus Midterm', '2026-09-26'],
      ['Mechanics Test', '2026-09-30'],
    ])
    expect(s.topics).toHaveLength(12)
    expect(s.topics.filter((t) => t.covered).map((t) => t.name)).toEqual(['Limits', 'Kinematics'])
    const missed = s.blocks.filter((b) => b.status === 'planned' && b.date < today)
    expect(missed.map((b) => b.title).sort()).toEqual(['Alkanes', 'Derivatives'])
    expect(s.blocks.find((b) => b.id === SEED_IDS.manualTask)).toMatchObject({ date: today, kind: 'task', source: 'manual', pomodoros: 1 })
    expect(s.sessions).toHaveLength(20)
    for (let n = 1; n <= 5; n++) {
      const day = addDaysISO(today, -n)
      const count = s.sessions.filter((x) => todayISO(new Date(x.startedAt)) === day && x.completed && x.kind === 'focus').length
      expect(count).toBe(4)
    }
    expect(s.settings.dailyCapacity).toEqual([4, 6, 6, 6, 6, 6, 8])
  })

  it('seedIfEmpty seeds once and never duplicates', async () => {
    expect(await seedIfEmpty()).toBe(true)
    expect(await seedIfEmpty()).toBe(false)
    expect(await db.subjects.count()).toBe(3)
    expect(await db.exams.count()).toBe(3)
    expect(await db.topics.count()).toBe(12)
    expect(await db.settings.count()).toBe(1)
  })

  it('clearAll empties data and is not re-seeded; resetToDemo restores it', async () => {
    await seedIfEmpty()
    await clearAll()
    expect(await db.subjects.count()).toBe(0)
    expect(await db.sessions.count()).toBe(0)
    expect(await db.settings.count()).toBe(1)
    expect(await seedIfEmpty()).toBe(false)
    await resetToDemo()
    expect(await db.subjects.count()).toBe(3)
    expect(await db.topics.count()).toBe(12)
  })
})

describe('repo helpers', () => {
  it('get/save settings merges a patch', async () => {
    expect((await getSettings()).focusMinutes).toBe(25)
    await saveSettings({ focusMinutes: 50 })
    const s = await getSettings()
    expect(s.focusMinutes).toBe(50)
    expect(s.shortBreakMinutes).toBe(5)
  })

  it('deleteExamCascade removes exam, topics and blocks but keeps sessions', async () => {
    await seedIfEmpty()
    const sessions = await db.sessions.count()
    await deleteExamCascade(SEED_IDS.exams.math)
    expect(await db.exams.get(SEED_IDS.exams.math)).toBeUndefined()
    expect(await db.topics.where('examId').equals(SEED_IDS.exams.math).count()).toBe(0)
    expect(await db.blocks.where('examId').equals(SEED_IDS.exams.math).count()).toBe(0)
    expect(await db.sessions.count()).toBe(sessions)
  })

  it('deleteSubjectCascade removes the subject, its exams and its blocks (incl. manual tasks)', async () => {
    await seedIfEmpty()
    await deleteSubjectCascade(SEED_IDS.subjects.physics)
    expect(await db.subjects.count()).toBe(2)
    expect(await db.exams.get(SEED_IDS.exams.physics)).toBeUndefined()
    expect(await db.topics.count()).toBe(8)
    expect(await db.blocks.get(SEED_IDS.manualTask)).toBeUndefined()
  })
})
