import clsx from 'clsx'
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

function Svg({ className, children, ...rest }: P) {
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
      {children}
    </svg>
  )
}

/** Pencil (topic rename). Local to Setup: the shared Icon set has no pencil. */
export function PencilIcon(props: P) {
  return (
    <Svg {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Svg>
  )
}

/** List (Quick add toggle). */
export function ListIcon(props: P) {
  return (
    <Svg {...props}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </Svg>
  )
}
