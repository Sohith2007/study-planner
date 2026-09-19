# Screen: Dashboard (`/dashboard`)

**Owner:** P5 (`src/features/dashboard/DashboardPage.tsx`, `stats.ts`) · **Feature:** F8 · **Wireframe:** `wireframes/dashboard.html`

## Purpose
Answers "How ready am I?" for each exam, and "Am I showing up?" through focus minutes, a 7-day chart and a streak. It is honest, not gamified: plain numbers with short explanations.

## Layout regions (`max-w-page mx-auto flex flex-col gap-6 md:gap-8`)
1. **Header:** h1 `Dashboard`. Subtitle `text-lead text-muted`: `How ready you are, and how much you've focused.`
2. **Stat tiles** (`grid grid-cols-1 gap-4 md:grid-cols-3`), 3 StatTiles:
   - **Focus today:** eyebrow `FOCUS TODAY`. The number `focus-today` holds **only the number** (e.g. `0`), followed by the unit `min`. The sub line: `0 of 4 pomodoros · goal 4` (completed focus sessions today vs `dailyGoalPomodoros`). When the goal is met: `Goal met: 4 of 4 pomodoros` in `text-success`.
   - **This week:** eyebrow `THIS WEEK`, number `focus-week` (e.g. `300`), unit `min`, sub `Since Monday · 5 h 0 min`.
   - **Streak:** eyebrow `STREAK`, number `streak-count` (e.g. `5`), unit `days` (`day` when 1), and a sub line:
     - today not yet met: `Do 4 pomodoros today to make it 6.`
     - today met: `Goal met today. Keep it going tomorrow.`
     - streak 0: `Hit your daily goal to start a streak.`
     - The flame-free icon is a small tomato pip row (decorative).
3. **Upcoming exams** (`section`): h2 `Upcoming exams`, count `text-small text-muted` `3 exams`. Grid `grid gap-4 md:grid-cols-2 xl:grid-cols-3`, **sorted by date ascending**, with only exams where `date ≥ today`.
4. **Last 7 days chart** (`section`): h2 `Last 7 days`, helper `Focus minutes by subject.` Card `p-4 md:p-5` containing `focus-chart`.

### Exam card (`exam-card`, `data-exam-id`), the ticket stub
`grid grid-cols-[5.5rem_1fr] rounded-lg border border-border bg-surface shadow-card overflow-hidden`
- **Stub** (left): `flex flex-col items-center justify-center gap-1 bg-sunken border-r border-dashed border-border-strong py-4`, with the days numeral `exam-days-left` in `font-mono text-stat tabular-nums` (`7`) and the label `text-caption uppercase tracking-wider text-muted` `DAYS` (`DAY` for 1; for 0 the numeral is hidden and the label is `TODAY`, in `text-accent font-semibold`).
- **Body** (`p-4 flex flex-col gap-3`):
  - Top: the subject chip (`Chemistry`) and the date `Sat 26 Sep` (`text-small text-muted`, right).
  - Name `exam-card-name`: `font-display text-title font-semibold` `Organic Chemistry Quiz`.
  - Countdown `exam-countdown`: `text-small text-muted` **`in 7 days`** (`today` / `tomorrow` / `in N days`).
  - Readiness row: label `Readiness` (`text-small text-muted`), value `readiness` in `font-mono text-heading tabular-nums text-text` with the text **`38%`** (always an integer followed by `%`), and a progress bar (`role="progressbar" aria-valuenow=38 aria-label="Readiness for Organic Chemistry Quiz"`). The fill is `bg-primary`, or `bg-success` at 100%.
  - Coverage `topics-covered`: `text-small text-text` **`0/3 topics covered`**.
  - Overflow warning (only when this exam has overflow in `meta.plan`): `exam-overflow`, `text-small text-warning` with an alert icon, `4 pomodoros don't fit before this exam`.
  - At 100%: a `Ready` success badge beside the name.

### Chart (`focus-chart`)
- Recharts `ResponsiveContainer` (height 240 at 375, 280 at md and up) → `BarChart` with the stacked `Bar` per subject (`stackId="focus"`), `fill` = subject colour, `radius={[4,4,0,0]}` on the top segment only (simplest: apply it to every bar; acceptable).
- X axis: the 7 days ending **today**, labels `Sun 13` … `Sat 19` (today's label is `Today`). Ticks `fill: var(--fp-muted)`, font 12px Instrument Sans, no axis line.
- Y axis: minutes, 4 ticks, `tickFormatter` `n min` (hidden at 375 to save width). Grid lines: horizontal only, `stroke: var(--fp-border)`.
- Legend (`focus-chart-legend`): a custom HTML legend under the chart (not Recharts' default, for styling control): subject chips `Mathematics`, `Physics`, `Chemistry`, plus `Free focus` (`--fp-chart-unlinked`) **only if** such sessions exist in the range. All subjects with at least one session in the range appear. On the seed that is all three (AC-P5-4).
- Tooltip: `bg-surface border border-border rounded-md shadow-raised p-3 text-small`, with the title `Thu 17 Sep` and rows `● Mathematics  50 min`, plus a total row.
- Accessibility: wrap it in `<figure>` with `<figcaption class="sr-only">`, and a visually hidden `<table>` listing day × subject minutes (`focus-chart-table`).

## Content and copy
| Element | Copy |
|---|---|
| h1 | `Dashboard` |
| Tiles | `FOCUS TODAY` / `THIS WEEK` / `STREAK`; units `min`, `days` |
| Exams h2 | `Upcoming exams` |
| Chart h2 | `Last 7 days` |
| Readiness tooltip (`title` on the label) | `Share of this exam's planned study you've finished, including work that didn't fit.` |

## States
| State | UI |
|---|---|
| Loading | `dashboard-loading`: 3 tile skeletons `h-28`, 3 card skeletons `h-44`, chart skeleton `h-64` |
| Empty: no upcoming exams | the tiles still render (with zeros). The exams section shows `dashboard-empty`: title `No upcoming exams`, body `Add an exam in Setup to see how ready you are.`, CTA primary `Go to Setup` (`empty-setup-link`). **No `exam-card` elements are rendered** (AC-P5-7) |
| Empty: no sessions in 7 days | the chart card shows `chart-empty` (`text-small text-muted`, centred, `h-60 grid place-items-center`): `No focus sessions in the last 7 days. Start one from Today.`, with the link `Go to Today` |
| Error | `page-error` |
| Success | live updates. Completing a pomodoro anywhere updates the tiles and readiness without a reload |

## Responsive
- **375:** the tiles stack in 1 column (each is a row: the number left, the eyebrow and sub right, `flex-row items-center justify-between`). The exam cards are 1 column. The chart has the Y axis hidden and bars at `maxBarSize 18`.
- **768:** tiles in 3 columns, exam cards in 2 columns.
- **1280:** tiles in 3 columns, exam cards in 3 columns, chart at full width.

## Interactions
- Clicking an exam card does nothing in the MVP (no exam detail route). Cards are not focusable, which avoids fake affordances.
- Chart bars are hover/focus tooltips only.
- All numbers are computed by the pure functions in `stats.ts` (readiness, minutes, series, streak) exactly as defined in plan P5 task 1.

## data-testid
`focus-today`, `focus-week`, `streak-count`, `exam-card`, `exam-card-name`, `exam-days-left`, `exam-countdown`, `readiness`, `topics-covered`, `exam-overflow`, `focus-chart`, `focus-chart-legend`, `focus-chart-table`, `chart-empty`, `dashboard-empty`, `empty-setup-link`, `dashboard-loading`.
