import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info'

/** An inline action button inside a toast (e.g. Undo after Skip). */
export interface ToastAction {
  /** Button text, e.g. "Undo". */
  label: string
  /** Runs when clicked; the toast is dismissed right after. May be async (errors are logged, not thrown). */
  onClick: () => void | Promise<void>
  /** data-testid of the button. Default "toast-undo". */
  testId?: string
}

export interface ToastOptions {
  /** Auto-dismiss delay. Defaults: 4000 ms, 6000 ms when an action is present, 8000 ms for errors. */
  durationMs?: number
  action?: ToastAction
}

export interface ToastApi {
  /**
   * Show a toast (data-testid "toast", data-tone=<tone>). Auto-dismisses (pauses while hovered/focused);
   * errors use role="alert" and have a close button. At most 3 are visible; the oldest drops first.
   *
   * The third argument is either a duration in ms (backwards compatible) or ToastOptions:
   *   toast.show('Settings saved')
   *   toast.show("Couldn't save", 'error')
   *   toast.show('Skipped Derivatives', 'success', { action: { label: 'Undo', onClick: undoSkip } })
   */
  show(message: string, tone?: ToastTone, options?: number | ToastOptions): void
}

export const ToastContext = createContext<ToastApi | null>(null)

/** `const toast = useToast(); toast.show('Settings saved')`. Requires <ToastProvider> (mounted in App). */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
