import type { Settings } from '@/types'
import { db } from './db'

export const SETTINGS_ID = 'settings' as const

/** Default settings (also the demo seed's settings). dailyCapacity is indexed by JS weekday, 0 = Sunday. */
export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  id: SETTINGS_ID,
  dailyCapacity: [4, 6, 6, 6, 6, 6, 8],
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  timerMode: 'classic',
  dailyGoalPomodoros: 4,
  blackoutDates: [],
  reviewOffsets: [1, 3, 7],
  soundEnabled: true,
  notificationsEnabled: true,
})

/** Fresh mutable copy of the defaults. */
export function defaultSettings(): Settings {
  return {
    ...DEFAULT_SETTINGS,
    dailyCapacity: [...DEFAULT_SETTINGS.dailyCapacity],
    blackoutDates: [],
    reviewOffsets: [...DEFAULT_SETTINGS.reviewOffsets],
  }
}

/** Read the settings row, filling any missing field with its default. Never throws for a missing row. */
export async function getSettings(): Promise<Settings> {
  const row = await db.settings.get(SETTINGS_ID)
  return { ...defaultSettings(), ...(row ?? {}), id: SETTINGS_ID }
}

/** Merge `patch` into the settings row (creating it if needed). */
export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const current = await getSettings()
    await db.settings.put({ ...current, ...patch, id: SETTINGS_ID })
  })
}
