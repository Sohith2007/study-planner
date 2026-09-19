import type { ButtonHTMLAttributes } from 'react'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary | accent (timer start on /focus only) | secondary | ghost | danger | danger-ghost. Default primary. */
  variant?: ButtonVariant
  /** sm h-9 · md h-11 (default, 44px) · lg h-14 · icon size-11 (pass aria-label). */
  size?: ButtonSize
  /**
   * Loading state: disables the button and sets aria-busy. Pass the loading label as children yourself
   * (e.g. `{saving ? 'Saving…' : 'Save'}`); copy is specified per screen.
   */
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  type = 'button',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
      {...rest}
    />
  )
}
