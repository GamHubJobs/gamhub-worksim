import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers.ts'

/**
 * The Security Console: an incident worked through every stage. Each stage
 * moves on only when its work is done; a wrong containment has a visible
 * consequence; closing the incident resolves the ticket that reported it.
 */
const shots = process.env.WORKSIM_SHOTS ?? 'test-results/deskops'

async function startSecurityTask(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: /IT Help Desk/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible()
  await openApp(page, 'Tasks')
  await page.evaluate(`window.__worksim.skipTo('security-incident')`)
  await page
    .getByRole('button', { name: /Incident response: a compromised account/ })
    .first()
    .click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(page.getByTestId('helpdesk')).toBeVisible()
}

test('a security incident from detection to review, with a mistake and its consequence', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startSecurityTask(page)
  await page
    .getByRole('tablist', { name: 'Help Desk and the company’s systems' })
    .getByRole('tab', { name: 'Security Console', exact: true })
    .click()
  const soc = page.getByTestId('security-console')
  const tool = (name: string) =>
    soc
      .getByRole('tablist', { name: 'Investigation tools' })
      .getByRole('tab', { name })
      .click()
  const complete = () => soc.getByTestId('complete-stage').click()
  const stage = (name: string) =>
    expect(soc.getByTestId('stages').locator('[aria-current="step"]')).toContainText(name)
  const yes = (row: ReturnType<Page['locator']>, label: string) =>
    row
      .getByRole('button', { name: label })
      .click()
      .then(() => row.getByRole('button', { name: 'Yes' }).click())

  // Detect: refused until the alert is acknowledged.
  await complete()
  await expect(soc.getByTestId('soc-problems')).toContainText(
    'The alert has not been acknowledged.',
  )
  await soc
    .getByTestId('alert-row')
    .filter({ hasText: 'Sign-in from an unusual location' })
    .getByRole('button', { name: 'Acknowledge' })
    .click()
  await complete()
  await stage('Triage')

  // Triage.
  await soc.getByLabel('Severity').selectOption('high')
  await soc.getByLabel('Category').selectOption('account-compromise')
  await soc.getByRole('button', { name: 'Save triage' }).click()
  await complete()
  await stage('Investigate')

  // Investigate: nothing yet, so it is refused.
  await complete()
  await expect(soc.getByTestId('soc-problems')).toContainText(
    'The suspicious sign-in has not been found.',
  )
  await tool('Sign-ins')
  await soc
    .getByTestId('signin-row')
    .filter({ hasText: 'Tue 03:14' })
    .getByRole('button', { name: 'Flag as suspicious' })
    .click()
  await tool('Email')
  const email = soc.getByTestId('email')
  await email.getByRole('button', { name: 'Inspect link' }).click()
  await expect(email.getByTestId('link-target')).toContainText(
    'cobaltridge-payroll.example.org',
  )
  await email.getByRole('button', { name: 'It is phishing' }).click()
  await tool('Mailboxes')
  await soc
    .getByTestId('mailbox')
    .first()
    .getByRole('row')
    .filter({ hasText: 'Archive' })
    .getByRole('button', { name: 'Flag as evidence' })
    .click()
  await tool('Endpoints')
  await soc.getByRole('button', { name: /LT-0171/ }).click()
  await soc
    .getByTestId('process-row')
    .filter({ hasText: 'syshelper' })
    .getByRole('button', { name: 'Flag' })
    .click()
  await page.screenshot({ path: `${shots}/deskops-security.png` })
  await complete()
  await stage('Contain')

  // A mistake: isolating Grace's laptop, which was not affected.
  await soc.getByRole('button', { name: /LT-0170/ }).click()
  await yes(soc.getByTestId('endpoint'), 'Isolate')
  await expect(soc.getByTestId('consequences')).toContainText('Grace Mensah cannot work')

  // Contain the right account and laptop.
  await tool('Accounts')
  const owen = soc.getByTestId('account-row').filter({ hasText: 'Owen Price' })
  await yes(owen, 'End sessions')
  await yes(owen, 'Reset password')
  await tool('Endpoints')
  await soc.getByRole('button', { name: /LT-0171/ }).click()
  await yes(soc.getByTestId('endpoint'), 'Isolate')
  await complete()
  await stage('Eradicate')

  // Eradicate.
  await tool('Mailboxes')
  await yes(
    soc.getByTestId('mailbox').first().getByRole('row').filter({ hasText: 'Archive' }),
    'Remove',
  )
  await tool('Endpoints')
  await yes(soc.getByTestId('process-row').filter({ hasText: 'syshelper' }), 'Remove')
  await tool('Email')
  await yes(soc.getByTestId('email'), 'Quarantine everywhere')
  await complete()
  await stage('Recover')

  // Recover: Grace's laptop must be reconnected too.
  await tool('Endpoints')
  await soc
    .getByTestId('endpoint')
    .getByRole('button', { name: 'Reconnect to the network' })
    .click()
  await complete()
  await expect(soc.getByTestId('soc-problems')).toContainText(
    'LT-0170 is still isolated by mistake.',
  )
  await soc.getByRole('button', { name: /LT-0170/ }).click()
  await soc
    .getByTestId('endpoint')
    .getByRole('button', { name: 'Reconnect to the network' })
    .click()
  await complete()
  await stage('Document')

  // Document and review.
  await tool('Report')
  await soc
    .getByLabel('Incident report')
    .fill(
      'At 03:14 on Tuesday someone signed in to Owen Price’s account from an overseas address (203.0.113.45) after two failed attempts. Owen had entered his password on a fake payroll page linked from a phishing email. The attacker added a mailbox rule forwarding invoices outside the company, and a remote-access program was set to start on his laptop LT-0171. We ended his sessions, reset his password, isolated LT-0171, removed the rule and the program, quarantined the email and reconnected the laptop.',
    )
  await soc.getByLabel('Lessons learned').click()
  await complete()
  await stage('Review')
  await soc
    .getByLabel('Lessons learned')
    .fill(
      'Register multi-factor authentication for everyone in Finance, block automatic forwarding to external addresses, and remind staff how to spot lookalike domains. Thank Carmen for reporting it so quickly.',
    )
  await soc.getByLabel('Incident report').click()
  await complete()
  await expect(soc.getByTestId('stage-goal')).toContainText('The incident is closed.')
  await expect(page.getByTestId('ticket-update')).toContainText(
    'INC-3501: Resolved automatically',
  )
  await page.screenshot({ path: `${shots}/deskops-security-closed.png` })
})
