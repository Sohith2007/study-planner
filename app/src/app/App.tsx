import { BrowserRouter } from 'react-router'
import { ToastProvider } from '@/components/ui'
import { TimerProvider } from '@/logic/timer'
import type { BootstrapResult } from './bootstrap'
import { AppRoutes } from './routes'

/** Root: TimerProvider (survives route changes) -> BrowserRouter -> ToastProvider -> routes. */
export function App({ boot }: { boot: BootstrapResult }) {
  return (
    <TimerProvider>
      <BrowserRouter>
        <ToastProvider>
          {boot.error ? (
            <div role="alert" className="bg-danger-soft px-4 py-2 text-center text-small text-danger" data-testid="storage-error">
              Local storage is unavailable, so your data cannot be saved in this browser. ({boot.error})
            </div>
          ) : null}
          <AppRoutes />
        </ToastProvider>
      </BrowserRouter>
    </TimerProvider>
  )
}
