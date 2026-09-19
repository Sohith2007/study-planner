import clsx from 'clsx'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { Badge, Icon } from '@/components/ui'
import type { Difficulty, Topic } from '@/types'
import { useSafeWrite, useTransientFlag } from './hooks'
import { PencilIcon } from './SetupIcons'
import { uncoverTopic, updateTopic } from './setupRepo'
import { MSG, parseEstimate, validateTopicName, type DeleteTarget } from './setupLogic'

const smallControl =
  'rounded-md border border-border-strong bg-surface text-text transition-colors duration-150 hover:border-text ' +
  'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary focus-visible:border-primary ' +
  'aria-[invalid=true]:border-danger'

function ErrorText({ id, testId, children }: { id: string; testId: string; children: string }) {
  return (
    <p id={id} role="alert" data-testid={testId} className="flex items-start gap-1.5 text-small text-danger">
      <Icon.Alert className="mt-0.5" />
      <span>{children}</span>
    </p>
  )
}

function SavedCaption({ show }: { show: boolean }) {
  return (
    <span
      aria-live="polite"
      className={clsx(
        'text-caption text-success transition-opacity duration-500 motion-reduce:transition-none',
        show ? 'opacity-100' : 'opacity-0',
      )}
    >
      {show ? 'Saved' : ''}
    </span>
  )
}

export interface TopicRowProps {
  topic: Topic
  flashing: boolean
  onDelete: (target: DeleteTarget) => void
}

/**
 * One topic row (topic-item). md+: a 5-column table row. 375: a stacked mini-card with the name and
 * status on top, then estimate, difficulty and the actions.
 */
export function TopicRow({ topic, flashing, onDelete }: TopicRowProps) {
  const uid = useId()
  const write = useSafeWrite()
  const rowRef = useRef<HTMLDivElement>(null)

  // Rename
  const [renaming, setRenaming] = useState(false)
  /** Set once Enter/Esc has handled the rename, so the blur that follows does nothing. */
  const renameHandled = useRef(false)
  const [nameDraft, setNameDraft] = useState(topic.name)
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSaved, flagNameSaved] = useTransientFlag()

  // Estimate
  const [estDraft, setEstDraft] = useState(String(topic.estimatePomodoros))
  const [estError, setEstError] = useState<string | null>(null)
  const [estSaved, flagEstSaved] = useTransientFlag()
  const [lastEstimate, setLastEstimate] = useState(topic.estimatePomodoros)
  // Keep the draft in sync when the stored value changes elsewhere (not while the user is mid-edit).
  if (topic.estimatePomodoros !== lastEstimate) {
    setLastEstimate(topic.estimatePomodoros)
    setEstDraft(String(topic.estimatePomodoros))
  }

  const [diffSaved, flagDiffSaved] = useTransientFlag()

  const focusIn = (testId: string) =>
    requestAnimationFrame(() => rowRef.current?.querySelector<HTMLElement>(`[data-testid="${testId}"]`)?.focus())

  const startRename = () => {
    setNameDraft(topic.name)
    setNameError(null)
    renameHandled.current = false
    setRenaming(true)
  }
  const cancelRename = () => {
    renameHandled.current = true
    setRenaming(false)
    setNameError(null)
    focusIn('topic-rename')
  }
  const saveRename = async () => {
    const err = validateTopicName(nameDraft)
    setNameError(err)
    if (err) return
    if (nameDraft.trim() === topic.name) {
      cancelRename()
      return
    }
    renameHandled.current = true
    const res = await write(() => updateTopic(topic.id, { name: nameDraft.trim() }))
    if (!res.ok) {
      renameHandled.current = false
      return
    }
    setRenaming(false)
    flagNameSaved()
    focusIn('topic-rename')
  }
  const onRenameKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void saveRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelRename()
    }
  }

  /** Saves the estimate; returns false when invalid. `revert` resets an invalid draft (blur). */
  const commitEstimate = async (revert: boolean) => {
    const n = parseEstimate(estDraft)
    if (n === null) {
      setEstError(MSG.estimate)
      if (revert) setEstDraft(String(topic.estimatePomodoros))
      return
    }
    setEstError(null)
    if (n === topic.estimatePomodoros) {
      setEstDraft(String(n))
      return
    }
    const res = await write(() => updateTopic(topic.id, { estimatePomodoros: n }))
    if (res.ok) flagEstSaved()
  }

  const saveDifficulty = async (d: Difficulty) => {
    const res = await write(() => updateTopic(topic.id, { difficulty: d }))
    if (res.ok) flagDiffSaved()
  }

  const nameErrId = `${uid}-name-err`
  const estErrId = `${uid}-est-err`

  return (
    <div
      ref={rowRef}
      role="row"
      data-testid="topic-item"
      data-topic-id={topic.id}
      className={clsx(
        'flex flex-wrap items-start gap-x-3 gap-y-2 border-b border-border py-3 transition-colors duration-500 motion-reduce:transition-none',
        'md:grid md:grid-cols-[1fr_6rem_8rem_8rem_8.5rem] md:items-start',
        flashing && 'bg-primary-soft',
      )}
    >
      {/* Name */}
      <div role="cell" className="order-1 flex min-w-0 flex-1 flex-col gap-1 md:order-none md:col-start-1 md:row-start-1">
        {renaming ? (
          <>
            <label htmlFor={`${uid}-name`} className="sr-only">
              Topic name
            </label>
            <input
              id={`${uid}-name`}
              data-testid="topic-rename-input"
              autoFocus
              value={nameDraft}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? nameErrId : undefined}
              onChange={(e) => {
                setNameDraft(e.target.value)
                if (nameError) setNameError(null)
              }}
              onKeyDown={onRenameKey}
              onBlur={() => {
                if (!renameHandled.current && !nameError) void saveRename()
              }}
              className={clsx(smallControl, 'h-9 w-full px-2 text-body')}
            />
            {nameError ? (
              <ErrorText id={nameErrId} testId="topic-rename-input-error">
                {nameError}
              </ErrorText>
            ) : null}
          </>
        ) : (
          <span className="flex min-h-9 items-center gap-1">
            <span data-testid="topic-name" className="min-w-0 break-words text-body text-text">
              {topic.name}
            </span>
            <button
              type="button"
              data-testid="topic-rename"
              aria-label={`Rename ${topic.name}`}
              onClick={startRename}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-sunken hover:text-text"
            >
              <PencilIcon />
            </button>
            <SavedCaption show={nameSaved} />
          </span>
        )}
      </div>

      {/* Status (next to the name at 375) */}
      <div role="cell" className="order-2 flex min-h-9 shrink-0 items-center gap-2 md:order-none md:col-start-4 md:row-start-1">
        {topic.covered ? (
          <>
            <Badge variant="covered" data-testid="topic-covered-badge" />
            {topic.confidence ? (
              <span
                data-testid="topic-confidence"
                role="img"
                aria-label={`Confidence ${topic.confidence} of 3`}
                className="flex items-center gap-1"
              >
                <span className="flex gap-0.5" aria-hidden="true">
                  {[1, 2, 3].map((lvl) => (
                    <span
                      key={lvl}
                      className={clsx('h-3 w-1 rounded-sm', lvl <= (topic.confidence ?? 0) ? 'bg-success' : 'bg-border')}
                    />
                  ))}
                </span>
                <span className="text-caption text-muted" aria-hidden="true">
                  {topic.confidence}/3
                </span>
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-small text-muted">Not covered</span>
        )}
      </div>

      {/* Line break at 375 */}
      <span className="order-3 basis-full md:hidden" aria-hidden="true" />

      {/* Estimate */}
      <div role="cell" className="order-4 flex flex-col gap-1 md:order-none md:col-start-2 md:row-start-1">
        <div className="flex flex-col items-start gap-1 md:flex-row md:items-center md:gap-2">
          <label htmlFor={`${uid}-est`} className="text-caption text-muted md:sr-only">
            Pomodoros
          </label>
          <input
            id={`${uid}-est`}
            data-testid="topic-estimate"
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            step={1}
            value={estDraft}
            aria-invalid={!!estError}
            aria-describedby={estError ? estErrId : undefined}
            onWheel={(e) => e.currentTarget.blur()}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              setEstDraft(e.target.value)
              if (estError) setEstError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void commitEstimate(false)
              } else if (e.key === 'Escape') {
                setEstDraft(String(topic.estimatePomodoros))
                setEstError(null)
              }
            }}
            onBlur={() => void commitEstimate(true)}
            className={clsx(smallControl, 'h-9 w-20 px-2 text-right font-mono text-body tabular-nums')}
          />
          <SavedCaption show={estSaved} />
        </div>
        {estError ? (
          <ErrorText id={estErrId} testId="topic-estimate-error">
            {estError}
          </ErrorText>
        ) : null}
      </div>

      {/* Difficulty */}
      <div
        role="cell"
        className="order-5 flex flex-col items-start gap-1 self-start md:order-none md:col-start-3 md:row-start-1 md:flex-row md:items-center md:gap-2"
      >
        <label htmlFor={`${uid}-diff`} className="text-caption text-muted md:sr-only">
          Difficulty
        </label>
        <div className="relative">
          <select
            id={`${uid}-diff`}
            data-testid="topic-difficulty"
            value={topic.difficulty}
            onChange={(e) => void saveDifficulty(e.target.value as Difficulty)}
            className={clsx(smallControl, 'h-9 appearance-none pl-2 pr-8 text-small')}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <Icon.ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted" />
        </div>
        <SavedCaption show={diffSaved} />
      </div>

      {/* Actions */}
      <div
        role="cell"
        className="order-6 ml-auto flex items-center justify-end gap-1 self-end md:order-none md:col-start-5 md:row-start-1 md:ml-0 md:self-start"
      >
        {topic.covered ? (
          <button
            type="button"
            data-testid="topic-uncover"
            onClick={() => void write(() => uncoverTopic(topic.id))}
            className="inline-flex h-9 items-center whitespace-nowrap rounded-md px-2 text-small font-medium text-primary transition-colors duration-150 hover:bg-primary-soft"
          >
            Undo covered
          </button>
        ) : null}
        <button
          type="button"
          data-testid="topic-delete"
          aria-label={`Delete ${topic.name}`}
          onClick={() => onDelete({ kind: 'topic', id: topic.id, name: topic.name })}
          className="inline-flex size-9 items-center justify-center rounded-md text-danger transition-colors duration-150 hover:bg-danger-soft"
        >
          <Icon.Trash />
        </button>
      </div>
    </div>
  )
}
