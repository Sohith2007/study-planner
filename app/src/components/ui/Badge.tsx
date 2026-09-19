import clsx from 'clsx'
import type { HTMLAttributes } from 'react'
import { Icon } from './icons'

/**
 * Semantic badge variants (design-system 4.4). When `children` is omitted the default text is used
 * (New, Review, Task, Done, Partial, Skipped, Covered, Pinned). The tone variants
 * (neutral/primary/success/warning/danger/break/accent) have no default text.
 */
export type BadgeVariant =
  | 'new'
  | 'review'
  | 'task'
  | 'done'
  | 'partial'
  | 'skipped'
  | 'covered'
  | 'pinned'
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'break'
  | 'accent'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const styles: Record<BadgeVariant, string> = {
  new: 'bg-primary-soft text-primary',
  review: 'bg-break-soft text-break',
  task: 'bg-sunken text-text border border-border',
  done: 'bg-success-soft text-success',
  partial: 'bg-warning-soft text-warning',
  skipped: 'bg-sunken text-muted line-through',
  covered: 'bg-success-soft text-success',
  pinned: 'bg-sunken text-muted',
  neutral: 'bg-sunken text-muted',
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  break: 'bg-break-soft text-break',
  accent: 'bg-accent-soft text-text',
}

const defaultText: Partial<Record<BadgeVariant, string>> = {
  new: 'New',
  review: 'Review',
  task: 'Task',
  done: 'Done',
  partial: 'Partial',
  skipped: 'Skipped',
  covered: 'Covered',
  pinned: 'Pinned',
}

export function Badge({ variant = 'neutral', className, children, ...rest }: BadgeProps) {
  const icon =
    variant === 'done' || variant === 'covered' ? (
      <Icon.Check className="size-3.5" />
    ) : variant === 'pinned' ? (
      <Icon.Pin className="size-3.5" />
    ) : null
  return (
    <span
      className={clsx(
        'inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-sm px-2 text-caption font-medium',
        styles[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children ?? defaultText[variant]}
    </span>
  )
}

/** Subject colour chip: a dot in the subject's colour (inline style) plus its name. */
export function SubjectChip({
  name,
  color,
  className,
  testId = 'subject-chip',
}: {
  name: string
  color: string
  className?: string
  testId?: string
}) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-small text-muted', className)} data-testid={testId}>
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {name}
    </span>
  )
}

/** Pomodoro pips (decorative, aria-hidden): tomato-outline circles, filled when completed. Max 8 then "+N". */
export function PomodoroPips({ completed, total, className }: { completed: number; total: number; className?: string }) {
  const shown = Math.min(total, 8)
  return (
    <span className={clsx('inline-flex items-center gap-1', className)} aria-hidden="true">
      {Array.from({ length: shown }, (_, i) => (
        <span
          key={i}
          className={clsx('size-2.5 rounded-full border-[1.5px] border-accent', i < completed && 'bg-accent')}
        />
      ))}
      {total > 8 ? <span className="text-caption text-muted">+{total - 8}</span> : null}
    </span>
  )
}
