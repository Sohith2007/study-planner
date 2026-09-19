/**
 * FocusPlan entity types (master-plan section 4.2).
 * Dates are local calendar dates as `YYYY-MM-DD` strings; timestamps are ISO strings.
 * Ids come from `newId()` (crypto.randomUUID) unless stated otherwise.
 */

/** Local calendar date, `YYYY-MM-DD`. */
export type ISODate = string
/** ISO 8601 timestamp, e.g. `2026-09-19T10:00:00.000Z`. */
export type ISODateTime = string

export interface Subject {
  id: string
  name: string
  /** Hex colour, e.g. `#6366f1`. */
  color: string
  createdAt: ISODateTime
}

export interface Exam {
  id: string
  subjectId: string
  name: string
  date: ISODate
  createdAt: ISODateTime
}

export type Difficulty = 'easy' | 'medium' | 'hard'
export type Confidence = 1 | 2 | 3

export interface Topic {
  id: string
  examId: string
  name: string
  /** Integer 1-20, default 2. */
  estimatePomodoros: number
  /** Default `'medium'`. */
  difficulty: Difficulty
  covered: boolean
  confidence: Confidence | null
  /** Display order within the exam. */
  order: number
}

export type BlockKind = 'new' | 'review' | 'task'
export type BlockStatus = 'planned' | 'partial' | 'done' | 'skipped'
export type BlockSource = 'auto' | 'manual'

export interface Block {
  /** Auto blocks use the deterministic id `auto:<topicId>:<kind>:<n>` (see `autoBlockId`). */
  id: string
  date: ISODate
  /** Order within the day. */
  order: number
  kind: BlockKind
  topicId: string | null
  examId: string | null
  subjectId: string | null
  title: string
  /** Integer >= 1. */
  pomodoros: number
  completedPomodoros: number
  status: BlockStatus
  source: BlockSource
  /** True once the user moves or edits an auto block; replan then keeps it. */
  pinned: boolean
  /** Review offset in days (review blocks only), else null. */
  reviewOffset: number | null
  createdAt: ISODateTime
}

export type SessionKind = 'focus' | 'shortBreak' | 'longBreak'

/** A row in the `sessions` table. */
export interface FocusSession {
  id: string
  kind: SessionKind
  blockId: string | null
  topicId: string | null
  examId: string | null
  subjectId: string | null
  startedAt: ISODateTime
  endedAt: ISODateTime
  plannedMinutes: number
  actualMinutes: number
  completed: boolean
  pomodorosCredited: number
}

export type TimerMode = 'classic' | 'flowtime'

export interface Settings {
  /** Always `'settings'` (single row). */
  id: 'settings'
  /** 7 ints indexed by JS weekday (0 = Sunday ... 6 = Saturday). */
  dailyCapacity: number[]
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  longBreakEvery: number
  timerMode: TimerMode
  dailyGoalPomodoros: number
  blackoutDates: ISODate[]
  reviewOffsets: number[]
  soundEnabled: boolean
  notificationsEnabled: boolean
}

/** An item of work the scheduler could not place. */
export interface OverflowItem {
  examId: string
  topicId: string | null
  kind: 'new' | 'review'
  pomodoros: number
  reason: 'no-capacity' | 'exam-passed'
}

export interface PlanMeta {
  key: 'plan'
  lastPlannedAt: ISODateTime | null
  overflow: OverflowItem[]
  lastCatchUp: { movedCount: number; at: ISODateTime } | null
}

export interface SeedMeta {
  key: 'seed'
  seededAt: ISODateTime
  version: number
}

export type MetaRecord = PlanMeta | SeedMeta
