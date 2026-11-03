/**
 * Measures the JavaScript memory WorkSim uses in Chromium at each stage of a
 * session (production build), and whether it keeps growing as apps are opened
 * and closed. Usage: npm run build, then `node scripts/measure-memory.mjs`.
 */
import { spawn, spawnSync } from 'node:child_process'
import { chromium } from '@playwright/test'

const PORT = 4183
const URL = `http://localhost:${PORT}/`

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

try {
  await waitForServer()
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')
  const heap = async () => {
    await cdp.send('HeapProfiler.collectGarbage')
    const { metrics } = await cdp.send('Performance.getMetrics')
    const used = metrics.find((m) => m.name === 'JSHeapUsedSize').value
    return Math.round(used / 1024 / 1024)
  }
  const app = (name) =>
    page
      .getByRole('navigation', { name: 'Apps' })
      .getByRole('button', { name: new RegExp(`^${name}`) })
      .click()

  const results = {}
  await page.goto(URL)
  await page.getByRole('button', { name: 'Start my first day' }).waitFor()
  results.startScreen = await heap()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await page.locator('[data-testid="office"] canvas').waitFor({ timeout: 120_000 })
  results.office = await heap()
  await page
    .getByRole('navigation', { name: 'Places' })
    .getByRole('button', { name: 'Your desk' })
    .click()
  await page
    .getByTestId('office-panel')
    .getByRole('button', { name: /Use your computer/ })
    .click()
  const round = async () => {
    await app('Sheets')
    await page
      .getByRole('button', { name: /Practice Workbook/ })
      .first()
      .click()
    await page.getByRole('grid').waitFor()
    await app('Docs')
    await page
      .getByRole('button', { name: /Blank document/ })
      .first()
      .click()
    await page.getByTestId('doc-body').waitFor()
    await app('Slides')
    await page
      .getByRole('button', { name: /Monthly business review/ })
      .first()
      .click()
    await page.getByTestId('slide-canvas').waitFor()
    await app('Mail')
  }
  await round()
  results.afterApps = await heap()
  for (let i = 0; i < 4; i++) await round()
  results.afterFiveRounds = await heap()
  await browser.close()
  console.log(JSON.stringify({ heapMB: results }))
} finally {
  if (process.platform === 'win32')
    spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'])
  else server.kill()
}
