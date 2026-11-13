/**
 * The legal career (a simulation in a fictional jurisdiction): the first
 * task done end to end in Matter Desk, and the deadline calculator.
 */
import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers.ts'

const shots = process.env.WORKSIM_SHOTS ?? 'docs/screenshots'

async function startLegal(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toContainText('Kestrel & Vane LLP')
  await page.getByRole('radio', { name: /Law & Legal Services/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible()
}

async function startTask(page: Page, id: string, title: RegExp) {
  await openApp(page, 'Tasks')
  await page.evaluate(`window.__worksim.skipTo('${id}')`)
  await page.getByRole('button', { name: title }).first().click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(page.getByTestId('matter-desk')).toBeVisible()
}

test('Law: two enquiries, a conflict caught, marked 100%', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startLegal(page)
  await startTask(page, 'legal-intake', /Two new enquiries/)
  const desk = page.getByTestId('matter-desk')
  await expect(desk).toContainText('fictional jurisdiction')

  // Jonah Pell: no conflict; identity, engagement, open.
  const pell = desk.getByTestId('matter-M-2042')
  await expect(pell.getByRole('button', { name: 'Open the matter' })).toBeVisible()
  await pell.getByRole('button', { name: 'Open the matter' }).click()
  await expect(desk.getByTestId('desk-message')).toContainText('conflict check first')
  await pell.getByRole('button', { name: 'Run conflict check' }).click()
  await expect(desk.getByTestId('conflicts-M-2042')).toContainText('No matches')
  await pell
    .getByLabel('Identity document for Jonah Pell')
    .fill('Passport, seen in person')
  await pell.getByRole('button', { name: 'Record as verified' }).click()
  await pell.getByRole('button', { name: 'Send engagement letter' }).click()
  await pell.getByRole('button', { name: 'Open the matter' }).click()
  await expect(pell).toContainText('open')

  // Corvid Logistics: suing our own client.
  const corvid = desk.getByTestId('matter-M-2043')
  await corvid.getByRole('button', { name: 'Run conflict check' }).click()
  await expect(desk.getByTestId('conflicts-M-2043')).toContainText('CONFLICT')
  await page.screenshot({ path: `${shots}/legal/conflict.png` })
  await corvid.getByRole('button', { name: 'Open the matter' }).click()
  await expect(desk.getByTestId('desk-message')).toContainText('cannot act')
  await corvid
    .getByLabel('Reason for declining M-2043')
    .fill('Conflict of interest: we act for Brightwater Bakery Ltd in M-2041.')
  await corvid.getByRole('button', { name: 'Decline' }).click()
  await expect(corvid).toContainText('declined')

  await page.getByRole('button', { name: /Submit to Eleanor/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByTestId('submission-results').getByTestId('score')).toHaveText(
    '100%',
  )
})

test('Law: the deadline calculator rolls past the weekend and a holiday', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startLegal(page)
  await startTask(page, 'legal-deadlines', /Two deadlines/)
  const desk = page.getByTestId('matter-desk')
  await desk.getByRole('tab', { name: 'Calendar' }).click()
  await desk.getByLabel('From (event date)').fill('2026-03-07')
  await desk.getByLabel('Days').fill('28')
  // 4 April is a Saturday; 6 April is a public holiday: the deadline is 7 April.
  await expect(desk.getByTestId('calculated-deadline')).toContainText('2026-04-07')
  await page.screenshot({ path: `${shots}/legal/calendar.png` })
})
