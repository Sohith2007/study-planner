import clsx from 'clsx'
import { useId, useRef, useState, type FormEvent } from 'react'
import { Button, Field, Input, Select, Textarea, useToast } from '@/components/ui'
import { formatShortDate } from '@/lib'
import type { Difficulty, Exam, ISODate, Topic } from '@/types'
import { useSafeWrite } from './hooks'
import { ListIcon } from './SetupIcons'
import { addTopics, updateExam } from './setupRepo'
import {
  MSG,
  examCountdown,
  parseEstimate,
  parseQuickAdd,
  plural,
  quickAddLabel,
  validateExamDate,
  validateExamName,
  validateTopicName,
  type DeleteTarget,
} from './setupLogic'
import { TopicRow } from './TopicRow'

export interface ExamBlockProps {
  exam: Exam
  /** This exam's topics, sorted by order. */
  topics: Topic[]
  today: ISODate
  flashing: ReadonlySet<string>
  flash: (ids: string | string[]) => void
  onDelete: (target: DeleteTarget) => void
}

const COUNTDOWN_TONE = {
  normal: 'bg-sunken text-text',
  soon: 'bg-warning-soft text-warning',
  past: 'bg-sunken text-muted',
} as const

/** An exam inside a subject card: header (view / inline edit), topic table, add-topic row and quick add. */
export function ExamBlock({ exam, topics, today, flashing, flash, onDelete }: ExamBlockProps) {
  const [editing, setEditing] = useState(false)
  const [quickOpen, setQuickOpen] = useState<boolean | null>(null)
  const quickAddOpen = quickOpen ?? topics.length === 0
  const blockRef = useRef<HTMLDivElement>(null)
  const countdown = examCountdown(exam.date, today)
  const covered = topics.filter((t) => t.covered).length

  const refocus = (testId: string) =>
    requestAnimationFrame(() => blockRef.current?.querySelector<HTMLElement>(`[data-testid="${testId}"]`)?.focus())

  return (
    <div
      ref={blockRef}
      className={clsx(
        'rounded-lg border border-border p-4 transition-colors duration-500 motion-reduce:transition-none',
        flashing.has(exam.id) ? 'bg-primary-soft' : 'bg-bg',
      )}
    >
      {editing ? (
        <ExamEdit
          exam={exam}
          today={today}
          onDone={() => {
            setEditing(false)
            refocus('exam-edit')
          }}
        />
      ) : (
        <div data-testid="exam-item" data-exam-id={exam.id} className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 data-testid="exam-name" className="break-words text-body font-semibold text-text">
            {exam.name}
          </h3>
          <span className="text-small text-muted">{formatShortDate(exam.date)}</span>
          <span
            data-testid="exam-countdown"
            className={clsx(
              'inline-flex h-6 items-center rounded-sm px-2 text-caption font-medium',
              COUNTDOWN_TONE[countdown.tone],
            )}
          >
            {countdown.label}
          </span>
          <span className="text-small text-muted">
            {covered}/{plural(topics.length, 'topic')} covered
          </span>
          <span className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            data-testid="exam-edit"
            className="h-11 md:h-9"
            aria-label={`Edit ${exam.name}`}
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
          <Button
            variant="danger-ghost"
            size="sm"
            data-testid="exam-delete"
            className="h-11 md:h-9"
            aria-label={`Delete ${exam.name}`}
            onClick={() => onDelete({ kind: 'exam', id: exam.id, name: exam.name })}
          >
            Delete
          </Button>
        </div>
      )}

      {topics.length === 0 ? (
        <p className="mt-3 text-small text-muted">No topics yet. Add them one by one, or paste a list with Quick add.</p>
      ) : (
        <div role="table" aria-label={`Topics for ${exam.name}`} className="mt-4 flex flex-col">
          <div
            role="row"
            className="hidden grid-cols-[1fr_6rem_8rem_8rem_8.5rem] gap-3 border-b border-border pb-2 text-caption font-semibold uppercase tracking-wider text-muted md:grid"
          >
            <span role="columnheader">Topic</span>
            <span role="columnheader">Pomodoros</span>
            <span role="columnheader">Difficulty</span>
            <span role="columnheader">Status</span>
            <span role="columnheader" className="sr-only">
              Actions
            </span>
          </div>
          {topics.map((t) => (
            <TopicRow key={t.id} topic={t} flashing={flashing.has(t.id)} onDelete={onDelete} />
          ))}
        </div>
      )}

      <TopicForm examId={exam.id} onAdded={(id) => flash(id)} />

      {quickAddOpen ? (
        <QuickAdd
          exam={exam}
          autoFocus={quickOpen === true}
          onAdded={(ids) => {
            flash(ids)
            setQuickOpen(false)
            refocus('quick-add-toggle')
          }}
          onCancel={() => {
            setQuickOpen(false)
            refocus('quick-add-toggle')
          }}
        />
      ) : (
        <button
          type="button"
          data-testid="quick-add-toggle"
          aria-expanded={false}
          onClick={() => setQuickOpen(true)}
          className="mt-3 inline-flex h-9 items-center gap-2 rounded-md px-3 text-small font-medium text-primary transition-colors duration-150 hover:bg-primary-soft"
        >
          <ListIcon />
          Quick add
        </button>
      )}
    </div>
  )
}

function ExamEdit({ exam, today, onDone }: { exam: Exam; today: ISODate; onDone: () => void }) {
  const [name, setName] = useState(exam.name)
  const [date, setDate] = useState(exam.date)
  const [errors, setErrors] = useState<{ name: string | null; date: string | null }>({ name: null, date: null })
  const [busy, setBusy] = useState(false)
  const write = useSafeWrite()

  const save = async (e: FormEvent) => {
    e.preventDefault()
    // A past date is only rejected when it was changed, so a past exam can still be renamed.
    const next = {
      name: validateExamName(name),
      date: date === exam.date ? null : validateExamDate(date, today),
    }
    setErrors(next)
    if (next.name || next.date) return
    setBusy(true)
    const res = await write(() => updateExam(exam.id, { name, date }))
    setBusy(false)
    if (res.ok) onDone()
  }

  return (
    <form
      noValidate
      onSubmit={save}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onDone()
        }
      }}
      data-testid="exam-item"
      data-exam-id={exam.id}
      className="grid gap-3 md:grid-cols-[1fr_12rem_auto] md:items-start"
    >
      <Field label="Exam name" testId="exam-edit-name-input" error={errors.name}>
        {(p) => (
          <Input
            {...p}
            value={name}
            autoFocus
            autoComplete="off"
            onChange={(e) => {
              setName(e.target.value)
              if (errors.name) setErrors((x) => ({ ...x, name: null }))
            }}
          />
        )}
      </Field>
      <div className="flex flex-col gap-1.5">
        <Field label="Exam date" testId="exam-edit-date-input" error={errors.date}>
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
        <Button variant="ghost" data-testid="exam-cancel" className="flex-1 px-3" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" data-testid="exam-save" className="flex-1 whitespace-nowrap" loading={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}

function TopicForm({ examId, onAdded }: { examId: string; onAdded: (id: string) => void }) {
  const [name, setName] = useState('')
  const [estimate, setEstimate] = useState('2')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [errors, setErrors] = useState<{ name: string | null; estimate: string | null }>({ name: null, estimate: null })
  const [busy, setBusy] = useState(false)
  const box = useRef<HTMLFormElement>(null)
  const write = useSafeWrite()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const est = parseEstimate(estimate)
    const next = { name: validateTopicName(name), estimate: est === null ? MSG.estimate : null }
    setErrors(next)
    if (next.name || next.estimate || est === null) {
      box.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    setBusy(true)
    const res = await write(() => addTopics(examId, [{ name, estimatePomodoros: est, difficulty }]))
    setBusy(false)
    if (!res.ok) return
    setName('')
    onAdded(res.value[0])
    box.current?.querySelector<HTMLInputElement>('input')?.focus()
  }

  return (
    <form
      ref={box}
      data-testid="topic-form"
      noValidate
      onSubmit={submit}
      className="mt-4 grid gap-3 md:grid-cols-[1fr_6rem_8rem_auto] md:items-start"
    >
      <Field label="Topic name" testId="topic-name-input" error={errors.name}>
        {(p) => (
          <Input
            {...p}
            value={name}
            autoComplete="off"
            placeholder="e.g. Integration by parts"
            onChange={(e) => {
              setName(e.target.value)
              if (errors.name) setErrors((x) => ({ ...x, name: null }))
            }}
          />
        )}
      </Field>
      <Field label="Pomodoros" testId="topic-estimate-input" error={errors.estimate}>
        {(p) => (
          <Input
            {...p}
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            step={1}
            className="font-mono"
            value={estimate}
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(e) => {
              setEstimate(e.target.value)
              if (errors.estimate) setErrors((x) => ({ ...x, estimate: null }))
            }}
            onBlur={() => setErrors((x) => ({ ...x, estimate: parseEstimate(estimate) === null ? MSG.estimate : null }))}
          />
        )}
      </Field>
      <Field label="Difficulty">
        {(p) => (
          <Select
            {...p}
            data-testid="topic-difficulty-input"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
        )}
      </Field>
      <Button type="submit" variant="secondary" data-testid="topic-add" className="w-full md:mt-6.5 md:w-auto" loading={busy}>
        Add topic
      </Button>
    </form>
  )
}

function QuickAdd({
  exam,
  autoFocus,
  onAdded,
  onCancel,
}: {
  exam: Exam
  autoFocus: boolean
  onAdded: (ids: string[]) => void
  onCancel: () => void
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const hintId = useId()
  const toast = useToast()
  const write = useSafeWrite()
  const lines = parseQuickAdd(text)

  const submit = async () => {
    if (lines.length === 0) {
      setError(MSG.quickAddEmpty)
      return
    }
    setBusy(true)
    const res = await write(() => addTopics(exam.id, lines.map((name) => ({ name }))))
    setBusy(false)
    if (!res.ok) return
    setText('')
    toast.show(`Added ${plural(res.value.length, 'topic')} to ${exam.name}`)
    onAdded(res.value)
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <Field label="Paste topics, one per line" testId="quick-add-input" error={error}>
        {(p) => (
          <Textarea
            {...p}
            aria-describedby={[p['aria-describedby'], hintId].filter(Boolean).join(' ') || undefined}
            autoFocus={autoFocus}
            value={text}
            placeholder={'Cells\nGenetics\nEvolution'}
            onChange={(e) => {
              setText(e.target.value)
              if (error) setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                void submit()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                onCancel()
              }
            }}
          />
        )}
      </Field>
      <p id={hintId} className="text-small text-muted">
        Each line becomes a topic with 2 pomodoros and medium difficulty. Blank lines are skipped.
      </p>
      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <Button variant="ghost" data-testid="quick-add-cancel" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          data-testid="quick-add-submit"
          disabled={lines.length === 0}
          loading={busy}
          onClick={() => void submit()}
        >
          {quickAddLabel(lines.length)}
        </Button>
      </div>
    </div>
  )
}
