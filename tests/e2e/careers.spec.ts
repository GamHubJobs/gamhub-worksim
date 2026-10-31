import { expect, test, type Page } from '@playwright/test'
import {
  cell,
  enterValue,
  openApp,
  sitAtComputer,
  startCareerIfNeeded,
} from './helpers.ts'

const apps = (page: Page) => page.getByRole('navigation', { name: 'Apps' })

async function startCareer(page: Page, name: string, career: string) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: new RegExp(career) }).check()
  await page.getByLabel('Your first name').fill(name)
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible()
}

test('an Accounting career: its own manager, tools and a first task done end to end', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await startCareer(page, 'Alex Morgan', 'Accounting')

  // The department's manager talks to the new starter in the office.
  await page
    .getByRole('navigation', { name: 'Places' })
    .getByRole('button', { name: 'Daniel’s office' })
    .click()
  await page
    .getByTestId('office-panel')
    .getByRole('button', { name: /Talk to Daniel/ })
    .click()
  await expect(page.getByTestId('office-dialogue')).toContainText('Daniel Okoro')
  await expect(page.getByTestId('office-dialogue')).toContainText(
    'Record the week’s transactions',
  )
  await page
    .getByTestId('office-dialogue')
    .getByRole('button', { name: 'Thanks!' })
    .click()

  // The dock has the tools this career uses.
  await sitAtComputer(page)
  await expect(apps(page).getByRole('button', { name: /^Docs/ })).toBeVisible()
  await expect(apps(page).getByRole('button', { name: /^Slides/ })).toHaveCount(0)

  // The welcome email describes this department.
  await openApp(page, 'Mail')
  await page.getByRole('button', { name: /Welcome to Cobalt Ridge/ }).click()
  await expect(page.getByTestId('mail-message')).toContainText(
    'join the Accounting team as an Accounts Trainee',
  )

  // The first task: double-entry bookkeeping.
  await page.getByRole('button', { name: /Your first task: the October journal/ }).click()
  await page
    .getByTestId('mail-message')
    .getByRole('button', { name: 'Open task' })
    .click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(page.getByTestId('sheet-grid')).toBeVisible()

  // Accounts come from a dropdown list.
  await cell(page, 'D2').click()
  await page.getByRole('button', { name: 'Choose a value' }).click()
  await page
    .getByRole('listbox', { name: 'Allowed values' })
    .getByRole('option', { name: 'Office supplies', exact: true })
    .click()
  await expect(cell(page, 'D2')).toHaveText('Office supplies')
  const entries: Array<[string, string]> = [
    ['Office supplies', 'Bank'],
    ['Accounts receivable', 'Consulting revenue'],
    ['Rent expense', 'Bank'],
    ['Bank', 'Accounts receivable'],
    ['IT expense', 'Accounts payable'],
    ['Accounts payable', 'Bank'],
    ['Accounts receivable', 'Consulting revenue'],
    ['Travel expense', 'Bank'],
  ]
  for (const [i, [debit, credit]] of entries.entries()) {
    if (i > 0) await enterValue(page, `D${i + 2}`, debit)
    await enterValue(page, `E${i + 2}`, credit)
  }

  await page.getByRole('tab', { name: 'Ledger' }).click()
  await enterValue(page, 'B2', '=SUMIF(Journal!$D$2:$D$9, A2, Journal!$C$2:$C$9)', '4800')
  await enterValue(page, 'C2', '=SUMIF(Journal!$E$2:$E$9, A2, Journal!$C$2:$C$9)', '3770')
  await enterValue(page, 'D2', '=B2-C2', '1030')
  await cell(page, 'B2').click()
  await cell(page, 'D9').click({ modifiers: ['Shift'] })
  await page.keyboard.press('Control+d')
  await enterValue(page, 'B11', '=SUM(B2:B9)', '17220')
  await enterValue(page, 'C11', '=SUM(C2:C9)', '17220')
  await enterValue(page, 'D11', '=SUM(D2:D9)', '0')

  await page.getByRole('button', { name: /Submit to Daniel/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  const results = page.getByTestId('submission-results')
  await expect(results.getByTestId('score')).toHaveText('100%')
})

test('switching careers keeps each one’s progress, colleagues and files', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam')
  await openApp(page, 'Docs')
  await page.getByRole('button', { name: /Business letter/ }).click()
  await expect(page.getByTestId('document-title')).toHaveText('Letter')
  await openApp(page, 'Career')
  await expect(page.getByTestId('career-title')).toHaveText('Finance & Admin Intern')

  // Start Accounting: a new first day, in a different team.
  await page
    .getByTestId('career-accounting')
    .getByRole('button', { name: 'Start this career' })
    .click()
  await expect(page.getByTestId('office-panel').getByRole('heading')).toHaveText(
    'Reception',
  )
  await sitAtComputer(page)
  await openApp(page, 'Career')
  await expect(page.getByTestId('career-title')).toHaveText('Accounts Trainee')
  await expect(page.getByTestId('colleague-manager')).toContainText('Daniel Okoro')
  // Finance's files are not in this career's Docs.
  await openApp(page, 'Docs')
  await expect(page.getByTestId('doc-files')).not.toContainText('Letter')

  // Back to Finance: everything is where it was.
  await openApp(page, 'Career')
  await page
    .getByTestId('career-office-admin-finance')
    .getByRole('button', { name: 'Switch to this career' })
    .click()
  await sitAtComputer(page)
  await openApp(page, 'Career')
  await expect(page.getByTestId('career-title')).toHaveText('Finance & Admin Intern')
  await expect(page.getByTestId('colleague-manager')).toContainText('Priya Raman')
  await openApp(page, 'Docs')
  await expect(page.getByTestId('doc-files')).toContainText('Letter')

  // After a reload, the last career played is still the one in use.
  await page.reload()
  await sitAtComputer(page)
  await openApp(page, 'Career')
  await expect(page.getByTestId('career-title')).toHaveText('Finance & Admin Intern')
})

test('an IT Help Desk career: triage a ticket queue in the Help Desk app', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await startCareer(page, 'Alex Morgan', 'IT Help Desk')
  await openApp(page, 'Tasks')
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  const desk = page.getByTestId('helpdesk')
  await expect(desk).toBeVisible()
  await expect(
    desk.getByRole('list', { name: 'Tickets' }).getByRole('button'),
  ).toHaveCount(8)

  const triage: Array<[string, string, string]> = [
    ['INC-2041', 'P1', 'Network'],
    ['INC-2042', 'P2', 'Access'],
    ['INC-2043', 'P3', 'Hardware'],
    ['INC-2044', 'P1', 'Security'],
    ['INC-2045', 'P4', 'Software'],
    ['INC-2046', 'P3', 'Email'],
    ['INC-2047', 'P3', 'Network'],
    ['INC-2048', 'P4', 'Access'],
  ]
  for (const [id, priority, category] of triage) {
    await desk.getByRole('button', { name: new RegExp(id) }).click()
    await desk.getByLabel('Priority').selectOption(priority)
    await desk.getByLabel('Category').selectOption(category)
  }
  // The phishing report: escalate and reply.
  await desk.getByRole('button', { name: /INC-2044/ }).click()
  await desk.getByLabel('Status').selectOption('escalated')
  await desk
    .getByLabel('Reply to Liam')
    .fill(
      'Hi Liam, thank you for reporting this. It is a phishing email, so please delete it without clicking any link. IT will never ask for your password by email. I have passed it to our Security team.',
    )
  await desk.getByLabel('Internal note').click()
  await expect(
    desk.getByRole('list', { name: 'Tickets' }).getByRole('button', { name: /INC-2044/ }),
  ).toContainText('Escalated')

  await page.getByRole('button', { name: /Submit to Ravi/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByTestId('submission-results').getByTestId('score')).toHaveText(
    '100%',
  )
})

test('a Digital Marketing career: campaign metrics done end to end', async ({ page }) => {
  test.setTimeout(180_000)
  await startCareer(page, 'Alex Morgan', 'Digital Marketing')
  await openApp(page, 'Tasks')
  await expect(page.getByTestId('task-detail')).toContainText(
    'Campaign performance by channel',
  )
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(page.getByTestId('sheet-grid')).toBeVisible()

  const formulas: Array<[string, string]> = [
    ['G2', '=C2/B2'],
    ['H2', '=D2/C2'],
    ['I2', '=E2/C2'],
    ['J2', '=D2/E2'],
    ['K2', '=F2/D2'],
    ['L2', '=IF(K2<1, "Losing money", "Profitable")'],
  ]
  for (const [address, formula] of formulas) {
    await cell(page, address).click()
    await page.keyboard.type(formula)
    await page.keyboard.press('Enter')
  }
  await cell(page, 'G2').click()
  await cell(page, 'L6').click({ modifiers: ['Shift'] })
  await page.keyboard.press('Control+d')
  await expect(cell(page, 'L5')).toHaveText('Losing money')

  for (const column of ['B', 'C', 'D', 'E', 'F']) {
    await cell(page, `${column}8`).click()
    await page.keyboard.type(`=SUM(${column}2:${column}6)`)
    await page.keyboard.press('Enter')
  }
  await cell(page, 'G6').click()
  await cell(page, 'K6').click({ modifiers: ['Shift'] })
  await page.keyboard.press('Control+c')
  await cell(page, 'G8').click()
  await page.keyboard.press('Control+v')
  await enterValue(page, 'B10', '=INDEX(A2:A6, MATCH(MAX(K2:K6), K2:K6, 0))', 'Email')

  // Rates as percentages.
  for (const range of [
    ['G2', 'G6'],
    ['I2', 'I6'],
  ]) {
    await cell(page, range[0]).click()
    await cell(page, range[1]).click({ modifiers: ['Shift'] })
    await page.getByRole('button', { name: 'Percent format' }).click()
  }

  await page.getByRole('button', { name: /Submit to Sofia/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByTestId('submission-results').getByTestId('score')).toHaveText(
    '100%',
  )
})

test('a Data Analysis career: the customer export cleaned end to end', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await startCareer(page, 'Alex Morgan', 'Data Analysis')
  await openApp(page, 'Tasks')
  await expect(page.getByTestId('task-detail')).toContainText('Clean the customer export')
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(page.getByTestId('sheet-grid')).toBeVisible()

  const formulas: Array<[string, string]> = [
    ['G2', '=PROPER(TRIM(B2))'],
    ['H2', '=LOWER(TRIM(C2))'],
    ['I2', '=PROPER(TRIM(D2))'],
    ['J2', '=VALUE(SUBSTITUTE(E2, " GBP", ""))'],
    ['K2', '=IF(COUNTIF($H$2:$H$13, H2)>1, "Duplicate", "Unique")'],
  ]
  for (const [address, formula] of formulas) {
    await cell(page, address).click()
    await page.keyboard.type(formula)
    await page.keyboard.press('Enter')
  }
  await cell(page, 'G2').click()
  await cell(page, 'K13').click({ modifiers: ['Shift'] })
  await page.keyboard.press('Control+d')
  await expect(cell(page, 'G9')).toHaveText('David Clarke')
  await expect(cell(page, 'K11')).toHaveText('Duplicate')

  await page.getByRole('tab', { name: 'Summary' }).click()
  await enterValue(page, 'B1', '=COUNTA(Customers!A2:A13)', '12')
  await enterValue(page, 'B2', '=COUNTIF(Customers!K2:K13, "Duplicate")', '4')
  await cell(page, 'B3').click()
  await page.keyboard.type('=SUM(Customers!J2:J13)')
  await page.keyboard.press('Enter')
  for (const row of [6, 7, 8]) {
    await cell(page, `B${row}`).click()
    await page.keyboard.type(`=COUNTIF(Customers!$I$2:$I$13, A${row})`)
    await page.keyboard.press('Enter')
    await cell(page, `C${row}`).click()
    await page.keyboard.type(
      `=SUMIFS(Customers!$J$2:$J$13, Customers!$I$2:$I$13, A${row})`,
    )
    await page.keyboard.press('Enter')
  }
  await expect(cell(page, 'B6')).toHaveText('4')

  await page.getByRole('button', { name: /Submit to Amara/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByTestId('submission-results').getByTestId('score')).toHaveText(
    '100%',
  )
})
