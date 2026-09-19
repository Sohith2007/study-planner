import clsx from 'clsx'
import { useRef, type KeyboardEvent } from 'react'
import { Icon } from '@/components/ui'
import { SUBJECT_COLOR_PRESETS } from '@/lib'

export interface ColorPickerProps {
  value: string
  onChange: (hex: string) => void
  /** id of the visible label element. */
  labelledBy: string
  /** Test id prefix; swatches get `<prefix>-<key>`. Default `subject-color`. */
  testIdPrefix?: string
}

/** Subject colour radiogroup: 8 preset swatches, one tab stop, arrow keys move and select. */
export function ColorPicker({ value, onChange, labelledBy, testIdPrefix = 'subject-color' }: ColorPickerProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const current = SUBJECT_COLOR_PRESETS.findIndex((p) => p.value.toLowerCase() === value.toLowerCase())

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const d =
      e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const n = SUBJECT_COLOR_PRESETS.length
    const next = (Math.max(current, 0) + d + n) % n
    onChange(SUBJECT_COLOR_PRESETS[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onKey} className="flex flex-wrap gap-2">
      {SUBJECT_COLOR_PRESETS.map((p, i) => {
        const checked = i === current
        return (
          <button
            key={p.key}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={p.name}
            tabIndex={checked || (current === -1 && i === 0) ? 0 : -1}
            data-testid={`${testIdPrefix}-${p.key}`}
            onClick={() => onChange(p.value)}
            className={clsx(
              'grid size-9 place-items-center rounded-full text-on-primary transition-shadow duration-150 motion-reduce:transition-none',
              checked && 'ring-2 ring-primary ring-offset-2 ring-offset-surface',
            )}
            style={{ backgroundColor: p.value }}
          >
            {checked ? <Icon.Check className="size-4" strokeWidth={3} /> : null}
          </button>
        )
      })}
    </div>
  )
}
