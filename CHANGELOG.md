# Changelog

All notable changes to FocusPlan are documented in this file.

## [0.1.0] — 2026-09-19

Initial release. Built across six phases (P0–P5) against `.pipeline/master-plan.md`, and passed QA round 1 with 47/47 acceptance criteria, 53/53 Playwright e2e tests and 165/165 Vitest unit tests.

### Added

**Foundation**
- Vite 8 + React 19 + TypeScript SPA with React Router 7 client-side routing (`/today`, `/week`, `/focus`, `/setup`, `/settings`, `/dashboard`, `/data`, with `/` and unknown paths redirecting to `/today`).
- Tailwind CSS 4 "Paper & Ink" design system: light/dark themes following `prefers-color-scheme`, self-hosted fonts (Fraunces, Instrument Sans, IBM Plex Mono), and a shared UI kit (Button, Card, Badge, Modal/ConfirmDialog, Field + form controls, EmptyState, Toast, Skeleton/PageError, Icon).
- Local-first persistence: an IndexedDB database (Dexie 4) with `subjects`, `exams`, `topics`, `blocks`, `sessions`, `settings` and `meta` tables, a deterministic demo seed (3 subjects, 3 exams, 12 topics, sample history and a 5-day streak), and reactive reads everywhere via `useLiveQuery`.

**Subjects, exams and topics (F1)**
- Subject CRUD with an 8-colour preset picker.
- Exam CRUD under each subject, with a live countdown ("in N days").
- Topic CRUD under each exam: name, Pomodoro estimate (1–20), difficulty, Covered status and confidence.
- Quick-add: paste one topic per line to create several topics at once.
- Cascading deletes (exam → topics + blocks; subject → exams → topics + blocks) with a confirmation dialog naming what will be removed.

**Study availability settings (F2)**
- Per-weekday Pomodoro capacity (0–16), configurable focus/short-break/long-break lengths and long-break cadence, a default timer mode (Classic/Flowtime), a daily Pomodoro goal, blackout dates, and sound/notification toggles.

**Auto plan generator (F3)**
- A pure, deterministic, exam-backward scheduler: chunks new-study work into ≤2-Pomodoro blocks, adds spaced review blocks at configurable offsets (default +1/+3/+7 days), respects daily capacity and blackout dates, interleaves subjects across busy days, and reports unscheduled work as overflow with a reason.

**Today and Week views (F4)**
- Today: a capacity meter, an "Up next" hero card with one-click Start, and an ordered queue of the day's blocks.
- Week: a Monday–Sunday grid with drag-and-drop rescheduling between days, a Move dialog, block edit/delete, and an ad-hoc Add-task form for manual work outside the generated plan.

**Pomodoro timer (F5)**
- A timestamp-based timer (accurate across throttled/background tabs and page reloads), Classic mode (Focus → Short break, Long break after N focuses) and Flowtime mode (count-up focus with a computed break and Pomodoro credit).
- Browser notifications (with graceful degradation when denied), a Web Audio chime, and a live-updating document title.
- A Focus page showing the linked topic/subject/progress, plus a free-focus mode with no linked block.

**Session completion and topic progress (F6)**
- Done / Partial / Skip actions on every block, with Undo.
- A "Topic check" dialog after completing new-study work, to mark a topic Covered with a confidence rating (which can add an extra spaced review).

**Auto catch-up rescheduling (F7)**
- Missed (past-due) planned blocks are automatically moved forward the next time the app opens, with a dismissible "Moved N missed blocks" notice.
- Automatic debounced replanning whenever subjects, exams, topics or settings change, plus a manual Replan button.
- An over-capacity banner with one-click "Trim reviews" and a link to raise daily capacity in Settings.

**Dashboard and stats (F8)**
- Per-exam readiness percentage, countdown and topic coverage.
- Focus-minutes-today and focus-minutes-this-week tiles.
- A 7-day, per-subject stacked focus-minutes chart.
- A daily-goal streak counter.

**Local-first persistence, export/import and reset (F9)**
- JSON export (`focusplan-backup-YYYY-MM-DD.json`) and validated import, replacing all data in a single transaction.
- "Reset demo data" (restores the original seed) and "Clear all" (empties the app, with no re-seed on reload).
- Confirmed zero network requests to any origin other than the app's own during a full session.

### Known issues

- **BUG-001 (minor, open):** the skip-to-content link, the FocusPlan wordmark nav link, and the current page's own nav link are unreachable via keyboard Tab (see `README.md` → Known Issues and `.pipeline/qa-report.md`).
