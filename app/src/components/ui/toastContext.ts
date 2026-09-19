import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastApi {
  /**
   * Show a toast (data-testid "toast", data-tone=<tone>). Auto-dismisses after 4 s (errors: 8 s,
   * role="alert", with a close button). At most 3 are visible; the oldest drops first.
   */
  show(message: string, tone?: ToastTone, durationMs?: number): void
}

export const ToastContext = createContext<ToastApi | null>(null)

/** `const toast = useToast(); toast.show('Settings saved')`. Requires <ToastProvider> (mounted in App). */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
