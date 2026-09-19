import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router'
import PlanSync from '@/features/plan-status/PlanSync'
import PlanStatusBar from '@/features/plan-status/PlanStatusBar'
import { PageErrorBoundary } from './ErrorBoundary'
import { NavBar } from './NavBar'

/**
 * App shell (screens/app-shell.md): skip link, NavBar, PlanSync (invisible), PlanStatusBar
 * (not rendered on /focus), then <main id="main">. Pages set their own max width
 * (max-w-page / max-w-form / max-w-focus with mx-auto w-full).
 */
export function Layout() {
  const { pathname } = useLocation()
  const onFocusRoute = pathname.startsWith('/focus')
  const prevPath = useRef(pathname)

  // On route change: scroll to top and move focus to the page <h1>.
  useEffect(() => {
    // Compare with the previous path (not a first-render flag) so StrictMode double effects do nothing on load.
    if (prevPath.current === pathname) return
    prevPath.current = pathname
    window.scrollTo(0, 0)
    const h1 = document.querySelector<HTMLElement>('#main h1')
    if (h1) {
      if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1')
      h1.focus({ preventScroll: true })
    }
  }, [pathname])

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-surface px-4 py-2 text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-2"
      >
        Skip to content
      </a>
      <NavBar />
      <PlanSync />
      {onFocusRoute ? null : <PlanStatusBar />}
      <main id="main" className="mx-auto flex w-full flex-1 flex-col px-4 py-6 md:px-6 md:py-8 xl:px-8">
        <PageErrorBoundary key={pathname}>
          <Outlet />
        </PageErrorBoundary>
      </main>
    </div>
  )
}
