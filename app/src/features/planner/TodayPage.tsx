/** Today (`/today`, screens/today.md): Up next card with start-next, capacity meter and the block queue. */
import clsx from 'clsx'
import { Link } from 'react-router'
import { Badge, Button, EmptyState, Icon, LoadingBlock, PomodoroPips, Skeleton, buttonClasses } from '@/components/ui'
import { countdownLabel, formatLongDate, todayISO } from '@/lib'
import { useTimer } from '@/logic/timer'
import type { Block } from '@/types'
import { PlannerActions } from './BlockDialogs'
import { BlockRow, KindBadge } from './BlockRow'
import { usePlannerActions } from './actionsContext'
import {
  blockSubject,
  blockTitle,
  capacityOf,
  isBlackout,
  isOpen,
  nextTarget,
  plannedLoad,
  pomodoroCount,
  progressText,
  shortDate,
  type Lookups,
} from './planner'
import { useBlocksBetween, useLookups, useNextOpenBlockAfter } from './usePlannerData'

export default function TodayPage() {
  const today = todayISO()
  const lookups = useLookups()
  const blocks = useBlocksBetween(today, today)
  const nextBlock = useNextOpenBlockAfter(today)

  if (!lookups || !blocks || nextBlock === undefined) {
    return (
      <div className="mx-auto flex w-full max-w-page flex-col gap-6 md:gap-8" aria-busy="true">
        <LoadingBlock testId="today-loading">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-40" />
            <h1 className="page-title">Today</h1>
          </div>
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </LoadingBlock>
      </div>
    )
  }

  return (
    <PlannerActions lookups={lookups} today={today}>
      <TodayContent today={today} lookups={lookups} blocks={blocks} nextBlock={nextBlock} />
    </PlannerActions>
  )
}

function TodayContent({
  today,
  lookups,
  blocks,
  nextBlock,
}: {
  today: string
  lookups: Lookups
  blocks: Block[]
  nextBlock: Block | null
}) {
  const actions = usePlannerActions()
  const target = nextTarget(blocks)
  const noData = lookups.subjects.size === 0 && lookups.exams.size === 0
  const allClosed = blocks.length > 0 && !blocks.some(isOpen)
  const totalPomodoros = blocks.reduce((s, b) => s + b.pomodoros, 0)

  let hero
  if (noData && blocks.length === 0) {
    hero = (
      <EmptyState
        testId="today-empty"
        illustration="notebook"
        title="Nothing planned yet"
        description="Add your subjects, exams and topics, and FocusPlan will build your study plan for you."
        action={
          <Link to="/setup" data-testid="empty-setup-link" className={buttonClasses('primary')}>
            Go to Setup
          </Link>
        }
        secondaryAction={
          <Link to="/data" className={buttonClasses('ghost')}>
            Load the demo semester
          </Link>
        }
      />
    )
  } else if (blocks.length === 0) {
    const capacity = capacityOf(lookups.settings, today)
    const body =
      capacity === 0
        ? 'Today is a rest day in your Settings.'
        : isBlackout(lookups.settings, today)
          ? 'Today is a blackout day.'
          : nextBlock
            ? `Nothing is scheduled today. Your next block is on ${shortDate(nextBlock.date)}.`
            : 'Nothing is scheduled today.'
    hero = (
      <EmptyState
        testId="today-empty"
        illustration="calendar"
        title="No blocks today"
        description={body}
        action={
          <Link to="/week" className={buttonClasses('secondary')}>
            Open Week
          </Link>
        }
        secondaryAction={
          <Button variant="ghost" onClick={() => actions.openAddTask()}>
            Add task
          </Button>
        }
      />
    )
  } else if (allClosed || !target) {
    hero = (
      <EmptyState
        testId="today-empty"
        illustration="done"
        title="All done for today"
        description="Every block is finished or skipped. Rest up, or get ahead with a free focus session."
        action={
          <Link to="/focus" className={buttonClasses('primary')}>
            Start a free focus
          </Link>
        }
        secondaryAction={
          <Link to="/week" className={buttonClasses('ghost')}>
            See this week
          </Link>
        }
      />
    )
  } else {
    hero = <UpNext block={target} lookups={lookups} today={today} />
  }

  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <p data-testid="today-date" className="eyebrow">
            {formatLongDate(today)}
          </p>
          <h1 className="page-title">Today</h1>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
          <CapacityMeter blocks={blocks} lookups={lookups} today={today} />
          <Button
            variant="secondary"
            data-testid="add-task-open"
            className="w-full md:w-auto"
            onClick={() => actions.openAddTask()}
          >
            <Icon.Plus />
            Add task
          </Button>
        </div>
      </div>

      {hero}

      {blocks.length > 0 ? (
        <section aria-labelledby="today-queue-heading" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="today-queue-heading" className="text-heading font-semibold text-text">
              Today's queue
            </h2>
            <p className="text-small text-muted">
              {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'} · {pomodoroCount(totalPomodoros)}
            </p>
          </div>
          <ol data-testid="today-queue" className="flex flex-col gap-3">
            {blocks.map((b) => (
              <BlockRow key={b.id} block={b} isTarget={b.id === target?.id} />
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  )
}

function CapacityMeter({ blocks, lookups, today }: { blocks: Block[]; lookups: Lookups; today: string }) {
  const planned = plannedLoad(blocks)
  const capacity = capacityOf(lookups.settings, today)
  const over = planned - capacity
  const blackout = isBlackout(lookups.settings, today)
  const helper = blackout
    ? 'Today is a blackout day.'
    : capacity === 0
      ? 'Today is a rest day in Settings.'
      : over > 0
        ? `${over} over today's capacity`
        : null
  const continuous = capacity > 16
  return (
    <div data-testid="today-capacity" className="flex flex-col gap-1.5">
      <p className={clsx('text-small', over > 0 && capacity > 0 ? 'text-warning' : 'text-text')}>
        <span className="font-mono tabular-nums">
          {planned} / {capacity}
        </span>{' '}
        pomodoros planned
      </p>
      {capacity > 0 ? (
        continuous ? (
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, (planned / capacity) * 100)}%` }}
            />
          </div>
        ) : (
          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: capacity }, (_, i) => (
              <span key={i} className={clsx('h-1.5 w-6 rounded-full', i < planned ? 'bg-primary' : 'bg-sunken')} />
            ))}
          </div>
        )
      ) : null}
      {helper ? <p className={clsx('text-small', over > 0 && capacity > 0 ? 'text-warning' : 'text-muted')}>{helper}</p> : null}
    </div>
  )
}

function UpNext({ block, lookups, today }: { block: Block; lookups: Lookups; today: string }) {
  const timer = useTimer()
  const title = blockTitle(block, lookups)
  const subject = blockSubject(block, lookups)
  const exam = block.examId ? lookups.exams.get(block.examId) : undefined
  const running = timer.status !== 'idle' && timer.blockId === block.id
  const { focusMinutes, timerMode } = lookups.settings
  return (
    <section
      aria-labelledby="upnext-eyebrow"
      className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 pl-7 shadow-card md:p-8 md:pl-10"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: subject?.color ?? 'var(--fp-muted)' }}
      />
      <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[1fr_auto] xl:items-center xl:gap-8">
        <div className="flex min-w-0 flex-col gap-2">
          <p id="upnext-eyebrow" className="eyebrow">
            Up next
          </p>
          <p className="font-display text-lead font-semibold text-text md:text-title">{title}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <KindBadge kind={block.kind} />
            <span className="inline-flex items-center gap-1.5 text-small text-muted">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: subject?.color ?? 'var(--fp-muted)' }}
              />
              {subject?.name ?? 'No subject'}
            </span>
            {block.kind !== 'task' && exam ? (
              <span className="text-small text-muted">
                for {exam.name} · {countdownLabel(exam.date, today)}
              </span>
            ) : null}
            {block.status === 'partial' ? <Badge variant="partial" /> : null}
          </div>
          <div className="flex items-center gap-2">
            <PomodoroPips completed={block.completedPomodoros} total={block.pomodoros} />
            <span className="font-mono text-small tabular-nums text-text">
              {progressText(block.completedPomodoros, block.pomodoros)}
            </span>
          </div>
        </div>
        <Link
          to={`/focus?blockId=${encodeURIComponent(block.id)}`}
          data-testid="start-next"
          className={buttonClasses('primary', 'lg', 'h-14 w-full flex-col gap-0 px-8 xl:w-auto')}
        >
          <span className="flex items-center gap-2 text-lead font-medium">
            <Icon.Play />
            {running ? 'Back to timer' : 'Start next'}
          </span>
          <span className="text-small font-normal text-on-primary/80">
            {timerMode === 'flowtime' ? 'Flowtime focus' : `${focusMinutes}-min focus`}
          </span>
        </Link>
      </div>
    </section>
  )
}
