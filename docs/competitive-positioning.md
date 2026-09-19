# Competitive Positioning

Source: `.pipeline/research-report.md` (research-analyst). This is a condensed version — see the full report for citations, methodology notes and confidence caveats.

## The problem

Students juggle two disconnected kinds of tool. **Planners** (My Study Life, Todoist, Notion templates) record deadlines but leave the student to decide what to study and when. **Focus timers** (Forest, Flora, Pomofocus, Focus To-Do) time the work but don't help break it down. In a survey of roughly 1,300 students, 87% self-identified as procrastinators, 40% said they don't know where to start, and 48% cited distraction. No free, account-less tool reviewed in the research turns "exam on date X covering topics A–F" into a spaced schedule of Pomodoro-sized sessions that reschedules itself when a day is missed.

## Competitor matrix

Legend: ✅ yes · ❌ no · ⚠️ partial or paywalled · ? unverified

| Feature | My Study Life | Forest | Pomofocus | Focus To-Do | Todoist | StudySmarter | **FocusPlan** |
|---|---|---|---|---|---|---|---|
| Pomodoro / focus timer | ✅ | ✅ | ✅ | ✅ | ❌ | ? | ✅ |
| Timer linked to a specific task/topic | ? | ❌ | ✅ | ✅ | ❌ | ? | ✅ |
| Exam dates & countdown | ✅ | ❌ | ❌ | ❌ | ⚠️ (deadlines, Pro) | ✅ | ✅ |
| Auto-generated multi-day plan from exams/topics | ⚠️ AI coach, quality unverified | ❌ | ❌ | ❌ | ❌ | ⚠️ "study plans" | ✅ transparent spaced plan |
| Spaced review sessions scheduled automatically | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ (flashcards only) | ✅ |
| Auto-reschedule missed sessions | ❌ | ❌ | ❌ | ❌ | ❌ | ? | ✅ |
| Per-exam readiness / syllabus coverage | ⚠️ grade tracking only | ❌ | ❌ | ❌ | ❌ | ⚠️ progress tracking | ✅ |
| Focus stats (per day/subject) | ❌ | ⚠️ (Plus) | ✅ (premium, yearly) | ⚠️ (premium) | ⚠️ (Pro) | ✅ | ✅ |
| Configurable / flexible intervals | ? | ✅ | ✅ | ✅ (1–120 min) | n/a | ? | ✅ (incl. Flowtime) |
| Free with no ads and no feature caps | ⚠️ 6-assignment cap | ⚠️ freemium | ❌ ads | ⚠️ sync paid | ⚠️ 5-project cap | ⚠️ billing complaints | ✅ |
| Works with no account (local-first) | ? | ❌ (login required, per reviews) | ✅ | ✅ (local, free tier) | ❌ | ❌ | ✅ |
| Web app | ✅ | ⚠️ (extension only) | ✅ | ⚠️ (Chrome extension) | ✅ | ✅ | ✅ |
| Phone app blocking | ❌ | ✅ | ❌ | ⚠️ (strict mode) | ❌ | ❌ | ❌ (explicitly out of scope) |

## How FocusPlan stands apart

1. **The plan *is* the timer queue.** Every generated study block has a one-click Start that opens the Pomodoro timer pre-linked to that topic, and completed Pomodoros are credited straight back. No competitor in the research connects a generated multi-day plan directly to a linked timer this way — Pomofocus and Focus To-Do link timers to *manually entered* tasks, not to a generated, exam-backward schedule.
2. **A deterministic, transparent scheduler working back from exam dates.** FocusPlan spaces first-pass study and review sessions before each exam, respecting daily capacity — a capability none of the six reviewed competitors offer for exams and topics specifically (StudySmarter's spaced repetition is scoped to flashcards only).
3. **Automatic catch-up, not manual re-planning.** A real My Study Life review quotes a user wishing the app could "adapt to my schedule changes automatically." FocusPlan does exactly that: missed blocks are moved into remaining capacity automatically on next open, and an over-capacity banner offers one-click fixes (trim reviews, raise capacity) instead of silently failing or requiring a manual redo.
4. **Readiness, not just minutes.** Timer apps report focus minutes; FocusPlan additionally reports a readiness percentage and topic coverage per exam, answering "am I actually ready?" rather than only "how long did I study?"
5. **Genuinely free, ad-free, account-less and local-first.** Every direct competitor reviewed has a friction point of this kind: My Study Life's 6-assignment free cap, Pomofocus's ads, Focus To-Do's paid and reportedly buggy sync, Todoist's 5-project cap, or StudySmarter's reported trial-billing complaints. FocusPlan stores everything in the browser with no account, and gives the student a JSON export so their data is never trapped.

## What FocusPlan deliberately does not do

Per the research's explicit scope decision, FocusPlan does not attempt native mobile apps or OS-level phone-blocking (Forest's core differentiator), flashcards/notes/mock exams (StudySmarter's territory), LMS integrations, or accounts/payments. These were judged out of scope for the MVP so that effort stayed on the genuinely unmet gap: connecting exam-backward planning to a linked focus timer with automatic catch-up.
