/** Week (`/week?start=YYYY-MM-DD`, screens/week.md): Mon–Sun grid of block cards with drag-and-drop moves. */
import clsx from 'clsx'
import { useEffect, useRef, useState, useSyncExternalStore, type DragEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Badge, Button, EmptyState, Icon, LoadingBlock, Skeleton, buttonClasses } from '@/components/ui'
import { WEEKDAY_NAMES, WEEKDAY_SHORT, addDaysISO, parseISODate, startOfWeekISO, todayISO, weekDatesISO } from '@/lib'
import type { Block, Exam, ISODate } from '@/types'
import { format } from 'date-fns'
import { PlannerActions } from './BlockDialogs'
import { BlockCard } from './BlockCard'
import { usePlannerActions } from './actionsContext'
import {
  blockSubject,
  capacityOf,
  formatWeekRange,
  isBlackout,
  normaliseWeekStart,
  plannedLoad,
  validateMoveDate,
  type Lookups,
} from './planner'
import { useBlocksBetween, useLookups } from './usePlannerData'

function subscribeMedia(query: string) {
  return (cb: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {}
    const mq = window.matchMedia(query)
    mq.addEventListener('change', cb)
    return () => mq.removeEventListener('change', cb)
  }
}
const subscribeCoarse = subscribeMedia('(pointer: coarse)')
const getCoarse = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches

export default function WeekPage() {
  const today = todayISO()
  const [params, setParams] = useSearchParams()
  const raw = params.get('start')
  const normalised = normaliseWeekStart(raw)
  const thisMonday = startOfWeekISO(today)
  const monday = normalised ?? thisMonday

  // An invalid or non-Monday ?start= is normalised in place (replace, no extra history entry).
  useEffect(() => {
    if (raw !== null && raw !== monday) setParams({ start: monday }, { replace: true })
  }, [raw, monday, setParams])

  const dates = weekDatesISO(monday)
  const lookups = useLookups()
  const blocks = useBlocksBetween(dates[0], dates[6])

  const goTo = (start: ISODate) => setParams({ start })

  const header = (
    <WeekHeader
      monday={monday}
      isCurrent={monday === thisMonday}
      onPrev={() => goTo(addDaysISO(monday, -7))}
      onNext={() => goTo(addDaysISO(monday, 7))}
      onThisWeek={() => goTo(thisMonday)}
    />
  )

  if (!lookups || !blocks) {
    return (
      <div className="mx-auto flex w-full max-w-page flex-col gap-6" aria-busy="true">
        <div className="flex flex-col gap-1">
          <p className="eyebrow">Week of</p>
          <h1 className="page-title">Week</h1>
        </div>
        <LoadingBlock testId="week-loading">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-7">
            {dates.map((d) => (
              <div key={d} className="flex h-64 flex-col gap-2 rounded-lg bg-sunken p-2">
                <Skeleton className="h-6 w-1/2 bg-surface" />
                <Skeleton className="h-12 bg-surface" />
                <Skeleton className="h-12 bg-surface" />
              </div>
            ))}
          </div>
        </LoadingBlock>
      </div>
    )
  }

  return (
    <PlannerActions lookups={lookups} today={today}>
      <div className="mx-auto flex w-full max-w-page flex-col gap-6">
        {header}
        <WeekBody
          today={today}
          dates={dates}
          blocks={blocks}
          lookups={lookups}
          onNext={() => goTo(addDaysISO(monday, 7))}
        />
      </div>
    </PlannerActions>
  )
}

function WeekHeader({
  monday,
  isCurrent,
  onPrev,
  onNext,
  onThisWeek,
}: {
  monday: ISODate
  isCurrent: boolean
  onPrev: () => void
  onNext: () => void
  onThisWeek: () => void
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-1">
        <p className="eyebrow">Week of</p>
        <h1 className="page-title">Week</h1>
        <p data-testid="week-range" className="text-lead text-muted">
          {formatWeekRange(monday)}
        </p>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" data-testid="week-prev" aria-label="Previous week" onClick={onPrev}>
            <Icon.ChevronLeft />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            data-testid="week-today"
            className="h-11 flex-1 md:flex-none"
            disabled={isCurrent}
            onClick={onThisWeek}
          >
            This week
          </Button>
          <Button variant="secondary" size="icon" data-testid="week-next" aria-label="Next week" onClick={onNext}>
            <Icon.ChevronRight />
          </Button>
        </div>
        <AddTaskButton />
      </div>
    </div>
  )
}

function AddTaskButton() {
  const actions = usePlannerActions()
  return (
    <Button variant="secondary" data-testid="add-task-open" onClick={() => actions.openAddTask()}>
      <Icon.Plus />
      Add task
    </Button>
  )
}

function WeekBody({
  today,
  dates,
  blocks,
  lookups,
  onNext,
}: {
  today: ISODate
  dates: ISODate[]
  blocks: Block[]
  lookups: Lookups
  onNext: () => void
}) {
  const actions = usePlannerActions()
  const coarse = useSyncExternalStore(subscribeCoarse, getCoarse, () => false)
  const [dragging, setDragging] = useState<Block | null>(null)
  const [hoverDate, setHoverDate] = useState<ISODate | null>(null)
  const hoverRef = useRef<ISODate | null>(null)
  const [showPast, setShowPast] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  const noData = lookups.subjects.size === 0 && lookups.exams.size === 0
  const pastDates = dates.filter((d) => d < today)
  const collapsePast = pastDates.length > 0 && dates.includes(today)

  const byDate = new Map<ISODate, Block[]>(dates.map((d) => [d, []]))
  for (const b of blocks) byDate.get(b.date)?.push(b)
  const examsByDate = new Map<ISODate, Exam[]>()
  for (const e of lookups.exams.values()) {
    if (!byDate.has(e.date)) continue
    examsByDate.set(e.date, [...(examsByDate.get(e.date) ?? []), e])
  }
  const weekSubjects = [
    ...new Map(
      blocks.flatMap((b) => {
        const s = blockSubject(b, lookups)
        return s ? [[s.id, s] as const] : []
      }),
    ).values(),
  ]

  // At 768 (horizontal scroll row) bring today's column into view on load.
  useEffect(() => {
    if (!window.matchMedia?.('(min-width: 48rem) and (max-width: 63.999rem)').matches) return
    gridRef.current
      ?.querySelector<HTMLElement>('[data-today="true"]')
      ?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [])

  const canDropOn = (date: ISODate, block: Block | null): boolean => {
    if (!block || block.date === date) return false
    const exam = block.examId ? lookups.exams.get(block.examId) : null
    return validateMoveDate(date, today, exam, { blackoutDates: lookups.settings.blackoutDates }) === null
  }

  const setHover = (d: ISODate | null) => {
    hoverRef.current = d
    setHoverDate(d)
  }

  const endDrag = (e?: DragEvent) => {
    const block = dragging
    const hovered = hoverRef.current
    // A drop on an invalid column fires no `drop` event; explain it with a toast on dragend instead.
    if (block && hovered && hovered !== block.date && e?.dataTransfer.dropEffect === 'none' && !canDropOn(hovered, block)) {
      actions.dropOn(block.id, hovered)
    }
    setDragging(null)
    setHover(null)
  }

  return (
    <>
      {noData ? (
        <EmptyState
          testId="week-empty"
          illustration="calendar"
          title="Nothing planned this week"
          description="Add subjects, exams and topics in Setup and your plan will appear here."
          action={
            <Link to="/setup" data-testid="empty-setup-link" className={buttonClasses('primary')}>
              Go to Setup
            </Link>
          }
        />
      ) : blocks.length === 0 ? (
        <EmptyState
          testId="week-empty"
          illustration="calendar"
          title="Nothing planned this week"
          description="Your exams may be later, or this week has no capacity."
          action={
            <Button variant="secondary" data-testid="week-empty-next" onClick={onNext}>
              Next week
            </Button>
          }
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-small text-muted">
        {weekSubjects.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
        <span className="inline-flex items-center gap-2">
          <Badge variant="new" />
          <Badge variant="review" />
          <Badge variant="task" />
        </span>
        <span className="hidden md:inline xl:ml-auto">Drag a block to another day, or use Move.</span>
      </div>

      {collapsePast ? (
        <button
          type="button"
          data-testid="week-show-past"
          aria-expanded={showPast}
          onClick={() => setShowPast((v) => !v)}
          className={clsx(buttonClasses('ghost', 'md', 'self-start md:hidden'))}
        >
          <Icon.ChevronDown className={clsx('transition-transform duration-150', showPast && 'rotate-180')} />
          {showPast
            ? `Hide ${pastDates.length} earlier ${pastDates.length === 1 ? 'day' : 'days'}`
            : `Show ${pastDates.length} earlier ${pastDates.length === 1 ? 'day' : 'days'}`}
        </button>
      ) : null}

      <div
        ref={gridRef}
        role="list"
        aria-label="Days of the week"
        className="grid grid-cols-1 gap-3 md:snap-x md:snap-mandatory md:auto-cols-[minmax(11rem,1fr)] md:grid-flow-col md:grid-cols-none md:overflow-x-auto md:pb-2 lg:snap-none lg:grid-flow-row lg:grid-cols-7 lg:overflow-visible"
      >
        {dates.map((d) => {
          const dayBlocks = byDate.get(d) ?? []
          const isPast = d < today
          const isToday = d === today
          const blackout = isBlackout(lookups.settings, d)
          const capacity = capacityOf(lookups.settings, d)
          const load = plannedLoad(dayBlocks)
          const over = load > capacity
          const valid = !!dragging && canDropOn(d, dragging)
          const highlighted = valid && hoverDate === d
          const hiddenOnMobile = collapsePast && isPast && !showPast
          const dt = parseISODate(d)
          const wd = dt.getDay()
          const emptyText = blackout
            ? 'Nothing is scheduled on blackout days.'
            : isPast
              ? 'No blocks'
              : capacity === 0
                ? 'Rest day'
                : 'Free'
          return (
            <div
              key={d}
              role="listitem"
              data-testid={`week-day-${d}`}
              data-today={isToday ? 'true' : undefined}
              data-blackout={blackout ? 'true' : undefined}
              aria-current={isToday ? 'date' : undefined}
              aria-label={`${WEEKDAY_NAMES[wd]} ${format(dt, 'd MMMM')}${isToday ? ', today' : ''}, ${load} of ${capacity} pomodoros`}
              onDragOver={(e) => {
                if (!dragging) return
                if (hoverRef.current !== d) setHover(d)
                if (!canDropOn(d, dragging)) return
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null) && hoverRef.current === d) setHover(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                const id = e.dataTransfer.getData('text/plain') || dragging?.id
                setHover(null)
                setDragging(null)
                if (id) actions.dropOn(id, d)
              }}
              className={clsx(
                'relative flex min-h-40 snap-start flex-col gap-2 rounded-lg border p-2 md:min-h-64',
                hiddenOnMobile && 'max-md:hidden',
                isToday ? 'border-primary bg-primary-soft' : 'border-border',
                !isToday && (isPast ? 'bg-sunken' : 'bg-surface'),
                blackout &&
                  !isToday &&
                  'bg-[repeating-linear-gradient(135deg,var(--fp-sunken)_0_6px,transparent_6px_12px)]',
                highlighted && 'bg-primary-soft outline-2 outline-offset-2 outline-dashed outline-primary',
              )}
            >
              <div
                className={clsx(
                  'flex items-baseline justify-between gap-2 border-b px-1 pb-2',
                  isToday ? 'border-primary/30' : 'border-border',
                )}
              >
                <span
                  className={clsx(
                    'flex flex-wrap items-baseline gap-1.5 text-caption font-semibold uppercase tracking-wider',
                    isToday ? 'text-primary' : 'text-muted',
                  )}
                >
                  {WEEKDAY_SHORT[wd]}
                  <span className="font-display text-heading font-semibold normal-case tracking-normal text-text">
                    {dt.getDate()}
                  </span>
                  <span className="normal-case tracking-normal md:hidden">{format(dt, 'MMM')}</span>
                  {isToday ? (
                    <span className="rounded-sm bg-surface px-1.5 py-0.5 normal-case tracking-normal text-primary">
                      Today
                    </span>
                  ) : null}
                  {blackout ? (
                    <span className="font-normal normal-case tracking-normal text-muted">Blackout</span>
                  ) : null}
                </span>
                <span
                  data-testid="week-day-load"
                  className={clsx(
                    'font-mono text-caption tabular-nums',
                    over ? 'text-warning' : isToday || load > 0 ? 'text-text' : 'text-muted',
                  )}
                >
                  {load}/{capacity}
                </span>
              </div>
              <div className={clsx('flex flex-col gap-2', isPast && 'opacity-80')}>
                {(examsByDate.get(d) ?? []).map((e) => (
                  <div
                    key={e.id}
                    data-testid="week-exam-marker"
                    className="rounded-md border-l-2 border-accent bg-accent-soft px-2 py-1.5 text-caption font-semibold text-text"
                  >
                    EXAM · {e.name}
                  </div>
                ))}
                {dayBlocks.map((b) => (
                  <BlockCard
                    key={b.id}
                    block={b}
                    canDrag={!coarse && !isPast}
                    dragging={dragging?.id === b.id}
                    onDragStart={setDragging}
                    onDragEnd={endDrag}
                  />
                ))}
                {dayBlocks.length === 0 ? <p className="py-4 text-center text-caption text-muted">{emptyText}</p> : null}
              </div>
              {highlighted ? (
                <p className="mt-auto py-2 text-center text-caption font-medium text-primary">Drop to move here</p>
              ) : null}
            </div>
          )
        })}
      </div>
    </>
  )
}
