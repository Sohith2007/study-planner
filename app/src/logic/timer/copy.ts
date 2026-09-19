/** Timer copy (screens/focus.md "Notifications and title", accessibility.md live announcements). Pure. */
import type { PhaseEndEffect, TimerPhase } from './engine'

const MINUTE = 60_000

export interface NotificationCopy {
  title: string
  body: string
}

/** Focus end: "Focus complete" / "Nice work. Take a 5-minute break." Break end: "Break over". */
export function notificationFor(effect: Pick<PhaseEndEffect, 'phase' | 'nextDurationMs'>): NotificationCopy {
  if (effect.phase === 'focus') {
    const m = Math.max(1, Math.round(effect.nextDurationMs / MINUTE))
    return { title: 'Focus complete', body: `Nice work. Take a ${m}-minute break.` }
  }
  return { title: 'Break over', body: 'Ready for the next pomodoro?' }
}

const BREAK_NAME: Record<TimerPhase, string> = { focus: 'Focus', shortBreak: 'Short break', longBreak: 'Long break' }

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

/** "18 minutes 42 seconds" (for the sr-only live region). */
export function spokenDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  if (m === 0) return plural(s, 'second')
  if (s === 0) return plural(m, 'minute')
  return `${plural(m, 'minute')} ${plural(s, 'second')}`
}

/** Phase-event announcements only (never per-second). */
export function startedAnnouncement(phase: TimerPhase, durationMs: number | null): string {
  const name = phase === 'focus' ? 'Focus' : BREAK_NAME[phase]
  return durationMs ? `${name} started. ${spokenDuration(durationMs)}.` : `${name} started.`
}

export function pausedAnnouncement(ms: number): string {
  return `Paused at ${spokenDuration(ms)}.`
}

export function phaseEndAnnouncement(effect: Pick<PhaseEndEffect, 'phase' | 'next' | 'nextDurationMs'>): string {
  if (effect.phase === 'focus') {
    return `Focus complete. ${BREAK_NAME[effect.next]}, ${spokenDuration(effect.nextDurationMs)}.`
  }
  return 'Break over.'
}
