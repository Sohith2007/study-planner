import { describe, expect, it } from 'vitest'
import { defaultSettings } from '@/db'
import {
  BLACKOUT_MSG,
  capacitySummary,
  formFromSettings,
  isDefaultReviewOffsets,
  reviewText,
  setFieldValue,
  statusText,
  toPatch,
  validateAll,
  validateBlackout,
} from './settingsLogic'

describe('settings form', () => {
  it('round-trips the defaults and summarises capacity', () => {
    const f = formFromSettings(defaultSettings())
    expect(f.capacity).toEqual(['4', '6', '6', '6', '6', '6', '8'])
    expect(validateAll(f)).toEqual({})
    const { dailyCapacity, focusMinutes, blackoutDates } = toPatch(f)
    expect(dailyCapacity).toEqual([4, 6, 6, 6, 6, 6, 8])
    expect(focusMinutes).toBe(25)
    expect(blackoutDates).toEqual([])
    // 42 pomodoros x 25 min = 1050 min
    expect(capacitySummary(f, 25)).toBe('42 pomodoros a week · about 17 h 30 min of focus')
    const wed3 = setFieldValue(f, 'capacity-3', '3')
    expect(toPatch(wed3).dailyCapacity[3]).toBe(3)
    expect(capacitySummary(wed3, 25)).toBe('39 pomodoros a week · about 16 h 15 min of focus')
  })

  it('flags every out-of-range or non-integer field', () => {
    let f = formFromSettings(defaultSettings())
    f = setFieldValue(f, 'capacity-3', '17')
    f = setFieldValue(f, 'capacity-0', '')
    f = setFieldValue(f, 'focus-minutes', '4')
    f = setFieldValue(f, 'short-break-minutes', '31')
    f = setFieldValue(f, 'long-break-minutes', '61')
    f = setFieldValue(f, 'long-break-every', '1')
    f = setFieldValue(f, 'daily-goal', '17')
    expect(validateAll(f)).toEqual({
      'capacity-3': 'Use 0–16.',
      'capacity-0': 'Use 0–16.',
      'focus-minutes': 'Focus must be 5–120 minutes.',
      'short-break-minutes': 'Short break must be 1–30 minutes.',
      'long-break-minutes': 'Long break must be 5–60 minutes.',
      'long-break-every': 'Choose 2–8 focus sessions.',
      'daily-goal': 'Goal must be 1–16 pomodoros.',
    })
    expect(Object.keys(validateAll(setFieldValue(f, 'focus-minutes', '120')))).not.toContain('focus-minutes')
    expect(validateAll(setFieldValue(formFromSettings(defaultSettings()), 'focus-minutes', '2.5'))).toHaveProperty(
      'focus-minutes',
    )
  })

  it('validates blackout dates', () => {
    const today = '2026-09-19'
    expect(validateBlackout('', today, [])).toBe(BLACKOUT_MSG.missing)
    expect(validateBlackout('2026-09-18', today, [])).toBe(BLACKOUT_MSG.past)
    expect(validateBlackout('2026-10-03', today, ['2026-10-03'])).toBe(BLACKOUT_MSG.duplicate)
    expect(validateBlackout('2026-09-19', today, [])).toBeNull()
  })

  it('writes review and status copy', () => {
    expect(reviewText([1, 3, 7])).toBe('Each topic gets short reviews +1, +3 and +7 days after you first study it.')
    expect(reviewText([1, 3])).toBe('Each topic gets short reviews +1 and +3 days after you first study it.')
    expect(reviewText([])).toBe('Reviews are turned off.')
    expect(isDefaultReviewOffsets([1, 3, 7])).toBe(true)
    expect(isDefaultReviewOffsets([1, 3])).toBe(false)
    expect(statusText(0, false).text).toBe('All changes saved')
    expect(statusText(0, true).text).toBe('You have unsaved changes')
    expect(statusText(1, true).text).toBe('Fix 1 field to save.')
    expect(statusText(2, true).text).toBe('Fix 2 fields to save.')
  })
})
