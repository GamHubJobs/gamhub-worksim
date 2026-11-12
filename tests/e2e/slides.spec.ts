import { expect, test, type Page } from '@playwright/test'
import { openApp, startCareerIfNeeded, waitUntilSaved } from './helpers.ts'

const tools = (page: Page) => page.getByRole('toolbar', { name: 'Slide tools' })
const thumbnails = (page: Page) => page.getByRole('navigation', { name: 'Slides' })
const canvas = (page: Page) => page.getByTestId('slide-canvas')

/** A 2×2 red PNG. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==',
  'base64',
)

test('a presentation can be built, rearranged, presented and reopened', async ({
  page,
}) => {
  await page.goto('/')
  await startCareerIfNeeded(page, 'Alex Morgan')
  await openApp(page, 'Deck Craft')
  await page.getByRole('button', { name: /Monthly business review/ }).click()

  // The template: six slides, the first one a title slide with the player's name.
  await expect(thumbnails(page).getByRole('button', { name: /^Slide \d+$/ })).toHaveCount(
    6,
  )
  await expect(canvas(page)).toContainText('[Month] business review')
  await expect(canvas(page)).toContainText('Alex Morgan')

  // A new "Title and content" slide after the first, with typed text.
  await tools(page).getByRole('button', { name: 'New slide ▾' }).click()
  await page.getByRole('menuitem', { name: 'Title and content' }).click()
  await expect(thumbnails(page).getByRole('button', { name: /^Slide \d+$/ })).toHaveCount(
    7,
  )
  await canvas(page).getByLabel('Text: empty').first().dblclick()
  await page.getByLabel('Slide text').fill('Budget at a glance')
  await page.keyboard.press('Escape')
  await expect(canvas(page)).toContainText('Budget at a glance')

  // A shape, moved by dragging.
  await tools(page).getByRole('button', { name: 'Shape ▾' }).click()
  await page.getByRole('menuitem', { name: 'Rounded rectangle' }).click()
  const shape = canvas(page).getByTestId('element-shape')
  const before = (await shape.boundingBox())!
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    before.x + before.width / 2 + 80,
    before.y + before.height / 2 + 40,
    {
      steps: 5,
    },
  )
  await page.mouse.up()
  const after = (await shape.boundingBox())!
  expect(after.x).toBeGreaterThan(before.x + 40)

  // A picture from the computer.
  await page.getByTestId('picture-input').setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: PNG,
  })
  await expect(canvas(page).getByRole('img', { name: 'logo' })).toBeVisible()

  // A different theme, then duplicate and delete a slide.
  await tools(page).getByRole('button', { name: 'Theme ▾' }).click()
  await page.getByRole('menuitem', { name: /Midnight/ }).click()
  await page.getByRole('button', { name: 'Duplicate slide' }).click()
  await expect(thumbnails(page).getByRole('button', { name: /^Slide \d+$/ })).toHaveCount(
    8,
  )
  await page.getByRole('button', { name: 'Delete slide' }).click()
  await expect(thumbnails(page).getByRole('button', { name: /^Slide \d+$/ })).toHaveCount(
    7,
  )

  // Present from the start, move through with the keyboard, and leave.
  await thumbnails(page).getByRole('button', { name: 'Slide 1', exact: true }).click()
  await tools(page)
    .getByRole('button', { name: /Present/ })
    .click()
  const show = page.getByTestId('presentation')
  await expect(page.getByTestId('slide-counter')).toHaveText('1 / 7')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('slide-counter')).toHaveText('2 / 7')
  await expect(show).toContainText('Budget at a glance')
  await page.keyboard.press('Escape')
  await expect(show).toHaveCount(0)

  // Everything is saved.
  await waitUntilSaved(page)
  await page.reload()
  await expect(thumbnails(page).getByRole('button', { name: /^Slide \d+$/ })).toHaveCount(
    7,
  )
  await thumbnails(page).getByRole('button', { name: 'Slide 2', exact: true }).click()
  await expect(canvas(page)).toContainText('Budget at a glance')
  await expect(canvas(page).getByRole('img', { name: 'logo' })).toBeVisible()
})
