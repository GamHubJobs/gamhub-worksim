import { expect, test, type Page } from '@playwright/test'
import { openApp, waitUntilSaved } from './helpers.ts'

/**
 * Device Management and Remote Desktop: find the device, connect, fix the
 * cause with the computer's own tools, and the ticket resolves by itself.
 */
const shots = process.env.WORKSIM_SHOTS ?? 'test-results/deskops'

async function startDeviceTask(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: /IT Help Desk/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible()
  await openApp(page, 'Tasks')
  await page.evaluate(`window.__worksim.skipTo('device-support')`)
  await page
    .getByRole('button', { name: /Slow laptops and stubborn apps/ })
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

test('Remote Desktop: Grace’s laptop fixed at the cause, and her ticket resolves', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startDeviceTask(page)

  // Device Management: the devices with issues, and Grace's in detail.
  await section(page, 'Device Management')
  const devices = page.getByTestId('devices')
  await devices.getByLabel('Status').selectOption('issues')
  // The six faulty computers, and Hannah's laptop, which is offline.
  await expect(devices.getByTestId('device-row')).toHaveCount(7)
  await devices.getByLabel('Search devices').fill('Grace')
  await devices.getByTestId('device-row').first().click()
  const detail = page.getByTestId('device-detail')
  await expect(detail.getByTestId('device-issues')).toContainText('Processor at 96%')
  await expect(detail).toContainText('INC-3301')
  await page.screenshot({ path: `${shots}/deskops-devices.png` })

  // A laptop that is away cannot be reached.
  await section(page, 'Remote Desktop')
  await page.getByLabel('Computer to connect to').selectOption('LT-0190')
  await page.getByRole('button', { name: 'Test connection' }).click()
  await expect(page.getByTestId('reachability')).toContainText('No reply from 10.20.1.90')
  await page.getByRole('button', { name: 'Connect', exact: true }).click()
  await expect(page.getByTestId('devices-feedback')).toContainText('not reachable')

  // Connect to Grace's laptop.
  await page.getByLabel('Computer to connect to').selectOption('LT-0170')
  await page.getByRole('button', { name: 'Connect', exact: true }).click()
  const session = page.getByTestId('remote-session')
  await expect(session).toBeVisible()
  await expect(page.getByTestId('session-indicator')).toContainText('LT-0170')

  // Task Manager: a Windows process cannot be ended; the stuck sync tool can.
  await session.getByRole('button', { name: 'Task Manager' }).click()
  const tasks = page.getByTestId('utility-tasks')
  await expect(tasks.getByTestId('cpu')).toHaveText('96%')
  const row = (name: string) => tasks.getByRole('row').filter({ hasText: name })
  await row('Desktop Window Manager').getByRole('button', { name: 'End task' }).click()
  await row('Desktop Window Manager').getByRole('button', { name: 'Yes' }).click()
  await expect(page.getByTestId('devices-feedback')).toContainText('part of Windows')
  await row('SyncHelper').getByRole('button', { name: 'End task' }).click()
  await row('SyncHelper').getByRole('button', { name: 'Yes' }).click()
  await expect(tasks.getByTestId('cpu')).toHaveText('10%')

  // Storage: clear the temporary files.
  await session.getByRole('button', { name: 'Storage' }).click()
  const storage = page.getByTestId('utility-storage')
  await expect(storage.getByTestId('free-storage')).toContainText('18 GB free')
  await page.screenshot({ path: `${shots}/deskops-remote.png` })
  await storage.getByRole('button', { name: 'Clean up temporary files' }).click()
  await expect(storage.getByTestId('free-storage')).toContainText('39.5 GB free')
  await expect(page.getByTestId('ticket-update')).toContainText(
    'INC-3301: Resolved automatically',
  )

  // Disconnect when done.
  await session.getByRole('button', { name: 'Disconnect' }).click()
  await expect(page.getByTestId('remote-connect')).toBeVisible()

  // The ticket says how it was fixed; it survives a reload.
  await section(page, 'Ticket queue')
  await page
    .getByRole('list', { name: 'Tickets' })
    .getByRole('button', { name: /INC-3301/ })
    .click()
  await expect(page.getByLabel('Status')).toHaveValue('resolved')
  await expect(page.getByLabel('Ticket history')).toContainText(
    'Change made: End process SyncHelper on LT-0170.',
  )
  await waitUntilSaved(page)
  await page.reload()
  await expect(page.getByTestId('desktop')).toBeVisible()
  await openApp(page, 'Help Desk')
  await page
    .getByRole('button', { name: /computer problems/ })
    .first()
    .click()
  await section(page, 'Device Management')
  await page.getByTestId('devices').getByLabel('Search devices').fill('LT-0170')
  await page.getByTestId('device-row').first().click()
  await expect(page.getByTestId('device-detail')).toContainText('None found.')
  await expect(page.getByTestId('device-detail')).toContainText('Disk Cleanup')
})
