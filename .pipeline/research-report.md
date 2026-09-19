# Research Report: FocusPlan (working name), an exam-driven study planner with a built-in Pomodoro timer

> Problem statement: Create an application of study planner for students with pomodoro timer
> Date: 2026-09-19 · Author: research-analyst

## 1. Executive summary
Students procrastinate on a large scale. In one survey of about 1,300 high-school and college students, 87% called themselves procrastinators, 45% said it regularly hurts their grades, and 40% said they delay because they feel "overwhelmed or unsure where to start" [1]. Today they get by with two kinds of tool that are rarely connected. The first is **planners** (My Study Life, Todoist, Notion templates), which record deadlines but leave the student to decide what to study and when [8][19][22]. The second is **focus timers** (Forest, Flora, Pomofocus, Focus To-Do), which time the work but "do not help you break it down" [15][13]. Learning science says spreading study over several sessions beats cramming for long-term retention [2]. Yet no free, account-less tool we reviewed turns "exam on date X covering topics A–F" into a spaced schedule of Pomodoro-sized sessions and then moves that schedule forward automatically when the student misses a day. Incumbents also push students away with paywalls, ads and billing problems: My Study Life caps free users at 6 pending assignments [7], Pomofocus shows ads in its free tier [15], Focus To-Do charges for sync [18], and StudySmarter has trial-billing complaints [21]. **Recommended direction:** a local-first, free web app. The student enters subjects, exams and topics. The app generates a spaced, Pomodoro-sized study plan working back from each exam date. Every planned block opens straight into a Pomodoro timer. Missed sessions are rescheduled automatically. A readiness dashboard shows, for each exam, how much of the plan is done.

## 2. Problem analysis
- **Core problem:** Students struggle to (a) turn exams and assignments into a realistic day-by-day plan, (b) start and keep focus once they sit down, and (c) recover when they fall behind. Existing tools handle (a) or (b) but seldom connect them, and they almost never handle (c).
- **Target users / personas:**
  1. **Exam-season undergrad ("Aarav", 20):** has 4–6 exams in a 3-week window. *Goal:* cover every topic before each exam without cramming. *Pain:* doesn't know how to split syllabus topics across the days, over-plans, falls behind, then gives up on the plan. The survey found 79% of college students pulled an all-nighter in one school year [1].
  2. **High-school student with homework plus tests ("Maya", 16):** *Goal:* keep up with daily homework and prepare for unit tests. *Pain:* gets distracted on the phone and the internet, and loses momentum. Distraction is the top reason given for procrastination, at 48% [1]. Free planners cap assignments or add ads [7][15].
  3. **Self-studier / competitive-exam aspirant ("Priya", 22):** *Goal:* log study hours and keep a streak over months. *Pain:* timer apps track minutes but not syllabus coverage, and planner apps don't track focus time [13][19].
- **Jobs to be done:**
  - "When I learn my exam dates, help me turn my syllabus into a daily plan I can actually follow."
  - "When I sit down to study, tell me exactly what to work on now and keep me focused for one block."
  - "When I miss a day, reshuffle my plan so I don't have to redo it by hand."
  - "Before an exam, show me how prepared I am."
- **Constraints & assumptions:**
  - Hackathon timeframe, so web-only with no native mobile apps. That means no OS-level app blocking, which Forest does on mobile [10].
  - Assumption: students will enter topics and a rough effort estimate (in Pomodoros) for each topic. The effort has to be low. Setup friction is a known complaint, for example a user spending 2+ hours setting up classes in My Study Life [7].
  - Assumption: local-first storage (no account) is acceptable for an MVP. Cloud sync is post-MVP.
  - Browsers throttle timers in background tabs, so the timer must be computed from timestamps rather than by counting ticks (see §9).
  - Classic 25/5 Pomodoro is not universally better. Some evidence favours flexible or self-regulated breaks, so intervals should be configurable [3][4].

## 3. Market & context
- **Demand signals:** Procrastination is close to universal among students. APA figures cited by National University put it at 80–95% of college students [29], and a StudyMode survey found 87% self-identify as procrastinators [1]. Of those, 40% cite feeling overwhelmed or not knowing where to start, which is a planning problem, and 48% cite distraction, which is a focus problem [1].
- **Market size (low confidence):** One market-research publisher values "study planner apps" at $2.8B in 2025, projected to reach $7.6B by 2034 (11.7% CAGR) [5]. The number was seen in a search snippet, the report is paywalled, and the methodology could not be verified. Treat it as **unverified** directional evidence only.
- **Learning science:** Distributed or spaced practice gives better long-term retention than a single session of the same total length. UCSD advises students to start a regular schedule weeks before exams and to split time about 75% new material and 25% review [2]. The Dunlosky-style synthesis quoted in secondary sources ranks distributed practice and practice testing as the most effective techniques [26].
- **Pomodoro evidence is mixed:** A 2023 study in the British Journal of Educational Psychology found fatigue rose faster with fixed Pomodoro breaks than with self-regulated breaks, but overall fatigue levels did not differ [4]. A 2025 PMC study found Flowtime (flexible) breaks slowed the rise of fatigue compared with Pomodoro and self-regulated breaks [3]. Implication: support configurable intervals and a flexible mode, and don't sell 25/5 as magic.
- **Trends:** Incumbents are adding AI planning. My Study Life now advertises an AI coach called "Scout" that "builds weekly plans" [6], and StudySmarter integrates AI across flashcards and study plans [20]. Freemium conversion is pushing core features behind paywalls: Forest moved from paid to freemium ("Forest Plus") in December 2025 [11], and My Study Life limits free pending assignments [7].

## 4. Competitor analysis

| Competitor | Type | Key features | Pricing | Strengths | Drawbacks / user complaints | Source |
|---|---|---|---|---|---|---|
| My Study Life | Direct (student planner + timer) | Timetables (rotating/block), homework tracker, exam countdowns, grade tracking, Pomodoro focus timer, "Scout" AI coach, calendar sync (Google/Apple/Outlook/Canvas/Blackboard) | Freemium. Marketed as the "#1 free student planner" [6]; a subscription "starting at $4.99/month" is reported [9]; free tier caps pending assignments at 6 [7] | Student-specific data model, cross-platform (web/iOS/Android), 4.5★ from 6.2K App Store ratings [7] | Class times shown wrong, notifications not firing, 2+ hour class setup, paywalled assignments [7]; relies on manual input, "doesn't help me manage [deadlines]", "wish it could adapt to my schedule changes automatically" [8] | [6][7][8][9] |
| Forest | Indirect (gamified focus timer) | Tree-growing focus timer, Deep Focus app blocking, Plant Together group sessions, Chrome/Firefox extensions, analytics (Plus), real-tree planting | iOS listed at $2 one-time [12]; freemium with "Forest Plus" subscription since Dec 2025 [11][10]; Android free with ads per one comparison [13] | Strong motivation loop, 4.8★ from 49K ratings [12] | No to-do or habit integration [13]; weak friends and invite flow, slows down with heavy use, Watch app limited [12]; virtual rewards small "unless you pay for in-app extras" (Mashable, via [11]); mobile-first, a problem if the phone holds your study material [25] | [10][11][12][13][25] |
| Pomofocus | Direct (web Pomodoro + tasks) | Web timer, tasks with estimated Pomodoros, estimated finish time, daily/weekly/monthly reports, custom intervals and sounds, 3 templates (free) | Free with ads. Premium adds projects, yearly reports, CSV, unlimited templates, Todoist, webhooks. Price reported at $3/mo, $18/yr, $54 lifetime by third parties [16], **not published on the site** [15] | Zero-friction web app, closest in form factor to our MVP [14] | Ads in a focus tool; "does not help you break [work] down"; 3-template cap; limited offline [15]; no exam, calendar or multi-day planning (per its feature list [14]) | [14][15][16] |
| Focus To-Do | Direct (Pomodoro + task manager) | Pomodoro linked to tasks, projects, subtasks, due dates, reminders, recurring tasks, statistics; iOS/Android/Win/Mac/Chrome | Free tier (local only). Premium $1.99/mo, $9.99/yr, or $11.99 lifetime [18] | Timer and tasks in one app, 1–120 minute intervals [18] | Sync is premium-only and "widely reported as buggy, with duplicates and occasional lost data"; cluttered on small screens; no external calendar integration; white noise paywalled [18] | [17][18] |
| Todoist | Indirect (general task manager) | Projects, quick add, reminders, filters; Pro adds calendar layout, task duration, deadlines, reporting | Free "Beginner" (5 projects, 3 filters, 1-week history) [19]; Pro about $5/mo annual or $7 monthly after a Dec-2025 price rise [28] | Mature, fast capture, integrations [19] | No built-in Pomodoro timer (none listed on the pricing/features page [19]); not student- or exam-aware; 5-project free cap, which is tight for a full course load [19] | [19][28] |
| StudySmarter | Indirect (all-in-one learning platform) | Flashcards, notes, community study sets, study plans with a "dynamic calendar for tracking study goals and exam dates", AI tools, mock exams, spaced repetition [20]; a basic Pomodoro timer per a third-party roundup (unverified) | Free with a Premium tier; price not shown on the homepage [20] | Content plus planning plus spaced repetition in one place; "40 million learners" claim [20] | Users report being charged for a full year after a 7-day trial with no notice and refused refunds [21]; heavy, content-centric platform rather than a lightweight planner | [20][21] |
| Flora | Indirect (social focus timer) | Tree-growing timer, to-dos, habits, group rooms with shared tree death, real-tree pledges | Free core, optional in-app purchases ($0.99–$1.99 listed) [27] | Strong group accountability [27][13] | No desktop or Chrome extension, less polished UI, smaller user base [13] | [13][27] |
| Notion student templates | Indirect (DIY) | Community templates combining calendar, subjects, a "handmade pomodoro planner", with embeddable third-party timer widgets [22] | Notion plus many free templates; some templates paid on Gumroad (unverified) | Infinitely customizable | Timer is an embedded third-party iframe, not tied to tasks [22]; templates advertise "No Complex Setup Needed", which suggests setup complexity is a common objection (weak evidence) | [22] |
| Super Productivity | Open source | Tasks, timeboxing, time tracking, Pomodoro and break reminders, anti-procrastination feature, integrations (Jira/GitHub), CalDAV, privacy-focused, MIT license, about 22.1k GitHub stars [23] | Free / OSS | Local-first, no data collection, cross-platform [23] | Developer- and work-oriented (Jira/GitLab integrations), no exam or syllabus planning model [23] | [23] |
| Pomatez | Open source | Desktop Pomodoro with configurable breaks, session count, notifications, to-do list [24] | Free / OSS | Lightweight, simple [24] | Desktop timer only, no study planning [24] | [24] |

### 4.1 My Study Life
- **What it is:** The best-known free student planner. It covers the class timetable, homework, exams and grades on web, iOS and Android, and now adds a Pomodoro timer and an AI "Scout" coach [6].
- **Standout features:** Rotating/block timetables, exam countdowns, Canvas/Blackboard/Google calendar sync, and Family Connect for parents [6].
- **Drawbacks** (from reviews): Wrong class times after saving, notifications not sent, a painful time-entry UI ("save the hour, minute, and meridiem changes individually"), and the 6-pending-assignment free cap [7]. An independent review calls it "a digital paper planner" where "you still need to enter deadlines, prioritize tasks, and move things around yourself", with no analytics or productivity insights [8]. It also "needs more syncing options" [9]. Note that the AI coach [6] may postdate the July 2025 review [8]; how well Scout adapts plans is **unverified**.

### 4.2 Forest
- **What it is:** A gamified focus timer. A virtual tree grows while you stay off your phone [10].
- **Standout features:** Deep Focus app blocking, Time Guard scheduled blocking, Plant Together, browser extensions, and real trees via Trees for the Future [10].
- **Drawbacks:** No planning or to-do integration [13]. The friends/invite flow is clunky and the app slows down after long-term use [12]. Monetization concerns (Mashable via [11]). Pricing is confusing because it differs by platform and changed to freemium in December 2025 [11][12][13]. Being mobile-first is a problem if the phone is needed for study [25].

### 4.3 Pomofocus
- **What it is:** A popular browser Pomodoro timer with a simple task list and time estimates [14].
- **Standout features:** Estimated Pomodoros per task, estimated finish time, and visual reports [14].
- **Drawbacks:** Ads in a focus tool, no help breaking work down, a 3-template free cap, and weak offline support [15]. Premium pricing is not published on the site [15]; third-party sites list $3/mo, $18/yr or $54 lifetime [16]. It has no concept of exams, subjects or multi-day plans [14].

### 4.4 Focus To-Do
- **What it is:** A Pomodoro timer merged with a task manager, on every major platform [17].
- **Standout features:** Pomodoros logged per task, 1–120 minute intervals (liked by ADHD users), and a cheap lifetime license [18].
- **Drawbacks:** Paid sync that is "widely reported as buggy, with duplicates and occasional lost data", no calendar integration, a cluttered mobile UI, and white noise locked behind the paywall [18]. It is general-purpose and not exam-aware [17].

### 4.5 Todoist
- **What it is:** A general-purpose task manager [19].
- **Standout features:** Quick add, filters, and a calendar layout and task durations in Pro [19].
- **Drawbacks:** No native Pomodoro [19]. The free tier is capped at 5 projects and 1 week of history [19]. Pro rose to $5/mo (annual) in December 2025 [28]. It has no model of exams, topics or spaced review.

### 4.6 StudySmarter
- **What it is:** An all-in-one learning platform with flashcards, notes, study sets, AI, mock exams and study plans [20].
- **Standout features:** Study plans with exam dates, and built-in spaced-repetition study modes [20].
- **Drawbacks:** Trustpilot users report being billed for a year after a trial with no notice and having refunds refused [21]. It is a heavy platform centred on content creation. Premium price is not listed on the homepage [20].

### 4.7 Flora
- **What it is:** A Forest-like focus app with to-dos, habits and group rooms [27].
- **Standout features:** Shared accountability, where everyone's tree dies if one member uses their phone [13]. The core app is free [27].
- **Drawbacks:** No desktop or extension support, less polished UI, smaller community [13].

### 4.8 Notion templates (DIY)
- **What it is:** User-built study dashboards with embedded timer widgets [22].
- **Standout features:** Full customization and many free templates [22].
- **Drawbacks:** The timer is a separate iframe widget that isn't linked to tasks or logged against topics [22]. Setup and maintenance effort falls on the student (template marketing that stresses "no complex setup" is weak evidence).

### 4.9 Open source: Super Productivity and Pomatez
- **What they are:** Super Productivity (MIT, about 22.1k stars) is a local-first task manager with timeboxing and Pomodoro [23]. Pomatez is a lightweight desktop Pomodoro timer [24].
- **Standout features:** Privacy, no account needed, and time tracking [23].
- **Drawbacks:** Built for developers and knowledge workers (Jira/GitHub integrations) rather than exams and syllabi [23]. Pomatez is a timer only [24]. Both are useful references for the timer and state design.

## 5. Feature comparison matrix
Legend: ✅ yes · ❌ no · ⚠️ partial or paywalled · ? unverified

| Feature | My Study Life | Forest | Pomofocus | Focus To-Do | Todoist | StudySmarter | **Ours (proposed)** |
|---|---|---|---|---|---|---|---|
| Pomodoro / focus timer | ✅ [6] | ✅ [10] | ✅ [14] | ✅ [17] | ❌ [19] | ? (third-party claim) | ✅ |
| Timer linked to a specific task/topic | ? | ❌ [13] | ✅ [14] | ✅ [18] | ❌ | ? | ✅ |
| Exam dates & countdown | ✅ [6] | ❌ | ❌ [14] | ❌ | ⚠️ deadlines (Pro) [19] | ✅ [20] | ✅ |
| Auto-generated multi-day plan from exams/topics | ⚠️ AI coach, quality unverified [6][8] | ❌ | ❌ [15] | ❌ | ❌ | ⚠️ "study plans" [20] | ✅ transparent spaced plan |
| Spaced review sessions scheduled automatically | ❌ [8] | ❌ | ❌ | ❌ | ❌ | ⚠️ spaced repetition for flashcards [20] | ✅ |
| Auto-reschedule missed sessions | ❌ ("wish it could adapt") [8] | ❌ | ❌ | ❌ | ❌ | ? | ✅ |
| Per-exam readiness / syllabus coverage | ⚠️ grade tracking [6] | ❌ | ❌ | ❌ | ❌ | ⚠️ progress tracking [21] | ✅ |
| Focus stats (per day/subject) | ❌ no analytics [8] | ⚠️ advanced in Plus [10] | ✅ (yearly in premium) [14] | ⚠️ detailed in premium [18] | ⚠️ Pro [19] | ✅ [21] | ✅ |
| Configurable / flexible intervals | ? | ✅ [10] | ✅ [14] | ✅ 1–120 min [18] | n/a | ? | ✅ incl. flexible mode |
| Free with no ads and no feature caps | ⚠️ 6-assignment cap [7] | ⚠️ freemium [11] | ❌ ads [15] | ⚠️ sync paid [18] | ⚠️ 5 projects [19] | ⚠️ billing complaints [21] | ✅ |
| Works with no account (local-first) | ? | ❌ login required per reviews (unverified) | ✅ [14] | ✅ local in free tier [18] | ❌ | ❌ | ✅ |
| Web app | ✅ [6] | ⚠️ extension only [10] | ✅ [14] | ⚠️ Chrome extension [17] | ✅ | ✅ | ✅ |
| Phone app blocking | ❌ | ✅ [10] | ❌ | ⚠️ strict mode [18] | ❌ | ❌ | ❌ (out of scope) |

## 6. Gaps & opportunities
1. **Planning and focusing are split across two apps.** Timer apps don't plan: Pomofocus "does not help you break it down" [15] and Forest has no to-do integration [13]. Planners either don't time the work (Todoist [19]) or are "digital paper planner[s]" [8]. Students must translate between the two by hand, and 40% of procrastinators say they don't know where to start [1]. **Opportunity:** the plan *is* the timer queue. The "Start" button on today's next block launches the Pomodoro.
2. **No tool schedules spaced review working back from an exam.** Spaced practice clearly beats cramming [2][26]. Only StudySmarter applies spaced repetition, and only to flashcards [20]. None of the timer apps model exams at all [14][17][10]. **Opportunity:** a deterministic scheduler that places first-pass study sessions for each topic plus review sessions (for example +1, +3 and +7 days, capped before the exam), following UCSD's rough 75/25 new/review guidance [2].
3. **Plans break when life happens.** A My Study Life user asks for a planner that can "adapt to my schedule changes automatically" [8], and reviews describe tools that rely on manual re-planning [8]. **Opportunity:** a one-click or automatic "catch-up" that moves missed blocks into the remaining free capacity before the exam and warns when the plan no longer fits.
4. **Paywalls, ads and billing problems in core flows.** These include the 6-assignment cap [7], ads in a focus tool [15], paid and buggy sync [18], and trial-billing complaints [21]. **Opportunity:** a genuinely free, ad-free, account-less, local-first MVP with JSON export, so data is never trapped.
5. **Progress is measured in minutes, not readiness.** Timer apps report minutes focused [14][12]. My Study Life lacks analytics and progress insight [8]. **Opportunity:** per-exam readiness (share of planned Pomodoros completed, topics covered, days left) alongside focus minutes and streaks.
6. **One-size Pomodoro.** The evidence for fixed 25/5 is mixed [3][4]. **Opportunity:** presets (25/5, 50/10) plus a flexible "Flowtime" mode where break length scales with the focus time just completed.

## 7. Recommended USPs

| # | USP | Why it matters (evidence) | Competitors lacking it |
|---|---|---|---|
| 1 | **Exam-backward spaced planner:** enter exam date, topics and effort (in Pomodoros), and the app auto-generates a day-by-day plan of Pomodoro-sized sessions with scheduled spaced-review blocks, respecting the student's daily capacity. | 40% of procrastinators feel overwhelmed or unsure where to start [1]; spaced practice beats cramming [2][26]; timers don't break work down [15]; planners need manual prioritizing [8] | Pomofocus, Focus To-Do, Forest, Flora, Todoist (none plan from exams); My Study Life/StudySmarter offer plans but not spaced topic review in a timer-linked queue [6][8][20] |
| 2 | **Plan-to-timer in one click, with automatic logging:** every planned block has "Start", which runs the Pomodoro and credits completed Pomodoros to that topic and exam. | Removes the planner-to-timer translation; Forest lacks to-do integration [13]; Todoist has no timer [19]; Notion timers are unlinked iframes [22] | Forest, Flora, Todoist, Notion templates, My Study Life (timer exists but not tied to a generated plan, unverified) |
| 3 | **Auto catch-up rescheduling:** missed or unfinished blocks are moved automatically into remaining capacity before the exam, with an "over capacity" warning and suggested fixes. | "Wish it could adapt to my schedule changes automatically" [8]; all-nighters are common (79% of college students) [1] | All reviewed competitors (no evidence of automatic rescheduling found) |
| 4 | **Exam readiness dashboard:** a readiness % per exam (planned vs completed Pomodoros and topics), days left, focus minutes by subject, and a streak. | My Study Life has no analytics or insight [8]; timer apps report minutes, not syllabus coverage [14][12]; detailed stats are paywalled elsewhere [10][18] | Pomofocus, Forest, Focus To-Do, My Study Life, Todoist |
| 5 | **Free, ad-free, no-account, local-first:** all data in the browser (IndexedDB), with JSON export/import. | Assignment caps [7], ads [15], paid and buggy sync [18], billing complaints [21] | My Study Life, Pomofocus, Focus To-Do, StudySmarter, Todoist |

## 8. Proposed feature set
### Must-have (MVP)
- **F1 Subjects, exams and topics setup:** Create subjects (with a colour), exams (subject, date) and topics under each exam, each with an effort estimate in Pomodoros (default 2) and a difficulty. Includes a quick-add of topics as one per line to keep setup friction low (a known complaint [7]). (supports USP 1)
- **F2 Study availability settings:** Daily Pomodoro capacity for each weekday (for example Mon–Fri 6, Sat 8, Sun 0), timer lengths, and blackout dates. (supports USP 1, 3)
- **F3 Auto plan generator:** A deterministic greedy scheduler that works back from each exam date. It places first-pass sessions for every topic, adds spaced-review blocks (+1/+3/+7 days where they fit before the exam), interleaves subjects, stays within daily capacity and reserves the day before the exam for review. It also flags when the plan doesn't fit. (supports USP 1)
- **F4 Today and Week views:** Today shows an ordered queue of blocks (topic, subject, type new/review, Pomodoros) with a big "Start next" button. Week shows a calendar grid of planned blocks. Users can add, edit, drag or move and delete blocks by hand, and add ad-hoc tasks or homework. (supports USP 1, 2)
- **F5 Pomodoro timer linked to blocks:** Focus, short break and long break (after 4 by default) with configurable lengths. Includes start, pause, skip and reset, timestamp-based accuracy in background tabs, browser notification plus sound, a countdown in the tab title, and an optional flexible (Flowtime) mode. Completed Pomodoros are credited to the active topic. (supports USP 2)
- **F6 Session completion and topic progress:** Mark a block done, partially done or skipped. Mark a topic "covered" and give it a 1–3 confidence rating (low confidence adds an extra review block). (supports USP 2, 4)
- **F7 Auto catch-up rescheduling:** When the app opens, past-due incomplete blocks are rescheduled into remaining capacity before their exam. There is also a manual "Replan" button. An over-capacity warning suggests increasing the daily Pomodoros or trimming review blocks. (supports USP 3)
- **F8 Dashboard and stats:** A readiness % and countdown per exam, focus minutes today and this week, a bar chart of the last 7 days by subject, and the daily-goal streak. (supports USP 4)
- **F9 Local-first persistence and export:** All data in IndexedDB or localStorage with no account, JSON export/import for backup, and a "reset demo data" / seeded sample semester for the demo. (supports USP 5)

### Nice-to-have (post-MVP)
- PWA install plus offline caching.
- Ambient or white-noise sounds during focus (a paid feature in Focus To-Do and Forest [18][10]).
- `.ics` export and Google Calendar sync. Rival sync is the source of many complaints [7][9][18], so it has to be done carefully.
- Optional account and cloud sync across devices.
- AI assist that pastes a syllabus and suggests a topic list and effort estimates. This matches the AI-planning trend [6][20], but keep the deterministic scheduler as the core.
- Gamification such as badges or a growing plant, and "study together" rooms with shared timers (the Forest and Flora social loop [10][27]).
- Distraction-site blocking via a browser extension.
- Dark mode and theme customization.
- Grade tracking and class timetables (My Study Life parity [6]).

### Explicitly out of scope
- Native iOS/Android apps and OS-level phone app blocking.
- Flashcards, notes, mock exams and learning content (StudySmarter's territory [20]).
- LMS integrations (Canvas/Blackboard), parent or teacher accounts, and team features.
- Payments or subscriptions.
- Advanced ML-driven spaced-repetition algorithms such as SM-2 per item or FSRS. Fixed review offsets are enough for the MVP.

## 9. Technical notes
- **Suggested stack:** React + Vite + TypeScript, with Tailwind for styling. Zustand (or React context) for state. **Dexie.js** (IndexedDB wrapper) or plain `localStorage` for persistence. **date-fns** for date maths. **Recharts** or Chart.js for the stats charts. Playwright for e2e tests. A backend is optional; everything above runs client-side.
- **Timer accuracy (key risk):** Browsers throttle `setInterval`/`setTimeout` in background tabs. Store `startedAt` and `endsAt` timestamps and derive the remaining time as `endsAt - Date.now()` on every tick and on the `visibilitychange` event. Persist the running timer to storage so a page refresh doesn't lose it. A Web Worker can help but is optional.
- **Notifications and sound:** Use the Web Notifications API (request permission on the first timer start, and degrade gracefully if denied) and the Web Audio API or an `<audio>` element for a short chime. Autoplay rules require a prior user gesture, which the Start click provides.
- **Scheduler algorithm:** Keep it deterministic and unit-testable. (1) For each exam, expand topics into N "new" units plus review units at +1/+3/+7 days after the first pass. (2) Sort by the latest feasible date (the exam date minus the review offsets), then fill days from today forward greedily by earliest deadline, respecting daily capacity and round-robin interleaving across subjects. (3) Report unscheduled units as overflow. Re-running the scheduler on uncompleted units implements catch-up (F7). This is pure logic with no API, so it's a good candidate for heavy unit tests.
- **Calendar UI:** A custom CSS-grid week view is simplest. FullCalendar (standard plugins are MIT) is an option if drag-and-drop is needed, but adds weight.
- **Reference open-source projects:** Super Productivity (MIT, about 22.1k stars; timeboxing, Pomodoro, local-first design) [23] and Pomatez (a simple timer with configurable breaks) [24]. Use them for UX and state-model inspiration only, not code copying.
- **No external APIs are required for the MVP.** Optional later: Google Calendar API (OAuth adds scope) and an LLM API for syllabus-to-topics suggestions (needs an API key via `.env.example`).
- **Other risks:** The effort-estimate UX (students may under-estimate, so default to 2 Pomodoros per topic and let the confidence rating add reviews). Over-capacity plans (surface them clearly rather than silently overflowing). IndexedDB data loss if the browser storage is cleared (mitigated by JSON export).

## 10. Sources
[1] PR Newswire, "Eighty-seven percent of high school and college students are self-proclaimed procrastinators" (StudyMode survey, 2014): https://www.prnewswire.com/news-releases/eighty-seven-percent-of-high-school-and-college-students-are-self-proclaimed-procrastinators-260750441.html
[2] UC San Diego Psychology, "Spaced Practice": https://psychology.ucsd.edu/undergraduate-program/undergraduate-resources/academic-writing-resources/effective-studying/spaced-practice.html
[3] PMC, "Investigating the Effectiveness of Self-Regulated, Pomodoro, and Flowtime Break-Taking Techniques Among Students" (seen in search results; full-text fetch was blocked by reCAPTCHA): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12292963/
[4] Biwer et al. 2023, "Understanding effort regulation: Comparing 'Pomodoro' breaks and self-regulated breaks", British Journal of Educational Psychology (seen in search results): https://bpspsychub.onlinelibrary.wiley.com/doi/10.1111/bjep.12593
[5] Market Intelo, "Study Planner Apps Market Research Report 2034" (seen in search results; figures unverified): https://marketintelo.com/report/study-planner-apps-market
[6] MyStudyLife homepage: https://mystudylife.com/
[7] Apple App Store, My Study Life ratings & reviews: https://apps.apple.com/us/app/my-study-life-school-planner/id910639339?see-all=reviews&platform=iphone
[8] 21st Gen EdTech Tools, "MyStudyLife Review: A Digital Lifeline for Students or a Missed Opportunity" (July 2025): https://www.21stgenedtechtools.com/2025/07/mystudylife-review-digital-lifeline-for.html
[9] Educational App Store, My Study Life review: https://www.educationalappstore.com/app/my-study-life-school-planner
[10] Forest official site: https://www.forestapp.cc/
[11] Wikipedia, "Forest (application)": https://en.wikipedia.org/wiki/Forest_(application)
[12] Apple App Store, Forest: Focus for Productivity reviews: https://apps.apple.com/us/app/forest-focus-for-productivity/id866450515?see-all=reviews
[13] FaithLock, "Forest vs Flora (2026): Honest Side-by-Side Comparison": https://www.getfaithlock.com/resources/forest-vs-flora
[14] Pomofocus homepage: https://pomofocus.io/
[15] Pomodorian, "Pomofocus Review 2026: What's Free, What's Premium": https://pomodorian.app/pomodorian-vs-pomofocus
[16] TrustRadius, "Pomofocus Pricing" (seen in search results; price not confirmed at source): https://www.trustradius.com/products/pomofocus/pricing
[17] Focus To-Do official site: https://www.focustodo.cn/
[18] Goals and Progress, "Focus To-Do Review 2026": https://goalsandprogress.com/is-focus-to-do-worth-it-in-2025-full-review-features-focus-to-do/
[19] Todoist pricing page: https://www.todoist.com/pricing
[20] StudySmarter homepage: https://www.studysmarter.co.uk/
[21] Trustpilot, StudySmarter reviews (seen in search results): https://www.trustpilot.com/review/studysmarter.de?page=2
[22] Notion Marketplace, "Study/Pomodoro planner" template (seen in search results): https://www.notion.com/en-gb/templates/study-pomodoro-planner
[23] GitHub, super-productivity/super-productivity: https://github.com/super-productivity/super-productivity
[24] GitHub, zidoro/pomatez (seen in search results): https://github.com/zidoro/pomatez
[25] ToolFinder, "Best Study Timer Apps in 2026 for Students": https://toolfinder.com/best/study-timer-apps
[26] Evidence Based Education, "Retrieval and Spaced Practice: Study Strategies That Must Be Combined" (seen in search results): https://evidencebased.education/resource/retrieval-and-spaced-practice-study-strategies-that-must-be-combined/
[27] Nerdynav, "Forest vs Flora: Which Focus App Is Better? [2026]" (seen in search results; direct fetch failed): https://nerdynav.com/forest-vs-flora-pomodoro/
[28] Morgen, "Todoist Pricing, Features & Limits: Is It Worth It in 2026?" (seen in search results): https://www.morgen.so/blog-posts/todoist-pricing
[29] National University, "Helping Students Overcome Procrastination" (seen in search results): https://www.nu.edu/blog/helping-students-overcome-procrastination/
