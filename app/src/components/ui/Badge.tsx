import clsx from 'clsx'
import type { HTMLAttributes } from 'react'

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-ink-muted',
  brand: 'bg-brand-soft text-brand-strong',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
}

export function Badge({ tone = 'neutral', className, ...rest }: BadgeProps) {
  return (
    <span
      className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', tones[tone], className)}
      {...rest}
    />
  )
}

/** Subject colour chip: a dot in the subject's colour plus its name. data-testid "subject-chip". */
export function SubjectChip({ name, color, className }: { name: string; color: string; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-xs text-ink-muted', className)} data-testid="subject-chip">
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {name}
    </span>
  )
}
