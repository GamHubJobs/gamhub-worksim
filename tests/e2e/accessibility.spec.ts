import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { openApp, activeWindow } from './helpers.ts'

/** Runs the automated WCAG 2.1 A/AA checks on what is on screen now. */
async function audit(page: Page, screen: string, skipRules: string[] = []) {
  // Wait until the app has finished loading.
  await expect(page.getByText('Opening…', { exact: true })).toHaveCount(0)
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .disableRules(skipRules)
    .analyze()
  const problems = results.violations.map(
    (v) =>
      `${screen}: ${v.id} (${v.impact}) ${v.help}\n    ${v.nodes
        .slice(0, 8)
        .map((n) => n.target.join(' ') + ' :: ' + (n.any[0]?.message ?? ''))
        .join('\n    ')}`,
  )
  return problems
}

test('the main screens pass automated accessibility checks', async ({ page }) => {
  // About twenty audits: under a full parallel run they take several minutes.
  test.setTimeout(360_000)
  const problems: string[] = []
  await page.goto('/')
  problems.push(...(await audit(page, 'start screen')))
  await page.getByRole('radio', { name: /Office Administration/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
  problems.push(...(await audit(page, 'office')))
  await page.getByRole('button', { name: 'Help', exact: true }).click()
  problems.push(...(await audit(page, 'help')))
  await page.keyboard.press('Escape')
  await page
    .getByTestId('office-panel')
    .getByRole('button', { name: /Talk to Nina/ })
    .click()
  problems.push(...(await audit(page, 'office conversation')))
  await page.keyboard.press('Escape')
  await page
    .getByRole('navigation', { name: 'Places' })
    .getByRole('button', { name: 'Your desk' })
    .click()
  await page
    .getByTestId('office-panel')
    .getByRole('button', { name: /Use your computer/ })
    .click()
  await openApp(page, 'WorkSim AI')
  await page.getByRole('button', { name: 'How do I write a good prompt?' }).click()
  await expect(page.getByTestId('ai-answer')).toBeVisible()
  problems.push(...(await audit(page, 'WorkSim AI')))
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  problems.push(...(await audit(page, 'WorkSim AI settings')))
  await page.keyboard.press('Escape')
  await openApp(page, 'Mail')
  await page.getByRole('list').getByRole('button').first().click()
  problems.push(...(await audit(page, 'mail')))
  await openApp(page, 'Tasks')
  problems.push(...(await audit(page, 'tasks')))
  await page.evaluate("window.__worksim.arriveCase('fa-short-delivery')")
  await openApp(page, 'Cases')
  await page.getByRole('list', { name: 'Cases' }).getByRole('button').first().click()
  problems.push(...(await audit(page, 'case')))
  await page.evaluate("window.__worksim.answerCase('fa-short-delivery')")
  const detail = page.getByTestId('case-detail')
  await detail.getByRole('button', { name: /^Submit to / }).click()
  await detail.getByRole('button', { name: 'Send my answer' }).click()
  await expect(detail.getByTestId('case-score')).toBeVisible()
  problems.push(...(await audit(page, 'case result')))
  await openApp(page, 'Career')
  problems.push(...(await audit(page, 'career')))
  await page.evaluate("window.__worksim.skipTo('budget-report')")
  await openApp(page, 'Readiness')
  await page
    .getByRole('navigation', { name: 'Assessments' })
    .getByRole('button')
    .first()
    .click()
  problems.push(...(await audit(page, 'readiness')))
  await page.getByRole('button', { name: 'Start the assessment' }).click()
  const attempt = page.getByTestId('readiness').getByTestId('case-detail')
  await attempt.getByRole('button', { name: 'Submit the assessment' }).click()
  await attempt.getByRole('button', { name: 'Submit for marking' }).click()
  await expect(page.getByTestId('assessment-feedback')).toBeVisible()
  problems.push(...(await audit(page, 'readiness feedback')))
  await openApp(page, 'Portfolio')
  problems.push(...(await audit(page, 'portfolio')))
  await openApp(page, 'Docs')
  problems.push(...(await audit(page, 'docs')))
  await openApp(page, 'Sheets')
  problems.push(...(await audit(page, 'sheets')))
  expect(problems.join('\n')).toBe('')
})

/**
 * In the editors, axe's experimental “label in name” rule flags toolbar buttons
 * whose visible face is a symbol (“.0←”, “1. ≡”, “A→Z”) and slide thumbnails
 * (whose visible text is the slide itself). WCAG 2.5.3 does not count symbols
 * as text labels; buttons with visible words were fixed to match their names.
 */
const EDITOR_SKIP = ['label-content-name-mismatch']

test('the editors pass automated accessibility checks', async ({ page }) => {
  test.setTimeout(240_000)
  const problems: string[] = []
  await page.goto('/')
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await openApp(page, 'Sheets')
  await page.getByRole('button', { name: /Practice Workbook/ }).click()
  await expect(page.getByRole('grid')).toBeVisible()
  problems.push(...(await audit(page, 'sheets workbook', EDITOR_SKIP)))
  await openApp(page, 'Docs')
  await page.getByRole('button', { name: /Blank document/ }).click()
  await expect(page.getByTestId('doc-body')).toBeVisible()
  problems.push(...(await audit(page, 'docs document', EDITOR_SKIP)))
  await openApp(page, 'Slides')
  await page.getByRole('button', { name: /Monthly business review/ }).click()
  await expect(page.getByTestId('slide-canvas')).toBeVisible()
  problems.push(...(await audit(page, 'slides deck', EDITOR_SKIP)))
  expect(problems.join('\n')).toBe('')
})

const TOOLS: Array<[career: RegExp, task: string, title: RegExp, shown: string]> = [
  [/Accounting/, 'books-journals', /./, 'Books'],
  [/IT Help Desk/, 'triage-queue', /./, 'Help Desk'],
  [/IT Help Desk/, 'network-printing', /./, 'Network'],
  [/Digital Marketing/, 'campaign-budget', /./, 'Ad Campaigns'],
  [/Data Analysis/, 'studio-sql', /./, 'Data Studio'],
  [/Software Development/, 'invoice-bug', /./, 'Code'],
]

for (const [career, task, , shown] of TOOLS) {
  test(`the ${shown} tool passes automated accessibility checks (${task})`, async ({
    page,
  }) => {
    test.setTimeout(150_000)
    await page.goto('/')
    await page.getByRole('radio', { name: career }).check()
    await page.getByLabel('Your first name').fill('Alex')
    await page.getByRole('button', { name: 'Start my first day' }).click()
    await openApp(page, 'Tasks')
    await page.evaluate(`window.__worksim.skipTo('${task}')`)
    await page
      .getByTestId('task-detail')
      .getByRole('button', { name: 'Start task' })
      .click()
    // The tool opens in its own window, in front of Tasks.
    await expect(activeWindow(page).getByTestId('task-detail')).toHaveCount(0)
    await expect(activeWindow(page)).toHaveAttribute(
      'data-testid',
      /window-tool:|window-code|window-helpdesk/,
    )
    const problems = await audit(page, shown)
    expect(problems.join('\n')).toBe('')
  })
}
