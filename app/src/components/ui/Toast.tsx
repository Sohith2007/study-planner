import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Icon } from './icons'
import { ToastContext, type ToastAction, type ToastOptions, type ToastTone } from './toastContext'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
  durationMs: number
  action?: ToastAction
}

const MAX_VISIBLE = 3

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [entered, setEntered] = useState(false)
  const [paused, setPaused] = useState(false)
  const remaining = useRef(item.durationMs)
  const startedAt = useRef(0)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Auto-dismiss; pauses while hovered or focused.
  useEffect(() => {
    if (paused) return
    startedAt.current = Date.now()
    const t = window.setTimeout(() => onDismiss(item.id), remaining.current)
    return () => {
      window.clearTimeout(t)
      remaining.current = Math.max(500, remaining.current - (Date.now() - startedAt.current))
    }
  }, [paused, item.id, onDismiss])

  const isError = item.tone === 'error'
  return (
    <div
      role={isError ? 'alert' : 'status'}
      data-testid="toast"
      data-tone={item.tone}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={clsx(
        'pointer-events-auto flex items-start gap-3 rounded-lg px-4 py-3 text-small shadow-raised',
        'transition duration-200 ease-standard motion-reduce:transition-none',
        entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
        isError ? 'bg-danger text-on-primary' : 'bg-text text-bg',
      )}
    >
      {item.tone === 'success' ? <Icon.Check className="mt-0.5 text-primary-soft" /> : null}
      {item.tone === 'info' ? <Icon.Info className="mt-0.5" /> : null}
      {isError ? <Icon.Alert className="mt-0.5" /> : null}
      <span className="flex-1">{item.message}</span>
      {item.action ? (
        <button
          type="button"
          data-testid={item.action.testId ?? 'toast-undo'}
          className={clsx(
            '-my-1 shrink-0 rounded-md px-2 py-1 font-semibold underline-offset-2 hover:underline',
            isError ? 'text-on-primary' : 'text-primary-soft',
          )}
          onClick={() => {
            const action = item.action!
            onDismiss(item.id)
            Promise.resolve()
              .then(() => action.onClick())
              .catch((err) => console.error('FocusPlan: toast action failed', err))
          }}
        >
          {item.action.label}
        </button>
      ) : null}
      {isError ? (
        <button type="button" aria-label="Dismiss" className="-m-1 rounded-sm p-1" onClick={() => onDismiss(item.id)}>
          <Icon.X />
        </button>
      ) : null}
    </div>
  )
}

/** Mounted once at the app root (src/app/App.tsx). Region: bottom-right (bottom full-width at 375). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), [])
  const show = useCallback((message: string, tone: ToastTone = 'success', options?: number | ToastOptions) => {
    const id = nextId.current++
    const opts: ToastOptions = typeof options === 'number' ? { durationMs: options } : (options ?? {})
    const ms = opts.durationMs ?? (tone === 'error' ? 8000 : opts.action ? 6000 : 4000)
    setItems((xs) => [...xs, { id, message, tone, durationMs: ms, action: opts.action }].slice(-MAX_VISIBLE))
  }, [])
  const api = useMemo(() => ({ show }), [show])
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-4 z-60 flex flex-col gap-2 md:inset-x-auto md:right-6 md:bottom-6 md:w-96"
        aria-live="polite"
      >
        {items.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
