/**
 * Pure helpers for the Setup screen (screens/setup.md): validation copy, quick-add parsing,
 * countdown text, plurals and the default colour. No Dexie access here, so it is unit-testable.
 */
import { SUBJECT_COLOR_PRESETS, daysBetween } from '@/lib'
import type { ISODate, Subject } from '@/types'

export const MSG = {
  subjectEmpty: 'Give the subject a name.',
  subjectDuplicate: (name: string) => `You already have a subject called ${name}.`,
  examEmpty: 'Give the exam a name.',
  examDateMissing: 'Pick the exam date.',
  examDatePast: "The exam date can't be in the past.",
  examToday: "Exam is today. There's no time left to plan study for it.",
  topicEmpty: 'Give the topic a name.',
  estimate: 'Estimate must be 1–20 pomodoros.',
  quickAddEmpty: 'Paste at least one topic name.',
  writeError: "Couldn't save. Please try again.",
} as const

export const QUICK_ADD_DEFAULTS = { estimatePomodoros: 2, difficulty: 'medium' } as const

/** `n word` / `n words`. */
export function plural(n: number, word: string, pluralWord = `${word}s`): string {
  return `${n} ${n === 1 ? word : pluralWord}`
}

export function validateSubjectName(name: string, subjects: Subject[], exceptId?: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return MSG.subjectEmpty
  const lower = trimmed.toLowerCase()
  const clash = subjects.find((s) => s.id !== exceptId && s.name.trim().toLowerCase() === lower)
  return clash ? MSG.subjectDuplicate(clash.name) : null
}

export function validateExamName(name: string): string | null {
  return name.trim() ? null : MSG.examEmpty
}

/** Exam date: required, and today or later. */
export function validateExamDate(date: string, today: ISODate): string | null {
  if (!date) return MSG.examDateMissing
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return MSG.examDateMissing
  return date < today ? MSG.examDatePast : null
}

export function validateTopicName(name: string): string | null {
  return name.trim() ? null : MSG.topicEmpty
}

/** Parses an estimate field. Returns the integer, or null when it is not an integer in 1-20. */
export function parseEstimate(raw: string | number): number | null {
  const s = String(raw).trim()
  if (!/^\d+$/.test(s)) return null
  const n = Number(s)
  return n >= 1 && n <= 20 ? n : null
}

/** Quick add: one topic per line, trimmed, blank lines skipped. */
export function parseQuickAdd(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

/** Label of the quick-add submit button for a line count. */
export function quickAddLabel(count: number): string {
  if (count === 0) return 'Add topics'
  return `Add ${plural(count, 'topic')}`
}

/** Exam countdown (setup.md): today, tomorrow, in N days, N days ago (1 day ago). */
export function examCountdown(date: ISODate, today: ISODate): { label: string; tone: 'normal' | 'soon' | 'past' } {
  const n = daysBetween(today, date)
  if (n < 0) return { label: `${plural(-n, 'day')} ago`, tone: 'past' }
  const label = n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`
  return { label, tone: n <= 3 ? 'soon' : 'normal' }
}

/** The first preset colour not already used by a subject (falls back to the first preset). */
export function defaultSubjectColor(subjects: Pick<Subject, 'color'>[]): string {
  const used = new Set(subjects.map((s) => s.color.toLowerCase()))
  return (SUBJECT_COLOR_PRESETS.find((p) => !used.has(p.value.toLowerCase())) ?? SUBJECT_COLOR_PRESETS[0]).value
}

/** Joins parts as "a", "a and b", "a, b and c". */
export function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

const HISTORY = 'Your focus history stays in your stats.'

export function subjectDeleteMessage(c: { exams: number; topics: number; plannedBlocks: number }): string {
  const parts: string[] = []
  if (c.exams) parts.push(plural(c.exams, 'exam'))
  if (c.topics) parts.push(plural(c.topics, 'topic'))
  if (c.plannedBlocks) parts.push(plural(c.plannedBlocks, 'planned block'))
  return parts.length ? `This also deletes ${joinList(parts)}. ${HISTORY}` : HISTORY
}

export function examDeleteMessage(c: { topics: number; blocks: number }): string {
  const parts: string[] = []
  if (c.topics) parts.push(plural(c.topics, 'topic'))
  if (c.blocks) parts.push(plural(c.blocks, 'block'))
  return parts.length ? `This also deletes its ${joinList(parts)}. ${HISTORY}` : HISTORY
}

export const TOPIC_DELETE_MESSAGE =
  'Its upcoming planned blocks will be removed from your plan. Finished blocks stay in your history.'

/** What a Setup delete button asks the page to confirm. */
export interface DeleteTarget {
  kind: 'subject' | 'exam' | 'topic'
  id: string
  name: string
}
