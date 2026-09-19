/** BlockRow (design-system §4.12, today.md): one `<li data-testid="today-block">` in Today's queue. */
import clsx from 'clsx'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { Badge, Button, Icon, PomodoroPips, buttonClasses } from '@/components/ui'
import type { Block } from '@/types'
import { usePlannerActions } from './actionsContext'
import { MenuItem, MenuPopover } from './Menu'
import { blockAriaLabel, blockCovered, blockSubject, blockTitle, progressText } from './planner'

const ACTION = 'h-11 md:h-9'

export function KindBadge({ kind, testId }: { kind: Block['kind']; testId?: string }) {
  return <Badge variant={kind} data-testid={testId} />
}

export function StatusBadge({ status, testId }: { status: Block['status']; testId?: string }) {
  if (status === 'planned') return null
  return <Badge variant={status} data-testid={testId} />
}

export function BlockRow({ block, isTarget }: { block: Block; isTarget: boolean }) {
  const actions = usePlannerActions()
  const { lookups } = actions
  const [menuOpen, setMenuOpen] = useState(false)
  const menuBtn = useRef<HTMLButtonElement>(null)
  const title = blockTitle(block, lookups)
  const subject = blockSubject(block, lookups)
  const exam = block.examId ? lookups.exams.get(block.examId) : undefined
  const covered = blockCovered(block, lookups)
  const closed = block.status === 'done' || block.status === 'skipped'
  const single = block.pomodoros === 1

  const pick = (fn: () => void) => () => {
    setMenuOpen(false)
    menuBtn.current?.focus()
    fn()
  }

  return (
    <li
      data-testid="today-block"
      data-block-id={block.id}
      data-status={block.status}
      data-kind={block.kind}
      aria-label={blockAriaLabel(block, lookups)}
      className={clsx(
        'relative flex flex-col gap-3 rounded-md border py-4 pl-5 pr-4 md:flex-row md:items-center',
        'transition-opacity duration-200 ease-standard starting:opacity-0 motion-reduce:transition-none',
        block.status === 'done' && 'border-border bg-sunken',
        block.status === 'skipped' && 'border-dashed border-border-strong bg-transparent',
        !closed && 'bg-surface shadow-card',
        !closed && (isTarget ? 'border-primary ring-1 ring-primary' : 'border-border'),
      )}
    >
      <span
        aria-hidden="true"
        className={clsx('absolute inset-y-0 left-0 w-1 rounded-l-md', block.status === 'skipped' && 'opacity-50')}
        style={{ backgroundColor: subject?.color ?? 'var(--fp-muted)' }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p
          data-testid="block-title"
          className={clsx(
            'text-body font-medium',
            closed ? 'text-muted' : 'text-text',
            block.status === 'done' && 'line-through',
          )}
        >
          {title}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <KindBadge kind={block.kind} testId="block-kind" />
          <span data-testid="block-subject" className="inline-flex items-center gap-1.5 text-small text-muted">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: subject?.color ?? 'var(--fp-muted)' }}
            />
            {subject?.name ?? 'No subject'}
          </span>
          {block.kind !== 'task' && exam ? <span className="text-small text-muted">for {exam.name}</span> : null}
          {covered ? <Badge variant="covered" data-testid="block-covered" /> : null}
          <StatusBadge status={block.status} testId="block-status" />
          {block.pinned && block.source === 'auto' ? (
            <Badge variant="pinned" title="Moved or edited by you. Replan won't shift it." />
          ) : null}
          <span className="flex items-center gap-2">
            <PomodoroPips completed={block.completedPomodoros} total={block.pomodoros} />
            <span
              data-testid="block-progress"
              className={clsx('font-mono text-small tabular-nums', closed ? 'text-muted' : 'text-text')}
            >
              {progressText(block.completedPomodoros, block.pomodoros)}
            </span>
          </span>
        </div>
      </div>
      <div className="relative flex flex-wrap items-center gap-2 md:ml-auto md:flex-nowrap">
        {closed ? (
          <Button variant="ghost" size="sm" className={ACTION} data-testid="block-undo" onClick={() => actions.undo(block)}>
            Undo
          </Button>
        ) : (
          <>
            <Link
              to={`/focus?blockId=${encodeURIComponent(block.id)}`}
              data-testid="block-start"
              className={buttonClasses('secondary', 'sm', ACTION)}
            >
              <Icon.Play className="size-3.5" />
              Start
            </Link>
            <Button variant="ghost" size="sm" className={ACTION} data-testid="block-done" onClick={() => actions.done(block)}>
              Done
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={ACTION}
              data-testid="block-partial"
              disabled={single}
              title={single ? 'Single-pomodoro blocks can only be Done or Skipped.' : undefined}
              onClick={() => actions.openPartial(block)}
            >
              Partial
            </Button>
            <Button variant="ghost" size="sm" className={ACTION} data-testid="block-skip" onClick={() => actions.skip(block)}>
              Skip
            </Button>
          </>
        )}
        <button
          ref={menuBtn}
          type="button"
          data-testid="block-menu"
          aria-label={`More actions for ${title}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && !menuOpen) {
              e.preventDefault()
              setMenuOpen(true)
            }
          }}
          className={clsx(
            'inline-flex size-11 items-center justify-center rounded-md transition-colors duration-150 md:size-9',
            menuOpen ? 'bg-sunken text-text' : 'text-muted hover:bg-sunken',
          )}
        >
          <Icon.More />
        </button>
        <MenuPopover
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          triggerRef={menuBtn}
          label={`Actions for ${title}`}
          className="right-0 top-full"
        >
          <MenuItem testId="block-edit" onSelect={pick(() => actions.openEdit(block))}>
            Edit
          </MenuItem>
          <MenuItem testId="block-move" onSelect={pick(() => actions.openMove(block))}>
            Move
          </MenuItem>
          <MenuItem testId="block-delete" danger onSelect={pick(() => actions.openDelete(block))}>
            Delete
          </MenuItem>
        </MenuPopover>
      </div>
    </li>
  )
}
