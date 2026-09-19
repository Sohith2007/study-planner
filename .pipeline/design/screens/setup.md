# Screen: Setup (`/setup`)

**Owner:** P3 (`src/features/setup/SetupPage.tsx`) · **Feature:** F1 · **Wireframe:** `wireframes/setup.html`

## Purpose
This is where the student turns their syllabus into data: subjects, then exams, then topics, with as little typing as possible (quick-add is a paste of one topic per line). Every change triggers an automatic plan rebuild about 0.5 s later, which is visible in the Plan status bar.

## Layout regions (`max-w-form mx-auto flex flex-col gap-6`)
1. **Header:** h1 `Setup`. The subtitle `text-lead text-muted` reads `Your subjects, exams and topics. The plan rebuilds itself a moment after you change anything.`
2. **Add subject card** (`subject-form`):
   - Heading `Add a subject`
   - Field `Subject name` (`subject-name-input`, placeholder `e.g. Biology`)
   - Field `Colour`: a radiogroup of 8 swatches (`subject-color-<key>` for `indigo, amber, emerald, rose, sky, violet, orange, slate`). Each is a `size-9 rounded-full` button (inline bg = hex) with `aria-label="Rose"` and `role="radio"`. The selected one gets `ring-2 ring-offset-2 ring-primary ring-offset-surface` and a white check icon. The default is the first preset not used by an existing subject.
   - Button primary `Add subject` (`subject-add`).
   - At md and up, name and colour sit on one row (`grid md:grid-cols-[1fr_auto] gap-4 items-end`) with the button below, right-aligned. At 375 everything stacks and the button is full width.
3. **Subject list** (`<ul data-testid="subject-list" class="flex flex-col gap-6">`), one **subject card** per subject (sorted by `createdAt`):
   - **Subject header** (`subject-item`, `data-subject-id`): the swatch `subject-swatch` (`size-4 rounded-full`, inline bg; `data-color="#f43f5e"`), the name `subject-name` (`text-heading font-semibold`), a meta line `text-small text-muted` (`1 exam · 5 topics`), and actions: ghost sm `Edit` (`subject-edit`) and danger-ghost sm `Delete` (`subject-delete`).
   - **Edit subject** (inline): the header turns into name input + swatches + `Save` (`subject-save`) / `Cancel` (`subject-cancel`).
   - **Exams** (inside the card, `flex flex-col gap-4 mt-4`), one **exam block** per exam sorted by date. The block is `rounded-lg border border-border bg-bg p-4`:
     - Header (`exam-item`, `data-exam-id`): the name `exam-name` (`text-body font-semibold`), the date `Tue 29 Sep` (`text-small text-muted`), the countdown `exam-countdown` badge `in 10 days` (`bg-sunken text-text`; `bg-warning-soft text-warning` when ≤ 3 days; `text-muted` and `3 days ago` when past), coverage `2/5 topics covered` (`text-small text-muted`), and actions `Edit` (`exam-edit`) and `Delete` (`exam-delete`).
     - Edit exam (inline): name + date inputs, `Save` (`exam-save`) / `Cancel` (`exam-cancel`).
     - **Topic table** (`<table>` at md and up, a list at 375), columns `Topic` · `Pomodoros` · `Difficulty` · `Status` · actions. Each row is `topic-item` (`data-topic-id`):
       - name `topic-name`, followed by a ghost icon button `topic-rename` (pencil, aria-label `Rename Derivatives`) that swaps the name for the input `topic-rename-input` (Enter saves, Esc cancels, an empty value shows `Give the topic a name.`)
       - estimate `topic-estimate`: an inline number input `w-20 h-9` (1–20), saved on blur or Enter
       - difficulty `topic-difficulty`: a select `h-9` with `Easy / Medium / Hard`, saved on change
       - status: `topic-covered-badge` `Covered` (success badge) and confidence `topic-confidence`, rendered as 3 small bars filled per level with `aria-label="Confidence 3 of 3"` and a visible `3/3` text in `text-caption text-muted`. When the topic is not covered: `text-small text-muted` `Not covered`.
       - actions: when covered, ghost sm `Undo covered` (`topic-uncover`, which sets covered=false and confidence=null); always danger-ghost icon `Delete topic` (`topic-delete`, aria-label `Delete Derivatives`)
       - Inline field errors show under the input: `topic-estimate-error` `Estimate must be 1–20 pomodoros.` The value reverts to the last saved value on blur if it is invalid.
     - **Add topic row** (`topic-form`): `Topic name` (`topic-name-input`, placeholder `e.g. Integration by parts`), `Pomodoros` (`topic-estimate-input`, default `2`), `Difficulty` (`topic-difficulty-input`, default `Medium`), and a secondary button `Add topic` (`topic-add`). Enter in the name submits.
     - **Quick add** (`quick-add-toggle`, ghost sm `Quick add` with a list icon, `aria-expanded`), which expands (`duration-300`) to:
       - Label `Paste topics, one per line`
       - Textarea `quick-add-input` (placeholder `Cells` / `Genetics` / `Evolution` on separate lines)
       - Helper: `Each line becomes a topic with 2 pomodoros and medium difficulty. Blank lines are skipped.`
       - Button primary `Add 3 topics` (`quick-add-submit`). The count is live, from the non-blank trimmed lines. With 0 lines it reads `Add topics` and is disabled. Singular: `Add 1 topic`.
       - Close `Cancel` (`quick-add-cancel`).
   - **Add exam** (a ghost button at the bottom of the subject card, `exam-add-open`, `+ Add exam`) expands the form `exam-form`: `Exam name` (`exam-name-input`, placeholder `e.g. Cell Biology Final`), `Exam date` (`exam-date-input`, min = today), a primary sm `Add exam` (`exam-add`), and `Cancel` (`exam-add-cancel`). **If the subject has no exams yet, the form is open by default.**

## Content and copy

### Validation (inline, under the field, `<field-testid>-error`; nothing is saved)
| Field | Rule | Message |
|---|---|---|
| Subject name | non-empty after trim | `Give the subject a name.` |
| Subject name | unique (case-insensitive) | `You already have a subject called Biology.` |
| Exam name | non-empty | `Give the exam a name.` |
| Exam date | present | `Pick the exam date.` |
| Exam date | ≥ today | `The exam date can't be in the past.` |
| Topic name | non-empty | `Give the topic a name.` |
| Estimate | integer 1–20 | `Estimate must be 1–20 pomodoros.` |
| Quick add | ≥ 1 non-blank line | `Paste at least one topic name.` (only when submitted through Enter shortcuts; the button is disabled otherwise) |

Exam date equal to today is allowed (countdown `today`), and the scheduler will overflow its work. Show a `text-small text-warning` hint under the date: `Exam is today. There's no time left to plan study for it.`

### Countdown text (`exam-countdown`)
`today` (0), `tomorrow` (1), `in N days` (N ≥ 2, e.g. **`in 12 days`**), `N days ago` (past, `1 day ago`).

### Delete confirms (`confirm-dialog`)
- **Subject:** title `Delete Mathematics?`, body `This also deletes 1 exam, 5 topics and 9 planned blocks. Your focus history stays in your stats.`, OK `Delete subject` (danger). Toast `Mathematics deleted`.
- **Exam:** title `Delete Calculus Midterm?`, body `This also deletes its 5 topics and 9 blocks. Your focus history stays in your stats.`, OK `Delete exam` (danger). Toast `Calculus Midterm deleted`.
- **Topic:** title `Delete Derivatives?`, body `Its upcoming planned blocks will be removed from your plan. Finished blocks stay in your history.`, OK `Delete topic` (danger). Toast `Derivatives deleted`.
- Counts come from live queries at open time. Use correct plurals.

### Success feedback
Adds show no toast. The new row appears inline with a 1 s `bg-primary-soft` highlight that fades (`transition-colors duration-500`), and focus returns to the name input for fast repeat entry. Quick add shows the toast `Added 3 topics to Cell Biology Final`. Edits save silently, with an inline `Saved` caption (`text-caption text-success`) beside the field that fades after 1.5 s.

## States
| State | UI |
|---|---|
| Loading | `setup-loading`: form skeleton `h-40` + 2 subject skeletons `h-56 rounded-lg` |
| Empty: no subjects | the add-subject card is shown (focused name input), and below it `setup-empty`: title `Start with a subject`, body `Add each subject you're studying, then its exams and topics. FocusPlan works out when to study what.`, ghost link `Or load the demo semester` → `/data` |
| Empty: subject without exams | inside the subject card: `text-small text-muted` `No exams yet for Biology.` The exam form is open |
| Empty: exam without topics | inside the exam block: `text-small text-muted` `No topics yet. Add them one by one, or paste a list with Quick add.` Quick add is expanded by default |
| Error (read) | `page-error` |
| Error (write) | error toast `Couldn't save. Please try again.` with inputs kept as typed |
| Plan updating | handled by the Plan status bar (`Updating plan…`); no extra UI here |

## Responsive
- **375:** the cards are full width. The topic table becomes a list: each `topic-item` is a stacked mini-card with the name (and badge) on top, then a row of estimate input, difficulty select and delete icon. Headers are hidden, and each input gets a visible label (`Pomodoros`, `Difficulty`) in `text-caption`. The add-topic row stacks, with the button full width.
- **768:** the topic table has columns `grid-cols-[1fr_6rem_8rem_8rem_auto]`. Forms are in one row.
- **1280:** same as 768, centred in `max-w-form` (48rem). The rest of the width stays empty on purpose, as calm margins.

## Interactions
- Enter submits the nearest form. Esc cancels inline edits.
- The colour radiogroup: arrow keys move, Space selects.
- Delete buttons open confirms (focus on Cancel). **Cancel removes nothing** (AC-P3-4).
- Deleting an exam uses `deleteExamCascade`, and a subject `deleteSubjectCascade`. Deleting a topic deletes the topic plus its `planned` blocks; the replan handles the rest.
- All writes go through Dexie, and the plan auto-rebuilds (PlanSync, 500 ms debounce). There is no manual Replan on this page; it is in the status bar.

## data-testid
`subject-form`, `subject-name-input`, `subject-color-<key>`, `subject-add`, `subject-list`, `subject-item`, `subject-swatch`, `subject-name`, `subject-edit`, `subject-save`, `subject-cancel`, `subject-delete`, `exam-add-open`, `exam-form`, `exam-name-input`, `exam-date-input`, `exam-add`, `exam-add-cancel`, `exam-item`, `exam-name`, `exam-countdown`, `exam-edit`, `exam-save`, `exam-cancel`, `exam-delete`, `topic-item`, `topic-name`, `topic-rename`, `topic-rename-input`, `topic-estimate`, `topic-difficulty`, `topic-covered-badge`, `topic-confidence`, `topic-uncover`, `topic-delete`, `topic-form`, `topic-name-input`, `topic-estimate-input`, `topic-difficulty-input`, `topic-add`, `quick-add-toggle`, `quick-add-input`, `quick-add-submit`, `quick-add-cancel`, `setup-empty`, `setup-loading`, plus `<field-testid>-error` for every validated field.
