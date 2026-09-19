import { Suspense, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router'
import PlanSync from '@/features/plan-status/PlanSync'
import PlanStatusBar from '@/features/plan-status/PlanStatusBar'
import { LoadingBlock, Skeleton } from '@/components/ui'
import { PageErrorBoundary } from './ErrorBoundary'
import { NavBar } from './NavBar'

/**
 * App shell (screens/app-shell.md): skip link, NavBar, PlanSync (invisible), PlanStatusBar
 * (not rendered on /focus), then <main id="main">. Pages set their own max width
 * (max-w-page / max-w-form / max-w-focus with mx-auto w-full).
 */
/** Shown while a lazily loaded page chunk downloads (usually well under a frame on localhost). */
function PageFallback() {
  return (
    <div className="mx-auto w-full max-w-page">
      <LoadingBlock testId="page-loading">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-24 rounded-lg" />
      </LoadingBlock>
    </div>
  )
}

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
    const main = document.getElementById('main')
    if (!main) return
    let focused: HTMLElement | null = null
    const focusH1 = () => {
      const h1 = main.querySelector<HTMLElement>('h1')
      if (!h1 || h1 === focused) return
      // First focus, or the page swapped its <h1> (e.g. loading -> loaded) and focus fell back to <body>.
      // Never steal focus from something the user moved to.
      const active = document.activeElement
      const focusLost = !active || active === document.body
      if (focused && !focusLost) return
      if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1')
      h1.focus({ preventScroll: true })
      focused = h1
    }
    focusH1()
    // Pages are lazy-loaded and render their final <h1> after data loads: keep watching for 3 s.
    const observer = new MutationObserver(focusH1)
    observer.observe(main, { childList: true, subtree: true })
    const timeout = window.setTimeout(() => observer.disconnect(), 3000)
    return () => {
      observer.disconnect()
      window.clearTimeout(timeout)
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
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </PageErrorBoundary>
      </main>
    </div>
  )
}
