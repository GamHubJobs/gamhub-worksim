import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers.ts'

/**
 * A day on the desk: tickets arrive as the office clock moves on, each with
 * an SLA for its priority; the report counts from the saved tickets.
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
  await page.evaluate(`window.__worksim.skipTo('full-day')`)
  await page
    .getByRole('button', { name: /A full day on the desk/ })
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
const list = (page: Page) => page.getByRole('list', { name: 'Tickets' })

test('tickets arrive through the day, with SLAs on the office clock, and a report', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startTask(page)

  // The morning: two tickets; the others have not come in yet.
  await expect(list(page).getByRole('listitem')).toHaveCount(2)
  await expect(list(page)).not.toContainText('INC-3803')

  // A priority gives the ticket an SLA, shown in the queue and on the ticket.
  await list(page)
    .getByRole('button', { name: /INC-3801/ })
    .click()
  await page.getByLabel('Priority').selectOption('P3')
  await expect(page.getByTestId('sla-line')).toContainText('P3 SLA')
  await expect(page.getByTestId('sla-line')).toContainText('Resolve by')
  await expect(list(page).getByTestId('sla-badge').first()).toContainText('left')

  // Two hours later Carmen's ticket has arrived.
  await page.evaluate(`window.__worksim.passTime(120)`)
  await expect(list(page).getByRole('listitem')).toHaveCount(3)
  await list(page)
    .getByRole('button', { name: /INC-3803/ })
    .click()
  await page.getByLabel('Priority').selectOption('P2')
  await expect(page.getByTestId('sla-line')).toHaveAttribute(
    'data-state',
    /running|at-risk/,
  )
  await page.screenshot({ path: `${shots}/deskops-sla.png` })

  // The Overview counts SLAs; the report counts from the tickets.
  await section(page, 'Overview')
  await expect(page.getByTestId('stat-sla')).toContainText('0')
  await section(page, 'Reports')
  await expect(page.getByTestId('report-received')).toContainText('3')
  await expect(page.getByTestId('report-resolved')).toContainText('0')
  await page.screenshot({ path: `${shots}/deskops-reports.png` })
})
