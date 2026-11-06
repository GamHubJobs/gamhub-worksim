import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// The weather and the controls: rain on a rainy day (seen and heard outdoors,
// off when always dry), and changing a key in the settings.

const scene = (page: Page) =>
  page.evaluate(
    () =>
      (globalThis as unknown as { __worksimAudio: { stats: { scene: string } } })
        .__worksimAudio.stats.scene,
  )

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
})

test('it rains on a rainy day outdoors, and not when always dry', async ({ page }) => {
  // Day 2 is one of the rainy days.
  await page.evaluate(`window.__worksim.setTime(2, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  const home = page.getByTestId('home')
  await expect(home).toContainText('Evening at home', { timeout: 15_000 })
  await expect.poll(() => scene(page), { timeout: 15_000 }).toMatch(/^home:.*:rain$/)
  await home
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await home.getByRole('button', { name: /Go out into the neighbourhood/ }).click()
  await expect(page.getByTestId('city-3d').locator('canvas')).toBeVisible({
    timeout: 30_000,
  })
  await expect
    .poll(() => scene(page), { timeout: 15_000 })
    .toMatch(/^residential:.*:rain$/)

  await page.getByRole('button', { name: 'Sound & graphics' }).click()
  await page
    .getByTestId('weather')
    .getByLabel(/Always dry/)
    .check()
  await page
    .getByTestId('sound-panel')
    .getByRole('button', { name: 'Close', exact: true })
    .click()
  await expect
    .poll(() => scene(page), { timeout: 15_000 })
    .toMatch(/^residential:[a-z]+:$/)
})

test('a key can be changed, and the keys reset', async ({ page }) => {
  await page.getByRole('button', { name: 'Sound & graphics' }).click()
  const controls = page.getByTestId('controls')
  const jump = controls.getByRole('button', { name: /^Jump: Space/ })
  await jump.click()
  await expect(controls.getByText('Press a key…')).toBeVisible()
  await page.keyboard.press('KeyJ')
  await expect(controls.getByRole('button', { name: /^Jump: J\. Change/ })).toBeVisible()
  await controls.getByRole('button', { name: 'Reset the keys' }).click()
  await expect(controls.getByRole('button', { name: /^Jump: Space/ })).toBeVisible()
})
