import { Dexie, type EntityTable } from 'dexie'
import type { Block, Exam, FocusSession, MetaRecord, Settings, Subject, Topic } from '@/types'

export const DB_NAME = 'focusplan'

/** The FocusPlan IndexedDB database (Dexie 4). */
export type FocusPlanDB = Dexie & {
  subjects: EntityTable<Subject, 'id'>
  exams: EntityTable<Exam, 'id'>
  topics: EntityTable<Topic, 'id'>
  blocks: EntityTable<Block, 'id'>
  sessions: EntityTable<FocusSession, 'id'>
  settings: EntityTable<Settings, 'id'>
  meta: EntityTable<MetaRecord, 'key'>
}

export const db = new Dexie(DB_NAME) as FocusPlanDB

db.version(1).stores({
  subjects: 'id, name',
  exams: 'id, subjectId, date',
  topics: 'id, examId',
  blocks: 'id, date, examId, topicId, status',
  sessions: 'id, startedAt, blockId, subjectId',
  settings: 'id',
  meta: 'key',
})

/** Every table, for whole-database transactions (import, reset, clear). */
export function allTables() {
  return [db.subjects, db.exams, db.topics, db.blocks, db.sessions, db.settings, db.meta]
}
