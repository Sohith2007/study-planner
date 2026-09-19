# Handoff: P0 Foundation

> Owner: phase-engineer · Status: done · Round: fix-round-2 (wave-2 cross-phase requests)

## Features delivered
| Feature | Status | Notes |
|---|---|---|
| Scaffold (Vite 8 + React 19 + TS 6 + Tailwind 4 + React Router 7) | ✅ done | All deps from plan §2 installed. No later phase needs to touch `package.json` |
| F9 support: Dexie DB, repo helpers, demo seed | ✅ done | `seedIfEmpty`, `resetToDemo` and `clearAll` are implemented for real (not stubs) |
| App shell (Layout, NavBar, routes, bootstrap) | ✅ done | Seeds before the first render. `TimerProvider` wraps the router |
| Shared UI primitives | ✅ done | Styled to the design system: Button, Card + CardHeader, Badge + SubjectChip + PomodoroPips, Modal + ConfirmDialog, Field + Input/Select/Textarea/Switch/SegmentedControl, EmptyState, Skeleton/LoadingBlock/PageError/ProgressBar, Toast, Icon |
| Design package (fix-round-1) | ✅ done | Tokens from tokens.json including dark mode, self-hosted fonts, app-shell.md shell (nav-home, nav-timer, skip link, error boundary, status bar hidden on /focus) |
| Contract stubs (scheduler, planService, PlanSync, PlanStatusBar, timer, 7 pages) | ✅ done | Signatures frozen per master-plan §4.3. Stand-ins actually work (see below) |
| Playwright + Vitest config, smoke e2e | ✅ done | 10 smoke tests. The whole suite has 165 unit tests across all phases (15 of them P0's) |

## Acceptance criteria self-check
| AC | Result | How verified |
|---|---|---|
| AC-P0-1 | pass | `npm run build` (clean: `rm -rf dist node_modules/.tmp`) exits 0, `tsc -b` reports no errors |
| AC-P0-2 | pass | smoke.spec "AC-P0-2": `/` goes to `/today`, all 7 `nav-*` labels are checked, each click changes the URL and sets `aria-current`, a `window.__spa` marker survives (so no full reload happened), and there are 0 console/page errors |
| AC-P0-3 | pass | smoke.spec "AC-P0-3" reads IndexedDB `focusplan`: 3 subjects, 3 exams, 12 topics, 1 settings row, and still 3 subjects/12 topics after reload. Unit test `seedIfEmpty seeds once and never duplicates` also covers it |
| AC-P0-4 | pass | smoke.spec "AC-P0-4": `page.goto('/week')` returns 200 and the app renders, including after a reload |
| AC-P0-5 | pass | `npx playwright test tests/e2e/smoke.spec.ts` gives 10 passed. `npm run test:unit` gives 165 passed (whole app), exit 0 |

## Files created / modified
All paths are under `app/`:
- `package.json`, `package-lock.json`: deps and scripts (`dev`, `build`, `lint`, `preview`, `test:unit`, `test:e2e`)
- `index.html` (title "FocusPlan"), `public/favicon.svg`, `public/fonts/` (5 woff2 files + 3 OFL licence files)
- `vite.config.ts`: React and Tailwind plugins, the `@` → `src` alias, port 5173 strict, Vitest `test` block (`src/**/*.test.ts`, node env)
- `tsconfig.json`, `tsconfig.app.json` (strict, `@/*` path alias, includes `src/`, so `*.test.ts` gets type-checked by `npm run build`), `tsconfig.node.json` (vite/playwright configs and `tests/**`)
- `playwright.config.ts`: Chromium, baseURL `http://localhost:5173`, webServer `npm run dev`, `reuseExistingServer: true`
- `.gitignore`, `.oxlintrc.json` (lint config from the Vite template. P0 owns the shared config)
- `src/main.tsx`: calls `initTheme()`, awaits `bootstrap()`, then renders `<App/>` in StrictMode
- `src/index.css`: Tailwind 4, `@font-face`, the `--fp-*` light and dark variables, `@theme inline` tokens and the shared utilities
- `src/vite-env.d.ts`
- `src/app/App.tsx` (ToastProvider → TimerProvider → BrowserRouter → routes, plus a storage-error banner), `routes.tsx`, `nav.ts` (NAV_ITEMS), `NavBar.tsx` (plus `NavTimerPill`), `Layout.tsx`, `ErrorBoundary.tsx`, `theme.ts`, `bootstrap.ts`
- `src/types/index.ts`: every entity type
- `src/db/db.ts`, `settings.ts`, `repo.ts`, `seed.ts`, `index.ts` (barrel), `db.test.ts`
- `src/lib/dates.ts`, `ids.ts`, `format.ts`, `index.ts` (barrel), `dates.test.ts`
- `src/components/ui/Button.tsx`, `Card.tsx`, `Badge.tsx`, `Modal.tsx`, `Field.tsx`, `EmptyState.tsx`, `Feedback.tsx`, `Toast.tsx`, `toastContext.ts`, `buttonStyles.ts`, `icons.tsx`, `index.ts`
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
`/` → redirect `/today` · `/today` · `/week?start=YYYY-MM-DD` · `/focus?blockId=<id>` · `/setup` · `/settings` · `/dashboard` · `/data` · any unknown path redirects to `/today`. Pages read query params with `useSearchParams` from `react-router`. Nav test ids are `nav-home` (wordmark), `nav-today|week|focus|setup|settings|dashboard|data` and `nav-timer` (running-timer pill). The active link has `aria-current="page"`. `plan-status` and `replan-button` are not rendered on `/focus`.

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
  - `formatLongDate` ("Saturday, 19 September 2026"), `formatShortDate` ("Sat 19 Sep"), `pomodoroProgress(c, t)` → "c/t pomodoros", `formatMinutes`
  - label maps `BLOCK_KIND_LABEL` (New/Review/Task), `BLOCK_STATUS_LABEL`, `PHASE_LABEL` (Focus/Short break/Long break)
  - `SUBJECT_COLOR_PRESETS`: 8 `{key, name, value}` objects from tokens.json (Indigo `#6366F1`, Amber, Emerald, Rose, Sky, Violet, Orange, Slate). The seed subjects use the first three values exactly.

### `@/components/ui` (restyled to design-system §4 in fix-round-1)
- **`Button`** {variant, size, loading?, ...button props}.
  - variants: `primary` (default) | `accent` (only `timer-start`/`timer-resume` on /focus) | `secondary` | `ghost` | `danger` | `danger-ghost`
  - sizes: `sm` h-9 | `md` h-11 (default) | `lg` h-14 | `icon` size-11 (pass `aria-label`)
  - `loading` disables the button and sets `aria-busy`. Pass the loading label yourself, e.g. `{saving ? 'Saving…' : 'Save'}`.
- **`buttonClasses(variant?, size?, className?)`** styles a router `<Link>` as a button.
- **`Card`** {variant?: `default` | `interactive` | `sunken` | `danger-zone` | `hero`}. **`CardHeader`** {title, eyebrow?, actions?, as?: 'h2'|'h3'}.
- **`Badge`** {variant?}.
  - Semantic variants with default text: `new`, `review`, `task`, `done` (check icon), `partial`, `skipped`, `covered` (check icon), `pinned` (pin icon).
  - Tone variants: `neutral` (default), `primary`, `success`, `warning`, `danger`, `break`, `accent`.
  - Pass children to override the text, and put your own `data-testid` on it, e.g. `<Badge variant="covered" data-testid="block-covered" />`.
- **`SubjectChip`** {name, color, testId?='subject-chip'}.
- **`PomodoroPips`** {completed, total}: decorative (`aria-hidden`), max 8 then "+N". Always render the `n/m pomodoros` text beside it.
- **`Modal`** {open, title, onClose, footer?, dismissible?=true, testId?='modal'}.
  - Bottom sheet at 375, centred from md, `aria-labelledby` title.
  - Focus goes to `[data-autofocus]` or the first field. Tab is trapped, Esc closes, and focus returns to the trigger on close.
  - `dismissible={false}` stops backdrop clicks closing it (for forms with unsaved input).
  - In `footer`, put the Cancel button first.
- **`ConfirmDialog`** {open, title, message?, confirmLabel?, cancelLabel?, danger?=**true**, busy?, onConfirm, onCancel}.
  - Test ids: `confirm-dialog`, `confirm-ok`, `confirm-cancel`. Cancel gets initial focus.
- **`Field`** {label, error?, hint?, testId?, children: (p) => control}: a render prop that spreads `id`, `aria-invalid`, `aria-describedby` and (when `testId` is set) `data-testid` onto the control.
  - The error renders as `<p role="alert" data-testid="<testId>-error">` (or `field-error` with no testId), matching the design's `<field-testid>-error` convention.
- **Controls:**
  - `Input`: h-11. `type="number"` right-aligns with tabular-nums.
  - `Select`: has a chevron and is wrapped in a `relative` div.
  - `Textarea`: mono, `min-h-32`.
  - **`Switch`** {checked, onChange, label, disabled?, testId?}: `role=switch`.
  - **`SegmentedControl`** {value, options: {value,label,testId?}[], onChange, label, testId?}: a radiogroup where the arrow keys move the selection.
- **`EmptyState`** {title, description?, action?, secondaryAction?, illustration?: 'notebook'|'done'|'calendar', testId?='empty-state'}. Pass the screen's `*-empty` test id.
- **Feedback components:**
  - `Skeleton` {className} and `LoadingBlock` {testId (`<page>-loading`), children}.
  - `PageError` {onReload?}: `page-error` / `error-reload`, with the design copy.
  - `ProgressBar` {value, label, kind?: 'default'|'burn', tone?: 'focus'|'break', testId?}: `role=progressbar`.
- **`ToastProvider`** is mounted in App (outermost). **`useToast().show(message, tone?='success', options?: number | ToastOptions)`**, where `ToastOptions = { durationMs?, action?: { label, onClick, testId?='toast-undo' } }` (fix-round-2):
  - The default duration is 4 s, or 6 s when there is an action. `error` lasts 8 s, uses `role=alert` and has a close button.
  - At most 3 show at once. `data-testid="toast"` and `data-tone`.
  - The inverted ink style comes from the design.
- **`Icon`**: an inline SVG set with `Icon.Check`, `X`, `Alert`, `Info`, `Refresh`, `Play`, `Pause`, `Pin`, `ChevronDown/Left/Right`, `More`, `Plus`, `Trash`, `Download`, `Upload`, `Lock`, `Notebook`, `Calendar`. All are `aria-hidden` and default to `size-4`.

### App shell (src/app, P0)
- **Structure:** a skip link ("Skip to content" → `#main`), then `NavBar`, then `PlanSync`, then `PlanStatusBar` (hidden on `/focus`), then `<main id="main" class="mx-auto w-full px-4 md:px-6 xl:px-8 py-6 md:py-8">` wrapped in a page error boundary (`page-error`).
  - **Pages set their own max width:** `mx-auto w-full max-w-page` (Today, Week, Dashboard), `max-w-form` (Setup, Settings, Data) or `max-w-focus` (Focus).
  - **Page `<h1>`:** use `className="page-title"`. On route change, Layout scrolls to the top and focuses `#main h1` (adding `tabindex=-1`).
- **NavBar:**
  - Layout by width: at 375 and 768 it is two rows (the wordmark and timer pill, then a scrolling link strip). At xl it is a single row.
  - Each link exists in the DOM **exactly once** at every width (tested at 375).
  - **`nav-timer` is implemented in P0** (`NavTimerPill`) using only the public `useTimer()` contract. It shows when `status !== 'idle'` and the route is not `/focus`.
    - Text: `MM:SS · <Phase>` or `Paused · MM:SS`. It shows `elapsedMs` for a flowtime focus, otherwise `remainingMs`.
    - Colours: accent while in focus, `break` during breaks. It links to `/focus?blockId=<timer.blockId>`.
    - **P2 needs no shell changes.** The pill stays hidden with the idle stub.
- **Dark mode:** `src/app/theme.ts` `initTheme()` toggles `.dark` on `<html>` from `prefers-color-scheme` and follows live changes. It is called in `main.tsx` before bootstrap. There is no toggle UI.

### Contract stubs (the signatures are frozen: implement the bodies, and add exports only)
- **`@/logic/scheduler` (P1):** `PlanInput`, `PlanResult`, `OverflowItem` (re-export), `generatePlan(input)`. The **stand-in** keeps done/partial/skipped/pinned/manual blocks, removes the other planned auto blocks, and places `new` blocks (≤2 pomodoros, capacity- and blackout-aware, by exam−2, EDF order) with deterministic ids. It adds no reviews and no round-robin.
- **`@/logic/scheduler/planService` (P1):** `PlanSummary`, `replan(opts?)`, `catchUpOnOpen()`. The stand-in runs one Dexie transaction, counts past-due planned auto blocks as `movedCount`, writes `meta.plan` and records `lastCatchUp` on catch-up. It already moves the seed's 2 missed blocks to today or later (verified by the smoke test).
- **`PlanSync` / `PlanStatusBar` (P1):** default exports with no props, mounted in `Layout` (PlanSync, then PlanStatusBar between the header and `<main>`; Layout does **not** render PlanStatusBar on `/focus`). PlanStatusBar supplies its own wrapper (`mx-auto w-full max-w-page px-4 md:px-6 xl:px-8 pt-3 flex flex-col gap-2`, see the stub). The stand-in PlanSync runs `catchUpOnOpen()` once (a module-level guard handles StrictMode). **It does NOT auto-replan yet.** P1 must add the debounced 500 ms live-query replan on subjects/exams/topics/settings, because the user confirmed auto-replan is ON. The stand-in PlanStatusBar renders the `plan-status` row with `replan-button` (loading label `Replanning…`, toast `Plan rebuilt`).
- **`@/logic/timer` (P2):** `TimerPhase`, `TimerSnapshot`, `TimerApi`, `TimerProvider({children}): JSX.Element`, `useTimer(): TimerApi`. The stand-in returns an idle 25:00 focus with no-op actions. `TimerProvider` wraps `BrowserRouter` in `App.tsx` (and sits inside `ToastProvider`, so it **can** call `useToast()`), so **P2's provider cannot use router hooks** (read `?blockId` in FocusPage and pass it to `start(blockId)`). The file is `.ts`: P2 can move the implementation into `.tsx` modules inside `src/logic/timer/` and re-export them from `index.ts`.
- **Pages** (default export, render an `<h1>`): `TodayPage`, `WeekPage` (P4), `FocusPage` (P2), `SetupPage`, `SettingsPage` (P3), `DashboardPage`, `DataPage` (P5). Keep the default export and file path, because `src/app/routes.tsx` imports them. Keep an `<h1>` on each page, since the smoke test checks for a level-1 heading.

### Design tokens (`src/index.css`: real "Paper & Ink" values from `.pipeline/design/tokens.json`)
Colours are `--fp-*` variables on `:root` and `.dark`, exposed as Tailwind utilities through `@theme inline`, so **never use `dark:` variants**: every colour swaps automatically.

- **Colours:**
  - surfaces and text: `bg`, `surface`, `sunken`, `text`, `muted`, `border`, `border-strong`
  - primary: `primary`, `primary-hover`, `primary-soft`, `on-primary`
  - accent (tomato; Focus phase only): `accent`, `accent-hover`, `accent-soft`, `on-accent`
  - status: `success`/`-soft`, `warning`/`-soft`, `danger`/`-hover`/`-soft`
  - breaks: `break`/`-soft`
  - other: `overlay`, `chart-unlinked`
  - Examples: `bg-bg`, `bg-surface`, `text-text`, `text-muted`, `border-border`, `border-border-strong`, `bg-primary text-on-primary`, `bg-break-soft text-break`.
  - For Recharts or inline styles use the CSS variables, e.g. `var(--fp-chart-unlinked)`, `var(--fp-primary)`.
- **Fonts:** `font-display` (Fraunces), `font-sans` (Instrument Sans, the body default), `font-mono` (IBM Plex Mono 300/400/500). They are **self-hosted** in `app/public/fonts/*.woff2` (Fontsource latin subsets, OFL-1.1, licence files alongside) and make no requests to other origins (tested).
- **Type scale:** `text-caption`, `text-small`, `text-body`, `text-lead`, `text-heading`, `text-title`, `text-display`, `text-stat`, `text-timer`.
- **Radii:** `rounded-sm` 6, `rounded-md` 10, `rounded-lg` 16, `rounded-xl` 24, `rounded-full`. These override Tailwind's defaults.
- **Shadows:** `shadow-card`, `shadow-raised`, `shadow-overlay`.
- **Easing:** `ease-standard`, `ease-exit`, `ease-calm`.
- **Containers:** `max-w-page` 72rem, `max-w-form` 48rem, `max-w-focus` 40rem, `max-w-dialog` 30rem.
- **z-index:** nav `z-30`, overlay `z-50`, toast `z-60`. Use `z-20` for the status bar and `z-40` for menus.
- **Shared utilities:**
  - `timer-display`: the Focus countdown (mono, 300 weight, `--text-timer`, tabular, −0.02em tracking)
  - `tabular`
  - `eyebrow`: the uppercase caption label
  - `page-title`: the h1, `font-display text-title md:text-display font-semibold`
  - `no-scrollbar`, `fade-x`

## Verification output
Fix-round-2, run from `app/`, with every phase's code present:
```
> npm run build
> tsc -b && vite build
✓ 977 modules transformed.
dist/index.html                           1.08 kB │ gzip:   0.50 kB
dist/assets/index-Bxpou5Dx.css           40.67 kB │ gzip:   8.65 kB
dist/assets/TodayPage-*.js                6.95 kB   (and one chunk per page, 10-30 kB each)
dist/assets/FocusChart-*.js             360.11 kB │ gzip: 104.37 kB   (recharts, now split out)
dist/assets/index-*.js                  407.40 kB │ gzip: 130.82 kB   (was 553 kB, so the >500 kB warning is gone)
✓ built in 6.67s

> npm run test:unit
 Test Files  12 passed (12)
      Tests  165 passed (165)

> npm run lint
> oxlint        (0 warnings, 0 errors)

> npx playwright test tests/e2e/smoke.spec.ts
  10 passed (7.8s)   (AC-P0-2/3/4, shell at 375, /focus shell, tokens and dark mode, replan, catch-up,
                      fonts 200 for IBM Plex Mono 300/400/500, h1 focused after a lazy route change)
```
The toast action was also checked in a real browser with a temporary probe (since removed):
- `toast-undo` renders "Undo", and clicking it runs `onClick` once and dismisses the toast.
- A custom `testId` works, and an async `onClick` that throws is caught and logged.
- Plain and numeric-duration calls still work.

## Open questions / cross-phase requests
- **`src/index.css` belongs to P0.** Frontend phases (P2–P5) must not edit it. If they need a new token, value or shared utility, they should request it in their handoff and the manager will route it to P0. The design package tokens were applied in fix-round-1.
- **Versions installed** (current at build time, newer than the plan text in some cases):
  - runtime: react 19.2, react-router 7.18, dexie 4.4, dexie-react-hooks 4.4, date-fns 4.4, recharts 3.10, clsx 2.1
  - tooling: vite 8.3, typescript 6.0, tailwindcss 4.3, **vitest 5.0**, @playwright/test 1.63, fake-indexeddb 6.2, oxlint 1.81
  - **Not installed:** jsdom and @testing-library. Unit tests run in the **node** environment only, as the plan says. Anyone who needs DOM component tests must request those packages.
- **Unit tests are type-checked by `npm run build`**, because `tsconfig.app.json` includes all of `src/`. Tests must compile under the browser type set (`vite/client`, DOM, no `@types/node` globals).
- **P1:** the seed's missed blocks reuse the deterministic ids `auto:<topicId>:new:1`. They get deleted and regenerated (same id pattern) at today or later. Kept history blocks also use `auto:<topicId>:new:1` (Limits, Kinematics), so id numbering has to skip ids that are already kept (the stand-in does this).
- **P1:** `movedCount` in the stand-in counts every planned, unpinned auto block dated before today, which is 2 on a fresh seed. That matches AC-P1-6's "Moved 2 missed blocks".
- **P2:** `TimerProvider` sits outside `BrowserRouter` (master-plan §4.1 order), so it cannot use router hooks there. Since fix-round-2 it sits inside `ToastProvider`, so it can call `useToast()` directly on any route.
- **P5:** for import, use `db.transaction('rw', allTables(), ...)`. For readiness overflow, use `getPlanMeta()`.
- **Git:** the git repo is at the project root. `app/.gitignore` excludes `node_modules`, `dist`, `test-results` and `playwright-report`. Nothing was committed.

## Fix log (bug-fix rounds only)
| Bug ID | Root cause | Fix | Files |
|---|---|---|---|
| FR1-tokens | P0 shipped placeholder tokens before the design package existed | Applied tokens.json. **Token names changed; the old ones are removed:** `canvas`→`bg`, `ink`→`text`, `ink-muted`→`muted`, `line`→`border`, `surface-2`→`sunken`, `brand`→`primary`, `brand-strong`→`primary-hover`, `brand-soft`→`primary-soft`, `on-brand`→`on-primary`, `info`→`break`, `phase-focus`→`accent`, `phase-short`/`phase-long`→`break`, `rounded-card`→`rounded-lg`, `rounded-control`→`rounded-md`. New tokens: the `border-strong`, `accent*` and `danger-hover` colours, `overlay`, `chart-unlinked`, `shadow-raised`, the type scale, the containers and the easings. Dark mode follows the system via `.dark` | `app/src/index.css`, `app/src/app/theme.ts`, `app/src/main.tsx` |
| FR1-fonts | The fonts were system stacks only | Self-hosted Fraunces (variable), Instrument Sans (variable) and IBM Plex Mono 300/400/500 as woff2 (latin subset from Fontsource via `npm pack`, OFL-1.1), with `@font-face` rules as in tokens.json. An e2e test asserts there are no requests to other origins | `app/public/fonts/*`, `app/src/index.css` |
| FR1-clearAll | Already correct: `clearAll()` writes the `meta.seed` marker | Added a unit test that closes and reopens the database and runs `seedIfEmpty()` again. It stays empty after the reopen, while `resetToDemo()` still re-seeds | `app/src/db/db.test.ts` |
| FR1-shell | The shell predated screens/app-shell.md | Added `nav-home`, the `nav-timer` pill (via the `useTimer()` contract), a skip link, `<main id="main">`, focus on the h1 at route change, a page error boundary (`page-error`), PlanStatusBar hidden on `/focus`, and unknown routes redirecting to `/today` (it was a Not found page). Links render once at every width. The route-change focus uses a previous-path ref so StrictMode doesn't focus the h1 on load | `app/src/app/{NavBar,Layout,ErrorBoundary,routes}.tsx`, `app/src/features/plan-status/PlanStatusBar.tsx` (stub) |
| FR1-ui | The primitives used the placeholder look | Restyled to design-system §4 (see the API changes below) and added `CardHeader`, `PomodoroPips`, `Switch`, `SegmentedControl`, `Skeleton`, `LoadingBlock`, `PageError`, `ProgressBar`, `Icon` and `buttonClasses` | `app/src/components/ui/*` |
| FR1-misc | The data didn't match the design | `SUBJECT_COLOR_PRESETS` is now 8 `{key,name,value}` objects (was a string array). The seed colours are uppercased to match the presets exactly. `formatLongDate` now includes the year. Page stubs use `page-title` | `app/src/lib/format.ts`, `app/src/db/seed.ts`, `app/src/features/*/*Page.tsx` (stubs) |

**Component API changes that the frontend phases depend on:**
- **Badge:** the `tone` prop is replaced by `variant`. `brand` is now `primary` and `info` is now `break`, and the semantic variants have default text.
- **Button:** gains the `accent` and `danger-ghost` variants, the `icon` size, and the `loading` prop. The default height is now h-11.
- **ConfirmDialog:** `danger` now defaults to **true**. Pass `danger={false}` for a non-destructive confirm.
- **Field:** new `testId` prop. With it, the error test id is `<testId>-error`.
- **Modal:** new `dismissible` prop, and `title` accepts a ReactNode.
- **Toast:** the default is now 4 s (errors 8 s), with at most 3 shown and a `data-tone` attribute.
- **EmptyState:** new `illustration` and `secondaryAction` props.
- **Card:** new `variant` prop.
- **SubjectChip:** new `testId` prop.
- **Pages must set their own max width**, because `<main>` no longer constrains it.

### Fix-round-2 (wave-2 cross-phase requests)
| Bug ID | Root cause | Fix | Files |
|---|---|---|---|
| FR2-toast-action (P4) | `useToast().show` had no action slot, so there was no way to offer Undo after Skip | Added `ToastOptions` and `ToastAction` (see the API below). The action renders as a button (`data-testid="toast-undo"` by default). Clicking it dismisses the toast and then runs `onClick`; async errors are caught and logged. Old calls `show(msg)`, `show(msg, tone)` and `show(msg, tone, ms)` behave as before | `app/src/components/ui/toastContext.ts`, `Toast.tsx`, `index.ts` |
| FR2-provider-order (P2) | `TimerProvider` sat outside `ToastProvider`, so `useToast()` was unavailable inside the timer provider and save-error toasts only showed where `FocusPage` was mounted | New order: `ToastProvider → TimerProvider → BrowserRouter → routes`. The toast viewport is still rendered once, by `ToastProvider`. The timer stays outside the router | `app/src/app/App.tsx` |
| FR2-mono-font (P4) | **No mismatch found.** The `@font-face` family `'IBM Plex Mono'` equals `--font-mono`'s first family, all 3 woff2 files return 200 `font/woff2`, and `document.fonts` shows 300/400/500 `loaded`. The fallback in the screenshots was a first-paint effect: `font-display: swap` plus fonts being fetched lazily on first use, so an immediate screenshot catches the fallback | Added `<link rel="preload" as="font" crossorigin>` for Instrument Sans, Fraunces and IBM Plex Mono Regular in `index.html`, so first paint uses them. Added an e2e test for the 200 responses and loaded faces. **QA tip:** before screenshots, `await page.evaluate(() => document.fonts.ready)`. Light (300, timer) and Medium are not preloaded, to avoid unused-preload warnings on other routes | `app/index.html`, `app/tests/e2e/smoke.spec.ts` |
| FR2-lazy-routes (P5, optional) | A single 553 kB bundle triggered the >500 kB warning | The 7 pages use `React.lazy`. `Layout` wraps `<Outlet/>` in `<Suspense fallback={<PageFallback/>}>` inside the page error boundary; the fallback is `LoadingBlock testId="page-loading"` plus skeletons. Route-change focus now waits (a MutationObserver, up to 3 s) for the lazily rendered `<h1>`, and re-focuses it only if a page swaps its h1 (for example loading, then loaded) while focus has dropped to `<body>`. It never steals user focus. Covered by a new e2e test | `app/src/app/routes.tsx`, `app/src/app/Layout.tsx` |

**Toast action API (exact)**, exported from `@/components/ui`:
```ts
export type ToastTone = 'success' | 'error' | 'info'
export interface ToastAction {
  label: string                          // button text, e.g. 'Undo'
  onClick: () => void | Promise<void>    // runs after the toast is dismissed; rejections are caught + console.error
  testId?: string                        // default 'toast-undo'
}
export interface ToastOptions {
  durationMs?: number                    // default 4000; 6000 when `action` is set; 8000 for tone 'error'
  action?: ToastAction
}
export interface ToastApi {
  show(message: string, tone?: ToastTone, options?: number | ToastOptions): void   // number = durationMs (legacy)
}
// P4 usage, Undo after Skip:
toast.show(`Skipped ${title}`, 'success', { action: { label: 'Undo', onClick: () => undoSkip(block.id) } })
```
Other behaviour:
- The toast pauses its countdown while hovered or focused.
- At most 3 toasts show; the oldest drops first.
- Each toast has `data-testid="toast"` and `data-tone`.

**Notes for other phases:**
- Pages are now lazy chunks: keep the default export on every `*Page.tsx`.
- The `page-loading` test id can appear for a moment during navigation.
