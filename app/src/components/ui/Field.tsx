import clsx from 'clsx'
import {
  useId,
  useRef,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { Icon } from './icons'

/** design-system 4.2 control classes. */
const control =
  'w-full rounded-md border border-border-strong bg-surface px-3 text-body text-text placeholder:text-muted ' +
  'transition-colors duration-150 hover:border-text focus-visible:outline-2 focus-visible:outline-primary ' +
  'focus-visible:outline-offset-0 focus-visible:border-primary disabled:bg-sunken disabled:text-muted ' +
  'aria-[invalid=true]:border-danger'

/** Text/date input (h-11). For numbers add `inputMode="numeric"`, min, max, step=1; it right-aligns with tabular-nums. */
export function Input({ className, type, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={clsx(control, 'h-11', type === 'number' && 'text-right tabular-nums', className)}
      {...rest}
    />
  )
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative w-full">
      <select className={clsx(control, 'h-11 appearance-none pr-9', className)} {...rest}>
        {children}
      </select>
      <Icon.ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  )
}

/** Textarea (quick-add): mono, small, min-h-32, so lines read as a list. */
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(control, 'min-h-32 py-2 font-mono text-small', className)} {...rest} />
}

export interface FieldControlProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby'?: string
  /** Present when Field got a `testId`. */
  'data-testid'?: string
}

export interface FieldProps {
  label: ReactNode
  /** Inline error text. Rendered as `<p role="alert">` with data-testid `<testId>-error` (or `field-error`). */
  error?: string | null
  /** Helper text (hidden while an error shows). */
  hint?: ReactNode
  /** Test id put on the control; the error gets `<testId>-error`. */
  testId?: string
  className?: string
  /**
   * Render prop receiving the props to spread onto the control:
   * `<Field label="Name" testId="subject-name" error={err}>{(p) => <Input {...p} value={name} onChange={...} />}</Field>`
   */
  children: (props: FieldControlProps) => ReactNode
}

/** Label + control + helper or error (design-system 4.2). */
export function Field({ label, error, hint, testId, className, children }: FieldProps) {
  const id = useId()
  const errId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = error ? errId : hint ? hintId : undefined
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-small font-medium text-text">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': !!error,
        'aria-describedby': describedBy,
        ...(testId ? { 'data-testid': testId } : {}),
      })}
      {error ? (
        <p
          id={errId}
          role="alert"
          className="flex items-start gap-1.5 text-small text-danger"
          data-testid={testId ? `${testId}-error` : 'field-error'}
        >
          <Icon.Alert className="mt-0.5" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="text-small text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  disabled?: boolean
  testId?: string
}

/** Toggle switch: `button role="switch" aria-checked` with its label on the right. */
export function Switch({ checked, onChange, label, disabled, testId }: SwitchProps) {
  const id = useId()
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        disabled={disabled}
        data-testid={testId}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-border-strong transition-colors duration-150 aria-checked:bg-primary disabled:opacity-50"
      >
        <span
          className={clsx(
            'size-5 rounded-full bg-surface shadow-card transition-transform duration-150 motion-reduce:transition-none',
            checked ? 'translate-x-5.5' : 'translate-x-0.5',
          )}
        />
      </button>
      <label htmlFor={id} className="text-body text-text">
        {label}
      </label>
    </div>
  )
}

export interface SegmentedOption<T extends string | number> {
  value: T
  label: ReactNode
  testId?: string
}

export interface SegmentedControlProps<T extends string | number> {
  value: T | null
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  /** Accessible name of the radiogroup. */
  label: string
  testId?: string
  className?: string
}

/** Segmented control (mode, confidence, partial count): radiogroup, arrow keys move the selection. */
export function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  label,
  testId,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const current = options.findIndex((o) => o.value === value)
  const onKey = (e: KeyboardEvent) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const next = (Math.max(current, 0) + delta + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-testid={testId}
      onKeyDown={onKey}
      className={clsx('inline-flex rounded-full bg-sunken p-1', className)}
    >
      {options.map((o, i) => {
        const checked = o.value === value
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked || (current === -1 && i === 0) ? 0 : -1}
            data-testid={o.testId}
            onClick={() => onChange(o.value)}
            className="h-9 rounded-full px-4 text-small font-medium text-muted transition-colors duration-150 aria-checked:bg-surface aria-checked:text-text aria-checked:shadow-card"
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
