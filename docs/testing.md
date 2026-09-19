# Testing

## 1. Strategy

FocusPlan is tested at two levels, matching where its risk actually lives (there being no network layer to mock or contract-test):

1. **Unit tests (Vitest, node environment)** cover every piece of pure or Dexie-backed logic in isolation: the scheduler engine, the plan service, the timer reducer, credit-writing, the dashboard stats functions, the backup/import validator, setup/settings form logic, and the planner's pure rules. Dexie-backed tests use `fake-indexeddb` so they run in plain Node with no browser. This is where the scheduler's placement rules, the timer's timestamp math, and the readiness/streak formulas are exhaustively exercised (property-style sweeps across weekdays, capacity profiles and blackout combinations for the scheduler).
2. **End-to-end tests (Playwright, Chromium)** drive the real app in a real browser against a running dev server, one spec file per feature (`f1`–`f9`), plus a foundational `smoke.spec.ts`. These verify the acceptance criteria that require the actual UI, actual IndexedDB persistence across reloads, actual timer behavior under a simulated clock, and actual accessibility/keyboard behavior — things a unit test can't observe.

Together, these map 1:1 onto the 47 acceptance criteria defined in `.pipeline/plan.json`.

## 2. Running the tests

All commands run from `app/`.

```bash
npm install && npx playwright install chromium   # one-time setup

npm run test:unit        # Vitest — unit tests
npx playwright test      # Playwright — e2e tests (starts the dev server itself)
# or:
npm run test:e2e
```

Useful variants:
```bash
npx vitest run src/logic/scheduler     # just the scheduler/service unit tests
npx vitest run src/logic/timer         # just the timer reducer unit tests
npx playwright test tests/e2e/f5-timer.spec.ts --reporter=list
npx playwright test --headed           # watch it run in a real browser window
```

Playwright's `webServer` config (`app/playwright.config.ts`) starts `npm run dev` automatically with `reuseExistingServer: true` and targets `baseURL: http://localhost:5173` (Chromium only, per `.pipeline/master-plan.md` §2). You don't need to start the dev server yourself first.

### Notable test techniques used

- **`page.clock`** fixes "today" to a known weekday (QA used Wednesday 2026-06-17 09:00) so the demo seed's relative dates and exam countdowns are deterministic across runs.
- **`page.clock.fastForward()`**, not `runFor()`, is used to reach timer phase ends — `fastForward` jumps the clock and fires the due tick once, while `runFor` would replay every 250ms tick through React (30–40s per focus session in dev mode).
- **`Notification` is stubbed** via `addInitScript` (a fake class with a static `permission` and `requestPermission`), because headless Chromium reports `denied` by default.
- **Each e2e test gets its own browser context**, so `localStorage` and IndexedDB are naturally isolated — no manual cleanup between tests.
- **The 500ms auto-replan debounce** is respected: tests that change subjects/exams/topics/settings wait for `plan-status` to read "Plan up to date" (a shared `waitForPlanReady` helper in `tests/e2e/utils.ts`) before asserting on the resulting blocks.
- **The dashboard chart is lazy-loaded**; tests wait for `focus-chart-legend` or `chart-empty` before asserting on it.
- **Readiness percentages are checked as a valid 0–100 range plus a live increase**, never as an exact hardcoded number, since the plan's exact block counts can shift with the scheduler's internal pacing.
- **AC-P1-9 / AC-P2-9** (unit-test count thresholds) are verified from e2e by shelling out to `npx vitest run src/logic/scheduler` / `src/logic/timer` and asserting the reported pass count meets the required minimum with zero failures — exercising the exact command the acceptance criterion names.

## 3. QA round 1 results

From `.pipeline/qa-report.md` (base URL `http://localhost:5173`, build: pass):

| Metric | Value |
|---|---|
| Acceptance criteria tested | 47 |
| Passed | 47 |
| Failed | 0 |
| Bugs open (critical / major / minor) | 0 / 0 / 1 |
| Verdict | **PASS** |

```
npm install && npx playwright install chromium   -> ok
npm run build                                    -> tsc -b && vite build, exit 0, no TS errors
npm run test:unit                                -> Vitest: 12 files, 165 tests passed
npm run lint                                     -> oxlint, 0 warnings/errors
npx playwright test --reporter=list              -> 53 passed (run twice for flakiness check, both green)
```

### Coverage by phase / feature

| Phase | Feature(s) | Spec file | ACs covered |
|---|---|---|---|
| P0 | Foundation (build, routing, seeding) | `tests/e2e/smoke.spec.ts` | AC-P0-1 … AC-P0-5 |
| P1 | F3 auto plan generator | `tests/e2e/f3-scheduler.spec.ts` | AC-P1-1 … AC-P1-5, AC-P1-9 |
| P1 | F7 catch-up rescheduling | `tests/e2e/f7-catchup.spec.ts` | AC-P1-6 … AC-P1-8 |
| P2 | F5 Pomodoro timer | `tests/e2e/f5-timer.spec.ts` | AC-P2-1 … AC-P2-9 |
| P3 | F1 subjects/exams/topics setup | `tests/e2e/f1-setup.spec.ts` | AC-P3-1 … AC-P3-5 |
| P3 | F2 availability settings | `tests/e2e/f2-settings.spec.ts` | AC-P3-6 … AC-P3-8 |
| P4 | F4 planner (Today/Week) | `tests/e2e/f4-planner.spec.ts` | AC-P4-1 … AC-P4-5 |
| P4 | F6 completion actions | `tests/e2e/f6-completion.spec.ts` | AC-P4-6, AC-P4-7 |
| P5 | F8 dashboard & stats | `tests/e2e/f8-dashboard.spec.ts` | AC-P5-1 … AC-P5-5 |
| P5 | F9 export/import/reset/clear | `tests/e2e/f9-data.spec.ts` | AC-P5-6 … AC-P5-9 |

Every single acceptance criterion in `.pipeline/plan.json` (47 total) passed on this run, and the full 53-test Playwright suite was run **twice in a row with no flakiness observed**.

### Unit test totals by phase (from the phase handoffs, summing to the 165 QA reports)

| Phase | Area | Unit tests |
|---|---|---|
| P0 | DB, dates, seed | 15 |
| P1 | Scheduler engine + plan service | 57 (45 engine + 12 service) |
| P2 | Timer reducer, credit, focus copy | 24 |
| P3 | Setup + settings logic | 14 |
| P4 | Planner pure rules + Dexie actions | 16 |
| P5 | Dashboard stats + backup | 38 |
| **Total** | | **165 / 165 passing** |

### Exploratory testing (from QA)

- Swept all 7 routes at 375px and 1280px: zero horizontal overflow and zero console/page errors anywhere (screenshots in `.pipeline/qa-screenshots/explore-*.png`).
- Confirmed the Add-task modal traps focus correctly and Esc closes it, returning focus as expected.
- Verified the timer's timestamp-based accuracy across a simulated background tab (10 minutes elapsed while `document.hidden`, countdown correctly reflected it with no drift) and across a full page reload (timer resumed at the same remaining time and phase).
- Verified the import/export round-trip and that Clear all genuinely stays empty after a reload (no re-seed).
- Confirmed zero requests to any origin other than the app's own dev server across a full session.

## 4. Known gaps

- **BUG-001 (minor, open):** the skip-to-content link, the wordmark nav link and the current page's own nav link are unreachable via keyboard Tab (see `README.md` → Known Issues and `.pipeline/qa-report.md` for full repro steps). This does not fail any acceptance criterion — AC-P0-2 only checks click-driven navigation — but it is a real WCAG 2.4.1 defect and has no automated regression test guarding it yet. A future QA round should add a keyboard-navigation e2e test once it's fixed.
- Round 1 is the only QA round recorded in `.pipeline/`; there is no round 2 report, so nothing beyond BUG-001 is known to be outstanding.
