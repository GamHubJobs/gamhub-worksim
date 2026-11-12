import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers.ts'

/**
 * Cross-department incidents: the Overview ranks what is broken by business
 * impact; one fix at the source brings three departments back at once, and
 * the business impact shrinks to what is left.
 */
const shots = process.env.WORKSIM_SHOTS ?? 'test-results/deskops'

async function startTask(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: /IT Help Desk/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible()
  await openApp(page, 'Tasks')
  await page.evaluate(`window.__worksim.skipTo('company-outage')`)
  await page
    .getByRole('button', { name: /One morning, five departments/ })
    .first()
    .click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(page.getByTestId('helpdesk')).toBeVisible()
}

const section = (page: Page, name: string) =>
  page
    .getByRole('tablist', { name: 'Help Desk and the company’s systems' })
    .getByRole('tab', { name, exact: true })
    .click()

test('business impact across departments, and one fix that brings three back', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startTask(page)

  // The Overview: what is at stake, biggest first.
  await section(page, 'Overview')
  const impact = page.getByTestId('business-impact').getByRole('listitem')
  await expect(impact).toHaveCount(7)
  await expect(impact.first()).toContainText('Shared drive (Finance)')
  await expect(impact.first()).toContainText('Payroll run at 12:00')
  await expect(page.getByTestId('impact')).toContainText('Finance')
  await page.screenshot({ path: `${shots}/deskops-company.png` })

  // The ticket shows its own impact.
  await section(page, 'Ticket queue')
  await page
    .getByRole('list', { name: 'Tickets' })
    .getByRole('button', { name: /INC-3601/ })
    .click()
  await expect(page.getByTestId('ticket-impact')).toContainText(
    'Shared drive (Finance): 14 people',
  )

  // One cause, three departments: restart file sharing on FILE-01.
  await section(page, 'Network Tools')
  await page
    .getByRole('navigation', { name: 'Network Tools sections' })
    .getByRole('button', { name: 'Network map', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Restart File sharing (SMB) on FILE-01' })
    .click()
  await expect(page.getByTestId('ticket-update')).toContainText('Resolved automatically')

  // The business impact shrinks to what is still broken.
  await section(page, 'Overview')
  await expect(impact).toHaveCount(4)
  await expect(page.getByTestId('business-impact')).not.toContainText('Shared drive')
  await expect(impact.first()).toContainText('Development server')
  await expect(page.getByTestId('stat-held')).toContainText('0')
})
