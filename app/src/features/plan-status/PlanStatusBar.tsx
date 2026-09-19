/**
 * PlanStatusBar (P1, design-system 4.6 / screens/app-shell.md): the status row with Replan, the
 * catch-up notice and the over-capacity banner. Layout does not render it on /focus.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button, Icon, buttonClasses, useToast } from '@/components/ui'
import { db, getPlanMeta, getSettings } from '@/db'
import { largestReviewOffset, summarizeOverflow } from '@/logic/scheduler'
import { replan, trimLargestReview } from '@/logic/scheduler/planService'
import type { Exam, PlanMeta } from '@/types'
import {
  dismissCatchUp,
  getPlanStatusState,
  markOverflowAnnounced,
  trackPlanRun,
  usePlanStatusState,
} from './planStatusStore'

const REPLAN_ERROR = "Couldn't rebuild the plan. Your blocks are unchanged. Try Replan again."

function relativeTime(iso: string, now: number): string {
  const mins = Math.floor((now - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

/** Re-renders every `ms` so the relative time stays fresh. */
function useNow(ms: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-3 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
    />
  )
}

export default function PlanStatusBar() {
  const { pending, running, dismissedCatchUpAt } = usePlanStatusState()
  const meta = useLiveQuery(() => getPlanMeta(), [])
  const now = useNow(30_000)
  const toast = useToast()
  const [replanning, setReplanning] = useState(false)
  const updating = pending || running > 0

  const onReplan = async () => {
    setReplanning(true)
    try {
      await trackPlanRun(() => replan())
      toast.show('Plan rebuilt')
    } catch {
      toast.show(REPLAN_ERROR, 'error')
    } finally {
      setReplanning(false)
    }
  }

  const lastCatchUp = meta?.lastCatchUp ?? null
  const showCatchUp = !!lastCatchUp && lastCatchUp.movedCount > 0 && dismissedCatchUpAt !== lastCatchUp.at
  const showOverflow = !!meta && meta.overflow.length > 0

  return (
    <section aria-label="Plan status" className="mx-auto flex w-full max-w-page flex-col gap-2 px-4 pt-3 md:px-6 xl:px-8">
      <div data-testid="plan-status" className="flex items-center justify-between gap-3 text-small text-muted">
        <p className="flex min-w-0 items-center gap-2">
          {updating && <Spinner />}
          <span className="min-w-0">
            {/* Only the state is announced, not the relative-time changes (accessibility.md). */}
            <span aria-live="polite">
              {updating ? 'Updating plan…' : meta?.lastPlannedAt ? 'Plan up to date' : meta ? 'Plan not built yet' : ''}
            </span>
            {!updating && meta?.lastPlannedAt && ` · rebuilt ${relativeTime(meta.lastPlannedAt, now)}`}
          </span>
        </p>
        <Button
          variant="secondary"
          size="sm"
          data-testid="replan-button"
          loading={replanning}
          disabled={updating}
          onClick={onReplan}
        >
          <Icon.Refresh />
          {replanning ? 'Replanning…' : 'Replan'}
        </Button>
      </div>

      {showCatchUp && lastCatchUp && (
        <div role="status" className="flex items-start gap-3 rounded-lg bg-break-soft px-4 py-3 text-break">
          <Icon.Info className="mt-1" />
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold">
              <span data-testid="catchup-notice">
                {lastCatchUp.movedCount === 1 ? 'Moved 1 missed block' : `Moved ${lastCatchUp.movedCount} missed blocks`}
              </span>
            </p>
            <p className="text-small">They're now on today or later, still before their exams.</p>
          </div>
          <button
            type="button"
            data-testid="catchup-dismiss"
            aria-label="Dismiss"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md transition-colors duration-150 hover:bg-surface/60 motion-reduce:transition-none"
            onClick={() => dismissCatchUp(lastCatchUp.at)}
          >
            <Icon.X />
          </button>
        </div>
      )}

      {showOverflow && meta && <OverCapacityBanner meta={meta} busy={updating} />}
    </section>
  )
}

function OverCapacityBanner({ meta, busy }: { meta: PlanMeta; busy: boolean }) {
  const exams = useLiveQuery(() => db.exams.toArray(), [])
  const settings = useLiveQuery(() => getSettings(), [])
  const toast = useToast()
  const [trimming, setTrimming] = useState(false)
  // role="alert" on the first appearance this session only; later appearances use role="status".
  const [role] = useState<'alert' | 'status'>(() => (getPlanStatusState().overflowAnnounced ? 'status' : 'alert'))
  useEffect(() => markOverflowAnnounced(), [])

  const examById = new Map<string, Exam>((exams ?? []).map((e) => [e.id, e]))
  const summary = summarizeOverflow(meta.overflow.filter((o) => examById.has(o.examId)))
  const largest = settings ? largestReviewOffset(settings.reviewOffsets) : null

  if (!exams || summary.total === 0) return null

  const onTrim = async () => {
    setTrimming(true)
    try {
      const { removed } = await trackPlanRun(() => trimLargestReview())
      toast.show(removed === null ? 'Plan rebuilt' : `Removed the +${removed} day review. Plan rebuilt.`)
    } catch {
      toast.show(REPLAN_ERROR, 'error')
    } finally {
      setTrimming(false)
    }
  }

  const items = summary.byExam
    .map((e) => ({ ...e, exam: examById.get(e.examId)! }))
    .sort((a, b) => a.exam.date.localeCompare(b.exam.date) || a.exam.name.localeCompare(b.exam.name))

  return (
    <div
      data-testid="overcapacity-banner"
      role={role}
      className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3"
    >
      <p className="flex items-start gap-2 text-body font-semibold text-text">
        <Icon.Alert className="mt-1 text-warning" />
        <span>
          <span data-testid="overcapacity-total" className="font-mono tabular-nums">
            {summary.total}
          </span>{' '}
          {summary.total === 1 ? "pomodoro doesn't fit before your exams" : "pomodoros don't fit before your exams"}
        </span>
      </p>
      <ul className="text-small text-text">
        {items.map((e) => (
          <li key={e.examId} data-testid="overcapacity-item">
            {e.exam.name}: {e.pomodoros} unscheduled{e.examPassed ? ' (exam date has passed)' : ''}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Button
          variant="secondary"
          data-testid="trim-reviews"
          className="md:h-9 md:px-3 md:text-small"
          loading={trimming}
          disabled={largest === null || busy}
          onClick={onTrim}
        >
          Trim reviews
        </Button>
        <span className="text-small text-muted">
          {largest === null ? 'No reviews left to trim' : `Drops the +${largest} day review`}
        </span>
        <Link
          to="/settings"
          data-testid="overcapacity-settings-link"
          className={buttonClasses('ghost', 'md', 'md:ml-auto md:h-9 md:px-3 md:text-small')}
        >
          Raise daily capacity
        </Link>
      </div>
    </div>
  )
}
