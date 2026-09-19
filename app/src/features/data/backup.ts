/**
 * JSON backup: export, validation and import (plan P5 task 4, screens/data.md).
 * `parseBackup` / `buildBackup` / `backupFileName` are pure; `readBackup`, `replaceAllData`,
 * `downloadBackup` and `resetTimerStorage` touch the database or the browser.
 * No network: the file is made with a Blob and an object URL.
 */
import type { Block, Exam, FocusSession, ISODate, SeedMeta, Settings, Subject, Topic } from '@/types'
import { allTables, db, defaultSettings, emptyPlanMeta, SEED_VERSION, SETTINGS_ID } from '@/db'
import { todayISO } from '@/lib/dates'

export const BACKUP_APP = 'focusplan'
export const BACKUP_VERSION = 1
/** localStorage key of the running timer (master-plan P2). Cleared on import/reset/clear. */
export const TIMER_STORAGE_KEY = 'focusplan.timer.v1'

export interface Backup {
  app: typeof BACKUP_APP
  version: typeof BACKUP_VERSION
  exportedAt: string
  subjects: Subject[]
  exams: Exam[]
  topics: Topic[]
  blocks: Block[]
  sessions: FocusSession[]
  settings: Settings
}

export type TableKey = 'subjects' | 'exams' | 'topics' | 'blocks' | 'sessions'
export const TABLE_KEYS: readonly TableKey[] = ['subjects', 'exams', 'topics', 'blocks', 'sessions']

export const IMPORT_ERRORS = {
  notJson: "That file isn't valid JSON. Nothing was changed.",
  wrongApp: "This isn't a FocusPlan backup, or it's from a newer version. Nothing was changed.",
  invalid: (key: string) => `The backup is missing or has invalid ${key}. Nothing was changed.`,
  readFailed: "Couldn't read that file. Nothing was changed.",
} as const

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string }

/** `focusplan-backup-YYYY-MM-DD.json` for the given local date. */
export function backupFileName(today: ISODate = todayISO()): string {
  return `focusplan-backup-${today}.json`
}

export function buildBackup(
  data: Pick<Backup, TableKey | 'settings'>,
  exportedAt: string = new Date().toISOString(),
): Backup {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt,
    subjects: data.subjects,
    exams: data.exams,
    topics: data.topics,
    blocks: data.blocks,
    sessions: data.sessions,
    settings: data.settings,
  }
}

// ---------------------------------------------------------------- validation

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isNonEmptyStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStrOrNull = (v: unknown) => v === null || isStr(v)
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const isDate = (v: unknown) => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v)

const rowCheck: Record<TableKey, (r: Obj) => boolean> = {
  subjects: (r) => isNonEmptyStr(r.id) && isStr(r.name) && isStr(r.color),
  exams: (r) => isNonEmptyStr(r.id) && isStr(r.subjectId) && isStr(r.name) && isDate(r.date),
  topics: (r) =>
    isNonEmptyStr(r.id) &&
    isStr(r.examId) &&
    isStr(r.name) &&
    isNum(r.estimatePomodoros) &&
    isBool(r.covered) &&
    ['easy', 'medium', 'hard'].includes(r.difficulty as string) &&
    (r.confidence === null || r.confidence === 1 || r.confidence === 2 || r.confidence === 3) &&
    isNum(r.order),
  blocks: (r) =>
    isNonEmptyStr(r.id) &&
    isDate(r.date) &&
    isNum(r.order) &&
    ['new', 'review', 'task'].includes(r.kind as string) &&
    isStrOrNull(r.topicId) &&
    isStrOrNull(r.examId) &&
    isStrOrNull(r.subjectId) &&
    isStr(r.title) &&
    isNum(r.pomodoros) &&
    isNum(r.completedPomodoros) &&
    ['planned', 'partial', 'done', 'skipped'].includes(r.status as string) &&
    ['auto', 'manual'].includes(r.source as string) &&
    isBool(r.pinned),
  sessions: (r) =>
    isNonEmptyStr(r.id) &&
    ['focus', 'shortBreak', 'longBreak'].includes(r.kind as string) &&
    isStrOrNull(r.blockId) &&
    isStrOrNull(r.topicId) &&
    isStrOrNull(r.examId) &&
    isStrOrNull(r.subjectId) &&
    isStr(r.startedAt) &&
    !Number.isNaN(Date.parse(r.startedAt as string)) &&
    isStr(r.endedAt) &&
    isNum(r.actualMinutes) &&
    isBool(r.completed),
}

function validSettings(v: unknown): v is Obj {
  if (!isObj(v)) return false
  // Every present field must have the right type; missing fields are filled from defaults.
  const d = defaultSettings() as unknown as Obj
  for (const [k, def] of Object.entries(d)) {
    if (k === 'id' || !(k in v)) continue
    const val = v[k]
    if (Array.isArray(def)) {
      if (!Array.isArray(val)) return false
      if (k === 'blackoutDates' ? !val.every(isDate) : !val.every(isNum)) return false
    } else if (typeof def !== typeof val) return false
  }
  if ('dailyCapacity' in v && (v.dailyCapacity as unknown[]).length !== 7) return false
  return true
}

/** Parse and validate backup text. Never throws. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: IMPORT_ERRORS.notJson }
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP || raw.version !== BACKUP_VERSION) {
    return { ok: false, error: IMPORT_ERRORS.wrongApp }
  }
  for (const key of TABLE_KEYS) {
    const rows = raw[key]
    if (!Array.isArray(rows) || !rows.every((r) => isObj(r) && rowCheck[key](r))) {
      return { ok: false, error: IMPORT_ERRORS.invalid(key) }
    }
    if (new Set(rows.map((r) => (r as Obj).id)).size !== rows.length) {
      return { ok: false, error: IMPORT_ERRORS.invalid(key) }
    }
  }
  if (!validSettings(raw.settings)) return { ok: false, error: IMPORT_ERRORS.invalid('settings') }

  const settings: Settings = { ...defaultSettings(), ...(raw.settings as Partial<Settings>), id: SETTINGS_ID }
  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : '',
      subjects: raw.subjects as Subject[],
      exams: raw.exams as Exam[],
      topics: raw.topics as Topic[],
      blocks: raw.blocks as Block[],
      sessions: raw.sessions as FocusSession[],
      settings,
    },
  }
}

// ---------------------------------------------------------------- database

/** Read the whole database into a backup object. */
export async function readBackup(): Promise<Backup> {
  return db.transaction('r', allTables(), async () => {
    const [subjects, exams, topics, blocks, sessions, settingsRow] = await Promise.all([
      db.subjects.toArray(),
      db.exams.toArray(),
      db.topics.toArray(),
      db.blocks.toArray(),
      db.sessions.toArray(),
      db.settings.get(SETTINGS_ID),
    ])
    const settings: Settings = { ...defaultSettings(), ...(settingsRow ?? {}), id: SETTINGS_ID }
    return buildBackup({ subjects, exams, topics, blocks, sessions, settings })
  })
}

/**
 * Replace everything with the backup in ONE transaction (all-or-nothing).
 * Writes an empty `meta.plan` (the scheduler rebuilds it; no stale catch-up notice)
 * and the `meta.seed` marker so the demo is never re-seeded over imported data.
 */
export async function replaceAllData(backup: Backup): Promise<void> {
  const seed: SeedMeta = { key: 'seed', seededAt: new Date().toISOString(), version: SEED_VERSION }
  await db.transaction('rw', allTables(), async () => {
    await Promise.all(allTables().map((t) => t.clear()))
    await db.subjects.bulkPut(backup.subjects)
    await db.exams.bulkPut(backup.exams)
    await db.topics.bulkPut(backup.topics)
    await db.blocks.bulkPut(backup.blocks)
    await db.sessions.bulkPut(backup.sessions)
    await db.settings.put({ ...backup.settings, id: SETTINGS_ID })
    await db.meta.bulkPut([emptyPlanMeta(), seed])
  })
}

// ---------------------------------------------------------------- browser

/** Trigger a download of the backup as a JSON file. Returns the file name. */
export function downloadBackup(backup: Backup, fileName: string = backupFileName()): string {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke after the click has been handled.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return fileName
}

/** Forget any persisted running timer so it cannot point at blocks that no longer exist. */
export function resetTimerStorage(): void {
  try {
    localStorage.removeItem(TIMER_STORAGE_KEY)
  } catch {
    // Storage blocked: nothing persisted to clear.
  }
}

// ---------------------------------------------------------------- copy helpers

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

/** "3 subjects, 3 exams and 12 topics". */
export function countsPhrase(c: { subjects: number; exams: number; topics: number }): string {
  return `${plural(c.subjects, 'subject')}, ${plural(c.exams, 'exam')} and ${plural(c.topics, 'topic')}`
}

/** Import success toast (screens/data.md): "Backup imported: 3 subjects, 3 exams, 12 topics." */
export function importedToast(c: { subjects: number; exams: number; topics: number }): string {
  return `Backup imported: ${plural(c.subjects, 'subject')}, ${plural(c.exams, 'exam')}, ${plural(c.topics, 'topic')}.`
}
