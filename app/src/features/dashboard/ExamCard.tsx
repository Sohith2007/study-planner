import { Badge, Icon, ProgressBar, SubjectChip } from '@/components/ui'
import { countdownLabel, daysBetween, formatShortDate } from '@/lib'
import type { Exam, ISODate, Subject } from '@/types'

export interface ExamCardProps {
  exam: Exam
  subject: Subject | undefined
  today: ISODate
  readiness: number
  covered: number
  totalTopics: number
  overflowPomodoros: number
}

/** Ticket-stub exam card (screens/dashboard.md "Exam card"). Not interactive. */
export function ExamCard({ exam, subject, today, readiness, covered, totalTopics, overflowPomodoros }: ExamCardProps) {
  const days = daysBetween(today, exam.date)
  const ready = readiness >= 100
  return (
    <article
      data-testid="exam-card"
      data-exam-id={exam.id}
      aria-labelledby={`exam-${exam.id}-name`}
      className="grid grid-cols-[5.5rem_1fr] overflow-hidden rounded-lg border border-border bg-surface shadow-card"
    >
      <div className="flex flex-col items-center justify-center gap-1 border-r border-dashed border-border-strong bg-sunken py-4">
        {days > 0 ? (
          <>
            <span data-testid="exam-days-left" className="font-mono text-stat tabular-nums text-text">
              {days}
            </span>
            <span className="text-caption uppercase tracking-wider text-muted">{days === 1 ? 'Day' : 'Days'}</span>
          </>
        ) : (
          <>
            <span data-testid="exam-days-left" className="sr-only">
              0
            </span>
            <span className="text-caption font-semibold uppercase tracking-wider text-accent">Today</span>
          </>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          {subject ? <SubjectChip name={subject.name} color={subject.color} /> : <span className="text-small text-muted">No subject</span>}
          <span className="text-small text-muted">{formatShortDate(exam.date)}</span>
        </div>
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              id={`exam-${exam.id}-name`}
              data-testid="exam-card-name"
              className="font-display text-title font-semibold break-words text-text"
            >
              {exam.name}
            </h3>
            {ready ? <Badge variant="success">Ready</Badge> : null}
          </div>
          <p data-testid="exam-countdown" className="text-small text-muted">
            {countdownLabel(exam.date, today)}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <span
              className="text-small text-muted"
              title="Share of this exam's planned study you've finished, including work that didn't fit."
            >
              Readiness
            </span>
            <span data-testid="readiness" className="font-mono text-heading tabular-nums text-text">
              {readiness}%
            </span>
          </div>
          <ProgressBar value={readiness} label={`Readiness for ${exam.name}`} />
        </div>
        <p data-testid="topics-covered" className="text-small text-text">
          {covered}/{totalTopics} topics covered
        </p>
        {overflowPomodoros > 0 ? (
          <p data-testid="exam-overflow" className="flex items-center gap-1.5 text-small text-warning">
            <Icon.Alert className="size-4 shrink-0" />
            {overflowPomodoros === 1
              ? "1 pomodoro doesn't fit before this exam"
              : `${overflowPomodoros} pomodoros don't fit before this exam`}
          </p>
        ) : null}
      </div>
    </article>
  )
}
