import clsx from 'clsx'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastTone } from './toastContext'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

const toneClass: Record<ToastTone, string> = {
  success: 'border-success bg-success-soft text-success',
  error: 'border-danger bg-danger-soft text-danger',
  info: 'border-info bg-info-soft text-info',
}

/** Mounted once at the app root (src/app/App.tsx). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const show = useCallback((message: string, tone: ToastTone = 'success', durationMs = 3000) => {
    const id = nextId.current++
    setItems((xs) => [...xs, { id, message, tone }])
    window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), durationMs)
  }, [])
  const api = useMemo(() => ({ show }), [show])
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            data-testid="toast"
            className={clsx(
              'pointer-events-auto rounded-control border px-4 py-2 text-sm font-medium shadow-overlay',
              toneClass[t.tone],
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
