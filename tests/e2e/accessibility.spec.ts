import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers.ts'

/** Runs the automated WCAG 2.1 A/AA checks on what is on screen now. */
async function audit(page: Page, screen: string) {
  // Wait until the app has finished loading.
  await expect(page.getByText('Opening…', { exact: true })).toHaveCount(0)
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
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
  test.setTimeout(240_000)
  const problems: string[] = []
  await page.goto('/')
  problems.push(...(await audit(page, 'start screen')))
  await page.getByRole('radio', { name: /Office Administration/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('office')).toBeVisible()
  problems.push(...(await audit(page, 'office')))
  await page
    .getByTestId('office-panel')
    .getByRole('button', { name: /Talk to Nina/ })
    .click()
  problems.push(...(await audit(page, 'office conversation')))
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
