import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button'

export interface ModalProps {
  open: boolean
  title: ReactNode
  /** Called on Esc, backdrop click (unless `dismissible` is false) and by your Cancel button. */
  onClose: () => void
  children?: ReactNode
  /** Footer buttons: put Cancel (secondary) first and the primary/danger button last. */
  footer?: ReactNode
  /** Set false for forms with unsaved input, so a backdrop click doesn't discard it. Esc still closes. */
  dismissible?: boolean
  /** Defaults to "modal". */
  testId?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Dialog (design-system 4.7): overlay backdrop, bottom sheet at 375px, centred panel from md.
 * role=dialog, aria-modal, aria-labelledby. Focus goes to `[data-autofocus]` or the first field,
 * Tab is trapped inside, Esc = Cancel, and focus returns to the trigger on close.
 */
export function Modal({ open, title, onClose, children, footer, dismissible = true, testId = 'modal' }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const trigger = document.activeElement as HTMLElement | null
    const panel = ref.current
    const first =
      panel?.querySelector<HTMLElement>('[data-autofocus]') ??
      panel?.querySelector<HTMLElement>('input, select, textarea') ??
      panel?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key === 'Tab' && panel) {
        const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (!items.length) return
        const firstEl = items[0]
        const lastEl = items[items.length - 1]
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault()
          lastEl.focus()
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (trigger && document.contains(trigger)) trigger.focus()
    }
  }, [open])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-overlay p-0 md:p-4"
      onMouseDown={() => {
        if (dismissible) onClose()
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={testId}
        className="flex w-full max-w-dialog flex-col gap-4 self-end rounded-xl rounded-b-none bg-surface p-6 shadow-overlay md:self-center md:rounded-b-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-title font-semibold text-text">
          {title}
        </h2>
        {children ? <div className="flex flex-col gap-4 text-body text-muted">{children}</div> : null}
        {footer ? <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">{footer}</div> : null}
      </div>
    </div>
  )
}

export interface ConfirmDialogProps {
  open: boolean
  title: ReactNode
  message?: ReactNode
  /** Label of the confirm button (action-specific, e.g. "Delete exam"). */
  confirmLabel?: string
  cancelLabel?: string
  /** Danger styling for destructive confirms (default true). */
  danger?: boolean
  /** Disables the buttons while the action runs. */
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Shared confirm dialog. Test ids: confirm-dialog, confirm-ok, confirm-cancel.
 * Cancel gets initial focus (destructive-safe). Footer order: Cancel then OK (reversed at 375).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      testId="confirm-dialog"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy} data-testid="confirm-cancel" data-autofocus>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={busy} data-testid="confirm-ok">
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message}
    </Modal>
  )
}
