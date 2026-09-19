# FocusPlan Design System: "Paper & Ink"

> Author: ui-ux-designer · Date: 2026-09-19 · Stack: Vite + React 19 + Tailwind CSS 4
> Source of truth for values: `tokens.json`. This document explains how to use them.
> The build-product templates folder has no design template, so this package follows the structure in the designer brief.

## 1. Brand direction

**Calm · Decisive · Honest**

| Adjective | Why (persona / USP) | What it means in the UI |
|---|---|---|
| **Calm** | Maya (16) loses focus to distraction (48% of procrastinators cite it). Aarav feels overwhelmed. The product has to lower anxiety instead of adding noise. | A warm paper background, one tomato accent reserved for the act of focusing, generous whitespace, no confetti and no red "overdue" alarms. The Focus page is nearly empty: just the time. |
| **Decisive** | 40% of procrastinators "don't know where to start". USP #1 and #2: the plan *is* the timer queue. | Every screen has one obvious next action ("Start next", "Start", "Add subject"). Today leads with a single *Up next* card. We tell the student what to do, not just what exists. |
| **Honest** | Competitors hide paywalls and ads, and planners silently drop work. USP #3 surfaces over-capacity, and USP #5 means the data is the student's. | Over-capacity is stated plainly with numbers and fixes. Destructive dialogs say exactly what will be deleted. Data lives locally, and the Data page says so. Readiness is a real percentage, not a vanity score. |

**How we differ from competitors.** Pomofocus is a red full-screen timer with ads. Forest is cartoon trees. My Study Life is a dense blue calendar. Notion templates are pastel collages. FocusPlan looks like a **well-kept exam notebook**: warm paper (`bg`), pine-green ink (`primary`), a serif headline face (Fraunces) for a scholarly tone, a monospaced, tabular timer (IBM Plex Mono Light), and one tomato-red accent that appears only when you are actually focusing.

**Signature elements** (use these consistently; they are what make the product recognisable):
1. **Subject spine.** Every block card has a 4px left edge in the subject colour, like the coloured tab on a notebook divider.
2. **Pomodoro pips.** Planned pomodoros are drawn as small tomato-outline circles, filled when completed (`●●○`). They always sit next to the `n/m pomodoros` text and never replace it.
3. **Burn line.** On Focus, a 4px horizontal line under the countdown shrinks from right to left as time passes. It is calmer than a ring.
4. **Ticket stub exam cards.** Dashboard exam cards have a large mono days-left numeral on the left, separated by a dashed divider.
5. **Eyebrows.** Small uppercase `text-caption tracking-wider text-muted` labels above headings ("UP NEXT", "WORKING ON", "THIS WEEK").

## 2. Principles

1. **One next action per screen.** There is only one primary (filled) button in view at a time. Everything else is secondary or ghost.
2. **The plan moves itself, visibly.** The plan rebuilds automatically about 0.5 s after any change to subjects, exams, topics or settings. The Plan status bar shows "Updating plan…" while this happens, so a change never looks like it did nothing. "Replan" stays available as a manual action.
3. **Numbers are text first.** Every count that QA or a screen reader needs is real text (`0/2 pomodoros`, `42%`, `in 10 days`). Visual forms (pips, bars) are decorative extras marked `aria-hidden="true"`.
4. **Quiet by default, loud only for problems.** Warning and danger colours are reserved for things that need action (over capacity, validation errors, destructive actions). Missed work is described as "moved", never as "failed".
5. **Local and reversible where possible.** Destructive actions always confirm and name the exact objects. Import and clear always offer "Export first".

## 3. Tokens

All values live in `tokens.json`. P0 implements them in `src/index.css`:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

:root { --fp-bg:#F6F4EF; --fp-surface:#FFFDF9; /* …all of cssVariables[":root"] */ }
.dark { --fp-bg:#161512; --fp-surface:#1F1E1A; /* …all of cssVariables[".dark"] */ }

@theme inline {
  --color-bg: var(--fp-bg);  /* …all of tailwindTheme.variables */
}
```

Because every colour is a variable that swaps under `.dark`, components **never** use `dark:` variants. Dark mode follows `prefers-color-scheme`. P0 toggles `document.documentElement.classList` on load and on media-query change. There is no toggle UI.

### 3.1 Colour (semantic)

| Token (Tailwind) | Light | Dark | Role |
|---|---|---|---|
| `bg` | `#F6F4EF` | `#161512` | Page background |
| `surface` | `#FFFDF9` | `#1F1E1A` | Cards, dialogs, nav, inputs |
| `sunken` | `#EFECE4` | `#292823` | Wells, skeletons, segmented tracks, past days |
| `text` | `#1C1B19` | `#EDEAE2` | Body text |
| `muted` | `#5F5B53` | `#A8A294` | Secondary text |
| `border` | `#DDD8CC` | `#34322C` | Decorative outlines |
| `border-strong` | `#8A8478` | `#77726A` | Input and control outlines (≥3:1) |
| `primary` / `-hover` / `-soft` / `on-primary` | `#1F5C4A` / `#174A3B` / `#DCEBE4` / `#FFFFFF` | `#6FC2A6` / `#8AD3BA` / `#1E3B32` / `#0F2A22` | Actions, links, active nav, focus ring, New badge |
| `accent` / `-hover` / `-soft` / `on-accent` | `#C23E22` / `#A3321A` / `#F8E4DC` / `#FFFFFF` | `#F07A5C` / `#F4957D` / `#3E2219` / `#1C0B06` | Focus-phase only: timer Start, burn line, pips, exam-day marker, nav timer pill |
| `success` / `-soft` | `#45700F` / `#E4EFD3` | `#9CCB5E` / `#26341A` | Done, Covered, 100% readiness |
| `warning` / `-soft` | `#9A5B00` / `#FBEBC8` | `#E8B04A` / `#3D3017` | Partial, over-capacity |
| `danger` / `-hover` / `-soft` | `#A8233A` / `#8C1B2F` / `#F8DEE2` | `#F2788C` / `#F595A5` / `#3E1F25` | Destructive, validation errors |
| `break` / `-soft` | `#2D5B86` / `#DCE7F2` | `#7FB0DE` / `#1C2C3C` | Break phases, Review badge, catch-up notice |
| `overlay` | `rgb(28 27 25/.45)` | `rgb(0 0 0/.6)` | Modal backdrop |

**Subject colours** are user data. There are 8 presets: Indigo `#6366F1`, Amber `#F59E0B`, Emerald `#10B981`, Rose `#F43F5E`, Sky `#0EA5E9`, Violet `#8B5CF6`, Orange `#F97316`, Slate `#64748B`. The seed uses the first three. Apply them only through `style={{ backgroundColor: subject.color }}` on dots, spines, swatches and chart fills, and always next to the subject name in text.

**Accent discipline.** `accent` (tomato) never appears on Setup, Settings or Data except as the exam-day marker. If you are about to use it for a generic CTA, use `primary` instead.

### 3.2 Typography

| Utility | Size / line height | Family / weight | Used for |
|---|---|---|---|
| `text-timer` | clamp(88px, 20vw, 160px) / 1 | `font-mono font-light tabular-nums tracking-[-0.02em]` (letter spacing comes from the token) | Focus countdown only |
| `text-stat` | 40 / 1 | `font-mono font-normal tabular-nums` | Dashboard tile numbers, days-left numeral |
| `text-display` | 36 / 40 | `font-display font-semibold` | h1 at md and up |
| `text-title` | 24 / 32 | `font-display font-semibold` | h1 at 375, dialog titles, exam card names |
| `text-heading` | 20 / 28 | `font-sans font-semibold` | h2 section and card headings |
| `text-lead` | 18 / 28 | `font-sans font-medium` or regular | Page subtitle (regular, `text-muted`), Up next topic (medium) |
| `text-body` | 16 / 24 | `font-sans` 400; 500 for buttons | Default |
| `text-small` | 14 / 20 | `font-sans` 400/500 | Meta, helper, error |
| `text-caption` | 12 / 16 | `font-sans font-semibold uppercase tracking-wider` for eyebrows; 500 normal case for badges | Eyebrows, badges, ticks |

Rules: every page h1 is `font-display text-title md:text-display font-semibold text-text`. Numbers that change over time (timer, counts, minutes, percentages) use `tabular-nums`. Never use more than two weights on a single card.

**Font loading.** AC-P5-9 forbids network requests to other origins, so fonts must be self-hosted from `app/public/fonts/` using the `@font-face` rules in `tokens.json → fontFaces` (the files come from Google Fonts and are OFL-licensed). Do not use `fonts.googleapis.com` in the app. Only the static wireframes use it.

### 3.3 Spacing, sizing, layout
- Base 4px (Tailwind 4 `--spacing: 0.25rem`). Allowed steps: `0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24`.
- Page gutters: `px-4 md:px-6 xl:px-8`. Vertical padding: `py-6 md:py-8`.
- Containers: `max-w-page` (72rem) for Today, Week and Dashboard; `max-w-form` (48rem) for Setup, Settings and Data; `max-w-focus` (40rem) for Focus; `max-w-dialog` (30rem) for modals. Always use `mx-auto w-full`.
- Card padding `p-4 md:p-5`. Stack gap `gap-4 md:gap-6`. In-row gap `gap-2` or `gap-3`.
- Controls: `h-9` (sm, dense desktop only), `h-11` (md, default, 44px touch), `h-14` (lg, Start next and timer control). Icon buttons `size-11` (`size-9` for dense desktop).

### 3.4 Radii, shadows, motion
- Radii: `rounded-sm` 6 (badges), `rounded-md` 10 (buttons, inputs, block cards), `rounded-lg` 16 (cards), `rounded-xl` 24 (dialogs, Up next, timer panel), `rounded-full` (chips, pills, toggles).
- Shadows: `shadow-card` (resting cards), `shadow-raised` (menus, dragging card, toasts), `shadow-overlay` (dialogs). Avoid stacking a shadow and a strong border; cards use `border border-border shadow-card`.
- Motion: `duration-150` (hover, focus), `duration-200` (menus, toasts), `duration-300` (dialogs, banners), `duration-500 ease-calm` (Focus phase tint). The easings are `ease-standard` for entering and `ease-exit` for leaving. Add `motion-reduce:transition-none motion-reduce:animate-none` to anything that moves.

## 4. Components

Every component lives in `src/components/ui/` (P0) unless noted. Focus styling is global: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`, set in the base layer as `:focus-visible { outline: 2px solid var(--fp-primary); outline-offset: 2px }`.

### 4.1 Button
**Anatomy:** optional leading icon (16px, `aria-hidden`), label, optional trailing count. The `<button>` or router `<Link>` gets the same classes.

Base: `inline-flex items-center justify-center gap-2 rounded-md font-sans font-medium text-body transition-colors duration-150 ease-standard select-none disabled:cursor-not-allowed motion-reduce:transition-none`

| Variant | Classes | Use |
|---|---|---|
| primary | `bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-hover disabled:bg-sunken disabled:text-muted` | The single main action |
| accent | `bg-accent text-on-accent hover:bg-accent-hover disabled:bg-sunken disabled:text-muted` | Only `timer-start` / `timer-resume` on /focus during a focus phase |
| secondary | `bg-surface text-text border border-border-strong hover:bg-sunken disabled:text-muted disabled:border-border` | Alternatives (Skip, Cancel, Add task) |
| ghost | `bg-transparent text-primary hover:bg-primary-soft disabled:text-muted` | Tertiary and inline actions (Edit, Change, Reset) |
| danger | `bg-danger text-on-primary hover:bg-danger-hover disabled:bg-sunken disabled:text-muted` | Confirm destructive actions |
| danger-ghost | `bg-transparent text-danger hover:bg-danger-soft` | Delete triggers in lists |

Sizes: `sm` `h-9 px-3 text-small`, `md` `h-11 px-4`, `lg` `h-14 px-6 text-lead rounded-lg`, `icon` `size-11 p-0` (plus `aria-label`).

States: **hover** as above. **focus-visible** uses the global ring. **pressed** `active:translate-y-px motion-reduce:translate-y-0`. **disabled** uses the `disabled:` classes plus the `disabled` attribute (not only `aria-disabled`). **loading** swaps the label for "Saving…" / "Replanning…" (the text is specified per screen), sets `aria-busy="true"`, and disables the button. Padding stays the same.

### 4.2 Input (Field)
**Anatomy:** `<label>` (text-small font-medium text-text), control, helper text (text-small text-muted) *or* error text (text-small text-danger, with a 16px alert icon). The field wrapper is `flex flex-col gap-1.5`.

Control: `h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-body text-text placeholder:text-muted transition-colors duration-150 hover:border-text focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-0 focus-visible:border-primary disabled:bg-sunken disabled:text-muted`

- **Error:** `border-danger` plus `aria-invalid="true"` plus `aria-describedby="<id>-error"`. The error `<p id="<id>-error" class="text-small text-danger">` carries `data-testid="<field-testid>-error"`.
- **Number inputs:** `inputmode="numeric" class="... tabular-nums text-right"` with an explicit `min`, `max` and `step=1`. Validate on blur and on submit, not on every keystroke.
- **Textarea** (quick-add): the same classes with `min-h-32 py-2 font-mono text-small` so lines read as a list.
- **Select:** the same classes plus `appearance-none pr-9` and an inline chevron icon.
- **Date:** a native `<input type="date">` with the same classes. Its value is `YYYY-MM-DD`.
- **Toggle (switch):** `button role="switch" aria-checked` with a track `h-6 w-11 rounded-full bg-border-strong aria-checked:bg-primary`, a thumb `size-5 rounded-full bg-surface shadow-card translate-x-0.5 aria-checked:translate-x-5.5 transition-transform duration-150` (the thumb travels 2px → 22px, leaving a 2px inset on both sides of the 44px track), and a label to its right.
- **Segmented control** (mode, confidence, partial count): `role="radiogroup"` with a track `inline-flex rounded-full bg-sunken p-1`. Options are `role="radio"` with `h-9 px-4 rounded-full text-small font-medium text-muted aria-checked:bg-surface aria-checked:text-text aria-checked:shadow-card`. Arrow keys move the selection.

### 4.3 Card
`rounded-lg border border-border bg-surface shadow-card p-4 md:p-5`
- **Header:** `flex items-start justify-between gap-3 mb-4`, with the h2 `text-heading font-semibold` and an optional eyebrow above it.
- **Variants:** `interactive` (`hover:border-border-strong transition-colors duration-150`), `sunken` (`bg-sunken border-transparent shadow-none`), `danger-zone` (`border-danger/40`).
- **Hero card** (Up next and timer panel): `rounded-xl p-5 md:p-8`.

### 4.4 Badge and chips
Base: `inline-flex items-center gap-1 h-6 px-2 rounded-sm text-caption font-medium`

| Badge | Classes | Text |
|---|---|---|
| New | `bg-primary-soft text-primary` | `New` |
| Review | `bg-break-soft text-break` | `Review` |
| Task | `bg-sunken text-text border border-border` | `Task` |
| Done | `bg-success-soft text-success` + check icon | `Done` |
| Partial | `bg-warning-soft text-warning` | `Partial` |
| Skipped | `bg-sunken text-muted line-through` | `Skipped` |
| Covered | `bg-success-soft text-success` + check icon | `Covered` |
| Pinned | `bg-sunken text-muted` + pin icon | `Pinned` |

**Subject chip:** `inline-flex items-center gap-1.5 text-small text-muted`, with a dot `size-2.5 rounded-full` (inline style bg = subject colour) followed by the subject name.

**Pomodoro pips:** `flex gap-1` of `size-2.5 rounded-full border-[1.5px] border-accent`, filled (`bg-accent`) for completed ones, always `aria-hidden="true"`. If there are more than 8, show 8 pips and then "+N".

### 4.5 Nav (NavBar, P0)
**Anatomy:** wordmark, then 7 links in the order Today, Week, Focus, Setup, Settings, Dashboard, Data, then the timer pill.
- Bar: `sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-border`. The inner wrapper is `max-w-page mx-auto px-4 md:px-6 xl:px-8 flex items-center gap-4 h-14`.
- Wordmark: `font-display text-heading font-semibold text-text` "FocusPlan", preceded by a `size-2 rounded-full bg-accent` dot, linking to `/today` (`data-testid="nav-home"`).
- Link: `h-9 px-3 rounded-full text-small font-medium text-muted hover:text-text hover:bg-sunken`. **Active:** `aria-current="page"`, `bg-primary-soft text-primary`.
- **375:** the bar is two rows. Row 1 holds the wordmark and the timer pill. Row 2 holds the links in a single horizontally scrollable strip (`overflow-x-auto no-scrollbar snap-x`), and the active link scrolls into view on route change. All 7 links always exist in the DOM exactly **once**. Never render a second copy for mobile (duplicate `nav-*` test ids break QA).
- **Timer pill** (`data-testid="nav-timer"`): visible only when the timer is running or paused *and* the route is not `/focus`. It is a `Link` to `/focus` (keeping `?blockId` if one is active) styled `h-8 px-3 rounded-full bg-accent text-on-accent text-small font-mono tabular-nums` (during breaks, `bg-break text-on-primary`). Its text is `12:34 · Focus`, or `Paused · 12:34` when paused.
- Test ids: `nav-today`, `nav-week`, `nav-focus`, `nav-setup`, `nav-settings`, `nav-dashboard`, `nav-data`.

### 4.6 Plan status bar (P1, `PlanStatusBar`)
It sits directly under the nav on every route **except `/focus`**, where it is not rendered, to keep that page distraction-free. Wrapper: `max-w-page mx-auto px-4 md:px-6 xl:px-8 pt-3 flex flex-col gap-2`.
1. **Status row** (`data-testid="plan-status"`): `flex items-center justify-between gap-3 text-small text-muted`.
   - Left: `aria-live="polite"` text. It reads `Updating plan…` with a 12px spinner while a debounced or manual replan is running, and `Plan up to date · rebuilt 2 min ago` otherwise. The time is relative, from `meta.plan.lastPlannedAt`. It shows `just now` under 1 minute and `Plan not built yet` if there is no meta.
   - Right: `replan-button`, a secondary `sm` button labelled `Replan` with a refresh icon. While running it reads `Replanning…` and is disabled. When done it shows a toast: `Plan rebuilt`.
2. **Catch-up notice** (`catchup-notice`): shown when `meta.plan.lastCatchUp.movedCount > 0` and it hasn't been dismissed this session. Wrapper `flex items-start gap-3 rounded-lg bg-break-soft text-break px-4 py-3`. The message element with `data-testid="catchup-notice"` contains **exactly** `Moved 2 missed blocks` (singular: `Moved 1 missed block`). A sibling `text-small` line reads `They're now on today or later, still before their exams.` It has a dismiss icon button `catchup-dismiss` (aria-label `Dismiss`).
3. **Over-capacity banner** (`overcapacity-banner`): shown when `meta.plan.overflow` is non-empty. It has `role="alert"` on first appearance only (after that `role="status"`, to avoid repeated announcements) and the classes `rounded-lg bg-warning-soft border border-warning/30 px-4 py-3`.
   - Title (`text-body font-semibold text-text`): `<span data-testid="overcapacity-total">14</span> pomodoros don't fit before your exams`, singular `1 pomodoro doesn't fit…`.
   - List (`text-small text-text`), one `<li data-testid="overcapacity-item">` per exam: `Calculus Midterm: 6 unscheduled`.
   - Actions: `trim-reviews`, a secondary sm button `Trim reviews`, with helper text `Drops the +7 day review` (always the largest remaining offset, e.g. `+7`). It is disabled when `reviewOffsets` is empty, with the helper `No reviews left to trim`. After it runs, the toast says `Removed the +7 day review. Plan rebuilt.` Next to it is `overcapacity-settings-link`, a ghost `Link` to `/settings` labelled `Raise daily capacity`.

### 4.7 Modal (Dialog)
- Backdrop: `fixed inset-0 z-50 bg-overlay grid place-items-center p-4`, fading in over `duration-300`.
- Panel: `w-full max-w-dialog rounded-xl bg-surface shadow-overlay p-6 flex flex-col gap-4`. At 375 it is a bottom sheet: `self-end rounded-b-none` spanning the full width.
- Anatomy: title `h2 font-display text-title font-semibold`, body `text-body text-muted`, optional fields, and a footer `flex flex-col-reverse gap-2 md:flex-row md:justify-end` with the secondary button (Cancel) first in DOM order after the reverse, and the primary or danger button last.
- Behaviour: `role="dialog" aria-modal="true" aria-labelledby`. Focus is trapped, and Esc equals Cancel. Initial focus goes to the first field. For destructive confirms it goes to **Cancel**. Closing returns focus to the trigger. Clicking the backdrop equals Cancel, except in forms with unsaved input.
- **Confirm dialog** (shared, P0 `Modal` confirm mode): `data-testid="confirm-dialog"`, buttons `confirm-cancel` (secondary, "Cancel") and `confirm-ok` (danger or primary, with a label specific to the action, set per screen).

### 4.8 Toast
- Region: `fixed z-60 bottom-4 inset-x-4 md:inset-x-auto md:right-6 md:bottom-6 flex flex-col gap-2 md:w-96`, containing `aria-live="polite"`.
- Toast (`data-testid="toast"`): `rounded-lg bg-text text-bg shadow-raised px-4 py-3 text-small flex items-start gap-3`. This is an inverted ink chip that reads well on paper. It enters with `translate-y-2 opacity-0 → 0/100` over `duration-200 ease-standard`.
- Variants: `success` (check icon in `text-primary-soft`), `error` (`bg-danger text-on-primary`, `role="alert"`, stays 8 s, has a close button), `info`.
- Auto-dismiss after 4 s. Pause the timer on hover or focus. At most 3 are shown and the oldest drops first. The text is plain: `Settings saved`, `Plan rebuilt`, and so on (listed per screen).

### 4.9 Empty state
`flex flex-col items-center text-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface px-6 py-10 md:py-12`
- Anatomy: a 48px line illustration in `text-muted` (an open notebook for no data, a closed notebook with a check for all done, a calendar for an empty week), title `font-display text-heading md:text-title font-semibold text-text`, body `text-body text-muted max-w-sm`, then one primary CTA and an optional ghost CTA.
- The container carries the screen's `*-empty` test id. The copy is specified per screen.

### 4.10 Loading skeleton
- Block: `rounded-md bg-sunken animate-pulse motion-reduce:animate-none`. Text lines are `h-4`, titles `h-6 w-2/3`, cards `h-24 rounded-lg`.
- The page container has `aria-busy="true"` and the skeleton wrapper carries `data-testid="<page>-loading"` and an `sr-only` "Loading…" label.
- Show skeletons only while `useLiveQuery` returns `undefined`. Never show one for less than a frame; no artificial delay.

### 4.11 Error state (page level)
`rounded-lg border border-danger/40 bg-danger-soft p-5 flex flex-col gap-3`, `role="alert"`, `data-testid="page-error"`.
- Title `text-heading font-semibold text-text`: `We couldn't read your study data`
- Body `text-body text-text`: `Your browser blocked local storage. This can happen in private windows. Reload to try again. Nothing has been changed.`
- Button: secondary `Reload` (`error-reload`) → `location.reload()`.
- Use this when a Dexie query throws (wrap pages in an error boundary). Action-level errors use an error toast instead.

### 4.12 Product components

**BlockRow** (Today, P4). This is an `<li data-testid="today-block" data-block-id data-status data-kind>`:
`relative flex flex-col gap-3 rounded-md border border-border bg-surface pl-5 pr-4 py-4 shadow-card md:flex-row md:items-center`
- The spine is `absolute left-0 inset-y-0 w-1 rounded-l-md` with inline bg set to the subject colour (the `muted` colour for tasks with no subject).
- Content: title `block-title` (`text-body font-medium text-text`), then a meta row `flex flex-wrap items-center gap-x-3 gap-y-1`: `block-kind` badge, subject chip `block-subject`, exam name `text-small text-muted`, `block-covered` badge when the topic is covered, `block-status` badge when the status is not planned, and progress `block-progress` (pips followed by `text-small font-mono tabular-nums` text `0/2 pomodoros`).
- Actions (`flex items-center gap-2 md:ml-auto`): `block-start` (secondary sm, play icon, `Start`), `block-done` (ghost sm `Done`), `block-partial` (ghost sm `Partial`), `block-skip` (ghost sm `Skip`), and `block-menu` (icon button, "More actions for Derivatives", which opens a menu with `block-edit` `Edit`, `block-move` `Move`, `block-delete` `Delete`).
- States:
  - planned: default.
  - partial: `Partial` badge, progress `1/2 pomodoros`, actions unchanged.
  - done: `bg-sunken shadow-none`, title `line-through text-muted`, `Done` badge, progress `2/2 pomodoros`, and Start/Done/Partial/Skip replaced by a ghost `Undo` (`block-undo`, which sets the status back to planned; completed pomodoros are unchanged, since the timer owns those).
  - skipped: `bg-transparent border-dashed`, title `text-muted`, `Skipped` badge, only `Undo` and the menu.
  - Up next highlight: the target block gets `border-primary ring-1 ring-primary`.

**BlockCard** (Week, P4). This is `<div data-testid="block-card" data-block-id data-status data-kind draggable="true" tabindex="0" role="button">`:
`relative rounded-md bg-surface border border-border pl-3 pr-2 py-2 shadow-card text-small cursor-grab active:cursor-grabbing hover:border-border-strong`, with a spine `absolute left-0 inset-y-0 w-1 rounded-l-md` (the same as BlockRow), the title with `line-clamp-2 font-medium`, and a row containing the badge and `0/2` (`font-mono tabular-nums text-caption text-muted`, and `aria-label="0 of 2 pomodoros"`).
- Dragging: the source gets `opacity-50`, and the target column `outline-2 outline-dashed outline-primary bg-primary-soft`.
- Status styling matches BlockRow.

**ExamCard** (Dashboard, P5). The ticket stub is described in `screens/dashboard.md`.

**Timer panel** (Focus, P2). See `screens/focus.md`.

**StatTile** (Dashboard): `rounded-lg border border-border bg-surface p-4 md:p-5 flex flex-col gap-1`, with an eyebrow label, a number `font-mono text-stat tabular-nums text-text` (the element carrying the test id holds only the number), a unit `text-small text-muted`, and a sub line `text-small text-muted`.

**Progress bar** (readiness, burn line): track `h-2 rounded-full bg-sunken overflow-hidden` with a fill of `bg-primary` (`bg-success` at 100%) and `transition-[width] duration-300`. It uses `role="progressbar" aria-valuemin=0 aria-valuemax=100 aria-valuenow`. The burn line is `h-1` and uses `bg-accent` (focus) or `bg-break` (breaks).

## 5. States matrix (applies to every screen)

| State | Pattern | Test id |
|---|---|---|
| Loading | Skeleton (4.10) | `<page>-loading` |
| Empty | Empty state (4.9) | `<page>-empty` |
| Error (read) | Page error (4.11) | `page-error` |
| Error (action) | Error toast, plus inline field errors for validation | `toast`, `<field>-error` |
| Success | Toast, with inline update via live query | `toast` |
| Plan updating | Status row "Updating plan…" | `plan-status` |

## 6. Copy voice
- Second person, present tense, sentence case, and no exclamation marks.
- Counts are always real numbers with correct plurals (`1 pomodoro`, `2 pomodoros`, `1 missed block`).
- Dates: `Sat 19 Sep` in lists, `Saturday, 19 September 2026` for the Today heading, and ISO strings only in URLs and test ids. Use `date-fns` `format(d, 'EEE d MMM')` and `format(d, 'EEEE, d MMMM yyyy')`.
- Countdown: `today`, `tomorrow`, `in N days` (N ≥ 2), and `N days ago` for past exams. AC-P3-2 requires `in 12 days`.
- Say "moved", not "missed"/"failed", except in the catch-up notice text fixed by the AC.

## 7. Accessibility summary
All text and token pairs meet WCAG AA (see `accessibility.md` for the ratios). Every control has a visible label or an `aria-label`. Focus is always visible (a 2px primary outline). The timer announces phase changes, not seconds. Drag-and-drop always has the Move dialog as an alternative. Hit targets are ≥44px at 375 (`h-11`). Reduced motion is respected.
