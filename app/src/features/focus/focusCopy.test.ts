import { describe, expect, it } from 'vitest'
import { completeMessage, cycleText, modeHelper, notificationHintText } from './focusCopy'

const MIN = 60_000
const lengths = { focus: 25 * MIN, shortBreak: 5 * MIN, longBreak: 15 * MIN }

describe('focus page copy', () => {
  it('mode helper', () => {
    expect(modeHelper('classic', false, lengths, 4)).toBe('25-minute focus, 5-minute breaks, a 15-minute break every 4.')
    expect(modeHelper('flowtime', false, lengths, 4)).toBe(
      'Focus as long as it flows. Your break is a fifth of the time you focused.',
    )
    expect(modeHelper('classic', true, lengths, 4)).toBe('Reset the timer to switch modes.')
  })

  it('cycle line', () => {
    expect(cycleText('focus', 1, 4)).toBe('Pomodoro 2 of 4 · long break after 4')
    expect(cycleText('shortBreak', 2, 4)).toBe('Break · pomodoro 3 is next')
  })

  it('completion messages', () => {
    const base = { kind: 'focusDone', mode: 'classic', credited: 1, minutes: 25, blockId: 'b', label: 'Derivatives', next: 'shortBreak' } as const
    expect(completeMessage(base, 4)).toBe('Focus complete. 1 pomodoro added to Derivatives.')
    expect(completeMessage({ ...base, blockId: null, label: null }, 4)).toBe('Focus complete. Logged 25 minutes.')
    expect(completeMessage({ ...base, next: 'longBreak' }, 4)).toBe(
      "Focus complete. 1 pomodoro added to Derivatives. That's 4. Take a proper rest.",
    )
    expect(completeMessage({ ...base, mode: 'flowtime', minutes: 20 }, 4)).toBe('Focus complete. 20 minutes logged.')
    expect(completeMessage({ kind: 'breakDone' }, 4)).toBe('Break over. Ready when you are.')
  })

  it('notifications hint', () => {
    expect(notificationHintText('none', true)).toBeNull()
    expect(notificationHintText('off', true)).toBe(
      "Notifications are off. You'll still hear the chime and see the time in the tab title.",
    )
    expect(notificationHintText('settings-off', false)).toBe(
      "Notifications are off in Settings. You'll still see the time in the tab title.",
    )
  })
})
