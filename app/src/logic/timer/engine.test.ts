import { describe, expect, it } from 'vitest'
import { defaultSettings } from '@/db/settings'
import {
  configFromSettings,
  DEFAULT_CONFIG,
  displayMs,
  flowBreakMs,
  flowCredit,
  formatClock,
  formatTitle,
  initialState,
  parseState,
  reduce,
  serializeState,
  snapshot,
  type TimerAction,
  type TimerConfig,
  type TimerState,
} from './engine'

const MIN = 60_000
const T0 = Date.UTC(2026, 8, 19, 9, 0, 0)
const cfg = DEFAULT_CONFIG

/** Apply actions at given times; returns the final state and all effects. */
function run(steps: [TimerAction, number][], start: TimerState = initialState(), c: TimerConfig = cfg) {
  let state = start
  const effects = []
  for (const [action, at] of steps) {
    const r = reduce(state, action, at, c)
    state = r.state
    effects.push(...r.effects)
  }
  return { state, effects }
}

/** Run one full classic focus from `at`, then tick at its end. */
function completeFocus(state: TimerState, at: number, c: TimerConfig = cfg) {
  return run(
    [
      [{ type: 'start' }, at],
      [{ type: 'tick' }, at + c.focusMs],
    ],
    state,
    c,
  )
}

describe('timer reducer', () => {
  it('idle state shows a 25:00 focus from the seed settings', () => {
    const snap = snapshot(initialState(), T0, cfg)
    expect(snap).toMatchObject({ status: 'idle', phase: 'focus', mode: 'classic', remainingMs: 25 * MIN, endsAt: null })
    expect(formatClock(displayMs(snap))).toBe('25:00')
    expect(formatTitle(snap)).toBe('FocusPlan')
  })

  it('start counts down from stored timestamps (accurate after a 10 minute throttled gap)', () => {
    const { state } = run([[{ type: 'start', blockId: 'b1' }, T0]])
    expect(state.status).toBe('running')
    expect(state.endsAt).toBe(T0 + 25 * MIN)
    expect(state.blockId).toBe('b1')
    expect(formatClock(snapshot(state, T0 + 1_000, cfg).remainingMs)).toBe('24:59')
    // No ticks for 10 minutes: remaining is still exact.
    const snap = snapshot(state, T0 + 10 * MIN, cfg)
    expect(formatClock(snap.remainingMs)).toBe('15:00')
    expect(formatTitle(snap)).toBe('15:00 · Focus — FocusPlan')
    expect(formatTitle(snap)).toMatch(/^\d{2}:\d{2} · (Focus|Short break|Long break) — FocusPlan$/)
  })

  it('pause freezes the value and resume continues from it', () => {
    const { state: paused } = run([
      [{ type: 'start' }, T0],
      [{ type: 'pause' }, T0 + 6 * MIN + 18_000],
    ])
    expect(paused.status).toBe('paused')
    const a = snapshot(paused, T0 + 7 * MIN, cfg)
    const b = snapshot(paused, T0 + 60 * MIN, cfg)
    expect(formatClock(a.remainingMs)).toBe('18:42')
    expect(b.remainingMs).toBe(a.remainingMs)
    expect(formatTitle(b)).toBe('18:42 · Focus — FocusPlan')
    // A tick while paused never completes the phase.
    expect(reduce(paused, { type: 'tick' }, T0 + 99 * MIN, cfg).effects).toEqual([])

    const { state: resumed } = run([[{ type: 'resume' }, T0 + 60 * MIN]], paused)
    expect(resumed.status).toBe('running')
    expect(resumed.endsAt).toBe(T0 + 60 * MIN + (18 * MIN + 42_000))
    expect(formatClock(snapshot(resumed, T0 + 61 * MIN, cfg).remainingMs)).toBe('17:42')
  })

  it('focus expiry credits one pomodoro and waits idle on a 05:00 short break', () => {
    const { state, effects } = completeFocus(initialState(), T0)
    expect(state).toMatchObject({ status: 'idle', phase: 'shortBreak', completedFocusCount: 1 })
    expect(snapshot(state, T0 + 30 * MIN, cfg).remainingMs).toBe(5 * MIN)
    expect(effects).toHaveLength(1)
    expect(effects[0]).toMatchObject({
      phase: 'focus',
      startedAt: T0,
      endedAt: T0 + 25 * MIN,
      plannedMinutes: 25,
      actualMinutes: 25,
      pomodorosCredited: 1,
      next: 'shortBreak',
      nextDurationMs: 5 * MIN,
    })
    expect(state.notice).toMatchObject({ kind: 'focusDone', credited: 1, next: 'shortBreak' })
    // A tick before the end does nothing.
    const early = run([
      [{ type: 'start' }, T0],
      [{ type: 'tick' }, T0 + 25 * MIN - 1],
    ])
    expect(early.state.status).toBe('running')
    expect(early.effects).toEqual([])
  })

  it('expiry is dated at endsAt even when the tick comes much later', () => {
    const { effects } = run([
      [{ type: 'start' }, T0],
      [{ type: 'tick' }, T0 + 3 * 60 * MIN],
    ])
    expect(effects[0]).toMatchObject({ endedAt: T0 + 25 * MIN, actualMinutes: 25 })
  })

  it('breaks end back to an idle focus with a break-over notice', () => {
    let s = completeFocus(initialState(), T0).state
    const r = run(
      [
        [{ type: 'start' }, T0 + 26 * MIN],
        [{ type: 'tick' }, T0 + 31 * MIN],
      ],
      s,
    )
    s = r.state
    expect(s).toMatchObject({ status: 'idle', phase: 'focus', notice: { kind: 'breakDone' } })
    expect(r.effects[0]).toMatchObject({ phase: 'shortBreak', pomodorosCredited: 0, actualMinutes: 5 })
  })

  it('long break after every longBreakEvery completed focuses', () => {
    let s = initialState()
    let t = T0
    const phases: string[] = []
    for (let i = 0; i < 8; i++) {
      s = completeFocus(s, t).state
      t += cfg.focusMs
      phases.push(s.phase)
      expect(snapshot(s, t, cfg).remainingMs).toBe(s.phase === 'longBreak' ? 15 * MIN : 5 * MIN)
      s = run([[{ type: 'skip' }, t]], s).state
    }
    expect(phases).toEqual([
      'shortBreak',
      'shortBreak',
      'shortBreak',
      'longBreak',
      'shortBreak',
      'shortBreak',
      'shortBreak',
      'longBreak',
    ])
    // Cadence comes from settings.
    const every2 = { ...cfg, longBreakEvery: 2 }
    let s2 = completeFocus(initialState(), T0, every2).state
    s2 = run([[{ type: 'skip' }, T0]], s2, every2).state
    s2 = completeFocus(s2, T0, every2).state
    expect(s2.phase).toBe('longBreak')
  })

  it('skip advances without crediting; reset returns to an idle 25:00 focus', () => {
    const skipped = run([
      [{ type: 'start', blockId: 'b1' }, T0],
      [{ type: 'skip' }, T0 + 3 * MIN],
    ])
    expect(skipped.effects).toEqual([])
    expect(skipped.state).toMatchObject({ status: 'idle', phase: 'shortBreak', completedFocusCount: 0 })
    const back = run([[{ type: 'skip' }, T0 + 4 * MIN]], skipped.state)
    expect(back.state).toMatchObject({ status: 'idle', phase: 'focus' })
    expect(back.effects).toEqual([])

    const done = completeFocus(initialState(), T0).state
    const reset = run(
      [
        [{ type: 'start' }, T0 + 26 * MIN],
        [{ type: 'reset' }, T0 + 27 * MIN],
      ],
      done,
    )
    expect(reset.effects).toEqual([])
    expect(reset.state).toMatchObject({ status: 'idle', phase: 'focus', completedFocusCount: 0, notice: null, blockId: null })
    const snap = snapshot(reset.state, T0 + 27 * MIN, cfg)
    expect(formatClock(snap.remainingMs)).toBe('25:00')
    expect(formatTitle(snap)).toBe('FocusPlan')
  })

  it('idle lengths follow settings; a started phase keeps its length', () => {
    const c50 = configFromSettings({ ...defaultSettings(), focusMinutes: 50, shortBreakMinutes: 10 })
    expect(formatClock(snapshot(initialState(), T0, c50).remainingMs)).toBe('50:00')
    const { state } = completeFocus(initialState(), T0, c50)
    expect(formatClock(snapshot(state, T0 + 50 * MIN, c50).remainingMs)).toBe('10:00')
    // Settings changed mid-focus: the running countdown is unchanged.
    const running = run([[{ type: 'start' }, T0]]).state
    expect(snapshot(running, T0 + MIN, c50).remainingMs).toBe(24 * MIN)
  })

  it('persists to JSON and restores a running timer after a reload', () => {
    const { state } = run([[{ type: 'start', blockId: 'b1' }, T0]])
    const withLink = reduce(state, { type: 'setLink', blockId: 'b1', link: { topicId: 't', examId: 'e', subjectId: 's', label: 'Derivatives' } }, T0, cfg).state
    const restored = parseState(serializeState(withLink))
    expect(restored).toEqual(withLink)
    expect(formatClock(snapshot(restored, T0 + 10 * MIN, cfg).remainingMs)).toBe('15:00')
    // A phase that ended while the page was closed completes on the first tick after load.
    const r = reduce(restored, { type: 'tick' }, T0 + 2 * 60 * MIN, cfg)
    expect(r.state).toMatchObject({ status: 'idle', phase: 'shortBreak', completedFocusCount: 1 })
    expect(r.effects[0]).toMatchObject({ blockId: 'b1', link: { label: 'Derivatives' }, pomodorosCredited: 1 })
    // Garbage in storage falls back to a fresh idle state.
    expect(parseState('{not json')).toEqual(initialState())
    expect(parseState(JSON.stringify({ v: 2 }))).toEqual(initialState())
    expect(parseState(JSON.stringify({ v: 1, status: 'running', phase: 'focus' })).status).toBe('idle')
    expect(parseState(null)).toEqual(initialState())
  })

  it('flowtime counts up; ending after 20 minutes stores 20 minutes and offers a 04:00 break', () => {
    let s = reduce(initialState(), { type: 'setMode', mode: 'flowtime' }, T0, cfg).state
    expect(formatClock(displayMs(snapshot(s, T0, cfg)))).toBe('00:00')
    s = reduce(s, { type: 'start', blockId: null }, T0, cfg).state
    const snap = snapshot(s, T0 + 12 * MIN + 34_000, cfg)
    expect(formatClock(displayMs(snap))).toBe('12:34')
    expect(formatTitle(snap)).toBe('12:34 · Focus — FocusPlan')
    // Flowtime never auto-completes.
    expect(reduce(s, { type: 'tick' }, T0 + 5 * 60 * MIN, cfg).effects).toEqual([])
    // Pause/resume keeps the elapsed time.
    s = reduce(s, { type: 'pause' }, T0 + 10 * MIN, cfg).state
    s = reduce(s, { type: 'resume' }, T0 + 30 * MIN, cfg).state
    const r = reduce(s, { type: 'endFlow' }, T0 + 40 * MIN, cfg)
    expect(r.effects[0]).toMatchObject({ phase: 'focus', mode: 'flowtime', actualMinutes: 20, pomodorosCredited: 1, nextDurationMs: 4 * MIN })
    expect(r.state).toMatchObject({ status: 'idle', phase: 'shortBreak', completedFocusCount: 1 })
    expect(formatClock(snapshot(r.state, T0 + 40 * MIN, cfg).remainingMs)).toBe('04:00')
    expect(r.state.notice).toMatchObject({ kind: 'focusDone', mode: 'flowtime', minutes: 20 })
  })

  it('flowtime credit and break formulas', () => {
    expect(flowCredit(59_000, cfg)).toBe(0)
    expect(flowCredit(MIN, cfg)).toBe(1)
    expect(flowCredit(49 * MIN, cfg)).toBe(1)
    expect(flowCredit(50 * MIN, cfg)).toBe(2)
    expect(flowBreakMs(20 * MIN)).toBe(4 * MIN)
    expect(flowBreakMs(2 * MIN)).toBe(MIN)
    expect(flowBreakMs(62 * MIN)).toBe(12 * MIN)
    // Under a minute: no session is stored.
    let s = reduce(initialState(), { type: 'setMode', mode: 'flowtime' }, T0, cfg).state
    s = reduce(s, { type: 'start' }, T0, cfg).state
    expect(reduce(s, { type: 'endFlow' }, T0 + 30_000, cfg).effects).toEqual([])
    // Past 99 minutes the clock shows 100:00+ (no hours).
    expect(formatClock(100 * MIN)).toBe('100:00')
  })

  it('mode switch only while idle; start is ignored while running', () => {
    const running = run([[{ type: 'start', blockId: 'a' }, T0]]).state
    expect(reduce(running, { type: 'setMode', mode: 'flowtime' }, T0, cfg).state).toBe(running)
    expect(reduce(running, { type: 'start', blockId: 'b' }, T0 + MIN, cfg).state).toBe(running)
    const flowDefault = configFromSettings({ ...defaultSettings(), timerMode: 'flowtime' })
    expect(snapshot(initialState(), T0, flowDefault).mode).toBe('flowtime')
    // setLink for a different block is ignored.
    expect(reduce(running, { type: 'setLink', blockId: 'zzz', link: null }, T0, cfg).state).toBe(running)
  })
})
