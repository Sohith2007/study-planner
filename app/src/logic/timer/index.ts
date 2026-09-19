/**
 * Timer engine contract (master-plan 4.3).
 * P0 STAND-IN: TimerProvider passes children through; useTimer returns an idle 25:00 focus
 * with no-op actions. P2 replaces the implementation; exported names and signatures are frozen.
 * This file is `.ts`, so it avoids JSX (P2 may re-export from a `.tsx` module instead).
 */
import { createElement, Fragment, type JSX, type ReactNode } from 'react'

export type TimerPhase = 'focus' | 'shortBreak' | 'longBreak'

export interface TimerSnapshot {
  status: 'idle' | 'running' | 'paused'
  phase: TimerPhase
  mode: 'classic' | 'flowtime'
  remainingMs: number
  elapsedMs: number
  durationMs: number
  endsAt: number | null
  blockId: string | null
  completedFocusCount: number
}

export interface TimerApi extends TimerSnapshot {
  start(blockId?: string | null): void
  pause(): void
  resume(): void
  skip(): void
  reset(): void
  endFlow(): void
}

const noop = () => {}

const IDLE: TimerApi = {
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

export function TimerProvider(props: { children: ReactNode }): JSX.Element {
  return createElement(Fragment, null, props.children)
}

export function useTimer(): TimerApi {
  return IDLE
}
