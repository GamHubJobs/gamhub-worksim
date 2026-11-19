import { expect, test, type Page } from '@playwright/test'

/**
 * The game's opening (launch/): a fresh install (the whole opening, then the
 * first-day screen), a returning player (a short opening, the real steps of
 * loading, then their own place, drawn), skipping it (and not again), the
 * setting, reduced motion and computers without a graphics card (no flight),
 * and the save kept through every launch. Automated tests normally start
 * without the opening; these ask for it.
 */
const launch = (page: Page) => page.getByTestId('launch')

async function withOpening(page: Page, flight = false) {
  await page.addInitScript((fly) => {
    localStorage.setItem('worksim.opening.test', fly ? 'fly' : 'on')
  }, flight)
}

/** Follows the opening's stages until it is gone, and returns them in order. */
async function stagesUntilGone(page: Page, ms = 90_000) {
  const seen: string[] = []
  const end = Date.now() + ms
  while (Date.now() < end) {
    const stage = await launch(page)
      .getAttribute('data-stage', { timeout: 500 })
      .catch(() => null)
    if (stage === null && (await launch(page).count()) === 0) break
    if (stage && seen.at(-1) !== stage) seen.push(stage)
    await page.waitForTimeout(100)
  }
  return seen
}

async function startFirstDay(page: Page, name: string) {
  await expect(page.getByTestId('onboarding')).toBeVisible({ timeout: 30_000 })
  await page.getByLabel('Your first name').fill(name)
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible({ timeout: 30_000 })
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 760 })
})

test('a fresh install: the whole opening with its flight, then the first-day screen', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await withOpening(page, true)
  await page.goto('/')
  await expect(launch(page)).toBeVisible()
  await expect(launch(page)).toHaveAttribute('data-plan', 'full')
  await expect(launch(page)).toContainText('GamHub')
  const stages = await stagesUntilGone(page)
  // The logo, then the flight over the city, then the fade into the game.
  expect(stages[0]).toBe('logo')
  expect(stages).toContain('fly')
  // (The fade lasts under a second: it may come and go between two looks.)
  expect(['fly', 'reveal']).toContain(stages.at(-1))
  // The first-day screen, ready to use.
  await startFirstDay(page, 'Ama')
  await expect(page.getByTestId('player-chip').first()).toContainText('Ama')
})

test('a returning player: a short opening, the real loading steps, then their own place, drawn', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await withOpening(page)
  await page.goto('/')
  await stagesUntilGone(page)
  await startFirstDay(page, 'Kofi')
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
  // Back the next day (a refresh): a short opening.
  await page.waitForTimeout(1500)
  await page.reload()
  await expect(launch(page)).toBeVisible()
  await expect(launch(page)).toHaveAttribute('data-plan', 'short')
  // The loading steps are the real ones, ticked as each happens.
  const stages = await stagesUntilGone(page)
  expect(stages[0]).toBe('logo')
  // No flight without a graphics card: logo, loading if need be, then in.
  expect(stages).not.toContain('fly')
  // Revealed only with the office drawn: no curtain left, and walking works at once.
  const office = page.getByTestId('office-3d')
  await expect(office.locator('canvas')).toBeVisible()
  await expect(
    office.getByTestId('scene-curtain').or(office.getByTestId('doorway-still')),
  ).toHaveCount(0, {
    timeout: 20_000,
  })
  await expect(page.getByTestId('player-chip').first()).toContainText('Kofi')
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (globalThis as unknown as { __worksimPlayer?: { mode: string } })
              .__worksimPlayer?.mode,
        ),
      { timeout: 60_000 },
    )
    .toBe('free')
})

test('skipped at once, and not shown again when asked; the save is kept throughout', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await withOpening(page)
  await page.goto('/')
  await expect(launch(page)).toBeVisible()
  // Skip straight away (with the keyboard): into the game as soon as it is ready.
  await page.keyboard.press('Escape')
  await expect(launch(page)).toHaveCount(0, { timeout: 30_000 })
  await startFirstDay(page, 'Efua')
  // Next time: skipped too, and "skip next time" chosen.
  await page.waitForTimeout(1500)
  await page.reload()
  await expect(launch(page)).toBeVisible()
  await launch(page).getByLabel('Skip the opening next time').check()
  await launch(page).getByTestId('launch-skip').click()
  await expect(launch(page)).toHaveCount(0, { timeout: 60_000 })
  // After that: no logo, no flight, straight in (a loading screen only while loading).
  await page.waitForTimeout(1500)
  await page.reload()
  const plan = await launch(page)
    .getAttribute('data-plan', { timeout: 5000 })
    .catch(() => 'gone')
  expect(['none', 'gone']).toContain(plan)
  await expect(launch(page)).toHaveCount(0, { timeout: 60_000 })
  await expect(page.getByTestId('player-chip').first()).toContainText('Efua')
  // And it can be turned back on in Sound & graphics.
  await page.getByRole('button', { name: 'Sound & graphics' }).click()
  const opening = page.getByTestId('opening')
  await expect(opening.getByRole('radio', { name: /^Off/ })).toBeChecked()
  await opening.getByRole('radio', { name: /^Full/ }).check()
  await page.waitForTimeout(500)
  await page.reload()
  await expect(launch(page)).toHaveAttribute('data-plan', 'full')
  await expect(page.getByTestId('player-chip').first()).toContainText('Efua', {
    timeout: 60_000,
  })
})

test('with reduced motion: no flight; the opening still ends in the game', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await withOpening(page, false)
  await page.goto('/')
  const stages = await stagesUntilGone(page)
  expect(stages).not.toContain('fly')
  await startFirstDay(page, 'Yaw')
})
