import { expect, test } from '@playwright/test'
import { openApp, startCareerIfNeeded } from './helpers.ts'

test('a client case: evidence, decisions, a reply, consequences and portfolio evidence', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await page.goto('/')
  await startCareerIfNeeded(page, 'Alex Morgan')
  await openApp(page, 'Mail')
  await page.evaluate("window.__worksim.arriveCase('fa-short-delivery')")

  // The case arrives by email from an outside contact.
  await page.getByRole('button', { name: /Overdue: invoice MOS-2291/ }).click()
  const message = page.getByTestId('mail-message')
  await expect(message).toContainText('Karen Holt')
  await expect(message).toContainText('Credit Controller, Meadow Office Supplies')
  await message.getByRole('button', { name: 'Open case' }).click()

  const detail = page.getByTestId('case-detail')
  await expect(
    detail.getByRole('heading', { name: 'A supplier chases an unpaid invoice' }),
  ).toBeVisible()
  await expect(detail.getByTestId('case-deadline')).toContainText('left')
  await expect(detail.getByRole('region', { name: 'Evidence' })).toContainText(
    'Delivery note DN-8820',
  )

  // Work the case.
  const match = detail.getByTestId('step-match')
  await match.getByLabel(/charges for 6 toner cartridges/).check()
  await match.getByLabel(/5 days past its 30-day terms/).check()
  await detail.getByTestId('step-owed').getByRole('textbox').fill('£552.00')
  await detail.getByTestId('step-owed').getByRole('textbox').blur()
  await detail
    .getByTestId('step-action')
    .getByLabel(/Pay £552 today/)
    .check()
  const reply = detail.getByRole('textbox', { name: /Reply to Karen Holt/ })
  await reply.fill(
    'Dear Karen, thank you for your email. We checked invoice MOS-2291 against our purchase order and your delivery note: the paper arrived in full but only 4 of the 6 toner cartridges were delivered. We are paying £552 today for everything delivered. Please send the two missing cartridges, or a credit note for the difference. Kind regards, Alex',
  )
  await reply.blur()

  // Answers are kept if the page is reloaded before submitting.
  await expect
    .poll(() =>
      page.evaluate(`new Promise((resolve) => {
        const open = indexedDB.open('gamhub-worksim')
        open.onsuccess = () => {
          const request = open.result.transaction('profiles').objectStore('profiles').getAll()
          request.onsuccess = () => {
            const answers = request.result[0]?.work?.cases?.['fa-short-delivery']?.answers ?? {}
            resolve(Object.keys(answers).sort().join(','))
          }
        }
      })`),
    )
    .toBe('action,match,owed,reply')
  await page.reload()
  await expect(
    page.getByTestId('case-detail').getByTestId('step-owed').getByRole('textbox'),
  ).toHaveValue('£552.00')

  await page.getByRole('button', { name: 'Submit to Karen Holt' }).click()
  await page.getByRole('button', { name: 'Send my answer' }).click()
  const result = page.getByTestId('case-result')
  await expect(result.getByTestId('case-score')).toHaveText('100%')
  await expect(page.getByTestId('indicator-satisfaction')).toHaveText('72')
  await expect(page.getByTestId('indicator-discipline')).toHaveText('72')

  // Karen answers, and the work is in the portfolio as a case record.
  await openApp(page, 'Mail')
  await page.getByRole('button', { name: /Re: Overdue: invoice MOS-2291/ }).click()
  await expect(page.getByTestId('mail-message')).toContainText('Dear Alex')
  await openApp(page, 'Portfolio')
  await page
    .getByTestId('portfolio-card')
    .filter({ hasText: 'A supplier chases an unpaid invoice' })
    .click()
  const item = page.getByTestId('portfolio-item-page')
  await item.getByRole('button', { name: /^Main file: Case record/ }).click()
  await expect(item.getByTestId('evidence-viewer')).toContainText('Pay £552 today')
})
