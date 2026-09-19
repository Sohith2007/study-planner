import { format } from 'date-fns'
import type { BlockKind, BlockStatus, ISODate, SessionKind } from '@/types'
import { daysBetween, parseISODate, todayISO } from './dates'

/** Milliseconds -> `MM:SS` (minutes may exceed 59, e.g. `75:00`). Negative values clamp to 0. */
export function formatMs(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Countdown label relative to today: "today", "tomorrow", "in N days", "N days ago", "yesterday". */
export function countdownLabel(date: ISODate, today: ISODate = todayISO()): string {
  const n = daysBetween(today, date)
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n === -1) return 'yesterday'
  return n > 0 ? `in ${n} days` : `${-n} days ago`
}

/** e.g. "Saturday, 19 September 2026" (Today heading). */
export function formatLongDate(date: ISODate): string {
  return format(parseISODate(date), 'EEEE, d MMMM yyyy')
}

/** e.g. "Sat 19 Sep". */
export function formatShortDate(date: ISODate): string {
  return format(parseISODate(date), 'EEE d MMM')
}

/** "n/m pomodoros". */
export function pomodoroProgress(completed: number, total: number): string {
  return `${completed}/${total} pomodoros`
}

/** Minutes -> "1h 25m" / "25m" / "0m". */
export function formatMinutes(min: number): string {
  const m = Math.max(0, Math.round(min))
  const h = Math.floor(m / 60)
  const r = m % 60
  return h > 0 ? (r > 0 ? `${h}h ${r}m` : `${h}h`) : `${r}m`
}

export const BLOCK_KIND_LABEL: Record<BlockKind, string> = { new: 'New', review: 'Review', task: 'Task' }
export const BLOCK_STATUS_LABEL: Record<BlockStatus, string> = {
  planned: 'Planned',
  partial: 'Partial',
  done: 'Done',
  skipped: 'Skipped',
}
export const PHASE_LABEL: Record<SessionKind, string> = {
  focus: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break',
}

/** Eight preset subject colours (design tokens.json subjectPresets; Setup colour picker). */
export const SUBJECT_COLOR_PRESETS = [
  { key: 'indigo', name: 'Indigo', value: '#6366F1' },
  { key: 'amber', name: 'Amber', value: '#F59E0B' },
  { key: 'emerald', name: 'Emerald', value: '#10B981' },
  { key: 'rose', name: 'Rose', value: '#F43F5E' },
  { key: 'sky', name: 'Sky', value: '#0EA5E9' },
  { key: 'violet', name: 'Violet', value: '#8B5CF6' },
  { key: 'orange', name: 'Orange', value: '#F97316' },
  { key: 'slate', name: 'Slate', value: '#64748B' },
] as const
