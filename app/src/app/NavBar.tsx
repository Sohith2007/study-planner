import clsx from 'clsx'
import { NavLink } from 'react-router'
import { NAV_ITEMS } from './nav'

/** Top navigation. Each link has data-testid `nav-<route>`; the active one gets aria-current="page". */
export function NavBar() {
  return (
    <nav aria-label="Main" className="-mx-1 flex gap-1 overflow-x-auto">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          data-testid={`nav-${item.key}`}
          className={({ isActive }) =>
            clsx(
              'whitespace-nowrap rounded-control px-3 py-1.5 text-sm font-medium transition-colors',
              isActive ? 'bg-brand-soft text-brand-strong' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
