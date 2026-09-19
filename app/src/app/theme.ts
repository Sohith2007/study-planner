/**
 * Dark mode follows the system setting (no toggle UI in the MVP).
 * Adds/removes `.dark` on <html>, which swaps every --fp-* colour variable.
 */
export function initTheme(): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const apply = () => document.documentElement.classList.toggle('dark', mq.matches)
  apply()
  mq.addEventListener('change', apply)
  return () => mq.removeEventListener('change', apply)
}
