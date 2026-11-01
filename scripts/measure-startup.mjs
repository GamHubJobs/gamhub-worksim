/**
 * Measures how much JavaScript the production build downloads, and how long it
 * takes, before a new player sees the start screen and before a returning
 * player reaches the office, on a throttled connection.
 *
 * Usage: npm run build, then `node scripts/measure-startup.mjs [label]`.
 * It starts `vite preview` itself and prints one JSON line of results.
 */
import { spawn, spawnSync } from 'node:child_process'
import { chromium } from '@playwright/test'

const PORT = 4179
const URL = `http://localhost:${PORT}/`
// A "fast 3G"-like connection: 1.6 Mbit/s down, 150 ms latency.
const NETWORK = {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
}

// Another server on the port would be measured instead: refuse to go on.
const busy = await fetch(URL).then(
  () => true,
  () => false,
)
if (busy) throw new Error(`Port ${PORT} is already in use; stop that server first.`)

const server = spawn(`npx vite preview --port ${PORT} --strictPort`, {
  shell: true,
  stdio: 'ignore',
})

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error('vite preview could not start')
    try {
      if ((await fetch(URL)).ok) return
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error('vite preview did not start')
}

/** Loads the page on a throttled connection; returns the JS downloaded and the time taken. */
async function visit(context, until) {
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', NETWORK)
  // Every visit downloads everything again, as on a first visit after an update.
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  let js = 0
  cdp.on('Network.loadingFinished', (e) => {
    const r = requests.get(e.requestId)
    if (r && r.endsWith('.js')) js += e.encodedDataLength
  })
  const requests = new Map()
  cdp.on('Network.responseReceived', (e) => requests.set(e.requestId, e.response.url))
  const start = Date.now()
  await page.goto(URL)
  await until(page)
  const ms = Date.now() - start
  await page.close()
  return { kB: Math.round(js / 1024), ms }
}

try {
  await waitForServer()
  const browser = await chromium.launch()
  // A new player: the start screen.
  const fresh = await browser.newContext()
  const startScreen = await visit(fresh, (page) =>
    page
      .getByRole('button', { name: 'Start my first day' })
      .waitFor({ timeout: 120_000 }),
  )
  // Create a career, then come back as a returning player: the office.
  const page = await fresh.newPage()
  await page.goto(URL)
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await page.getByTestId('office').waitFor({ timeout: 120_000 })
  await page.close()
  const office = await visit(fresh, (page) =>
    page.locator('[data-testid="office"] canvas').waitFor({ timeout: 120_000 }),
  )
  await browser.close()
  console.log(JSON.stringify({ label: process.argv[2] ?? 'build', startScreen, office }))
} finally {
  // Stop the whole process tree (the shell and the server it started).
  if (process.platform === 'win32')
    spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'])
  else server.kill()
}
