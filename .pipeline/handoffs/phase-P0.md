# Handoff: P0 Foundation

> Owner: phase-engineer · Status: done · Round: build

## Features delivered
| Feature | Status | Notes |
|---|---|---|
| Scaffold (Vite 8 + React 19 + TS 6 + Tailwind 4 + React Router 7) | ✅ done | All deps from plan §2 installed. No later phase needs to touch `package.json` |
| F9 support: Dexie DB, repo helpers, demo seed | ✅ done | `seedIfEmpty`, `resetToDemo` and `clearAll` are implemented for real (not stubs) |
| App shell (Layout, NavBar, routes, bootstrap) | ✅ done | Seeds before the first render. `TimerProvider` wraps the router |
| Shared UI primitives | ✅ done | Button, Card, Badge + SubjectChip, Modal + ConfirmDialog, Field + Input/Select/Textarea, EmptyState, ToastProvider + useToast |
| Contract stubs (scheduler, planService, PlanSync, PlanStatusBar, timer, 7 pages) | ✅ done | Signatures frozen per master-plan §4.3. Stand-ins actually work (see below) |
| Playwright + Vitest config, smoke e2e | ✅ done | 5 smoke tests, 14 unit tests |

## Acceptance criteria self-check
| AC | Result | How verified |
|---|---|---|
| AC-P0-1 | pass | `npm run build` (clean: `rm -rf dist node_modules/.tmp`) exits 0, `tsc -b` reports no errors |
| AC-P0-2 | pass | smoke.spec "AC-P0-2": `/` goes to `/today`, all 7 `nav-*` labels are checked, each click changes the URL and sets `aria-current`, a `window.__spa` marker survives (so no full reload happened), and there are 0 console/page errors |
| AC-P0-3 | pass | smoke.spec "AC-P0-3" reads IndexedDB `focusplan`: 3 subjects, 3 exams, 12 topics, 1 settings row, and still 3 subjects/12 topics after reload. Unit test `seedIfEmpty seeds once and never duplicates` also covers it |
| AC-P0-4 | pass | smoke.spec "AC-P0-4": `page.goto('/week')` returns 200 and the app renders, including after a reload |
| AC-P0-5 | pass | `npx playwright test tests/e2e/smoke.spec.ts` gives 5 passed. `npm run test:unit` gives 14 passed, exit 0 |

## Files created / modified
All paths are under `app/`:
- `package.json`, `package-lock.json`: deps and scripts (`dev`, `build`, `lint`, `preview`, `test:unit`, `test:e2e`)
- `index.html` (title "FocusPlan"), `public/favicon.svg`
- `vite.config.ts`: React and Tailwind plugins, the `@` → `src` alias, port 5173 strict, Vitest `test` block (`src/**/*.test.ts`, node env)
- `tsconfig.json`, `tsconfig.app.json` (strict, `@/*` path alias, includes `src/`, so `*.test.ts` gets type-checked by `npm run build`), `tsconfig.node.json` (vite/playwright configs and `tests/**`)
- `playwright.config.ts`: Chromium, baseURL `http://localhost:5173`, webServer `npm run dev`, `reuseExistingServer: true`
- `.gitignore`, `.oxlintrc.json` (lint config from the Vite template. P0 owns the shared config)
- `src/main.tsx`: awaits `bootstrap()`, then renders `<App/>` in StrictMode
- `src/index.css`: Tailwind 4 `@import "tailwindcss"` and the `@theme` design tokens
- `src/vite-env.d.ts`
- `src/app/App.tsx` (TimerProvider → BrowserRouter → ToastProvider → routes, plus a storage-error banner), `routes.tsx`, `nav.ts` (NAV_ITEMS), `NavBar.tsx`, `Layout.tsx`, `bootstrap.ts`
- `src/types/index.ts`: every entity type
- `src/db/db.ts`, `settings.ts`, `repo.ts`, `seed.ts`, `index.ts` (barrel), `db.test.ts`
- `src/lib/dates.ts`, `ids.ts`, `format.ts`, `index.ts` (barrel), `dates.test.ts`
- `src/components/ui/Button.tsx`, `Card.tsx`, `Badge.tsx`, `Modal.tsx`, `Field.tsx`, `EmptyState.tsx`, `Toast.tsx`, `toastContext.ts`, `index.ts`
- Stubs (the owning phase replaces them): `src/logic/scheduler/index.ts`, `src/logic/scheduler/planService.ts` (P1), `src/features/plan-status/PlanSync.tsx`, `PlanStatusBar.tsx` (P1), `src/logic/timer/index.ts` (P2), `src/features/focus/FocusPage.tsx` (P2), `src/features/setup/SetupPage.tsx`, `src/features/settings/SettingsPage.tsx` (P3), `src/features/planner/TodayPage.tsx`, `WeekPage.tsx` (P4), `src/features/dashboard/DashboardPage.tsx`, `src/features/data/DataPage.tsx` (P5)
- `tests/e2e/smoke.spec.ts`

## How to run / use
From `app/`:
```
npm install && npx playwright install chromium
npm run dev          # vite --port 5173 --strictPort  ->  http://localhost:5173
npm run build        # tsc -b && vite build
npm run test:unit    # vitest run (src/**/*.test.ts, node env)
npm run lint         # oxlint
npx playwright test  # webServer starts `npm run dev` (reuses an existing server)
```
No env vars and no `.env` (the app is client-only with no secrets).

**Imports:** use the `@/` alias, e.g. `import { db, getSettings } from '@/db'`, `import { todayISO } from '@/lib'`, `import { Button } from '@/components/ui'`, `import type { Block } from '@/types'`.

### Routes
`/` → redirect `/today` · `/today` · `/week?start=YYYY-MM-DD` · `/focus?blockId=<id>` · `/setup` · `/settings` · `/dashboard` · `/data` · anything else shows "Page not found" inside the Layout. Pages read query params with `useSearchParams` from `react-router`. Nav test ids are `nav-today|week|focus|setup|settings|dashboard|data`, and the active link has `aria-current="page"`.

### Demo seed (`src/db/seed.ts`, relative to *today* at seeding time)
Rows use stable, readable ids exported as `SEED_IDS`:
- **Settings:** `dailyCapacity = [4,6,6,6,6,6,8]` (index 0 = Sunday, so Mon–Fri 6, Sat 8, Sun 4). Also focus 25, short 5, long 15, longBreakEvery 4, `classic`, dailyGoal 4, no blackouts, reviewOffsets `[1,3,7]`, sound and notifications on.
- **Subjects:** Mathematics `#6366f1` (`seed-subject-math`), Physics `#f59e0b` (`seed-subject-physics`), Chemistry `#10b981` (`seed-subject-chemistry`).
- **Exams:**
  - Organic Chemistry Quiz, Chemistry, today+7 (`seed-exam-organic-quiz`)
  - Calculus Midterm, Mathematics, today+10 (`seed-exam-calculus-midterm`)
  - Mechanics Test, Physics, today+14 (`seed-exam-mechanics-test`)
- **12 topics** (`seed-topic-<slug>`), all difficulty medium:
  - Math: Limits 2 (covered, conf 3), Derivatives 3, Chain Rule 2, Integration Basics 3, Applications of Derivatives 2
  - Physics: Kinematics 2 (covered, conf 2), Newton's Laws 2, Work & Energy 3, Momentum 2
  - Chemistry: Alkanes 2, Functional Groups 2, Isomerism 1
- **Blocks:**
  - `auto:seed-topic-limits:new:1`: done 2/2, today−3
  - `auto:seed-topic-kinematics:new:1`: done 2/2, today−2
  - **missed** planned `auto:seed-topic-derivatives:new:1` (2 pomodoros) and `auto:seed-topic-alkanes:new:1` (2 pomodoros), both at today−1
  - manual task `seed-task-problem-set-3` "Problem set 3" (Physics, 1 pomodoro, kind `task`, source `manual`), today
- **Sessions:** 20 focus sessions `seed-session-<daysAgo>-<n>`, 4 per day on today−5 … today−1 at 09:00/09:30/10:00/10:30 local time. Each is 25 min, completed, 1 pomodoro credited, spread across the subjects. Two on today−3 link to the Limits block and two on today−2 link to the Kinematics block. There are **no sessions today**, so the streak is **5** (goal 4).
- **Meta:** `{key:'plan', lastPlannedAt:null, overflow:[], lastCatchUp:null}` and `{key:'seed', seededAt, version:1}`.
- **Behaviour:** `seedIfEmpty()` does nothing once `meta.seed` exists. `clearAll()` wipes every table but writes back default settings, an empty `meta.plan` and the `meta.seed` marker, so **a reload after clear-all stays empty** (AC-P5-7). `resetToDemo()` wipes everything and re-seeds relative to today.

## Interfaces exposed to other phases

### `@/types` (src/types/index.ts)
`ISODate`, `ISODateTime`, `Subject`, `Exam`, `Topic` (`Difficulty`, `Confidence`), `Block` (`BlockKind`, `BlockStatus`, `BlockSource`), `FocusSession` (`SessionKind`), `Settings` (`TimerMode`), `OverflowItem`, `PlanMeta`, `SeedMeta`, `MetaRecord`. Fields follow master-plan §4.2 exactly. `OverflowItem` lives here, and `@/logic/scheduler` re-exports it.

### `@/db` (src/db/index.ts)
```ts
export const db: FocusPlanDB   // Dexie 'focusplan' v1: subjects, exams, topics, blocks, sessions, settings, meta
                               // indexes: subjects 'id, name' · exams 'id, subjectId, date' · topics 'id, examId'
                               // blocks 'id, date, examId, topicId, status' · sessions 'id, startedAt, blockId, subjectId'
                               // settings 'id' · meta 'key'
export const DB_NAME = 'focusplan'
export function allTables(): Table[]                 // for whole-DB transactions (P5 import)
export function getSettings(): Promise<Settings>     // missing row/fields filled from defaults; never throws on empty DB
export function saveSettings(patch: Partial<Settings>): Promise<void>  // merge + put
export const DEFAULT_SETTINGS: Readonly<Settings>; export function defaultSettings(): Settings; export const SETTINGS_ID = 'settings'
export function deleteExamCascade(id: string): Promise<void>     // exam + its topics + blocks with that examId/topicId; sessions kept
export function deleteSubjectCascade(id: string): Promise<void>  // subject + its exams (cascade) + all blocks with that subjectId (incl. manual tasks); sessions kept
export function getPlanMeta(): Promise<PlanMeta>     // meta.plan or an empty record
export function emptyPlanMeta(): PlanMeta
export function seedIfEmpty(): Promise<boolean>; export function resetToDemo(): Promise<void>; export function clearAll(): Promise<void>
export function buildDemoSeed(today?: ISODate, now?: Date): DemoSeed  // PURE: use it in unit tests (P1/P5)
export const SEED_IDS, SEED_VERSION
```
Reactive reads: `import { useLiveQuery } from 'dexie-react-hooks'`, e.g. `useLiveQuery(() => db.blocks.where('date').equals(today).sortBy('order'), [today])`.
Service tests in Node: put `import 'fake-indexeddb/auto'` first, then import `@/db` (see `src/db/db.test.ts`, which clears tables in `beforeEach`).

### `@/lib` (src/lib)
- **dates.ts:**
  - `todayISO(now?)`, `toISODate(d)`, `parseISODate(iso)`, `addDaysISO(iso, n)`
  - `weekdayOf(iso)`: 0 = Sun, which indexes `dailyCapacity`
  - `startOfWeekISO(iso)` (Monday), `weekDatesISO(iso)` (Mon..Sun), `daysBetween(a, b)` (b − a)
  - `isoDateOfTimestamp(ts)`: the local date of a session
  - constants `WEEKDAY_NAMES`, `WEEKDAY_SHORT`, `MONDAY_FIRST_WEEKDAYS = [1,2,3,4,5,6,0]` (the Settings display order)
- **ids.ts:** `newId()` (crypto.randomUUID), `autoBlockId(topicId, 'new'|'review', n)` → `auto:<topicId>:<kind>:<n>`.
- **format.ts:**
  - `formatMs(ms)` → `MM:SS`
  - `countdownLabel(date, today?)` → "in 12 days" / "today" / "tomorrow" / "N days ago"
  - `formatLongDate`, `formatShortDate`, `pomodoroProgress(c, t)` → "c/t pomodoros", `formatMinutes`
  - label maps `BLOCK_KIND_LABEL` (New/Review/Task), `BLOCK_STATUS_LABEL`, `PHASE_LABEL` (Focus/Short break/Long break)
  - `SUBJECT_COLOR_PRESETS` (8 hex values)

### `@/components/ui`
- `Button` {variant: primary|secondary|ghost|danger, size: sm|md|lg, ...button props}.
- `Card` (a div).
- `Badge` {tone: neutral|brand|success|warning|danger|info}.
- `SubjectChip` {name, color} (testid `subject-chip`).
- `Modal` {open, title, onClose, footer?, testId?='modal'}: Escape or backdrop closes it.
- `ConfirmDialog` {open, title, message?, confirmLabel?, cancelLabel?, danger?, onConfirm, onCancel}, with test ids `confirm-dialog`, `confirm-ok`, `confirm-cancel`.
- `Field` {label, error?, hint?, children: (p) => control}: a render prop that passes `id`/`aria-invalid`/`aria-describedby`. Errors render as `role=alert data-testid=field-error`.
- `Input`, `Select`, `Textarea`.
- `EmptyState` {title, description?, action?, testId?='empty-state'}.
- `ToastProvider` (already mounted in App) and `useToast().show(message, tone?='success', durationMs?=3000)`, which renders `role=status data-testid=toast`.

### Contract stubs (the signatures are frozen: implement the bodies, and add exports only)
- **`@/logic/scheduler` (P1):** `PlanInput`, `PlanResult`, `OverflowItem` (re-export), `generatePlan(input)`. The **stand-in** keeps done/partial/skipped/pinned/manual blocks, removes the other planned auto blocks, and places `new` blocks (≤2 pomodoros, capacity- and blackout-aware, by exam−2, EDF order) with deterministic ids. It adds no reviews and no round-robin.
- **`@/logic/scheduler/planService` (P1):** `PlanSummary`, `replan(opts?)`, `catchUpOnOpen()`. The stand-in runs one Dexie transaction, counts past-due planned auto blocks as `movedCount`, writes `meta.plan` and records `lastCatchUp` on catch-up. It already moves the seed's 2 missed blocks to today or later (verified by the smoke test).
- **`PlanSync` / `PlanStatusBar` (P1):** default exports with no props, mounted in `Layout` (PlanSync first, then PlanStatusBar above `<Outlet/>` inside `<main>`). The stand-in PlanSync runs `catchUpOnOpen()` once (a module-level guard handles StrictMode). **It does NOT auto-replan yet.** P1 must add the debounced 500 ms live-query replan on subjects/exams/topics/settings, because the user confirmed auto-replan is ON. The stand-in PlanStatusBar renders only `replan-button`.
- **`@/logic/timer` (P2):** `TimerPhase`, `TimerSnapshot`, `TimerApi`, `TimerProvider({children}): JSX.Element`, `useTimer(): TimerApi`. The stand-in returns an idle 25:00 focus with no-op actions. `TimerProvider` wraps `BrowserRouter` in `App.tsx`, so **P2's provider cannot use router hooks** (read `?blockId` in FocusPage and pass it to `start(blockId)`). The file is `.ts`: P2 can move the implementation into `.tsx` modules inside `src/logic/timer/` and re-export them from `index.ts`.
- **Pages** (default export, render an `<h1>`): `TodayPage`, `WeekPage` (P4), `FocusPage` (P2), `SetupPage`, `SettingsPage` (P3), `DashboardPage`, `DataPage` (P5). Keep the default export and file path, because `src/app/routes.tsx` imports them. Keep an `<h1>` on each page, since the smoke test checks for a level-1 heading.

### Design tokens (`src/index.css`, Tailwind 4 `@theme`)
- **Colours:**
  - surfaces and text: `canvas`, `surface`, `surface-2`, `line`, `ink`, `ink-muted`
  - brand: `brand`, `brand-strong`, `brand-soft`, `on-brand`, `ring`
  - status: `success`/`warning`/`danger`/`info`, each with a `-soft` variant
  - timer phases: `phase-focus`, `phase-short`, `phase-long`
- **Radii:** `rounded-card`, `rounded-control`.
- **Shadows:** `shadow-card`, `shadow-overlay`.
- **Fonts:** `font-sans`, `font-mono` (system stack only: no web-font request, because of AC-P5-9).

Use them as utilities (`bg-surface text-ink-muted border-line bg-brand text-on-brand`). The **values are placeholders**, because `.pipeline/design/` was empty when P0 ran. The token **names** are the contract: the designer's values should be mapped onto these names.

## Verification output
```
> npm run build  (after rm -rf dist node_modules/.tmp)
> tsc -b && vite build
✓ 361 modules transformed.
dist/index.html                   0.57 kB │ gzip:   0.35 kB
dist/assets/index-BosqNK2L.css   14.81 kB │ gzip:   3.91 kB
dist/assets/index-9BTO0swj.js   390.89 kB │ gzip: 124.69 kB
✓ built in 319ms

> npm run test:unit
 RUN  v5.0.1
 Test Files  2 passed (2)
      Tests  14 passed (14)

> npx playwright test tests/e2e/smoke.spec.ts
Running 5 tests using 5 workers
  ok replan-button is present in the shell
  ok catch-up on open leaves no planned block before today and plans work
  ok AC-P0-4: deep link to /week renders the app
  ok AC-P0-3: first load seeds the demo exactly once
  ok AC-P0-2: / redirects to /today and nav switches routes client-side without errors
  5 passed (7.0s)

> npm run lint
> oxlint        (0 warnings, 0 errors)
```

## Open questions / cross-phase requests
- **`src/index.css` belongs to P0.** Frontend phases (P2–P5) must not edit it. If they need a new token or a changed value, they should request it in their handoff and the manager will route it to P0. The designer's final token values also need a P0 fix-round (or manager edit) to apply to `@theme`, because `.pipeline/design/` was empty during P0.
- **Versions installed** (current at build time, newer than the plan text in some cases):
  - runtime: react 19.2, react-router 7.18, dexie 4.4, dexie-react-hooks 4.4, date-fns 4.4, recharts 3.10, clsx 2.1
  - tooling: vite 8.3, typescript 6.0, tailwindcss 4.3, **vitest 5.0**, @playwright/test 1.63, fake-indexeddb 6.2, oxlint 1.81
  - **Not installed:** jsdom and @testing-library. Unit tests run in the **node** environment only, as the plan says. Anyone who needs DOM component tests must request those packages.
- **Unit tests are type-checked by `npm run build`**, because `tsconfig.app.json` includes all of `src/`. Tests must compile under the browser type set (`vite/client`, DOM, no `@types/node` globals).
- **P1:** the seed's missed blocks reuse the deterministic ids `auto:<topicId>:new:1`. They get deleted and regenerated (same id pattern) at today or later. Kept history blocks also use `auto:<topicId>:new:1` (Limits, Kinematics), so id numbering has to skip ids that are already kept (the stand-in does this).
- **P1:** `movedCount` in the stand-in counts every planned, unpinned auto block dated before today, which is 2 on a fresh seed. That matches AC-P1-6's "Moved 2 missed blocks".
- **P2:** `TimerProvider` sits outside `BrowserRouter` (master-plan §4.1 order), so it cannot use router hooks there.
- **P5:** for import, use `db.transaction('rw', allTables(), ...)`. For readiness overflow, use `getPlanMeta()`.
- **Git:** the git repo is at the project root. `app/.gitignore` excludes `node_modules`, `dist`, `test-results` and `playwright-report`. Nothing was committed.

## Fix log (bug-fix rounds only)
| Bug ID | Root cause | Fix | Files |
|---|---|---|---|
