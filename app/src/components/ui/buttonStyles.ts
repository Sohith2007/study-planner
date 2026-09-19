import clsx from 'clsx'

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-sans font-medium text-body select-none ' +
  'transition-colors duration-150 ease-standard motion-reduce:transition-none ' +
  'active:translate-y-px motion-reduce:active:translate-y-0 disabled:cursor-not-allowed disabled:active:translate-y-0 ' +
  'aria-disabled:cursor-not-allowed'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-hover disabled:bg-sunken disabled:text-muted',
  accent: 'bg-accent text-on-accent hover:bg-accent-hover disabled:bg-sunken disabled:text-muted',
  secondary:
    'bg-surface text-text border border-border-strong hover:bg-sunken disabled:text-muted disabled:border-border',
  ghost: 'bg-transparent text-primary hover:bg-primary-soft disabled:text-muted disabled:hover:bg-transparent',
  danger: 'bg-danger text-on-primary hover:bg-danger-hover disabled:bg-sunken disabled:text-muted',
  'danger-ghost': 'bg-transparent text-danger hover:bg-danger-soft disabled:text-muted disabled:hover:bg-transparent',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-small',
  md: 'h-11 px-4',
  lg: 'h-14 px-6 text-lead rounded-lg',
  icon: 'size-11 p-0',
}

/**
 * Class string for a button look. Use it to style a router <Link> like a button:
 * `<Link to="/setup" className={buttonClasses('primary')}>Go to Setup</Link>`.
 */
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string): string {
  return clsx(base, variants[variant], sizes[size], className)
}
