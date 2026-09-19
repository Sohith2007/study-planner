import clsx from 'clsx'
import { Link } from 'react-router'
import { Badge, Button, buttonClasses, Icon, PomodoroPips, SubjectChip } from '@/components/ui'
import { countdownLabel } from '@/lib'
import type { FocusBlockInfo } from './useFocusBlock'

const cardClass =
  'relative flex w-full flex-wrap items-center gap-4 overflow-hidden rounded-xl border border-border bg-surface/70 p-4 md:p-5'

/** Running for another block than the URL: keep the running timer and say so (screens/focus.md). */
export interface ConflictInfo {
  runningLabel: string
  urlLabel: string
  onGoRunning: () => void
}

function ConflictBanner({ conflict }: { conflict: ConflictInfo }) {
  return (
    <div role="status" className="flex w-full flex-wrap items-center gap-2 rounded-md bg-warning-soft px-3 py-2 text-small text-text">
      <Icon.Alert className="text-warning" />
      <span className="flex-1">
        A timer is running for {conflict.runningLabel}. Reset it to switch to {conflict.urlLabel}.
      </span>
      <Button variant="ghost" size="sm" data-testid="timer-go-running" onClick={conflict.onGoRunning}>
        Go to running block
      </Button>
    </div>
  )
}

/** `timer-active-block`: the block being worked on, or the free-focus card. */
export function ActiveBlockCard({ info, conflict }: { info: FocusBlockInfo; conflict: ConflictInfo | null }) {
  const { block, topic, exam, subject, next, missing } = info

  if (!block) {
    return (
      <div data-testid="timer-active-block" className={cardClass}>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {conflict ? <ConflictBanner conflict={conflict} /> : null}
          <p className="eyebrow text-caption font-semibold uppercase tracking-wider text-muted">Free focus</p>
          <p data-testid="timer-active-topic" className="text-lead font-medium text-text">
            Not linked to a block
          </p>
          <p className="text-small text-muted">Minutes still count toward your stats and streak.</p>
          {missing ? (
            <p className="text-small text-warning">
              That block is no longer in your plan. This session will count as free focus.
            </p>
          ) : null}
          <Link
            to="/today"
            data-testid="timer-change-block"
            className="self-start text-small font-medium text-primary underline underline-offset-2"
          >
            Pick a block from Today
          </Link>
        </div>
      </div>
    )
  }

  const title = topic?.name ?? block.title
  const complete = block.completedPomodoros >= block.pomodoros
  const color = subject?.color ?? 'var(--fp-border-strong)'

  return (
    <div data-testid="timer-active-block" className={clsx(cardClass, 'pl-6 md:pl-7')}>
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} aria-hidden="true" />
      {conflict ? <ConflictBanner conflict={conflict} /> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-caption font-semibold uppercase tracking-wider text-muted">Working on</p>
        <p data-testid="timer-active-topic" className="text-lead font-medium text-text">
          {title}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {subject ? <SubjectChip name={subject.name} color={subject.color} /> : null}
          {exam ? (
            <span className="text-small text-muted">
              {exam.name} · {countdownLabel(exam.date)}
            </span>
          ) : null}
          <Badge variant={block.kind} />
          {complete ? <Badge variant="done" /> : null}
        </div>
        <div className="flex items-center gap-2">
          <PomodoroPips completed={block.completedPomodoros} total={block.pomodoros} />
          <span className="font-mono text-small tabular-nums text-text">
            <span data-testid="timer-active-block-progress">
              {block.completedPomodoros}/{block.pomodoros}
            </span>{' '}
            <span className="text-muted">pomodoros</span>
          </span>
        </div>
        {complete ? (
          <div className="flex flex-wrap items-center gap-x-2 text-small text-text">
            <span>Block complete.</span>
            {next ? (
              <Link
                to={`/focus?blockId=${encodeURIComponent(next.block.id)}`}
                data-testid="timer-next-block"
                className="font-medium text-primary underline underline-offset-2"
              >
                Next: {next.label} →
              </Link>
            ) : (
              <>
                <span className="text-muted">That's everything planned for today.</span>
                <Link to="/today" className="font-medium text-primary underline underline-offset-2">
                  Back to Today
                </Link>
              </>
            )}
          </div>
        ) : null}
      </div>
      <Link to="/today" data-testid="timer-change-block" className={buttonClasses('ghost', 'sm')}>
        Change
      </Link>
    </div>
  )
}
