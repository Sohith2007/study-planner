# FocusPlan Module Reference

FocusPlan has **no HTTP API and no server**. It is a fully client-side application: all "endpoints" are TypeScript module functions that read and write the local Dexie (IndexedDB) database directly, in-process, in the browser. This document is the internal-contract equivalent of an API reference — every function's signature, behavior, and example usage, taken from the frozen contracts in `.pipeline/master-plan.md` §4.3 and confirmed against the shipped code and phase handoffs.

All imports use the `@/` alias (mapped to `app/src/`), e.g. `import { db, getSettings } from '@/db'`.

## Contents
- [`@/types`](#types) — entity shapes
- [`@/db`](#db) — the database and repo helpers
- [`@/logic/scheduler`](#logicscheduler) — the plan generator (pure)
- [`@/logic/scheduler/planService`](#logicschedulerplanservice) — plan persistence, catch-up, trim
- [`@/logic/timer`](#logictimer) — the Pomodoro timer
- [`@/features/dashboard/stats`](#featuresdashboardstats) — readiness and focus stats (pure)
- [`@/features/data/backup`](#featuresdatabackup) — export / import
- [Error handling conventions](#error-handling-conventions)

---

## `@/types`

The entity types every other module shares. See `docs/architecture.md` §3 for the full ER diagram. Key types: `ISODate`, `ISODateTime`, `Subject`, `Exam`, `Topic` (`Difficulty`, `Confidence`), `Block` (`BlockKind`, `BlockStatus`, `BlockSource`), `FocusSession` (`SessionKind`), `Settings` (`TimerMode`), `OverflowItem`, `PlanMeta`, `SeedMeta`, `MetaRecord`.

## `@/db`

```ts
export const db: FocusPlanDB
// Dexie 'focusplan' v1 tables: subjects, exams, topics, blocks, sessions, settings, meta
// indexes — subjects 'id, name' · exams 'id, subjectId, date' · topics 'id, examId'
//           blocks 'id, date, examId, topicId, status' · sessions 'id, startedAt, blockId, subjectId'
//           settings 'id' · meta 'key'

export const DB_NAME = 'focusplan'
export function allTables(): Table[]   // every table, for whole-DB transactions (used by import)

export function getSettings(): Promise<Settings>
// Returns the single settings row, filling any missing fields from defaults. Never throws on an empty DB.

export function saveSettings(patch: Partial<Settings>): Promise<void>
// Merges `patch` into the existing settings row and writes it.

export const DEFAULT_SETTINGS: Readonly<Settings>
export function defaultSettings(): Settings
export const SETTINGS_ID = 'settings'

export function deleteExamCascade(id: string): Promise<void>
// Deletes the exam, its topics, and every block with that examId/topicId. Focus sessions are kept as history.

export function deleteSubjectCascade(id: string): Promise<void>
// Deletes the subject, its exams (cascading as above), and every block with that subjectId
// (including manual tasks under the subject). Focus sessions are kept as history.

export function getPlanMeta(): Promise<PlanMeta>       // meta.plan, or an empty record if none exists yet
export function emptyPlanMeta(): PlanMeta

export function seedIfEmpty(): Promise<boolean>   // seeds the demo data once; a no-op if meta.seed already exists
export function resetToDemo(): Promise<void>      // wipes everything and reseeds relative to "today"
export function clearAll(): Promise<void>         // wipes everything; writes back default settings + an empty meta.plan
                                                   // + the meta.seed marker, so a reload after clear stays empty

export function buildDemoSeed(today?: ISODate, now?: Date): DemoSeed   // PURE — used directly by unit tests
export const SEED_IDS   // stable ids for every seeded row, e.g. SEED_IDS.subjectMath
export const SEED_VERSION
```

**Reactive reads.** Every screen reads Dexie with `dexie-react-hooks`' `useLiveQuery`, e.g.:
```ts
const todaysBlocks = useLiveQuery(
  () => db.blocks.where('date').equals(today).sortBy('order'),
  [today]
)
```
Any write from anywhere in the app (the scheduler, the timer, a form save) is picked up automatically — there is no need to refetch or invalidate a cache.

**Testing in Node.** Import `'fake-indexeddb/auto'` before importing `@/db` in a unit test (see `src/db/db.test.ts`).

---

## `@/logic/scheduler`

The plan generator. **Pure — no I/O.**

```ts
export interface PlanInput {
  today: string
  subjects: Subject[]
  exams: Exam[]
  topics: Topic[]
  settings: Settings
  existingBlocks: Block[]
  now?: string   // optional; sets createdAt on newly created blocks
}

export interface OverflowItem {
  examId: string
  topicId: string | null
  kind: 'new' | 'review'
  pomodoros: number
  reason: 'no-capacity' | 'exam-passed'
}

export interface PlanResult {
  keep: Block[]        // existing blocks left untouched
  create: Block[]       // new/updated blocks to write
  removeIds: string[]   // ids of stale planned auto blocks to delete
  overflow: OverflowItem[]   // work that could not be scheduled, with a reason
}

export function generatePlan(input: PlanInput): PlanResult
```

**Behavior** is documented in full in `docs/architecture.md` §4 (rules for kept blocks, chunking, review offsets, pacing/interleaving, overflow reasons). Additional exported helpers, useful for tests or advanced integrations:

```ts
isKeptBlock(b: Block): boolean
isMovedBlock(b: Block, today: string): boolean
normalizeReviewOffsets(o?: number[]): number[]
largestReviewOffset(o?: number[]): number | null
trimmedReviewOffsets(o?: number[]): number[]
extraReviewOffset(o: number[]): number
capacityFor(settings: Settings, weekday: number): number
MAX_NEW_BLOCK_POMODOROS = 2
summarizeOverflow(overflow: OverflowItem[]): { total: number; byExam: { examId, pomodoros, examPassed }[] }
```

**Example — calling the scheduler directly** (as unit tests do):
```ts
import { generatePlan } from '@/logic/scheduler'

const result = generatePlan({
  today: '2026-09-19',
  subjects, exams, topics, settings,
  existingBlocks: [],
})
// result.create -> new Block[] to persist
// result.overflow -> [{ examId: 'exam-1', topicId: 'topic-4', kind: 'new', pomodoros: 3, reason: 'no-capacity' }, ...]
```

---

## `@/logic/scheduler/planService`

Wraps `generatePlan` in Dexie reads/writes and transactions.

```ts
export interface PlanSummary {
  movedCount: number       // past-due planned auto blocks moved forward
  createdCount: number     // blocks written this run
  overflow: OverflowItem[]
  overCapacity: boolean
}

export function replan(opts?: { today?: string }): Promise<PlanSummary>
// Runs generatePlan in one Dexie transaction, applies the keep/create/remove diff, and
// records meta.plan = { lastPlannedAt, overflow, lastCatchUp }.

export function catchUpOnOpen(): Promise<PlanSummary>
// Like replan(), but also moves any planned, unpinned auto blocks still dated before today
// forward, and always records meta.plan.lastCatchUp = { movedCount, at }.

export function trimLargestReview(opts?: { today?: string }): Promise<{ removed: number | null; summary: PlanSummary }>
// Drops the largest configured review offset (e.g. +7) from settings.reviewOffsets and replans.
// `removed` is null if there was nothing left to trim.
```

**Example — the over-capacity "Trim reviews" action:**
```ts
import { trimLargestReview } from '@/logic/scheduler/planService'

const { removed, summary } = await trimLargestReview()
if (removed !== null) {
  toast.show(`Removed the +${removed} day review. Plan rebuilt.`)
}
```

**Notes:**
- Consumers (Setup, Settings, Planner) never need to call `replan()` after routine edits — `PlanSync` (`src/features/plan-status/PlanSync.tsx`) watches subjects/exams/topics/settings live and debounces a call to `replan()` by 500ms.
- Block edits (move/done/skip) do **not** trigger a replan by design; `PlanSync` does not watch the `blocks` table, to avoid a feedback loop.
- `replan()` is idempotent: calling it twice with no other changes produces identical block ids and dates both times.

---

## `@/logic/timer`

```ts
export type TimerPhase = 'focus' | 'shortBreak' | 'longBreak'

export interface TimerSnapshot {
  status: 'idle' | 'running' | 'paused'
  phase: TimerPhase
  mode: 'classic' | 'flowtime'
  remainingMs: number     // rounded up to whole seconds; 0 during a Flowtime focus (use elapsedMs instead)
  elapsedMs: number       // rounded down to whole seconds
  durationMs: number
  endsAt: number | null
  blockId: string | null
  completedFocusCount: number
}

export interface TimerApi extends TimerSnapshot {
  start(blockId?: string | null): void   // only works while idle; undefined keeps the current link, null = free focus
  pause(): void
  resume(): void
  skip(): void                            // advances to the next phase without crediting a pomodoro
  reset(): void                           // returns to an idle focus phase, clears the link and completedFocusCount
  endFlow(): void                         // Flowtime only — ends the focus, starts a computed break, credits pomodoros
}

export function TimerProvider(props: { children: React.ReactNode }): JSX.Element
export function useTimer(): TimerApi   // outside a provider, returns an idle 25:00 focus with no-op actions
```

Additional exports: `useTimerDetails(): TimerDetails` (`{ready, settings, link, notice, announcement, saveErrorCount, notificationHint, setMode(mode), longBreakEvery, lengths}`), `formatClock(ms)`, `formatTitle(snapshot)`, `displayMs(snapshot)`, `PHASE_TEXT`, `TIMER_STORAGE_KEY = 'focusplan.timer.v1'`.

**Example — starting a focus session linked to a block** (as `FocusPage` does):
```tsx
import { useTimer } from '@/logic/timer'

function FocusPage() {
  const timer = useTimer()
  const [params] = useSearchParams()
  const blockId = params.get('blockId')

  return timer.status === 'idle'
    ? <Button onClick={() => timer.start(blockId)}>Start</Button>
    : <Button onClick={timer.pause}>Pause</Button>
}
```

**Data written as a side effect** (for consumers reading `sessions`/`blocks`):
- One `sessions` row per completed phase (focus *and* breaks), id `timer:<phase>:<phaseStartedAtMs>` (deterministic — never double-counted).
- On a completed focus with a linked block: `block.completedPomodoros += credited`, and `block.status` becomes `'partial'` (0 < completed < total) or `'done'` (completed ≥ total).
- Skip and Reset write nothing.

---

## `@/features/dashboard/stats`

Pure functions — take `today: ISODate` explicitly, no hidden clock dependency.

```ts
readiness(exam: Exam, blocks: Block[], overflow: OverflowItem[], today: ISODate)
  => { done: number; remaining: number; percent: number }
// percent = round(100 * done / (done + remaining)); 0% if there is no work and no overflow.

overflowFor(examId: string, overflow: OverflowItem[]): number
topicsCoverage(topics: Topic[]): { covered: number; total: number }
upcomingExams(exams: Exam[], today: ISODate): Exam[]   // future/today exams, sorted by date

focusMinutesToday(sessions: FocusSession[], today: ISODate): number
focusMinutesThisWeek(sessions: FocusSession[], today: ISODate): number   // Monday-start week
// Both sum actualMinutes of kind:'focus' sessions only (break sessions are excluded).

completedFocusByDay(sessions: FocusSession[], today: ISODate): Record<ISODate, number>
completedFocusToday(sessions: FocusSession[], today: ISODate): number
streak(sessions: FocusSession[], today: ISODate, dailyGoal: number): number
// Consecutive days (from today, or yesterday if today hasn't met the goal yet) with
// completed focus sessions >= dailyGoal.

last7DaysSeries(sessions: FocusSession[], subjects: Subject[], today: ISODate)
  => { days: ISODate[]; keys: string[]; hasData: boolean }   // 7 days ending today, stacked by subject

minuteTicks(...), hoursMinutesLabel(...), sessionDate(...), UNLINKED_KEY   // formatting helpers
```

**Example:**
```ts
import { readiness, streak } from '@/features/dashboard/stats'

const { percent } = readiness(exam, blocks, overflowMeta.overflow, todayISO())
const currentStreak = streak(sessions, todayISO(), settings.dailyGoalPomodoros)
```

---

## `@/features/data/backup`

```ts
export function parseBackup(text: string): { ok: true; backup: Backup } | { ok: false; error: string }
export function buildBackup(): Promise<Backup>
export function backupFileName(today?: ISODate): string   // 'focusplan-backup-YYYY-MM-DD.json'
export function readBackup(file: File): Promise<string>
export function replaceAllData(backup: Backup): Promise<void>   // one Dexie transaction over allTables()
export function downloadBackup(backup: Backup, name?: string): void   // triggers a browser download, no network call
export const TIMER_STORAGE_KEY = 'focusplan.timer.v1'
```

**Backup file shape:**
```json
{
  "app": "focusplan",
  "version": 1,
  "exportedAt": "2026-09-19T10:00:00.000Z",
  "subjects": [ /* Subject[] */ ],
  "exams": [ /* Exam[] */ ],
  "topics": [ /* Topic[] */ ],
  "blocks": [ /* Block[] */ ],
  "sessions": [ /* FocusSession[] */ ],
  "settings": { /* Settings */ }
}
```

**Example — the export button:**
```ts
import { buildBackup, downloadBackup } from '@/features/data/backup'

const backup = await buildBackup()
downloadBackup(backup)   // downloads focusplan-backup-2026-09-19.json
```

**Example — the import flow, with validation:**
```ts
import { readBackup, parseBackup, replaceAllData } from '@/features/data/backup'

const text = await readBackup(file)
const result = parseBackup(text)
if (!result.ok) {
  showError(result.error)   // e.g. "That file isn't valid JSON. Nothing was changed."
} else {
  await replaceAllData(result.backup)   // replaces everything in one transaction; nothing changes on failure
}
```

---

## Error handling conventions

Since there is no network layer, "errors" in FocusPlan are almost always one of:
1. **Validation errors** (Setup/Settings forms) — rendered inline next to the field as `<p role="alert" data-testid="<field>-error">`, and the write is never attempted.
2. **Storage errors** (Dexie throws, e.g. a blocked/private-mode IndexedDB) — caught by a page-level error boundary, rendered as a `page-error` panel with a Reload action. Nothing is retried silently.
3. **Action-level errors** (e.g. a save failing mid-flow, an invalid import file) — surfaced as an error toast (`role="alert"`, 8-second duration) rather than a page-level error, since the rest of the page is still usable.

All three patterns degrade gracefully: for example, a denied Notification permission never throws — the timer completes normally and shows an inline hint instead.
