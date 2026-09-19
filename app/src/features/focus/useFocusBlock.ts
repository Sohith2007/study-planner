import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { todayISO } from '@/lib'
import type { Block, Exam, Subject, Topic } from '@/types'

export interface FocusBlockInfo {
  /** null when no id was given or the block does not exist. */
  block: Block | null
  /** True when an id was given but no block matches it. */
  missing: boolean
  topic: Topic | null
  exam: Exam | null
  subject: Subject | null
  /** Next planned or partial block today (for "Next: <topic> →"). */
  next: { block: Block; label: string } | null
}

const EMPTY: FocusBlockInfo = { block: null, missing: false, topic: null, exam: null, subject: null, next: null }

async function load(blockId: string | null): Promise<FocusBlockInfo> {
  if (!blockId) return EMPTY
  const block = (await db.blocks.get(blockId)) ?? null
  if (!block) return { ...EMPTY, missing: true }
  const [topic, exam, subject] = await Promise.all([
    block.topicId ? db.topics.get(block.topicId) : undefined,
    block.examId ? db.exams.get(block.examId) : undefined,
    block.subjectId ? db.subjects.get(block.subjectId) : undefined,
  ])
  const today = await db.blocks.where('date').equals(todayISO()).sortBy('order')
  const nextBlock = today.find((b) => b.id !== block.id && (b.status === 'planned' || b.status === 'partial')) ?? null
  let next: FocusBlockInfo['next'] = null
  if (nextBlock) {
    const nextTopic = nextBlock.topicId ? await db.topics.get(nextBlock.topicId) : undefined
    next = { block: nextBlock, label: nextTopic?.name ?? nextBlock.title }
  }
  return { block, missing: false, topic: topic ?? null, exam: exam ?? null, subject: subject ?? null, next }
}

/** Live block details for the Focus page. `undefined` while loading. */
export function useFocusBlock(blockId: string | null): FocusBlockInfo | undefined {
  return useLiveQuery(() => load(blockId), [blockId])
}
