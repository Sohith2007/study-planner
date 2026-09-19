import { expect, type Page } from '@playwright/test'

/** A fixed "today" used across specs: Wednesday 17 June 2026, 09:00 local. Mon-Fri capacity applies. */
export const FIXED_TODAY_ISO = '2026-06-17'
export const FIXED_TODAY_DATETIME = '2026-06-17T09:00:00'

export function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** Install a fixed clock BEFORE navigation so the demo seed and "today" are deterministic. */
export async function installFixedClock(page: Page, iso: string = FIXED_TODAY_DATETIME): Promise<void> {
  await page.clock.install({ time: new Date(iso) })
}

/** Stub `window.Notification` before the page scripts run. */
export async function stubNotifications(page: Page, permission: 'granted' | 'denied' | 'default' = 'granted'): Promise<void> {
  await page.addInitScript((perm) => {
    class FakeNotification {
      static permission: string = perm
      title: string
      body?: string
      constructor(title: string, options?: { body?: string }) {
        this.title = title
        this.body = options?.body
        const w = window as unknown as { __notifications: { title: string; body?: string }[] }
        w.__notifications = w.__notifications || []
        w.__notifications.push({ title, body: options?.body })
      }
      static requestPermission(): Promise<string> {
        FakeNotification.permission = perm === 'default' ? 'granted' : perm
        return Promise.resolve(FakeNotification.permission)
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).Notification = FakeNotification
  }, permission)
}

export async function getNotifications(page: Page): Promise<{ title: string; body?: string }[]> {
  return page.evaluate(() => (window as unknown as { __notifications?: { title: string; body?: string }[] }).__notifications || [])
}

/** Wait until the Plan status bar is no longer mid-rebuild (past the 500ms debounce + run). */
export async function waitForPlanReady(page: Page): Promise<void> {
  await expect(page.getByTestId('plan-status')).not.toContainText('Updating plan', { timeout: 10_000 })
}

export async function clearTimerStorage(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.removeItem('focusplan.timer.v1'))
}

/** Wait for the dashboard's async chart chunk to resolve one way or the other. */
export async function waitForChart(page: Page): Promise<void> {
  await expect(page.getByTestId('focus-chart-legend').or(page.getByTestId('chart-empty')).first()).toBeVisible({ timeout: 10_000 })
}

export async function waitForFonts(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready)
}

/** Read every row of an IndexedDB object store in the `focusplan` database. */
export async function readStore<T = Record<string, unknown>>(page: Page, store: string): Promise<T[]> {
  return page.evaluate(
    (storeName) =>
      new Promise<T[]>((resolve, reject) => {
        const open = indexedDB.open('focusplan')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const idb = open.result
          const req = idb.transaction(storeName, 'readonly').objectStore(storeName).getAll()
          req.onsuccess = () => {
            idb.close()
            resolve(req.result as T[])
          }
          req.onerror = () => reject(req.error)
        }
      }),
    store,
  )
}

export const SEED = {
  subjects: { math: 'seed-subject-math', physics: 'seed-subject-physics', chemistry: 'seed-subject-chemistry' },
  exams: { chemistry: 'seed-exam-organic-quiz', math: 'seed-exam-calculus-midterm', physics: 'seed-exam-mechanics-test' },
  topics: {
    limits: 'seed-topic-limits',
    derivatives: 'seed-topic-derivatives',
    chainRule: 'seed-topic-chain-rule',
    integration: 'seed-topic-integration-basics',
    applications: 'seed-topic-applications-of-derivatives',
    kinematics: 'seed-topic-kinematics',
    newtonsLaws: 'seed-topic-newtons-laws',
    workEnergy: 'seed-topic-work-energy',
    momentum: 'seed-topic-momentum',
    alkanes: 'seed-topic-alkanes',
    functionalGroups: 'seed-topic-functional-groups',
    isomerism: 'seed-topic-isomerism',
  },
  manualTask: 'seed-task-problem-set-3',
} as const

export interface SeedBlock {
  id: string
  date: string
  order: number
  kind: string
  topicId: string | null
  examId: string | null
  subjectId: string | null
  title: string
  pomodoros: number
  completedPomodoros: number
  status: string
  source: string
  pinned: boolean
  reviewOffset: number | null
}

export interface SeedTopic {
  id: string
  examId: string
  name: string
  estimatePomodoros: number
  difficulty: string
  covered: boolean
  confidence: number | null
  order: number
}
