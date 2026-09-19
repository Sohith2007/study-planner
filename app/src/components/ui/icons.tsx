/* oxlint-disable react/only-export-components -- the Icon namespace object (Icon.Check, Icon.Play ...) is intentional. */
/**
 * Minimal inline icon set (no icon library is installed). 16px by default, stroke = currentColor,
 * aria-hidden. Usage: <Icon.Check />, <Icon.Play className="size-5" />.
 */
import clsx from 'clsx'
import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function make(paths: ReactNode) {
  return function IconComponent({ className, ...rest }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className={clsx('size-4 shrink-0', className)}
        {...rest}
      >
        {paths}
      </svg>
    )
  }
}

export const Icon = {
  Check: make(<path d="M20 6 9 17l-5-5" />),
  X: make(<path d="M18 6 6 18M6 6l12 12" />),
  Alert: make(
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </>,
  ),
  Info: make(
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>,
  ),
  Refresh: make(
    <>
      <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
      <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
      <path d="M21 3v5h-5M3 21v-5h5" />
    </>,
  ),
  Play: make(<path d="m7 4 13 8-13 8z" />),
  Pause: make(<path d="M8 5v14M16 5v14" />),
  Pin: make(<path d="M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3z" />),
  ChevronDown: make(<path d="m6 9 6 6 6-6" />),
  ChevronLeft: make(<path d="m15 18-6-6 6-6" />),
  ChevronRight: make(<path d="m9 18 6-6-6-6" />),
  More: make(
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>,
  ),
  Plus: make(<path d="M12 5v14M5 12h14" />),
  Trash: make(<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />),
  Download: make(<path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16" />),
  Upload: make(<path d="M12 21V9m0 0-4 4m4-4 4 4M4 3h16" />),
  Lock: make(
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>,
  ),
  Notebook: make(
    <>
      <path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z" />
      <path d="M8 8h8M8 12h6" />
    </>,
  ),
  Calendar: make(
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </>,
  ),
}
