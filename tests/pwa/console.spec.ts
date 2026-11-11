import { expect, test } from '@playwright/test'

test('a whole session in the production build: no console errors and no failed requests', async ({
  page,
}) => {
  const problems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`))
  page.on('requestfailed', (request) =>
    problems.push(`failed: ${request.url()} ${request.failure()?.errorText ?? ''}`),
  )
  page.on('response', (response) => {
    if (response.status() >= 400)
      problems.push(`HTTP ${response.status()}: ${response.url()}`)
  })

  await page.goto('/')
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })
  // Walk around, talk to someone, sit down, use the apps, and leave again.
  const places = page.getByRole('navigation', { name: 'Places' })
  await places.getByRole('button', { name: 'Break room' }).click()
  await page
    .getByTestId('office-panel')
    .getByRole('button', { name: /Chat with Tom/ })
    .click()
  await page.keyboard.press('Escape')
  await places.getByRole('button', { name: 'Your desk' }).click()
  await page
    .getByTestId('office-panel')
    .getByRole('button', { name: /Use your computer/ })
    .click()
  const apps = page.getByRole('navigation', { name: 'Apps' })
  for (const name of [
    'Mail',
    'Tasks',
    'Cases',
    'Grid Craft',
    'Docs',
    'Slides',
    'Career',
    'Readiness',
    'Portfolio',
  ]) {
    await apps.getByRole('button', { name: new RegExp(`^${name}`) }).click()
    await expect(page.getByText('Opening…', { exact: true })).toHaveCount(0, {
      timeout: 30_000,
    })
  }
  await page.getByRole('button', { name: 'Help', exact: true }).click()
  await page.keyboard.press('Escape')
  await apps.getByRole('button', { name: 'Leave desk' }).click()
  await expect(page.getByTestId('office')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })

  expect(problems).toEqual([])
})
