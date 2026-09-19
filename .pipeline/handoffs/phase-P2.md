# Handoff: P2 Pomodoro timer engine and Focus screen

> Owner: phase-engineer · Status: done · Round: build

## Features delivered
| Feature | Status | Notes |
|---|---|---|
| F5 timer engine (`src/logic/timer/`) | ✅ done | A pure reducer driven by timestamps (`endsAt`, `anchorAt`, `pausedMs`). It ticks every 250 ms and on `visibilitychange`/`focus`, is mirrored to localStorage `focusplan.timer.v1` and restores on load (a phase that ended while the page was closed is completed and credited silently). It handles Focus, Short break and Long break (after every `longBreakEvery` completed focuses) with lengths from settings, plus Start, Pause, Resume, Skip, Reset and Flowtime `endFlow`. Phases **wait for Start** and never auto-start |
| F5 crediting | ✅ done | When a phase completes, one `sessions` row is written (focus and breaks). For a focus, the linked block's `completedPomodoros` is incremented and its status set to `partial`, or `done` when full. If the block is gone, the session is still saved with the topic, exam and subject captured at Start |
| F5 notifications / sound / title | ✅ done | Permission is requested on the first Start (only if it is `default` and `notificationsEnabled`), and a notification fires at each phase end. A Web Audio chime plays (primed inside the click, gated on `soundEnabled`). Every browser API call is guarded by try/catch. `document.title` reads `MM:SS · <Phase> — FocusPlan` while running or paused, and `FocusPlan` when idle |
| F5 Focus page (`/focus?blockId=`) | ✅ done | Built to screens/focus.md: the large mono countdown, one primary button at a time, `timer-phase` in sentence case (CSS uppercase), the burn line, the cycle line, the mode switch (disabled while active), the break tint, the active-block card (`timer-active-block-progress` is exactly `n/m`), the free-focus / not-found / block-complete (`timer-next-block`) / running-for-another-block (`timer-go-running`) variants, `notifications-hint`, `focus-loading` (the clock is never shown before settings load), an sr-only live region, the Space shortcut, and an error toast when a session save fails |

## Acceptance criteria self-check
Every browser check below ran against the dev server with a throwaway Playwright spec using `page.clock`. It lived in my own folder and was deleted afterwards, because `tests/e2e/**` belongs to P0.

| AC | Result | How verified |
|---|---|---|
| AC-P2-1 | pass | Browser: idle shows `25:00` / `Focus`. Start then `runFor(3s)` shows `24:57`. Pause, then `runFor(5s)` leaves the value unchanged and shows the `Paused` caption. Resume continues. Also unit test `pause freezes the value and resume continues from it` |
| AC-P2-2 | pass | Browser: `fastForward('09:57')` after 3 s gives `15:00`. After `page.reload()` it is still running at 15:00 or 14:5x. Also unit tests `start counts down from stored timestamps…` and `persists to JSON and restores a running timer…` |
| AC-P2-3 | pass | Browser: at expiry the phase is `Short break` at `05:00`. After the 4th completed focus it is `Long break` at `15:00`. Skipping a running focus leaves `completedPomodoros` unchanged. Reset gives `25:00`. Also unit tests on long-break cadence and skip/reset |
| AC-P2-4 | pass | Browser: the title matches `/^\d{2}:\d{2} · Focus — FocusPlan$/` while running and is `FocusPlan` after Reset. Unit tests cover the Focus title, the paused title and the Flowtime title |
| AC-P2-5 | pass | Browser: on `/focus?blockId=<planned 2-pomodoro block>`, one focus leads to `timer-active-block-progress` = `1/2`, the block `completedPomodoros` = 1, and one session `{kind:'focus', completed:true, plannedMinutes:25, actualMinutes:25, pomodorosCredited:1}`. The second focus leads to `2/2` and status `done`. The "Today shows 1/2" part depends on P4 and was not checked here |
| AC-P2-6 | pass | Browser: with a stubbed `Notification` granted, the created titles are `['Focus complete']`. With it denied, the hint `Notifications are off. You'll still hear the chime…` shows, the timer completes, and there are 0 page errors |
| AC-P2-7 | pass | Browser: with settings written to 50/10 in IndexedDB, idle shows `50:00`, and after expiry the break shows `10:00`. Idle lengths react live to settings changes |
| AC-P2-8 | pass | Browser: Flowtime shows `00:00`, then `20:00` after 20 min. `timer-end-flow` gives `Short break` `04:00` and one extra focus session with `actualMinutes: 20` |
| AC-P2-9 | pass | `engine.test.ts` has 13 reducer tests covering start, pause/resume, expiry, the long-break cadence, skip/reset, restore after reload, Flowtime, settings lengths and mode rules. There are 24 P2 tests in total |

## Files created / modified
All paths are under `app/`:
- `src/logic/timer/index.ts`: replaces the P0 stub. It re-exports the frozen contract plus the added exports.
- `src/logic/timer/engine.ts`: the pure reducer (`reduce`), `snapshot`, config from settings, Flowtime formulas, `formatClock`/`formatTitle`, and the persistence `parseState`/`serializeState`.
- `src/logic/timer/TimerProvider.tsx`: the provider (ticks, persistence, restore, cross-tab `storage` sync, effects, title).
- `src/logic/timer/context.ts`, `hooks.ts`: the contexts, `TimerApi`, `TimerDetails`, `useTimer`, `useTimerDetails`.
- `src/logic/timer/credit.ts`: `recordPhaseEnd` (session + block credit, idempotent), `lookupLink`, `creditedStatus`.
- `src/logic/timer/browser.ts`: guarded Notification, Web Audio chime and localStorage helpers.
- `src/logic/timer/copy.ts`: notification and live-announcement text.
- `src/logic/timer/engine.test.ts` (13), `credit.test.ts` (7, fake-indexeddb).
- `src/features/focus/FocusPage.tsx`: replaces the stub. It keeps the default export and the `<h1>`.
- `src/features/focus/ModeSwitch.tsx`, `ActiveBlockCard.tsx`, `useFocusBlock.ts`, `focusCopy.ts`, `focusCopy.test.ts` (4).

## How to run / use
Run from `app/`: `npm run dev`, then open `http://localhost:5173/focus` (free focus) or `/focus?blockId=<id>`. There are no env vars. The timer state is kept in `localStorage['focusplan.timer.v1']`, so clear that key for a fresh timer in tests.

## Interfaces exposed to other phases
The frozen contract is unchanged:
```ts
export type TimerPhase = 'focus' | 'shortBreak' | 'longBreak'
export interface TimerSnapshot { status; phase; mode; remainingMs; elapsedMs; durationMs; endsAt; blockId; completedFocusCount }
export interface TimerApi extends TimerSnapshot { start(blockId?: string | null); pause(); resume(); skip(); reset(); endFlow() }
export function TimerProvider(props: { children: ReactNode }): JSX.Element
export function useTimer(): TimerApi   // outside a provider it still returns an idle 25:00 focus with no-op actions
```
Semantics:
- `remainingMs` is rounded **up** to whole seconds and `elapsedMs` is rounded down, so `formatMs(remainingMs)` in `NavTimerPill` matches the page exactly.
- `remainingMs` is 0 during a Flowtime focus. Use `elapsedMs` there, as the pill already does.
- `start(blockId)` works only when idle. `undefined` keeps the current link and `null` means free focus.
- `reset()` also clears `completedFocusCount` and the link.
- When a phase ends, the next one is `status: 'idle'`, so the nav pill hides during an idle break. That is by design: phases wait for the user.

Added exports:
- `useTimerDetails(): TimerDetails`, which returns `{ready, settings, link, notice, announcement, saveErrorCount, notificationHint, setMode(mode), longBreakEvery, lengths}`
- `formatClock(ms)`, `formatTitle(snap)`, `displayMs(snap)`, `PHASE_TEXT`, `TIMER_STORAGE_KEY`
- the types `TimerLink`, `TimerNotice`, `TimerModeValue`, `TimerConfig`, `TimerDetails`, `NotificationHint`

**Data written (for P1, P4 and P5):**
- `sessions` rows:
  - `id = "timer:<phase>:<phaseStartedAtMs>"` (deterministic rather than a UUID, so one completion is never saved twice across StrictMode, two tabs, or a restore).
  - `completed: true` for every row.
  - Focus rows carry `blockId`/`topicId`/`examId`/`subjectId` and `pomodorosCredited`.
  - **Break rows are also written**, with `kind: 'shortBreak'|'longBreak'`, no links and 0 credit.
  - Skip and Reset write nothing.
- Block credit: `completedPomodoros += credited`, and `status` becomes `'partial'` (0 < c < m) or `'done'` (c ≥ m).

## Verification output
```
> npm run build
> tsc -b && vite build
✓ built in 543ms        (one "chunk > 500 kB" warning from vite, not an error)

> npm run test:unit
 Test Files  12 passed (12)
      Tests  165 passed (165)          # all phases; P2 alone: 3 files, 24 tests passed

> npm run lint
> oxlint                               # exit 0, no findings

> npx playwright test tests/e2e/smoke.spec.ts
  8 passed (6.2s)

Temporary P2 browser checks (deleted afterwards):
  ok AC-P2-1/2/4: idle, start, pause, resume, background gap, reload, title
  ok AC-P2-3/5/6: expiry, crediting, long break, skip, notification
  ok AC-P2-6 denied: completes, hint shown, no errors
  ok AC-P2-8 flowtime
  ok AC-P2-7 settings 50/10
  ok screens at 375 and 1280   (checked against wireframes/focus.html)
  ok fastForward expiry, break tint (rgb 220,231,242 = break-soft), Space toggles, break completed while page closed -> "Break over. Ready when you are."
```
Note: during my first build attempt, `npm run build` failed on P1's in-progress file `src/logic/scheduler/zz-dump.test.ts` (unterminated string). It was gone or fixed by the final run above.

## Open questions / cross-phase requests
- **P0 / QA (e2e in `tests/e2e/**`):** please add `tests/e2e/focus.spec.ts` for AC-P2-1…8.
  - To reach a phase end, use `page.clock.fastForward('25:01')`, which jumps and fires the due tick once. **Avoid `runFor(25 min)`**: it replays every 250 ms tick through React and takes about 30–40 s per focus in dev mode.
  - Stub `Notification` with `addInitScript` (a class with a static `permission` and `requestPermission`). Headless Chromium reports `denied` by default, so `notifications-hint` is visible unless it is stubbed.
  - Clear `localStorage['focusplan.timer.v1']` (or use a fresh context) between tests.
- **P5 (stats):** `sessions` now also contains break rows. Filter on `kind === 'focus'` for focus minutes, the chart and the streak.
- **P1 (scheduler):** the timer sets partly credited blocks to `status: 'partial'`, so a replan keeps them rather than deleting planned auto blocks with progress. Remaining-work maths should count `completedPomodoros` on kept blocks. Credits go to the deterministic auto id that was captured at Start. If a replan deletes that block mid-focus, the session is still saved with its topic, exam and subject, but no block is credited.
- **P4 (Today):** after one timer pomodoro a 2-pomodoro block is `partial` 1/2. `start-next` should treat `partial` like `planned` (the design says "next planned or partial").
- **App shell (P0), minor:** `TimerProvider` sits outside `ToastProvider`, so a failed session save shows the error toast only on `/focus`. On other routes it is logged to the console.
- **Assumption:** the Classic/Flowtime switch on /focus is per timer. It persists in the timer state (even across Reset) but is not saved to settings, as the design says. Skip during a Flowtime focus is hidden in the UI. In the reducer it moves to a break of the computed length without credit.

## Fix log (bug-fix rounds only)
| Bug ID | Root cause | Fix | Files |
|---|---|---|---|
