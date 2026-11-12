import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

// A wedding in the park, played: the guests seated, the partner under the
// arch, the vows, "I do", the kiss (asked) and the first dance. And a family at
// home: a child who can be played with.

const talkTo = (page: Page, id: string) =>
  page.evaluate(
    (who) =>
      (globalThis as unknown as { __worksimTalk: (id: string) => void }).__worksimTalk(
        who,
      ),
    id,
  )
const here = (page: Page, id: string) =>
  page.evaluate(
    (who) =>
      (globalThis as unknown as { __worksimPeople?: () => Array<{ id: string }> })
        .__worksimPeople?.()
        .some((p) => p.id === who) ?? false,
    id,
  )

async function evening(page: Page) {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  await expect(page.getByTestId('home')).toContainText('Evening at home', {
    timeout: 30_000,
  })
}

test('the wedding in the park: guests, the vows, the kiss and the first dance', async ({
  page,
}) => {
  test.setTimeout(600_000)
  await evening(page)
  await page.evaluate(
    "window.__worksim.setBond('cafe:barista', { stage: 'engaged', closeness: 95, attraction: 90, dates: 3, wedding: 1 })",
  )
  const home = page.getByTestId('home')
  await home
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await home.getByRole('button', { name: /Go out into the neighbourhood/ }).click()
  const city = page.getByTestId('city')
  await city.getByTestId('place-park').click()
  await page.evaluate('window.__worksim.setLifeMinute(18 * 60 + 30)')
  await expect(city.getByTestId('city-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
  // The guests are there, and so is Maya.
  await expect.poll(() => here(page, 'guest:leo'), { timeout: 60_000 }).toBe(true)
  await expect.poll(() => here(page, 'cafe:barista'), { timeout: 60_000 }).toBe(true)
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/relationships/wedding-guests.png`,
  })
  await talkTo(page, 'cafe:barista')
  const wedding = page.getByTestId('wedding')
  await expect(wedding).toBeVisible({ timeout: 120_000 })
  await wedding.getByRole('button', { name: 'Say your vows' }).click()
  await wedding.getByRole('button', { name: /be there, whatever happens/ }).click()
  await expect(wedding.getByTestId('married')).toBeVisible()
  await page.evaluate('window.__worksimSpeed = 1')
  await wedding.getByRole('button', { name: 'Ask if you can kiss Maya' }).click()
  await expect
    .poll(() => page.evaluate('window.__worksimPlayer.mode'), { timeout: 60_000 })
    .toBe('acting')
  await page.waitForTimeout(1500)
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/relationships/wedding-kiss.png`,
  })
  await expect
    .poll(() => page.evaluate('window.__worksimPlayer.mode'), { timeout: 30_000 })
    .toBe('free')
  await wedding.getByRole('button', { name: 'The first dance' }).click()
  await expect
    .poll(() => page.evaluate('window.__worksimPlayer.mode'), { timeout: 60_000 })
    .toBe('acting')
  await page.waitForTimeout(2500)
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/relationships/first-dance.png`,
  })
  await wedding.getByRole('button', { name: 'Celebrate with everyone' }).click()
  await expect(wedding).toHaveCount(0)
  // Married, in the Relationships screen.
  await page.getByRole('button', { name: /Menu/ }).click()
  await page
    .getByTestId('pause-menu')
    .getByRole('button', { name: 'Relationships' })
    .click()
  await expect(page.getByTestId('bond-cafe:barista')).toContainText('Married')
})

test('a family at home: playing with your child', async ({ page }) => {
  test.setTimeout(400_000)
  await evening(page)
  await page.evaluate(
    "window.__worksim.setBond('cafe:barista', { stage: 'married', closeness: 90, attraction: 85 })",
  )
  await page.evaluate(
    "window.__worksim.setLife({ partner: { id: 'cafe:barista', since: 1 }, family: { children: [{ name: 'Ada', born: -55, adopted: true }], expected: null } })",
  )
  await expect(page.getByTestId('home-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
  await expect.poll(() => here(page, 'child:0'), { timeout: 60_000 }).toBe(true)
  await expect.poll(() => here(page, 'cafe:barista'), { timeout: 60_000 }).toBe(true)
  await talkTo(page, 'child:0')
  const talk = page.getByTestId('encounter')
  await expect(talk).toBeVisible({ timeout: 120_000 })
  await expect(talk).toContainText('Your child')
  await talk.getByRole('button', { name: 'Play with Ada' }).click()
  await expect(talk).toContainText('a lot of laughing')
  await page.screenshot({
    path: `${process.env.WORKSIM_SHOTS ?? 'docs/screenshots'}/relationships/family.png`,
  })
})
