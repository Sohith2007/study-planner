import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/ui'
import { MSG } from './setupLogic'

/** Ids that were just added; each stays "flashing" for 1 s (bg-primary-soft highlight that fades). */
export function useFlash(durationMs = 1000) {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set())
  const timers = useRef<number[]>([])
  useEffect(() => {
    const list = timers.current
    return () => list.forEach((t) => window.clearTimeout(t))
  }, [])
  const flash = useCallback(
    (newIds: string | string[]) => {
      const arr = Array.isArray(newIds) ? newIds : [newIds]
      setIds((prev) => new Set([...prev, ...arr]))
      timers.current.push(
        window.setTimeout(() => {
          setIds((prev) => {
            const next = new Set(prev)
            arr.forEach((id) => next.delete(id))
            return next
          })
        }, durationMs),
      )
    },
    [durationMs],
  )
  return { flashing: ids, flash }
}

/** A short-lived flag (the inline "Saved" caption fades after 1.5 s). */
export function useTransientFlag(durationMs = 1500): [boolean, () => void] {
  const [on, setOn] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const trigger = useCallback(() => {
    setOn(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOn(false), durationMs)
  }, [durationMs])
  return [on, trigger]
}

/** Runs a Dexie write; on failure shows the error toast and resolves false (inputs stay as typed). */
export function useSafeWrite() {
  const toast = useToast()
  return useCallback(
    async <T>(fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> => {
      try {
        return { ok: true, value: await fn() }
      } catch (err) {
        console.error(err)
        toast.show(MSG.writeError, 'error')
        return { ok: false }
      }
    },
    [toast],
  )
}
