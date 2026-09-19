import type { PlanMeta } from '@/types'
import { db } from './db'

/** Delete an exam with its topics and every block linked to the exam or its topics. Sessions (history) are kept. */
export async function deleteExamCascade(id: string): Promise<void> {
  await db.transaction('rw', db.exams, db.topics, db.blocks, async () => {
    const topicIds = await db.topics.where('examId').equals(id).primaryKeys()
    await db.blocks.where('examId').equals(id).delete()
    if (topicIds.length) await db.blocks.where('topicId').anyOf(topicIds).delete()
    await db.topics.bulkDelete(topicIds)
    await db.exams.delete(id)
  })
}

/** Delete a subject, all its exams (cascading) and every block linked to the subject. Sessions are kept. */
export async function deleteSubjectCascade(id: string): Promise<void> {
  await db.transaction('rw', db.subjects, db.exams, db.topics, db.blocks, async () => {
    const examIds = await db.exams.where('subjectId').equals(id).primaryKeys()
    for (const examId of examIds) await deleteExamCascade(examId)
    await db.blocks.filter((b) => b.subjectId === id).delete()
    await db.subjects.delete(id)
  })
}

export function emptyPlanMeta(): PlanMeta {
  return { key: 'plan', lastPlannedAt: null, overflow: [], lastCatchUp: null }
}

/** Read `meta.plan` (the scheduler's last result); returns an empty record if none exists. Written by P1. */
export async function getPlanMeta(): Promise<PlanMeta> {
  const row = await db.meta.get('plan')
  return row && row.key === 'plan' ? row : emptyPlanMeta()
}
