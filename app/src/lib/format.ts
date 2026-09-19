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

/** e.g. "Saturday, 19 September". */
export function formatLongDate(date: ISODate): string {
  return format(parseISODate(date), 'EEEE, d MMMM')
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

/** Eight preset subject colours (Setup colour picker). */
export const SUBJECT_COLOR_PRESETS = [
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#3b82f6',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
] as const
