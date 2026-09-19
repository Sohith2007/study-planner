import type { ReactNode } from 'react'
import { Icon } from './icons'

export type EmptyIllustration = 'notebook' | 'done' | 'calendar'

export interface EmptyStateProps {
  title: string
  description?: ReactNode
  /** One primary CTA (Button or Link styled with buttonClasses('primary')). */
  action?: ReactNode
  /** Optional ghost CTA. */
  secondaryAction?: ReactNode
  /** 48px line illustration: notebook (no data), done (all done), calendar (empty week). Default notebook. */
  illustration?: EmptyIllustration
  /** The screen's `*-empty` test id, e.g. "today-empty". Defaults to "empty-state". */
  testId?: string
}

/** design-system 4.9. */
export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  illustration = 'notebook',
  testId = 'empty-state',
}: EmptyStateProps) {
  const Art = illustration === 'calendar' ? Icon.Calendar : illustration === 'done' ? Icon.Check : Icon.Notebook
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface px-6 py-10 text-center md:py-12"
      data-testid={testId}
    >
      <Art className="size-12 text-muted" strokeWidth={1.25} />
      <p className="font-display text-heading font-semibold text-text md:text-title">{title}</p>
      {description ? <div className="max-w-sm text-body text-muted">{description}</div> : null}
      {action || secondaryAction ? (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  )
}
