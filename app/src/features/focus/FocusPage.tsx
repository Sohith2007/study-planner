/**
 * Focus page (`/focus?blockId=<id>`), screens/focus.md. One block, one clock, one main button.
 * The timer itself lives in TimerProvider (root), so this page only reads `?blockId` and passes it to start().
 */
import clsx from 'clsx'
import { useEffect, useRef, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button, Icon, LoadingBlock, Skeleton, useToast } from '@/components/ui'
import { displayMs, formatClock, PHASE_TEXT, useTimer, useTimerDetails, type TimerApi } from '@/logic/timer'
import { ActiveBlockCard, type ConflictInfo } from './ActiveBlockCard'
import { cycleText, completeMessage, modeHelper, notificationHintText } from './focusCopy'
import { ModeSwitch } from './ModeSwitch'
import { useFocusBlock } from './useFocusBlock'

const SAVE_ERROR =
  "Couldn't save this session. Your time is still shown; try again from Today."

const primaryLg = 'h-14 min-w-40 rounded-lg px-8'

function FocusLoading() {
  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-focus flex-col items-center justify-center py-8">
      <h1 tabIndex={-1} className="sr-only">
        Focus
      </h1>
      <LoadingBlock testId="focus-loading">
        <div className="flex flex-col items-center gap-8">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-28 w-72 rounded-lg md:h-40 md:w-md" />
          <Skeleton className="h-14 w-40" />
        </div>
      </LoadingBlock>
    </div>
  )
}

export default function FocusPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const timer = useTimer()
  const d = useTimerDetails()

  const urlBlockId = params.get('blockId') || null
  const active = timer.status !== 'idle'
  // While a timer runs it owns the block; when idle the URL decides what Start will link.
  const shownBlockId = active ? timer.blockId : urlBlockId
  const conflict = active && urlBlockId !== null && urlBlockId !== timer.blockId
  const shown = useFocusBlock(shownBlockId)
  const urlInfo = useFocusBlock(conflict ? urlBlockId : null)

  // Save failures surface as an error toast; the timer keeps going.
  const seenErrors = useRef(d.saveErrorCount)
  useEffect(() => {
    if (d.saveErrorCount > seenErrors.current) toast.show(SAVE_ERROR, 'error')
    seenErrors.current = d.saveErrorCount
  }, [d.saveErrorCount, toast])

  // Space toggles Start/Pause/Resume when focus is on the page body, the h1 or the timer panel.
  const panelRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<TimerApi>(timer)
  const urlRef = useRef(urlBlockId)
  useEffect(() => {
    timerRef.current = timer
    urlRef.current = urlBlockId
  }, [timer, urlBlockId])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.repeat || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      const el = document.activeElement
      const panel = panelRef.current
      const allowed =
        !el || el === document.body || el === panel || (el.tagName === 'H1' && !!panel?.contains(el))
      if (!allowed) return
      e.preventDefault()
      const t = timerRef.current
      if (t.status === 'running') t.pause()
      else if (t.status === 'paused') t.resume()
      else t.start(urlRef.current)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  if (!d.ready || shown === undefined) return <FocusLoading />

  const isBreak = timer.phase !== 'focus'
  const isFlow = timer.mode === 'flowtime'
  const flowFocus = isFlow && !isBreak
  const every = d.longBreakEvery
  const time = formatClock(displayMs(timer))
  const burn = flowFocus ? 100 : timer.durationMs > 0 ? (timer.remainingMs / timer.durationMs) * 100 : 0
  const resetDisabled = timer.status === 'idle' && timer.phase === 'focus' && timer.completedFocusCount === 0 && !d.notice
  const showSkip = !flowFocus
  const showEndFlow = flowFocus && active
  const message = timer.status === 'idle' && d.notice ? completeMessage(d.notice, every) : null
  const hint = notificationHintText(d.notificationHint, d.settings?.soundEnabled ?? true)

  let conflictInfo: ConflictInfo | null = null
  if (conflict) {
    const runningLabel = d.link?.label ?? (timer.blockId ? 'another block' : 'free focus')
    const urlLabel = urlInfo?.block ? (urlInfo.topic?.name ?? urlInfo.block.title) : 'this block'
    conflictInfo = {
      runningLabel,
      urlLabel,
      onGoRunning: () => navigate(timer.blockId ? `/focus?blockId=${encodeURIComponent(timer.blockId)}` : '/focus'),
    }
  }

  // --- primary control (one at a time) ---
  let primary: ReactNode
  if (timer.status === 'idle') {
    primary = (
      <Button
        variant={isBreak ? 'primary' : 'accent'}
        size="lg"
        data-testid="timer-start"
        className={clsx(primaryLg, 'col-span-2 w-full md:order-2 md:w-auto')}
        onClick={() => timer.start(urlBlockId)}
      >
        {isBreak ? null : <Icon.Play className="size-5" />}
        {isBreak ? 'Start break' : 'Start'}
      </Button>
    )
  } else if (timer.status === 'running') {
    primary = (
      <Button
        variant="secondary"
        size={showEndFlow ? 'md' : 'lg'}
        data-testid="timer-pause"
        className={clsx(showEndFlow ? 'md:order-1' : clsx(primaryLg, 'col-span-2 w-full md:order-2 md:w-auto'))}
        onClick={() => timer.pause()}
      >
        <Icon.Pause className={showEndFlow ? undefined : 'size-5'} />
        Pause
      </Button>
    )
  } else {
    primary = (
      <Button
        variant={showEndFlow ? 'secondary' : isBreak ? 'primary' : 'accent'}
        size={showEndFlow ? 'md' : 'lg'}
        data-testid="timer-resume"
        className={clsx(showEndFlow ? 'md:order-1' : clsx(primaryLg, 'col-span-2 w-full md:order-2 md:w-auto'))}
        onClick={() => timer.resume()}
      >
        <Icon.Play className={showEndFlow ? undefined : 'size-5'} />
        Resume
      </Button>
    )
  }

  return (
    <div
      className={clsx(
        '-mx-4 -my-6 flex flex-1 flex-col px-4 transition-colors duration-500 ease-calm motion-reduce:transition-none md:-mx-6 md:-my-8 md:px-6 xl:-mx-8 xl:px-8',
        isBreak ? 'bg-break-soft' : 'bg-bg',
      )}
      data-phase={timer.phase}
    >
      <div
        ref={panelRef}
        className="mx-auto flex min-h-[70dvh] w-full max-w-focus flex-col items-center justify-center gap-8 py-8 md:gap-10"
      >
        <h1 tabIndex={-1} className="font-display text-heading font-semibold text-muted focus:outline-none">
          Focus
        </h1>

        <div className="flex w-full flex-col items-center gap-2">
          <ModeSwitch
            value={timer.mode}
            onChange={(m) => d.setMode(m)}
            disabled={active}
            describedBy="focus-mode-help"
          />
          <p id="focus-mode-help" className="max-w-sm text-center text-small text-muted">
            {modeHelper(timer.mode, active, d.lengths, every)}
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-4">
          {message ? (
            <p data-testid="timer-complete-msg" className="text-center text-small text-text">
              {message}
            </p>
          ) : null}
          <p
            data-testid="timer-phase"
            className="flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.2em] text-text"
          >
            <span className={clsx('size-2 rounded-full', isBreak ? 'bg-break' : 'bg-accent')} aria-hidden="true" />
            {PHASE_TEXT[timer.phase]}
          </p>
          <p
            data-testid="timer-display"
            role="timer"
            aria-live="off"
            aria-atomic="true"
            className="font-mono text-timer font-light tabular-nums text-text"
          >
            {time}
          </p>
          {timer.status === 'paused' ? (
            <p data-testid="timer-paused-label" className="-mt-2 text-small text-muted">
              Paused
            </p>
          ) : null}
          <div className="h-1 w-full max-w-md overflow-hidden rounded-full bg-sunken" aria-hidden="true">
            <div
              className={clsx(
                'h-full rounded-full',
                isBreak ? 'bg-break' : 'bg-accent',
                flowFocus && active && 'animate-pulse motion-reduce:animate-none',
              )}
              style={{ width: `${Math.max(0, Math.min(100, burn))}%` }}
            />
          </div>
          {isFlow ? null : (
            <p data-testid="timer-cycle" className="text-small text-muted">
              {cycleText(timer.phase, timer.completedFocusCount, every)}
            </p>
          )}
        </div>

        {/* DOM order = primary, (End focus), Skip, Reset. 375: primary full width; md+: [Skip] [Primary] [Reset]. */}
        <div className="grid w-full grid-cols-2 gap-2 md:flex md:items-center md:justify-center md:gap-3">
          {showEndFlow ? (
            <Button
              variant="primary"
              size="lg"
              data-testid="timer-end-flow"
              className={clsx(primaryLg, 'col-span-2 w-full md:order-2 md:w-auto')}
              onClick={() => timer.endFlow()}
            >
              End focus
            </Button>
          ) : null}
          {primary}
          {showSkip ? (
            <Button
              variant="ghost"
              data-testid="timer-skip"
              title="Go to the next phase without counting this one"
              className="md:order-1"
              onClick={() => timer.skip()}
            >
              <Icon.ChevronRight />
              Skip
            </Button>
          ) : null}
          <Button
            variant="ghost"
            data-testid="timer-reset"
            disabled={resetDisabled}
            className={clsx('md:order-3', !showSkip && !showEndFlow && 'col-span-2')}
            onClick={() => timer.reset()}
          >
            <Icon.Refresh />
            Reset
          </Button>
        </div>

        <ActiveBlockCard info={shown} conflict={conflictInfo} />

        {hint ? (
          <p data-testid="notifications-hint" className="flex items-start gap-2 text-small text-muted">
            <BellOff />
            {hint}
          </p>
        ) : null}

        <p className="sr-only" aria-live="polite">
          {d.announcement}
        </p>
      </div>
    </div>
  )
}

function BellOff() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="mt-0.5 size-4 shrink-0"
    >
      <path d="M13.7 21a2 2 0 0 1-3.4 0M18.6 13A17 17 0 0 1 18 8M6.3 6.3A6 6 0 0 0 6 8c0 7-3 9-3 9h14M18 8a6 6 0 0 0-9.3-5M2 2l20 20" />
    </svg>
  )
}
