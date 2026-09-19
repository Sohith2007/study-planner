import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from './Button'

export interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children?: ReactNode
  footer?: ReactNode
  /** Defaults to "modal". */
  testId?: string
}

/** Accessible modal dialog: overlay, Escape or backdrop click closes, focus moves into the dialog. */
export function Modal({ open, title, onClose, children, footer, testId = 'modal' }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const el = ref.current?.querySelector<HTMLElement>('[data-autofocus], button, input, select, textarea')
    el?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
        className="w-full max-w-md rounded-card bg-surface p-5 shadow-overlay"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-lg font-semibold text-ink">{title}</h2>
        {children ? <div className="text-sm text-ink">{children}</div> : null}
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Confirm dialog. Test ids: confirm-dialog, confirm-ok, confirm-cancel. Cancel is focused first. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
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
          <Button variant="secondary" onClick={onCancel} data-testid="confirm-cancel" data-autofocus>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} data-testid="confirm-ok">
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message}
    </Modal>
  )
}
