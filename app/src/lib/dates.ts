import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns'
import type { ISODate } from '@/types'

/** Parse a local `YYYY-MM-DD` date into a Date at local midnight. */
export function parseISODate(iso: ISODate): Date {
  return parseISO(iso)
}

/** Format a Date as a local `YYYY-MM-DD` string. */
export function toISODate(d: Date): ISODate {
  return format(d, 'yyyy-MM-dd')
}

/** Today's local date as `YYYY-MM-DD` (respects Playwright's page.clock). */
export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now)
}

/** `iso` shifted by `n` days (n may be negative). */
export function addDaysISO(iso: ISODate, n: number): ISODate {
  return toISODate(addDays(parseISODate(iso), n))
}

/** JS weekday of a date: 0 = Sunday ... 6 = Saturday (index into settings.dailyCapacity). */
export function weekdayOf(iso: ISODate): number {
  return parseISODate(iso).getDay()
}

/** Monday of the week containing `iso`. */
export function startOfWeekISO(iso: ISODate): ISODate {
  return toISODate(startOfWeek(parseISODate(iso), { weekStartsOn: 1 }))
}

/** The 7 dates Monday..Sunday of the week containing `iso`. */
export function weekDatesISO(iso: ISODate): ISODate[] {
  const start = startOfWeekISO(iso)
  return Array.from({ length: 7 }, (_, i) => addDaysISO(start, i))
}

/** Whole calendar days from `a` to `b` (b - a). daysBetween('2026-09-19','2026-09-26') === 7. */
export function daysBetween(a: ISODate, b: ISODate): number {
  return differenceInCalendarDays(parseISODate(b), parseISODate(a))
}

/** Local date of an ISO timestamp (e.g. a session's startedAt) as `YYYY-MM-DD`. */
export function isoDateOfTimestamp(ts: string): ISODate {
  return toISODate(new Date(ts))
}

/** Weekday names indexed by JS weekday (0 = Sunday). */
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
/** JS weekday indexes in Monday-first display order. */
export const MONDAY_FIRST_WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] as const
