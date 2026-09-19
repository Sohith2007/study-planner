import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Button, Field, Input } from '@/components/ui'
import { newId } from '@/lib'
import type { Subject } from '@/types'
import { ColorPicker } from './ColorPicker'
import { useSafeWrite } from './hooks'
import { addSubject } from './setupRepo'
import { defaultSubjectColor, validateSubjectName } from './setupLogic'

export interface SubjectFormProps {
  subjects: Subject[]
  /** Focus the name input once this becomes true (empty Setup). */
  autoFocus?: boolean
  onAdded: (id: string) => void
}

/** "Add a subject" card (subject-form). */
export function SubjectForm({ subjects, autoFocus, onAdded }: SubjectFormProps) {
  const nameBox = useRef<HTMLDivElement>(null)
  const focusName = () => nameBox.current?.querySelector('input')?.focus()
  const [name, setName] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const colourLabel = useId()
  const write = useSafeWrite()
  const color = picked ?? defaultSubjectColor(subjects)

  useEffect(() => {
    if (autoFocus) nameBox.current?.querySelector('input')?.focus()
  }, [autoFocus])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const err = validateSubjectName(name, subjects)
    setError(err)
    if (err) {
      focusName()
      return
    }
    setBusy(true)
    const id = newId()
    const res = await write(() => addSubject(name, color, id))
    setBusy(false)
    if (!res.ok) return
    setName('')
    setPicked(null)
    onAdded(id)
    focusName()
  }

  return (
    <form
      data-testid="subject-form"
      noValidate
      onSubmit={submit}
      aria-labelledby={`${colourLabel}-h`}
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card md:p-5"
    >
      <h2 id={`${colourLabel}-h`} className="text-heading font-semibold text-text">
        Add a subject
      </h2>
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div ref={nameBox}>
        <Field label="Subject name" testId="subject-name-input" error={error}>
          {(p) => (
            <Input
              {...p}
              value={name}
              placeholder="e.g. Biology"
              autoComplete="off"
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError(null)
              }}
            />
          )}
        </Field>
        </div>
        <div className="flex flex-col gap-1.5">
          <span id={colourLabel} className="text-small font-medium text-text">
            Colour
          </span>
          <ColorPicker value={color} onChange={setPicked} labelledBy={colourLabel} />
        </div>
      </div>
      <Button type="submit" data-testid="subject-add" loading={busy} className="w-full md:ml-auto md:w-auto">
        Add subject
      </Button>
    </form>
  )
}
