/**
 * TimerProvider (P2). Mounted once at the root, outside BrowserRouter (so no router hooks here),
 * which keeps the timer running across route changes.
 *
 * - State lives in the pure reducer (engine.ts) and is mirrored to localStorage `focusplan.timer.v1`.
 * - A 250 ms interval and `visibilitychange` re-read Date.now(); the value shown is always computed
 *   from stored timestamps, so background-tab throttling and Playwright's page.clock both work.
 * - On load, a phase that ended while the page was closed is completed and credited (silently).
 * - Phase end: save the session + credit the block, chime, notification, live announcement.
 */
import { liveQuery } from 'dexie'
import { useCallback, useEffect, useMemo, useRef, useState, type JSX, type ReactNode } from 'react'
import { defaultSettings, getSettings } from '@/db'
import type { Settings } from '@/types'
import {
  notificationState,
  playChime,
  primeAudio,
  readStorage,
  requestNotificationPermission,
  showNotification,
  writeStorage,
  type NotificationState,
} from './browser'
import { notificationFor, pausedAnnouncement, phaseEndAnnouncement, startedAnnouncement } from './copy'
import { TimerContext, TimerDetailsContext, type NotificationHint, type TimerApi, type TimerDetails } from './context'
import { lookupLink, recordPhaseEnd } from './credit'
import {
  configFromSettings,
  DEFAULT_CONFIG,
  displayMs,
  formatTitle,
  parseState,
  reduce,
  serializeState,
  snapshot,
  STORAGE_KEY,
  type TimerAction,
  type TimerEffect,
  type TimerModeValue,
  type TimerState,
} from './engine'

const TICK_MS = 250

export function TimerProvider(props: { children: ReactNode }): JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [state, setState] = useState<TimerState>(() => parseState(readStorage(STORAGE_KEY)))
  const [now, setNow] = useState(() => Date.now())
  const [announcement, setAnnouncement] = useState('')
  const [saveErrorCount, setSaveErrorCount] = useState(0)
  const [permission, setPermission] = useState<NotificationState>(() => notificationState())

  const stateRef = useRef(state)
  const settingsRef = useRef<Settings | null>(settings)
  const restoredRef = useRef(false)

  const cfg = useMemo(() => (settings ? configFromSettings(settings) : DEFAULT_CONFIG), [settings])
  const cfgRef = useRef(cfg)
  useEffect(() => {
    cfgRef.current = cfg
    settingsRef.current = settings
  }, [cfg, settings])

  // Settings (live): lengths, cadence, default mode, sound and notification toggles.
  useEffect(() => {
    const sub = liveQuery(() => getSettings()).subscribe({
      next: (s) => {
        settingsRef.current = s
        cfgRef.current = configFromSettings(s)
        setSettings(s)
      },
      error: () => {
        const s = defaultSettings()
        settingsRef.current = s
        cfgRef.current = configFromSettings(s)
        setSettings(s)
      },
    })
    return () => sub.unsubscribe()
  }, [])

  const commit = useCallback((next: TimerState) => {
    if (next === stateRef.current) return
    stateRef.current = next
    setState(next)
    writeStorage(STORAGE_KEY, serializeState(next))
  }, [])

  const fetchLink = useCallback(
    (blockId: string) => {
      lookupLink(blockId)
        .then((link) => {
          const { state: next } = reduce(stateRef.current, { type: 'setLink', blockId, link }, Date.now(), cfgRef.current)
          commit(next)
        })
        .catch(() => {})
    },
    [commit],
  )

  const handleEffect = useCallback((effect: TimerEffect, silent: boolean) => {
    recordPhaseEnd(effect).catch((err) => {
      console.error('FocusPlan: could not save the session', err)
      setSaveErrorCount((n) => n + 1)
    })
    if (silent) return
    const s = settingsRef.current
    if (s?.soundEnabled) playChime()
    if (s?.notificationsEnabled) {
      const copy = notificationFor(effect)
      showNotification(copy.title, copy.body)
    }
    setAnnouncement(phaseEndAnnouncement(effect))
  }, [])

  /** Run an action through the reducer, persist, then perform its effects exactly once. */
  const dispatch = useCallback(
    (action: TimerAction, silent = false): TimerState => {
      const t = Date.now()
      const { state: next, effects } = reduce(stateRef.current, action, t, cfgRef.current)
      commit(next)
      setNow(t)
      for (const e of effects) handleEffect(e, silent)
      return next
    },
    [commit, handleEffect],
  )

  const ready = settings !== null

  // First run after settings load: complete anything that ended while the page was closed.
  useEffect(() => {
    if (!ready || restoredRef.current) return
    restoredRef.current = true
    dispatch({ type: 'tick' }, true)
    const s = stateRef.current
    if (s.blockId && !s.link) fetchLink(s.blockId)
  }, [ready, dispatch, fetchLink])

  // Tick while running; also on visibilitychange (a background tab may have been throttled).
  // A tick re-renders only when the shown second changes (or the phase ends), not 4 times a second.
  useEffect(() => {
    if (!ready || state.status !== 'running') return
    let lastSecond = NaN
    const tick = () => {
      const t = Date.now()
      const s = stateRef.current
      const { state: next, effects } = reduce(s, { type: 'tick' }, t, cfgRef.current)
      if (next !== s || effects.length) {
        dispatch({ type: 'tick' })
        return
      }
      const second = Math.floor(s.endsAt != null ? (s.endsAt - t) / 1000 : s.anchorAt != null ? (t - s.anchorAt) / 1000 : 0)
      if (second !== lastSecond) {
        lastSecond = second
        setNow(t)
      }
    }
    const id = window.setInterval(tick, TICK_MS)
    const onVisible = () => tick()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [ready, state.status, dispatch])

  // Another tab changed the timer: adopt its state (avoids double crediting).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      const next = parseState(e.newValue)
      stateRef.current = next
      setState(next)
      setNow(Date.now())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Permission can change in browser settings; re-read when the tab becomes visible.
  useEffect(() => {
    const refresh = () => setPermission(notificationState())
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [])

  const actions = useMemo(
    () => ({
      start(blockId?: string | null) {
        primeAudio()
        if (settingsRef.current?.notificationsEnabled && notificationState() === 'default') {
          void requestNotificationPermission().then(setPermission)
        }
        const before = stateRef.current
        const next = dispatch(blockId === undefined ? { type: 'start' } : { type: 'start', blockId })
        if (next === before) return
        const snap = snapshot(next, Date.now(), cfgRef.current)
        const countUp = snap.mode === 'flowtime' && snap.phase === 'focus'
        setAnnouncement(startedAnnouncement(next.phase, countUp ? null : snap.durationMs))
        if (next.blockId && !next.link) fetchLink(next.blockId)
      },
      pause() {
        const next = dispatch({ type: 'pause' })
        if (next.status === 'paused') setAnnouncement(pausedAnnouncement(displayMs(snapshot(next, Date.now(), cfgRef.current))))
      },
      resume() {
        primeAudio()
        const next = dispatch({ type: 'resume' })
        if (next.status === 'running') setAnnouncement('Resumed.')
      },
      skip() {
        dispatch({ type: 'skip' })
        setAnnouncement('Skipped.')
      },
      reset() {
        dispatch({ type: 'reset' })
        setAnnouncement('Timer reset.')
      },
      endFlow() {
        dispatch({ type: 'endFlow' })
      },
      setMode(mode: TimerModeValue) {
        dispatch({ type: 'setMode', mode })
      },
    }),
    [dispatch, fetchLink],
  )

  const snap = snapshot(state, now, cfg)

  // Tab title: "24:59 · Focus — FocusPlan" while running/paused, "FocusPlan" when idle.
  const title = formatTitle(snap)
  useEffect(() => {
    document.title = title
  }, [title])

  const api: TimerApi = useMemo(
    () => ({
      status: snap.status,
      phase: snap.phase,
      mode: snap.mode,
      remainingMs: snap.remainingMs,
      elapsedMs: snap.elapsedMs,
      durationMs: snap.durationMs,
      endsAt: snap.endsAt,
      blockId: snap.blockId,
      completedFocusCount: snap.completedFocusCount,
      start: actions.start,
      pause: actions.pause,
      resume: actions.resume,
      skip: actions.skip,
      reset: actions.reset,
      endFlow: actions.endFlow,
    }),
    [
      snap.status,
      snap.phase,
      snap.mode,
      snap.remainingMs,
      snap.elapsedMs,
      snap.durationMs,
      snap.endsAt,
      snap.blockId,
      snap.completedFocusCount,
      actions,
    ],
  )

  const notificationHint: NotificationHint = !settings
    ? 'none'
    : !settings.notificationsEnabled
      ? 'settings-off'
      : permission === 'unsupported' || permission === 'denied'
        ? 'off'
        : 'none'

  const details: TimerDetails = useMemo(
    () => ({
      ready,
      settings,
      link: state.link,
      notice: state.notice,
      announcement,
      saveErrorCount,
      notificationHint,
      setMode: actions.setMode,
      longBreakEvery: cfg.longBreakEvery,
      lengths: { focus: cfg.focusMs, shortBreak: cfg.shortBreakMs, longBreak: cfg.longBreakMs },
    }),
    [ready, settings, state.link, state.notice, announcement, saveErrorCount, notificationHint, actions, cfg],
  )

  return (
    <TimerContext.Provider value={api}>
      <TimerDetailsContext.Provider value={details}>{props.children}</TimerDetailsContext.Provider>
    </TimerContext.Provider>
  )
}
