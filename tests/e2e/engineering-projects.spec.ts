/**
 * The Engineer career's projects, end to end in the real game: a project
 * taken on, the concept corrected in the plan editor and the specification,
 * submitted and returned, approved, documents made in the office apps,
 * issued for construction, an issue decided, the site visited in 3D, an
 * inspection measured on site and judged, and everything still there after
 * a reload.
 */
import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers.ts'

const shots = process.env.WORKSIM_SHOTS ?? 'docs/screenshots'

async function startEngineering(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toContainText('Northbank Engineering Ltd')
  await page.getByRole('radio', { name: /Engineering & Technical Services/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible({ timeout: 30_000 })
  await page.evaluate(
    "window.__worksimSpeed = 12; sessionStorage.setItem('worksim.testSpeed', '12')",
  )
}

/** Moves the office clock on (the design office's checks and the site follow it). */
async function passMinutes(page: Page, minutes: number) {
  await page.evaluate(`window.__worksim.passTime(${minutes})`)
}

/** Where a plan point (mm) is on screen, from two corner handles of the 12 × 8 m store. */
async function planPoint(page: Page, x: number, y: number) {
  const a = (await page.getByTestId('corner-0').boundingBox())!
  const c = (await page.getByTestId('corner-2').boundingBox())!
  const ax = a.x + a.width / 2
  const ay = a.y + a.height / 2
  const cx = c.x + c.width / 2
  const cy = c.y + c.height / 2
  return { x: ax + ((cx - ax) * x) / 12000, y: ay + ((cy - ay) * y) / 8000 }
}

/** Puts the yard store's concept right, as an engineer would, in the plan editor and the specification. */
async function correctYardStore(page: Page) {
  const app = page.getByTestId('projects-app')
  const spec = app.getByTestId('spec-form')
  await spec.getByLabel('Footing width (mm)').fill('600')
  await spec.getByLabel('Footing depth (mm)').fill('750')
  await spec.getByLabel('Beams').selectOption('NB-300')
  // The forklift door: select D1 and make it 3 m by 3 m.
  const editor = app.getByTestId('plan-editor')
  await editor.getByTestId('opening-D1').click({ force: true })
  const inspector = editor.getByTestId('plan-inspector')
  await inspector.getByLabel('Width (mm)').fill('3000')
  await inspector.getByLabel('Height (mm)').fill('3000')
  // Two more windows, drawn on the walls.
  const w2 = await planPoint(page, 2500, 8000)
  const w3 = await planPoint(page, 12000, 4000)
  await editor.getByRole('button', { name: 'Window' }).click()
  await page.mouse.move(w2.x, w2.y)
  await page.mouse.down()
  await page.mouse.up()
  // An SVG line has no height, so Playwright calls it hidden: check it is drawn.
  await expect(editor.getByTestId('opening-W2')).toBeAttached()
  await editor.getByRole('button', { name: 'Window' }).click()
  await page.mouse.move(w3.x, w3.y)
  await page.mouse.down()
  await page.mouse.up()
  await expect(editor.getByTestId('opening-W3')).toBeAttached()
  await editor.getByRole('button', { name: 'Select and move' }).click()
}

test('Projects: the yard store designed, approved, documented, issued and inspected on site', async ({
  page,
}) => {
  test.setTimeout(600_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startEngineering(page)
  await openApp(page, 'Projects')
  const app = page.getByTestId('projects-app')
  await expect(app.getByTestId('brief-yard-store')).toBeVisible()
  await expect(app.getByTestId('brief-mill-footbridge')).toContainText(/Offered to/)
  await app.getByTestId('start-yard-store').click()
  await expect(app.getByTestId('design-tab')).toBeVisible()
  // The concept fails its checks and its brief.
  const checks = app.getByTestId('design-checks')
  await expect(checks).toContainText('Roof beams (bending)')
  await expect(checks).toContainText('to put right')
  await expect(app.getByTestId('brief-requirements')).toContainText('✗')
  await page.screenshot({ path: `${shots}/engineering/projects-concept.png` })

  // Submitted as it is, it comes back with comments.
  await app.getByTestId('submit-design').click()
  await expect(app.getByText(/with the design office for checking/)).toBeVisible()
  await passMinutes(page, 31)
  await expect(app.getByTestId('review-comments')).toContainText('Roof beams')

  // Corrected in the plan editor and the specification: every check passes.
  await correctYardStore(page)
  await expect(checks).toContainText('Checks: all pass')
  await expect(app.getByTestId('brief-requirements')).not.toContainText('✗')
  await expect(app.getByTestId('revision-badge').first()).toContainText('Revision 2')
  await page.screenshot({ path: `${shots}/engineering/projects-plan-editor.png` })
  await app.getByTestId('submit-design').click()
  await passMinutes(page, 31)
  await expect(app.getByTestId('revision-badge').first()).toContainText('Approved')

  // Documents from the approved revision, in the office apps.
  await app.getByTestId('projects-tab-documents').click()
  for (const kind of ['drawings', 'quantities', 'calculations']) {
    await app.getByTestId(`make-${kind}`).click()
    await expect(app.getByTestId(`document-${kind}`)).toContainText(
      'Made from revision 2',
    )
  }
  await page.screenshot({ path: `${shots}/engineering/projects-documents.png` })

  // Issued for construction: the site starts.
  await app.getByTestId('projects-tab-site').click()
  await app.getByTestId('start-construction').click()
  await expect(app.getByTestId('site-tab')).toBeVisible()
  // The excavator's hose bursts during the dig: the site stops for a decision.
  await passMinutes(page, 40)
  const issue = app.getByTestId('site-issue')
  await expect(issue).toContainText('hydraulic hose')
  await issue.getByTestId('choice-contain-replace').click()
  await expect(app.getByTestId('decision-log')).toContainText('spill is contained')
  await passMinutes(page, 40)
  await expect(app.getByTestId('site-status')).toContainText('Formation inspection')

  // To the site in person: the trench, the crew, the plant.
  await app.getByTestId('go-to-site').click()
  const panel = page.getByTestId('site-panel')
  await expect(panel).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('site-canvas')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `${shots}/engineering/site-formation.png` })

  // Measure every item on site, then judge it against the approved design.
  const card = panel.getByTestId('inspection-formation')
  for (const item of ['depth-a', 'depth-b', 'width', 'ground']) {
    await card.getByTestId(`measure-${item}`).click()
    await expect(card.getByTestId(`reading-${item}`)).toBeVisible({ timeout: 90_000 })
  }
  // The north-east corner was dug 150 mm shallow.
  await expect(card.getByTestId('reading-depth-b')).toContainText(/6\d\d mm/)
  for (const item of ['depth-a', 'width', 'ground'])
    await card.getByTestId(`judge-${item}-ok`).click()
  await card.getByTestId('judge-depth-b-defect').click()
  await page.screenshot({ path: `${shots}/engineering/site-inspection.png` })
  await card.getByTestId('sign-formation').click()
  await expect(panel).toContainText(/being put right|Rework/)

  // Reloaded: still on site, with the project as it was.
  await page.reload()
  await expect(page.getByTestId('site-panel')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByTestId('site-panel')).toContainText('Yard store')
  await page.getByTestId('site-panel').getByTestId('site-leave').click()
  await expect(page.getByTestId('office-panel')).toBeVisible({ timeout: 60_000 })
})
