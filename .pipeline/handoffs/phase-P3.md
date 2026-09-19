# Handoff: P3 Setup and availability settings UI

> Owner: frontend-engineer · Status: done · Round: build

## Features delivered
| Feature | Status | Notes |
|---|---|---|
| F1 Subjects, exams and topics setup (with quick add) | ✅ done | `/setup` built to screens/setup.md and wireframes/setup.html: subject CRUD with the 8-preset colour radiogroup, exam CRUD under each subject with the countdown badge, a topic table with inline rename, estimate, difficulty, Covered badge, confidence bars, `topic-uncover` and delete. Also quick add, cascade delete confirms with live counts, the empty, loading and error states, and the 1 s highlight on new rows and inline "Saved" captions |
| F2 Study availability settings | ✅ done | `/settings` built to screens/settings.md and wireframes/settings.html: Mon..Sun capacity, the timer fields, the Classic/Flowtime radio cards, daily goal, blackout dates (held locally and saved only on `settings-save`), `review-offsets-reset`, sound and notification switches, `notifications-blocked`, and a sticky footer with status, Discard and Save. There is also a beforeunload prompt while the form is dirty |

## Acceptance criteria self-check
All criteria were checked in a real browser: a scratch Playwright script driving Chromium against `npm run dev`. It is not committed, because `tests/e2e/**` belongs to P0/QA. Pure logic and repo writes are also covered by unit tests.

| AC | Result | How verified |
|---|---|---|
| AC-P3-1 | pass | Added Biology with `subject-color-rose`. `subject-swatch` has `data-color="#f43f5e"` and the subject is still there after a reload |
| AC-P3-2 | pass | Added "Cell Biology Final" at today+12. `exam-countdown` reads `in 12 days` |
| AC-P3-3 | pass | Filled quick add with `Cells\nGenetics\n\nEvolution`. The button reads "Add 3 topics", and exactly 3 topics appear without a reload, each 2 / medium. Toast: "Added 3 topics to Cell Biology Final". Unit test `addTopics` checks the defaults and order |
| AC-P3-4 | pass | Estimate 4 (Enter) and difficulty hard are still there after a reload. On the Calculus Midterm delete: Cancel leaves the exam, then Confirm removes it with the toast "Calculus Midterm deleted". A unit test checks that topics and blocks are gone after `deleteExamCascade` |
| AC-P3-5 | pass | These inline errors appear and nothing is saved: `subject-name-input-error`, `exam-name-input-error`, `exam-date-input-error` (both missing and past: "The exam date can't be in the past."), `topic-name-input-error`, and `topic-estimate-error` for 25 |
| AC-P3-6 | pass | `capacity-1..6,0` show 6,6,6,6,6,8,4. Setting `capacity-3` to 3 and saving shows the "Settings saved" toast, and it is still 3 after a reload |
| AC-P3-7 | pass | Focus 200 and goal 0 show inline errors and the footer "Fix 2 fields to save.", and nothing is written. Focus 50, short break 10, goal 5 and flowtime save and persist after a reload |
| AC-P3-8 | pass | A past date shows "Blackout dates can't be in the past." A future date is listed ("Not saved yet"), and Remove removes it. After save and reload the list persists |

There were 0 console or page errors during the run. At 375 px, `scrollWidth` is 375 on both pages (no horizontal scroll). I took screenshots at 375 and 1280 and compared them with the wireframes. I fixed topic column alignment on covered rows, the stacked mobile topic rows, and the timer input widths.

## Files created / modified
All paths are under `app/src/features/`:
- `setup/SetupPage.tsx` (replaces the stub): the live query, loading/empty states, and the single delete ConfirmDialog with counts
- `setup/SubjectForm.tsx`: the add-subject card
- `setup/ColorPicker.tsx`: the swatch radiogroup, with roving tabindex and arrow keys
- `setup/SubjectCard.tsx`: the subject header, inline edit, exam list and exam add form
- `setup/ExamBlock.tsx`: the exam header, inline edit, topic table, add-topic form and quick add
- `setup/TopicRow.tsx`: one topic row (rename, estimate, difficulty, status, uncover, delete)
- `setup/setupLogic.ts`: pure validation, copy, countdown, plurals, quick-add parsing and default colour
- `setup/setupRepo.ts`: the Dexie writes (add/update subject, exam and topics, `uncoverTopic`, `deleteTopic`, delete counts), which re-export the P0 cascades
- `setup/hooks.ts`: `useFlash`, `useTransientFlag`, and `useSafeWrite` (error toast `Couldn't save. Please try again.`)
- `setup/SetupIcons.tsx`: local pencil and list icons
- `setup/setup.test.ts`: 10 tests
- `settings/SettingsPage.tsx` (replaces the stub)
- `settings/settingsLogic.ts`: the pure form model, validation, patch, summaries and status text
- `settings/settings.test.ts`: 4 tests

## How to run / use
From `app/`, run `npm run dev` and open `/setup` and `/settings`. There are no env vars. The pages use the P0 demo seed.

## Interfaces exposed to other phases
Both pages keep their default exports at the stub paths. P3 exposes no other public API. Every write goes through Dexie (`db.*`, `saveSettings`, `deleteExamCascade`, `deleteSubjectCascade`), so P1's PlanSync picks up the changes. `deleteTopic` deletes the topic and only its `planned` blocks, and leaves finished, partial and skipped blocks as history.

Test ids that the spec left unnamed (please tell QA):
- **Subject inline edit:** the name input is `subject-edit-input` (error `subject-edit-input-error`), and the swatches are `subject-edit-color-<key>`. They are separate from the add form so ids stay unique.
- **Exam inline edit:** the inputs are `exam-edit-name-input` and `exam-edit-date-input`.
- **Rename error:** `topic-rename-input-error`.
- **Quick-add empty error:** `quick-add-input-error`, shown for Ctrl/Cmd+Enter with no lines.
- **Blackout rows:** `blackout-item` carries `data-date="YYYY-MM-DD"`.

## Verification output
```
> npm run lint
> oxlint
lint-exit=0

> npx vitest run src/features/setup src/features/settings
 Test Files  2 passed (2)
      Tests  14 passed (14)

> npm run test:unit   (whole repo, including other phases)
 Test Files  12 passed (12)
      Tests  153 passed (153)

> npm run build   (earlier in this session, with the P3 code in place)
✓ built in 512ms   (tsc -b clean; only the >500 kB chunk-size warning)

> npm run build   (final re-run)
src/logic/scheduler/zz-dump.test.ts(24,3): error TS2591: Cannot find name 'process'.
```
The final build failure comes only from `src/logic/scheduler/zz-dump.test.ts`. That file belongs to P1, which is being built in parallel; it looks like a temporary debug file. `tsc -b` reports no errors in `src/features/setup/**` or `src/features/settings/**`.

## Open questions / cross-phase requests
- **P1:** `src/logic/scheduler/zz-dump.test.ts` breaks `npm run build` (it uses `process` under browser types). P1 should delete it or fix it.
- **P0 / QA (e2e):** there are no e2e specs for AC-P3-1..8 in `tests/e2e/**`, because I don't own that path. The scenarios in the AC table above work as written against the test ids. QA should know about these behaviours:
  - When an exam has no topics, quick add is expanded by default and `quick-add-toggle` is not rendered while it is open (as in the wireframe).
  - When a subject has no exams, the exam form is open by default and `exam-add-open` is hidden.
- **Design deviations:**
  - The topic table's actions column is a fixed `8.5rem` instead of `auto`. With `auto`, rows with "Undo covered" misaligned, because each row is its own grid.
  - Estimate edits that fail validation show `topic-estimate-error`, and the value reverts to the saved value on blur, as the spec says.
  - Subject, exam and topic Edit/Delete buttons have aria-labels that include the item name (e.g. "Delete Calculus Midterm").
- **Headless Chromium denies notifications,** so `notifications-blocked` is visible in automated runs. This is expected.

## Fix log (bug-fix rounds only)
| Bug ID | Root cause | Fix | Files |
|---|---|---|---|
