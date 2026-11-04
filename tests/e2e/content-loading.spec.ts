import { expect, test, type Page } from '@playwright/test'
import { openApp, sitAtComputer } from './helpers.ts'

/** The career content packs the page has downloaded so far. */
function packsLoaded(page: Page): Set<string> {
  const seen = new Set<string>()
  page.on('requestfinished', (request) => {
    const match = request.url().match(/content\/packs\/([a-z]+)\.ts/)
    if (match) seen.add(match[1])
  })
  return seen
}

test('only the chosen career’s content loads; a failed download can be tried again', async ({
  page,
}) => {
  test.setTimeout(150_000)
  const packs = packsLoaded(page)
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Start my first day' })).toBeVisible()
  expect([...packs]).toEqual([])

  // The connection drops just as the IT Help Desk content is needed.
  await page.route('**/content/packs/it.ts*', (route) => route.abort())
  await page.getByRole('radio', { name: /IT Help Desk/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'WorkSim could not load the content for this career',
  )

  // Back online: trying again works.
  await page.unroute('**/content/packs/it.ts*')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('office')).toBeVisible()
  expect([...packs]).toEqual(['it'])

  // Switching career loads that career's content, and both are kept.
  await sitAtComputer(page)
  await openApp(page, 'Career')
  await page
    .getByTestId('career-data-analytics')
    .getByRole('button', { name: 'Start this career' })
    .click()
  // The office is drawn again for the new career, which takes a moment in software 3D.
  await expect(page.getByTestId('office-panel').getByRole('heading')).toHaveText(
    'Reception',
    { timeout: 15_000 },
  )
  await sitAtComputer(page)
  await openApp(page, 'Tasks')
  await expect(
    page.getByRole('navigation', { name: 'Tasks' }).or(page.locator('body')),
  ).toContainText('Clean the customer export')
  expect([...packs].sort()).toEqual(['data', 'it'])

  // A returning player with two careers: both are loaded before the desk opens.
  await page.reload()
  await sitAtComputer(page)
  await openApp(page, 'Tasks')
  await expect(
    page.getByRole('navigation', { name: 'Tasks' }).or(page.locator('body')),
  ).toContainText('Clean the customer export')
})
