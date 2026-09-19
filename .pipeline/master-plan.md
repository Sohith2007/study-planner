# Master Plan: FocusPlan

> Source: .pipeline/research-report.md · Author: solution-architect · Date: 2026-09-19

## 1. Product vision
FocusPlan is a free, ad-free, no-account study planner. Students enter subjects, exams and topics. The app builds a spaced, Pomodoro-sized plan that works back from each exam date, and every planned block opens straight into a Pomodoro timer that logs progress against that topic. Missed work is rescheduled automatically, and a dashboard shows readiness for each exam. This build delivers all five USPs from the report: #1 an exam-backward spaced planner, #2 one-click plan-to-timer with automatic logging, #3 automatic catch-up rescheduling, #4 an exam readiness dashboard, and #5 local-first storage with no account and JSON export/import.

## 2. Tech stack
| Layer | Choice | Why |
|---|---|---|
| Frontend | **Vite 8 + React 19 + TypeScript**, React Router 7 (library mode, `BrowserRouter`), Tailwind CSS 4 via `@tailwindcss/vite` | The app runs entirely in the browser with no server, no API and no SSR, so Next.js adds nothing and a Vite SPA is faster to build and simpler to test. This also matches the report's §9 suggestion. |
| Backend / API | **None.** All logic runs client-side | The scope says no accounts and no external APIs. The "API contract" is the TypeScript module contracts in §4.3. |
| Data | **IndexedDB via Dexie 4** plus `dexie-react-hooks` (`useLiveQuery`) for reactive reads. The running timer is mirrored to `localStorage` | Local-first (USP #5). Live queries update every screen when another phase's code writes, so no global store is needed. |
| Utilities | `date-fns` (date maths), `recharts` (stats chart), `clsx` | Taken from the report's §9 suggestions |
| Auth | None | Out of scope (no accounts) |
| Testing | Playwright (e2e, Chromium) + **Vitest** (unit tests for the scheduler, timer reducer and stats), with `fake-indexeddb` for service tests in Node | Playwright's `page.clock` API lets tests fast-forward the timestamp-based timer and fix "today" to a known date |

Needs Node 20.19+ or 22.12+ (Vite 8 requirement). Scaffold with `npm create vite@latest app -- --template react-ts`, or write the files by hand if the prompt is interactive, then run `npm i tailwindcss @tailwindcss/vite`.

**Run commands** (all run from `app/`): install `npm install && npx playwright install chromium` · dev `npm run dev` (runs `vite --port 5173 --strictPort`, base_url `http://localhost:5173`) · build `npm run build` (`tsc -b && vite build`) · unit tests `npm run test:unit` (`vitest run`) · e2e `npx playwright test` (the webServer in the Playwright config starts `npm run dev` and reuses an existing server)

## 3. Features
| ID | Feature | Priority | USP | Phase |
|---|---|---|---|---|
| F1 | Subjects, exams and topics setup (including quick-add) | must | #1 | P3 |
| F2 | Study availability settings (weekday capacity, timer lengths, blackout dates, daily goal) | must | #1, #3 | P3 |
| F3 | Auto plan generator (spaced, exam-backward, capacity-aware) | must | #1 | P1 |
| F4 | Today and Week views (queue, calendar grid, add/edit/move/delete, ad-hoc tasks) | must | #1, #2 | P4 |
| F5 | Pomodoro timer linked to blocks (timestamp-based, notifications, title, Flowtime) | must | #2 | P2 |
| F6 | Session completion and topic progress (done/partial/skip, covered + confidence) | must | #2, #4 | P4 |
| F7 | Auto catch-up rescheduling (on open, Replan button, over-capacity warning) | must | #3 | P1 |
| F8 | Dashboard and stats (readiness, countdown, focus minutes, 7-day chart, streak) | must | #4 | P5 |
| F9 | Local-first persistence, JSON export/import, reset demo / clear data | must | #5 | P5 (seed and DB layer come from P0) |

## 4. Architecture

### 4.1 Components
- **App shell (P0):** `main.tsx` → `TimerProvider` (P2 contract) → `BrowserRouter` → `Layout`. `Layout` has a top nav (Today, Week, Focus, Setup, Settings, Dashboard, Data) and renders `<PlanSync/>` (invisible) and `<PlanStatusBar/>` (P1) above `<Outlet/>`. On boot, `src/app/bootstrap.ts` calls `seedIfEmpty()` before the first render.
- **Scheduler engine (P1):** a pure `generatePlan()` plus `planService` (`replan`, `catchUpOnOpen`), which reads and writes Dexie. `PlanSync` runs catch-up on mount and re-plans (debounced by 500 ms) whenever subjects, exams, topics or settings change. `PlanStatusBar` shows the Replan button, the catch-up notice and the over-capacity banner.
- **Timer engine (P2):** a pure reducer computed from timestamps, a `TimerProvider` context mounted once at the root (so the timer survives route changes), localStorage persistence, notifications, a Web Audio chime, and the document title. It also owns the Focus page.
- **Feature screens:** Setup and Settings (P3), Today and Week (P4), Dashboard and Data (P5). Every screen reads Dexie through `useLiveQuery`.

### 4.2 Data model (Dexie database `focusplan`, version 1; dates are local `YYYY-MM-DD` strings; ids come from `crypto.randomUUID()` unless stated otherwise)
| Table (indexes) | Fields |
|---|---|
| `subjects` (`id, name`) | `id`, `name`, `color` (hex), `createdAt` (ISO) |
| `exams` (`id, subjectId, date`) | `id`, `subjectId`, `name`, `date`, `createdAt` |
| `topics` (`id, examId`) | `id`, `examId`, `name`, `estimatePomodoros` (int 1–20, default 2), `difficulty` (`'easy'|'medium'|'hard'`, default medium), `covered` (bool), `confidence` (`1|2|3|null`), `order` (int) |
| `blocks` (`id, date, examId, topicId, status`) | `id`, `date`, `order` (int within the day), `kind` (`'new'|'review'|'task'`), `topicId|null`, `examId|null`, `subjectId|null`, `title`, `pomodoros` (int ≥1), `completedPomodoros` (int), `status` (`'planned'|'partial'|'done'|'skipped'`), `source` (`'auto'|'manual'`), `pinned` (bool; true once the user moves or edits an auto block), `reviewOffset` (`number|null`), `createdAt` |
| `sessions` (`id, startedAt, blockId, subjectId`) | `id`, `kind` (`'focus'|'shortBreak'|'longBreak'`), `blockId|null`, `topicId|null`, `examId|null`, `subjectId|null`, `startedAt` (ISO), `endedAt` (ISO), `plannedMinutes`, `actualMinutes`, `completed` (bool), `pomodorosCredited` (int) |
| `settings` (`id`), a single row with `id: 'settings'` | `dailyCapacity` (array of 7 ints indexed by JS weekday, 0 = Sunday), `focusMinutes` (25), `shortBreakMinutes` (5), `longBreakMinutes` (15), `longBreakEvery` (4), `timerMode` (`'classic'|'flowtime'`), `dailyGoalPomodoros` (4), `blackoutDates` (string[]), `reviewOffsets` (number[], default `[1,3,7]`), `soundEnabled` (true), `notificationsEnabled` (true) |
| `meta` (`key`) | `{key:'plan', lastPlannedAt, overflow: OverflowItem[], lastCatchUp: {movedCount, at}}`, `{key:'seed', seededAt, version}` |

Auto blocks have **deterministic ids**, `auto:<topicId>:<kind>:<n>`, so that a re-plan never orphans a block the timer is running against.

**Demo seed** (P0, `src/db/seed.ts`; every date is relative to "today" when seeding):
- Settings: capacity Mon–Fri 6, Sat 8, Sun 4; timer 25/5/15, long break every 4; classic mode; goal 4; no blackouts.
- Subjects: Mathematics `#6366f1`, Physics `#f59e0b`, Chemistry `#10b981`.
- Exams: "Organic Chemistry Quiz" (Chemistry, today+7), "Calculus Midterm" (Mathematics, today+10), "Mechanics Test" (Physics, today+14).
- 12 topics:
  - Mathematics: Limits 2 (covered, confidence 3), Derivatives 3, Chain Rule 2, Integration Basics 3, Applications of Derivatives 2.
  - Physics: Kinematics 2 (covered, confidence 2), Newton's Laws 2, Work & Energy 3, Momentum 2.
  - Chemistry: Alkanes 2, Functional Groups 2, Isomerism 1.
- History blocks: Limits `new` 2/2 done at today−3, and Kinematics `new` 2/2 done at today−2.
- **Missed blocks:** 2 `planned` auto blocks dated today−1 (Derivatives `new` 2, Alkanes `new` 2).
- A manual task "Problem set 3" (Physics, 1 pomodoro) today.
- Sessions: 4 completed 25-minute focus sessions on each of days today−5 … today−1, spread across the subjects. This gives a streak of **5**.

### 4.3 Module contracts (these replace an HTTP API; P0 writes the signatures and working stubs, and the owning phase implements them without changing existing signatures)
```ts
// src/logic/scheduler/index.ts (implemented by P1; pure, no I/O)
export interface PlanInput { today: string; subjects: Subject[]; exams: Exam[]; topics: Topic[]; settings: Settings; existingBlocks: Block[] }
export interface OverflowItem { examId: string; topicId: string | null; kind: 'new' | 'review'; pomodoros: number; reason: 'no-capacity' | 'exam-passed' }
export interface PlanResult { keep: Block[]; create: Block[]; removeIds: string[]; overflow: OverflowItem[] }
export function generatePlan(input: PlanInput): PlanResult

// src/logic/scheduler/planService.ts (implemented by P1; reads and writes Dexie)
export interface PlanSummary { movedCount: number; createdCount: number; overflow: OverflowItem[]; overCapacity: boolean }
export function replan(opts?: { today?: string }): Promise<PlanSummary>
export function catchUpOnOpen(): Promise<PlanSummary> // moves past-due planned auto blocks and records meta.plan.lastCatchUp

// src/features/plan-status/PlanSync.tsx, PlanStatusBar.tsx (P1): default-export React components with no props

// src/logic/timer/index.ts (implemented by P2)
export type TimerPhase = 'focus' | 'shortBreak' | 'longBreak'
export interface TimerSnapshot { status: 'idle' | 'running' | 'paused'; phase: TimerPhase; mode: 'classic' | 'flowtime'; remainingMs: number; elapsedMs: number; durationMs: number; endsAt: number | null; blockId: string | null; completedFocusCount: number }
export interface TimerApi extends TimerSnapshot { start(blockId?: string | null): void; pause(): void; resume(): void; skip(): void; reset(): void; endFlow(): void }
export function TimerProvider(props: { children: React.ReactNode }): JSX.Element
export function useTimer(): TimerApi

// src/db/* (P0)
export const db: FocusPlanDB  // Dexie tables: subjects, exams, topics, blocks, sessions, settings, meta
export function getSettings(): Promise<Settings>; export function saveSettings(patch: Partial<Settings>): Promise<void>
export function deleteExamCascade(id: string): Promise<void>; export function deleteSubjectCascade(id: string): Promise<void>
export function seedIfEmpty(): Promise<boolean>; export function resetToDemo(): Promise<void>; export function clearAll(): Promise<void>
```
**Scheduler rules** (F3/F7; P1 owns the details):
1. Remaining new work for a topic = `estimatePomodoros` − completed new pomodoros − pomodoros still planned in kept (pinned or manual) new blocks. The value is 0 when the topic is `covered`.
2. New work is split into blocks of at most 2 pomodoros each.
3. Review blocks are 1 pomodoro each, placed at each offset in `settings.reviewOffsets` after the topic's last new block. A topic with `confidence === 1` gets one extra review.
4. New blocks for an exam go on or before exam date − 2. Reviews go on or before exam date − 1. Nothing goes on or after the exam date.
5. Days are filled from today onwards, earliest deadline first, round-robin across subjects. Each day holds at most `dailyCapacity[weekday]` minus the pomodoros already kept on that day. Blackout days get nothing.
6. Anything that does not fit goes into `overflow`.
7. Replan keeps every block that is done, partial, skipped, pinned or manual. It removes planned, unpinned auto blocks dated today or later and regenerates them. Past-due planned auto blocks are removed and counted in `movedCount`.

**Routes:** `/` → redirect to `/today` · `/today` · `/week?start=YYYY-MM-DD` · `/focus?blockId=<id>` · `/setup` · `/settings` · `/dashboard` · `/data`.

**Test-id conventions** (kebab-case `data-testid`):
- Navigation: `nav-<route>`.
- Planner: `today-block`, `week-day-<date>`, `block-card`, `start-next`, `add-task-*`.
- Plan status: `replan-button`, `catchup-notice`, `overcapacity-banner`.
- Timer: `timer-display`, `timer-phase`, `timer-start|pause|resume|skip|reset`, `timer-active-block`, `timer-mode`, `timer-end-flow`.
- Dashboard: `exam-card`, `readiness`, `focus-today`, `focus-week`, `focus-chart`, `streak-count`.
- Data: `export-button`, `import-input`, `reset-demo`, `clear-all`.
- Settings: `capacity-<0..6>`, `settings-save`.

### 4.4 Folder structure (`app/`)
```
package.json  vite.config.ts  tsconfig*.json  index.html  playwright.config.ts  .gitignore     (P0)
tests/e2e/smoke.spec.ts                                                                         (P0 creates it; QA extends it)
src/main.tsx  src/index.css                                                                     (P0)
src/app/        Layout, NavBar, routes, bootstrap                                               (P0)
src/types/      entity types                                                                    (P0)
src/db/         Dexie db, repo helpers, seed                                                    (P0)
src/lib/        dates.ts, ids.ts, format.ts                                                     (P0)
src/components/ui/  Button, Card, Badge, Modal, Field, EmptyState, Toast                        (P0)
src/logic/scheduler/        generatePlan, planService, *.test.ts                                (P1)
src/features/plan-status/   PlanSync, PlanStatusBar                                             (P1)
src/logic/timer/            reducer, TimerProvider, notify/sound/title, *.test.ts               (P2)
src/features/focus/         FocusPage                                                           (P2)
src/features/setup/         SetupPage (subjects/exams/topics)                                   (P3)
src/features/settings/      SettingsPage                                                        (P3)
src/features/planner/       TodayPage, WeekPage, block actions, task form                       (P4)
src/features/dashboard/     DashboardPage, stats.ts, stats.test.ts                              (P5)
src/features/data/          DataPage, backup.ts (export/import)                                 (P5)
```
P0 creates a stub for every page component and every contract file listed above, so all later phases compile and can run independently from the start.

## 5. Phases
The dependency graph, one line per edge:
```
P0 → P1, P2, P3, P4, P5
```
Expected waves: **Wave 1:** P0 · **Wave 2:** P1, P2, P3, P4, P5 (five engineers in parallel). The phases in wave 2 integrate through the P0 contracts and through the shared Dexie database, which each screen reads live.

### P0: Foundation (owner: phase-engineer)
- **Owns:** `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `playwright.config.ts`, `.gitignore`, `public/**`, `src/main.tsx`, `src/index.css`, `src/vite-env.d.ts`, `src/app/**`, `src/types/**`, `src/db/**`, `src/lib/**`, `src/components/**`, `tests/e2e/**`, plus the initial stubs `src/logic/scheduler/index.ts`, `src/logic/scheduler/planService.ts`, `src/features/plan-status/PlanSync.tsx`, `src/features/plan-status/PlanStatusBar.tsx`, `src/logic/timer/index.ts`, and one `*Page.tsx` in each of `src/features/{planner,focus,setup,settings,dashboard,data}/`
- **Depends on:** none
- **Features:** scaffolding only (the seed and DB layer support F9)
- **Tasks:**
  1. Scaffold Vite react-ts into `app/`. Install every runtime and dev dependency listed in §2 now, because no later phase may edit `package.json`. Add the scripts `dev`, `build`, `preview`, `test:unit` and `test:e2e`.
  2. Set up Tailwind 4 (`@import "tailwindcss"`) and apply the design tokens from `.pipeline/design/` as `@theme` variables.
  3. Write `src/types`, the Dexie schema, the repo helpers (settings get/save, cascade deletes) and the seed (§4.2), with `seedIfEmpty`, `resetToDemo` and `clearAll`.
  4. Write the date helpers (`todayISO`, `addDaysISO`, `weekdayOf`, `startOfWeekISO` with Monday as the first day, `daysBetween`) and `newId`.
  5. Build the Layout, NavBar and routes. `bootstrap.ts` must seed before the first render.
  6. Write the shared UI primitives.
  7. Write the contract stubs from §4.3. The naive `generatePlan` places new blocks only. `useTimer` returns an idle snapshot with no-op actions. Page stubs render an `<h1>` only.
  8. Write the Playwright config (Chromium, `baseURL` `http://localhost:5173`, webServer `npm run dev`) and `tests/e2e/smoke.spec.ts`. Write the Vitest config (`src/**/*.test.ts`, node environment).
- **Acceptance criteria:**
  - AC-P0-1: `npm run build` in `app/` exits 0 with no TypeScript errors.
  - AC-P0-2: Visiting `/` redirects to `/today`. The nav shows Today, Week, Focus, Setup, Settings, Dashboard and Data (`nav-*`), and clicking each one changes the URL and heading without a full page reload or console errors.
  - AC-P0-3: In a fresh browser context, the IndexedDB database `focusplan` contains 3 subjects, 3 exams, 12 topics and 1 settings row after the first load. After a reload it still has 3 subjects (no duplicate seeding).
  - AC-P0-4: Loading `/week` directly (deep link or reload) renders the app, not a 404.
  - AC-P0-5: `npx playwright test tests/e2e/smoke.spec.ts` passes, and `npm run test:unit` runs and exits 0.

### P1: Scheduler engine and catch-up (owner: phase-engineer)
- **Owns:** `src/logic/scheduler/**`, `src/features/plan-status/**`
- **Depends on:** P0
- **Features:** F3, F7
- **Tasks:**
  1. Implement a pure, deterministic `generatePlan` that follows the scheduler rules in §4.3, including deterministic ids, round-robin interleaving and overflow.
  2. Implement `replan` and `catchUpOnOpen` in a Dexie transaction, and store `meta.plan`.
  3. `PlanSync` calls `catchUpOnOpen` once on mount, then watches subjects, exams, topics and settings with a live query and replans on change (debounced by 500 ms). It must not watch `blocks`, to avoid loops.
  4. `PlanStatusBar` shows `replan-button`, `catchup-notice` ("Moved N missed blocks", dismissible) and `overcapacity-banner`. The banner lists the unscheduled pomodoros for each exam, links to Settings and has a "Trim reviews" action that drops the largest review offset and replans.
  5. Write at least 12 Vitest cases for the scheduler and service (use fake-indexeddb for the service tests).
- **Acceptance criteria:**
  - AC-P1-1 (F3): On first load of the demo, the `blocks` table (and the Week view) contains auto `new` blocks for every uncovered seed topic, and their pomodoros add up to that topic's estimate. Covered topics (Limits, Kinematics) get no new blocks.
  - AC-P1-2 (F3): For every date, the planned pomodoros of that day's blocks do not exceed the capacity for that weekday. After a blackout date is added in Settings, no block is dated on it.
  - AC-P1-3 (F3): No block for an exam is dated on or after the exam date. No `new` block for an exam falls on the day before it. Every topic's review blocks are dated after its last new block, at the configured offsets where they fit.
  - AC-P1-4 (F3): On any day that has capacity 4 or more while two or more exams still have pending work, the day holds blocks from at least 2 different subjects (interleaving).
  - AC-P1-5 (F3): Marking a topic covered with confidence 1 adds exactly one extra `review` block for that topic after the automatic replan.
  - AC-P1-6 (F7): On first open of the demo, no `planned` block is dated before today, and `catchup-notice` reads "Moved 2 missed blocks". The Derivatives and Alkanes work is scheduled on today or later.
  - AC-P1-7 (F7): Clicking `replan-button` keeps done, partial and skipped blocks, manual tasks and pinned blocks unchanged (same id and date). Running it twice in a row gives the same set of blocks (same ids and dates).
  - AC-P1-8 (F7): Setting every weekday capacity to 1 in Settings makes `overcapacity-banner` appear with the unscheduled pomodoro counts. Clicking "Trim reviews" lowers the unscheduled count. Restoring the seed capacities hides the banner.
  - AC-P1-9 (F3): `npm run test:unit` passes at least 12 scheduler and service tests covering capacity, blackout, exam cutoff, the day-before-exam rule, interleaving, confidence review, overflow, catch-up and idempotency.

### P2: Pomodoro timer engine and Focus screen (owner: phase-engineer)
- **Owns:** `src/logic/timer/**`, `src/features/focus/**`
- **Depends on:** P0
- **Features:** F5
- **Tasks:**
  1. Write a pure reducer that works from `startedAt`, `endsAt` and `pausedRemainingMs`. Remaining time is always `endsAt − Date.now()`. It ticks every 250 ms and on `visibilitychange`.
  2. Persist to `localStorage` key `focusplan.timer.v1` and restore on load, completing any phase that ended while the page was closed.
  3. Implement phases focus → short break, with a long break after every `longBreakEvery` focus sessions. Lengths come from settings.
  4. Implement Flowtime mode: focus counts up, `timer-end-flow` starts a break of `max(1, round(focusMinutes/5))` minutes, and credits `floor(elapsed/focusMinutes)` pomodoros, with a minimum of 1 if elapsed is at least 1 minute.
  5. When a focus ends, write a `sessions` row. If the block exists, increment its `completedPomodoros` and set `status` to `done` when it is full. If the block is missing, still save the session using the topic, exam and subject captured at start.
  6. Notifications: ask for permission on the first Start, degrade gracefully if it is denied, and gate them on `settings.notificationsEnabled`. Play a Web Audio chime (gated on `soundEnabled`). The document title shows `MM:SS · Focus — FocusPlan` and returns to `FocusPlan` when idle.
  7. The Focus page shows the timer, the phase, the controls, the active block (topic, subject, n/m pomodoros), a mode switch and a "free focus" option when no `blockId` is given.
  8. Write Vitest tests for the reducer.
- **Acceptance criteria:**
  - AC-P2-1 (F5): With the seed settings and the timer idle, `/focus` shows `timer-display` "25:00" and `timer-phase` "Focus". Start makes it count down. Pause freezes it (the value is unchanged after 5 s of clock time). Resume continues.
  - AC-P2-2 (F5): With the Playwright clock, start a focus and fast-forward 10 minutes (simulating a throttled background tab). The display reads 15:00 ± 1 s. After a page reload the timer is still running and shows about the same remaining time.
  - AC-P2-3 (F5): When a focus runs out, the phase switches to "Short break" at 05:00. After the 4th completed focus it switches to "Long break" at 15:00. Skip moves to the next phase without crediting a pomodoro. Reset returns to an idle 25:00 focus.
  - AC-P2-4 (F5): While running, `document.title` matches `/^\d{2}:\d{2} · (Focus|Short break|Long break) — FocusPlan$/`. After Reset it is `FocusPlan`.
  - AC-P2-5 (F5): Open `/focus?blockId=<id>` for a planned 2-pomodoro block, then complete one focus. `timer-active-block` shows "1/2", a completed focus session of 25 minutes is stored, and the block shows 1/2 on Today. After a second completed focus the block's status is done.
  - AC-P2-6 (F5): With `Notification` stubbed and permission granted, the end of a focus creates a notification whose title contains "Focus complete". With permission denied, the timer still completes, no error is thrown and an inline hint says notifications are off.
  - AC-P2-7 (F5): After focus is set to 50 and short break to 10 in Settings, the idle Focus page shows 50:00, and after that focus ends the break shows 10:00.
  - AC-P2-8 (F5): In Flowtime mode (`timer-mode`) the display counts up from 00:00. After 20 minutes, `timer-end-flow` starts a 04:00 break and stores a focus session of 20 minutes.
  - AC-P2-9 (F5): `npm run test:unit` passes at least 8 timer reducer tests (start, pause/resume, expiry, long-break cadence, skip, restore after reload, flowtime).

### P3: Setup and availability settings UI (owner: frontend-engineer)
- **Owns:** `src/features/setup/**`, `src/features/settings/**`
- **Depends on:** P0
- **Features:** F1, F2
- **Tasks:**
  1. On `/setup`, build subject CRUD (name, colour picker with 8 presets), exam CRUD grouped under subjects (name, date, countdown), and topic CRUD under each exam (name, estimate, difficulty, covered badge, confidence display).
  2. Add a quick-add textarea (one topic per line) and confirm dialogs for cascading deletes.
  3. On `/settings`, build the 7 weekday capacity inputs (Mon…Sun order, 0–16), timer lengths and long-break cadence, a classic/Flowtime default, the daily goal, blackout dates (add/remove), and sound and notification toggles. Save with `settings-save`, then show a toast.
  4. Add inline validation and follow the design package.
- **Acceptance criteria:**
  - AC-P3-1 (F1): Adding the subject "Biology" with a colour makes it appear in the subject list with that colour swatch, and it is still there after a reload.
  - AC-P3-2 (F1): Adding the exam "Cell Biology Final" for Biology dated today+12 shows it under Biology with the countdown "in 12 days".
  - AC-P3-3 (F1): Pasting "Cells\nGenetics\n\nEvolution" into quick-add and submitting creates exactly 3 topics, each with estimate 2 and difficulty medium. They appear without a page reload.
  - AC-P3-4 (F1): A topic's estimate can be edited to 4 and its difficulty to hard, and the changes persist after a reload. Deleting an exam after confirming removes the exam, its topics and its blocks. Cancelling the confirmation removes nothing.
  - AC-P3-5 (F1): Validation: an empty subject, exam or topic name shows an inline error and saves nothing. An exam date before today is rejected. An estimate outside 1–20 is rejected.
  - AC-P3-6 (F2): `/settings` shows `capacity-1`…`capacity-6` and `capacity-0` prefilled as Mon–Fri 6, Sat 8, Sun 4. Changing Wednesday to 3 and clicking `settings-save` shows a "Settings saved" toast, and the value is still 3 after a reload.
  - AC-P3-7 (F2): Focus, short-break and long-break lengths, long-break cadence, mode and daily goal save and persist. Out-of-range values (focus outside 5–120, short break outside 1–30, long break outside 5–60, cadence outside 2–8, goal outside 1–16) show inline errors and are not saved.
  - AC-P3-8 (F2): Adding a blackout date lists it, and it can be removed. Blackout dates before today cannot be added.

### P4: Planner UI: Today, Week, and block progress (owner: frontend-engineer)
- **Owns:** `src/features/planner/**`
- **Depends on:** P0
- **Features:** F4, F6
- **Tasks:**
  1. `/today`: show the date heading, "X / Y pomodoros planned" against today's capacity, and an ordered `today-block` queue. Each block shows the topic or title, a subject colour chip, a New/Review/Task badge, "n/m pomodoros", its status and a Covered badge. Add a `start-next` button (links to `/focus?blockId=`) and an empty state.
  2. `/week`: a 7-column Monday–Sunday grid (`week-day-<date>`) with prev/next week navigation and today highlighted, showing `block-card`s.
  3. Block menu: edit (pomodoros; title for tasks), move (date input, plus native HTML5 drag-and-drop between Week columns, which sets `pinned=true`), and delete with a confirm.
  4. Add-task form (title, date, pomodoros 1–8, optional subject) that creates `kind:'task', source:'manual'`.
  5. Completion actions: Done, Partial (choose completed 1…m−1, which sets status `partial`) and Skip. After a New block is marked Done, a "Topic check" dialog asks whether to mark the topic covered and for a confidence of 1–3, and writes both to the topic.
- **Acceptance criteria:**
  - AC-P4-1 (F4): With the Playwright clock fixed to a weekday, `/today` shows at least one `today-block`. Each one has a topic, a subject, a New/Review/Task badge and "0/n pomodoros". The manual task "Problem set 3" appears with a Task badge.
  - AC-P4-2 (F4): Clicking `start-next` goes to `/focus?blockId=<id of the first planned block>`, and the Focus page shows that block's topic. When every block today is done or skipped, Today shows the empty state "All done for today".
  - AC-P4-3 (F4): `/week` shows 7 `week-day-*` columns from Monday to Sunday of the current week with today highlighted. Next/Prev change the columns to the following or previous week.
  - AC-P4-4 (F4): Adding the task "Read chapter 4" (today+1, 2 pomodoros, Physics) shows it in that day's Week column with a Task badge, and it is still there after `replan-button` is clicked.
  - AC-P4-5 (F4): Moving an auto block to another date (with the Move date input, and separately by dragging it to another Week column) shows it in the new column after a reload, and it keeps that date after a replan. Editing a block's pomodoros to 1 persists. Deleting a block after confirming removes it.
  - AC-P4-6 (F6): Marking a block Done shows done styling with "m/m pomodoros". Partial with 1 shows "1/m" and a partial badge. Skip shows skipped styling and removes the block from the `start-next` target.
  - AC-P4-7 (F6): After a New block is marked Done, the Topic check dialog appears. Choosing "Covered" with confidence 3 shows the Covered badge on that topic's blocks and in Setup. Choosing "Not yet" leaves the topic uncovered.

### P5: Dashboard, stats, and data management (owner: frontend-engineer)
- **Owns:** `src/features/dashboard/**`, `src/features/data/**`
- **Depends on:** P0
- **Features:** F8, F9
- **Tasks:**
  1. Write `stats.ts` as pure functions:
     - `readiness(exam)` = round(100 × done ÷ (done + remaining)). Here done = Σ min(completed, pomodoros) over the exam's new and review blocks, and remaining = the unfinished pomodoros of planned or partial blocks dated today or later, plus the exam's overflow from `meta.plan`.
     - Focus minutes for today and for this week (Monday start), from focus sessions' `actualMinutes`.
     - A 7-day series by subject.
     - The streak: consecutive days, counting back from today (or from yesterday if today has not reached the goal yet), on which completed focus sessions ≥ `dailyGoalPomodoros`.
  2. Write Vitest tests for these functions.
  3. `/dashboard`: `exam-card`s for upcoming exams sorted by date (name, subject chip, "in N days", `readiness` %, "X/Y topics covered"), the `focus-today` and `focus-week` minute tiles, `focus-chart` (a Recharts stacked bar chart over the last 7 days, by subject, with a legend) and `streak-count`. Show an empty state when there are no exams.
  4. `/data`: `export-button` downloads `focusplan-backup-YYYY-MM-DD.json` with the shape `{app:'focusplan', version:1, exportedAt, subjects, exams, topics, blocks, sessions, settings}`. `import-input` validates the shape, asks for confirmation, and then replaces everything in one transaction. Also add `reset-demo` (`resetToDemo`) and `clear-all` (`clearAll`), both with confirmation.
- **Acceptance criteria:**
  - AC-P5-1 (F8): On a fresh seed, `/dashboard` shows 3 `exam-card`s in the order Organic Chemistry Quiz (in 7 days), Calculus Midterm (in 10 days), Mechanics Test (in 14 days). Each shows a `readiness` % between 0 and 100 and "X/Y topics covered" (Calculus 1/5, Mechanics 1/4, Chemistry 0/3).
  - AC-P5-2 (F8): Marking one of Calculus's planned blocks Done on Today raises the Calculus `readiness` % on the Dashboard.
  - AC-P5-3 (F8): On a fresh seed, `focus-week` equals 25 × (the number of seeded focus sessions dated this week) minutes, and `focus-today` is 0. After one 25-minute focus completes, `focus-today` shows 25.
  - AC-P5-4 (F8): `focus-chart` renders bars for 7 days ending today, with a legend naming Mathematics, Physics and Chemistry.
  - AC-P5-5 (F8): `streak-count` shows 5 on a fresh seed. It shows 6 after 4 focus sessions are completed today.
  - AC-P5-6 (F9): Clicking `export-button` downloads a file named `focusplan-backup-<today>.json`. It parses as JSON with `app === 'focusplan'` and `version === 1`, and it contains 3 subjects, 3 exams and 12 topics.
  - AC-P5-7 (F9): After `clear-all` (confirmed), Today shows an empty state that links to Setup and the Dashboard shows no exam cards. Importing the previously exported file (confirmed) restores 3 subjects, 3 exams and 12 topics. Importing a malformed file shows an error and changes nothing.
  - AC-P5-8 (F9): `reset-demo` (confirmed) restores the seed: 3 subjects, and a streak of 5.
  - AC-P5-9 (F9): During a full session (load, navigate every route, run the timer), the page makes no requests to any origin other than `localhost:5173`, and data created in Setup survives a browser reload.

## 6. Risks & mitigations
| Risk | Mitigation |
|---|---|
| The five wave-2 phases integrate only through contracts, so a mismatch may appear late | P0 freezes the signatures in §4.3 and ships working stubs, and implementers may only add exports. Every screen reads Dexie live, so phases never pass data to each other directly. QA runs after all phases have landed. |
| A replan deletes a block the timer is running against | Auto block ids are deterministic (`auto:<topicId>:<kind>:<n>`). P2 also captures the topic, exam and subject at start, and saves the session even if the block is gone. |
| Auto-replan loops or makes the UI flicker | `PlanSync` watches inputs only (not `blocks`), is debounced by 500 ms, and replans deterministically, so a second run produces no change. |
| Tests depend on the date or weekday | The seed is relative to today, Sunday capacity is 4 (not 0), and QA installs `page.clock` at a fixed weekday before loading. |
| The timer drifts in background tabs, or a refresh loses it | Remaining time is computed from the `endsAt` timestamp, the timer is persisted to localStorage and restored on load, and `visibilitychange` resyncs it. |
| Notification or audio permissions in headless tests | Degrade gracefully. QA stubs `window.Notification` and `AudioContext` through `addInitScript`. |
| A later phase needs a new npm dependency | P0 installs the full dependency set from §2 up front. Anything else is requested in the handoff (only P0 owns `package.json`). |
| The plan does not fit the available capacity | The overflow is surfaced in `overcapacity-banner`, with fixes (raise capacity, trim reviews) instead of silently dropping work. |
| IndexedDB is cleared by the browser | JSON export and import (F9). |

## 7. Definition of done
- Every must-have feature (F1–F9) passes its acceptance criteria in the QA Playwright tests
- `npm run build` and `npm run test:unit` pass with no errors
- The app builds with no errors and the docs are written
