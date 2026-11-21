/**
 * Space Studio and the Architecture & Interior Design career, in the real app:
 * a building drawn in 2D to exact sizes, furnished, seen in 3D and walked
 * through (walls stop you, doorways let you through), kept after a reload,
 * exported; and a design task fixed, marked and reviewed by the team.
 */
import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { closeAllWindows, sitAtComputer } from './helpers.ts'

const shots = process.env.WORKSIM_SHOTS ?? 'docs/screenshots'

async function startArchitecture(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible({ timeout: 60_000 })
  await page.getByRole('radio', { name: /^Architecture & Interior Design/ }).check()
  await page.getByLabel('Your first name').fill('Robin')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible({ timeout: 60_000 })
}

async function openStudio(page: Page) {
  await sitAtComputer(page)
  await closeAllWindows(page)
  await page
    .getByRole('navigation', { name: 'Apps' })
    .getByRole('button', { name: /^Space Studio/ })
    .click()
  await expect(page.getByTestId('tool-home-studio')).toBeVisible()
}

/** A point on the plan (millimetres) on the screen. */
async function toScreen(page: Page, x: number, y: number) {
  return page.evaluate<{ x: number; y: number }>(`(() => {
    const svg = document.querySelector('[data-testid=studio-canvas]')
    const vb = svg.viewBox.baseVal
    const r = svg.getBoundingClientRect()
    return {
      x: r.left + ((${x} - vb.x) / vb.width) * r.width,
      y: r.top + ((${y} - vb.y) / vb.height) * r.height,
    }
  })()`)
}

async function clickPlan(page: Page, x: number, y: number) {
  const p = await toScreen(page, x, y)
  await page.mouse.move(p.x, p.y, { steps: 4 })
  await page.mouse.click(p.x, p.y)
}

const walker = (page: Page) =>
  page.evaluate<{ x: number; y: number; room: string | null }>('window.__studioWalker')

test('Space Studio: draw, size, furnish, see in 3D, walk through, and keep it after a reload', async ({
  page,
}) => {
  test.setTimeout(400_000)
  await page.setViewportSize({ width: 1600, height: 1000 })
  await startArchitecture(page)
  await openStudio(page)
  await page.getByTestId('new-project').click()
  await page.getByTestId('new-project-name').fill('Test house')
  await page.getByTestId('create-project').click()
  const studio = page.getByTestId('studio')
  await expect(studio).toBeVisible({ timeout: 30_000 })

  // A room, dragged: 4 × 3 m.
  await page.getByTestId('tool-room').click()
  const a = await toScreen(page, 1000, 1000)
  const b = await toScreen(page, 5000, 4000)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 10 })
  await page.mouse.up()
  await expect(studio.getByTestId('room-area')).toHaveText('12.00 m²')
  // Exact sizes, typed.
  await studio.getByTestId('room-width-input').fill('4200')
  await studio.getByTestId('room-width-input').press('Enter')
  await studio.getByTestId('room-depth-input').fill('3.6 m')
  await studio.getByTestId('room-depth-input').press('Enter')
  await expect(studio.getByTestId('room-area')).toHaveText('15.12 m²')
  await studio.getByTestId('room-name-input').fill('Studio flat')
  await studio.getByTestId('room-name-input').press('Enter')

  // A door in the north wall, a window in the south wall.
  await page.getByTestId('tool-door').click()
  await clickPlan(page, 3100, 1000)
  await expect(studio.locator('[data-testid=plan-drawing] [data-kind=door]')).toHaveCount(
    1,
  )
  await page.getByTestId('tool-window').click()
  await clickPlan(page, 3100, 4600)
  await expect(
    studio.locator('[data-testid=plan-drawing] [data-kind=window]'),
  ).toHaveCount(1)
  // A door where it cannot fit is refused, with the reason.
  await page.getByTestId('tool-door').click()
  await clickPlan(page, 1100, 1000)
  await expect(page.getByTestId('studio-toast')).toContainText(/past the end|overlaps/)
  await page.keyboard.press('Escape')

  // Furniture from the library, turned with the keyboard; undo and redo.
  await page.getByTestId('toggle-library').click()
  await page.getByTestId('library-search').fill('double bed')
  await page.getByTestId('library-item-bed-double').click()
  await clickPlan(page, 2200, 2600)
  await expect(studio.getByTestId('studio-canvas').getByTestId('plan-item')).toHaveCount(
    1,
  )
  for (let i = 0; i < 6; i++) await page.keyboard.press(']')
  await expect(studio.getByTestId('item-rotation-input')).toHaveValue('90')
  await page.keyboard.press('Control+z')
  await expect(studio.getByTestId('item-rotation-input')).toHaveValue('75')
  await page.keyboard.press('Control+Shift+z')
  await expect(studio.getByTestId('item-rotation-input')).toHaveValue('90')
  await page.screenshot({ path: `${shots}/space-studio/plan.png` })

  // The same building in 3D.
  await page.getByTestId('mode-model').click()
  await expect(page.getByTestId('studio-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
  await expect
    .poll(() =>
      page.evaluate<string>(`(() => {
        const kinds = new Set()
        window.__studioScene?.traverse((o) => {
          if (o.userData.ref) kinds.add(o.userData.ref.kind)
        })
        return [...kinds].sort().join(',')
      })()`),
    )
    .toBe('items,openings,rooms,walls')
  await page.getByTestId('light-evening').click()
  await expect(page.getByTestId('light-evening')).toHaveAttribute('aria-pressed', 'true')
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${shots}/space-studio/model.png` })

  // Walk through it: start in the room; walls stop you; the doorway lets you out.
  await page.getByTestId('mode-walk').click()
  await expect(page.getByTestId('walk-room')).toContainText('Studio flat', {
    timeout: 30_000,
  })
  const start = await walker(page)
  // Backwards into the south wall (its window is solid): stopped inside.
  await page.keyboard.down('s')
  await page.waitForTimeout(4000)
  await page.keyboard.up('s')
  const back = await walker(page)
  expect(back.y).toBeGreaterThan(start.y + 500)
  expect(back.y).toBeLessThanOrEqual(4600 - 75 - 250 + 2)
  await page.screenshot({ path: `${shots}/space-studio/walk.png` })
  // Forwards through the door in the north wall: outside.
  await page.keyboard.down('w')
  await expect.poll(async () => (await walker(page)).room, { timeout: 30_000 }).toBeNull()
  await page.keyboard.up('w')
  expect((await walker(page)).y).toBeLessThan(1000)
  await expect(page.getByTestId('walk-room')).toContainText('Outside the rooms')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('mode-model')).toHaveAttribute('aria-pressed', 'true')

  // Saved: after a reload the project opens as it was.
  await page.getByTestId('studio-save').click()
  await expect(page.getByTestId('studio-save')).toHaveText(/Saved/)
  await page.reload()
  await openStudio(page)
  const listed = page.getByTestId('project-list')
  await expect(listed).toContainText('Test house')
  await expect(listed).toContainText('1 room, 15.1 m²')
  await listed.getByTestId('open-project').first().click()
  await expect(page.getByTestId('studio-canvas').getByTestId('plan-item')).toHaveCount(1)
  await expect(page.getByTestId('studio').getByTestId('room-label')).toHaveText(
    'Studio flat',
  )
})

test('Space Studio: projects are duplicated, renamed, exported and deleted', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 1600, height: 1000 })
  await startArchitecture(page)
  await openStudio(page)
  await page.getByTestId('new-project').click()
  await page.getByTestId('new-project-name').fill('Show flat')
  await page.getByRole('radio', { name: /Two-bedroom flat/ }).check()
  await page.getByTestId('create-project').click()
  await expect(page.getByTestId('studio')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('studio-project-name')).toHaveText('Show flat')

  // Exports, made from the project itself.
  const download = async (kind: string) => {
    await page.getByTestId('studio-export').click()
    const [file] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId(`export-${kind}`).click(),
    ])
    return {
      name: file.suggestedFilename(),
      text: readFileSync((await file.path())!, 'utf8'),
    }
  }
  const json = await download('json')
  expect(json.name).toMatch(/\.studio\.json$/)
  expect(JSON.parse(json.text)).toMatchObject({
    format: 'gamhub-space-studio',
    project: { project: { name: 'Show flat' } },
  })
  const svg = await download('svg')
  expect(svg.text).toContain('<svg')
  expect(svg.text).toContain('Bedroom 1')
  const dxf = await download('dxf')
  expect(dxf.text).toContain('SS-WALL')
  expect(dxf.text).toContain('Living and kitchen')
  const report = await download('report')
  expect(report.text).toContain('Furniture and fittings')
  const pdf = await download('pdf')
  expect(pdf.text.startsWith('%PDF')).toBe(true)

  // Back to the list: duplicate, rename, delete (with confirmation).
  await page.getByRole('button', { name: 'Files' }).first().click()
  const list = page.getByTestId('project-list')
  await page.getByRole('button', { name: 'Duplicate' }).first().click()
  await expect(list).toContainText('Show flat (copy)')
  await list.getByRole('button', { name: 'Rename' }).first().click()
  await page.getByTestId('rename-input').fill('Show flat B')
  await page.getByTestId('rename-input').press('Enter')
  await expect(list).toContainText('Show flat B')
  const before = await list.getByTestId('open-project').count()
  await list.getByTestId('delete-project').first().click()
  await page.getByTestId('confirm-delete-project').click()
  await expect(list.getByTestId('open-project')).toHaveCount(before - 1)
})

test('Architecture: the supervisor’s corrections, fixed in Space Studio, marked 100% and reviewed', async ({
  page,
}) => {
  test.setTimeout(400_000)
  await page.setViewportSize({ width: 1600, height: 1000 })
  await startArchitecture(page)
  await sitAtComputer(page)
  await closeAllWindows(page)
  await page
    .getByRole('navigation', { name: 'Apps' })
    .getByRole('button', { name: /^Tasks/ })
    .click()
  await page.evaluate(`window.__worksim.skipTo('arch-corrections')`)
  await page
    .getByRole('button', { name: /Correct the flat B drawing/ })
    .first()
    .click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  const studio = page.getByTestId('studio')
  await expect(studio).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('panel-checks').click()
  await expect(page.getByTestId('checks-panel')).toContainText(
    'Bedroom 2 cannot be reached',
  )
  await page.screenshot({ path: `${shots}/space-studio/task-checks.png` })

  // 1. A door from the hall into bedroom 2.
  await page.getByTestId('tool-door').click()
  await clickPlan(page, 6400, 3600)
  // 2. A window in bedroom 2's outside wall.
  await page.getByTestId('tool-window').click()
  await clickPlan(page, 5500, 0)
  // 3. Tiles in the bathroom.
  await page.getByTestId('tool-select').click()
  await clickPlan(page, 8500, 3000)
  await expect(studio.getByTestId('room-name-input')).toHaveValue('Bathroom')
  await studio
    .getByTestId('room-floor-finish')
    .getByRole('radio', { name: /^White ceramic tiles/ })
    .click()
  await page.getByTestId('panel-checks').click()
  await expect(page.getByTestId('checks-panel')).not.toContainText('cannot be reached')
  await page.getByTestId('panel-reviews').click()
  await expect(page.getByTestId('review-interior')).toBeVisible()

  await page.getByRole('button', { name: /Submit to Marguerite/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByTestId('submission-results').getByTestId('score')).toHaveText(
    '100%',
    {
      timeout: 30_000,
    },
  )
  await page.screenshot({ path: `${shots}/space-studio/task-marked.png` })

  // The manager's reply quotes the team's review of the actual design.
  await page
    .getByTestId('submission-results')
    .getByRole('button', { name: /Back to Space Studio|Close/ })
    .first()
    .click()
  await closeAllWindows(page)
  await page
    .getByRole('navigation', { name: 'Apps' })
    .getByRole('button', { name: /^Mail/ })
    .click()
  await page
    .getByRole('button', { name: /Re: Flat B: corrections before issue \(100%\)/ })
    .first()
    .click()
  const message = page.getByTestId('mail-message')
  await expect(message).toContainText("The team's review of your design")
  await expect(message).toContainText('Marguerite Achebe (Architecture Lead)')
  await expect(message).toContainText('Sana Haddad (Interior Designer)')
})
