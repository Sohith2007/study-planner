/**
 * Session state shared by PlanSync and PlanStatusBar (module level, so it survives PlanStatusBar
 * unmounting on /focus). Not persisted: a reload starts fresh, as the design asks.
 */
import { useSyncExternalStore } from 'react'

interface State {
  /** A debounced auto-replan is scheduled (change seen, not yet run). */
  pending: boolean
  /** Replans or catch-ups currently running. */
  running: number
  /** `meta.plan.lastCatchUp.at` of the catch-up notice the user dismissed this session. */
  dismissedCatchUpAt: string | null
  /** The over-capacity banner already used role="alert" once this session. */
  overflowAnnounced: boolean
}

let state: State = { pending: false, running: 0, dismissedCatchUpAt: null, overflowAnnounced: false }
const listeners = new Set<() => void>()

function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  for (const l of listeners) l()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function usePlanStatusState(): State {
  return useSyncExternalStore(subscribe, () => state)
}

export function getPlanStatusState(): State {
  return state
}

export function setPlanPending(pending: boolean) {
  if (state.pending !== pending) set({ pending })
}

/** Runs a replan/catch-up and shows "Updating plan…" while it runs. Runs are serialized. */
let queue: Promise<unknown> = Promise.resolve()
export function trackPlanRun<T>(run: () => Promise<T>): Promise<T> {
  set({ running: state.running + 1 })
  const result = queue.then(run, run)
  queue = result.catch(() => undefined)
  return result.finally(() => set({ running: state.running - 1 }))
}

export function dismissCatchUp(at: string) {
  set({ dismissedCatchUpAt: at })
}

export function markOverflowAnnounced() {
  if (!state.overflowAnnounced) set({ overflowAnnounced: true })
}
