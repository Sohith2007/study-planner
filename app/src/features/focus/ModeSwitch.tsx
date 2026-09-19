import clsx from 'clsx'
import { useRef, type KeyboardEvent } from 'react'

type Mode = 'classic' | 'flowtime'

const OPTIONS: { value: Mode; label: string; testId: string }[] = [
  { value: 'classic', label: 'Classic', testId: 'timer-mode-classic' },
  { value: 'flowtime', label: 'Flowtime', testId: 'timer-mode-flowtime' },
]

/**
 * Classic / Flowtime radiogroup (`timer-mode`, `data-mode`). Disabled while the timer runs or is paused,
 * then described by the helper text. Arrow keys move the selection.
 */
export function ModeSwitch({
  value,
  onChange,
  disabled,
  describedBy,
}: {
  value: Mode
  onChange: (mode: Mode) => void
  disabled: boolean
  describedBy: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const current = OPTIONS.findIndex((o) => o.value === value)

  const onKey = (e: KeyboardEvent) => {
    if (disabled) return
    const delta =
      e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const next = (current + delta + OPTIONS.length) % OPTIONS.length
    onChange(OPTIONS[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label="Timer mode"
      aria-disabled={disabled || undefined}
      aria-describedby={describedBy}
      data-testid="timer-mode"
      data-mode={value}
      onKeyDown={onKey}
      className={clsx('inline-flex w-full rounded-full bg-sunken p-1 md:w-auto', disabled && 'opacity-60')}
    >
      {OPTIONS.map((o, i) => {
        const checked = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            disabled={disabled}
            data-testid={o.testId}
            onClick={() => onChange(o.value)}
            className={clsx(
              'h-9 flex-1 rounded-full px-5 text-small font-medium transition-colors duration-150 motion-reduce:transition-none',
              checked ? 'bg-surface text-text shadow-card' : 'text-muted hover:text-text',
              disabled && 'cursor-not-allowed',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
