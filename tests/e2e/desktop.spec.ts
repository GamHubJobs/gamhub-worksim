import { expect, test, type Page } from '@playwright/test'
import { closeAllWindows, sitAtComputer, startCareerIfNeeded } from './helpers.ts'

// The work computer as a Windows-style desktop: windows, taskbar, Start,
// desktop icons and the right-click menu.

const taskbar = (page: Page) => page.getByRole('navigation', { name: 'Apps' })
const win = (page: Page, key: string) => page.getByTestId(`window-${key}`)

async function box(page: Page, key: string) {
  const b = await win(page, key).boundingBox()
  if (!b) throw new Error(`window ${key} is not showing`)
  return b
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Muhammed Baba Suno')
  await sitAtComputer(page)
})

test('using your computer shows a desktop, with Mail open in a window', async ({
  page,
}) => {
  await expect(page.getByTestId('desktop-surface')).toBeVisible()
  await expect(page.getByTestId('taskbar')).toBeVisible()
  await expect(win(page, 'mail')).toBeVisible()
  await expect(win(page, 'mail')).toHaveAttribute('data-active', 'true')
  await expect(page.getByTestId('taskbar')).toContainText('Muhammed Baba Suno')
  await expect(page.getByRole('option', { name: 'Recycle Bin' })).toBeVisible()
})

test('several apps open at once, and the taskbar switches between them', async ({
  page,
}) => {
  await taskbar(page)
    .getByRole('button', { name: /^Tasks/ })
    .click()
  await taskbar(page)
    .getByRole('button', { name: /^Sheets/ })
    .click()
  await expect(win(page, 'mail')).toBeVisible()
  await expect(win(page, 'tasks')).toBeVisible()
  await expect(win(page, 'sheets')).toHaveAttribute('data-active', 'true')

  // Clicking a window brings it to the front.
  await win(page, 'tasks')
    .getByTestId('window-title-bar')
    .click({ position: { x: 200, y: 10 } })
  await expect(win(page, 'tasks')).toHaveAttribute('data-active', 'true')
  await expect(win(page, 'sheets')).toHaveAttribute('data-active', 'false')

  // The taskbar button of the window in front minimises it; the next click restores it.
  const tasksButton = taskbar(page).getByRole('button', { name: /^Tasks/ })
  await expect(tasksButton).toHaveAttribute('aria-current', 'page')
  await tasksButton.click()
  await expect(win(page, 'tasks')).toBeHidden()
  await tasksButton.click()
  await expect(win(page, 'tasks')).toBeVisible()
  await expect(win(page, 'tasks')).toHaveAttribute('data-active', 'true')

  // Show desktop minimises everything.
  await page.getByRole('button', { name: 'Show desktop' }).click()
  await expect(page.locator('[data-window]:visible')).toHaveCount(0)
  await taskbar(page).getByRole('button', { name: /^Mail/ }).click()
  await expect(win(page, 'mail')).toBeVisible()
})

test('windows minimise, maximise, restore, move, resize and close', async ({ page }) => {
  const mail = win(page, 'mail')
  await mail.getByRole('button', { name: 'Maximise Mail' }).click()
  const surface = await page.getByTestId('desktop-surface').boundingBox()
  expect((await box(page, 'mail')).width).toBeCloseTo(surface!.width, 0)
  await mail.getByRole('button', { name: 'Restore Mail' }).click()
  const before = await box(page, 'mail')
  expect(before.width).toBeLessThan(surface!.width)

  // Double-clicking the title bar maximises too.
  await mail.getByTestId('window-title-bar').dblclick({ position: { x: 300, y: 12 } })
  await expect(mail.getByRole('button', { name: 'Restore Mail' })).toBeVisible()
  await mail.getByTestId('window-title-bar').dblclick({ position: { x: 300, y: 12 } })

  // Drag by the title bar.
  await page.mouse.move(before.x + 300, before.y + 12)
  await page.mouse.down()
  await page.mouse.move(before.x + 360, before.y + 32, { steps: 5 })
  await page.mouse.up()
  const moved = await box(page, 'mail')
  expect(moved.x).toBeCloseTo(before.x + 60, -1)
  expect(moved.y).toBeCloseTo(before.y + 20, -1)

  // Resize from the bottom-right corner.
  await page.mouse.move(moved.x + moved.width - 3, moved.y + moved.height - 3)
  await page.mouse.down()
  await page.mouse.move(moved.x + moved.width - 203, moved.y + moved.height - 103, {
    steps: 5,
  })
  await page.mouse.up()
  const resized = await box(page, 'mail')
  expect(resized.width).toBeCloseTo(moved.width - 200, -1)
  expect(resized.height).toBeCloseTo(moved.height - 100, -1)

  // The layout is remembered after a reload.
  await page.reload()
  await expect(mail).toBeVisible({ timeout: 30_000 })
  const reloaded = await box(page, 'mail')
  expect(reloaded.x).toBeCloseTo(resized.x, 0)
  expect(reloaded.width).toBeCloseTo(resized.width, 0)

  await mail.getByRole('button', { name: 'Minimise Mail' }).click()
  await expect(mail).toBeHidden()
  await taskbar(page).getByRole('button', { name: /^Mail/ }).click()
  await mail.getByRole('button', { name: 'Close Mail' }).click()
  await expect(page.locator('[data-window]')).toHaveCount(0)
  // Closed apps are still on the taskbar, ready to open again.
  await taskbar(page).getByRole('button', { name: /^Mail/ }).click()
  await expect(mail).toBeVisible()
})

test('desktop icons open apps with a double-click and can be moved', async ({ page }) => {
  await closeAllWindows(page)
  const tasksIcon = page.getByRole('option', { name: 'Tasks' })
  await tasksIcon.dblclick()
  await expect(win(page, 'tasks')).toBeVisible()
  await closeAllWindows(page)

  // Keyboard: Enter opens the selected icon.
  await page.getByRole('option', { name: 'Sheets' }).focus()
  await page.keyboard.press('Enter')
  await expect(win(page, 'sheets')).toBeVisible()
  await closeAllWindows(page)

  // Drag the Tasks icon to the middle of the desktop.
  const from = (await tasksIcon.boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + 20)
  await page.mouse.down()
  await page.mouse.move(600, 300, { steps: 8 })
  await page.mouse.up()
  const to = (await tasksIcon.boundingBox())!
  expect(to.x).toBeGreaterThan(400)
  await page.reload()
  await expect(tasksIcon).toBeVisible({ timeout: 30_000 })
  expect((await tasksIcon.boundingBox())!.x).toBeCloseTo(to.x, 0)

  // Recycle Bin opens a window of its own.
  await page.getByRole('option', { name: 'Recycle Bin' }).dblclick()
  await expect(win(page, 'system:recycle-bin')).toContainText('This folder is empty')
})

test('the right-click menu changes icon size, creates files and opens settings', async ({
  page,
}) => {
  await closeAllWindows(page)
  const surface = page.getByTestId('desktop-surface')
  const menu = page.getByRole('menu', { name: 'Desktop menu' })

  await surface.click({ button: 'right', position: { x: 600, y: 300 } })
  await menu.getByRole('menuitem', { name: 'View' }).click()
  await page.getByRole('menuitemradio', { name: 'Large icons' }).click()
  await expect(menu).toBeHidden()
  const icon = (await page.getByRole('option', { name: 'Mail' }).boundingBox())!
  expect(icon.width).toBeGreaterThan(95)

  await surface.click({ button: 'right', position: { x: 600, y: 300 } })
  await menu.getByRole('menuitem', { name: 'New' }).click()
  await page.getByRole('menuitem', { name: 'Document' }).click()
  await expect(win(page, 'docs')).toBeVisible()
  await expect(win(page, 'docs').getByTestId('doc-editor')).toBeVisible({
    timeout: 30_000,
  })
  await closeAllWindows(page)

  await surface.click({ button: 'right', position: { x: 600, y: 300 } })
  await menu.getByRole('menuitem', { name: 'Personalize' }).click()
  const settings = win(page, 'system:settings')
  await expect(settings).toBeVisible()
  await settings.getByRole('radio', { name: 'Harbour blue' }).click()
  await expect(settings.getByRole('radio', { name: 'Harbour blue' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await settings.getByRole('radio', { name: 'Small' }).check()
  expect(
    (await page.getByRole('option', { name: 'Mail' }).boundingBox())!.width,
  ).toBeLessThan(80)
  // Right-clicking inside a window does not open the desktop menu.
  await settings.click({ button: 'right', position: { x: 100, y: 120 } })
  await expect(menu).toBeHidden()
})

test('Start and search open apps', async ({ page }) => {
  await closeAllWindows(page)
  await page.getByRole('button', { name: 'Start' }).click()
  const start = page.getByRole('dialog', { name: 'Start' })
  await expect(start).toContainText('Cobalt Ridge Consulting')
  await start
    .getByRole('list', { name: 'All apps' })
    .getByRole('button', { name: 'Docs' })
    .click()
  await expect(start).toBeHidden()
  await expect(win(page, 'docs')).toBeVisible()

  await page.getByPlaceholder('Type here to search').fill('sli')
  await page
    .getByRole('listbox', { name: 'Search results' })
    .getByRole('option', { name: /Slides/ })
    .click()
  await expect(win(page, 'slides')).toBeVisible()

  await page.getByPlaceholder('Type here to search').fill('task')
  await page.keyboard.press('Enter')
  await expect(win(page, 'tasks')).toHaveAttribute('data-active', 'true')
})

test('leaving the desk keeps the windows for when you come back', async ({ page }) => {
  await taskbar(page)
    .getByRole('button', { name: /^Tasks/ })
    .click()
  await taskbar(page).getByRole('button', { name: 'Leave desk' }).click()
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
  await page
    .getByTestId('office-panel')
    .getByRole('button', { name: /Use your computer/ })
    .click()
  await expect(win(page, 'tasks')).toBeVisible()
  await expect(win(page, 'mail')).toBeVisible()
})
