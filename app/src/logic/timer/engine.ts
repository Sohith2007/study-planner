/**
 * Pure Pomodoro timer engine (P2). No DOM, no Date.now(), no storage: every function takes `now`
 * (epoch ms) and a `TimerConfig`, so the reducer is fully unit-testable and works with Playwright's
 * page.clock (the provider feeds it Date.now()).
 *
 * Time is never counted by ticks. A running countdown stores `endsAt`, so remaining = endsAt - now,
 * which stays correct when a background tab throttles timers. A running Flowtime focus stores
 * `anchorAt`, so elapsed = now - anchorAt. Pausing freezes the value in `pausedMs`.
 *
 * Phases never start on their own: when one ends, the next one is shown idle and waits for Start.
 */
import type { Settings } from '@/types'

export type TimerPhase = 'focus' | 'shortBreak' | 'longBreak'
export type TimerStatus = 'idle' | 'running' | 'paused'
export type TimerModeValue = 'classic' | 'flowtime'

/** Public snapshot (master-plan 4.3, frozen). */
export interface TimerSnapshot {
  status: TimerStatus
  phase: TimerPhase
  mode: TimerModeValue
  /** Whole seconds, rounded up (countdown). 0 during a Flowtime focus. */
  remainingMs: number
  /** Whole seconds, rounded down. */
  elapsedMs: number
  durationMs: number
  /** Set only while a countdown is running. */
  endsAt: number | null
  blockId: string | null
  completedFocusCount: number
}

/** Settings-derived lengths. Built from the settings row with `configFromSettings`. */
export interface TimerConfig {
  focusMs: number
  shortBreakMs: number
  longBreakMs: number
  longBreakEvery: number
  defaultMode: TimerModeValue
}

/** What the timer is linked to, captured at Start so a session can be saved even if the block is deleted. */
export interface TimerLink {
  topicId: string | null
  examId: string | null
  subjectId: string | null
  /** Topic name (or block title) for "1 pomodoro added to <label>". */
  label: string | null
}

/** Message about the phase that just ended; shown on the Focus page while the next phase waits. */
export type TimerNotice =
  | {
      kind: 'focusDone'
      mode: TimerModeValue
      credited: number
      minutes: number
      blockId: string | null
      label: string | null
      next: TimerPhase
    }
  | { kind: 'breakDone' }

export interface TimerState {
  v: 1
  status: TimerStatus
  phase: TimerPhase
  /** null = follow settings.timerMode. Set by the Focus page mode switch (not saved to settings). */
  mode: TimerModeValue | null
  /** Running countdown: the wall-clock end. */
  endsAt: number | null
  /** Running Flowtime focus: elapsed = now - anchorAt. */
  anchorAt: number | null
  /** Paused: remaining ms (countdown) or elapsed ms (Flowtime focus). */
  pausedMs: number | null
  /** Length of the started countdown phase (fixed at Start so a settings change mid-phase does not move it). */
  durationMs: number | null
  /** Idle length override (the computed Flowtime break). null = from config. */
  idleDurationMs: number | null
  /** Wall-clock ms when the current phase was first started. */
  phaseStartedAt: number | null
  blockId: string | null
  link: TimerLink | null
  completedFocusCount: number
  notice: TimerNotice | null
}

/** Emitted when a phase completes (not on skip or reset). The provider saves a session and notifies. */
export interface PhaseEndEffect {
  type: 'phaseEnd'
  phase: TimerPhase
  mode: TimerModeValue
  blockId: string | null
  link: TimerLink | null
  startedAt: number
  endedAt: number
  plannedMinutes: number
  actualMinutes: number
  pomodorosCredited: number
  next: TimerPhase
  nextDurationMs: number
}

export type TimerEffect = PhaseEndEffect

export type TimerAction =
  | { type: 'start'; blockId?: string | null }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'skip' }
  | { type: 'reset' }
  | { type: 'endFlow' }
  | { type: 'tick' }
  | { type: 'setMode'; mode: TimerModeValue }
  | { type: 'setLink'; blockId: string | null; link: TimerLink | null }

export interface ReduceResult {
  state: TimerState
  effects: TimerEffect[]
}

export const STORAGE_KEY = 'focusplan.timer.v1'
const MINUTE = 60_000

export const DEFAULT_CONFIG: TimerConfig = Object.freeze({
  focusMs: 25 * MINUTE,
  shortBreakMs: 5 * MINUTE,
  longBreakMs: 15 * MINUTE,
  longBreakEvery: 4,
  defaultMode: 'classic',
})

export function configFromSettings(s: Settings): TimerConfig {
  const mins = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v * MINUTE) : fallback
  return {
    focusMs: mins(s.focusMinutes, DEFAULT_CONFIG.focusMs),
    shortBreakMs: mins(s.shortBreakMinutes, DEFAULT_CONFIG.shortBreakMs),
    longBreakMs: mins(s.longBreakMinutes, DEFAULT_CONFIG.longBreakMs),
    longBreakEvery:
      typeof s.longBreakEvery === 'number' && s.longBreakEvery >= 1 ? Math.floor(s.longBreakEvery) : DEFAULT_CONFIG.longBreakEvery,
    defaultMode: s.timerMode === 'flowtime' ? 'flowtime' : 'classic',
  }
}

export function initialState(): TimerState {
  return {
    v: 1,
    status: 'idle',
    phase: 'focus',
    mode: null,
    endsAt: null,
    anchorAt: null,
    pausedMs: null,
    durationMs: null,
    idleDurationMs: null,
    phaseStartedAt: null,
    blockId: null,
    link: null,
    completedFocusCount: 0,
    notice: null,
  }
}

export function effectiveMode(state: TimerState, cfg: TimerConfig): TimerModeValue {
  return state.mode ?? cfg.defaultMode
}

/** True while the current phase counts up (Flowtime focus). */
export function isCountUp(state: TimerState, cfg: TimerConfig): boolean {
  return state.phase === 'focus' && effectiveMode(state, cfg) === 'flowtime'
}

export function phaseLength(phase: TimerPhase, cfg: TimerConfig): number {
  return phase === 'focus' ? cfg.focusMs : phase === 'shortBreak' ? cfg.shortBreakMs : cfg.longBreakMs
}

/** Flowtime break: a fifth of the focus time, at least 1 minute. */
export function flowBreakMs(elapsedMs: number): number {
  return Math.max(1, Math.round(elapsedMs / MINUTE / 5)) * MINUTE
}

/** Flowtime credit: floor(elapsed / focus length), at least 1 once a minute has passed. */
export function flowCredit(elapsedMs: number, cfg: TimerConfig): number {
  if (elapsedMs < MINUTE) return 0
  return Math.max(1, Math.floor(elapsedMs / cfg.focusMs))
}

/** The break that follows `count` completed focus sessions (classic). */
export function breakAfter(count: number, cfg: TimerConfig): TimerPhase {
  return count > 0 && count % cfg.longBreakEvery === 0 ? 'longBreak' : 'shortBreak'
}

/** Length of the current phase: the started length, else the idle override, else from config. */
export function currentDuration(state: TimerState, cfg: TimerConfig): number {
  if (state.status !== 'idle' && state.durationMs != null) return state.durationMs
  return state.idleDurationMs ?? phaseLength(state.phase, cfg)
}

/** Raw (unrounded) remaining ms of a countdown phase. */
function rawRemaining(state: TimerState, now: number, cfg: TimerConfig): number {
  if (state.status === 'running' && state.endsAt != null) return Math.max(0, state.endsAt - now)
  if (state.status === 'paused' && state.pausedMs != null) return Math.max(0, state.pausedMs)
  return currentDuration(state, cfg)
}

/** Raw elapsed ms of a Flowtime focus. */
function rawFlowElapsed(state: TimerState, now: number): number {
  if (state.status === 'running' && state.anchorAt != null) return Math.max(0, now - state.anchorAt)
  if (state.status === 'paused' && state.pausedMs != null) return Math.max(0, state.pausedMs)
  return 0
}

const ceilSec = (ms: number) => Math.ceil(ms / 1000) * 1000
const floorSec = (ms: number) => Math.floor(ms / 1000) * 1000

export function snapshot(state: TimerState, now: number, cfg: TimerConfig): TimerSnapshot {
  const mode = effectiveMode(state, cfg)
  const base = {
    status: state.status,
    phase: state.phase,
    mode,
    blockId: state.blockId,
    completedFocusCount: state.completedFocusCount,
  }
  if (isCountUp(state, cfg)) {
    return {
      ...base,
      remainingMs: 0,
      elapsedMs: floorSec(rawFlowElapsed(state, now)),
      durationMs: cfg.focusMs,
      endsAt: null,
    }
  }
  const duration = currentDuration(state, cfg)
  const remaining = rawRemaining(state, now, cfg)
  return {
    ...base,
    remainingMs: ceilSec(remaining),
    elapsedMs: floorSec(Math.max(0, duration - remaining)),
    durationMs: duration,
    endsAt: state.status === 'running' ? state.endsAt : null,
  }
}

/** Time shown on the clock: elapsed for a Flowtime focus, otherwise remaining. */
export function displayMs(snap: TimerSnapshot): number {
  return snap.mode === 'flowtime' && snap.phase === 'focus' ? snap.elapsedMs : snap.remainingMs
}

/** `MM:SS`; minutes are not wrapped into hours (`100:00`). */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const PHASE_TEXT: Record<TimerPhase, string> = {
  focus: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break',
}

/** document.title: `24:59 · Focus — FocusPlan` while running or paused, `FocusPlan` when idle. */
export function formatTitle(snap: TimerSnapshot): string {
  if (snap.status === 'idle') return 'FocusPlan'
  return `${formatClock(displayMs(snap))} · ${PHASE_TEXT[snap.phase]} — FocusPlan`
}

/** Move to the next phase, idle, waiting for Start. */
function toIdle(state: TimerState, phase: TimerPhase, patch: Partial<TimerState> = {}): TimerState {
  return {
    ...state,
    status: 'idle',
    phase,
    endsAt: null,
    anchorAt: null,
    pausedMs: null,
    durationMs: null,
    idleDurationMs: null,
    phaseStartedAt: null,
    ...patch,
  }
}

const minutesOf = (ms: number) => Math.round(ms / MINUTE)

/** Complete the running countdown phase at `endedAt` (its scheduled end, not the tick time). */
function completeCountdown(state: TimerState, endedAt: number, cfg: TimerConfig): ReduceResult {
  const mode = effectiveMode(state, cfg)
  const duration = currentDuration(state, cfg)
  const startedAt = state.phaseStartedAt ?? endedAt - duration
  if (state.phase === 'focus') {
    const count = state.completedFocusCount + 1
    const next = breakAfter(count, cfg)
    const effect: PhaseEndEffect = {
      type: 'phaseEnd',
      phase: 'focus',
      mode,
      blockId: state.blockId,
      link: state.link,
      startedAt,
      endedAt,
      plannedMinutes: minutesOf(duration),
      actualMinutes: minutesOf(duration),
      pomodorosCredited: 1,
      next,
      nextDurationMs: phaseLength(next, cfg),
    }
    const notice: TimerNotice = {
      kind: 'focusDone',
      mode,
      credited: 1,
      minutes: minutesOf(duration),
      blockId: state.blockId,
      label: state.link?.label ?? null,
      next,
    }
    return { state: toIdle(state, next, { completedFocusCount: count, notice }), effects: [effect] }
  }
  const effect: PhaseEndEffect = {
    type: 'phaseEnd',
    phase: state.phase,
    mode,
    blockId: state.blockId,
    link: state.link,
    startedAt,
    endedAt,
    plannedMinutes: minutesOf(duration),
    actualMinutes: minutesOf(duration),
    pomodorosCredited: 0,
    next: 'focus',
    nextDurationMs: mode === 'flowtime' ? 0 : phaseLength('focus', cfg),
  }
  return { state: toIdle(state, 'focus', { notice: { kind: 'breakDone' } }), effects: [effect] }
}

export function reduce(state: TimerState, action: TimerAction, now: number, cfg: TimerConfig): ReduceResult {
  const same = { state, effects: [] as TimerEffect[] }
  const countUp = isCountUp(state, cfg)

  switch (action.type) {
    case 'start': {
      if (state.status !== 'idle') return same
      let next: TimerState = { ...state, notice: null }
      if (action.blockId !== undefined && (action.blockId ?? null) !== state.blockId) {
        next = { ...next, blockId: action.blockId ?? null, link: null }
      }
      if (countUp) {
        return { state: { ...next, status: 'running', anchorAt: now, phaseStartedAt: now, durationMs: null }, effects: [] }
      }
      const duration = currentDuration(state, cfg)
      return {
        state: { ...next, status: 'running', durationMs: duration, endsAt: now + duration, phaseStartedAt: now },
        effects: [],
      }
    }

    case 'pause': {
      if (state.status !== 'running') return same
      const pausedMs = countUp ? rawFlowElapsed(state, now) : rawRemaining(state, now, cfg)
      return { state: { ...state, status: 'paused', pausedMs, endsAt: null, anchorAt: null }, effects: [] }
    }

    case 'resume': {
      if (state.status !== 'paused' || state.pausedMs == null) return same
      if (countUp) {
        return { state: { ...state, status: 'running', anchorAt: now - state.pausedMs, pausedMs: null }, effects: [] }
      }
      return { state: { ...state, status: 'running', endsAt: now + state.pausedMs, pausedMs: null }, effects: [] }
    }

    case 'tick': {
      if (state.status !== 'running' || countUp || state.endsAt == null) return same
      if (now < state.endsAt) return same
      return completeCountdown(state, state.endsAt, cfg)
    }

    case 'skip': {
      // Go to the next phase without counting this one: no session, no credit.
      if (state.phase === 'focus') {
        if (countUp) {
          const elapsed = rawFlowElapsed(state, now)
          return { state: toIdle(state, 'shortBreak', { notice: null, idleDurationMs: flowBreakMs(elapsed) }), effects: [] }
        }
        return { state: toIdle(state, 'shortBreak', { notice: null }), effects: [] }
      }
      return { state: toIdle(state, 'focus', { notice: null }), effects: [] }
    }

    case 'reset':
      return {
        state: toIdle(state, 'focus', { notice: null, completedFocusCount: 0, blockId: null, link: null }),
        effects: [],
      }

    case 'endFlow': {
      if (!countUp || state.status === 'idle') return same
      const elapsed = rawFlowElapsed(state, now)
      const credited = flowCredit(elapsed, cfg)
      const minutes = minutesOf(elapsed)
      const breakMs = flowBreakMs(elapsed)
      const count = state.completedFocusCount + (credited > 0 ? 1 : 0)
      const effects: TimerEffect[] =
        elapsed >= MINUTE
          ? [
              {
                type: 'phaseEnd',
                phase: 'focus',
                mode: 'flowtime',
                blockId: state.blockId,
                link: state.link,
                startedAt: state.phaseStartedAt ?? now - elapsed,
                endedAt: now,
                plannedMinutes: minutes,
                actualMinutes: minutes,
                pomodorosCredited: credited,
                next: 'shortBreak',
                nextDurationMs: breakMs,
              },
            ]
          : []
      const notice: TimerNotice = {
        kind: 'focusDone',
        mode: 'flowtime',
        credited,
        minutes,
        blockId: state.blockId,
        label: state.link?.label ?? null,
        next: 'shortBreak',
      }
      return {
        state: toIdle(state, 'shortBreak', { completedFocusCount: count, notice, idleDurationMs: breakMs }),
        effects,
      }
    }

    case 'setMode': {
      if (state.status !== 'idle') return same
      if (effectiveMode(state, cfg) === action.mode && state.phase === 'focus') {
        return { state: { ...state, mode: action.mode }, effects: [] }
      }
      return { state: toIdle(state, 'focus', { mode: action.mode, notice: null }), effects: [] }
    }

    case 'setLink': {
      if (state.blockId !== action.blockId) return same
      return { state: { ...state, link: action.link }, effects: [] }
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Persistence (localStorage key `focusplan.timer.v1`)
// ---------------------------------------------------------------------------------------------

const PHASES: readonly TimerPhase[] = ['focus', 'shortBreak', 'longBreak']
const STATUSES: readonly TimerStatus[] = ['idle', 'running', 'paused']
const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null)

export function serializeState(state: TimerState): string {
  return JSON.stringify(state)
}

/** Parse a stored state. Anything malformed falls back to a fresh idle state (never throws). */
export function parseState(raw: string | null | undefined): TimerState {
  if (!raw) return initialState()
  let o: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return initialState()
    o = parsed as Record<string, unknown>
  } catch {
    return initialState()
  }
  if (o.v !== 1) return initialState()
  const status = STATUSES.includes(o.status as TimerStatus) ? (o.status as TimerStatus) : null
  const phase = PHASES.includes(o.phase as TimerPhase) ? (o.phase as TimerPhase) : null
  if (!status || !phase) return initialState()
  const state: TimerState = {
    v: 1,
    status,
    phase,
    mode: o.mode === 'classic' || o.mode === 'flowtime' ? o.mode : null,
    endsAt: numOrNull(o.endsAt),
    anchorAt: numOrNull(o.anchorAt),
    pausedMs: numOrNull(o.pausedMs),
    durationMs: numOrNull(o.durationMs),
    idleDurationMs: numOrNull(o.idleDurationMs),
    phaseStartedAt: numOrNull(o.phaseStartedAt),
    blockId: strOrNull(o.blockId),
    link: parseLink(o.link),
    completedFocusCount: Math.max(0, Math.floor(numOrNull(o.completedFocusCount) ?? 0)),
    notice: parseNotice(o.notice),
  }
  // A running or paused state without its timestamps cannot be resumed.
  if (state.status === 'running' && state.endsAt == null && state.anchorAt == null) return toIdle(state, state.phase)
  if (state.status === 'paused' && state.pausedMs == null) return toIdle(state, state.phase)
  return state
}

function parseLink(v: unknown): TimerLink | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  return {
    topicId: strOrNull(o.topicId),
    examId: strOrNull(o.examId),
    subjectId: strOrNull(o.subjectId),
    label: strOrNull(o.label),
  }
}

function parseNotice(v: unknown): TimerNotice | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (o.kind === 'breakDone') return { kind: 'breakDone' }
  if (o.kind !== 'focusDone') return null
  return {
    kind: 'focusDone',
    mode: o.mode === 'flowtime' ? 'flowtime' : 'classic',
    credited: numOrNull(o.credited) ?? 0,
    minutes: numOrNull(o.minutes) ?? 0,
    blockId: strOrNull(o.blockId),
    label: strOrNull(o.label),
    next: PHASES.includes(o.next as TimerPhase) ? (o.next as TimerPhase) : 'shortBreak',
  }
}
