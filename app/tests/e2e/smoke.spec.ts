import { expect, test, type Page } from '@playwright/test'

/** Count rows in an IndexedDB object store of the `focusplan` database. */
async function countStore(page: Page, store: string): Promise<number> {
  return page.evaluate(
    (storeName) =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('focusplan')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const idb = open.result
          const req = idb.transaction(storeName, 'readonly').objectStore(storeName).count()
          req.onsuccess = () => {
            idb.close()
            resolve(req.result)
          }
          req.onerror = () => reject(req.error)
        }
      }),
    store,
  )
}

const NAV = [
  ['today', 'Today'],
  ['week', 'Week'],
  ['focus', 'Focus'],
  ['setup', 'Setup'],
  ['settings', 'Settings'],
  ['dashboard', 'Dashboard'],
  ['data', 'Data'],
] as const

test('AC-P0-2: / redirects to /today and nav switches routes client-side without errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto('/')
  await expect(page).toHaveURL(/\/today$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  // A marker on window survives client-side navigation but not a full reload.
  await page.evaluate(() => ((window as unknown as { __spa: boolean }).__spa = true))

  for (const [key, label] of NAV) {
    await expect(page.getByTestId(`nav-${key}`)).toHaveText(label)
  }
  for (const [key] of [...NAV.slice(1), NAV[0]]) {
    await page.getByTestId(`nav-${key}`).click()
    await expect(page).toHaveURL(new RegExp(`/${key}(\\?.*)?$`))
    await expect(page.getByTestId(`nav-${key}`)).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  }
  expect(await page.evaluate(() => (window as unknown as { __spa?: boolean }).__spa)).toBe(true)
  expect(errors).toEqual([])
})

test('AC-P0-3: first load seeds the demo exactly once', async ({ page }) => {
  await page.goto('/today')
  await expect(page.getByTestId('nav-today')).toBeVisible()
  expect(await countStore(page, 'subjects')).toBe(3)
  expect(await countStore(page, 'exams')).toBe(3)
  expect(await countStore(page, 'topics')).toBe(12)
  expect(await countStore(page, 'settings')).toBe(1)

  await page.reload()
  await expect(page.getByTestId('nav-today')).toBeVisible()
  expect(await countStore(page, 'subjects')).toBe(3)
  expect(await countStore(page, 'topics')).toBe(12)
})

test('AC-P0-4: deep link to /week renders the app', async ({ page }) => {
  const res = await page.goto('/week')
  expect(res?.status()).toBe(200)
  await expect(page.getByTestId('nav-week')).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('nav-week')).toHaveAttribute('aria-current', 'page')
})

test('replan-button is present in the shell', async ({ page }) => {
  await page.goto('/today')
  await expect(page.getByTestId('replan-button')).toBeVisible()
  await expect(page.getByTestId('plan-status')).toBeVisible()
})

test('shell: status bar hidden on /focus, unknown route redirects, nav-home links to /today', async ({ page }) => {
  await page.goto('/focus')
  await expect(page.getByTestId('nav-focus')).toHaveAttribute('aria-current', 'page')
  await expect(page.getByTestId('plan-status')).toHaveCount(0)
  await expect(page.getByTestId('replan-button')).toHaveCount(0)
  // Timer is idle (P0 stub), so the pill is not shown.
  await expect(page.getByTestId('nav-timer')).toHaveCount(0)
  await page.getByTestId('nav-home').click()
  await expect(page).toHaveURL(/\/today$/)
  await page.goto('/no-such-page')
  await expect(page).toHaveURL(/\/today$/)
})

test('shell at 375px: every nav test id exists exactly once and is reachable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/today')
  for (const [key] of NAV) {
    await expect(page.getByTestId(`nav-${key}`)).toHaveCount(1)
  }
  await expect(page.getByTestId('nav-home')).toHaveCount(1)
  await page.getByTestId('nav-data').click()
  await expect(page).toHaveURL(/\/data$/)
  await expect(page.getByTestId('nav-data')).toBeInViewport()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflow).toBe(false)
})

test('design tokens: self-hosted fonts only, dark mode follows the system', async ({ page }) => {
  const foreign: string[] = []
  page.on('request', (r) => {
    if (!r.url().startsWith('http://localhost:5173')) foreign.push(r.url())
  })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/today')
  await expect(page.locator('html')).toHaveClass(/dark/)
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bg).toBe('rgb(22, 21, 18)') // --fp-bg dark #161512
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await page.evaluate(() => document.fonts.ready)
  expect(foreign).toEqual([])
})

test('fonts: IBM Plex Mono faces resolve from /fonts with 200', async ({ page }) => {
  const fontResponses: Record<string, number> = {}
  page.on('response', (r) => {
    if (r.url().includes('/fonts/')) fontResponses[r.url().split('/fonts/')[1]] = r.status()
  })
  await page.goto('/today')
  const loaded = await page.evaluate(async () =>
    Promise.all(['300', '400', '500'].map(async (w) => (await document.fonts.load(`${w} 16px "IBM Plex Mono"`)).length)),
  )
  expect(loaded).toEqual([1, 1, 1])
  expect(fontResponses['IBMPlexMono-Regular.woff2']).toBe(200)
  expect(fontResponses['IBMPlexMono-Light.woff2']).toBe(200)
  expect(fontResponses['IBMPlexMono-Medium.woff2']).toBe(200)
  expect(fontResponses['InstrumentSans-Variable.woff2']).toBe(200)
})

test('route change focuses the lazily loaded page h1', async ({ page }) => {
  await page.goto('/today')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  for (const key of ['dashboard', 'setup', 'week']) {
    await page.getByTestId(`nav-${key}`).click()
    await expect(page).toHaveURL(new RegExp(`/${key}`))
    await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('H1')
  }
})

test('catch-up on open leaves no planned block before today and plans work', async ({ page }) => {
  await page.goto('/today')
  await expect(page.getByTestId('nav-today')).toBeVisible()
  const readBlocks = () =>
    page.evaluate(
      () =>
        new Promise<{ date: string; status: string; title: string }[]>((resolve, reject) => {
          const open = indexedDB.open('focusplan')
          open.onerror = () => reject(open.error)
          open.onsuccess = () => {
            const idb = open.result
            const req = idb.transaction('blocks', 'readonly').objectStore('blocks').getAll()
            req.onsuccess = () => {
              idb.close()
              resolve(req.result)
            }
            req.onerror = () => reject(req.error)
          }
        }),
    )
  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  await expect.poll(async () => (await readBlocks()).filter((b) => b.status === 'planned' && b.date < today).length).toBe(0)
  const blocks = await readBlocks()
  expect(blocks.some((b) => b.title === 'Derivatives' && b.date >= today)).toBe(true)
  expect(blocks.some((b) => b.title === 'Alkanes' && b.date >= today)).toBe(true)
})
