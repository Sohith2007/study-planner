/**
 * Scheduler engine contract (master-plan 4.3). Pure, no I/O. Implemented by P1.
 * Frozen exports: PlanInput, PlanResult, OverflowItem, generatePlan. P1 adds helper exports only.
 */
export type { OverflowItem, PlanInput, PlanResult } from './types'
export { generatePlan } from './engine'
export {
  MAX_NEW_BLOCK_POMODOROS,
  capacityFor,
  extraReviewOffset,
  isKeptBlock,
  isMovedBlock,
  largestReviewOffset,
  normalizeReviewOffsets,
  summarizeOverflow,
  trimmedReviewOffsets,
  type ExamOverflow,
} from './rules'
