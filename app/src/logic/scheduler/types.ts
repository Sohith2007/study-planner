import type { Block, Exam, OverflowItem, Settings, Subject, Topic } from '@/types'

export type { OverflowItem } from '@/types'

export interface PlanInput {
  today: string
  subjects: Subject[]
  exams: Exam[]
  topics: Topic[]
  settings: Settings
  existingBlocks: Block[]
  /**
   * Optional (added by P1): ISO timestamp used as `createdAt` for blocks that did not exist before.
   * Defaults to the current time. Blocks whose id already existed keep their original `createdAt`.
   */
  now?: string
}

export interface PlanResult {
  keep: Block[]
  create: Block[]
  removeIds: string[]
  overflow: OverflowItem[]
}
