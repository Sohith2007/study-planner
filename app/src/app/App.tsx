import { BrowserRouter } from 'react-router'
import { ToastProvider } from '@/components/ui'
import { TimerProvider } from '@/logic/timer'
import type { BootstrapResult } from './bootstrap'
import { AppRoutes } from './routes'

/**
 * Root: ToastProvider -> TimerProvider -> BrowserRouter -> routes.
 * ToastProvider is outermost so TimerProvider can call useToast() on every route (it renders the single
 * toast viewport). TimerProvider stays outside BrowserRouter so the timer survives route changes
 * (it cannot use router hooks).
 */
export function App({ boot }: { boot: BootstrapResult }) {
  return (
    <ToastProvider>
      <TimerProvider>
        <BrowserRouter>
          {boot.error ? (
            <div role="alert" className="bg-danger-soft px-4 py-2 text-center text-small text-danger" data-testid="storage-error">
              Local storage is unavailable, so your data cannot be saved in this browser. ({boot.error})
            </div>
          ) : null}
          <AppRoutes />
        </BrowserRouter>
      </TimerProvider>
    </ToastProvider>
  )
}
