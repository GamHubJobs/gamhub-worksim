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

test('meetings: prepare in Slides, join at the right time, then the actions', async ({
  page,
}) => {
  test.setTimeout(150_000)
  await page.goto('/')
  await startCareerIfNeeded(page, 'Alex Morgan')
  await openApp(page, 'Mail')
  await page.evaluate("window.__worksim.skipTo('performance-report')")
  await page.evaluate("window.__worksim.arriveCase('mtg-fa-team')")
  await page.getByRole('button', { name: /Monthly meeting: can you present/ }).click()
  await page
    .getByTestId('mail-message')
    .getByRole('button', { name: 'Open case' })
    .click()
  const detail = page.getByTestId('case-detail')
  const meeting = detail.getByTestId('meeting-panel')
  await expect(meeting).toContainText('Meeting room 2')
  await expect(meeting).toContainText('Starts in 3 h')
  // Decisions in the room wait for the meeting.
  await expect(
    detail.getByTestId('step-question').getByRole('radio').first(),
  ).toBeDisabled()

  // Preparation happens in the real Slides app.
  await detail
    .getByRole('button', { name: /Start “Spending update” in Deck Craft/ })
    .click()
  await expect(page.getByTestId('slide-canvas')).toBeVisible()
  await openApp(page, 'Cases')
  await page
    .getByRole('list', { name: 'Cases' })
    .getByRole('button', { name: /Present the month at the team meeting/ })
    .click()

  await meeting.getByRole('button', { name: 'Work until the meeting starts' }).click()
  await meeting.getByRole('button', { name: 'Join the meeting' }).click()
  await expect(meeting).toContainText('You attended this meeting')
  await expect(
    detail.getByTestId('step-question').getByRole('radio').first(),
  ).toBeEnabled()

  await page.evaluate("window.__worksim.answerCase('mtg-fa-team')")
  await detail.getByRole('button', { name: /^Submit to / }).click()
  await detail.getByRole('button', { name: 'Send my answer' }).click()
  const result = detail.getByTestId('case-result')
  await expect(result).toBeVisible()
  // The slides were left as the template, and the result says what they lacked.
  await expect(result).toContainText('travel')
})

test('incidents: integrity under pressure, worked through the real forms', async ({
  page,
}) => {
  test.setTimeout(150_000)
  await page.goto('/')
  await page.getByRole('radio', { name: /Data Analysis/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await openApp(page, 'Mail')
  await page.evaluate("window.__worksim.skipTo('studio-statistics')")
  await page.evaluate("window.__worksim.arriveCase('inc-data-preferred-conclusion')")
  await page.getByRole('button', { name: /Tweak the chart for the board/ }).click()
  await page
    .getByTestId('mail-message')
    .getByRole('button', { name: 'Open case' })
    .click()
  const detail = page.getByTestId('case-detail')
  const misleading = detail.getByTestId('step-misleading')
  await misleading.getByLabel(/Starting the axis at £180k/).check()
  await misleading.getByLabel(/Leaving out March/).check()
  await misleading.getByLabel(/new-client sales/).check()
  // A tempting wrong choice first, then the right one.
  await detail
    .getByTestId('step-response')
    .getByLabel(/Make the changes/)
    .check()
  await detail
    .getByTestId('step-response')
    .getByLabel(/Keep the honest chart/)
    .check()
  const reply = detail.getByRole('textbox', { name: /Reply to Chloe Martin/ })
  await reply.fill(
    'Hi Chloe, I understand why you want the board to see the team’s progress. I can’t start the axis at £180k or leave out March, because together they would make total sales look like they grew when they were flat, and the board needs to rely on the pack. But there is real growth to show: new-client sales rose from £20k to £34k a month, and I will add that chart for the board.',
  )
  await reply.blur()
  await detail.getByRole('button', { name: 'Submit to Chloe Martin' }).click()
  await detail.getByRole('button', { name: 'Send my answer' }).click()
  await expect(detail.getByTestId('case-score')).toHaveText('100%')
  await expect(page.getByTestId('indicator-risk')).toHaveText('24')
})

const INCIDENTS: Array<
  [career: RegExp, levelTask: string, caseId: string, subject: RegExp]
> = [
  [/IT Help Desk/, 'network-intranet', 'inc-it-suspicious-login', /odd sign-ins/],
  [/Digital Marketing/, 'funnel-analysis', 'inc-mkt-overspend', /£3,000 overspend/],
  [/Accounting/, 'month-end-close', 'inc-acc-bad-debt', /Steelway: leave it until July/],
  [
    /Office Administration/,
    'petty-cash',
    'inc-fa-colleague-error',
    /Payment received: only £48/,
  ],
  [
    /Software Development/,
    'billing-report',
    'inc-dev-wrong-report',
    /Your monthly report is wrong/,
  ],
]

for (const [career, levelTask, caseId, subject] of INCIDENTS) {
  test(`every career has incidents: ${caseId}`, async ({ page }) => {
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
    await page.evaluate(`window.__worksim.answerCase('${caseId}')`)
    await detail.getByRole('button', { name: /^Submit to / }).click()
    await detail.getByRole('button', { name: 'Send my answer' }).click()
    await expect(detail.getByTestId('case-score')).toHaveText('100%')
  })
}

test('leadership: delegate, review a colleague’s work and give feedback', async ({
  page,
}) => {
  test.setTimeout(150_000)
  await page.goto('/')
  await page.getByRole('radio', { name: /IT Help Desk/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await openApp(page, 'Mail')
  // Service Desk Lead, the top level.
  await page.evaluate("window.__worksim.skipTo('outage-triage')")
  await page.evaluate("window.__worksim.arriveCase('lead-it-queue')")
  await page.getByRole('button', { name: /The desk is yours this week/ }).click()
  await page
    .getByTestId('mail-message')
    .getByRole('button', { name: 'Open case' })
    .click()
  const detail = page.getByTestId('case-detail')
  const assign = (item: RegExp, person: string) =>
    detail.getByRole('combobox', { name: item }).selectOption({ label: person })
  await assign(/Assign: Set up the directors/, 'Nadia Okoye')
  await assign(/Assign: Replace the floor 2 switch/, 'Ben Carter')
  await assign(/Assign: Clear the hardware repair backlog/, 'Tom Hughes')
  await assign(/Assign: Swap the toner/, 'Tom Hughes')
  const review = detail.getByTestId('step-review')
  await review.getByLabel(/ignored that the user had already restarted/).check()
  await review.getByLabel(/closed without the user confirming/).check()
  await detail
    .getByTestId('step-complaint')
    .getByLabel(/Reopen the ticket and help the user today/)
    .check()
  const feedback = detail.getByRole('textbox', { name: /Reply to Tom Hughes/ })
  await feedback.fill(
    'Hi Tom, thanks for clearing so much of the hardware backlog; you are the quickest fixer on the team. One thing to work on: on INC-4410 the user had already restarted twice, so please read the whole ticket first, and only close it once the user can confirm it is fixed. Shall we look at a couple of replies together on Thursday?',
  )
  await feedback.blur()
  await detail.getByRole('button', { name: /^Submit to / }).click()
  await detail.getByRole('button', { name: 'Send my answer' }).click()
  await expect(detail.getByTestId('case-score')).toHaveText('100%')
})

const LEADERSHIP: Array<
  [career: RegExp, levelTask: string, caseId: string, subject: RegExp]
> = [
  [
    /Office Administration/,
    'budget-consolidate',
    'lead-fa-month-end',
    /Month-end: over to you/,
  ],
  [/Accounting/, 'books-month-end-close', 'lead-acc-review', /Over to you: reviews/],
  [/Digital Marketing/, 'launch-analytics', 'lead-mkt-team', /Your team’s campaigns/],
  [/Data Analysis/, 'churn-clean', 'lead-data-team', /The team’s work queue/],
  [/Software Development/, 'mileage-tests', 'lead-dev-team', /Sprint planning is yours/],
]

for (const [career, levelTask, caseId, subject] of LEADERSHIP) {
  test(`every career leads at the top: ${caseId}`, async ({ page }) => {
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
    await page.evaluate(`window.__worksim.answerCase('${caseId}')`)
    await detail.getByRole('button', { name: /^Submit to / }).click()
    await detail.getByRole('button', { name: 'Send my answer' }).click()
    await expect(detail.getByTestId('case-score')).toHaveText('100%')
  })
}

test('the programme: two stages, the board, and one project in the portfolio', async ({
  page,
}) => {
  test.setTimeout(150_000)
  await page.goto('/')
  await page.getByRole('radio', { name: /IT Help Desk/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await openApp(page, 'Mail')
  await page.evaluate("window.__worksim.skipTo('network-intranet')")
  await page.evaluate("window.__worksim.arriveCase('prog-it-equipment')")
  await page.getByRole('button', { name: /Manchester programme: IT’s part/ }).click()
  await page
    .getByTestId('mail-message')
    .getByRole('button', { name: 'Open case' })
    .click()
  const detail = page.getByTestId('case-detail')
  const board = detail.getByTestId('programme-board')
  await expect(
    board.getByRole('row', { name: /Technology and equipment You/ }),
  ).toContainText('in progress')
  await expect(board).toContainText('Recruitment and onboarding')

  // Stage 1, the laptop order through the real form.
  for (const [label, value] of [
    ['Standard laptops', '10'],
    ['Analyst laptops', '10'],
    ['Total laptop cost (£)', '27,000'],
  ]) {
    const box = detail.getByRole('textbox', { name: label })
    await box.fill(value)
    await box.blur()
  }
  await detail
    .getByRole('combobox', { name: 'Needed by' })
    .selectOption('The week before 1 September')
  await detail
    .getByTestId('step-transfers')
    .getByLabel(/update their office location/)
    .check()
  await detail.getByRole('button', { name: /^Submit to / }).click()
  await detail.getByRole('button', { name: 'Send my answer' }).click()
  await expect(detail.getByTestId('case-score')).toHaveText('100%')
  await expect(
    board.getByRole('row', { name: /Technology and equipment You/ }),
  ).toContainText('delivered')

  // Stage 2 arrives by itself.
  await openApp(page, 'Mail')
  await page
    .getByRole('button', { name: /Programme review: opening two weeks earlier/ })
    .click()
  await page
    .getByTestId('mail-message')
    .getByRole('button', { name: 'Open case' })
    .click()
  await page.evaluate("window.__worksim.answerCase('prog-it-review')")
  await detail.getByRole('button', { name: /^Submit to / }).click()
  await detail.getByRole('button', { name: 'Send my answer' }).click()
  await expect(detail.getByTestId('case-score')).toHaveText('100%')

  await openApp(page, 'Portfolio')
  const project = page
    .getByTestId('portfolio-card')
    .filter({ hasText: 'Opening the Manchester office' })
  await expect(project).toContainText('Project')
  await project.click()
  await expect(page.getByTestId('project-stages').getByRole('button')).toHaveCount(2)
})

const PROGRAMME_PARTS: Array<
  [career: RegExp, levelTask: string, stages: [string, string]]
> = [
  [/Office Administration/, 'savings-proposal', ['prog-fa-budget', 'prog-fa-review']],
  [/Accounting/, 'books-payroll', ['prog-acc-setup', 'prog-acc-review']],
  [/Digital Marketing/, 'funnel-analysis', ['prog-mkt-launch', 'prog-mkt-review']],
  [/Data Analysis/, 'portfolio-review', ['prog-data-case', 'prog-data-review']],
  [/Software Development/, 'billing-report', ['prog-dev-systems', 'prog-dev-review']],
]

for (const [career, levelTask, stages] of PROGRAMME_PARTS) {
  test(`every career has a part in the programme: ${stages[0]}`, async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto('/')
    await page.getByRole('radio', { name: career }).check()
    await page.getByLabel('Your first name').fill('Alex')
    await page.getByRole('button', { name: 'Start my first day' }).click()
    await openApp(page, 'Cases')
    await page.evaluate(`window.__worksim.skipTo('${levelTask}')`)
    await page.evaluate(`window.__worksim.arriveCase('${stages[0]}')`)
    for (const id of stages) {
      await page
        .getByRole('list', { name: 'Cases' })
        .getByRole('button', { name: /^Manchester office.* Open Programme/ })
        .first()
        .click()
      const detail = page.getByTestId('case-detail')
      await expect(detail.getByTestId('programme-board')).toBeVisible()
      await page.evaluate(`window.__worksim.answerCase('${id}')`)
      await detail.getByRole('button', { name: /^Submit to / }).click()
      await detail.getByRole('button', { name: 'Send my answer' }).click()
      await expect(detail.getByTestId('case-score')).toHaveText('100%')
      await page.evaluate('window.__worksim.passTime(1)')
    }
    await openApp(page, 'Portfolio')
    await expect(
      page
        .getByTestId('portfolio-card')
        .filter({ hasText: 'Opening the Manchester office' }),
    ).toContainText('Project')
  })
}

test('cases in the office: a deadline reminder, the whiteboard and the player’s authority', async ({
  page,
}) => {
  test.setTimeout(150_000)
  await page.goto('/')
  await page.getByRole('radio', { name: /Office Administration/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await openApp(page, 'Career')
  await expect(page.getByTestId('authority')).toContainText(
    'You cannot approve spending yet',
  )
  await page.evaluate("window.__worksim.arriveCase('fa-short-delivery')")
  await page.evaluate('window.__worksim.passTime(5 * 60 + 15)')

  // A reminder at the top of the computer opens the case.
  const reminder = page
    .getByTestId('notices')
    .getByRole('status')
    .filter({ hasText: 'is due in 45 min' })
  await expect(reminder).toBeVisible()
  await reminder.getByRole('button', { name: 'Open the case' }).click()
  await expect(
    page.getByTestId('case-detail').getByRole('heading', { level: 2 }),
  ).toBeVisible()

  // The team whiteboard lists it too.
  await page.getByRole('button', { name: 'Leave desk' }).click()
  const panel = page.getByTestId('office-panel')
  await page
    .getByRole('navigation', { name: 'Places' })
    .getByRole('button', { name: 'Your desk' })
    .click()
  await panel.getByRole('button', { name: 'Read the team whiteboard' }).click()
  const dialogue = page.getByTestId('office-dialogue')
  await expect(dialogue).toContainText('Case: ')
  // The office clock keeps running at the computer, so a minute or two may have passed.
  await expect(dialogue).toContainText(/due in 4\d min/)
  await dialogue.getByRole('button', { name: 'Open Cases' }).click()
  await expect(page.getByRole('heading', { name: 'Cases', level: 1 })).toBeVisible()
})
