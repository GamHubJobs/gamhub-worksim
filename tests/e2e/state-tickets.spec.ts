import { expect, test, type Page } from '@playwright/test'
import { openApp, waitUntilSaved } from './helpers.ts'

/**
 * Tickets tied to the company's systems: they resolve because the problem is
 * really fixed in Network Tools or Directory, never because Resolved is chosen.
 */
async function startWifiTask(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: /IT Help Desk/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible()
  await openApp(page, 'Tasks')
  await page.evaluate(`window.__worksim.skipTo('wifi-outage')`)
  await page
    .getByRole('button', { name: /Floor 2 has lost its Wi-Fi/ })
    .first()
    .click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(page.getByTestId('helpdesk')).toBeVisible()
}

const tab = (page: Page, name: string) =>
  page.getByRole('tablist').getByRole('tab', { name, exact: true }).click()
const openTicket = (page: Page, id: string) =>
  page
    .getByRole('list', { name: 'Tickets' })
    .getByRole('button', { name: new RegExp(id) })
    .click()
const conditions = (page: Page) => page.getByTestId('ticket-condition')
const section = (page: Page, nav: string, name: string) =>
  page
    .getByRole('navigation', { name: nav })
    .getByRole('button', { name, exact: true })
    .click()

test('Floor 2 Wi-Fi: the ticket resolves when the access point is fixed, and not before', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await startWifiTask(page)

  // Carmen's ticket: two checks in the systems, both failing.
  await openTicket(page, 'INC-3101')
  await expect(page.getByTestId('ticket-systems')).toContainText('Carmen Ruiz (Payroll)')
  await expect(conditions(page)).toHaveCount(2)
  await expect(conditions(page).first()).toHaveAttribute('data-passed', 'false')
  await page.getByRole('button', { name: 'Assign to me' }).click()
  await expect(page.getByTestId('ticket-systems')).toContainText('Assigned to')
  await expect(page.getByLabel('Status')).toHaveValue('assigned')

  // Choosing Resolved does not resolve it: it says what is still broken.
  await page.getByLabel('Status').selectOption('resolved')
  await expect(page.getByTestId('status-refused')).toContainText(
    'AP-FL2 is not responding.',
  )
  await expect(page.getByLabel('Status')).toHaveValue('assigned')
  await expect(page.getByLabel('Ticket history')).toContainText('Not resolved')

  // Network Tools: the laptops are on, but off the network; the access point is down.
  await tab(page, 'Network Tools')
  await section(page, 'Network Tools sections', 'Network map')
  const row = (name: string) => page.getByRole('row', { name: new RegExp(`^${name} `) })
  await expect(row('LT-0161')).toContainText('No network')
  await expect(row('LT-0161')).toContainText('Wi-Fi through AP-FL2')
  await expect(row('AP-FL2')).toContainText('No response')

  // The wrong fix changes nothing.
  await row('LT-0161').getByRole('button', { name: 'Restart LT-0161' }).click()
  await expect(page.getByTestId('ticket-update')).toHaveCount(0)

  // Diagnose from the desk, then fix it at the source.
  await section(page, 'Network Tools sections', 'Console')
  const output = page.getByTestId('console-output')
  const run = async (command: string) => {
    await page.getByLabel('Command').fill(command)
    await page.getByLabel('Command').press('Enter')
    await expect(output).toContainText(command)
  }
  await run('ping 10.20.2.5')
  await expect(output).toContainText('Lost = 4')
  await section(page, 'Network Tools sections', 'Network map')
  await page.getByRole('button', { name: 'Restart AP-FL2' }).click()
  await expect(page.getByTestId('ticket-update')).toContainText('Resolved automatically')
  await expect(row('LT-0161')).toContainText('Responding')

  // Verified from Carmen's laptop, and recorded.
  await section(page, 'Network Tools sections', 'Console')
  await page.getByLabel('Run from').selectOption('LT-0161')
  await run('ping file-01')
  await expect(output).toContainText('Reply from 10.20.0.15')
  await section(page, 'Network Tools sections', 'Findings')
  await page.getByLabel('Finding device').selectOption('AP-FL2')
  await page
    .getByLabel('Fault')
    .selectOption({ label: 'Device stopped responding (can be restarted remotely)' })
  await page
    .getByLabel('Evidence')
    .fill('No reply to ping 10.20.2.5; a remote restart fixed it.')
  await page.getByRole('button', { name: 'Add finding' }).click()

  // Back in the queue: resolved, with why, and Arjun's too (the same access point).
  await tab(page, 'Ticket queue')
  await openTicket(page, 'INC-3101')
  await expect(page.getByTestId('ticket-resolution')).toContainText(
    'AP-FL2 is responding.',
  )
  await expect(page.getByLabel('Ticket history')).toContainText(
    'Update sent to Carmen Ruiz',
  )
  await expect(page.getByLabel('Status')).toHaveValue('resolved')
  await openTicket(page, 'INC-3102')
  await expect(page.getByLabel('Status')).toHaveValue('resolved')

  // Leila: a reset alone does not let her in.
  await tab(page, 'Directory')
  await page.getByLabel('Search accounts').fill('Leila')
  await page.getByTestId('user-row').filter({ hasText: 'Leila Haddad' }).click()
  const detail = page.getByTestId('user-detail')
  await detail.getByRole('button', { name: 'Reset password' }).click()
  await tab(page, 'Ticket queue')
  await openTicket(page, 'INC-3103')
  await expect(page.getByTestId('ticket-systems')).toContainText(
    'Still preventing resolution (1 of 2)',
  )
  await tab(page, 'Directory')
  await page.getByLabel('Search accounts').fill('Leila')
  await page.getByTestId('user-row').filter({ hasText: 'Leila Haddad' }).click()
  await detail.getByRole('button', { name: 'Unlock' }).click()
  await tab(page, 'Ticket queue')
  await openTicket(page, 'INC-3103')
  await expect(page.getByLabel('Status')).toHaveValue('resolved')

  // Reply to Carmen, close her ticket.
  await openTicket(page, 'INC-3101')
  await page
    .getByLabel('Reply to Carmen')
    .fill(
      'Hi Carmen, the Wi-Fi access point on floor 2 (AP-FL2) had stopped responding, so every laptop on the floor was cut off. I restarted it and tested from your laptop: you can reach the shared drive again.',
    )
  await page.getByLabel('Internal note').click()
  await page.getByLabel('Status').selectOption('closed')
  await expect(page.getByLabel('Status')).toHaveValue('closed')
  await waitUntilSaved(page)

  // The queue, its history and the systems are kept: reload and look again.
  await page.reload()
  await expect(page.getByTestId('desktop')).toBeVisible()
  await openApp(page, 'Help Desk')
  await page
    .getByRole('button', { name: /Floor 2 Wi-Fi|Service desk: floor 2 Wi-Fi/ })
    .first()
    .click()
  await openTicket(page, 'INC-3101')
  await expect(page.getByLabel('Status')).toHaveValue('closed')
  await expect(page.getByLabel('Ticket history')).toContainText(
    'Closed: the fix is confirmed.',
  )

  await page.getByRole('button', { name: /Submit to Ravi/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByTestId('submission-results').getByTestId('score')).toHaveText(
    '100%',
  )
})
