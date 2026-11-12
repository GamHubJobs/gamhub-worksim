import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers.ts'

/**
 * Communications: the chat, voicemail routed to the right tickets, a support
 * call with its assessment, and the loop from a call to a ticket to a remote
 * fix to a thank-you message.
 */
const shots = process.env.WORKSIM_SHOTS ?? 'test-results/deskops'

async function startCommsTask(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: /IT Help Desk/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible()
  await openApp(page, 'Tasks')
  await page.evaluate(`window.__worksim.skipTo('service-desk-comms')`)
  await page
    .getByRole('button', { name: /Phones, voicemail and chat/ })
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

test('chat, voicemail, a call and its assessment, and a call that ends in a fix and a thank-you', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startCommsTask(page)

  // Chat: #finance is asking; post an update there.
  await section(page, 'Chat')
  const comms = page.getByTestId('comms')
  await comms.getByTestId('conversation').filter({ hasText: '#finance' }).click()
  await expect(comms.getByTestId('messages')).toContainText(
    'Is the finance shared drive down',
  )
  await comms
    .getByLabel('Message #finance')
    .fill(
      'Hi all, we know the finance shared drive is not opening and we are looking into it now. I will post an update by 10:00.',
    )
  await comms.getByRole('button', { name: 'Send' }).click()
  await expect(comms.getByTestId('messages')).toContainText(
    'I will post an update by 10:00',
  )
  await page.screenshot({ path: `${shots}/deskops-chat.png` })

  // Voicemail: Grace's is the open outage (link); Dana's is new (a ticket).
  await section(page, 'Voicemail')
  const grace = page.getByTestId('voicemail').filter({ hasText: 'Grace Mensah' })
  await grace.getByRole('button', { name: 'Listen' }).click()
  await expect(grace.getByTestId('transcript')).toContainText(
    'finance shared drive won’t open',
  )
  await grace
    .getByLabel('Link Grace Mensah’s voicemail to a ticket')
    .selectOption('INC-3401')
  await grace.getByRole('button', { name: 'Link', exact: true }).click()
  await expect(grace).toContainText('INC-3401')
  const dana = page.getByTestId('voicemail').filter({ hasText: 'Dana Kowalski' })
  await dana.getByRole('button', { name: /Dana Kowalski/ }).click()
  await dana.getByRole('button', { name: 'Listen' }).click()
  await dana.getByRole('button', { name: 'Create ticket' }).click()
  await expect(dana).toContainText('INC-3410')
  await page.screenshot({ path: `${shots}/deskops-voicemail.png` })

  // Ben's call: answer, listen and ask, plain words, next steps, a warm close.
  await section(page, 'Calls')
  await page.getByTestId('call-row').filter({ hasText: 'Ben Carter' }).click()
  await page.getByRole('button', { name: 'Answer' }).click()
  for (let i = 0; i < 4; i++) await page.getByTestId('call-option').first().click()
  await expect(page.getByTestId('call-transcript')).toContainText(
    'Great, thanks very much. Bye!',
  )
  await expect(page.getByTestId('call-assessment')).toContainText('100%')
  await page
    .getByLabel('Call notes')
    .fill(
      'Office Suite closes when saving any spreadsheet on DT-0181. Repairing it remotely.',
    )
  await page.getByRole('button', { name: 'Create ticket from call' }).click()
  await expect(page.getByTestId('call')).toContainText('Recorded in INC-3411')
  await page.screenshot({ path: `${shots}/deskops-call.png` })

  // Fix his PC: the ticket from his call resolves by itself.
  await section(page, 'Remote Desktop')
  await page.getByLabel('Computer to connect to').selectOption('DT-0181')
  await page.getByRole('button', { name: 'Connect', exact: true }).click()
  await page
    .getByTestId('remote-session')
    .getByRole('button', { name: 'Apps & features' })
    .click()
  await page
    .getByTestId('utility-apps')
    .getByTestId('app-row')
    .filter({ hasText: 'Office Suite' })
    .getByRole('button', { name: 'Repair' })
    .click()
  await expect(page.getByTestId('ticket-update')).toContainText(
    'INC-3411: Resolved automatically',
  )
  await page
    .getByTestId('remote-session')
    .getByRole('button', { name: 'Disconnect' })
    .click()

  // Ben writes to say thank you.
  await section(page, 'Chat')
  const benChat = page.getByTestId('conversation').filter({ hasText: 'Ben Carter' })
  await expect(benChat).toContainText('1')
  await benChat.click()
  await expect(page.getByTestId('messages')).toContainText(
    'It’s working again, thank you',
  )

  // The ticket queue shows the tickets that came from voicemail and the call.
  await section(page, 'Ticket queue')
  const list = page.getByRole('list', { name: 'Tickets' })
  await expect(list).toContainText('INC-3410')
  await expect(list).toContainText('INC-3411')
  await list.getByRole('button', { name: /INC-3401/ }).click()
  await expect(page.getByLabel('Ticket history')).toContainText(
    'Voicemail from Grace Mensah linked',
  )
})
