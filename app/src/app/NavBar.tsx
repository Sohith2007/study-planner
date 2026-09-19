import clsx from 'clsx'
import { useEffect, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { formatMs, PHASE_LABEL } from '@/lib/format'
import { useTimer } from '@/logic/timer'
import { NAV_ITEMS } from './nav'

/**
 * Running-timer pill (`nav-timer`). Uses only the public P2 contract (`useTimer()`), so it works
 * with the P0 stub (always idle, so hidden) and with P2's real provider without changes.
 * Visible when the timer is running or paused AND the route is not /focus.
 */
export function NavTimerPill() {
  const timer = useTimer()
  const { pathname } = useLocation()
  if (timer.status === 'idle' || pathname.startsWith('/focus')) return null
  const isFlowFocus = timer.mode === 'flowtime' && timer.phase === 'focus'
  const time = formatMs(isFlowFocus ? timer.elapsedMs : timer.remainingMs)
  const text = timer.status === 'paused' ? `Paused · ${time}` : `${time} · ${PHASE_LABEL[timer.phase]}`
  const to = timer.blockId ? `/focus?blockId=${encodeURIComponent(timer.blockId)}` : '/focus'
  return (
    <Link
      to={to}
      data-testid="nav-timer"
      aria-label={`Timer: ${text}. Open Focus`}
      className={clsx(
        'inline-flex h-8 items-center whitespace-nowrap rounded-full px-3 font-mono text-small tabular-nums',
        timer.phase === 'focus' ? 'bg-accent text-on-accent' : 'bg-break text-on-primary',
      )}
    >
      {text}
    </Link>
  )
}

/**
 * Top navigation (design-system 4.5). The 7 links exist in the DOM exactly once at every width:
 * a scrolling strip on row 2 below xl, inline and centred at xl. Test ids: nav-home, nav-<route>, nav-timer.
 */
export function NavBar() {
  const { pathname } = useLocation()
  const stripRef = useRef<HTMLDivElement>(null)

  // Keep the active link scrolled into view in the horizontal strip.
  useEffect(() => {
    const active = stripRef.current?.querySelector<HTMLElement>('[aria-current="page"]')
    if (active && typeof active.scrollIntoView === 'function') {
      active.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  }, [pathname])

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-page flex-wrap items-center gap-x-4 px-4 md:px-6 xl:flex-nowrap xl:px-8">
        <Link
          to="/today"
          data-testid="nav-home"
          className="order-1 flex h-14 items-center gap-2 font-display text-heading font-semibold text-text"
        >
          <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
          FocusPlan
        </Link>
        <div className="order-2 ml-auto flex h-14 items-center xl:order-3 xl:ml-0">
          <NavTimerPill />
        </div>
        <nav aria-label="Main" className="order-3 w-full min-w-0 xl:order-2 xl:mx-auto xl:w-auto">
          <div
            ref={stripRef}
            className="no-scrollbar fade-x flex h-14 snap-x items-center gap-1 overflow-x-auto md:mask-none"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.key}`}
                className={({ isActive }) =>
                  clsx(
                    'inline-flex h-9 shrink-0 snap-start items-center whitespace-nowrap rounded-full px-3 text-small font-medium',
                    'transition-colors duration-150 motion-reduce:transition-none',
                    isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-sunken hover:text-text',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </header>
  )
}
