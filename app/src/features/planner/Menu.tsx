/**
 * Menu popover for block actions (accessibility.md §5: menu button, role=menu/menuitem, roving focus
 * with arrow keys, Home/End, Esc closes and returns focus to the trigger, outside click closes).
 */
import clsx from 'clsx'
import { useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router'

const ITEM = 'flex h-11 w-full items-center gap-2 px-3 text-left text-small md:h-9 focus-visible:outline-offset-[-2px]'

export function MenuPopover({
  open,
  onClose,
  triggerRef,
  label,
  className,
  children,
}: {
  open: boolean
  onClose: () => void
  triggerRef: RefObject<HTMLElement | null>
  label: string
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || triggerRef.current?.contains(t)) return
      onCloseRef.current()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, triggerRef])

  if (!open) return null

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    const i = items.indexOf(document.activeElement as HTMLElement)
    let next = -1
    if (e.key === 'ArrowDown') next = (i + 1) % items.length
    else if (e.key === 'ArrowUp') next = (i - 1 + items.length) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    else if (e.key === 'Escape' || e.key === 'Tab') {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        triggerRef.current?.focus()
      }
      onCloseRef.current()
      return
    }
    if (next >= 0) {
      e.preventDefault()
      items[next]?.focus()
    }
  }

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      onKeyDown={onKey}
      onClick={(e) => e.stopPropagation()}
      className={clsx(
        'absolute z-40 mt-1 w-48 rounded-md border border-border bg-surface py-1 shadow-raised',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function MenuItem({
  onSelect,
  danger,
  disabled,
  title,
  testId,
  children,
}: {
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
  title?: string
  testId: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      data-testid={testId}
      disabled={disabled}
      title={title}
      onClick={onSelect}
      className={clsx(
        ITEM,
        danger ? 'text-danger hover:bg-danger-soft' : 'text-text hover:bg-sunken',
        'disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-transparent',
      )}
    >
      {children}
    </button>
  )
}

export function MenuLink({ to, testId, children }: { to: string; testId: string; children: ReactNode }) {
  return (
    <Link to={to} role="menuitem" tabIndex={-1} data-testid={testId} className={clsx(ITEM, 'text-text hover:bg-sunken')}>
      {children}
    </Link>
  )
}

export function MenuDivider() {
  return <hr className="my-1 border-border" />
}
