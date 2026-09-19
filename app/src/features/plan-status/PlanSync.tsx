/**
 * P0 STAND-IN (P1 owns this file): runs catch-up once on mount and renders nothing.
 * P1 adds the debounced (500 ms) auto-replan on subjects/exams/topics/settings changes.
 */
import { useEffect } from 'react'
import { catchUpOnOpen } from '@/logic/scheduler/planService'

// Module-level guard so React StrictMode's double effect run does not catch up twice.
let started = false

export default function PlanSync() {
  useEffect(() => {
    if (started) return
    started = true
    catchUpOnOpen().catch((err) => console.warn('FocusPlan: catch-up failed', err))
  }, [])
  return null
}
