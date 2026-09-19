import clsx from 'clsx'
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

const control =
  'w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted ' +
  'focus:border-brand focus:outline-none aria-[invalid=true]:border-danger'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(control, 'h-10', className)} {...rest} />
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(control, 'h-10', className)} {...rest} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(control, 'min-h-24', className)} {...rest} />
}

export interface FieldControlProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby'?: string
}

export interface FieldProps {
  label: ReactNode
  /** Inline error; rendered with role="alert" and data-testid "field-error". */
  error?: string | null
  hint?: ReactNode
  className?: string
  /**
   * Render prop that receives the ids to spread onto the control:
   * `<Field label="Name" error={err}>{(p) => <Input {...p} value={name} onChange={...} />}</Field>`
   */
  children: (props: FieldControlProps) => ReactNode
}

/** Label + control + hint + inline error. */
export function Field({ label, error, hint, className, children }: FieldProps) {
  const id = useId()
  const errId = `${id}-err`
  const hintId = `${id}-hint`
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy })}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errId} role="alert" className="text-xs text-danger" data-testid="field-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}
