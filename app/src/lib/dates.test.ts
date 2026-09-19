import { describe, expect, it } from 'vitest'
import { addDaysISO, daysBetween, startOfWeekISO, todayISO, weekDatesISO, weekdayOf } from './dates'
import { countdownLabel, formatMs } from './format'
import { autoBlockId } from './ids'

describe('date helpers', () => {
  it('todayISO formats local date', () => {
    expect(todayISO(new Date(2026, 8, 19, 23, 30))).toBe('2026-09-19')
  })
  it('addDaysISO crosses month and year boundaries', () => {
    expect(addDaysISO('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDaysISO('2026-01-01', -1)).toBe('2025-12-31')
  })
  it('weekdayOf uses JS weekday numbering', () => {
    expect(weekdayOf('2026-09-19')).toBe(6) // Saturday
    expect(weekdayOf('2026-09-20')).toBe(0) // Sunday
  })
  it('startOfWeekISO returns Monday', () => {
    expect(startOfWeekISO('2026-09-19')).toBe('2026-09-14')
    expect(startOfWeekISO('2026-09-20')).toBe('2026-09-14')
    expect(startOfWeekISO('2026-09-21')).toBe('2026-09-21')
    expect(weekDatesISO('2026-09-16')).toHaveLength(7)
  })
  it('daysBetween counts calendar days', () => {
    expect(daysBetween('2026-09-19', '2026-09-29')).toBe(10)
    expect(daysBetween('2026-09-19', '2026-09-18')).toBe(-1)
  })
})

describe('format helpers', () => {
  it('formatMs', () => {
    expect(formatMs(25 * 60_000)).toBe('25:00')
    expect(formatMs(59_400)).toBe('00:59')
    expect(formatMs(-5)).toBe('00:00')
  })
  it('countdownLabel', () => {
    expect(countdownLabel('2026-10-01', '2026-09-19')).toBe('in 12 days')
    expect(countdownLabel('2026-09-19', '2026-09-19')).toBe('today')
  })
  it('autoBlockId is deterministic', () => {
    expect(autoBlockId('t1', 'review', 2)).toBe('auto:t1:review:2')
  })
})
