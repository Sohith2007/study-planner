import { createContext, useContext } from 'react'
import type { Block } from '@/types'
import type { Lookups } from './planner'

/** Block actions shared by Today rows and Week cards. Provided by <PlannerActions> (BlockDialogs.tsx). */
export interface PlannerActionsApi {
  lookups: Lookups
  today: string
  done(block: Block): void
  skip(block: Block): void
  undo(block: Block): void
  openPartial(block: Block): void
  openEdit(block: Block): void
  openMove(block: Block): void
  openDelete(block: Block): void
  openAddTask(defaultDate?: string): void
  /** Drag-and-drop move (Week): validates, writes and toasts. */
  dropOn(blockId: string, date: string): void
}

export const PlannerActionsContext = createContext<PlannerActionsApi | null>(null)

export function usePlannerActions(): PlannerActionsApi {
  const ctx = useContext(PlannerActionsContext)
  if (!ctx) throw new Error('usePlannerActions must be used inside <PlannerActions>')
  return ctx
}
