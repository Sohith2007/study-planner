# Screen: App shell (Layout + NavBar + Plan status bar)

**Owners:** P0 (`src/app/Layout`, `NavBar`), P1 (`PlanStatusBar`, `PlanSync`) · **Routes:** all · **Wireframe:** the shell appears in every `wireframes/*.html`

## Purpose
This is the persistent frame. It gives navigation between the 7 routes, keeps the running timer reachable, and makes automatic plan rebuilding visible.

## Layout regions (top to bottom)
1. **NavBar** (`<header>` containing `<nav aria-label="Main">`): sticky, `bg-surface/90 backdrop-blur border-b border-border`, height `h-14` per row. It holds the wordmark, the 7 links and the timer pill (design-system §4.5).
2. **PlanStatusBar** (P1): status row, catch-up notice, over-capacity banner (design-system §4.6). It is **not rendered on `/focus`**.
3. **`<main id="main">`**: `mx-auto w-full px-4 md:px-6 xl:px-8 py-6 md:py-8`. The page sets its own max width.
4. **Toast region**: fixed bottom right (bottom and full width at 375).
5. **Skip link**: the first focusable element, `sr-only focus:not-sr-only`, "Skip to content" → `#main`.

`<PlanSync/>` renders nothing.

## Components used
Nav, Button (secondary sm, ghost), Badge, Toast, and the banner patterns from design-system §4.6.

## Content and copy
| Element | Copy |
|---|---|
| Wordmark | `FocusPlan` |
| Nav links | `Today` `Week` `Focus` `Setup` `Settings` `Dashboard` `Data` |
| Timer pill | `18:42 · Focus`, `03:10 · Short break`, `12:00 · Long break`, or `Paused · 18:42` |
| Plan status | `Updating plan…` / `Plan up to date · rebuilt just now` / `Plan up to date · rebuilt 5 min ago` / `Plan not built yet` |
| Replan | `Replan` → `Replanning…` → toast `Plan rebuilt` |
| Replan failure | error toast `Couldn't rebuild the plan. Your blocks are unchanged. Try Replan again.` |
| Catch-up | `Moved 2 missed blocks` + `They're now on today or later, still before their exams.` |
| Over-capacity | `14 pomodoros don't fit before your exams` · items `Calculus Midterm: 6 unscheduled` · `Trim reviews` (helper `Drops the +7 day review`) · `Raise daily capacity` |
| Overflow reason `exam-passed` | item text `Mechanics Test: 2 unscheduled (exam date has passed)` |
| Document title | `FocusPlan` when idle; `MM:SS · Focus — FocusPlan` while the timer runs (set by P2 on every route) |

## States
- **Loading (bootstrap):** before `seedIfEmpty()` resolves, render nothing. The body is `bg-bg`, which avoids a flash. There is no spinner, because it takes well under 300 ms.
- **Plan updating:** the status row shows a spinner and `Updating plan…`. This appears about 0.5 s after any change to subjects, exams, topics or settings (the debounce) and stays for the length of the replan. The `replan-button` is disabled in the meantime.
- **Catch-up / over-capacity:** see the copy above. Both can show at once, with the notice first.
- **Error:** page-level `page-error` (design-system §4.11) is rendered inside `<main>` by an error boundary. The nav stays usable.
- **Unknown route:** redirect to `/today` (`<Navigate to="/today" replace />`).

## Responsive
- **375:** the nav is two rows. Row 1 holds the wordmark (left) and the timer pill (right). Row 2 is the horizontally scrolling link strip with `gap-1`, fading edges (`mask-image` linear-gradient) and the active link scrolled into view. The status row stacks: text on top, and `Replan` right-aligned on the same line if it fits. Banners are full width, and the over-capacity actions stack vertically as full-width buttons.
- **768:** the nav is still two rows, but all 7 links fit without scrolling.
- **1280:** a single row: the wordmark, the links centred (`mx-auto`), and the timer pill at the right. The status bar is aligned to `max-w-page`.

## Interactions
- Link navigation is client-side (`NavLink`). The active link has `aria-current="page"`.
- On route change, move focus to the page `<h1>` (`tabIndex={-1}`) and scroll to the top.
- The catch-up dismiss is session-only (React state in `PlanStatusBar`). It reappears if a later catch-up moves more blocks (keyed by `lastCatchUp.at`).
- **Trim reviews:** `saveSettings({ reviewOffsets: offsets without max })`. PlanSync's debounce then replans, or call `replan()` directly for immediacy.

## data-testid
`nav-home`, `nav-today`, `nav-week`, `nav-focus`, `nav-setup`, `nav-settings`, `nav-dashboard`, `nav-data`, `nav-timer`, `plan-status`, `replan-button`, `catchup-notice` (the message span only, exact text), `catchup-dismiss`, `overcapacity-banner`, `overcapacity-total`, `overcapacity-item`, `trim-reviews`, `overcapacity-settings-link`, `toast`, `page-error`, `error-reload`, `confirm-dialog`, `confirm-ok`, `confirm-cancel`.
