import { expect, test, type Page } from '@playwright/test'
import { sitAtComputer } from './helpers.ts'

/**
 * Global guidance: window controls on every app window, the always-there
 * next step (state-aware, collapsible, remembered), the guided tours (the
 * introduction on a first visit, app tours from a window's title bar, paused
 * and resumed from Help), and the help centre.
 */
const shots = process.env.WORKSIM_SHOTS ?? 'test-results/guidance'

async function newPlayer(page: Page, path = '/') {
  await page.goto(path)
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: /IT Help Desk/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible()
}

test('window controls: minimise to the taskbar, maximise and restore, close', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1366, height: 600 })
  await newPlayer(page)
  await sitAtComputer(page)
  const apps = page.getByRole('navigation', { name: 'Apps' })
  await apps.getByRole('button', { name: /^Tasks/ }).click()
  const win = page.getByTestId('window-tasks')
  await expect(win).toBeVisible()
  const bar = win.getByTestId('window-title-bar')
  // The title bar and its controls are on screen, whatever the window holds.
  await expect(bar.getByRole('button', { name: 'Minimise Tasks' })).toBeInViewport()
  await bar.getByRole('button', { name: 'Minimise Tasks' }).click()
  await expect(win).toBeHidden()
  await apps.getByRole('button', { name: /^Tasks/ }).click()
  await expect(win).toBeVisible()
  // A short screen opens windows maximised (as on a laptop): restore it first.
  const restore = bar.getByRole('button', { name: 'Restore Tasks' })
  if (await restore.isVisible()) await restore.click()
  const before = (await win.boundingBox())!
  await bar.getByRole('button', { name: 'Maximise Tasks' }).click()
  await expect(bar.getByRole('button', { name: 'Restore Tasks' })).toBeVisible()
  await bar.getByRole('button', { name: 'Restore Tasks' }).click()
  const after = (await win.boundingBox())!
  expect(
    Math.abs(after.width - before.width) + Math.abs(after.height - before.height),
  ).toBeLessThan(2)
  await bar.getByRole('button', { name: 'Close Tasks' }).click()
  await expect(win).toHaveCount(0)
  // The taskbar is still on screen (nothing scrolled the desktop away).
  await expect(apps).toBeInViewport()
})

test('the next step follows the state, collapses, and stays collapsed', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await newPlayer(page)
  const bar = page.getByTestId('guide-bar')
  await expect(bar).toBeVisible()
  await expect(page.getByTestId('next-step')).not.toBeEmpty()
  await page.screenshot({ path: `${shots}/next-step-office.png` })
  await sitAtComputer(page)
  // At the computer, with mail unread: Mail.
  await expect(page.getByTestId('next-step')).toContainText(/Open Mail|Open Tasks/)
  await page.getByRole('button', { name: 'Collapse the next step' }).click()
  await expect(bar).toHaveAttribute('data-collapsed', 'true')
  // The choice is saved with the player.
  await page.waitForTimeout(1500)
  await page.reload()
  await expect(page.getByTestId('guide-bar')).toHaveAttribute('data-collapsed', 'true')
  await page.getByRole('button', { name: 'Show the next step' }).click()
  await expect(page.getByTestId('guide-bar')).toHaveAttribute('data-collapsed', 'false')
})

test('the guided tour: on a first visit, paused, resumed from Help, and an app tour from its title bar', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  // ?tour shows the first-visit tour in an automated browser too.
  await newPlayer(page, '/?tour')
  const tour = page.getByTestId('tour')
  await expect(tour).toBeVisible({ timeout: 60_000 })
  await expect(page.getByTestId('tour-card')).toContainText('Your workplace')
  await page.getByTestId('tour-card').getByRole('button', { name: 'Next' }).click()
  await expect(page.getByTestId('tour-card')).toContainText('Moving about')
  // The real part is highlighted.
  await expect(page.getByTestId('tour-spotlight')).toBeVisible()
  await page.screenshot({ path: `${shots}/tour-moving.png` })
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('tour-card')).toContainText('Two ways to see the office')
  await page.getByTestId('tour-card').getByRole('button', { name: 'Back' }).click()
  await expect(page.getByTestId('tour-card')).toContainText('Moving about')
  await page.getByTestId('tour-card').getByRole('button', { name: 'Pause' }).click()
  await expect(tour).toHaveCount(0)

  // Resume from Help, where every tour is listed.
  await sitAtComputer(page)
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.getByRole('button', { name: 'Guided tours' }).click()
  const list = page.getByTestId('tour-list')
  await expect(list).toContainText('paused at step 2')
  await expect(list).toContainText('Help Desk')
  await expect(list).toContainText('Directory')
  await page.screenshot({ path: `${shots}/help-tours.png` })
  await list.getByRole('button', { name: 'Resume' }).click()
  await expect(page.getByTestId('tour-card')).toContainText('Moving about', {
    timeout: 60_000,
  })
  // Through to the computer steps: the tour opens Mail to show the window controls.
  for (let i = 0; i < 6; i++)
    await page.getByTestId('tour-card').getByRole('button', { name: 'Next' }).click()
  await expect(page.getByTestId('tour-card')).toContainText('Windows', {
    timeout: 60_000,
  })
  await expect(page.getByTestId('window-mail')).toBeVisible()
  await page.screenshot({ path: `${shots}/tour-windows.png` })
  await page.getByTestId('tour-card').getByRole('button', { name: 'Skip tour' }).click()
  await expect(tour).toHaveCount(0)

  // An app's own tour, from its title bar.
  await page
    .getByRole('navigation', { name: 'Apps' })
    .getByRole('button', { name: /^Tasks/ })
    .click()
  await page
    .getByTestId('window-tasks')
    .getByRole('button', { name: 'Guided tour of Tasks' })
    .click()
  await expect(page.getByTestId('tour-card')).toContainText('Tasks · step 1 of 2')
  await page.getByTestId('tour-card').getByRole('button', { name: 'Next' }).click()
  await page.getByTestId('tour-card').getByRole('button', { name: 'Finish' }).click()
  await expect(tour).toHaveCount(0)

  // Help: searchable, with the shortcuts; the finished tour can be taken again.
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.getByRole('button', { name: 'Handbook and help' }).click()
  const help = page.getByTestId('help-panel')
  await help.getByLabel('Search help').fill('backup')
  await expect(help.getByRole('navigation', { name: 'Help topics' })).not.toBeEmpty()
  await help.getByRole('tab', { name: 'Keyboard shortcuts' }).click()
  await help.getByLabel('Search help').fill('')
  await expect(help.getByTestId('shortcuts')).toContainText('Walk forward')
  await help.getByRole('tab', { name: 'Guided tours' }).click()
  await expect(help.getByRole('button', { name: 'Take again: Tasks' })).toBeVisible()
})
