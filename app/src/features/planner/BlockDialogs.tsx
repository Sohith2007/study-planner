/**
 * <PlannerActions>: provides the block actions (usePlannerActions) and renders every planner dialog
 * (Partial, Topic check, Edit, Move, Delete confirm, Add task). Shared by Today and Week.
 */
import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { db } from '@/db'
import { Button, ConfirmDialog, Field, Input, Modal, SegmentedControl, Select, useToast } from '@/components/ui'
import type { Block, Confidence, Topic } from '@/types'
import { PlannerActionsContext, type PlannerActionsApi } from './actionsContext'
import {
  MAX_POMODOROS,
  MIN_POMODOROS,
  addTask,
  blockTitle,
  capacityOf,
  deleteBlock,
  editBlock,
  markDone,
  markPartial,
  markSkipped,
  markTopicCovered,
  moveBlock,
  moveErrorText,
  parsePomodoros,
  plannedLoad,
  pomodoroCount,
  shortDate,
  undoBlock,
  validateEdit,
  validateMoveDate,
  validateTask,
  type EditErrors,
  type Lookups,
  type TaskDraft,
  type TaskErrors,
} from './planner'

type DialogState =
  | { kind: 'none' }
  | { kind: 'partial'; block: Block }
  | { kind: 'topic'; topic: Topic }
  | { kind: 'edit'; block: Block }
  | { kind: 'move'; block: Block }
  | { kind: 'delete'; block: Block }
  | { kind: 'add'; defaultDate: string }

const SAVE_ERROR = "Couldn't save that change. Try again."

export function PlannerActions({
  lookups,
  today,
  children,
}: {
  lookups: Lookups
  today: string
  children: ReactNode
}) {
  const toast = useToast()
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' })
  const close = useCallback(() => setDialog({ kind: 'none' }), [])

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        await fn()
      } catch (err) {
        console.error('FocusPlan: planner action failed', err)
        toast.show(SAVE_ERROR, 'error')
      }
    },
    [toast],
  )

  const api = useMemo<PlannerActionsApi>(
    () => ({
      lookups,
      today,
      done: (block) =>
        void run(async () => {
          await markDone(block.id)
          toast.show('Marked done')
          const topic = block.kind === 'new' && block.topicId ? await db.topics.get(block.topicId) : undefined
          if (topic && !topic.covered) setDialog({ kind: 'topic', topic })
        }),
      skip: (block) =>
        void run(async () => {
          await markSkipped(block.id)
          toast.show(`Skipped ${blockTitle(block, lookups)}`, 'success', {
            action: {
              label: 'Undo',
              testId: 'toast-undo',
              onClick: () =>
                run(async () => {
                  // Only undo if the block is still skipped (the row Undo may already have restored it).
                  if ((await db.blocks.get(block.id))?.status === 'skipped') await undoBlock(block.id)
                }),
            },
          })
        }),
      undo: (block) => void run(() => undoBlock(block.id)),
      openPartial: (block) => setDialog({ kind: 'partial', block }),
      openEdit: (block) => setDialog({ kind: 'edit', block }),
      openMove: (block) => setDialog({ kind: 'move', block }),
      openDelete: (block) => setDialog({ kind: 'delete', block }),
      openAddTask: (defaultDate) => setDialog({ kind: 'add', defaultDate: defaultDate ?? today }),
      dropOn: (blockId, date) =>
        void run(async () => {
          const block = await db.blocks.get(blockId)
          if (!block || block.date === date) return
          const exam = block.examId ? lookups.exams.get(block.examId) : null
          const err = validateMoveDate(date, today, exam, { blackoutDates: lookups.settings.blackoutDates })
          if (err) {
            toast.show(moveErrorText(err, exam?.date, date, true), 'error')
            return
          }
          await moveBlock(blockId, date)
          const dayBlocks = await db.blocks.where('date').equals(date).toArray()
          const over = plannedLoad(dayBlocks) - capacityOf(lookups.settings, date)
          toast.show(
            over > 0
              ? `Moved to ${shortDate(date)}. That day is now ${over} over capacity.`
              : `Moved to ${shortDate(date)}`,
          )
        }),
    }),
    [lookups, today, run, toast],
  )

  return (
    <PlannerActionsContext.Provider value={api}>
      {children}
      {dialog.kind === 'partial' ? (
        <PartialDialog block={dialog.block} lookups={lookups} onClose={close} run={run} />
      ) : null}
      {dialog.kind === 'topic' ? <TopicCheckDialog topic={dialog.topic} lookups={lookups} onClose={close} run={run} /> : null}
      {dialog.kind === 'edit' ? <EditDialog block={dialog.block} lookups={lookups} onClose={close} run={run} /> : null}
      {dialog.kind === 'move' ? (
        <MoveDialog block={dialog.block} lookups={lookups} today={today} onClose={close} run={run} />
      ) : null}
      <ConfirmDialog
        open={dialog.kind === 'delete'}
        title="Delete this block?"
        message={dialog.kind === 'delete' ? deleteMessage(dialog.block, lookups) : null}
        confirmLabel="Delete block"
        onCancel={close}
        onConfirm={() => {
          if (dialog.kind !== 'delete') return
          const id = dialog.block.id
          close()
          void run(async () => {
            await deleteBlock(id)
            toast.show('Block deleted')
          })
        }}
      />
      {dialog.kind === 'add' ? (
        <AddTaskDialog defaultDate={dialog.defaultDate} lookups={lookups} today={today} onClose={close} run={run} />
      ) : null}
    </PlannerActionsContext.Provider>
  )
}

function deleteMessage(block: Block, lookups: Lookups): string {
  const title = blockTitle(block, lookups)
  if (block.source === 'manual') return `"${title}" will be deleted.`
  return `"${title}" (${pomodoroCount(block.pomodoros)}) will be removed. The plan may add this work back the next time it rebuilds; move or edit the block instead if you want it elsewhere.`
}

interface DialogProps {
  lookups: Lookups
  onClose: () => void
  run: (fn: () => Promise<void>) => Promise<void>
}

function PartialDialog({ block, lookups, onClose, run }: DialogProps & { block: Block }) {
  const toast = useToast()
  const initial = block.completedPomodoros > 0 && block.completedPomodoros < block.pomodoros ? block.completedPomodoros : null
  const [value, setValue] = useState<number | null>(initial)
  const [busy, setBusy] = useState(false)
  const options = Array.from({ length: Math.max(0, block.pomodoros - 1) }, (_, i) => ({
    value: i + 1,
    label: String(i + 1),
    testId: `partial-option-${i + 1}`,
  }))
  const save = async () => {
    if (value === null) return
    setBusy(true)
    await run(async () => {
      await markPartial(block.id, value)
      toast.show(`Marked ${value} of ${block.pomodoros} done`)
      onClose()
    })
    setBusy(false)
  }
  return (
    <Modal
      open
      title="How many pomodoros did you finish?"
      onClose={onClose}
      testId="partial-dialog"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button data-testid="partial-save" disabled={value === null} loading={busy} onClick={() => void save()}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <p>
        {blockTitle(block, lookups)} · {block.pomodoros} planned
      </p>
      <SegmentedControl
        label="Pomodoros finished"
        value={value}
        options={options}
        onChange={setValue}
        className="self-start"
      />
    </Modal>
  )
}

function TopicCheckDialog({ topic, lookups, onClose, run }: DialogProps & { topic: Topic }) {
  const toast = useToast()
  const [confidence, setConfidence] = useState<Confidence | null>(null)
  const [busy, setBusy] = useState(false)
  const exam = lookups.exams.get(topic.examId)
  const save = async () => {
    if (confidence === null) return
    setBusy(true)
    await run(async () => {
      await markTopicCovered(topic.id, confidence)
      toast.show(`${topic.name} marked covered`)
      onClose()
    })
    setBusy(false)
  }
  return (
    <Modal
      open
      title={`Topic check: ${topic.name}`}
      onClose={onClose}
      testId="topic-check-dialog"
      footer={
        <>
          <Button variant="secondary" data-testid="topic-check-not-yet" onClick={onClose}>
            Not yet
          </Button>
          <Button
            data-testid="topic-check-covered"
            disabled={confidence === null}
            title={confidence === null ? 'Pick how confident you are first' : undefined}
            loading={busy}
            onClick={() => void save()}
          >
            {busy ? 'Saving…' : 'Covered'}
          </Button>
        </>
      }
    >
      <p>
        Did you cover {topic.name} well enough to move on? Your answer shapes the reviews before{' '}
        {exam?.name ?? 'your exam'}.
      </p>
      <div className="flex flex-col gap-2">
        <p id="topic-check-confidence-label" className="text-small font-medium text-text">
          How confident are you?
        </p>
        <SegmentedControl<Confidence>
          label="How confident are you?"
          value={confidence}
          onChange={setConfidence}
          className="w-full [&>button]:flex-1 [&>button]:px-3"
          options={[
            { value: 1, label: '1 · Shaky', testId: 'confidence-1' },
            { value: 2, label: '2 · Okay', testId: 'confidence-2' },
            { value: 3, label: '3 · Solid', testId: 'confidence-3' },
          ]}
        />
        <p className="text-small text-muted">Shaky adds one extra review before the exam.</p>
      </div>
    </Modal>
  )
}

function EditDialog({ block, lookups, onClose, run }: DialogProps & { block: Block }) {
  const toast = useToast()
  const isTask = block.kind === 'task'
  const [title, setTitle] = useState(block.title)
  const [pomodoros, setPomodoros] = useState(String(block.pomodoros))
  const [errors, setErrors] = useState<EditErrors>({})
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validateEdit(block, { title, pomodoros })
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    await run(async () => {
      await editBlock(block.id, { title: isTask ? title : undefined, pomodoros: parsePomodoros(pomodoros)! })
      toast.show('Block updated')
      onClose()
    })
    setBusy(false)
  }
  return (
    <Modal
      open
      title="Edit block"
      onClose={onClose}
      testId="block-edit-dialog"
      dismissible={false}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="block-edit-form" data-testid="block-edit-save" loading={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <form id="block-edit-form" noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        {isTask ? (
          <Field label="Title" testId="block-edit-title" error={errors.title}>
            {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />}
          </Field>
        ) : (
          <p>{blockTitle(block, lookups)}</p>
        )}
        <Field
          label="Pomodoros"
          testId="block-edit-pomodoros"
          error={errors.pomodoros}
          hint={isTask ? undefined : "Edited blocks are pinned: Replan won't change them."}
        >
          {(p) => (
            <Input
              {...p}
              type="number"
              inputMode="numeric"
              min={Math.max(MIN_POMODOROS, block.completedPomodoros)}
              max={MAX_POMODOROS}
              step={1}
              value={pomodoros}
              onChange={(e) => setPomodoros(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
            />
          )}
        </Field>
      </form>
    </Modal>
  )
}

function MoveDialog({ block, lookups, today, onClose, run }: DialogProps & { block: Block; today: string }) {
  const toast = useToast()
  const [date, setDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const exam = block.examId ? lookups.exams.get(block.examId) : null
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const err = validateMoveDate(date, today, exam)
    if (err) {
      setError(moveErrorText(err, exam?.date, date))
      return
    }
    setError(null)
    setBusy(true)
    await run(async () => {
      await moveBlock(block.id, date)
      toast.show(`Moved to ${shortDate(date)}`)
      onClose()
    })
    setBusy(false)
  }
  return (
    <Modal
      open
      title="Move block"
      onClose={onClose}
      testId="block-move-dialog"
      dismissible={false}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="block-move-form" data-testid="block-move-save" loading={busy}>
            {busy ? 'Moving…' : 'Move block'}
          </Button>
        </>
      }
    >
      <form id="block-move-form" noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <p>
          {blockTitle(block, lookups)} · currently {shortDate(block.date)}
        </p>
        <Field
          label="New date"
          testId="block-move-date"
          error={error}
          hint={block.source === 'auto' ? "Moved blocks are pinned: Replan won't shift them." : undefined}
        >
          {(p) => <Input {...p} type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />}
        </Field>
      </form>
    </Modal>
  )
}

function AddTaskDialog({
  defaultDate,
  lookups,
  today,
  onClose,
  run,
}: DialogProps & { defaultDate: string; today: string }) {
  const toast = useToast()
  const [draft, setDraft] = useState<TaskDraft>({
    title: '',
    date: defaultDate < today ? today : defaultDate,
    pomodoros: '1',
    subjectId: '',
  })
  const [errors, setErrors] = useState<TaskErrors>({})
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<TaskDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const subjects = [...lookups.subjects.values()].sort((a, b) => a.name.localeCompare(b.name))
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validateTask(draft, today)
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    await run(async () => {
      await addTask({
        title: draft.title,
        date: draft.date,
        pomodoros: parsePomodoros(draft.pomodoros)!,
        subjectId: draft.subjectId || null,
      })
      toast.show(draft.date === today ? 'Task added to today' : `Task added to ${shortDate(draft.date)}`)
      onClose()
    })
    setBusy(false)
  }
  return (
    <Modal
      open
      title="Add a task"
      onClose={onClose}
      testId="add-task-dialog"
      dismissible={false}
      footer={
        <>
          <Button variant="secondary" data-testid="add-task-cancel" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-task-form" data-testid="add-task-submit" loading={busy}>
            {busy ? 'Adding…' : 'Add task'}
          </Button>
        </>
      }
    >
      <form id="add-task-form" noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <Field label="Title" testId="add-task-title" error={errors.title}>
          {(p) => (
            <Input
              {...p}
              value={draft.title}
              placeholder="e.g. Problem set 4"
              maxLength={120}
              onChange={(e) => set({ title: e.target.value })}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date" testId="add-task-date" error={errors.date}>
            {(p) => <Input {...p} type="date" min={today} value={draft.date} onChange={(e) => set({ date: e.target.value })} />}
          </Field>
          <Field label="Pomodoros" testId="add-task-pomodoros" error={errors.pomodoros}>
            {(p) => (
              <Input
                {...p}
                type="number"
                inputMode="numeric"
                min={MIN_POMODOROS}
                max={MAX_POMODOROS}
                step={1}
                value={draft.pomodoros}
                onChange={(e) => set({ pomodoros: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
              />
            )}
          </Field>
        </div>
        <Field label="Subject" testId="add-task-subject">
          {(p) => (
            <Select {...p} value={draft.subjectId} onChange={(e) => set({ subjectId: e.target.value })}>
              <option value="">No subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </form>
    </Modal>
  )
}
