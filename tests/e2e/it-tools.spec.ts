import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers.ts'

const apps = (page: Page) => page.getByRole('navigation', { name: 'Apps' })

async function startIt(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: /IT Help Desk/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible()
  await openApp(page, 'Tasks')
}

async function startTask(page: Page, id: string, title: RegExp, testId: string) {
  await startIt(page)
  await page.evaluate(`window.__worksim.skipTo('${id}')`)
  await page.getByRole('button', { name: title }).first().click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(page.getByTestId(testId)).toBeVisible()
}

async function submitForFull(page: Page) {
  await page.getByRole('button', { name: /Submit to Ravi/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByTestId('submission-results').getByTestId('score')).toHaveText(
    '100%',
  )
}

const section = (page: Page, nav: string, name: string) =>
  page
    .getByRole('navigation', { name: nav })
    .getByRole('button', { name, exact: true })
    .click()

test('Directory: a new starter and a lost phone, end to end', async ({ page }) => {
  test.setTimeout(240_000)
  await startTask(page, 'directory-joiner', /A new starter and a lost phone/, 'directory')

  // The new starter.
  await page.getByRole('button', { name: 'New account' }).click()
  const form = page.getByTestId('new-account')
  await form.getByLabel('Full name').fill('Ines Duarte')
  await expect(form.getByLabel('Username')).toHaveValue('ines.duarte')
  await form.getByLabel('Department').selectOption('Consulting')
  await form.getByLabel('Job title').fill('Junior Consultant')
  await form.getByRole('button', { name: 'Create account' }).click()
  const detail = page.getByTestId('user-detail')
  await expect(detail).toContainText('Ines Duarte')
  for (const group of ['All Staff', 'Consultants', 'VPN Users']) {
    await detail.getByLabel('Group to add').selectOption({ label: group })
    await detail.getByRole('button', { name: 'Add', exact: true }).click()
  }
  await expect(detail.getByTestId('member-of')).toHaveCount(3)
  await detail.getByRole('button', { name: 'Register MFA' }).click()
  await expect(detail).toContainText('MFA registered')

  // Equipment.
  await section(page, 'Directory sections', 'Assets')
  const row = (tag: string) => page.getByTestId('asset-row').filter({ hasText: tag })
  const assign = async (tag: string, person: string) => {
    await row(tag).getByLabel(`Assign ${tag} to`).selectOption({ label: person })
    await row(tag).getByRole('button', { name: 'Assign' }).click()
    await expect(row(tag)).toContainText(person)
  }
  await assign('CR-LT-0157', 'Ines Duarte')
  await assign('CR-PH-0070', 'Ines Duarte')

  // Maya's lost phone.
  await row('CR-PH-0064').getByRole('button', { name: 'Report lost' }).click()
  await expect(row('CR-PH-0064')).toContainText('lost')
  await assign('CR-PH-0071', 'Maya Patel')
  await section(page, 'Directory sections', 'Users')
  await page.getByLabel('Search accounts').fill('Maya')
  await page.getByTestId('user-row').filter({ hasText: 'Maya Patel' }).click()
  await detail.getByRole('button', { name: 'Reset MFA' }).click()
  await detail.getByRole('button', { name: 'Register MFA' }).click()

  // Everything is in the audit log.
  await section(page, 'Directory sections', 'Audit log')
  await expect(page.getByTestId('audit')).toContainText('Reset MFA')

  await submitForFull(page)
})

test('Network Tools: three faults after a change, diagnosed and fixed', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await startTask(page, 'network-intranet', /Monday after the change/, 'network')
  const output = page.getByTestId('console-output')
  const run = async (command: string) => {
    await page.getByLabel('Command').fill(command)
    await page.getByLabel('Command').press('Enter')
    await expect(output).toContainText(command)
  }

  // The intranet name points to the old, switched-off server.
  await run('nslookup intranet')
  await expect(output).toContainText('10.20.0.25')
  // Sam's laptop asks a DNS server outside the office.
  await page.getByLabel('Run from').selectOption('LT-0156')
  await run('ipconfig')
  await expect(output).toContainText('8.8.8.8')
  // The access point doesn't answer.
  await page.getByLabel('Run from').selectOption('IT-PC-07')
  await run('ping 10.20.2.5')
  await expect(output).toContainText('Lost = 4')

  // The access point can't be fixed from here.
  await section(page, 'Network Tools sections', 'Network map')
  await page.getByRole('button', { name: 'Restart AP-FL2' }).click()
  await expect(page.getByRole('alert')).toContainText('on site')
  await page.getByRole('button', { name: 'Use automatic settings on LT-0156' }).click()

  await section(page, 'Network Tools sections', 'DNS records')
  await page.getByRole('button', { name: 'Edit intranet' }).click()
  await page.getByLabel('Address for intranet').fill('10.20.0.21')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(
    page.getByTestId('dns-row').filter({ hasText: /^intranet/ }),
  ).toContainText('10.20.0.21')

  await section(page, 'Network Tools sections', 'Findings')
  for (const [device, fault, note] of [
    ['DC-01', 'Wrong DNS record', 'intranet pointed at INTRA-01'],
    ['LT-0156', 'Wrong DNS server setting', 'DNS set to 8.8.8.8 by hand'],
    [
      'AP-FL2',
      'Device offline (needs someone on site)',
      'No reply; remote restart fails',
    ],
  ]) {
    await page.getByLabel('Finding device').selectOption(device)
    await page.getByLabel('Fault').selectOption({ label: fault })
    await page.getByLabel('Evidence').fill(note)
    await page.getByRole('button', { name: 'Add finding' }).click()
  }
  await expect(page.getByTestId('finding')).toHaveCount(3)

  // Test again from Sam's laptop.
  await section(page, 'Network Tools sections', 'Console')
  await page.getByLabel('Run from').selectOption('LT-0156')
  await run('portcheck intranet 443')
  await expect(output).toContainText('TcpTestSucceeded: True')

  await submitForFull(page)
})

test('Network Tools unlocks with the first promotion', async ({ page }) => {
  await startIt(page)
  await expect(apps(page).getByRole('button', { name: /^Directory/ })).toBeEnabled()
  const locked = apps(page).getByRole('button', { name: /^Network Tools/ })
  await expect(locked).toBeDisabled()
  await expect(locked).toHaveAttribute('title', /Service Desk Analyst/)
})
