/**
 * Pure form model for the Settings screen (screens/settings.md): the local form state, validation
 * copy, the patch written by saveSettings, and the summary texts. Unit-testable (no Dexie).
 */
import type { ISODate, Settings, TimerMode } from '@/types'

export const DEFAULT_REVIEW_OFFSETS = [1, 3, 7] as const

export interface SettingsForm {
  /** Indexed by JS weekday (0 = Sunday), as typed. */
  capacity: string[]
  focus: string
  shortBreak: string
  longBreak: string
  longBreakEvery: string
  dailyGoal: string
  timerMode: TimerMode
  /** Sorted ascending. */
  blackoutDates: ISODate[]
  reviewOffsets: number[]
  soundEnabled: boolean
  notificationsEnabled: boolean
}

/** Numeric field keys; each equals the field's data-testid. */
export type NumericFieldKey =
  | 'capacity-0'
  | 'capacity-1'
  | 'capacity-2'
  | 'capacity-3'
  | 'capacity-4'
  | 'capacity-5'
  | 'capacity-6'
  | 'focus-minutes'
  | 'short-break-minutes'
  | 'long-break-minutes'
  | 'long-break-every'
  | 'daily-goal'

/** Numeric fields in DOM (tab) order: Mon..Sun, then timer fields, then the goal. */
export const FIELD_ORDER: NumericFieldKey[] = [
  'capacity-1',
  'capacity-2',
  'capacity-3',
  'capacity-4',
  'capacity-5',
  'capacity-6',
  'capacity-0',
  'focus-minutes',
  'short-break-minutes',
  'long-break-minutes',
  'long-break-every',
  'daily-goal',
]

const RULES: Record<Exclude<NumericFieldKey, `capacity-${number}`>, { min: number; max: number; msg: string }> = {
  'focus-minutes': { min: 5, max: 120, msg: 'Focus must be 5–120 minutes.' },
  'short-break-minutes': { min: 1, max: 30, msg: 'Short break must be 1–30 minutes.' },
  'long-break-minutes': { min: 5, max: 60, msg: 'Long break must be 5–60 minutes.' },
  'long-break-every': { min: 2, max: 8, msg: 'Choose 2–8 focus sessions.' },
  'daily-goal': { min: 1, max: 16, msg: 'Goal must be 1–16 pomodoros.' },
}
const CAPACITY_RULE = { min: 0, max: 16, msg: 'Use 0–16.' }

export const BLACKOUT_MSG = {
  missing: 'Pick a date.',
  past: "Blackout dates can't be in the past.",
  duplicate: 'That date is already blacked out.',
} as const

export function ruleFor(key: NumericFieldKey): { min: number; max: number; msg: string } {
  return key.startsWith('capacity-') ? CAPACITY_RULE : RULES[key as keyof typeof RULES]
}

/** An integer string within [min, max], else null. Empty and non-integer input is invalid. */
export function parseIntIn(raw: string, min: number, max: number): number | null {
  const s = raw.trim()
  if (!/^\d+$/.test(s)) return null
  const n = Number(s)
  return n >= min && n <= max ? n : null
}

export function formFromSettings(s: Settings): SettingsForm {
  return {
    capacity: Array.from({ length: 7 }, (_, i) => String(s.dailyCapacity[i] ?? 0)),
    focus: String(s.focusMinutes),
    shortBreak: String(s.shortBreakMinutes),
    longBreak: String(s.longBreakMinutes),
    longBreakEvery: String(s.longBreakEvery),
    dailyGoal: String(s.dailyGoalPomodoros),
    timerMode: s.timerMode,
    blackoutDates: [...s.blackoutDates].sort(),
    reviewOffsets: [...s.reviewOffsets],
    soundEnabled: s.soundEnabled,
    notificationsEnabled: s.notificationsEnabled,
  }
}

export function getFieldValue(f: SettingsForm, key: NumericFieldKey): string {
  switch (key) {
    case 'focus-minutes':
      return f.focus
    case 'short-break-minutes':
      return f.shortBreak
    case 'long-break-minutes':
      return f.longBreak
    case 'long-break-every':
      return f.longBreakEvery
    case 'daily-goal':
      return f.dailyGoal
    default:
      return f.capacity[Number(key.slice('capacity-'.length))]
  }
}

export function setFieldValue(f: SettingsForm, key: NumericFieldKey, value: string): SettingsForm {
  switch (key) {
    case 'focus-minutes':
      return { ...f, focus: value }
    case 'short-break-minutes':
      return { ...f, shortBreak: value }
    case 'long-break-minutes':
      return { ...f, longBreak: value }
    case 'long-break-every':
      return { ...f, longBreakEvery: value }
    case 'daily-goal':
      return { ...f, dailyGoal: value }
    default: {
      const i = Number(key.slice('capacity-'.length))
      const capacity = [...f.capacity]
      capacity[i] = value
      return { ...f, capacity }
    }
  }
}

export function validateField(f: SettingsForm, key: NumericFieldKey): string | null {
  const r = ruleFor(key)
  return parseIntIn(getFieldValue(f, key), r.min, r.max) === null ? r.msg : null
}

export type FieldErrors = Partial<Record<NumericFieldKey, string>>

export function validateAll(f: SettingsForm): FieldErrors {
  const errors: FieldErrors = {}
  for (const key of FIELD_ORDER) {
    const e = validateField(f, key)
    if (e) errors[key] = e
  }
  return errors
}

/** The settings patch for a valid form (call validateAll first). */
export function toPatch(f: SettingsForm): Omit<Settings, 'id'> {
  const n = (s: string) => Number(s.trim())
  return {
    dailyCapacity: f.capacity.map(n),
    focusMinutes: n(f.focus),
    shortBreakMinutes: n(f.shortBreak),
    longBreakMinutes: n(f.longBreak),
    longBreakEvery: n(f.longBreakEvery),
    timerMode: f.timerMode,
    dailyGoalPomodoros: n(f.dailyGoal),
    blackoutDates: [...f.blackoutDates].sort(),
    reviewOffsets: [...f.reviewOffsets],
    soundEnabled: f.soundEnabled,
    notificationsEnabled: f.notificationsEnabled,
  }
}

export function formsEqual(a: SettingsForm, b: SettingsForm): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Blackout date to add: required, today or later, not already listed. */
export function validateBlackout(date: string, today: ISODate, existing: ISODate[]): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return BLACKOUT_MSG.missing
  if (date < today) return BLACKOUT_MSG.past
  if (existing.includes(date)) return BLACKOUT_MSG.duplicate
  return null
}

/** "38 pomodoros a week · about 15 h 50 min of focus". Invalid capacities count as 0. */
export function capacitySummary(f: SettingsForm, fallbackFocus: number): string {
  const total = f.capacity.reduce((sum, c) => sum + (parseIntIn(c, 0, 16) ?? 0), 0)
  const focus = parseIntIn(f.focus, 5, 120) ?? fallbackFocus
  const minutes = total * focus
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const time = h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`
  return `${total} ${total === 1 ? 'pomodoro' : 'pomodoros'} a week · about ${time} of focus`
}

/** Review schedule sentence from the offsets. */
export function reviewText(offsets: number[]): string {
  if (offsets.length === 0) return 'Reviews are turned off.'
  const parts = offsets.map((o) => `+${o}`)
  const joined = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
  const days = offsets.length === 1 && offsets[0] === 1 ? 'day' : 'days'
  return `Each topic gets short ${offsets.length === 1 ? 'review' : 'reviews'} ${joined} ${days} after you first study it.`
}

export function isDefaultReviewOffsets(offsets: number[]): boolean {
  return offsets.length === DEFAULT_REVIEW_OFFSETS.length && offsets.every((o, i) => o === DEFAULT_REVIEW_OFFSETS[i])
}

/** Footer status text. */
export function statusText(errorCount: number, dirty: boolean): { text: string; tone: 'muted' | 'text' | 'danger' } {
  if (errorCount > 0) return { text: `Fix ${errorCount} ${errorCount === 1 ? 'field' : 'fields'} to save.`, tone: 'danger' }
  return dirty ? { text: 'You have unsaved changes', tone: 'text' } : { text: 'All changes saved', tone: 'muted' }
}
