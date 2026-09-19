/**
 * Planner (P4) helpers: pure rules (targets, capacity, validation, copy) plus the Dexie writes behind
 * the block actions. The UI reads everything back through useLiveQuery, so nothing here keeps a local copy.
 */
import { format } from 'date-fns'
import { db } from '@/db'
import { addDaysISO, formatShortDate, newId, parseISODate, startOfWeekISO, weekdayOf } from '@/lib'
import type { Block, BlockStatus, Confidence, Exam, ISODate, Settings, Subject, Topic } from '@/types'

export const MIN_POMODOROS = 1
export const MAX_POMODOROS = 8

// ---------------------------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------------------------

/** "0/2 pomodoros", "0/1 pomodoro". */
export function progressText(completed: number, total: number): string {
  return `${completed}/${total} ${total === 1 ? 'pomodoro' : 'pomodoros'}`
}

/** "2 pomodoros" / "1 pomodoro". */
export function pomodoroCount(n: number): string {
  return `${n} ${n === 1 ? 'pomodoro' : 'pomodoros'}`
}

export function isOpen(b: Pick<Block, 'status'>): boolean {
  return b.status === 'planned' || b.status === 'partial'
}

/** The start-next target: first block by `order` whose status is planned or partial. */
export function nextTarget<T extends Pick<Block, 'status' | 'order'>>(blocks: T[]): T | null {
  return [...blocks].sort((a, b) => a.order - b.order).find(isOpen) ?? null
}

/** Planned load of a day: sum of pomodoros over blocks that are not skipped. */
export function plannedLoad(blocks: Pick<Block, 'status' | 'pomodoros'>[]): number {
  return blocks.reduce((sum, b) => (b.status === 'skipped' ? sum : sum + b.pomodoros), 0)
}

export function capacityOf(settings: Pick<Settings, 'dailyCapacity'>, date: ISODate): number {
  return settings.dailyCapacity[weekdayOf(date)] ?? 0
}

export function isBlackout(settings: Pick<Settings, 'blackoutDates'>, date: ISODate): boolean {
  return settings.blackoutDates.includes(date)
}

/** Status after an Undo: partial when some but not all pomodoros are done, else planned. */
export function undoStatus(completed: number, pomodoros: number): BlockStatus {
  return completed > 0 && completed < pomodoros ? 'partial' : 'planned'
}

/** Week range label: "14 – 20 Sep 2026", "28 Sep – 4 Oct 2026", "29 Dec 2026 – 4 Jan 2027". */
export function formatWeekRange(monday: ISODate): string {
  const a = parseISODate(monday)
  const b = parseISODate(addDaysISO(monday, 6))
  if (a.getFullYear() !== b.getFullYear()) return `${format(a, 'd MMM yyyy')} – ${format(b, 'd MMM yyyy')}`
  if (a.getMonth() !== b.getMonth()) return `${format(a, 'd MMM')} – ${format(b, 'd MMM yyyy')}`
  return `${format(a, 'd')} – ${format(b, 'd MMM yyyy')}`
}

/** Normalises a `?start=` value: a valid date becomes its Monday; anything else returns null. */
export function normaliseWeekStart(raw: string | null): ISODate | null {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const d = parseISODate(raw)
  if (Number.isNaN(d.getTime())) return null
  return startOfWeekISO(raw)
}

/** "Moved to Mon 21 Sep" style date. */
export const shortDate = formatShortDate

export type MoveError = 'required' | 'past' | 'exam' | 'blackout'

/**
 * Validates a new date for a block. `checkBlackout` is used for drops (week.md); the Move dialog
 * only checks required/past/exam (today.md).
 */
export function validateMoveDate(
  date: string,
  today: ISODate,
  exam: Pick<Exam, 'date'> | null | undefined,
  opts: { blackoutDates?: ISODate[] } = {},
): MoveError | null {
  if (!date) return 'required'
  if (date < today) return 'past'
  if (exam && date >= exam.date) return 'exam'
  if (opts.blackoutDates?.includes(date)) return 'blackout'
  return null
}

export function moveErrorText(err: MoveError, examDate: ISODate | undefined, date: ISODate, forDrop = false): string {
  switch (err) {
    case 'required':
      return 'Pick a date.'
    case 'past':
      return forDrop ? "Can't move a block to a past day." : 'Pick today or a later date.'
    case 'exam':
      return `That's on or after the exam (${examDate ? formatShortDate(examDate) : 'exam day'}). Pick an earlier day.`
    case 'blackout':
      return `${formatShortDate(date)} is a blackout day.`
  }
}

export function parsePomodoros(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null
  const n = Number(raw)
  return n >= MIN_POMODOROS && n <= MAX_POMODOROS ? n : null
}

export interface TaskDraft {
  title: string
  date: string
  pomodoros: string
  subjectId: string
}

export type TaskErrors = Partial<Record<'title' | 'date' | 'pomodoros', string>>

export function validateTask(d: TaskDraft, today: ISODate): TaskErrors {
  const e: TaskErrors = {}
  if (!d.title.trim()) e.title = 'Give the task a title.'
  if (!d.date) e.date = 'Pick a date.'
  else if (d.date < today) e.date = 'Pick today or a later date.'
  if (parsePomodoros(d.pomodoros) === null) e.pomodoros = 'Pomodoros must be 1–8.'
  return e
}

export type EditErrors = Partial<Record<'title' | 'pomodoros', string>>

export function validateEdit(
  block: Pick<Block, 'kind' | 'completedPomodoros'>,
  draft: { title: string; pomodoros: string },
): EditErrors {
  const e: EditErrors = {}
  if (block.kind === 'task' && !draft.title.trim()) e.title = 'Give the task a title.'
  const n = parsePomodoros(draft.pomodoros)
  if (n === null) e.pomodoros = 'Pomodoros must be 1–8.'
  else if (n < block.completedPomodoros)
    e.pomodoros = `Can't be less than the ${pomodoroCount(block.completedPomodoros)} already done.`
  return e
}

/** Everything a row/card needs to describe a block. */
export interface Lookups {
  subjects: Map<string, Subject>
  exams: Map<string, Exam>
  topics: Map<string, Topic>
  settings: Settings
}

export function blockTitle(b: Block, lk: Pick<Lookups, 'topics'>): string {
  if (b.kind !== 'task' && b.topicId) return lk.topics.get(b.topicId)?.name ?? b.title
  return b.title
}

export function blockSubject(b: Block, lk: Pick<Lookups, 'subjects' | 'exams'>): Subject | null {
  if (b.subjectId) return lk.subjects.get(b.subjectId) ?? null
  if (b.examId) {
    const exam = lk.exams.get(b.examId)
    if (exam) return lk.subjects.get(exam.subjectId) ?? null
  }
  return null
}

export function blockCovered(b: Block, lk: Pick<Lookups, 'topics'>): boolean {
  return !!(b.topicId && lk.topics.get(b.topicId)?.covered)
}

/** Screen-reader label: "Derivatives, New, Mathematics, 0 of 2 pomodoros, planned". */
export function blockAriaLabel(b: Block, lk: Lookups): string {
  const kind = b.kind === 'new' ? 'New' : b.kind === 'review' ? 'Review' : 'Task'
  const subject = blockSubject(b, lk)?.name ?? 'No subject'
  const n = `${b.completedPomodoros} of ${b.pomodoros} ${b.pomodoros === 1 ? 'pomodoro' : 'pomodoros'}`
  return `${blockTitle(b, lk)}, ${kind}, ${subject}, ${n}, ${b.status}`
}

// ---------------------------------------------------------------------------------------------
// Dexie writes
// ---------------------------------------------------------------------------------------------

/** completedPomodoros before the last Done, per block id (kept in memory for Undo). */
const beforeDone = new Map<string, number>()

async function nextOrder(date: ISODate, excludeId?: string): Promise<number> {
  const rows = await db.blocks.where('date').equals(date).toArray()
  return rows.filter((r) => r.id !== excludeId).reduce((m, r) => Math.max(m, r.order), -1) + 1
}

async function mustGet(id: string): Promise<Block> {
  const b = await db.blocks.get(id)
  if (!b) throw new Error('Block not found')
  return b
}

export async function markDone(id: string): Promise<Block> {
  const b = await mustGet(id)
  beforeDone.set(id, b.completedPomodoros)
  await db.blocks.update(id, { status: 'done', completedPomodoros: b.pomodoros })
  return { ...b, status: 'done', completedPomodoros: b.pomodoros }
}

export async function markPartial(id: string, completed: number): Promise<void> {
  const b = await mustGet(id)
  if (!Number.isInteger(completed) || completed < 1 || completed >= b.pomodoros) throw new Error('Invalid count')
  await db.blocks.update(id, { status: 'partial', completedPomodoros: completed })
}

export async function markSkipped(id: string): Promise<void> {
  await db.blocks.update(id, { status: 'skipped' })
}

/** Undo a Done or Skip. A Done restores the pre-Done completed count (fallback 0). */
export async function undoBlock(id: string): Promise<void> {
  const b = await mustGet(id)
  let completed = b.completedPomodoros
  if (b.status === 'done') {
    completed = beforeDone.get(id) ?? 0
    beforeDone.delete(id)
  }
  completed = Math.min(completed, b.pomodoros)
  await db.blocks.update(id, { status: undoStatus(completed, b.pomodoros), completedPomodoros: completed })
}

export async function editBlock(id: string, patch: { title?: string; pomodoros: number }): Promise<void> {
  const b = await mustGet(id)
  const changes: Partial<Block> = { pomodoros: patch.pomodoros }
  if (b.kind === 'task' && patch.title !== undefined) changes.title = patch.title.trim()
  if (b.source === 'auto') changes.pinned = true
  if (b.status === 'partial' && b.completedPomodoros >= patch.pomodoros) changes.status = 'done'
  if (b.status === 'done') changes.completedPomodoros = patch.pomodoros
  await db.blocks.update(id, changes)
}

/** Moves a block to `date` (appended to the end of that day's order). Auto blocks become pinned. */
export async function moveBlock(id: string, date: ISODate): Promise<void> {
  await db.transaction('rw', db.blocks, async () => {
    const b = await mustGet(id)
    const order = b.date === date ? b.order : await nextOrder(date, id)
    await db.blocks.update(id, { date, order, pinned: b.source === 'auto' ? true : b.pinned })
  })
}

export async function deleteBlock(id: string): Promise<void> {
  beforeDone.delete(id)
  await db.blocks.delete(id)
}

export async function addTask(input: {
  title: string
  date: ISODate
  pomodoros: number
  subjectId: string | null
}): Promise<Block> {
  return db.transaction('rw', db.blocks, async () => {
    const block: Block = {
      id: newId(),
      date: input.date,
      order: await nextOrder(input.date),
      kind: 'task',
      topicId: null,
      examId: null,
      subjectId: input.subjectId,
      title: input.title.trim(),
      pomodoros: input.pomodoros,
      completedPomodoros: 0,
      status: 'planned',
      source: 'manual',
      pinned: false,
      reviewOffset: null,
      createdAt: new Date().toISOString(),
    }
    await db.blocks.add(block)
    return block
  })
}

/**
 * Topic check → Covered. Writes topic.covered and topic.confidence; the scheduler (P1, via PlanSync's
 * live replan on topic changes) then adds the extra review for confidence 1.
 */
export async function markTopicCovered(topicId: string, confidence: Confidence): Promise<void> {
  await db.topics.update(topicId, { covered: true, confidence })
}
