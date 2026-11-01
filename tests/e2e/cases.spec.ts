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

const CLIENT_CASES: Array<
  [career: RegExp, caseId: string, subject: RegExp, title: string]
> = [
  [
    /Accounting/,
    'acc-statement-dispute',
    /Your statement is wrong/,
    'A client disputes their statement',
  ],
  [
    /IT Help Desk/,
    'it-ticket-chaser',
    /Still waiting: INC-1984/,
    'A colleague chases an unresolved ticket',
  ],
  [
    /Digital Marketing/,
    'mkt-brief-change',
    /Small change to our campaign/,
    'A client changes the brief mid-campaign',
  ],
  [
    /Data Analysis/,
    'data-numbers-mismatch',
    /Your report is £30k short/,
    'Sales says your figures don’t match Finance’s',
  ],
  [
    /Software Development/,
    'dev-vague-bug',
    /Timesheet app broken AGAIN/,
    'A vague bug report',
  ],
  [
    /Office Administration/,
    'fa-expense-query',
    /Why was my taxi claim rejected/,
    'An employee queries a rejected expense claim',
  ],
]

for (const [career, caseId, subject, title] of CLIENT_CASES) {
  test(`every career has client cases: ${caseId}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/')
    await page.getByRole('radio', { name: career }).check()
    await page.getByLabel('Your first name').fill('Alex')
    await page.getByRole('button', { name: 'Start my first day' }).click()
    await openApp(page, 'Mail')
    await page.evaluate(`window.__worksim.arriveCase('${caseId}')`)
    await page.getByRole('button', { name: subject }).click()
    await page
      .getByTestId('mail-message')
      .getByRole('button', { name: 'Open case' })
      .click()
    const detail = page.getByTestId('case-detail')
    await expect(detail.getByRole('heading', { name: title })).toBeVisible()
    // The model answers (each step form is exercised in the test above).
    await page.evaluate(`window.__worksim.answerCase('${caseId}')`)
    await detail.getByRole('button', { name: /^Submit to / }).click()
    await detail.getByRole('button', { name: 'Send my answer' }).click()
    await expect(detail.getByTestId('case-score')).toHaveText('100%')
    await openApp(page, 'Portfolio')
    await expect(
      page.getByTestId('portfolio-card').filter({ hasText: title }),
    ).toBeVisible()
  })
}

test('operations: approvals follow policy, authority and budgets', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await startCareerIfNeeded(page, 'Alex Morgan')
  await openApp(page, 'Mail')
  // A Junior: approval limit £500.
  await page.evaluate("window.__worksim.skipTo('budget-report')")
  await page.evaluate("window.__worksim.arriveCase('ops-fa-purchases')")
  await page.getByRole('button', { name: /Purchase requests for you to decide/ }).click()
  await page
    .getByTestId('mail-message')
    .getByRole('button', { name: 'Open case' })
    .click()
  const detail = page.getByTestId('case-detail')
  const authority = detail.getByTestId('authority')
  await expect(authority).toContainText('You can approve up to £500')
  await expect(authority).toContainText(
    'Finance & Administration: £3,600 left this quarter',
  )

  const decide = (request: RegExp, decision: string) =>
    detail.getByRole('combobox', { name: request }).selectOption(decision)
  await decide(/Stationery restock/, 'approve')
  await decide(/Ergonomic chair/, 'approve')
  await decide(/Team celebration/, 'reject')
  await decide(/Replacement printer/, 'escalate')
  await decide(/Tablet for a manager/, 'reject')
  const reply = detail.getByRole('textbox', { name: /Reply to Ben/ })
  await reply.fill(
    'Hi Ben, thanks for organising a celebration for the team. I can’t approve this request as it is, because the purchasing policy doesn’t allow company money to be spent on alcohol. If you resubmit it for the meal without the wine, I will approve it straight away. Sorry I can’t do more!',
  )
  await reply.blur()
  await detail.getByRole('button', { name: 'Submit to Priya Raman' }).click()
  await detail.getByRole('button', { name: 'Send my answer' }).click()
  await expect(detail.getByTestId('case-score')).toHaveText('100%')
  await expect(page.getByTestId('indicator-discipline')).toHaveText('73')
})

const OPERATIONS: Array<
  [career: RegExp, levelTask: string, caseId: string, subject: RegExp]
> = [
  [
    /Accounting/,
    'depreciation-schedule',
    'ops-acc-payment-run',
    /Payment run: your approval/,
  ],
  [
    /IT Help Desk/,
    'directory-leaver',
    'ops-it-equipment',
    /Equipment requests for your approval/,
  ],
  [
    /Digital Marketing/,
    'seo-fixes',
    'ops-mkt-agency',
    /Marketing spend for your approval/,
  ],
  [/Data Analysis/, 'studio-sql', 'ops-data-purchases', /Purchases for your approval/],
  [
    /Software Development/,
    'working-days-tests',
    'ops-dev-cloud',
    /Cloud bill and tool requests/,
  ],
]

for (const [career, levelTask, caseId, subject] of OPERATIONS) {
  test(`every career has operations work: ${caseId}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/')
    await page.getByRole('radio', { name: career }).check()
    await page.getByLabel('Your first name').fill('Alex')
    await page.getByRole('button', { name: 'Start my first day' }).click()
    await openApp(page, 'Mail')
    await page.evaluate(`window.__worksim.skipTo('${levelTask}')`)
    await page.evaluate(`window.__worksim.arriveCase('${caseId}')`)
    await page.getByRole('button', { name: subject }).click()
    await page
      .getByTestId('mail-message')
      .getByRole('button', { name: 'Open case' })
      .click()
    const detail = page.getByTestId('case-detail')
    await expect(detail.getByTestId('authority')).toContainText(
      'You can approve up to £500',
    )
    await page.evaluate(`window.__worksim.answerCase('${caseId}')`)
    await detail.getByRole('button', { name: /^Submit to / }).click()
    await detail.getByRole('button', { name: 'Send my answer' }).click()
    await expect(detail.getByTestId('case-score')).toHaveText('100%')
  })
}

test('workflows: a wrong hand-off comes back from the next department', async ({
  page,
}) => {
  test.setTimeout(150_000)
  await page.goto('/')
  await startCareerIfNeeded(page, 'Alex Morgan')
  await openApp(page, 'Mail')
  await page.evaluate("window.__worksim.skipTo('petty-cash')")
  await page.evaluate("window.__worksim.arriveCase('wf-fa-purchase-order')")
  await page.getByRole('button', { name: /Approved: new filing cabinets/ }).click()
  await page
    .getByTestId('mail-message')
    .getByRole('button', { name: 'Open case' })
    .click()
  const detail = page.getByTestId('case-detail')
  await expect(detail.getByTestId('step-handoff')).toContainText(
    'To: Meadow Office Supplies and Accounting',
  )

  // The purchase order, with the total wrongly entered without VAT.
  await detail
    .getByRole('combobox', { name: 'Supplier' })
    .selectOption('Meadow Office Supplies')
  for (const [label, value] of [
    ['Net total (£)', '720'],
    ['VAT at 20% (£)', '144'],
    ['Total including VAT (£)', '720'],
  ]) {
    const box = detail.getByRole('textbox', { name: label })
    await box.fill(value)
    await box.blur()
  }
  await detail.getByRole('combobox', { name: 'Budget code' }).selectOption('OPS-FURN')
  await detail.getByRole('button', { name: /^Submit to / }).click()
  await detail.getByRole('button', { name: 'Send my answer' }).click()
  await expect(detail.getByTestId('case-result')).toContainText('£720 + £144 = £864')

  // Accounting comes back: the supplier's invoice doesn't match the order.
  await openApp(page, 'Mail')
  await page.getByRole('button', { name: /Invoice on hold: PO mismatch/ }).click()
  await expect(page.getByTestId('mail-message')).toContainText('Daniel Okoro')
})
