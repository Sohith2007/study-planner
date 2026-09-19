# FocusPlan User Guide

FocusPlan is a study planner that builds your day-to-day study schedule from your exams and topics, then hands each planned session straight to a Pomodoro timer. Everything is stored locally in your browser (IndexedDB) — there is no account and no sign-in.

The navigation bar (top of every page) has seven links: **Today**, **Week**, **Focus**, **Setup**, **Settings**, **Dashboard** and **Data**, plus the **FocusPlan** wordmark (links back to Today). When a Pomodoro timer is running or paused, a small timer pill also appears in the nav bar and links to the Focus page.

The app ships with a **demo seed**: three subjects (Mathematics, Physics, Chemistry), three exams, twelve topics, some completed history and a five-day focus streak, so you can explore every screen immediately. You can wipe it and start fresh from **Data** at any time (see [Export, import, reset and clear](#export-import-reset-and-clear)).

## Contents
1. [Setting up subjects, exams and topics](#1-setting-up-subjects-exams-and-topics)
2. [Setting your availability](#2-setting-your-availability)
3. [How the plan is generated](#3-how-the-plan-is-generated)
4. [Auto-replan and catch-up](#4-auto-replan-and-catch-up)
5. [The Today view](#5-the-today-view)
6. [The Week view](#6-the-week-view)
7. [The Focus timer](#7-the-focus-timer)
8. [The Dashboard](#8-the-dashboard)
9. [Export, import, reset and clear](#9-export-import-reset-and-clear)

---

## 1. Setting up subjects, exams and topics

Go to **Setup**.

1. **Add a subject.** Fill in a name and pick one of eight colour presets, then save. The subject appears in the list with a colour swatch; that colour is used everywhere the subject shows up (block spines, chart bars, chips).
2. **Add an exam under a subject.** Give it a name and a date. FocusPlan shows a countdown next to it (`today`, `tomorrow`, `in N days`, or `N days ago` if it has already passed). The exam date cannot be in the past.
3. **Add topics under an exam**, one at a time, or use **quick add**:
   - Quick add is a text box where you paste one topic per line (blank lines are ignored). Submitting it creates a topic per line, each defaulted to an estimate of **2 Pomodoros** and difficulty **medium**. It's the fastest way to turn a syllabus list into topics.
   - Each topic has a name, an **estimate** in Pomodoros (1–20, default 2) and a **difficulty** (easy / medium / hard). You can edit either later; changes are saved immediately and survive a reload.
   - A topic shows a **Covered** badge once you've marked it covered (see [Section 5](#5-the-today-view)), along with a confidence indicator.
4. **Delete with care.** Deleting an exam or a subject asks for confirmation and tells you what will be removed (the exam/subject, its topics, and its planned blocks). Cancelling removes nothing. Completed history (finished focus sessions) is never deleted.

An empty name for a subject, exam or topic shows an inline error and saves nothing.

## 2. Setting your availability

Go to **Settings**.

- **Daily capacity:** how many Pomodoros you can realistically study each day, Monday through Sunday (0–16 each). The demo seed defaults to 6 on weekdays, 8 on Saturday and 4 on Sunday — adjust these to match your real schedule, because the scheduler will never place more work on a day than its capacity allows.
- **Timer lengths:** focus minutes (5–120), short break minutes (1–30), long break minutes (5–60), and how many focus sessions happen before a long break (2–8).
- **Default timer mode:** Classic (fixed focus/break lengths) or Flowtime (see [Section 7](#7-the-focus-timer)).
- **Daily goal:** how many completed Pomodoros count as "hit your goal" for a day (1–16). This drives the streak on the Dashboard.
- **Blackout dates:** days you know you won't be able to study (add and remove them here). The scheduler places nothing on a blackout date. You can't add a blackout date in the past.
- **Sound and notifications:** toggles for the timer's chime and for browser notifications when a focus or break ends.

Click **Save** to persist your changes; a "Settings saved" confirmation appears. Values outside the allowed ranges show an inline error and are not saved. If you leave the page with unsaved changes, the browser will warn you before you navigate away.

Changing anything here (or in Setup) automatically triggers the scheduler to rebuild your plan — you never need to press a button after routine edits (see [Section 4](#4-auto-replan-and-catch-up)).

## 3. How the plan is generated

Once you have at least one subject, exam and topic, FocusPlan builds a plan automatically. You don't trigger this by hand for routine edits — it happens in the background, about half a second after you finish editing subjects, exams, topics or settings.

What the scheduler does, in plain terms:
- For every topic that isn't marked Covered, it schedules **new-study blocks** covering the topic's estimated Pomodoros, in chunks of at most 2 Pomodoros each, ending no later than two days before the exam.
- After a topic's new-study work, it adds **spaced review blocks** (1 Pomodoro each) a few days later — by default at +1, +3 and +7 days — so you revisit material instead of only seeing it once. Reviews land no later than the day before the exam. If you mark a topic covered with **low confidence**, it schedules one extra review.
- It never schedules anything on or after the exam date itself, and it never exceeds the day's capacity (from Settings) or places anything on a blackout date.
- When you have more than one exam with pending work, it interleaves subjects across busy days rather than stacking one subject for days on end.
- If everything doesn't fit before your exams, the leftover work is reported as **overflow** rather than silently dropped — see the over-capacity banner below.

You will see this happening as a small status line under the nav bar:
- **"Updating plan…"** — the scheduler is recalculating.
- **"Plan up to date · rebuilt just now / N min ago / N h ago"** — the plan reflects your current data.
- A **Replan** button next to the status line lets you force a rebuild manually at any time (useful right after import or a bulk change).

## 4. Auto-replan and catch-up

FocusPlan protects the work you've already done: finished, partially finished, skipped, manually pinned (moved/edited) or manual (ad-hoc) blocks are never touched by a replan. Only untouched, still-`planned` auto-generated blocks are regenerated.

**Catch-up** happens automatically the first time you open the app on a given day: any blocks that were still `planned` and are now dated in the past get moved forward onto today or later, ahead of their exam. A dismissible notice appears under the nav bar: **"Moved N missed blocks"** (or "Moved 1 missed block"), with a short explanation that they're now on today or later, still before their exams.

**Over-capacity banner:** if your plan doesn't fit — for example, you lowered your daily capacity, or added several exams close together — a banner appears: **"N pomodoros don't fit before your exams"**, listing each affected exam and how many Pomodoros are unscheduled. You have two one-click fixes:
- **Trim reviews** — drops the largest remaining review offset (e.g. the +7 day review) across the plan and rebuilds it, which usually recovers some capacity.
- **Raise daily capacity** — a link straight to Settings.

## 5. The Today view

Go to **Today**. This is where you actually study.

- The heading shows the full date, and a line reads **"X / Y pomodoros planned"** against today's capacity.
- **Up next**: a highlighted card for the next planned or partially-done block, with a **Start** action that opens the Focus timer already linked to that block.
- Below it, the full **queue** for today: each block shows its topic (or task title), a subject colour chip, a **New / Review / Task** badge, its exam, a **Covered** badge if applicable, and its progress as pips plus text (e.g. "0/2 pomodoros").
- Each block has its own row actions: **Start**, **Done**, **Partial**, **Skip**, and a menu (**Edit**, **Move**, **Delete**).
  - **Done** marks all Pomodoros complete.
  - **Partial** lets you record how many of the block's Pomodoros you actually completed (1 up to one less than the total).
  - **Skip** marks it skipped and removes it from being the "Start next" target; a toast offers **Undo**.
  - After marking a **New** block Done, a **Topic check** dialog appears asking whether to mark the topic **Covered** and, if so, at what confidence (1–3). Confidence 1 causes the scheduler to add one extra review for that topic on the next replan.
- When every block for today is done or skipped, Today shows an empty state: **"All done for today."**
- If you have no data at all yet, Today's empty state links you to Setup.

## 6. The Week view

Go to **Week**. It's a seven-column grid, Monday through Sunday, with today highlighted.

- Use **Prev** / **Next** to move between weeks; the URL keeps track of the visible week (`?start=YYYY-MM-DD`), so you can bookmark or reload a specific week.
- Each day column shows its blocks as compact cards, with the same subject colour spine, kind badge and progress as Today.
- **Move a block** two ways: open its menu and use the date field, or **drag and drop** it onto another day's column. Either way, moving (or editing) an auto-generated block "pins" it, so future replans leave it exactly where you put it.
- **Add an ad-hoc task**: give it a title, a date, a Pomodoro count (1–8) and an optional subject. Tasks are yours to manage — the scheduler never removes or reschedules them.
- **Edit** a block's Pomodoro count (or a task's title), or **Delete** it (with confirmation).

## 7. The Focus timer

Go to **Focus**, or click **Start** / **Start next** on any block, which opens `/focus?blockId=<id>` with that block already linked.

- The countdown is large and prominent. Below it, a thin "burn line" shrinks as time passes.
- Controls appear one at a time depending on state: **Start**, **Pause**, **Resume**, **Skip**, **Reset**. Space bar also starts/pauses.
- **Classic mode** (default): Focus → Short break, with a Long break after every few focus sessions (configurable in Settings, default every 4). Lengths come from your Settings (default 25 / 5 / 15 minutes).
- **Flowtime mode**: focus time counts *up* instead of down. When you're ready to stop, click **End flow** — it calculates a break length from how long you focused and credits you a whole number of Pomodoros based on the elapsed time.
- If a block is linked, the timer shows its topic, subject and progress (e.g. "1/2"). Completing a focus session credits one Pomodoro to that block and topic; when the block's Pomodoros are all credited, it's automatically marked **Done**.
- You can also run a **free focus** session with no linked block — useful for open-ended studying that isn't part of the plan.
- The timer is timestamp-based, so it stays accurate even in a backgrounded/throttled browser tab, and it survives a page reload — it resumes exactly where it left off.
- The browser tab title mirrors the countdown (e.g. "24:57 · Focus — FocusPlan"), so you can track progress from another tab.
- If you allow browser notifications, you'll get one when a focus or break ends. If you deny them, the timer still works fine — an inline hint just tells you notifications are off, and you'll still hear the chime (if sound is enabled).

## 8. The Dashboard

Go to **Dashboard** for a birds-eye view of how ready you are.

- One **exam card** per upcoming exam (past exams are hidden), sorted by date, each showing the exam name, its subject, a countdown ("in N days"), a **readiness %** (share of that exam's planned Pomodoros completed) and **topics covered** (e.g. "1/5"). An exam that reaches 100% shows a **Ready** badge, and any unscheduled overflow for that exam is called out.
- **Focus today** and **focus this week** tiles show total focused minutes (Monday-start week).
- A **7-day chart**, stacked by subject, shows your focus minutes for the last week, with a legend naming each subject.
- A **streak** count: consecutive days (counting back from today, or yesterday if today's goal isn't met yet) on which you completed at least your daily-goal number of Pomodoros.
- If you have no exams yet, the Dashboard shows an empty state instead of blank cards.

## 9. Export, import, reset and clear

Go to **Data** for backup and reset controls. This page also shows a live summary of how much data you currently have (subjects, exams, topics, blocks, focus sessions).

- **Export**: downloads a JSON file named `focusplan-backup-YYYY-MM-DD.json` containing everything (subjects, exams, topics, blocks, sessions and settings). Keep this somewhere safe — it's your only backup, since nothing is stored anywhere but this browser.
- **Import**: choose a previously exported file. FocusPlan validates its shape, asks you to confirm, and then replaces **all** current data with the file's contents in a single operation. Importing a file that isn't a valid backup shows an error and changes nothing.
- **Reset demo data**: wipes everything and restores the original demo seed (three subjects, three exams, twelve topics, and history that produces a five-day streak) — handy for exploring the app fresh or for a demo.
- **Clear all**: wipes everything and leaves you with a genuinely empty app (no re-seeding on the next reload). Both actions ask for confirmation first, since they can't be undone except by importing a backup you made earlier.

**Privacy note:** all of this happens entirely inside your browser. FocusPlan makes no network requests to any server — verified during QA, which found zero requests to any origin other than the app's own dev server across a full session covering every route and the timer.
