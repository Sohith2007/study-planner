# Handoff: P1 Scheduler engine and catch-up

> Owner: phase-engineer · Status: done · Round: build

## Features delivered
| Feature | Status | Notes |
|---|---|---|
| F3 Auto plan generator | ✅ done | Pure, deterministic `generatePlan`. It plans back from each exam, spaces reviews, interleaves subjects round-robin, respects capacity (minus kept blocks) and blackouts, keeps exam−1 for reviews only, and reports overflow. Ids are deterministic (`auto:<topicId>:<kind>:<n>`), and blocks that already existed keep their `createdAt` |
| F7 Auto catch-up and rescheduling | ✅ done | `catchUpOnOpen` / `replan` run in one Dexie transaction and write only the difference. PlanSync auto-replans 500 ms after any change to subjects, exams, topics or settings, and runs catch-up again if the day changes while the app is open. PlanStatusBar shows the status row, Replan, the catch-up notice and the over-capacity banner with Trim reviews |

## Acceptance criteria self-check
| AC | Result | How verified |
|---|---|---|
| AC-P1-1 | pass | Unit test for each weekday as "today": every uncovered topic's planned `new` pomodoros equal its estimate, covered topics get none, overflow is empty. Browser script against the dev server confirms the blocks are written |
| AC-P1-2 | pass | Unit tests check capacity for every created day (the property sweep covers 14 start days × 4 capacity profiles × blackouts on/off). Blackout unit and service tests pass. Browser script: after a blackout date is saved, that day has no auto blocks |
| AC-P1-3 | pass | Invariant checker `planViolations` (nothing on or after the exam, no `new` after exam−2, reviews strictly after the last new block at their offset) plus dedicated tests for the day before the exam and the exact offsets |
| AC-P1-4 | pass | `interleavingViolations`: a day with capacity ≥4 that has blocks, while ≥2 exams still have planned blocks on or after it, holds ≥2 subjects. Seed for all 7 weekdays, and the 112-case sweep |
| AC-P1-5 | pass | Unit test simulating the Today flow (Done on a New block, then covered with confidence 1) for every new block today over 14 start days: reviews = before + 1 = confidence-3 count + 1. Service test and browser script: 3 → 4 |
| AC-P1-6 | pass | Service test: `movedCount` 2, `lastCatchUp.movedCount` 2, no planned block before today. Browser: `catchup-notice` text is exactly "Moved 2 missed blocks". P0 smoke "catch-up on open" passes |
| AC-P1-7 | pass | Service test: two replans cause **zero** Dexie create/update/delete hooks and give the same ids and dates. Done, partial, skipped, pinned, manual and seed task blocks come back deep-equal. Browser: Replan clicked twice gives the same set |
| AC-P1-8 | pass | Service test and browser: capacity 1 shows the banner with 3 `overcapacity-item`s (seed: 44 pomodoros). Trim reviews brings it to 31 with the toast "Removed the +7 day review. Plan rebuilt.", and restoring the capacities removes the banner |
| AC-P1-9 | pass | `npm run test:unit`: 57 scheduler and service tests (45 engine, 12 service with fake-indexeddb). The whole app has 165/165 |

## Files created / modified
All paths are under `app/`:
- `src/logic/scheduler/index.ts`: contract barrel. Re-exports `PlanInput`, `PlanResult`, `OverflowItem` and `generatePlan`, plus the helpers below
- `src/logic/scheduler/types.ts`: `PlanInput` (adds an optional `now?`, see below) and `PlanResult`
- `src/logic/scheduler/engine.ts`: the scheduler (`generatePlan`, `EARLY_REVIEW_DAYS`)
- `src/logic/scheduler/rules.ts`: pure helpers (`isKeptBlock`, `isMovedBlock`, review-offset helpers, `capacityFor`, `summarizeOverflow`)
- `src/logic/scheduler/planService.ts`: `replan`, `catchUpOnOpen`, and the new `trimLargestReview`
- `src/logic/scheduler/testUtils.ts`: test-only helpers (seed input, invariant and interleaving checkers)
- `src/logic/scheduler/scheduler.test.ts` (45 tests), `src/logic/scheduler/planService.test.ts` (12 tests)
- `src/features/plan-status/PlanSync.tsx`: catch-up on open, debounced auto-replan, day-change catch-up
- `src/features/plan-status/PlanStatusBar.tsx`: status row, catch-up notice, over-capacity banner
- `src/features/plan-status/planStatusStore.ts`: session store shared by PlanSync and the bar (pending/running, dismissed notice, banner announced)

## How to run / use
From `app/`: `npm run test:unit` (or `npx vitest run src/logic/scheduler`), `npm run build`, `npm run lint`. Nothing to configure: PlanSync and PlanStatusBar are already mounted by P0's Layout.

### Scheduler behaviour (details P1 owns, beyond master-plan §4.3)
- **Kept blocks (rule 7):** done, partial, skipped, pinned or manual blocks, **plus planned blocks with `completedPomodoros > 0`**. This protects a 2-pomodoro block that the timer has credited once, while it is still `planned`.
- **Remaining new work:**
  - `estimate − completed − still planned`
  - "completed" counts `done` blocks as full.
  - "still planned" counts only kept planned or partial new blocks dated today or later.
  - Past-dated pinned or partial leftovers are planned again.
- **Pacing (exam-backward):**
  - Each exam's new blocks are spread evenly from today to shortly before its exam−2 deadline, with a slack of `min(3, span/4)` days so reviews have room.
  - Each exam still gets at least one block today.
  - If the paced plan overflows, a greedy plan (fill each day) is also built, and the one with less overflow wins.
- **Interleaving guarantee:** if a day would hold only one subject, the scheduler pulls in one block from another subject: a new block, or else that subject's next review if it is due within **2 days** (`EARLY_REVIEW_DAYS`). The review still falls after the last new block, and reviews keep their order.
- **Reviews:**
  - Offset slots count from the topic's last new block. A covered topic with no new blocks counts from today.
  - At most one review per topic per day. A review is pushed later if its day is full.
  - An offset that would land after exam−1 is **dropped** ("doesn't fit"), not counted as overflow.
  - Overdue offsets (history before today) collapse into a single review today. The seed's Limits and Kinematics topics each get one review today.
  - A kept review with a given `reviewOffset` satisfies that slot.
- **Confidence 1 extra review:** its offset is `extraReviewOffset(offsets)`, one day after the first offset, skipping offsets already in use. For `[1,3,7]` that is **+2**, stored in `reviewOffset`. It is not an exam−1 review. I chose this so the extra review always fits when the topic was just studied, which keeps AC-P1-5 reliable.
- **Skip:** if a new block is skipped today, that topic's new work is planned again from tomorrow, never today.
- **Overflow:**
  - New work for an exam dated today or earlier has reason `exam-passed`.
  - Everything else has reason `no-capacity`, including an exam tomorrow, because there is no day left for new work.
  - **The reviews of a topic whose new work did not fit also count as `review` overflow.** This is why the seed with capacity 1 shows 44, not the design's example of 14, and it is what guarantees that Trim reviews always lowers the count.
- **Manual tasks and pinned blocks dated in the past are left where they are.** Catch-up moves only auto blocks, which the contract requires.

### Catch-up record (`meta.plan.lastCatchUp`)
- `catchUpOnOpen` always records `{movedCount, at}`. A second open that moves nothing records 0, which hides the notice.
- A plain `replan` records it only when it actually moved past-due blocks, for example when the app stayed open overnight, or after `resetToDemo`/import, which brings the missed seed blocks back. Otherwise it keeps the previous record.

### UI
- **Status row:**
  - "Updating plan…" with a spinner from the moment an input change is seen, through the 500 ms debounce, until the replan finishes. It also shows during catch-up, manual Replan and Trim.
  - I show it during the debounce as well as the run: a run takes only a few milliseconds, so the text would otherwise just flicker.
  - While it shows, `replan-button` is disabled.
  - Otherwise the row reads "Plan up to date · rebuilt just now / N min ago / N h ago / N days ago", or "Plan not built yet". Only the state part is `aria-live`.
- **Catch-up notice:** `role=status`. The dismissal lasts for the session and is kept in module state, so it survives the bar unmounting on /focus. It is keyed by `lastCatchUp.at`.
- **Over-capacity banner:**
  - Uses `role=alert` the first time it appears in a session and `role=status` after that.
  - Items are sorted by exam date, and a passed exam gets the suffix "(exam date has passed)".
  - `trim-reviews` shows "Drops the +N day review", or is disabled with "No reviews left to trim".
  - `overcapacity-settings-link` goes to `/settings`.
  - The actions stack full width (h-11) at 375 and sit in one row (h-9) from md. I checked both widths with screenshots.

## Interfaces exposed to other phases
Frozen contract (unchanged): `generatePlan(input: PlanInput): PlanResult`, `replan(opts?: { today?: string }): Promise<PlanSummary>`, `catchUpOnOpen(): Promise<PlanSummary>`, and `PlanSync` / `PlanStatusBar` as default exports with no props.

The only change to an existing type is a new **optional** field, `PlanInput.now?: string`, which is backward compatible and sets `createdAt` for new blocks.

Added exports:
```ts
// @/logic/scheduler (pure)
isKeptBlock(b: Block): boolean                  // rule 7 incl. in-progress planned blocks
isMovedBlock(b: Block, today: string): boolean  // what catch-up counts as "moved"
normalizeReviewOffsets(o?: number[]): number[]; largestReviewOffset(o?): number | null
trimmedReviewOffsets(o?): number[]; extraReviewOffset(o: number[]): number
capacityFor(settings, weekday): number; MAX_NEW_BLOCK_POMODOROS = 2
summarizeOverflow(overflow): { total: number; byExam: { examId, pomodoros, examPassed }[] }  // P5 readiness can use it
// @/logic/scheduler/planService
trimLargestReview(opts?: { today?: string }): Promise<{ removed: number | null; summary: PlanSummary }>
```
Notes for other phases:
- **P3, P4 and P5 never need to call `replan()` after changing subjects, exams, topics or settings.** PlanSync does it.
- **Block edits (move, done, skip) do not trigger a replan.** This is by design, because PlanSync does not watch `blocks`.
- **P2:** replan never deletes a block that has credited pomodoros, and ids are stable.

## Verification output
Run from `app/` (the whole app, including the other phases' code as of this run):
```
> npm run build
> tsc -b && vite build
✓ built in 489ms          (one pre-existing >500 kB chunk warning, from P5's recharts chunk; not P1)

> npm run lint
> oxlint                  (0 warnings, 0 errors)

> npm run test:unit
 Test Files  12 passed (12)
      Tests  165 passed (165)
> npx vitest run src/logic/scheduler
 Test Files  2 passed (2)
      Tests  57 passed (57)

> npx playwright test tests/e2e/smoke.spec.ts
  8 passed (5.0s)
```
I also ran a browser check with a Playwright script against the dev server (it lives in my scratchpad, not in the repo):
```
PASS AC-P1-6 notice text Moved 2 missed blocks
PASS status row rebuilt
PASS AC-P1-6 no planned before today
PASS AC-P1-1 blocks exist
PASS AC-P1-7 replan idempotent
PASS dismiss hides notice
PASS "Updating plan…" shown after change 24 ms
PASS AC-P1-8 banner shows counts 44 | Organic Chemistry Quiz: 8 unscheduled / Calculus Midterm: 21 unscheduled / Mechanics Test: 15 unscheduled
PASS banner role alert first
PASS AC-P1-8 trim lowers count 44 -> 31
PASS AC-P1-8 banner hides after restore
PASS AC-P1-2 blackout day emptied 2026-09-27
PASS AC-P1-5 one extra review 3 -> 4
PASS status bar hidden on /focus
PASS banner role status on later appearance
PASS no console/page errors
```

## Open questions / cross-phase requests
- **QA (the owner of `tests/e2e/**`), e2e specs for P1:**
  - AC-P1-6: fresh context, `/today`, expect `catchup-notice` to have the exact text "Moved 2 missed blocks".
  - AC-P1-8: set every `capacity-*` to 1 and click `settings-save`. Then expect `overcapacity-banner`, read `overcapacity-total`, click `trim-reviews` and expect the total to go down. Restore 4/6/6/6/6/6/8, save, and expect the banner to be detached.
  - AC-P1-7: read the blocks from IndexedDB, click `replan-button` twice (wait for the "Plan rebuilt" toast), and compare ids and dates.
  - After any change to inputs, wait for "Plan up to date" in `plan-status`, or poll IndexedDB, before asserting on blocks, because of the 500 ms debounce.
  - `replan-button` and `trim-reviews` are **disabled while "Updating plan…" shows**. Playwright waits for them automatically.
- **QA, how to read AC-P1-4:** the unit checker skips empty days and counts an exam as pending only if it has planned blocks on or after the day. A day with capacity ≥4 and no blocks at all (all work already placed) is not a violation.
- **QA, how to read AC-P1-3:** reviews always fall after the last new block. They land at `lastNew + offset` when there is room. They can be up to 2 days early (interleaving) or later (the day was full), and overdue offsets land today. The confidence-1 extra review has `reviewOffset` 2 (with the default offsets), which is **not** in `settings.reviewOffsets`.
- **Design deviation, over-capacity count:** the count includes the reviews of topics whose new work does not fit, so the seed with capacity 1 shows 44 (the design's example says 14). If the team prefers new work only, the change is in `engine.ts` (the overflow section). Trim reviews would then no longer be guaranteed to lower the number.
- No dependency or P0 changes are needed.

## Fix log (bug-fix rounds only)
| Bug ID | Root cause | Fix | Files |
|---|---|---|---|
