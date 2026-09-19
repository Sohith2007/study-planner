import clsx from 'clsx'
import { lazy, Suspense, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { buttonClasses, EmptyState, LoadingBlock, PomodoroPips, Skeleton } from '@/components/ui'
import { db, getPlanMeta, getSettings } from '@/db'
import { todayISO } from '@/lib'
import { ExamCard } from './ExamCard'
import {
  completedFocusToday,
  focusMinutesThisWeek,
  focusMinutesToday,
  hoursMinutesLabel,
  last7DaysSeries,
  overflowFor,
  readiness,
  streak,
  topicsCoverage,
  upcomingExams,
} from './stats'

// Recharts is large: load the chart in its own chunk.
const FocusChart = lazy(() => import('./FocusChart').then((m) => ({ default: m.FocusChart })))

async function loadDashboard() {
  const [subjects, exams, topics, blocks, sessions, settings, plan] = await Promise.all([
    db.subjects.toArray(),
    db.exams.toArray(),
    db.topics.toArray(),
    db.blocks.toArray(),
    db.sessions.toArray(),
    getSettings(),
    getPlanMeta(),
  ])
  return { subjects, exams, topics, blocks, sessions, settings, plan }
}

function StatTile({
  label,
  testId,
  value,
  unit,
  sub,
}: {
  label: string
  testId: string
  value: number
  unit: string
  sub: ReactNode
}) {
  return (
    <div className="flex flex-row items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4 shadow-card md:flex-col md:items-start md:justify-start md:gap-1 md:p-5">
      <p className="order-2 text-caption font-semibold uppercase tracking-wider text-muted md:order-1">{label}</p>
      <p className="order-1 flex items-baseline gap-1.5 md:order-2">
        <span data-testid={testId} className="font-mono text-stat tabular-nums text-text">
          {value}
        </span>
        <span className="text-small text-muted">{unit}</span>
      </p>
      <div className="order-3 hidden text-small text-muted md:block">{sub}</div>
    </div>
  )
}

function DashboardLoading() {
  return (
    <LoadingBlock testId="dashboard-loading">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-44" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </LoadingBlock>
  )
}

/** /dashboard (screens/dashboard.md, F8). Every number comes from the pure functions in stats.ts. */
export default function DashboardPage() {
  const today = todayISO()
  const data = useLiveQuery(loadDashboard, [])

  const header = (
    <div className="flex flex-col gap-1">
      <h1 className="page-title">Dashboard</h1>
      <p className="text-lead text-muted">How ready you are, and how much you&apos;ve focused.</p>
    </div>
  )

  if (!data) {
    return (
      <div className="mx-auto flex w-full max-w-page flex-col gap-6 md:gap-8">
        {header}
        <DashboardLoading />
      </div>
    )
  }

  const { subjects, exams, topics, blocks, sessions, settings, plan } = data
  const goal = Math.max(1, settings.dailyGoalPomodoros)
  const minutesToday = focusMinutesToday(sessions, today)
  const minutesWeek = focusMinutesThisWeek(sessions, today)
  const doneToday = completedFocusToday(sessions, today)
  const goalMet = doneToday >= goal
  const streakDays = streak(sessions, today, goal)
  const toGo = goal - doneToday
  const upcoming = upcomingExams(exams, today)
  const subjectById = new Map(subjects.map((s) => [s.id, s]))
  const series = last7DaysSeries(sessions, subjects, today)

  const streakSub = goalMet
    ? 'Goal met today. Keep it going tomorrow.'
    : streakDays === 0
      ? 'Hit your daily goal to start a streak.'
      : `Do ${toGo} ${toGo === 1 ? 'pomodoro' : 'pomodoros'} today to make it ${streakDays + 1}.`

  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-6 md:gap-8">
      {header}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatTile
          label="Focus today"
          testId="focus-today"
          value={minutesToday}
          unit="min"
          sub={
            goalMet ? (
              <span className="text-success">
                Goal met: {doneToday} of {goal} pomodoros
              </span>
            ) : (
              `${doneToday} of ${goal} pomodoros · goal ${goal}`
            )
          }
        />
        <StatTile
          label="This week"
          testId="focus-week"
          value={minutesWeek}
          unit="min"
          sub={`Since Monday · ${hoursMinutesLabel(minutesWeek)}`}
        />
        <StatTile
          label="Streak"
          testId="streak-count"
          value={streakDays}
          unit={streakDays === 1 ? 'day' : 'days'}
          sub={
            <span className="flex flex-col gap-1.5">
              <PomodoroPips completed={Math.min(doneToday, goal)} total={goal} />
              <span className={clsx(goalMet && 'text-success')}>{streakSub}</span>
            </span>
          }
        />
      </div>

      <section aria-labelledby="dashboard-exams-heading" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="dashboard-exams-heading" className="text-heading font-semibold text-text">
            Upcoming exams
          </h2>
          {upcoming.length > 0 ? (
            <p className="text-small text-muted">
              {upcoming.length} {upcoming.length === 1 ? 'exam' : 'exams'}
            </p>
          ) : null}
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            testId="dashboard-empty"
            illustration="calendar"
            title="No upcoming exams"
            description="Add an exam in Setup to see how ready you are."
            action={
              <Link to="/setup" data-testid="empty-setup-link" className={buttonClasses('primary')}>
                Go to Setup
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((exam) => {
              const cov = topicsCoverage(exam.id, topics)
              return (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  subject={subjectById.get(exam.subjectId)}
                  today={today}
                  readiness={readiness(exam, blocks, plan.overflow, today).percent}
                  covered={cov.covered}
                  totalTopics={cov.total}
                  overflowPomodoros={overflowFor(exam.id, plan.overflow)}
                />
              )
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="dashboard-chart-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="dashboard-chart-heading" className="text-heading font-semibold text-text">
            Last 7 days
          </h2>
          <p className="text-small text-muted">Focus minutes by subject.</p>
        </div>
        <Suspense fallback={<Skeleton className="h-64" />}>
          <FocusChart series={series} today={today} />
        </Suspense>
      </section>
    </div>
  )
}
