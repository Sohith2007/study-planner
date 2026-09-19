import type { Block, Exam, FocusSession, ISODate, PlanMeta, SeedMeta, Settings, Subject, Topic } from '@/types'
import { addDaysISO, parseISODate, todayISO } from '@/lib/dates'
import { autoBlockId } from '@/lib/ids'
import { allTables, db } from './db'
import { emptyPlanMeta } from './repo'
import { defaultSettings } from './settings'

export const SEED_VERSION = 1

/** Stable, readable ids for the demo rows so tests and phases can reference them. */
export const SEED_IDS = {
  subjects: { math: 'seed-subject-math', physics: 'seed-subject-physics', chemistry: 'seed-subject-chemistry' },
  exams: { chemistry: 'seed-exam-organic-quiz', math: 'seed-exam-calculus-midterm', physics: 'seed-exam-mechanics-test' },
  topics: {
    limits: 'seed-topic-limits',
    derivatives: 'seed-topic-derivatives',
    chainRule: 'seed-topic-chain-rule',
    integration: 'seed-topic-integration-basics',
    applications: 'seed-topic-applications-of-derivatives',
    kinematics: 'seed-topic-kinematics',
    newtonsLaws: 'seed-topic-newtons-laws',
    workEnergy: 'seed-topic-work-energy',
    momentum: 'seed-topic-momentum',
    alkanes: 'seed-topic-alkanes',
    functionalGroups: 'seed-topic-functional-groups',
    isomerism: 'seed-topic-isomerism',
  },
  manualTask: 'seed-task-problem-set-3',
} as const

export interface DemoSeed {
  settings: Settings
  subjects: Subject[]
  exams: Exam[]
  topics: Topic[]
  blocks: Block[]
  sessions: FocusSession[]
  meta: [PlanMeta, SeedMeta]
}

/** Local timestamp (ISO string) for `date` at hh:mm. */
function at(date: ISODate, hh: number, mm: number): string {
  const d = parseISODate(date)
  d.setHours(hh, mm, 0, 0)
  return d.toISOString()
}

/**
 * Pure builder for the demo data (master-plan 4.2), relative to `today`.
 * Does not touch the database, so tests can use it directly.
 */
export function buildDemoSeed(today: ISODate = todayISO(), now: Date = new Date()): DemoSeed {
  const createdAt = now.toISOString()
  const S = SEED_IDS.subjects
  const E = SEED_IDS.exams
  const T = SEED_IDS.topics

  const settings = defaultSettings() // Mon-Fri 6, Sat 8, Sun 4; 25/5/15; every 4; classic; goal 4; no blackouts

  const subjects: Subject[] = [
    { id: S.math, name: 'Mathematics', color: '#6366f1', createdAt },
    { id: S.physics, name: 'Physics', color: '#f59e0b', createdAt },
    { id: S.chemistry, name: 'Chemistry', color: '#10b981', createdAt },
  ]

  const exams: Exam[] = [
    { id: E.chemistry, subjectId: S.chemistry, name: 'Organic Chemistry Quiz', date: addDaysISO(today, 7), createdAt },
    { id: E.math, subjectId: S.math, name: 'Calculus Midterm', date: addDaysISO(today, 10), createdAt },
    { id: E.physics, subjectId: S.physics, name: 'Mechanics Test', date: addDaysISO(today, 14), createdAt },
  ]

  const topic = (
    id: string,
    examId: string,
    name: string,
    estimatePomodoros: number,
    order: number,
    covered = false,
    confidence: Topic['confidence'] = null,
  ): Topic => ({ id, examId, name, estimatePomodoros, difficulty: 'medium', covered, confidence, order })

  const topics: Topic[] = [
    topic(T.limits, E.math, 'Limits', 2, 0, true, 3),
    topic(T.derivatives, E.math, 'Derivatives', 3, 1),
    topic(T.chainRule, E.math, 'Chain Rule', 2, 2),
    topic(T.integration, E.math, 'Integration Basics', 3, 3),
    topic(T.applications, E.math, 'Applications of Derivatives', 2, 4),
    topic(T.kinematics, E.physics, 'Kinematics', 2, 0, true, 2),
    topic(T.newtonsLaws, E.physics, "Newton's Laws", 2, 1),
    topic(T.workEnergy, E.physics, 'Work & Energy', 3, 2),
    topic(T.momentum, E.physics, 'Momentum', 2, 3),
    topic(T.alkanes, E.chemistry, 'Alkanes', 2, 0),
    topic(T.functionalGroups, E.chemistry, 'Functional Groups', 2, 1),
    topic(T.isomerism, E.chemistry, 'Isomerism', 1, 2),
  ]

  const block = (b: Partial<Block> & Pick<Block, 'id' | 'date' | 'kind' | 'title' | 'pomodoros'>): Block => ({
    order: 0,
    topicId: null,
    examId: null,
    subjectId: null,
    completedPomodoros: 0,
    status: 'planned',
    source: 'auto',
    pinned: false,
    reviewOffset: null,
    createdAt,
    ...b,
  })

  const d = (n: number) => addDaysISO(today, n)
  const blocks: Block[] = [
    // History: done new blocks for the two covered topics.
    block({
      id: autoBlockId(T.limits, 'new', 1), date: d(-3), kind: 'new', title: 'Limits', pomodoros: 2,
      completedPomodoros: 2, status: 'done', topicId: T.limits, examId: E.math, subjectId: S.math,
    }),
    block({
      id: autoBlockId(T.kinematics, 'new', 1), date: d(-2), kind: 'new', title: 'Kinematics', pomodoros: 2,
      completedPomodoros: 2, status: 'done', topicId: T.kinematics, examId: E.physics, subjectId: S.physics,
    }),
    // Missed: planned auto blocks from yesterday (catch-up should move these -> "Moved 2 missed blocks").
    block({
      id: autoBlockId(T.derivatives, 'new', 1), date: d(-1), order: 0, kind: 'new', title: 'Derivatives', pomodoros: 2,
      topicId: T.derivatives, examId: E.math, subjectId: S.math,
    }),
    block({
      id: autoBlockId(T.alkanes, 'new', 1), date: d(-1), order: 1, kind: 'new', title: 'Alkanes', pomodoros: 2,
      topicId: T.alkanes, examId: E.chemistry, subjectId: S.chemistry,
    }),
    // Manual task today.
    block({
      id: SEED_IDS.manualTask, date: today, kind: 'task', title: 'Problem set 3', pomodoros: 1,
      source: 'manual', subjectId: S.physics,
    }),
  ]

  // 4 completed 25-minute focus sessions on each of today-5 ... today-1 (streak = 5 with goal 4).
  type Ref = { blockId: string | null; topicId: string | null; examId: string | null; subjectId: string }
  const math = (topicId: string | null, blockId: string | null = null): Ref => ({ blockId, topicId, examId: E.math, subjectId: S.math })
  const phys = (topicId: string | null, blockId: string | null = null): Ref => ({ blockId, topicId, examId: E.physics, subjectId: S.physics })
  const chem = (topicId: string | null, blockId: string | null = null): Ref => ({ blockId, topicId, examId: E.chemistry, subjectId: S.chemistry })
  const limitsBlock = autoBlockId(T.limits, 'new', 1)
  const kinBlock = autoBlockId(T.kinematics, 'new', 1)
  const plan: Record<number, Ref[]> = {
    [-5]: [math(null), phys(null), chem(null), math(null)],
    [-4]: [phys(null), chem(null), math(null), phys(null)],
    [-3]: [math(T.limits, limitsBlock), math(T.limits, limitsBlock), chem(null), phys(null)],
    [-2]: [phys(T.kinematics, kinBlock), phys(T.kinematics, kinBlock), math(null), chem(null)],
    [-1]: [chem(null), math(null), phys(null), chem(null)],
  }
  const sessions: FocusSession[] = []
  for (const offset of [-5, -4, -3, -2, -1]) {
    plan[offset].forEach((ref, i) => {
      const startMin = 9 * 60 + i * 30 // 09:00, 09:30, 10:00, 10:30
      const date = d(offset)
      sessions.push({
        id: `seed-session-${-offset}-${i + 1}`,
        kind: 'focus',
        ...ref,
        startedAt: at(date, Math.floor(startMin / 60), startMin % 60),
        endedAt: at(date, Math.floor((startMin + 25) / 60), (startMin + 25) % 60),
        plannedMinutes: 25,
        actualMinutes: 25,
        completed: true,
        pomodorosCredited: 1,
      })
    })
  }

  return {
    settings,
    subjects,
    exams,
    topics,
    blocks,
    sessions,
    meta: [emptyPlanMeta(), { key: 'seed', seededAt: createdAt, version: SEED_VERSION }],
  }
}

function seedMarker(): SeedMeta {
  return { key: 'seed', seededAt: new Date().toISOString(), version: SEED_VERSION }
}

async function writeSeed(seed: DemoSeed): Promise<void> {
  await db.settings.put(seed.settings)
  await db.subjects.bulkPut(seed.subjects)
  await db.exams.bulkPut(seed.exams)
  await db.topics.bulkPut(seed.topics)
  await db.blocks.bulkPut(seed.blocks)
  await db.sessions.bulkPut(seed.sessions)
  await db.meta.bulkPut(seed.meta)
}

/**
 * Seed the demo data on first run. Returns true if it seeded.
 * Never re-seeds once `meta.seed` exists (so `clearAll` stays cleared after reload).
 */
export async function seedIfEmpty(): Promise<boolean> {
  return db.transaction('rw', allTables(), async () => {
    const marker = await db.meta.get('seed')
    if (marker) return false
    if ((await db.subjects.count()) > 0) {
      // Pre-existing user data without a marker: record the marker, do not overwrite.
      await db.meta.put(seedMarker())
      return false
    }
    await writeSeed(buildDemoSeed())
    return true
  })
}

/** Wipe everything and restore the demo seed (relative to today). */
export async function resetToDemo(): Promise<void> {
  await db.transaction('rw', allTables(), async () => {
    await Promise.all(allTables().map((t) => t.clear()))
    await writeSeed(buildDemoSeed())
  })
}

/**
 * Delete all user data. Keeps a default settings row and the `meta.seed` marker,
 * so the demo is NOT re-seeded on the next load.
 */
export async function clearAll(): Promise<void> {
  await db.transaction('rw', allTables(), async () => {
    await Promise.all(allTables().map((t) => t.clear()))
    await db.settings.put(defaultSettings())
    await db.meta.bulkPut([emptyPlanMeta(), seedMarker()])
  })
}
