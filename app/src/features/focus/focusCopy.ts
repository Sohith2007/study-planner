/** Focus page copy (screens/focus.md). Pure, so it is unit-tested. */
import type { NotificationHint, TimerNotice, TimerPhase } from '@/logic/timer'

const MINUTE = 60_000
const mins = (ms: number) => Math.round(ms / MINUTE)

export function modeHelper(
  mode: 'classic' | 'flowtime',
  locked: boolean,
  lengths: Record<TimerPhase, number>,
  every: number,
): string {
  if (locked) return 'Reset the timer to switch modes.'
  if (mode === 'flowtime') return 'Focus as long as it flows. Your break is a fifth of the time you focused.'
  return `${mins(lengths.focus)}-minute focus, ${mins(lengths.shortBreak)}-minute breaks, a ${mins(lengths.longBreak)}-minute break every ${every}.`
}

/** `Pomodoro 2 of 4 · long break after 4` / `Break · pomodoro 3 is next`. */
export function cycleText(phase: TimerPhase, completedFocusCount: number, every: number): string {
  const n = (completedFocusCount % every) + 1
  return phase === 'focus' ? `Pomodoro ${n} of ${every} · long break after ${every}` : `Break · pomodoro ${n} is next`
}

/** The `timer-complete-msg` line shown while the next phase waits. */
export function completeMessage(notice: TimerNotice, every: number): string {
  if (notice.kind === 'breakDone') return 'Break over. Ready when you are.'
  if (notice.mode === 'flowtime') return `Focus complete. ${notice.minutes} ${notice.minutes === 1 ? 'minute' : 'minutes'} logged.`
  const main =
    notice.blockId && notice.label && notice.credited > 0
      ? `Focus complete. ${notice.credited} ${notice.credited === 1 ? 'pomodoro' : 'pomodoros'} added to ${notice.label}.`
      : `Focus complete. Logged ${notice.minutes} minutes.`
  return notice.next === 'longBreak' ? `${main} That's ${every}. Take a proper rest.` : main
}

export function notificationHintText(hint: NotificationHint, soundEnabled: boolean): string | null {
  if (hint === 'none') return null
  const tail = soundEnabled
    ? "You'll still hear the chime and see the time in the tab title."
    : "You'll still see the time in the tab title."
  return hint === 'settings-off' ? `Notifications are off in Settings. ${tail}` : `Notifications are off. ${tail}`
}
