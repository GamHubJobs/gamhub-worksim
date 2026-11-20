import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

/**
 * Conversations float over the 3D world on their own (world/FloatingConversation.tsx),
 * not in a place's drawer: they open by themselves, stay when the drawer is
 * folded away or the phone or the map is opened and closed, can be minimised
 * and brought back, keep the conversation so far, and end with Goodbye. The
 * office's float on their own too.
 */
const home = (page: Page) => page.getByTestId('home')
const city = (page: Page) => page.getByTestId('city')
const encounter = (page: Page) => page.getByTestId('encounter')

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
})

test('in the street: a floating conversation, apart from the drawer, minimised and back, with its history', async ({
  page,
}) => {
  test.setTimeout(300_000)
  // Tuesday evening: Aisha, the neighbour, is outside with her shopping.
  await page.evaluate('window.__worksim.setTime(2, 17 * 60 + 35)')
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  await expect(home(page)).toContainText('Evening at home', { timeout: 30_000 })
  await home(page)
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await home(page)
    .getByRole('button', { name: /Go out into the neighbourhood/ })
    .click()
  await expect(city(page).getByTestId('city-3d').locator('canvas')).toBeVisible({
    timeout: 90_000,
  })
  await page.waitForFunction('typeof window.__worksimStreetWalk === "function"')
  await page.evaluate("window.__worksimStreetWalk('person:friend:aisha')")
  // It opens by itself, in the floating layer, not in the drawer.
  await expect(encounter(page)).toContainText('Aisha', { timeout: 90_000 })
  const layer = page.getByTestId('conversation-layer')
  await expect(layer.getByTestId('encounter')).toBeVisible()
  await expect(page.getByTestId('drawer').getByTestId('encounter')).toHaveCount(0)
  // Who, and how the player stands with them.
  await expect(encounter(page)).toContainText(
    /First time you have met|Friendly|Gets on well|wary|Cool/,
  )
  // Clear of the HUD at the bottom right (the minimap, the needs, the buttons).
  const box = (await encounter(page).boundingBox())!
  const hud = await page.getByTestId('hud').boundingBox()
  if (hud) expect(box.x + box.width).toBeLessThanOrEqual(hud.x + 1)

  // The drawer folded away: the conversation stays, beside where it was.
  await page.getByTestId('drawer').getByRole('button', { name: /Hide/ }).click()
  await expect(page.getByTestId('drawer')).toBeHidden()
  await expect(encounter(page)).toBeVisible()
  await expect(layer).toHaveAttribute('data-drawer', 'closed')
  // While talking, the "Press E to …" prompts step aside (no HUD grid here).
  await expect(page.getByText(/Press\s*E\s*to/)).toHaveCount(0)
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/people/street-conversation.png`,
  })

  // A reply, then another: the conversation so far is kept.
  const options = encounter(page)
    .getByRole('group', { name: 'What you say' })
    .getByRole('button')
  const first = (await options.first().innerText()).trim()
  await options.first().click()
  await expect(encounter(page).getByTestId('encounter-history')).toContainText(first)

  // The phone, and the map, opened and closed: it is still there.
  await page.locator('body').click({ position: { x: 700, y: 300 } })
  await page.keyboard.press('p')
  await expect(page.getByTestId('phone')).toBeVisible()
  await page.keyboard.press('p')
  await expect(page.getByTestId('phone')).toBeHidden()
  await expect(encounter(page)).toBeVisible()

  // Minimised to a small button, and brought back where it had got to.
  await page
    .getByRole('button', { name: /^Minimise the conversation with Aisha/ })
    .click()
  await expect(encounter(page)).toBeHidden()
  await page.getByRole('button', { name: /^Back to the conversation with Aisha/ }).click()
  await expect(encounter(page)).toBeVisible()
  await expect(encounter(page).getByTestId('encounter-history')).toContainText(first)

  // Goodbye ends it; the drawer brought back shows no conversation in it.
  await encounter(page)
    .getByRole('button', { name: /^(Goodbye|Close)$/ })
    .click()
  await expect(encounter(page)).toHaveCount(0)
  await page
    .getByRole('button', { name: /The neighbourhood/ })
    .first()
    .click()
  await expect(page.getByTestId('drawer')).toBeVisible()
})

test('at work: a colleague’s conversation floats on its own too', async ({ page }) => {
  test.setTimeout(240_000)
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 90_000,
  })
  await page.evaluate('window.__worksim.setTime(1, 10 * 60 + 40)')
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (
              (
                globalThis as unknown as { __worksimPeople?: () => unknown[] }
              ).__worksimPeople?.() ?? []
            ).length,
        ),
      { timeout: 90_000 },
    )
    .toBeGreaterThan(5)
  await page.evaluate("window.__worksimTalk('backL')")
  await expect(encounter(page)).toBeVisible({ timeout: 120_000 })
  // Not inside the office's panel.
  await expect(page.getByTestId('office-panel').getByTestId('encounter')).toHaveCount(0)
  await expect(encounter(page).getByTestId('encounter-history')).toBeVisible()
  await encounter(page)
    .getByRole('button', { name: /^(Goodbye|Close)$/ })
    .click()
  await expect(encounter(page)).toHaveCount(0)
})
