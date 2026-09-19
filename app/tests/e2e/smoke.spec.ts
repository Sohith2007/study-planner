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
