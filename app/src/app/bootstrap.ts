import { seedIfEmpty } from '@/db'

export interface BootstrapResult {
  seeded: boolean
  /** Set when IndexedDB is unavailable (e.g. some private modes); the app still renders. */
  error: string | null
}

/** Runs before the first render: seeds the demo data on first launch. */
export async function bootstrap(): Promise<BootstrapResult> {
  try {
    const seeded = await seedIfEmpty()
    return { seeded, error: null }
  } catch (err) {
    console.error('FocusPlan: could not open local storage', err)
    return { seeded: false, error: err instanceof Error ? err.message : String(err) }
  }
}
