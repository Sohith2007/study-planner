# Screen: Today (`/today`)

**Owner:** P4 (`src/features/planner/TodayPage.tsx`) · **Features:** F4, F6 · **Wireframe:** `wireframes/today.html`

## Purpose
This answers "What do I study right now?" with one tap. The screen opens with the next block and one big **Start next** button. Below it is today's full ordered queue, where each block can be marked Done, Partial or Skip.

## Layout regions (`max-w-page mx-auto`)
1. **Page header** (`flex flex-col gap-4 md:flex-row md:items-end md:justify-between`):
   - Left: eyebrow `today-date` `SATURDAY, 19 SEPTEMBER 2026` (`text-caption uppercase tracking-wider text-muted`), and h1 `Today`.
   - Right: the capacity meter `today-capacity` and the **Add task** button (`add-task-open`, secondary md, plus icon).
2. **Up next card** (hero): `rounded-xl bg-surface border border-border shadow-card p-5 md:p-8`, with a 4px spine in the subject colour on the left.
3. **Queue section**: h2 `Today's queue`, a count `text-small text-muted` (`5 blocks · 9 pomodoros`), then `<ol data-testid="today-queue" class="flex flex-col gap-3">` of BlockRows.
4. **Dialogs**: Add task, Edit block, Move block, Partial, Topic check, confirm delete.

At 1280 the Up next card and the queue are stacked in one column (max-w-page). A single column keeps the eye moving down the queue. The Up next card uses a two-column interior (text left, button right).

## Components used
Page header, Card (hero), BlockRow (design-system §4.12), Badge, Subject chip, Pips, Button (primary lg, secondary, ghost, icon), Menu, Modal, Field, Segmented control, Empty state, Skeleton, Toast.

## Content and copy

### Capacity meter (`today-capacity`)
- Text: `4 / 6 pomodoros planned`, where **X** = the sum of `pomodoros` over today's blocks whose status ≠ `skipped`, and **Y** = `settings.dailyCapacity[weekday(today)]`.
- Visual: a 6-segment bar under the text (`h-1.5 rounded-full`). Filled segments are `bg-primary`, empty ones `bg-sunken`. When Y > 16 it becomes a continuous bar.
- X > Y: the text turns `text-warning`, and a helper reads `2 over today's capacity`.
- Y = 0: the helper reads `Today is a rest day in Settings.`
- A blackout day: the helper reads `Today is a blackout day.`

### Up next card
- Eyebrow `UP NEXT`
- Topic/title `text-lead md:text-title font-display font-semibold` (for example `Derivatives`)
- Meta: kind badge · subject chip `Mathematics` · `for Calculus Midterm · in 10 days` (for a task: `Task · Physics`)
- Progress: pips + `0/2 pomodoros`
- **`start-next`**: a primary **lg** `<Link>` to `/focus?blockId=<id>`, labelled **`Start next`** with a play icon, and the sub-label `25-min focus` (`text-small text-on-primary/80`; the minutes come from `settings.focusMinutes`; in Flowtime mode it reads `Flowtime focus`).
- **Target rule:** the first block by `order` whose status is `planned` or `partial`. On a fresh seed this is the first `planned` block (AC-P4-2). Skipped and done blocks are never the target (AC-P4-6).
- If the timer is already running for that block, the button reads `Back to timer` and links to `/focus?blockId=<id>`. It keeps the same test id.

### BlockRow (`today-block`, one per block, in `order`)
| Element | Content / test id |
|---|---|
| Title | `block-title`: the topic name, or the task title (`Problem set 3`) |
| Kind badge | `block-kind`: `New` / `Review` / `Task` |
| Subject chip | `block-subject`: dot + `Physics` (tasks without a subject: `No subject`, grey dot) |
| Exam | `for Calculus Midterm` (omitted for tasks) |
| Covered | `block-covered` `Covered` (only when the topic is covered) |
| Status | `block-status`: `Partial` / `Done` / `Skipped` (omitted when planned) |
| Progress | `block-progress`: **`0/2 pomodoros`** (singular `0/1 pomodoro`). Pips are `aria-hidden` |
| Pinned | `Pinned` badge for pinned auto blocks (`title="Moved or edited by you. Replan won't shift it."`) |
| Actions | `block-start` `Start` (links to `/focus?blockId=`), `block-done` `Done`, `block-partial` `Partial`, `block-skip` `Skip`, `block-menu` (aria-label `More actions for Derivatives`) → `block-edit` `Edit`, `block-move` `Move`, `block-delete` `Delete` |
| Done/Skipped actions | `block-undo` `Undo` + `block-menu` |

Root attributes: `data-testid="today-block" data-block-id={id} data-status={status} data-kind={kind}`.

### Dialogs
1. **Partial** (`partial-dialog`): title `How many pomodoros did you finish?`; body `Derivatives · 2 planned`; segmented `partial-option-1` … `partial-option-{m-1}` (labels `1`, `2`…). Buttons `Cancel` / **`Save`** (`partial-save`). Saving sets `completedPomodoros = n` and `status='partial'`. Toast: `Marked 1 of 2 done`.
   - When `pomodoros === 1`, `block-partial` is `disabled` with `title="Single-pomodoro blocks can only be Done or Skipped."`
2. **Topic check** (`topic-check-dialog`): opens after **Done** on a `new` block whose topic exists and is **not already covered**.
   - Title: `Topic check: Derivatives`
   - Body: `Did you cover Derivatives well enough to move on? Your answer shapes the reviews before Calculus Midterm.`
   - Label: `How confident are you?` Segmented `confidence-1` `1 · Shaky`, `confidence-2` `2 · Okay`, `confidence-3` `3 · Solid`. Nothing is preselected.
   - Helper: `Shaky adds one extra review before the exam.`
   - Buttons: `topic-check-not-yet` **`Not yet`** (secondary) and `topic-check-covered` **`Covered`** (primary; disabled until a confidence is picked; `title="Pick how confident you are first"`).
   - Covered writes `topic.covered=true, topic.confidence=n`, and shows the toast `Derivatives marked covered`. Not yet or Esc only closes the dialog.
3. **Edit block** (`block-edit-dialog`): title `Edit block`; fields: `Title` (`block-edit-title`, **tasks only**), `Pomodoros` (`block-edit-pomodoros`, number 1–8). Helper for auto blocks: `Edited blocks are pinned: Replan won't change them.` Buttons `Cancel` / **`Save`** (`block-edit-save`). Toast `Block updated`.
   - Errors: `Pomodoros must be 1–8.`, `Can't be less than the 1 pomodoro already done.`, `Give the task a title.`
4. **Move block** (`block-move-dialog`): title `Move block`; body `Derivatives · currently Sat 19 Sep`; field `New date` (`block-move-date`, min = today). Helper `Moved blocks are pinned: Replan won't shift them.` Buttons `Cancel` / **`Move block`** (`block-move-save`). Toast `Moved to Mon 21 Sep`.
   - Errors: `Pick a date.`, `Pick today or a later date.`, `That's on or after the exam (Tue 29 Sep). Pick an earlier day.`
5. **Delete** (`confirm-dialog`): title `Delete this block?`; body for an auto block: `"Derivatives" (2 pomodoros) will be removed. The plan may add this work back the next time it rebuilds; move or edit the block instead if you want it elsewhere.`; body for a task: `"Problem set 3" will be deleted.` Buttons `Cancel` / **`Delete block`** (`confirm-ok`, danger). Toast `Block deleted`.
6. **Add task** (`add-task-dialog`): title `Add a task`; fields `Title` (`add-task-title`, placeholder `e.g. Problem set 4`), `Date` (`add-task-date`, default today, min today), `Pomodoros` (`add-task-pomodoros`, default 1, 1–8), `Subject` (`add-task-subject`, a select: `No subject` + subjects). Buttons `Cancel` (`add-task-cancel`) / **`Add task`** (`add-task-submit`). Toast `Task added to Sun 20 Sep` (`Task added to today` when the date is today).
   - Errors: `Give the task a title.`, `Pick a date.`, `Pick today or a later date.`, `Pomodoros must be 1–8.`

## States
| State | Condition | UI |
|---|---|---|
| Loading | any live query is `undefined` | `today-loading`: a header skeleton (eyebrow `h-3 w-40`, h1 `h-8 w-32`), a hero skeleton `h-40 rounded-xl`, and 3 row skeletons `h-20 rounded-md` |
| Empty: no data | no subjects **and** no exams | `today-empty` in place of the hero; the queue is hidden. Title **`Nothing planned yet`**; body `Add your subjects, exams and topics, and FocusPlan will build your study plan for you.`; CTA primary `Go to Setup` (`empty-setup-link` → `/setup`); ghost `Load the demo semester` (→ `/data`) |
| Empty: all done | today has ≥1 block and all are `done`/`skipped` | `today-empty` in place of the hero. Title **`All done for today`**; body `Every block is finished or skipped. Rest up, or get ahead with a free focus session.`; CTA primary `Start a free focus` (→ `/focus`), ghost `See this week` (→ `/week`). The queue stays visible below (muted rows) |
| Empty: nothing today | data exists, 0 blocks today | `today-empty`. Title `No blocks today`; body `Today is a rest day in your Settings.` / `Today is a blackout day.` / `Nothing is scheduled today. Your next block is on Mon 21 Sep.` (use the first matching); CTA secondary `Open Week` (→ `/week`), ghost `Add task` |
| Error | a Dexie query throws | `page-error` (design-system §4.11) |
| Success | after any action | the row updates live and a toast as listed |
| Plan updating | after Topic check → Covered | the status bar shows `Updating plan…` and review blocks may appear or disappear. Rows animate in with `opacity 0→100, duration-200` |

## Responsive
- **375:** the header stacks. The capacity meter sits under the h1 and `Add task` becomes a full-width secondary button below it. The Up next card stacks, with `start-next` full width (`w-full h-14`). BlockRow stacks content above the actions. The actions row is `flex flex-wrap gap-2` with every action visible (`Start`, `Done`, `Partial`, `Skip`, menu) at `h-11`. It wraps to two lines when needed. **Never render an action twice** (for example inline plus in the menu, hidden with CSS). Duplicate test ids inside one row break Playwright strict mode. Dialogs are bottom sheets.
- **768:** the header is on one row (title left, meter + Add task right). BlockRow is still stacked, but every action is visible (`Start`, `Done`, `Partial`, `Skip`, menu) in a row.
- **1280:** BlockRow is a single row: spine, content (flex-1), then actions right-aligned (`md:ml-auto`, `size sm`). The Up next interior is `grid grid-cols-[1fr_auto] items-center gap-8`.

## Interactions
- **Done:** sets `status='done'` and `completedPomodoros=pomodoros`. Then, for a `new` block with an uncovered topic, it opens Topic check. Toast `Marked done`.
- **Skip:** sets `status='skipped'` immediately with no confirm. Toast `Skipped Derivatives` with an **Undo** action button in the toast (`toast-undo`).
- **Undo** (row or toast): `status` → `partial` if `0 < completed < pomodoros`, else `planned`. On undoing a Done, `completedPomodoros` goes back to its previous value (keep it in memory for the toast undo; the row `Undo` resets to the stored `completedPomodoros` before Done, falling back to 0).
- Keyboard: the rows are `<li>`s with native buttons, and the Tab order follows the DOM. The `block-menu` is a menu button: Enter/Space opens it, arrow keys move through items, Esc closes it and returns focus.
- All writes go to Dexie. The UI updates through `useLiveQuery`. No optimistic local copies.

## data-testid
`today-date`, `today-capacity`, `add-task-open`, `start-next`, `today-queue`, `today-block`, `block-title`, `block-kind`, `block-subject`, `block-covered`, `block-status`, `block-progress`, `block-start`, `block-done`, `block-partial`, `block-skip`, `block-undo`, `block-menu`, `block-edit`, `block-move`, `block-delete`, `partial-dialog`, `partial-option-<n>`, `partial-save`, `topic-check-dialog`, `confidence-1|2|3`, `topic-check-covered`, `topic-check-not-yet`, `block-edit-dialog`, `block-edit-title`, `block-edit-pomodoros`, `block-edit-save`, `block-move-dialog`, `block-move-date`, `block-move-save`, `add-task-dialog`, `add-task-title`, `add-task-date`, `add-task-pomodoros`, `add-task-subject`, `add-task-submit`, `add-task-cancel`, `today-empty`, `empty-setup-link`, `today-loading`, `toast-undo`. Field errors: `<field-testid>-error`.
