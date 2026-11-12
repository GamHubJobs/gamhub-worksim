import { expect, test, type Page } from '@playwright/test'
import { openApp, waitUntilSaved } from './helpers.ts'

/**
 * Identity verification: the Directory refuses account changes nobody
 * verified, records the attempt, and allows the change once the person is
 * verified against the records (and approved, where the policy needs it).
 */
async function startUnlockTask(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: /IT Help Desk/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible()
  await openApp(page, 'Tasks')
  await page.evaluate(`window.__worksim.skipTo('account-unlock')`)
  await page
    .getByRole('button', { name: /The Account Unlock Request/ })
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
const panel = (page: Page) => page.getByTestId('verification-panel')
const phase = (page: Page) => page.getByTestId('verification-status')

/** In the Directory tab, opens a person's account. */
async function openAccount(page: Page, name: string) {
  await tab(page, 'Directory')
  await page.getByLabel('Search accounts').fill(name.split(' ')[0])
  await page.getByTestId('user-row').filter({ hasText: name }).click()
  return page.getByTestId('user-detail')
}

/** Starts a verification from the open ticket. */
async function startVerification(page: Page, account: string, changes: string[]) {
  await panel(page).getByLabel('Account to verify').selectOption(account)
  for (const change of changes)
    await panel(page).getByLabel(change, { exact: true }).check()
  await panel(page).getByRole('button', { name: 'Start verification' }).click()
  await expect(phase(page)).toHaveAttribute('data-state', 'in-progress')
}

/** Asks for a piece of information, and checks what was said against the record. */
async function checkWhatTheySay(page: Page, check: 'badge' | 'employee-id') {
  const block = panel(page).getByTestId(`check-${check}`)
  await block.getByRole('button', { name: /^Ask / }).click()
  const said = await block.getByTestId(`answer-${check}`).textContent()
  const value = /([BE]-\d+)/.exec(said ?? '')![1]
  await block.getByRole('textbox').fill(value)
  await block.getByRole('button', { name: 'Check against the record' }).click()
}

test('verified, approved, then unlocked: the ticket resolves, and the record survives a reload', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await startUnlockTask(page)

  // Leila's ticket: verification required, and nothing verified yet.
  await openTicket(page, 'INC-3201')
  await page.getByRole('button', { name: 'Assign to me' }).click()
  await expect(phase(page)).toHaveText('Verification required')

  // Trying to unlock her straight away is refused by the Directory itself.
  let detail = await openAccount(page, 'Leila Haddad')
  await expect(detail.getByTestId('policy-box')).toContainText(
    'Unlock account needs the person’s identity verified (1 check)',
  )
  await expect(detail.getByTestId('policy-box')).not.toContainText('B-40417')
  await detail.getByRole('button', { name: 'Unlock', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Refused: to unlock account')
  await expect(detail).toContainText('Locked out')

  // The attempt is in her ticket, as a breach of the policy.
  await tab(page, 'Ticket queue')
  await openTicket(page, 'INC-3201')
  await expect(page.getByLabel('Ticket history')).toContainText('Security policy breach')
  await expect(page.getByLabel('Status')).toHaveValue('open')

  // Verify her: her account, the change, then her badge number against the record.
  await startVerification(page, 'u17', ['Unlock account'])
  await checkWhatTheySay(page, 'badge')
  await expect(phase(page)).toHaveAttribute('data-state', 'permitted')
  await expect(page.getByTestId('verification-identity')).toContainText('Verified')
  await expect(page.getByLabel('Status')).toHaveValue('open')

  // Now the unlock is allowed, and the ticket resolves by itself.
  detail = await openAccount(page, 'Leila Haddad')
  await detail.getByRole('button', { name: 'Unlock', exact: true }).click()
  await expect(detail).not.toContainText('Locked out')
  await expect(page.getByTestId('ticket-update')).toContainText(
    'INC-3201: Resolved automatically',
  )

  // Carmen: verified, but her payroll access needs her manager's approval.
  await tab(page, 'Ticket queue')
  await openTicket(page, 'INC-3202')
  await startVerification(page, 'u18', ['Unlock account'])
  await checkWhatTheySay(page, 'employee-id')
  await expect(phase(page)).toHaveAttribute('data-state', 'needs-approval')
  await expect(page.getByTestId('verification-authorisation')).toContainText(
    'Needs approval from Priya Raman',
  )
  detail = await openAccount(page, 'Carmen Ruiz')
  await detail.getByRole('button', { name: 'Unlock', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'also needs approval from Priya Raman',
  )
  await expect(detail).toContainText('Locked out')

  // Someone senior who is not her manager on record cannot approve; Priya can.
  await tab(page, 'Ticket queue')
  await openTicket(page, 'INC-3202')
  await panel(page).getByLabel('Ask for approval from').selectOption('u1')
  await panel(page).getByRole('button', { name: 'Ask for approval' }).click()
  await expect(page.getByTestId('verification-problem')).toContainText('cannot approve')
  await panel(page).getByLabel('Ask for approval from').selectOption('u3')
  await panel(page).getByRole('button', { name: 'Ask for approval' }).click()
  await expect(phase(page)).toHaveAttribute('data-state', 'permitted')
  detail = await openAccount(page, 'Carmen Ruiz')
  await detail.getByRole('button', { name: 'Unlock', exact: true }).click()
  await expect(detail).not.toContainText('Locked out')
  await expect(page.getByTestId('ticket-update')).toContainText(
    'INC-3202: Resolved automatically',
  )

  // The security log in the Directory: checks, approval, changes and the refusals.
  await page
    .getByRole('navigation', { name: 'Directory sections' })
    .getByRole('button', { name: 'Audit log' })
    .click()
  const log = page.getByTestId('security-log')
  await expect(log.locator('[data-severity="breach"]')).toHaveCount(1)
  await expect(log.locator('[data-kind="insufficient-authorization"]')).toHaveCount(1)
  await expect(log.locator('[data-kind="performed"]')).toHaveCount(2)
  await expect(log).not.toContainText('B-40417')
  await tab(page, 'Ticket queue')
  await waitUntilSaved(page)

  // Reload: the tickets, their history and the record are as they were.
  await page.reload()
  await expect(page.getByTestId('desktop')).toBeVisible()
  await openApp(page, 'Help Desk')
  await page
    .getByRole('button', { name: /account lockouts/ })
    .first()
    .click()
  await openTicket(page, 'INC-3201')
  await expect(page.getByLabel('Status')).toHaveValue('resolved')
  const history = page.getByLabel('Ticket history')
  await expect(history).toContainText('Security policy breach')
  await expect(history).toContainText(
    'The badge number given matches Leila Haddad’s record.',
  )
  await expect(phase(page)).toHaveAttribute('data-state', 'done')
  await openTicket(page, 'INC-3202')
  await expect(page.getByLabel('Status')).toHaveValue('resolved')
  await expect(page.getByLabel('Ticket history')).toContainText('Priya Raman approved')
})

test('Owen cannot be verified: his account stays locked, and the ticket waits', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await startUnlockTask(page)
  await openTicket(page, 'INC-3203')
  await startVerification(page, 'u19', ['Unlock account', 'Reset password'])

  // An old badge number: it does not match the record.
  await checkWhatTheySay(page, 'badge')
  await expect(page.getByTestId('verification-step').last()).toHaveAttribute(
    'data-passed',
    'false',
  )
  await expect(page.getByTestId('verification-step').last()).toContainText(
    'does not match',
  )

  // The mobile number he gave proves nothing; his desk does not answer.
  await panel(page)
    .getByRole('button', { name: /Call the number Owen gave/ })
    .click()
  await expect(panel(page).getByRole('status')).toContainText('not on record')
  await panel(page)
    .getByRole('button', { name: /Call the extension on record/ })
    .click()
  await expect(page.getByTestId('verification-step').last()).toContainText('No answer')
  await expect(page.getByTestId('verification-identity')).toContainText(
    'Not verified yet',
  )

  // The Directory will not unlock or reset him on that.
  const detail = await openAccount(page, 'Owen Price')
  await detail.getByRole('button', { name: 'Unlock', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('not verified')
  await detail.getByRole('button', { name: 'Reset password' }).click()
  await expect(page.getByRole('alert')).toContainText('not verified')
  await expect(detail).toContainText('Locked out')
  await expect(detail).not.toContainText('Must change password')

  // His ticket stays unresolved, with every step in its history; it waits for him.
  await tab(page, 'Ticket queue')
  await openTicket(page, 'INC-3203')
  await page.getByLabel('Status').selectOption('resolved')
  await expect(page.getByTestId('status-refused')).toContainText('not fixed yet')
  await page.getByLabel('Status').selectOption('pending')
  await expect(page.getByLabel('Status')).toHaveValue('pending')
  const history = page.getByLabel('Ticket history')
  await expect(history).toContainText('does not match Owen Price’s record')
  await expect(history).toContainText('a number the requester gave')
  await expect(history).toContainText('Security policy breach')
})
