import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildDemoSeed, clearAll, db, resetToDemo } from '@/db'
import {
  backupFileName,
  buildBackup,
  countsPhrase,
  IMPORT_ERRORS,
  importedToast,
  parseBackup,
  readBackup,
  replaceAllData,
} from './backup'

const seed = buildDemoSeed('2026-09-19')
const seedBackup = () =>
  buildBackup(
    {
      subjects: seed.subjects,
      exams: seed.exams,
      topics: seed.topics,
      blocks: seed.blocks,
      sessions: seed.sessions,
      settings: seed.settings,
    },
    '2026-09-19T10:00:00.000Z',
  )

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('backup file', () => {
  it('names the file after the local date', () => {
    expect(backupFileName('2026-09-19')).toBe('focusplan-backup-2026-09-19.json')
  })

  it('round-trips through JSON', () => {
    const text = JSON.stringify(seedBackup())
    const res = parseBackup(text)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.backup.app).toBe('focusplan')
    expect(res.backup.version).toBe(1)
    expect(res.backup.subjects).toHaveLength(3)
    expect(res.backup.exams).toHaveLength(3)
    expect(res.backup.topics).toHaveLength(12)
    expect(res.backup.settings.id).toBe('settings')
  })

  it('accepts an empty backup (export after Clear all)', () => {
    const b = { ...seedBackup(), subjects: [], exams: [], topics: [], blocks: [], sessions: [] }
    expect(parseBackup(JSON.stringify(b)).ok).toBe(true)
  })

  it('fills missing settings fields from defaults', () => {
    const b = { ...seedBackup(), settings: { dailyGoalPomodoros: 6 } }
    const res = parseBackup(JSON.stringify(b))
    expect(res.ok && res.backup.settings.dailyGoalPomodoros).toBe(6)
    expect(res.ok && res.backup.settings.focusMinutes).toBe(25)
  })
})

describe('import validation', () => {
  it('rejects text that is not JSON', () => {
    expect(parseBackup('{nope')).toEqual({ ok: false, error: IMPORT_ERRORS.notJson })
  })

  it('rejects another app or a newer version', () => {
    expect(parseBackup(JSON.stringify({ ...seedBackup(), app: 'other' }))).toEqual({
      ok: false,
      error: IMPORT_ERRORS.wrongApp,
    })
    expect(parseBackup(JSON.stringify({ ...seedBackup(), version: 2 }))).toEqual({
      ok: false,
      error: IMPORT_ERRORS.wrongApp,
    })
    expect(parseBackup('[]')).toEqual({ ok: false, error: IMPORT_ERRORS.wrongApp })
  })

  it('names the first missing or invalid table', () => {
    const { topics: _t, ...noTopics } = seedBackup()
    void _t
    const res = parseBackup(JSON.stringify(noTopics))
    expect(res).toEqual({ ok: false, error: 'The backup is missing or has invalid topics. Nothing was changed.' })

    const badExam = { ...seedBackup(), exams: [{ ...seed.exams[0], date: 'soon' }] }
    expect(parseBackup(JSON.stringify(badExam))).toEqual({ ok: false, error: IMPORT_ERRORS.invalid('exams') })

    const badBlock = { ...seedBackup(), blocks: [{ ...seed.blocks[0], status: 'maybe' }] }
    expect(parseBackup(JSON.stringify(badBlock))).toEqual({ ok: false, error: IMPORT_ERRORS.invalid('blocks') })

    const dupSubjects = { ...seedBackup(), subjects: [seed.subjects[0], seed.subjects[0]] }
    expect(parseBackup(JSON.stringify(dupSubjects))).toEqual({ ok: false, error: IMPORT_ERRORS.invalid('subjects') })
  })

  it('rejects missing or invalid settings', () => {
    const { settings: _s, ...noSettings } = seedBackup()
    void _s
    expect(parseBackup(JSON.stringify(noSettings))).toEqual({ ok: false, error: IMPORT_ERRORS.invalid('settings') })
    const bad = { ...seedBackup(), settings: { ...seed.settings, dailyCapacity: [1, 2] } }
    expect(parseBackup(JSON.stringify(bad))).toEqual({ ok: false, error: IMPORT_ERRORS.invalid('settings') })
  })

  it('every error ends with "Nothing was changed."', () => {
    for (const msg of [IMPORT_ERRORS.notJson, IMPORT_ERRORS.wrongApp, IMPORT_ERRORS.invalid('x'), IMPORT_ERRORS.readFailed]) {
      expect(msg.endsWith('Nothing was changed.')).toBe(true)
    }
  })
})

describe('export and import against the database', () => {
  it('exports the seeded database', async () => {
    await resetToDemo()
    const b = await readBackup()
    expect(b.app).toBe('focusplan')
    expect([b.subjects.length, b.exams.length, b.topics.length, b.sessions.length]).toEqual([3, 3, 12, 20])
    expect(b.settings.id).toBe('settings')
  })

  it('clear all, then import restores everything and keeps the seed marker', async () => {
    await resetToDemo()
    const exported = JSON.stringify(await readBackup())
    await clearAll()
    expect(await db.subjects.count()).toBe(0)

    const res = parseBackup(exported)
    if (!res.ok) throw new Error(res.error)
    await replaceAllData(res.backup)
    expect(await db.subjects.count()).toBe(3)
    expect(await db.exams.count()).toBe(3)
    expect(await db.topics.count()).toBe(12)
    expect(await db.sessions.count()).toBe(20)
    expect(await db.meta.get('seed')).toBeTruthy()
    const plan = await db.meta.get('plan')
    expect(plan && plan.key === 'plan' && plan.lastCatchUp).toBeNull()
  })

  it('replaces (not merges) the current data', async () => {
    await resetToDemo()
    const b = { ...seedBackup(), subjects: [seed.subjects[0]], exams: [], topics: [], blocks: [], sessions: [] }
    await replaceAllData(b)
    expect(await db.subjects.count()).toBe(1)
    expect(await db.topics.count()).toBe(0)
  })

  it('a failing import changes nothing (single transaction)', async () => {
    await resetToDemo()
    const broken = seedBackup()
    // A row without a key makes bulkPut throw mid-transaction.
    ;(broken.sessions as unknown[]).push({ nope: true })
    await expect(replaceAllData(broken)).rejects.toBeTruthy()
    expect(await db.subjects.count()).toBe(3)
    expect(await db.sessions.count()).toBe(20)
  })

  it('uses the design copy for the import toast', () => {
    expect(importedToast({ subjects: 3, exams: 3, topics: 12 })).toBe('Backup imported: 3 subjects, 3 exams, 12 topics.')
    expect(importedToast({ subjects: 1, exams: 1, topics: 1 })).toBe('Backup imported: 1 subject, 1 exam, 1 topic.')
  })

  it('phrases counts', () => {
    expect(countsPhrase({ subjects: 3, exams: 3, topics: 12 })).toBe('3 subjects, 3 exams and 12 topics')
    expect(countsPhrase({ subjects: 2, exams: 1, topics: 4 })).toBe('2 subjects, 1 exam and 4 topics')
  })
})
