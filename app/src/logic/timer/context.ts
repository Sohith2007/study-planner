import { createContext } from 'react'
import type { Settings } from '@/types'
import type { TimerModeValue, TimerLink, TimerNotice, TimerPhase, TimerSnapshot } from './engine'

/** Public API (master-plan 4.3, frozen). */
export interface TimerApi extends TimerSnapshot {
  start(blockId?: string | null): void
  pause(): void
  resume(): void
  skip(): void
  reset(): void
  endFlow(): void
}

/** Why notifications cannot fire (drives the Focus page `notifications-hint`). */
export type NotificationHint = 'none' | 'off' | 'settings-off'

/**
 * Extra, P2-only details used by the Focus page. Added export (the frozen contract is unchanged).
 */
export interface TimerDetails {
  /** True once settings have loaded (the Focus page shows `focus-loading` until then). */
  ready: boolean
  settings: Settings | null
  /** Link captured at Start (topic/exam/subject ids and a label). */
  link: TimerLink | null
  /** What just finished, while the next phase waits for Start. */
  notice: TimerNotice | null
  /** Text for the sr-only live region (phase events only). */
  announcement: string
  /** Increments each time saving a session fails. */
  saveErrorCount: number
  notificationHint: NotificationHint
  /** Switch Classic/Flowtime for the current timer (idle only; not saved to settings). */
  setMode(mode: TimerModeValue): void
  longBreakEvery: number
  /** Default lengths from settings, in ms. */
  lengths: Record<TimerPhase, number>
}

const noop = () => {}

export const IDLE_API: TimerApi = {
  status: 'idle',
  phase: 'focus',
  mode: 'classic',
  remainingMs: 25 * 60_000,
  elapsedMs: 0,
  durationMs: 25 * 60_000,
  endsAt: null,
  blockId: null,
  completedFocusCount: 0,
  start: noop,
  pause: noop,
  resume: noop,
  skip: noop,
  reset: noop,
  endFlow: noop,
}

export const IDLE_DETAILS: TimerDetails = {
  ready: false,
  settings: null,
  link: null,
  notice: null,
  announcement: '',
  saveErrorCount: 0,
  notificationHint: 'none',
  setMode: noop,
  longBreakEvery: 4,
  lengths: { focus: 25 * 60_000, shortBreak: 5 * 60_000, longBreak: 15 * 60_000 },
}

export const TimerContext = createContext<TimerApi>(IDLE_API)
export const TimerDetailsContext = createContext<TimerDetails>(IDLE_DETAILS)
