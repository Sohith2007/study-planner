import type { ReactNode } from 'react'

export interface EmptyStateProps {
  title: string
  description?: ReactNode
  action?: ReactNode
  /** Defaults to "empty-state". */
  testId?: string
}

export function EmptyState({ title, description, action, testId = 'empty-state' }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line bg-surface px-6 py-10 text-center"
      data-testid={testId}
    >
      <p className="text-base font-semibold text-ink">{title}</p>
      {description ? <div className="max-w-md text-sm text-ink-muted">{description}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
