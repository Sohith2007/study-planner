# Screen: Week (`/week?start=YYYY-MM-DD`)

**Owner:** P4 (`src/features/planner/WeekPage.tsx`) · **Feature:** F4 · **Wireframe:** `wireframes/week.html`

## Purpose
Shows the shape of the week at a glance: how the plan spreads subjects across days, where the exams fall, and which days are full. It is also the place to rearrange blocks by dragging them.

## Layout regions (`max-w-page mx-auto`)
1. **Header** (`flex flex-col gap-4 md:flex-row md:items-end md:justify-between`):
   - Left: eyebrow `WEEK OF`, h1 `Week`, and the range `week-range` `14 – 20 Sep 2026` (`text-lead text-muted`). Across months: `28 Sep – 4 Oct 2026`. Across years: `29 Dec 2026 – 4 Jan 2027`.
   - Right: a button group: `week-prev` (icon button, chevron-left, aria-label `Previous week`), `week-today` (secondary sm `This week`, disabled when already on the current week), `week-next` (icon button, chevron-right, aria-label `Next week`), then `add-task-open` (secondary `Add task`).
2. **Legend row** (`text-small text-muted flex flex-wrap gap-4`): the subject chips for subjects present this week, plus `New`/`Review`/`Task` badges and the helper `Drag a block to another day, or use Move.` (the helper is hidden below md).
3. **Grid**: `<div role="list" class="grid gap-3">` with 7 day columns (`role="listitem"`).
4. Dialogs shared with Today: Add task, Edit, Move, Partial, Topic check, delete confirm.

### Day column (`week-day-YYYY-MM-DD`)
`flex flex-col gap-2 rounded-lg bg-surface border border-border p-2 min-h-64`
- **Header** (`flex items-baseline justify-between px-1 pb-2 border-b border-border`): weekday `text-caption uppercase tracking-wider text-muted` (`MON`), day number `font-display text-heading` (`14`), and the load `week-day-load` `font-mono tabular-nums text-caption` `4/6` (planned pomodoros excluding skipped, over capacity). The load is `text-warning` when over capacity.
- **Today:** `data-today="true" aria-current="date"`, `bg-primary-soft border-primary`, and a label `Today` badge (primary-soft on surface) after the weekday.
- **Past days:** `bg-sunken` with the content at `opacity-80`. Cards are still clickable for Undo/menu, but they are not drop targets.
- **Blackout:** `data-blackout="true"`, a diagonal hatched background (`bg-[repeating-linear-gradient(135deg,var(--fp-sunken)_0_6px,transparent_6px_12px)]`), and a label `Blackout` in `text-caption text-muted`.
- **Exam marker** (`week-exam-marker`, top of the column, before blocks): `rounded-md bg-accent-soft px-2 py-1.5 text-caption font-semibold text-text` with a 2px left border `border-l-2 border-accent`: `EXAM · Calculus Midterm`.
- **Blocks:** `block-card`s in `order` (design-system §4.12).
- **Empty day:** `text-caption text-muted text-center py-4`. Future days read `Free`, capacity-0 days `Rest day`, past days `No blocks`, and blackout days `Nothing is scheduled on blackout days.`

### Block card (`block-card`)
- Title (line-clamp-2): `Derivatives` / `Problem set 3`.
- Row: kind badge (`New`/`Review`/`Task`) + `0/2` (`font-mono text-caption tabular-nums`, `aria-label="0 of 2 pomodoros"`) + a `Covered` check icon when covered (`aria-label="Covered"`).
- Status styling: done (strikethrough, sunken), partial (a `Partial` badge replaces the kind badge; the kind stays in `aria-label`), skipped (dashed, muted).
- Attributes: `data-testid="block-card" data-block-id data-status data-kind data-date draggable="true" tabindex="0" role="button" aria-haspopup="menu" aria-label="Derivatives, New, Mathematics, 0 of 2 pomodoros. Press Enter for actions."`
- Click or Enter opens the **block menu** (popover anchored to the card, `shadow-raised rounded-md bg-surface border border-border py-1 w-48`) containing: `Start focus` (`block-start`), `Done` (`block-done`), `Partial` (`block-partial`), `Skip` (`block-skip`), a divider, `Edit` (`block-edit`), `Move` (`block-move`), `Delete` (`block-delete`, `text-danger`). Done/skipped blocks show `Undo` (`block-undo`) instead of the four status actions.

## Content and copy
| Element | Copy |
|---|---|
| h1 | `Week` |
| Range | `14 – 20 Sep 2026` |
| Buttons | `Previous week` (aria), `This week`, `Next week` (aria), `Add task` |
| Drop hint (on the hovered column) | `Drop to move here` (`text-caption text-primary`, centred at the bottom of the column) |
| Drop toasts | `Moved to Tue 22 Sep` · errors: `Can't move a block to a past day.` / `That's on or after the exam (Tue 29 Sep). Pick an earlier day.` / `Tue 22 Sep is a blackout day.` |
| Over-capacity drop | allowed. Toast `Moved to Tue 22 Sep. That day is now 2 over capacity.` |

## States
| State | UI |
|---|---|
| Loading | `week-loading`: 7 column skeletons `h-64 rounded-lg` with 2–3 `h-12` card skeletons each |
| Empty: no data | `week-empty` above the grid (the grid still renders 7 empty columns so the structure is visible): title `Nothing planned this week`, body `Add subjects, exams and topics in Setup and your plan will appear here.`, CTA `Go to Setup` (`empty-setup-link`) |
| Empty: this week has no blocks but data exists | `week-empty`: title `Nothing planned this week`, body `Your exams may be later, or this week has no capacity.`, CTA secondary `Next week` (same action as `week-next`, test id `week-empty-next`) |
| Error | `page-error` |
| Success | cards move live. Toasts as above |
| Plan updating | cards re-flow (fade in over duration-200). The dragged card stays pinned |

## Responsive
- **375 (agenda):** the grid becomes `grid-cols-1`. Each day is a full-width section with a header row (`Mon 14 Sep`, load, `Today` badge). Past days before today are collapsed into a single disclosure `Show 3 earlier days` (`week-show-past`), which keeps them in the DOM (`hidden` attribute toggled; still queryable by test id). Cards are full width. Drag is disabled on coarse pointers (`@media (pointer: coarse)`), so use **Move**. The header buttons are one row: prev · This week · next, with Add task full width below.
- **768:** a horizontally scrolling row of 7 columns, `grid-flow-col auto-cols-[minmax(11rem,1fr)] overflow-x-auto snap-x snap-mandatory`. The column for today scrolls into view on load. Drag works with a mouse.
- **1280 (≥1024, `lg:`):** `grid-cols-7`, all visible, and each column fills 1/7 of `max-w-page` (≈150px).

## Interactions
- **Navigation:** prev/next shift `start` by ±7 days and update the URL with `setSearchParams` (push history). With no `start` param, use `startOfWeekISO(today)`. An invalid `start` normalises to the Monday of that date, or to the current week if it can't be parsed, using `replace`.
- **Drag and drop (native HTML5):** `dragstart` sets `dataTransfer.setData('text/plain', blockId)` and `effectAllowed='move'`. Columns handle `dragover` (preventDefault when valid), `dragenter`/`dragleave` for the highlight, and `drop`, which updates `{date, pinned: true}` and appends the block to the end of the target day's `order`. Invalid targets (past, blackout, on or after the exam) don't call preventDefault, so the cursor shows not-allowed and a toast explains on drop.
- **Keyboard:** Tab reaches each card, Enter/Space opens the menu, and Move is the accessible alternative to dragging. Arrow keys are not bound.
- **Clicking a day header** does nothing (no day view in scope).

## data-testid
`week-range`, `week-prev`, `week-next`, `week-today`, `add-task-open`, `week-day-<YYYY-MM-DD>` (×7, attributes `data-today`, `data-blackout`), `week-day-load`, `week-exam-marker`, `block-card` (+ `data-block-id`, `data-status`, `data-kind`, `data-date`), `block-start`, `block-done`, `block-partial`, `block-skip`, `block-undo`, `block-edit`, `block-move`, `block-delete`, `week-empty`, `week-empty-next`, `week-loading`, `week-show-past`, plus the dialog ids from `today.md`.
