import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// Sound: made in the browser with Web Audio. These checks use the development
// hook (window.__worksimAudio) to see what is playing and measure the output.

const stats = (page: Page) =>
  page.evaluate(() => {
    const a = (globalThis as unknown as { __worksimAudio: { stats: unknown } })
      .__worksimAudio
    return JSON.parse(JSON.stringify(a.stats)) as {
      engine: string
      scene: string
      played: Record<string, number>
    }
  })

const loudest = (page: Page, ms: number) =>
  page.evaluate(async (wait) => {
    const a = (globalThis as unknown as { __worksimAudio: { meter(): number } })
      .__worksimAudio
    let peak = 0
    const end = performance.now() + wait
    while (performance.now() < end) {
      peak = Math.max(peak, a.meter())
      await new Promise((r) => setTimeout(r, 20))
    }
    return peak
  }, ms)

const play = (page: Page, id: string) =>
  page.evaluate(
    (which) =>
      (
        globalThis as unknown as { __worksimAudio: { play(id: string): boolean } }
      ).__worksimAudio.play(which),
    id,
  )

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
})

test('sound follows the player, and the settings are kept', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('synchronously unmount'))
      errors.push(m.text())
  })
  // The player has clicked, so sound has started, in the office.
  await page.getByTestId('office').click({ position: { x: 5, y: 5 } })
  await expect.poll(async () => (await stats(page)).engine).toBe('ready')
  await expect.poll(async () => (await stats(page)).scene).toMatch(/^reception:/)

  // Real sound comes out: an email chime.
  expect(await play(page, 'mail')).toBe(true)
  expect(await loudest(page, 600)).toBeGreaterThan(0.001)

  // The settings: master volume and captions, kept after a reload.
  await page.getByRole('button', { name: 'Sound & graphics' }).click()
  const panel = page.getByTestId('sound-panel')
  await panel.getByLabel('Master volume').fill('50')
  await panel.getByLabel('Sound captions').check()
  await expect(panel.getByText('50%').first()).toBeVisible()
  await panel.getByRole('button', { name: 'Close', exact: true }).click()
  await play(page, 'pay')
  await expect(page.getByTestId('sound-captions')).toContainText('Pay received')
  await page.reload()
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Sound & graphics' }).click()
  await expect(panel.getByLabel('Master volume')).toHaveValue('50')
  await expect(panel.getByLabel('Sound captions')).toBeChecked()

  // Mute all: silence (the surroundings fade out too).
  await panel.getByLabel('Mute all sound').check()
  await expect(panel.getByLabel('Master volume')).toBeDisabled()
  await panel.getByRole('button', { name: 'Close', exact: true }).click()
  await page.waitForTimeout(1500)
  expect(await loudest(page, 400)).toBeLessThan(0.0005)
  expect(errors).toEqual([])
})

test('home, the street and the café each sound different, with footsteps', async ({
  page,
}) => {
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  const home = page.getByTestId('home')
  await expect(home).toContainText('Evening at home', { timeout: 15_000 })
  await expect.poll(async () => (await stats(page)).scene).toMatch(/^home:(day|evening):/)

  // Out of the front door: the residential end of the street, with a door.
  const before = (await stats(page)).played.door ?? 0
  await home
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  expect((await stats(page)).played.step ?? 0).toBeGreaterThan(0)
  await home.getByRole('button', { name: /Go out into the neighbourhood/ }).click()
  await expect(page.getByTestId('city')).toBeVisible()
  await expect.poll(async () => (await stats(page)).scene).toMatch(/^residential:/)
  await expect
    .poll(async () => (await stats(page)).played.door ?? 0)
    .toBeGreaterThan(before)
  expect(await loudest(page, 1500)).toBeGreaterThan(0.0005)

  // Walking in 3D: footsteps in time with the walk.
  const street = page.getByTestId('city-3d')
  await street.focus()
  const steps = (await stats(page)).played.step ?? 0
  await expect(street.locator('canvas')).toBeVisible({ timeout: 30_000 })
  await page.keyboard.down('ArrowUp')
  await page.waitForTimeout(3000)
  await page.keyboard.up('ArrowUp')
  // About two steps a second (allowing for a busy computer starting slowly).
  const walked = ((await stats(page)).played.step ?? 0) - steps
  expect(walked).toBeGreaterThanOrEqual(2)
  expect(walked).toBeLessThanOrEqual(9)

  // Into the café: its own sound.
  await page.getByTestId('place-cafe').click()
  await expect.poll(async () => (await stats(page)).scene).toMatch(/^cafe:/)
})
