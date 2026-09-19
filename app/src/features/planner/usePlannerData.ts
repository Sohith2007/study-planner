import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db, getSettings } from '@/db'
import type { Block, ISODate } from '@/types'
import type { Lookups } from './planner'

/** Subjects, exams, topics and settings as id maps. `undefined` while loading. */
export function useLookups(): Lookups | undefined {
  const subjects = useLiveQuery(() => db.subjects.toArray(), [])
  const exams = useLiveQuery(() => db.exams.toArray(), [])
  const topics = useLiveQuery(() => db.topics.toArray(), [])
  const settings = useLiveQuery(() => getSettings(), [])
  return useMemo(() => {
    if (!subjects || !exams || !topics || !settings) return undefined
    return {
      subjects: new Map(subjects.map((s) => [s.id, s])),
      exams: new Map(exams.map((e) => [e.id, e])),
      topics: new Map(topics.map((t) => [t.id, t])),
      settings,
    }
  }, [subjects, exams, topics, settings])
}

/** Blocks with `from <= date <= to`, sorted by date then order. */
export function useBlocksBetween(from: ISODate, to: ISODate): Block[] | undefined {
  return useLiveQuery(
    async () => {
      const rows = await db.blocks.where('date').between(from, to, true, true).toArray()
      return rows.sort((a, b) => (a.date === b.date ? a.order - b.order : a.date < b.date ? -1 : 1))
    },
    [from, to],
  )
}

/** The first open (planned/partial) block after `date`, for the "Your next block is on …" copy. */
export function useNextOpenBlockAfter(date: ISODate): Block | null | undefined {
  return useLiveQuery(
    async () => {
      const rows = await db.blocks.where('date').above(date).sortBy('date')
      return rows.find((b) => b.status === 'planned' || b.status === 'partial') ?? null
    },
    [date],
  )
}
