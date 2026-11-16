/**
 * The Engineer career's sites, built from start to finish in the real game:
 * each project's corrected design approved and issued, the site watched in
 * 3D as it is surveyed, dug, cast, framed, walled, roofed, serviced and
 * finished, every issue decided well and every inspection done honestly
 * (through the development hooks, so the run takes minutes, not hours), and
 * the yard store handed over with its documents made in the office apps.
 * Screenshots of each stage go to WORKSIM_SHOTS (docs/screenshots by default).
 */
import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers.ts'

const shots = process.env.WORKSIM_SHOTS ?? 'docs/screenshots'

async function startEngineering(page: Page) {
  await page.addInitScript(() => localStorage.setItem('worksim.graphics.v1', 'high'))
  await page.goto('/')
  await page.getByRole('radio', { name: /Engineering & Technical Services/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible({ timeout: 30_000 })
  await page.evaluate(
    "window.__worksimSpeed = 12; sessionStorage.setItem('worksim.testSpeed', '12')",
  )
}

const hook = (page: Page, code: string) => page.evaluate(`window.__worksim.${code}`)

/** The corrected design approved, its drawing and quantities made, and the site started. */
async function issue(page: Page, id: string) {
  await hook(page, `engineering.submitCorrected('${id}')`)
  await hook(page, 'passTime(31)')
  await openApp(page, 'Projects')
  const app = page.getByTestId('projects-app')
  await expect(app.getByTestId('revision-badge').first()).toContainText('Approved')
  await app.getByTestId('projects-tab-documents').click()
  for (const kind of ['drawings', 'quantities']) {
    await app.getByTestId(`make-${kind}`).click()
    await expect(app.getByTestId(`document-${kind}`)).toContainText(/Made from revision/)
  }
  await app.getByTestId('projects-tab-site').click()
  await app.getByTestId('start-construction').click()
  await expect(app.getByTestId('site-tab')).toBeVisible()
}

/** To the site, then to the viewpoint where the whole build can be watched. */
async function toViewpoint(page: Page) {
  await page.getByTestId('projects-app').getByTestId('go-to-site').click()
  await expect(page.getByTestId('site-panel')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('site-canvas')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(1500)
  // The whole site, from above its south-west corner.
  await page.getByTestId('site-panel').getByTestId('site-overview').click()
  await page.waitForTimeout(2000)
}

/**
 * Lets the site work (doing well whatever holds it up) to the middle of
 * each stage in turn, photographing each, then to the end.
 */
async function build(page: Page, name: string, stages: string[]) {
  const panel = page.getByTestId('site-panel')
  for (const stage of stages) {
    await hook(page, `engineering.advanceTo('${stage}', 0.55)`)
    await page.waitForTimeout(3000)
    await page.screenshot({ path: `${shots}/engineering/site-${name}-${stage}.png` })
  }
  await hook(page, "engineering.advanceTo('ready')")
  await expect(panel).toContainText('Ready to hand over')
}

test('Tour: the yard store built from survey to handover', async ({ page }) => {
  test.setTimeout(900_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startEngineering(page)
  await issue(page, 'yard-store')
  await toViewpoint(page)
  await build(page, 'store', [
    'survey',
    'excavation',
    'reinforcement',
    'foundations',
    'slab',
    'walls',
    'structure',
    'openings',
    'roofing',
    'electrical',
    'finishing',
  ])
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${shots}/engineering/site-store-complete.png` })

  // The handover: the inspection report and handover file made in Word Craft, then handed over.
  await page.getByTestId('site-panel').getByTestId('site-leave').click()
  await expect(page.getByTestId('office-panel')).toBeVisible({ timeout: 60_000 })
  await openApp(page, 'Projects')
  const app = page.getByTestId('projects-app')
  await app.getByTestId('projects-tab-documents').click()
  for (const kind of ['inspection', 'handover']) {
    await app.getByTestId(`make-${kind}`).click()
    await expect(app.getByTestId(`document-${kind}`)).toContainText(/Made from revision/)
  }
  await app.getByTestId(`document-handover`).getByRole('button', { name: 'Open' }).click()
  await expect(page.getByText('Handover file').first()).toBeVisible({ timeout: 30_000 })
  await openApp(page, 'Projects')
  await app.getByTestId('projects-tab-site').click()
  await app.getByTestId('hand-over').click()
  // Handed over: the project is finished, and the overview shows its score.
  await expect(app.getByTestId('brief-yard-store')).toContainText(/Handed over: \d+\/100/)
  await page.screenshot({ path: `${shots}/engineering/projects-handed-over.png` })
})

test('Tour: the mill race footbridge', async ({ page }) => {
  test.setTimeout(900_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startEngineering(page)
  await hook(page, "engineering.unlock('mill-footbridge')")
  await issue(page, 'mill-footbridge')
  await toViewpoint(page)
  await build(page, 'bridge', [
    'excavation',
    'foundations',
    'structure',
    'slab',
    'finishing',
  ])
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${shots}/engineering/site-bridge-complete.png` })
})

test('Tour: the two-storey workshop and offices', async ({ page }) => {
  test.setTimeout(900_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startEngineering(page)
  await hook(page, "engineering.unlock('workshop-office')")
  await issue(page, 'workshop-office')
  await toViewpoint(page)
  await build(page, 'workshop', ['structure', 'walls', 'roofing', 'hvac'])
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${shots}/engineering/site-workshop-complete.png` })
})
