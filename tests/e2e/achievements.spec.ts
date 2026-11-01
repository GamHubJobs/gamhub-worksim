import { expect, test } from '@playwright/test'
import { openApp } from './helpers.ts'

test('achievements are earned by work, and earned desk items are placed and kept', async ({
  page,
}) => {
  test.setTimeout(150_000)
  await page.goto('/')
  await page.getByRole('radio', { name: /IT Help Desk/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await openApp(page, 'Career')
  await expect(page.getByTestId('achievement-first-delivery')).toContainText('Not yet')
  const plant = page.getByTestId('desk').getByRole('group', { name: 'Plant' })
  await expect(plant.getByRole('radio', { name: /Small succulent/ })).toBeDisabled()

  // Passing tasks earns the first achievements.
  await page.evaluate("window.__worksim.skipTo('directory-joiner')")
  await expect(page.getByTestId('achievement-first-delivery')).toContainText(
    'Earned on day 1',
  )
  await expect(page.getByTestId('achievements')).toContainText('Pass 5 tasks')

  // An earned item goes on the desk, and stays there after a reload.
  await plant.getByRole('radio', { name: /Small succulent/ }).check()
  await expect(plant.getByRole('radio', { name: /Small succulent/ })).toBeChecked()
  await page.reload()
  await openApp(page, 'Career')
  await expect(
    page
      .getByTestId('desk')
      .getByRole('group', { name: 'Plant' })
      .getByRole('radio', { name: /Small succulent/ }),
  ).toBeChecked()

  // From the office: "Arrange your desk" opens the desk section.
  await page.getByRole('button', { name: 'Leave desk' }).click()
  await page
    .getByRole('navigation', { name: 'Places' })
    .getByRole('button', { name: 'Your desk' })
    .click()
  await page
    .getByTestId('office-panel')
    .getByRole('button', { name: 'Arrange your desk' })
    .click()
  await expect(page.getByTestId('desk')).toBeFocused()
})
