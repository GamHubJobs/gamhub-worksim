import { expect, test, type Page } from '@playwright/test'

/**
 * Each career's own workplace in the business district (content/city
 * WORKPLACES): in the morning, out of the front door, the character walks the
 * whole way (the street's own walking, round what is solid: no jump) up to its
 * own building's entrance, goes in, and the working day starts there; at the
 * end of it, out of that same door. The hospital for healthcare, Northbank for
 * engineering, Kestrel & Vane for law, Cobalt Ridge's tower for the rest.
 */
const CAREERS = [
  { radio: /^Healthcare/, door: [77, -19], employer: 'Riverside Community Hospital' },
  { radio: /^Engineering/, door: [66, 23.75], employer: 'Northbank Engineering' },
  { radio: /^Law/, door: [97, 6], employer: 'Kestrel & Vane' },
  { radio: /^IT Help Desk/, door: [78, 22], employer: 'Cobalt Ridge Consulting' },
  {
    radio: /^Office Administration/,
    door: [78, 22],
    employer: 'Cobalt Ridge Consulting',
  },
  { radio: /^Accounting/, door: [78, 22], employer: 'Cobalt Ridge Consulting' },
  { radio: /^Digital Marketing/, door: [78, 22], employer: 'Cobalt Ridge Consulting' },
  { radio: /^Data Analysis/, door: [78, 22], employer: 'Cobalt Ridge Consulting' },
  { radio: /^Software Development/, door: [78, 22], employer: 'Cobalt Ridge Consulting' },
] as const

const home = (page: Page) => page.getByTestId('home')
const city = (page: Page) => page.getByTestId('city')
const player = (page: Page) =>
  page.evaluate(
    () =>
      (
        globalThis as unknown as {
          __worksimPlayer?: { x: number; z: number; mode: string }
        }
      ).__worksimPlayer,
  )

async function morningInTheStreet(page: Page, radio: RegExp) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible({ timeout: 30_000 })
  await page.getByRole('radio', { name: radio }).check()
  await page.getByLabel('Your first name').fill('Ama')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })
  await page.evaluate(
    "window.__worksimSpeed = 12; sessionStorage.setItem('worksim.testSpeed', '12')",
  )
  // The first day over, home, to bed, and up the next morning.
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  await expect(home(page)).toContainText('Evening at home', { timeout: 30_000 })
  const rooms = home(page).getByRole('navigation', { name: 'Rooms' })
  await rooms.getByRole('button', { name: 'Bedroom' }).click()
  await home(page)
    .getByRole('button', { name: /Go to bed/ })
    .click()
  await expect(home(page)).toContainText('Morning at home', { timeout: 60_000 })
  await rooms.getByRole('button', { name: 'Bedroom' }).click()
  await home(page)
    .getByRole('button', { name: /Get dressed/ })
    .click()
  await rooms.getByRole('button', { name: 'Front door' }).click()
  await home(page)
    .getByRole('button', { name: /Go out into the neighbourhood/ })
    .click()
  await expect(city(page)).toContainText('Out in the neighbourhood')
  await expect(city(page).getByTestId('city-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
  await expect
    .poll(async () => (await player(page))?.mode, { timeout: 60_000 })
    .toBe('free')
}

for (const career of CAREERS) {
  test(`${career.radio.source.slice(1)} → ${career.employer}: walked to, in at its own door, a working day there, and out again`, async ({
    page,
  }) => {
    test.setTimeout(420_000)
    await page.setViewportSize({ width: 1280, height: 760 })
    await morningInTheStreet(page, career.radio)
    await page.waitForFunction('typeof window.__worksimStreetWalk === "function"')
    const mark = ((await page.evaluate(
      '(window.__worksimPlayer && window.__worksimPlayer.trail || []).length',
    )) ?? 0) as number
    // At normal speed (tests otherwise speed walking up: steps too long to judge).
    await page.evaluate(
      "window.__worksimSpeed = 1; sessionStorage.setItem('worksim.testSpeed', '1')",
    )
    await page.evaluate("window.__worksimStreetWalk('door-office')")
    // Walked all the way (a long walk), into its own building, and the day starts there.
    await expect(page.getByTestId('office')).toBeVisible({ timeout: 300_000 })
    await expect(page.locator('header')).toContainText(career.employer.split(' ')[0])
    // The path it walked came up to this workplace's door, from the street.
    const trail = (await page.evaluate(
      '(window.__worksimPlayer && window.__worksimPlayer.trail || [])',
    )) as Array<{ x: number; z: number }>
    // (Up to the door: after it, the positions are the workplace's own, inside.)
    const after = trail.slice(mark)
    const gaps = after.map((p) => Math.hypot(p.x - career.door[0], p.z - career.door[1]))
    const nearest = Math.min(...gaps)
    const walked = after.slice(0, gaps.indexOf(nearest) + 1)
    expect(nearest, 'reached its own door').toBeLessThan(2.5)
    // No jump on the way: every step short (at most one frame of walking: a frame
    // counts for up to a second, PlayerRig, so a stalled computer moves ~3.3 m in
    // one; a teleport to a workplace would be tens of metres).
    for (let i = 1; i < walked.length; i++)
      expect(
        Math.hypot(walked[i].x - walked[i - 1].x, walked[i].z - walked[i - 1].z),
        `a step, not a jump: ${JSON.stringify(walked.slice(Math.max(0, i - 3), i + 3))}`,
      ).toBeLessThan(4)

    // The end of the day: home time, out through this workplace's own door.
    await page.evaluate(`window.__worksim.setTime(2, 17 * 60 + 35)`)
    await page
      .getByTestId('office-panel')
      .getByRole('button', { name: 'Go home' })
      .click()
    await page
      .getByTestId('day-end')
      .getByRole('button', { name: /Go home|Walk home|Head home/ })
      .first()
      .click()
    await expect(home(page).or(city(page))).toBeVisible({ timeout: 60_000 })
  })
}

test('with the keys, up to each workplace door: nothing in the way', async ({ page }) => {
  test.setTimeout(420_000)
  await page.setViewportSize({ width: 1280, height: 760 })
  await morningInTheStreet(page, /^Healthcare/)
  const street = city(page).getByTestId('city-3d')
  await page.evaluate(
    "window.__worksimSpeed = 1; sessionStorage.setItem('worksim.testSpeed', '1')",
  )
  // A few steps out from each entrance, facing it; W walks up to it.
  for (const [name, x, z, heading, key] of [
    ['the hospital', 73, -19, -Math.PI / 2, 'x'],
    ['Northbank', 66, 19.5, Math.PI, 'z'],
    ['Cobalt Ridge', 74, 22, -Math.PI / 2, 'x'],
    ['Kestrel & Vane', 93, 6, -Math.PI / 2, 'x'],
  ] as const) {
    await page.evaluate(
      `window.__worksimPlace(${x}, ${z}, ${heading}, { yaw: ${heading} })`,
    )
    await page.waitForTimeout(800)
    await street.focus()
    const from = await player(page)
    await page.keyboard.down('KeyW')
    await page.waitForTimeout(2500)
    await page.keyboard.up('KeyW')
    const to = await player(page)
    const moved = key === 'x' ? to!.x - from!.x : to!.z - from!.z
    expect(moved, `walked up to ${name}`).toBeGreaterThan(2)
  }
})
