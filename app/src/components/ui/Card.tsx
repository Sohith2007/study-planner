import clsx from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'

export type CardVariant = 'default' | 'interactive' | 'sunken' | 'danger-zone' | 'hero'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
}

const variants: Record<CardVariant, string> = {
  default: 'rounded-lg border border-border bg-surface shadow-card p-4 md:p-5',
  interactive:
    'rounded-lg border border-border bg-surface shadow-card p-4 md:p-5 hover:border-border-strong transition-colors duration-150',
  sunken: 'rounded-lg border border-transparent bg-sunken shadow-none p-4 md:p-5',
  'danger-zone': 'rounded-lg border border-danger/40 bg-surface shadow-card p-4 md:p-5',
  hero: 'rounded-xl border border-border bg-surface shadow-card p-5 md:p-8',
}

/** design-system 4.3. `hero` is for the Up next card and the timer panel. */
export function Card({ variant = 'default', className, ...rest }: CardProps) {
  return <div className={clsx(variants[variant], className)} {...rest} />
}

export interface CardHeaderProps {
  title: ReactNode
  /** Small uppercase label above the title. */
  eyebrow?: ReactNode
  /** Right-aligned actions. */
  actions?: ReactNode
  /** Heading level, default h2. */
  as?: 'h2' | 'h3'
  className?: string
}

/** Card header: optional eyebrow, h2 `text-heading font-semibold`, right-aligned actions. */
export function CardHeader({ title, eyebrow, actions, as: H = 'h2', className }: CardHeaderProps) {
  return (
    <div className={clsx('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <H className="text-heading font-semibold text-text">{title}</H>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}
