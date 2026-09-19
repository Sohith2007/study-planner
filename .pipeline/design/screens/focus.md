# Screen: Focus (`/focus?blockId=<id>`)

**Owner:** P2 (`src/features/focus/FocusPage.tsx`, timer engine in `src/logic/timer/`) · **Feature:** F5 · **Wireframe:** `wireframes/focus.html`

## Purpose
One block, one clock, nothing else. The student sees what they are working on and a very large countdown, with a single obvious control. The page should feel like a quiet desk: no status bar, no banners, no lists. The PlanStatusBar is **not rendered** on this route.

## Layout regions (`max-w-focus mx-auto`, vertically centred: `min-h-[70dvh] flex flex-col items-center justify-center gap-8 md:gap-10 py-8`)
The page wrapper gets a phase tint that fades over `duration-500 ease-calm`: focus is `bg-bg`, and short/long break is `bg-break-soft`. The tint covers `<main>` full-bleed (the wrapper uses `-mx-4 md:-mx-6 xl:-mx-8 px-4 md:px-6 xl:px-8`).

0. **Page heading**: a visible but quiet `<h1 tabIndex={-1} class="font-display text-heading font-semibold text-muted">Focus</h1>`, centred above the mode switch. It satisfies AC-P0-2 (the heading changes) without competing with the clock.
1. **Mode switch** (top): the segmented `timer-mode`, with `Classic` (`timer-mode-classic`) and `Flowtime` (`timer-mode-flowtime`). The helper below it (`text-small text-muted text-center max-w-sm`) reads:
   - Classic: `25-minute focus, 5-minute breaks, a 15-minute break every 4.` (values from settings)
   - Flowtime: `Focus as long as it flows. Your break is a fifth of the time you focused.`
   - The switch is disabled while running or paused, and the helper then reads `Reset the timer to switch modes.`
   - The default mode comes from `settings.timerMode`. Switching here changes only the current timer (it is not saved to settings).
2. **Phase label** (`timer-phase`): `text-caption font-semibold uppercase tracking-[0.2em]` with a leading `size-2 rounded-full` dot (`bg-accent` focus, `bg-break` breaks). The element text is **exactly** `Focus`, `Short break` or `Long break`. CSS `uppercase` handles the visual caps, so the DOM text stays sentence case for the AC.
3. **Countdown** (`timer-display`): `font-mono font-light text-timer tabular-nums text-text` with the text `25:00`. `role="timer" aria-live="off" aria-atomic="true"`. Classic counts down; Flowtime focus counts up from `00:00`. Past 99 minutes in Flowtime, show `100:00`+ (no hours).
4. **Burn line**: `w-full max-w-md h-1 rounded-full bg-sunken`, with a fill of `bg-accent` (focus) or `bg-break` (breaks) whose width = remaining/duration, shrinking. In Flowtime focus it pulses gently (`animate-pulse motion-reduce:animate-none`) at a fixed 100%. `aria-hidden="true"`.
5. **Cycle line** (`timer-cycle`): `text-small text-muted`: `Pomodoro 2 of 4 · long break after 4` (it uses `completedFocusCount % longBreakEvery + 1`). During a break: `Break · pomodoro 3 is next`. Hidden in Flowtime.
6. **Controls** (`flex items-center justify-center gap-3`):
   - Primary (one of these at a time, **lg** size `h-14 px-8 min-w-40 rounded-lg`):
     - idle focus: **`Start`** (`timer-start`, accent variant, play icon)
     - idle break: **`Start break`** (`timer-start`, primary variant)
     - running: **`Pause`** (`timer-pause`, secondary lg, pause icon)
     - paused: **`Resume`** (`timer-resume`, accent in focus, primary in breaks)
   - Flowtime focus while running or paused: an extra primary lg **`End focus`** (`timer-end-flow`), which starts the computed break. It appears only in Flowtime during a focus phase with elapsed ≥ 0. Beside it, Pause/Resume become secondary.
   - Secondary (ghost md): **`Skip`** (`timer-skip`, skip icon; `title="Go to the next phase without counting this one"`) and **`Reset`** (`timer-reset`; disabled when idle at the full duration and `completedFocusCount === 0`). Skip is hidden during a Flowtime focus.
7. **Active block card** (`timer-active-block`): `w-full rounded-xl bg-surface/70 border border-border p-4 md:p-5 flex items-center gap-4`, with the subject spine.
   - Eyebrow `WORKING ON`
   - Topic `text-lead font-medium` (`timer-active-topic`): `Derivatives`
   - Meta: subject chip `Mathematics` · `Calculus Midterm · in 10 days` · kind badge
   - Progress: pips + `timer-active-block-progress` with the text exactly **`0/2`**, followed by ` pomodoros` in a separate span (`text-muted`). The whole card contains `0/2` for AC-P2-5.
   - Right: a ghost sm link `Change` (`timer-change-block` → `/today`).
8. **Notifications hint** (`notifications-hint`), below the card, `text-small text-muted flex gap-2`, with a bell-off icon. Shown when notifications can't fire:
   - Permission denied or API missing: `Notifications are off. You'll still hear the chime and see the time in the tab title.`
   - Disabled in Settings: `Notifications are off in Settings. You'll still hear the chime and see the time in the tab title.`
   - If sound is also disabled: `…You'll still see the time in the tab title.`
   - Permission not yet requested: no hint.

## Content and copy (by state)
| State | timer-phase | timer-display | Primary button | Other |
|---|---|---|---|---|
| Idle focus (seed) | `Focus` | `25:00` | `Start` | Reset disabled |
| Running focus | `Focus` | `24:59`… | `Pause` | Skip, Reset |
| Paused | `Focus` | frozen `18:42` | `Resume` | a `Paused` caption under the time (`text-small text-muted`, `timer-paused-label`) |
| Idle short break | `Short break` | `05:00` | `Start break` | Skip, Reset; a line above the time: `Focus complete. 1 pomodoro added to Derivatives.` (`timer-complete-msg`; for free focus: `Focus complete. Logged 25 minutes.`) |
| Idle long break | `Long break` | `15:00` | `Start break` | `That's 4. Take a proper rest.` |
| Break finished (idle focus) | `Focus` | `25:00` | `Start` | `Break over. Ready when you are.` |
| Flowtime focus | `Focus` | `00:00` → counting up | `Pause` + `End focus` | the cycle line is hidden |
| Flowtime break | `Short break` | `04:00` (for 20 min of focus) | `Start break` | `Focus complete. 20 minutes logged.` |

**Active block variants**
- **Free focus** (no `blockId`): `timer-active-block` shows the eyebrow `FREE FOCUS`, the title `Not linked to a block`, the body `Minutes still count toward your stats and streak.`, and the link `Pick a block from Today` (`timer-change-block`). There is no progress element.
- **Block not found** (bad or removed id): the same as free focus, plus a `text-small text-warning` line: `That block is no longer in your plan. This session will count as free focus.`
- **Block complete** (`completed ≥ pomodoros`): progress `2/2`, a `Done` badge, and the line `Block complete.`, followed by a link `Next: Chain Rule →` (`timer-next-block` → `/focus?blockId=<next planned or partial block today>`). If there is none: `That's everything planned for today.` with a link `Back to Today`.
- **Block for a done topic**: unchanged. Timer credits still apply.

**Notifications and title** (P2):
- Focus end: title `Focus complete`, body `Nice work. Take a 5-minute break.` (a long break says `15-minute`). Break end: title `Break over`, body `Ready for the next pomodoro?`
- `document.title`: `24:59 · Focus — FocusPlan`, `04:12 · Short break — FocusPlan`, `12:00 · Long break — FocusPlan`. When paused it uses the same format with the frozen time. When idle it is `FocusPlan`. Flowtime focus uses the elapsed time: `12:34 · Focus — FocusPlan`.

## States
- **Loading:** until settings (and the block, if `blockId` is set) resolve, render `focus-loading`: a `h-3 w-24` phase skeleton, a `h-28 md:h-40 w-72 md:w-md rounded-lg` time skeleton and a `h-14 w-40` button skeleton. **Never render `25:00` before settings load**, because with settings 50/10 that would flash the wrong value (AC-P2-7).
- **Empty:** there is no empty state. Free focus is the "no block" state.
- **Error:** if writing the session fails, show an error toast `Couldn't save this session. Your time is still shown; try again from Today.` The timer continues. A read error shows `page-error`.
- **Success:** the phase end triggers the chime, the notification, the `timer-complete-msg` and an sr-only live announcement (see accessibility.md).

## Responsive
- **375:** `text-timer` resolves to 88px (the clamp minimum), so `25:00` is about 264px wide. The mode switch is full width (`w-full`, options `flex-1`). The primary control is full width `w-full h-14`, with Skip and Reset side by side below it (each `flex-1`). The active block card sits under the controls, and the Change link wraps below the meta.
- **768:** the time is 154px (20vw). The controls are in one row: `[Skip] [Start] [Reset]` with the primary in the middle.
- **1280:** the time is capped at 160px. The same one-row layout. The page is vertically centred in the viewport, below the nav.

## Interactions
- **Start** (first time in the session): call `Notification.requestPermission()` if the state is `default` and `settings.notificationsEnabled`. Don't block the timer on the answer. Also resume/create the `AudioContext` inside the click handler (autoplay policy).
- **Space** toggles Start/Pause/Resume when `document.activeElement` is `body` or the timer panel (not inside inputs or buttons). **Esc** does nothing. There are no other shortcuts.
- **Mode switch:** radios with arrow keys. Changing it resets the idle display (`25:00` ↔ `00:00`).
- **Route changes** keep the timer running (the provider is at the root). The `nav-timer` pill appears elsewhere.
- **Reload:** restore from `localStorage` `focusplan.timer.v1`. A phase that ended while the page was closed is completed and credited on load, and the next phase shows idle with `timer-complete-msg`.
- **blockId in the URL** while a different block's timer is running: keep the running timer and show a warning banner in the card: `A timer is running for Chain Rule. Reset it to switch to Derivatives.`, with the ghost button `Go to running block` (`timer-go-running`).

## data-testid
`timer-mode` (the radiogroup), `timer-mode-classic`, `timer-mode-flowtime`, `timer-phase`, `timer-display`, `timer-cycle`, `timer-paused-label`, `timer-complete-msg`, `timer-start`, `timer-pause`, `timer-resume`, `timer-skip`, `timer-reset`, `timer-end-flow`, `timer-active-block`, `timer-active-topic`, `timer-active-block-progress`, `timer-change-block`, `timer-next-block`, `timer-go-running`, `notifications-hint`, `focus-loading`.

> **QA note:** `timer-mode` is the radiogroup container and carries `data-mode="classic|flowtime"` for assertions. To switch, click `timer-mode-flowtime` (or `timer-mode-classic`). Each option is a `role="radio"` button with `aria-checked`.
