/** BlockCard (design-system §4.12, week.md): a draggable Week card that opens the block menu. */
import clsx from 'clsx'
import { useRef, useState, type DragEvent } from 'react'
import { Badge, Icon } from '@/components/ui'
import type { Block } from '@/types'
import { usePlannerActions } from './actionsContext'
import { KindBadge } from './BlockRow'
import { MenuDivider, MenuItem, MenuLink, MenuPopover } from './Menu'
import { blockAriaLabel, blockCovered, blockSubject, blockTitle, isOpen } from './planner'

export function BlockCard({
  block,
  canDrag,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  block: Block
  canDrag: boolean
  dragging: boolean
  onDragStart: (block: Block) => void
  onDragEnd: (e: DragEvent<HTMLDivElement>) => void
}) {
  const actions = usePlannerActions()
  const { lookups } = actions
  const [menuOpen, setMenuOpen] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const title = blockTitle(block, lookups)
  const subject = blockSubject(block, lookups)
  const covered = blockCovered(block, lookups)
  const closed = block.status === 'done' || block.status === 'skipped'
  const draggable = canDrag && isOpen(block)
  const single = block.pomodoros === 1
  const label =
    blockAriaLabel(block, lookups).replace(/, planned$/, '') + '. Press Enter for actions.'

  const pick = (fn: () => void) => () => {
    setMenuOpen(false)
    cardRef.current?.focus()
    fn()
  }

  return (
    <div className="relative">
      <div
        ref={cardRef}
        data-testid="block-card"
        data-block-id={block.id}
        data-status={block.status}
        data-kind={block.kind}
        data-date={block.date}
        draggable={draggable}
        tabIndex={0}
        role="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={label}
        onClick={() => setMenuOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setMenuOpen(true)
          }
        }}
        onDragStart={(e: DragEvent<HTMLDivElement>) => {
          e.dataTransfer.setData('text/plain', block.id)
          e.dataTransfer.effectAllowed = 'move'
          setMenuOpen(false)
          onDragStart(block)
        }}
        onDragEnd={onDragEnd}
        className={clsx(
          'relative rounded-md border py-2 pl-3 pr-2 text-small',
          'transition-opacity duration-200 ease-standard starting:opacity-0 motion-reduce:transition-none',
          block.status === 'done' && 'border-border bg-sunken',
          block.status === 'skipped' && 'border-dashed border-border-strong bg-transparent',
          !closed && 'bg-surface shadow-card hover:border-border-strong',
          !closed && (menuOpen ? 'border-border-strong' : 'border-border'),
          draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
          dragging && 'opacity-50',
        )}
      >
        <span
          aria-hidden="true"
          className={clsx('absolute inset-y-0 left-0 w-1 rounded-l-md', block.status === 'skipped' && 'opacity-50')}
          style={{ backgroundColor: subject?.color ?? 'var(--fp-muted)' }}
        />
        <p
          className={clsx(
            'line-clamp-2 font-medium',
            closed ? 'text-muted' : 'text-text',
            block.status === 'done' && 'line-through',
          )}
        >
          {title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {block.status === 'planned' ? <KindBadge kind={block.kind} /> : <Badge variant={block.status} />}
          <span
            className="font-mono text-caption tabular-nums text-muted"
            aria-label={`${block.completedPomodoros} of ${block.pomodoros} ${block.pomodoros === 1 ? 'pomodoro' : 'pomodoros'}`}
          >
            {block.completedPomodoros}/{block.pomodoros}
          </span>
          {covered ? (
            <span className="text-success" aria-label="Covered" role="img">
              <Icon.Check className="size-3.5" />
            </span>
          ) : null}
          {block.pinned && block.source === 'auto' ? (
            <span className="text-muted" title="Moved or edited by you. Replan won't shift it." aria-label="Pinned" role="img">
              <Icon.Pin className="size-3.5" />
            </span>
          ) : null}
        </div>
      </div>
      <MenuPopover
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        triggerRef={cardRef}
        label={`Actions for ${title}`}
        className="left-0 top-full"
      >
        {closed ? (
          <MenuItem testId="block-undo" onSelect={pick(() => actions.undo(block))}>
            Undo
          </MenuItem>
        ) : (
          <>
            <MenuLink to={`/focus?blockId=${encodeURIComponent(block.id)}`} testId="block-start">
              <Icon.Play className="size-3.5" />
              Start focus
            </MenuLink>
            <MenuItem testId="block-done" onSelect={pick(() => actions.done(block))}>
              Done
            </MenuItem>
            <MenuItem
              testId="block-partial"
              disabled={single}
              title={single ? 'Single-pomodoro blocks can only be Done or Skipped.' : undefined}
              onSelect={pick(() => actions.openPartial(block))}
            >
              Partial
            </MenuItem>
            <MenuItem testId="block-skip" onSelect={pick(() => actions.skip(block))}>
              Skip
            </MenuItem>
          </>
        )}
        <MenuDivider />
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
  )
}
