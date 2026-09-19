# Handoff: P4 Planner UI: Today, Week and block progress

> Owner: frontend-engineer · Status: done (one design item blocked on P0, see below) · Round: build

## Features delivered
| Feature | Status | Notes |
|---|---|---|
| F4 Today view | ✅ done | Built to screens/today.md and wireframes/today.html. Includes the date eyebrow, capacity meter (segments, over-capacity, rest-day and blackout helpers), Up next hero with `start-next` (first planned/partial block by `order`; reads `Back to timer` when `useTimer()` runs that block), the ordered `today-queue` of BlockRows, all three empty states, loading skeleton and live updates |
| F4 Week view | ✅ done | Built to screens/week.md and wireframes/week.html. Includes the Mon–Sun grid (`week-day-<date>`, today highlighted, `aria-current="date"`), prev/This week/next navigation via `?start=` (invalid values are normalised with replace), load `X/Y` (warning colour when over), exam markers, blackout hatch, and the legend. At 375 it becomes an agenda where past days collapse behind `week-show-past`. At 768 it is a horizontal scroll row with today scrolled into view, and at lg+ it has 7 columns |
| F4 Block menu, move, edit, delete, add task | ✅ done | The Edit dialog changes pomodoros (and the title for tasks). The Move dialog uses a date input. Native HTML5 drag-and-drop works between Week columns and appends to the target day's order. Moving or editing an auto block sets `pinned=true`. Delete goes through `ConfirmDialog` ("Delete block"). The Add task form creates `kind:'task', source:'manual'` |
| F6 Completion actions | ✅ done | Done, Partial (segmented 1…m−1) and Skip work, with Undo on done/skipped rows and cards. Undo after Done restores the pre-Done `completedPomodoros` (kept in memory, falls back to 0). Topic check opens after Done on a `new` block whose topic is uncovered. **Covered** stays disabled until a confidence is picked, and it writes `topic.covered/confidence` |
| Toast Undo action (`toast-undo`) | ⚠️ not done | The P0 `useToast().show()` has no action slot. Skip shows `Skipped <title>` without the button. Row and card `block-undo` provide the same action (accessibility.md: "the toast is never the only path"). See the cross-phase requests |

## Acceptance criteria self-check
I ran a scratch Playwright script against the dev server using real "today" (Sat 19 Sep 2026) and a fresh seeded DB. I did not add a spec under tests/e2e/ because P0 owns that directory.

| AC | Result | How verified |
|---|---|---|
| AC-P4-1 | pass | 6 `today-block`s, each with title, kind, subject and `0/n pomodoro(s)`. `Problem set 3` shows `Task` and `Physics` |
| AC-P4-2 | pass (Today side) | `start-next` href is `/focus?blockId=seed-task-problem-set-3`, which is the first planned block. The all-done branch renders `today-empty` "All done for today". Whether the Focus page shows the topic depends on P2 |
| AC-P4-3 | pass | 7 columns from 2026-09-14 to 2026-09-20, with 09-19 marked `data-today`. Next goes to `?start=2026-09-21` ("21 – 27 Sep 2026"). Prev goes back a week, and `?start=2026-09-17` normalises to `2026-09-14` |
| AC-P4-4 | pass | Added "Read chapter 4" for today+1 (2 pomodoros, Physics). It appears in `week-day-2026-09-20` with a Task badge and is still there after `replan-button` |
| AC-P4-5 | pass | The Move dialog moved a block to today+2. Dragging a card to the Sun column gave `data-date=2026-09-20`, and it kept that date after a reload and after a replan. Editing pomodoros to 1 showed `0/1 pomodoro`. Deleting after confirm removed the row |
| AC-P4-6 | pass | Done gives `done` and `2/2 pomodoros`. Partial 1 gives `1/2 pomodoros` and a `Partial` badge. Skipping the target moved `start-next` to the next block |
| AC-P4-7 | pass (Today side) | The Topic check dialog appeared, and Covered was disabled until a confidence was picked. Picking confidence 3 then Covered showed the `block-covered` badge. Not yet/Esc only closes the dialog. The Setup badge is P3's |

I also checked at 375: each row has every test id exactly once (the actions wrap onto 2 lines), with 0 px horizontal overflow on Today and Week, and 0 console errors across the whole run. Screenshots were taken at 375, 768 and 1280 and compared with the wireframes.

## Files created / modified
All paths are under `app/src/features/planner/`:
- `TodayPage.tsx`: the Today page. It replaces the P0 stub and keeps the default export and `<h1>`
- `WeekPage.tsx`: the Week page. It replaces the P0 stub and keeps the default export and `<h1>`
- `BlockRow.tsx`: the Today row (`today-block`), plus `KindBadge` and `StatusBadge`
- `BlockCard.tsx`: the Week card (`block-card`), which is draggable and has a menu popover
- `BlockDialogs.tsx`: the `<PlannerActions>` provider plus the Partial, Topic check, Edit, Move, Delete and Add task dialogs
- `actionsContext.ts`: the `usePlannerActions()` context
- `Menu.tsx`: the accessible menu popover (`role=menu`, arrow keys, Home/End, Esc returns focus, closes on outside click)
- `planner.ts`: pure rules (target, load, validation, copy, week range) and the Dexie writes
- `usePlannerData.ts`: the live-query hooks (lookups, blocks in a date range, next open block)
- `planner.test.ts`: 16 unit tests (pure rules plus Dexie actions on fake-indexeddb)

## How to run / use
From `app/`, run `npm run dev` and open `/today` and `/week?start=YYYY-MM-DD`. No env vars are needed. The demo seed is P0's.

## Interfaces exposed to other phases
The pages are the default exports that `routes.tsx` imports. The other exports are internal to P4. Writes use only `@/db` (`db.blocks`, `db.topics`), `@/lib`, `@/components/ui` and `useTimer()`.

## Verification output
```
> npm run build
✓ 973 modules transformed.
dist/assets/index-DCIHPzVl.js       527.17 kB │ gzip: 162.20 kB
(!) Some chunks are larger than 500 kB after minification.   <- warning only; recharts chunk, not P4
✓ built in 472ms          (exit 0)

> npm run lint
> oxlint                  (exit 0, no findings)

> npm run test:unit
 Test Files  5 passed (5)
      Tests  69 passed (69)       (16 of them in src/features/planner/planner.test.ts)
```

## Open questions / cross-phase requests
- **P0 (`src/components/ui/Toast.tsx`, `toastContext.ts`):** today.md needs a toast action button. Please add an optional action, e.g. `show(message, tone?, durationMs?, action?: { label: string; onClick(): void; testId?: string })`, that renders a button with `data-testid="toast-undo"` and stays for 8 s (accessibility.md). Once it exists, P4 will pass `{ label: 'Undo', testId: 'toast-undo', onClick: () => undoBlock(id) }` in `skip()` (BlockDialogs.tsx). This is a one-line change.
- **P1:** the Topic check writes only `topic.covered` and `topic.confidence`. The extra review for confidence 1 depends on PlanSync's debounced live replan on topic changes (P1 rule 3). The P0 stand-in PlanSync doesn't replan yet.
- **P2:** AC-P4-2 and AC-P4-6 also need the Focus page to show the topic for `?blockId=` (`auto:<topicId>:…` ids are URL-encoded by `encodeURIComponent`).
- **QA / tests/e2e (P0-owned):** please add planner specs for AC-P4-1…7. The test ids follow today.md and week.md. The Week card menu opens on click or Enter, so the status actions inside `block-card` are reached after clicking the card.
- **Choices I made where the spec was silent:**
  - Loading states render the real `<h1>` next to the skeletons, so Layout's route-change focus still finds it.
  - When there are no subjects or exams but manual tasks exist today, the queue is still shown.
  - Drag is disabled for done/skipped blocks, blocks on past days and coarse pointers.
  - A drop on an invalid column shows its error toast on `dragend`, because no `drop` event fires there.
  - The Move dialog doesn't block blackout days (today.md lists no such error), but drops do.
- **Fonts:** in headless Chromium the `font-mono` text looked like a fallback monospace in the screenshots. If QA sees that too, it's in P0's font setup, not P4.

## Fix log (bug-fix rounds only)
| Bug ID | Root cause | Fix | Files |
|---|---|---|---|
