# Handoff: P5 Dashboard, stats and data management

> Owner: frontend-engineer · Status: done · Round: build + fix-round-1 (toast copy)

## Features delivered
| Feature | Status | Notes |
|---|---|---|
| F8 Dashboard and stats | ✅ done | `/dashboard` follows screens/dashboard.md: 3 stat tiles, ticket-stub exam cards (readiness %, countdown, coverage, overflow warning, `Ready` badge at 100%), a Recharts stacked 7-day chart with a custom HTML legend, an sr-only data table and a tooltip. Covers the loading, empty (no exams), empty (no sessions) and error states. Every number comes from the pure functions in `stats.ts`. Everything updates live through `useLiveQuery` |
| F9 Export / import / reset / clear | ✅ done | `/data` follows screens/data.md: live summary counts, JSON export (Blob download, no network), import with validation, inline errors and a confirm step, then replaces everything in one Dexie transaction. Reset to demo and Clear all both confirm first. Working labels and disabled states, all toasts, the empty-state helper and the privacy note are in place |

## Acceptance criteria self-check
| AC | Result | How verified |
|---|---|---|
| AC-P5-1 | pass | Browser run on a fresh seed: names `Organic Chemistry Quiz, Calculus Midterm, Mechanics Test`, countdowns `in 7 days, in 10 days, in 14 days`, readiness `0%, 8%, 10%` (the values depend on P1's current plan), coverage `0/3, 1/5, 1/4`. Unit tests cover `upcomingExams` and `topicsCoverage` |
| AC-P5-2 | pass | Browser: a planned Calculus block written to `done` through the app's Dexie instance changed Calculus readiness live from `8%` to `17%` without a reload. Unit test "rises when a planned block is marked done" |
| AC-P5-3 | pass | Browser: `focus-today` 0 and `focus-week` 500 on the seed (today is Sat 19 Sep, and all 20 seed sessions fall Mon–Fri this week). After one 25-min session was added, `focus-today` was 25. Unit tests cover the Monday start and breaks being ignored |
| AC-P5-4 | pass | Browser: the chart renders 7 x-axis days (`Sun 13 … Fri 18, Today`, screenshot) and the legend `Mathematics, Physics, Chemistry`. Unit test checks the 7 dates ending today |
| AC-P5-5 | pass | Browser: `streak-count` 5 on the seed and 6 after 4 completed focus sessions today. Unit tests also cover a partial today, a gap and incomplete sessions |
| AC-P5-6 | pass | Browser: the download is named `focusplan-backup-2026-09-19.json` and parses with `app 'focusplan'`, `version 1`, 3 subjects, 3 exams and 12 topics |
| AC-P5-7 | pass (my part) | Browser: after confirmed clear-all the summary reads all 0 (still 0 after a reload), Dashboard shows `dashboard-empty` with 0 `exam-card`s, and `chart-empty` shows. A malformed file shows `import-error` "That file isn't valid JSON. Nothing was changed." and changes nothing. Re-importing the exported file (confirmed) gives 3/3/12. "Today shows an empty state linking to Setup" belongs to P4 and I did not verify it |
| AC-P5-8 | pass | Browser: confirmed reset-demo leads to 3 exam cards and `streak-count` 5 |
| AC-P5-9 | pass (my pages) | Browser session over /dashboard and /data (export, import, clear, reset): zero requests to other origins and zero page errors. The full-session check (every route plus the timer) needs the QA e2e |

## Files created / modified
All paths are under `app/src/features/`:
- `dashboard/stats.ts` (new): pure stats functions: `readiness`, `overflowFor`, `topicsCoverage`, `upcomingExams`, `focusMinutesToday`, `focusMinutesThisWeek`, `completedFocusByDay`, `completedFocusToday`, `streak`, `last7DaysSeries`, `minuteTicks`, `hoursMinutesLabel`, `sessionDate`, `UNLINKED_KEY`
- `dashboard/stats.test.ts` (new): 26 Vitest tests
- `dashboard/DashboardPage.tsx` (replaced the stub): the page, StatTile and loading skeletons. The chart is lazy-loaded
- `dashboard/ExamCard.tsx` (new): the ticket-stub exam card
- `dashboard/FocusChart.tsx` (new): the Recharts chart, legend, sr-only table, tooltip and `chart-empty`
- `data/backup.ts` (new): `parseBackup` (validation), `buildBackup`, `backupFileName`, `readBackup`, `replaceAllData` (a single transaction), `downloadBackup`, `resetTimerStorage`, and copy helpers
- `data/backup.test.ts` (new): 13 Vitest tests (fake-indexeddb), covering the round trip, every error message, and an import that fails mid-transaction leaving the data unchanged
- `data/DataPage.tsx` (replaced the stub): the page

## How to run / use
From `app/`: `npm run dev`, then open `http://localhost:5173/dashboard` and `/data`. Unit tests: `npx vitest run src/features/dashboard src/features/data`. No env vars.

## Interfaces exposed to other phases
- `@/features/dashboard/stats`: all functions are pure and take `today: ISODate` explicitly.
  - `readiness(exam, blocks, overflow, today) → {done, remaining, percent}`
  - `streak(sessions, today, dailyGoal) → number`
  - `focusMinutesToday` / `focusMinutesThisWeek(sessions, today) → number`
  - `last7DaysSeries(sessions, subjects, today) → {days, keys, hasData}`
  - Semantics:
    - Minutes sum `actualMinutes` of every `kind:'focus'` session, completed or not.
    - The streak and the daily-goal count use only `completed` focus sessions.
    - A session whose subject is null or deleted counts as "Free focus".
- `@/features/data/backup`:
  - `parseBackup(text) → {ok:true, backup} | {ok:false, error}`
  - `replaceAllData(backup)`, `readBackup()`, `downloadBackup(backup, name?)`
  - `TIMER_STORAGE_KEY = 'focusplan.timer.v1'`
- Import, reset and clear all call `useTimer().reset()` and then remove `localStorage['focusplan.timer.v1']`.
- Import writes `emptyPlanMeta()`, so there is no stale catch-up notice, and the `meta.seed` marker. P1's PlanSync auto-replan then rebuilds the plan.

## Verification output
```
> npm run build
> tsc -b && vite build
dist/assets/FocusChart-8DOBk2rY.js  360.03 kB │ gzip: 104.33 kB   (Recharts split out of the main chunk)
dist/assets/index-qAmZ4VZs.js       546.09 kB │ gzip: 167.51 kB   (chunk-size warning only, from the shared main bundle)
✓ built in 558ms

> npx oxlint src/features/dashboard src/features/data
exit 0
> npm run lint   (whole app)
src/logic/scheduler/zz-dump.test.ts:14:176: error: Unterminated string   <- P1's in-progress file, not P5
(before that file appeared, `npm run lint` passed with 0 warnings and 0 errors including all P5 files)

> npx vitest run src/features/dashboard src/features/data
 Test Files  2 passed (2)
      Tests  38 passed (38)
> npm run test:unit (whole app at that moment)
 Test Files  11 passed (11)
      Tests  108 passed (108)

Browser (Chromium via a playwright script against `npm run dev`, 375 and 1280 px):
names [Organic Chemistry Quiz, Calculus Midterm, Mechanics Test]; countdown [in 7 days, in 10 days, in 14 days]
covered [0/3, 1/5, 1/4]; legend [Mathematics, Physics, Chemistry]
calc readiness 8% -> 17% (live); focus-today 0 -> 25 -> 100; week 500 -> 600; streak 5 -> 6
download focusplan-backup-2026-09-19.json focusplan 1 3 3 12
import-error "That file isn't valid JSON. Nothing was changed."
after clear: 0 subjects · 0 exams · 0 topics · 0 blocks · 0 focus sessions (same after reload); dashboard cards 0, dashboard-empty 1, chart-empty shown
after import: 3 subjects · 3 exams · 12 topics …; toast "Backup imported: 3 subjects, 3 exams and 12 topics." (build round; fix-round-1 changed it to the design copy, checked by a unit test)
after reset: streak 5, cards 3
foreign requests []  page errors []   375px scrollWidth 375 (no horizontal scroll)
```
Screenshots at 375 and 1280 matched the wireframes (tiles as rows at 375 and 3 columns from md; exam cards 1/2/3 columns; Y axis hidden at 375). The dev server was stopped afterwards.

## Open questions / cross-phase requests
- **P1 (lint):** `src/logic/scheduler/zz-dump.test.ts` currently breaks `npm run lint` ("Unterminated string"). It looks like a temporary debug file.
- **P0 (optional):** the main chunk is 546 kB, which triggers Vite's >500 kB warning. It is a warning only; the build still exits 0. P5 already lazy-loads Recharts. Lazy-loading the route pages in `src/app/routes.tsx` (P0) would remove the warning.
- **P0 / QA e2e (`tests/e2e/**`):** please add specs for AC-P5-1…9. Useful notes:
  - Readiness values depend on P1's plan, so assert a range of 0–100 and the increase (AC-P5-2), not fixed numbers.
  - The chart is lazy-loaded, so wait for `focus-chart-legend` or `chart-empty` before asserting.
  - `import-input` is a real `sr-only` `input[type=file]`, so `setInputFiles` works.
  - Confirm dialogs use `confirm-ok` / `confirm-cancel`.
  - The import success toast is `Backup imported: 3 subjects, 3 exams, 12 topics.` (design copy, counts from the file).
- **Assumptions:**
  - Readiness shows `0%` when an exam has no blocks and no overflow.
  - Exams whose date is before today are hidden, as the spec says.
  - In the exam card, when the exam is today, `exam-days-left` holds an sr-only `0` and the stub shows `TODAY`.
  - The legend and stack order is by minutes in the range (descending), then by name. On the seed that gives Mathematics, Physics, Chemistry.
  - The streak tile shows decorative pomodoro pips for today's progress toward the goal.
- **Design notes:**
  - `EmptyState` (P0) renders its title as a `<p>`, while the wireframe uses an `h2`. I left the P0 component unchanged.
  - The Y axis uses nice steps (0, 25, 50, 75, 100 for the seed), which gives 4 intervals rather than exactly "4 ticks".

## Fix log (bug-fix rounds only)
| Bug ID | Root cause | Fix | Files |
|---|---|---|---|
| FR1-toast | The import success toast reused the dialog's "X, Y and Z" phrase instead of the design copy | Added `importedToast()` giving `Backup imported: 3 subjects, 3 exams, 12 topics.` (counts from the backup, singular for 1), used it in DataPage, and added a unit test | `app/src/features/data/backup.ts`, `app/src/features/data/DataPage.tsx`, `app/src/features/data/backup.test.ts` |
