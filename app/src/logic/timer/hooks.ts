import { useContext } from 'react'
import { TimerContext, TimerDetailsContext, type TimerApi, type TimerDetails } from './context'

/** The running timer (frozen contract). Outside a TimerProvider it returns an idle 25:00 focus with no-op actions. */
export function useTimer(): TimerApi {
  return useContext(TimerContext)
}

/** P2-only extras for the Focus page (settings readiness, completion notice, hints, mode switch). */
export function useTimerDetails(): TimerDetails {
  return useContext(TimerDetailsContext)
}
