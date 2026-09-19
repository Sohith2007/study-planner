/**
 * PlanSync (P1): renders nothing.
 * - Runs catchUpOnOpen() once when the app opens.
 * - Watches subjects, exams, topics and settings (never blocks, to avoid loops) and replans
 *   500 ms after the last change (debounced). The first reading is the baseline, not a change.
 * - Runs catch-up again when the calendar day changes while the app is open.
 */
import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { todayISO } from '@/lib/dates'
import { catchUpOnOpen, replan } from '@/logic/scheduler/planService'
import { setPlanPending, trackPlanRun } from './planStatusStore'

export const AUTO_REPLAN_DEBOUNCE_MS = 500
const DAY_CHECK_MS = 60_000

// Module-level so React StrictMode's double effects and remounts do not repeat work.
let started = false
let lastSignature: string | null = null
let lastDay: string | null = null

function runCatchUp() {
  lastDay = todayISO()
  trackPlanRun(catchUpOnOpen).catch((err) => console.warn('FocusPlan: catch-up failed', err))
}

export default function PlanSync() {
  const signature = useLiveQuery(async () => {
    const [subjects, exams, topics, settings] = await Promise.all([
      db.subjects.toArray(),
      db.exams.toArray(),
      db.topics.toArray(),
      db.settings.toArray(),
    ])
    return JSON.stringify([subjects, exams, topics, settings])
  }, [])

  useEffect(() => {
    if (started) return
    started = true
    runCatchUp()
  }, [])

  useEffect(() => {
    if (signature === undefined) return
    if (lastSignature === null) {
      lastSignature = signature
      return
    }
    if (signature === lastSignature) return
    setPlanPending(true)
    const timer = setTimeout(() => {
      lastSignature = signature
      setPlanPending(false)
      trackPlanRun(() => replan()).catch((err) => console.warn('FocusPlan: auto-replan failed', err))
    }, AUTO_REPLAN_DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      setPlanPending(false)
    }
  }, [signature])

  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible' && lastDay !== null && todayISO() !== lastDay) runCatchUp()
    }
    const interval = setInterval(check, DAY_CHECK_MS)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  return null
}
