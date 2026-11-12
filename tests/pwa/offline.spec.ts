import { readFileSync, writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/** The built service worker that vite preview serves. */
const SW_FILE = 'dist/sw.js'

/** Waits until the service worker controls the page and has cached this version. */
async function waitForOfflineReady(page: Page) {
  await page.waitForFunction(
    'navigator.serviceWorker.ready.then((reg) => !!reg.active && !!navigator.serviceWorker.controller)',
  )
}

/** Asks the service worker in control for its version. */
const SW_VERSION = `new Promise((resolve) => {
  const channel = new MessageChannel()
  channel.port1.onmessage = (e) => resolve(String(e.data))
  navigator.serviceWorker.controller.postMessage('VERSION', [channel.port2])
})`

async function startCareer(page: Page) {
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })
}

test('WorkSim is installable: a valid manifest, icons and a service worker', async ({
  page,
  request,
}) => {
  await page.goto('/')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).toBeTruthy()
  const manifest = await (await request.get(href!)).json()
  expect(manifest).toMatchObject({
    name: 'GamHub WorkSim',
    short_name: 'WorkSim',
    display: 'standalone',
    start_url: './',
  })
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes)
  expect(sizes).toContain('192x192')
  expect(sizes).toContain('512x512')
  for (const icon of manifest.icons as Array<{ src: string }>)
    expect((await request.get(new URL(icon.src, page.url()).href)).status()).toBe(200)
  await page.reload()
  await waitForOfflineReady(page)
})

test('offline: WorkSim starts, opens the save, keeps working and saving, and comes back online', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await startCareer(page)
  // A second visit lets the service worker take control of the page.
  await page.reload()
  await waitForOfflineReady(page)
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })

  // Offline: WorkSim still starts, with the save.
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByTestId('offline-status')).toContainText('offline')

  // Work while offline is saved on this device: read the first email.
  await page
    .getByRole('navigation', { name: 'Places' })
    .getByRole('button', { name: 'Your desk' })
    .click()
  await page
    .getByTestId('office-panel')
    .getByRole('button', { name: /Use your computer/ })
    .click()
  // The computer opens with Mail in front.
  await expect(page.getByTestId('window-mail')).toBeVisible({ timeout: 60_000 })
  await page.getByRole('button', { name: /Welcome to Cobalt Ridge/ }).click()
  await expect(page.getByTestId('mail-message')).toContainText('Welcome')
  await page.reload()
  await expect(
    page.getByRole('navigation', { name: 'Apps' }).getByRole('button', { name: /^Mail/ }),
  ).not.toContainText('2 new', { timeout: 60_000 })

  // Back online: nothing changes, and the offline notice goes.
  await context.setOffline(false)
  await page.reload()
  await expect(page.getByRole('navigation', { name: 'Apps' })).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.getByTestId('offline-status')).toHaveCount(0)
})

test('an update waits for the player, saves first, and keeps their work', async ({
  page,
}) => {
  await page.goto('/')
  await startCareer(page)
  await page.reload()
  await waitForOfflineReady(page)
  const before = await page.evaluate(SW_VERSION)

  // A new version is published. The browser fetches the service worker
  // itself, so the built sw.js really changes (and is put back afterwards).
  const original = readFileSync(SW_FILE, 'utf8')
  writeFileSync(
    SW_FILE,
    original.replace(/const VERSION = "[^"]+"/, 'const VERSION = "next-version"'),
  )
  try {
    await page.evaluate(
      'navigator.serviceWorker.getRegistration().then((reg) => reg?.update())',
    )

    // It waits: the player is told, and nothing reloads by itself.
    const notice = page.getByTestId('update-ready')
    await expect(notice).toContainText('A new version of WorkSim is ready', {
      timeout: 60_000,
    })
    await expect(page.getByTestId('office')).toBeVisible()
    await notice.getByRole('button', { name: 'Update now' }).click()
    await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })
    await expect(page.getByTestId('update-ready')).toHaveCount(0)
    const after = await page.evaluate(SW_VERSION)
    expect(after).toBe('next-version')
    expect(after).not.toBe(before)
    // The career save is still there.
    await expect(page.getByTestId('onboarding')).toHaveCount(0)
  } finally {
    writeFileSync(SW_FILE, original)
  }
})

test('repairing the app files keeps the saves', async ({ page }) => {
  await page.goto('/')
  await startCareer(page)
  await page.reload()
  await waitForOfflineReady(page)
  await page.getByRole('button', { name: 'Storage & backup' }).click()
  await page.getByRole('button', { name: 'Repair app files' }).click()
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByTestId('onboarding')).toHaveCount(0)
  // The app files are downloaded again: one fresh cache of the current version.
  await waitForOfflineReady(page)
  expect(await page.evaluate('caches.keys().then((keys) => keys.length)')).toBe(1)
})

/** The office apps' caches (see scripts/pwa/sw-template.js). */
const CRAFT_CACHES = `caches.keys().then((keys) => keys.filter((key) => key.startsWith('craft-apps-')))`

test('Grid Craft, once opened online, opens offline too (from its own cache)', async ({
  page,
  context,
}) => {
  test.setTimeout(300_000)
  const openPractice = async () => {
    await page
      .getByRole('navigation', { name: 'Places' })
      .getByRole('button', { name: 'Your desk' })
      .click()
    await page
      .getByTestId('office-panel')
      .getByRole('button', { name: /Use your computer/ })
      .click()
    await page
      .getByRole('navigation', { name: 'Apps' })
      .getByRole('button', { name: /^Grid Craft/ })
      .click()
    await page.getByRole('button', { name: /Practice Workbook/ }).click()
    await expect(page.getByTestId('gridcraft-editor')).toHaveAttribute(
      'data-phase',
      'ready',
      {
        timeout: 180_000,
      },
    )
  }
  await page.goto('/')
  await startCareer(page)
  await page.reload()
  await waitForOfflineReady(page)
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })
  // Not installed with the game: only kept once opened.
  expect(await page.evaluate(CRAFT_CACHES)).toEqual([])
  await openPractice()
  expect(await page.evaluate(CRAFT_CACHES)).toEqual([
    'craft-apps-deckcraft@0.18.1,gridcraft@0.18.0,wordcraft@0.18.0',
  ])

  await context.setOffline(true)
  await page.goto('/')
  await expect(page.getByTestId('offline-status')).toContainText('offline', {
    timeout: 60_000,
  })
  // WorkSim reopens where the player was: the workbook, in Grid Craft, from its cache.
  await expect(page.getByTestId('gridcraft-editor')).toHaveAttribute(
    'data-phase',
    'ready',
    {
      timeout: 180_000,
    },
  )
  await context.setOffline(false)
})
