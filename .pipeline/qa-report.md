# QA Report: FocusPlan, round 1

> Author: qa-tester · Date: 2026-09-19 · Base URL: http://localhost:5173 · Build: pass

## Summary
| Metric | Value |
|---|---|
| Acceptance criteria tested | 47 |
| Passed | 47 |
| Failed | 0 |
| Bugs open (critical / major / minor) | 0 / 0 / 1 |
| Verdict | **PASS** |

Verdict is **PASS**: every acceptance criterion in `plan.json` passes, `npm run build` exits 0 with no TypeScript errors, `npm run test:unit` passes 165/165, `npx playwright test` passes 53/53 (twice in a row, no flakiness observed), and there are no open critical or major bugs. One minor accessibility bug was found during exploratory testing (see Bugs).

## Build and test commands run
```
npm install && npx playwright install chromium   -> ok
npm run build                                    -> tsc -b && vite build, exit 0, no TS errors
npm run test:unit                                -> Vitest: 12 files, 165 tests passed
npm run lint                                     -> oxlint, 0 warnings/errors
npx playwright test --reporter=list              -> 53 passed (run twice for flakiness check, both green)
```

## Coverage
| AC | Feature | Phase | Test file | Result |
|---|---|---|---|---|
| AC-P0-1 | F9 (build) | P0 | `npm run build` (no dedicated e2e test needed) | ✅ |
| AC-P0-2 | F9 | P0 | tests/e2e/smoke.spec.ts | ✅ |
| AC-P0-3 | F9 | P0 | tests/e2e/smoke.spec.ts | ✅ |
| AC-P0-4 | F9 | P0 | tests/e2e/smoke.spec.ts | ✅ |
| AC-P0-5 | F9 | P0 | smoke.spec.ts + `npm run test:unit` | ✅ |
| AC-P1-1 | F3 | P1 | tests/e2e/f3-scheduler.spec.ts | ✅ |
| AC-P1-2 | F3 | P1 | tests/e2e/f3-scheduler.spec.ts | ✅ |
| AC-P1-3 | F3 | P1 | tests/e2e/f3-scheduler.spec.ts | ✅ |
| AC-P1-4 | F3 | P1 | tests/e2e/f3-scheduler.spec.ts | ✅ |
| AC-P1-5 | F3 | P1 | tests/e2e/f3-scheduler.spec.ts | ✅ |
| AC-P1-6 | F7 | P1 | tests/e2e/f7-catchup.spec.ts | ✅ |
| AC-P1-7 | F7 | P1 | tests/e2e/f7-catchup.spec.ts | ✅ |
| AC-P1-8 | F7 | P1 | tests/e2e/f7-catchup.spec.ts | ✅ |
| AC-P1-9 | F3 | P1 | tests/e2e/f3-scheduler.spec.ts (runs `vitest run src/logic/scheduler`, asserts ≥12 passed) | ✅ |
| AC-P2-1 | F5 | P2 | tests/e2e/f5-timer.spec.ts | ✅ |
| AC-P2-2 | F5 | P2 | tests/e2e/f5-timer.spec.ts | ✅ |
| AC-P2-3 | F5 | P2 | tests/e2e/f5-timer.spec.ts | ✅ |
| AC-P2-4 | F5 | P2 | tests/e2e/f5-timer.spec.ts | ✅ |
| AC-P2-5 | F5 | P2 | tests/e2e/f5-timer.spec.ts | ✅ |
| AC-P2-6 | F5 | P2 | tests/e2e/f5-timer.spec.ts (granted + denied cases) | ✅ |
| AC-P2-7 | F5 | P2 | tests/e2e/f5-timer.spec.ts | ✅ |
| AC-P2-8 | F5 | P2 | tests/e2e/f5-timer.spec.ts | ✅ |
| AC-P2-9 | F5 | P2 | tests/e2e/f5-timer.spec.ts (runs `vitest run src/logic/timer`, asserts ≥8 passed) | ✅ |
| AC-P3-1 | F1 | P3 | tests/e2e/f1-setup.spec.ts | ✅ |
| AC-P3-2 | F1 | P3 | tests/e2e/f1-setup.spec.ts | ✅ |
| AC-P3-3 | F1 | P3 | tests/e2e/f1-setup.spec.ts | ✅ |
| AC-P3-4 | F1 | P3 | tests/e2e/f1-setup.spec.ts | ✅ |
| AC-P3-5 | F1 | P3 | tests/e2e/f1-setup.spec.ts | ✅ |
| AC-P3-6 | F2 | P3 | tests/e2e/f2-settings.spec.ts | ✅ |
| AC-P3-7 | F2 | P3 | tests/e2e/f2-settings.spec.ts | ✅ |
| AC-P3-8 | F2 | P3 | tests/e2e/f2-settings.spec.ts | ✅ |
| AC-P4-1 | F4 | P4 | tests/e2e/f4-planner.spec.ts | ✅ |
| AC-P4-2 | F4 | P4 | tests/e2e/f4-planner.spec.ts | ✅ |
| AC-P4-3 | F4 | P4 | tests/e2e/f4-planner.spec.ts | ✅ |
| AC-P4-4 | F4 | P4 | tests/e2e/f4-planner.spec.ts | ✅ |
| AC-P4-5 | F4 | P4 | tests/e2e/f4-planner.spec.ts | ✅ |
| AC-P4-6 | F6 | P4 | tests/e2e/f6-completion.spec.ts | ✅ |
| AC-P4-7 | F6 | P4 | tests/e2e/f6-completion.spec.ts | ✅ |
| AC-P5-1 | F8 | P5 | tests/e2e/f8-dashboard.spec.ts | ✅ |
| AC-P5-2 | F8 | P5 | tests/e2e/f8-dashboard.spec.ts | ✅ |
| AC-P5-3 | F8 | P5 | tests/e2e/f8-dashboard.spec.ts | ✅ |
| AC-P5-4 | F8 | P5 | tests/e2e/f8-dashboard.spec.ts | ✅ |
| AC-P5-5 | F8 | P5 | tests/e2e/f8-dashboard.spec.ts | ✅ |
| AC-P5-6 | F9 | P5 | tests/e2e/f9-data.spec.ts | ✅ |
| AC-P5-7 | F9 | P5 | tests/e2e/f9-data.spec.ts | ✅ |
| AC-P5-8 | F9 | P5 | tests/e2e/f9-data.spec.ts | ✅ |
| AC-P5-9 | F9 | P5 | tests/e2e/f9-data.spec.ts | ✅ |

Notes on test design (per the engineers' handoff tips, all followed):
- "Today" is fixed with `page.clock.install()` to Wednesday 2026-06-17 09:00 (a weekday with Mon–Fri capacity 6), so the demo seed and all exam countdowns are deterministic.
- `page.clock.fastForward()` is used (never `runFor`) to reach timer phase ends, per P2's handoff (avoids replaying every 250ms tick).
- `Notification` is stubbed via `addInitScript`; each test gets its own browser context so `localStorage`/IndexedDB are naturally isolated (no manual clearing needed between tests).
- Every test that changes subjects/exams/topics/settings waits out the 500ms auto-replan debounce via a `plan-status` helper (`waitForPlanReady`) before asserting on blocks.
- The dashboard chart is lazy-loaded; tests wait for `focus-chart-legend` or `chart-empty` before asserting.
- Readiness percentages are checked as a 0–100 range plus a live increase (AC-P5-2), never exact numbers.
- AC-P1-8 was verified to reproduce the documented 44-pomodoro over-capacity figure at capacity 1, matching the P1 team's own finding that this number is intended (it includes the reviews of topics whose new work doesn't fit).
- AC-P1-9 / AC-P2-9 are unit-test acceptance criteria; rather than re-implement scheduler/timer unit tests in e2e, the e2e spec shells out to `npx vitest run src/logic/scheduler` / `src/logic/timer` and asserts the reported pass count meets the threshold with zero failures — this exercises the real command the AC names.
- AC-P5-3's fixed weekday (Wednesday) means only 2 of the seed's 5 sessions-days fall in the "current" Monday-start week, so the test computes the expected `focus-week` value from the seed data instead of hard-coding the design's example number (500), which assumed a Saturday "today".

## Bugs

```json
[
  {
    "id": "BUG-001",
    "feature": "F9",
    "phase_id": "P0",
    "owner": "phase-engineer",
    "severity": "minor",
    "title": "Skip link, the FocusPlan wordmark link, and the active nav link are unreachable by keyboard Tab",
    "steps": [
      "Load http://localhost:5173/today in a fresh browser context at 1280x900 (or 375x812).",
      "Without clicking anything, press Tab once.",
      "Observe which element receives focus, and keep pressing Tab and note that this element never receives focus again in the whole page's tab sequence."
    ],
    "expected": "Per screens/app-shell.md ('Skip link: the first focusable element, sr-only focus:not-sr-only, \"Skip to content\" -> #main'), the first Tab press should focus the skip link. Tabbing further should reach the FocusPlan wordmark (nav-home) and the current page's nav link (nav-today, which still needs to be reachable even though it is the active route) before reaching the other nav links.",
    "actual": "The first Tab press lands directly on the 'Week' nav link (nav-week). The skip link, nav-home and nav-today are completely absent from the page's Tab sequence (confirmed by tabbing through all 14 focusable elements on /today without ever landing on them). Reproduced consistently across multiple runs at both 375px and 1280px. This is a real regression for keyboard-only users: there is no way to skip to main content, and no way to reach the wordmark or the current-page link via keyboard.",
    "evidence": ".pipeline/qa-screenshots/BUG-001.png",
    "suspected_files": ["app/src/app/NavBar.tsx", "app/src/app/Layout.tsx"],
    "status": "open"
  }
]
```

Root-cause hint for the owning engineer: `NavBar.tsx` uses Tailwind `order-*` utilities on the wordmark link, the timer-pill wrapper and the `<nav>` element (`order-1`, `order-2 xl:order-3`, `order-3 xl:order-2`) to rearrange the mobile two-row layout. Chromium computes sequential (Tab) focus navigation for flex children by their visual `order`, not raw DOM order, which is the most likely mechanism behind the skip link / wordmark / current-link becoming unreachable — but the observed symptom (they vanish entirely rather than merely moving) suggests it's worth checking for an additional cause (e.g. an ancestor `overflow`/stacking context or a duplicate id) rather than `order` alone. This does not fail any acceptance criterion in `plan.json` (AC-P0-2 only checks click-driven navigation, not Tab order) and does not block any core flow, so it is filed as **minor**, but it is a genuine accessibility defect against the design spec and WCAG 2.4.1 (Bypass Blocks) and is worth fixing.

## Exploratory testing notes
The Playwright MCP browser server was unavailable this session ("Skipping connection (recent failure cached...)"), so exploratory testing was done by driving the app with scratch Playwright scripts (Node + the `playwright` package already installed in `app/node_modules`) against a manually started `npm run dev` server, as instructed as the fallback. The scripts themselves are not part of the repo (scratchpad only); this section reports what they found.

- **Responsive layouts, 375px and 1280px:** swept all 7 routes (`/today`, `/week`, `/setup`, `/settings`, `/dashboard`, `/data`, `/focus`) at both widths with a fixed weekday clock. Zero horizontal overflow (`document.documentElement.scrollWidth <= window.innerWidth`) on every route at both widths, and zero console/page errors across the whole sweep. Screenshots saved to `.pipeline/qa-screenshots/explore-*.png`.
- **Keyboard / accessibility basics:** confirmed the Add-task modal traps focus correctly (focus moves inside the dialog on open) and Esc closes it, returning focus as expected. Found the Tab-order issue reported as BUG-001 above.
- **Timer across refresh and a background tab:** started a focus session, fast-forwarded 5 minutes, simulated a backgrounded tab via `document.hidden = true` + a `visibilitychange` event, fast-forwarded another 5 minutes in the "background", then foregrounded it again — the countdown correctly reflected the full 10 minutes elapsed (20:00 -> 15:00) with no drift, consistent with the timestamp-based (`endsAt - now`) design. A subsequent full page reload kept the timer running at the same remaining time and the same phase (Focus), confirming `localStorage['focusplan.timer.v1']` restore works.
- **Import/export round-trip and Clear all + reload:** exported a backup, ran Clear all (confirmed), reloaded the page and confirmed the summary stayed at all zeros (no re-seed on reload, i.e. `clearAll()`'s `meta.seed` marker works as designed), then imported the previously exported backup and confirmed it restored 3 subjects / 3 exams / 12 topics.
- **Foreign network requests:** across a session visiting every route, zero requests were made to any origin other than `http://localhost:5173` (fonts are self-hosted, as the P0 handoff states).

No other bugs were found during exploratory testing.

## Console / network errors observed
- None, across the full e2e suite, the exploratory 375px/1280px sweep, and the timer/import-export scripts.
