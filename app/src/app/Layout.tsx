import { Link, Outlet } from 'react-router'
import PlanSync from '@/features/plan-status/PlanSync'
import PlanStatusBar from '@/features/plan-status/PlanStatusBar'
import { NavBar } from './NavBar'

/** App shell: header (brand + nav), invisible PlanSync, PlanStatusBar, then the routed page. */
export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
          <Link to="/today" className="flex items-center gap-2 text-lg font-bold text-ink" data-testid="brand">
            <img src="/favicon.svg" alt="" className="size-6" />
            FocusPlan
          </Link>
          <NavBar />
        </div>
      </header>
      <PlanSync />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6">
        <PlanStatusBar />
        <Outlet />
      </main>
    </div>
  )
}
