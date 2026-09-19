/**
 * Setup writes (subjects, exams, topics). Everything goes through Dexie; P1's PlanSync notices the
 * change and rebuilds the plan, so nothing here calls the scheduler.
 */
import { db, deleteExamCascade, deleteSubjectCascade } from '@/db'
import { newId } from '@/lib'
import type { Difficulty, Exam, ISODate, Subject, Topic } from '@/types'
import { QUICK_ADD_DEFAULTS } from './setupLogic'

export { deleteExamCascade, deleteSubjectCascade }

export async function addSubject(name: string, color: string, id: string = newId()): Promise<string> {
  const subject: Subject = { id, name: name.trim(), color, createdAt: new Date().toISOString() }
  await db.subjects.add(subject)
  return id
}

export async function updateSubject(id: string, patch: Partial<Pick<Subject, 'name' | 'color'>>): Promise<void> {
  await db.subjects.update(id, { ...patch, ...(patch.name !== undefined ? { name: patch.name.trim() } : {}) })
}

export async function addExam(subjectId: string, name: string, date: ISODate, id: string = newId()): Promise<string> {
  const exam: Exam = { id, subjectId, name: name.trim(), date, createdAt: new Date().toISOString() }
  await db.exams.add(exam)
  return id
}

export async function updateExam(id: string, patch: Partial<Pick<Exam, 'name' | 'date'>>): Promise<void> {
  await db.exams.update(id, { ...patch, ...(patch.name !== undefined ? { name: patch.name.trim() } : {}) })
}

export interface NewTopic {
  name: string
  estimatePomodoros?: number
  difficulty?: Difficulty
}

/** Appends topics to an exam (after the current last `order`). Returns the new ids in input order. */
export async function addTopics(examId: string, items: NewTopic[]): Promise<string[]> {
  return db.transaction('rw', db.topics, async () => {
    const existing = await db.topics.where('examId').equals(examId).toArray()
    let order = existing.reduce((m, t) => Math.max(m, t.order), -1)
    const rows: Topic[] = items.map((it) => ({
      id: newId(),
      examId,
      name: it.name.trim(),
      estimatePomodoros: it.estimatePomodoros ?? QUICK_ADD_DEFAULTS.estimatePomodoros,
      difficulty: it.difficulty ?? QUICK_ADD_DEFAULTS.difficulty,
      covered: false,
      confidence: null,
      order: ++order,
    }))
    await db.topics.bulkAdd(rows)
    return rows.map((r) => r.id)
  })
}

export async function updateTopic(
  id: string,
  patch: Partial<Pick<Topic, 'name' | 'estimatePomodoros' | 'difficulty' | 'covered' | 'confidence'>>,
): Promise<void> {
  await db.topics.update(id, patch)
}

/** Undo covered: covered=false, confidence=null. */
export async function uncoverTopic(id: string): Promise<void> {
  await db.topics.update(id, { covered: false, confidence: null })
}

/** Deletes a topic and its `planned` blocks. Finished/partial/skipped blocks stay as history. */
export async function deleteTopic(id: string): Promise<void> {
  await db.transaction('rw', db.topics, db.blocks, async () => {
    await db.blocks
      .where('topicId')
      .equals(id)
      .filter((b) => b.status === 'planned')
      .delete()
    await db.topics.delete(id)
  })
}

/** Counts shown in the subject delete confirm (what deleteSubjectCascade removes). */
export async function subjectDeleteCounts(id: string): Promise<{ exams: number; topics: number; plannedBlocks: number }> {
  const examIds = await db.exams.where('subjectId').equals(id).primaryKeys()
  const topicIds = examIds.length ? await db.topics.where('examId').anyOf(examIds).primaryKeys() : []
  const idsSet = new Set(examIds)
  const topicSet = new Set(topicIds)
  const plannedBlocks = await db.blocks
    .where('status')
    .equals('planned')
    .filter(
      (b) =>
        b.subjectId === id || (b.examId !== null && idsSet.has(b.examId)) || (b.topicId !== null && topicSet.has(b.topicId)),
    )
    .count()
  return { exams: examIds.length, topics: topicIds.length, plannedBlocks }
}

/** Counts shown in the exam delete confirm (what deleteExamCascade removes). */
export async function examDeleteCounts(id: string): Promise<{ topics: number; blocks: number }> {
  const topicIds = await db.topics.where('examId').equals(id).primaryKeys()
  const topicSet = new Set(topicIds)
  const blocks = await db.blocks.filter((b) => b.examId === id || (b.topicId !== null && topicSet.has(b.topicId))).count()
  return { topics: topicIds.length, blocks }
}
