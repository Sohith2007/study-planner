import clsx from 'clsx'
import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Button, Field, Icon, Input } from '@/components/ui'
import { newId } from '@/lib'
import type { Exam, ISODate, Subject, Topic } from '@/types'
import { ColorPicker } from './ColorPicker'
import { ExamBlock } from './ExamBlock'
import { useSafeWrite } from './hooks'
import { addExam, updateSubject } from './setupRepo'
import {
  MSG,
  plural,
  validateExamDate,
  validateExamName,
  validateSubjectName,
  type DeleteTarget,
} from './setupLogic'

export interface SubjectCardProps {
  subject: Subject
  /** This subject's exams, sorted by date. */
  exams: Exam[]
  topicsByExam: Map<string, Topic[]>
  allSubjects: Subject[]
  today: ISODate
  flashing: ReadonlySet<string>
  flash: (ids: string | string[]) => void
  onDelete: (target: DeleteTarget) => void
}

/** One subject card: header (view / inline edit), its exam blocks and the add-exam form. */
export function SubjectCard({
  subject,
  exams,
  topicsByExam,
  allSubjects,
  today,
  flashing,
  flash,
  onDelete,
}: SubjectCardProps) {
  const [editing, setEditing] = useState(false)
  const [examFormOpen, setExamFormOpen] = useState<boolean | null>(null)
  const formOpen = examFormOpen ?? exams.length === 0
  const topicCount = exams.reduce((n, e) => n + (topicsByExam.get(e.id)?.length ?? 0), 0)
  const cardRef = useRef<HTMLLIElement>(null)
  const addOpenRef = useRef<HTMLButtonElement>(null)

  return (
    <li
      ref={cardRef}
      className={clsx(
        'rounded-lg border border-border p-4 shadow-card transition-colors duration-500 motion-reduce:transition-none md:p-5',
        flashing.has(subject.id) ? 'bg-primary-soft' : 'bg-surface',
      )}
    >
      {editing ? (
        <SubjectEdit
          subject={subject}
          allSubjects={allSubjects}
          onDone={() => {
            setEditing(false)
            requestAnimationFrame(() => cardRef.current?.querySelector<HTMLElement>('[data-testid="subject-edit"]')?.focus())
          }}
        />
      ) : (
        <div data-testid="subject-item" data-subject-id={subject.id} className="flex flex-wrap items-center gap-3">
          <span
            data-testid="subject-swatch"
            data-color={subject.color.toLowerCase()}
            className="size-4 shrink-0 rounded-full"
            style={{ backgroundColor: subject.color }}
            aria-hidden="true"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 data-testid="subject-name" className="break-words text-heading font-semibold text-text">
              {subject.name}
            </h2>
            <p className="text-small text-muted">
              {plural(exams.length, 'exam')} · {plural(topicCount, 'topic')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            data-testid="subject-edit"
            className="h-11 md:h-9"
            aria-label={`Edit ${subject.name}`}
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
          <Button
            variant="danger-ghost"
            size="sm"
            data-testid="subject-delete"
            className="h-11 md:h-9"
            aria-label={`Delete ${subject.name}`}
            onClick={() => onDelete({ kind: 'subject', id: subject.id, name: subject.name })}
          >
            Delete
          </Button>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-4">
        {exams.length === 0 ? <p className="text-small text-muted">No exams yet for {subject.name}.</p> : null}
        {exams.map((exam) => (
          <ExamBlock
            key={exam.id}
            exam={exam}
            topics={topicsByExam.get(exam.id) ?? []}
            today={today}
            flashing={flashing}
            flash={flash}
            onDelete={onDelete}
          />
        ))}
      </div>

      {formOpen ? (
        <ExamForm
          subjectId={subject.id}
          today={today}
          autoFocus={examFormOpen === true}
          onAdded={(id) => {
            setExamFormOpen(true)
            flash(id)
          }}
          onCancel={() => {
            setExamFormOpen(false)
            requestAnimationFrame(() => addOpenRef.current?.focus())
          }}
        />
      ) : (
        <button
          ref={addOpenRef}
          type="button"
          data-testid="exam-add-open"
          onClick={() => setExamFormOpen(true)}
          className="mt-4 inline-flex h-11 items-center gap-1 rounded-md px-3 text-small font-medium text-primary transition-colors duration-150 hover:bg-primary-soft md:h-9"
        >
          <Icon.Plus />
          Add exam
        </button>
      )}
    </li>
  )
}

function SubjectEdit({
  subject,
  allSubjects,
  onDone,
}: {
  subject: Subject
  allSubjects: Subject[]
  onDone: () => void
}) {
  const [name, setName] = useState(subject.name)
  const [color, setColor] = useState(subject.color)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const labelId = useId()
  const write = useSafeWrite()

  const save = async (e?: FormEvent) => {
    e?.preventDefault()
    const err = validateSubjectName(name, allSubjects, subject.id)
    setError(err)
    if (err) return
    setBusy(true)
    const res = await write(() => updateSubject(subject.id, { name, color }))
    setBusy(false)
    if (res.ok) onDone()
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onDone()
    }
  }

  return (
    <form
      noValidate
      onSubmit={save}
      onKeyDown={onKey}
      data-testid="subject-item"
      data-subject-id={subject.id}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <Field label="Subject name" testId="subject-edit-input" error={error}>
          {(p) => (
            <Input
              {...p}
              value={name}
              autoFocus
              autoComplete="off"
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError(null)
              }}
            />
          )}
        </Field>
        <div className="flex flex-col gap-1.5">
          <span id={labelId} className="text-small font-medium text-text">
            Colour
          </span>
          <ColorPicker value={color} onChange={setColor} labelledBy={labelId} testIdPrefix="subject-edit-color" />
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <Button variant="ghost" data-testid="subject-cancel" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" data-testid="subject-save" loading={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}

function ExamForm({
  subjectId,
  today,
  autoFocus,
  onAdded,
  onCancel,
}: {
  subjectId: string
  today: ISODate
  autoFocus: boolean
  onAdded: (id: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [errors, setErrors] = useState<{ name: string | null; date: string | null }>({ name: null, date: null })
  const [busy, setBusy] = useState(false)
  const box = useRef<HTMLFormElement>(null)
  const write = useSafeWrite()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next = { name: validateExamName(name), date: validateExamDate(date, today) }
    setErrors(next)
    if (next.name || next.date) {
      box.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus()
      return
    }
    setBusy(true)
    const id = newId()
    const res = await write(() => addExam(subjectId, name, date, id))
    setBusy(false)
    if (!res.ok) return
    setName('')
    setDate('')
    onAdded(id)
    box.current?.querySelector<HTMLInputElement>('input')?.focus()
  }

  return (
    <form
      ref={box}
      data-testid="exam-form"
      noValidate
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        }
      }}
      className="mt-4 grid gap-3 rounded-lg border border-dashed border-border-strong p-4 md:grid-cols-[1fr_12rem_auto] md:items-start"
    >
      <Field label="Exam name" testId="exam-name-input" error={errors.name}>
        {(p) => (
          <Input
            {...p}
            value={name}
            autoFocus={autoFocus}
            autoComplete="off"
            placeholder="e.g. Cell Biology Final"
            onChange={(e) => {
              setName(e.target.value)
              if (errors.name) setErrors((x) => ({ ...x, name: null }))
            }}
          />
        )}
      </Field>
      <div className="flex flex-col gap-1.5">
        <Field label="Exam date" testId="exam-date-input" error={errors.date}>
          {(p) => (
            <Input
              {...p}
              type="date"
              min={today}
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                if (errors.date) setErrors((x) => ({ ...x, date: null }))
              }}
            />
          )}
        </Field>
        {date === today && !errors.date ? <p className="text-small text-warning">{MSG.examToday}</p> : null}
      </div>
      <div className="flex gap-2 md:pt-6.5">
        <Button variant="ghost" data-testid="exam-add-cancel" className="flex-1 whitespace-nowrap px-3" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" data-testid="exam-add" className="flex-1 whitespace-nowrap" loading={busy}>
          Add exam
        </Button>
      </div>
    </form>
  )
}
