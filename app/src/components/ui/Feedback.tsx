import clsx from 'clsx'
import { Button } from './Button'

/** Skeleton block (design-system 4.10): `rounded-md bg-sunken animate-pulse`. Size it with className. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-md bg-sunken motion-reduce:animate-none', className ?? 'h-4')} />
}

/** Wrapper for a page's loading skeletons, with `data-testid="<page>-loading"` and an sr-only label. */
export function LoadingBlock({ testId, children }: { testId: string; children: React.ReactNode }) {
  return (
    <div data-testid={testId} aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  )
}

/** Page-level read error (design-system 4.11). Test ids: page-error, error-reload. */
export function PageError({ onReload }: { onReload?: () => void }) {
  return (
    <div role="alert" data-testid="page-error" className="flex flex-col gap-3 rounded-lg border border-danger/40 bg-danger-soft p-5">
      <p className="text-heading font-semibold text-text">We couldn't read your study data</p>
      <p className="text-body text-text">
        Your browser blocked local storage. This can happen in private windows. Reload to try again. Nothing has been
        changed.
      </p>
      <div>
        <Button variant="secondary" data-testid="error-reload" onClick={onReload ?? (() => window.location.reload())}>
          Reload
        </Button>
      </div>
    </div>
  )
}

export interface ProgressBarProps {
  /** 0-100. */
  value: number
  label: string
  /** `burn` = the 4px Focus burn line; `focus`/`break` pick its colour. */
  kind?: 'default' | 'burn'
  tone?: 'focus' | 'break'
  className?: string
  testId?: string
}

/** Progress bar (readiness) and burn line (Focus). role=progressbar with aria-valuenow. */
export function ProgressBar({ value, label, kind = 'default', tone = 'focus', className, testId }: ProgressBarProps) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  const fill =
    kind === 'burn' ? (tone === 'break' ? 'bg-break' : 'bg-accent') : v >= 100 ? 'bg-success' : 'bg-primary'
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      data-testid={testId}
      className={clsx('overflow-hidden rounded-full bg-sunken', kind === 'burn' ? 'h-1' : 'h-2', className)}
    >
      <div
        className={clsx('h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none', fill)}
        style={{ width: `${v}%` }}
      />
    </div>
  )
}
