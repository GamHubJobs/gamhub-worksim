import { copyFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { openApp, sitAtComputer } from './helpers.ts'

/**
 * The main player journey from the Phase 8 brief, in order, in one session.
 * Development shortcuts (window.__worksim) are used only to skip ahead through
 * levels and to fill in answers; each step is checked in the real interface.
 * Installing and offline use are tested on the production build (tests/pwa).
 */
test('the whole journey: new player to backup, restore, a second career and a reload', async ({
  page,
  browser,
}) => {
  test.setTimeout(300_000)

  // 1–3. A new player reads what WorkSim is, chooses a career and starts.
  await page.goto('/')
  await page.getByText('Before you start').click()
  await expect(
    page.getByText('it does not give certificates or qualifications'),
  ).toBeVisible()
  await page.getByRole('radio', { name: /Data Analysis/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()

  // 4–5. The office, and a colleague.
  await expect(page.getByTestId('office')).toBeVisible()
  await page
    .getByTestId('office-panel')
    .getByRole('button', { name: /Talk to Nina/ })
    .click()
  await expect(page.getByTestId('office-dialogue')).toContainText('Alex')
  await page.keyboard.press('Escape')

  // 6–7. The apps, and the first task arriving by email.
  await sitAtComputer(page)
  await openApp(page, 'Mail')
  await expect(page.getByTestId('mail-list').or(page.locator('body'))).toContainText(
    'Clean the customer export',
  )

  // 9–10. Progress through levels (skipped ahead), which earns achievements.
  await page.evaluate("window.__worksim.skipTo('survey-analysis')")
  await openApp(page, 'Career')
  await expect(page.getByTestId('career-title')).toHaveText('Data Analyst')
  await expect(page.getByTestId('achievement-first-delivery')).toContainText('Earned')

  // 8. A case, worked and submitted.
  await page.evaluate("window.__worksim.arriveCase('data-numbers-mismatch')")
  await openApp(page, 'Cases')
  await page.getByRole('list', { name: 'Cases' }).getByRole('button').first().click()
  const detail = page.getByTestId('case-detail')
  await page.evaluate("window.__worksim.answerCase('data-numbers-mismatch')")
  await detail.getByRole('button', { name: /^Submit to / }).click()
  await detail.getByRole('button', { name: 'Send my answer' }).click()
  await expect(detail.getByTestId('case-score')).toHaveText('100%')

  // 8. The readiness assessment: without the practical work and report, not passed.
  await openApp(page, 'Readiness')
  await page
    .getByRole('navigation', { name: 'Assessments' })
    .getByRole('button')
    .first()
    .click()
  await page.getByRole('button', { name: 'Start the assessment' }).click()
  await page.evaluate("window.__worksim.answerAssessment('ready-data-practitioner')")
  const attempt = page.getByTestId('readiness').getByTestId('case-detail')
  await attempt.getByRole('button', { name: 'Submit the assessment' }).click()
  await attempt.getByRole('button', { name: 'Submit for marking' }).click()
  await expect(page.getByTestId('assessment-feedback')).toContainText(
    'Do the work in the tool',
  )

  // 11–12. Portfolio evidence, exported as a PDF.
  await openApp(page, 'Portfolio')
  await expect(
    page
      .getByTestId('portfolio-card')
      .filter({ hasText: 'Sales says your figures don’t match' }),
  ).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Portfolio sections' })
    .getByRole('button', { name: 'Export' })
    .click()
  const exportView = page.getByTestId('export-view')
  let download = page.waitForEvent('download')
  await exportView.getByRole('button', { name: 'Download portfolio PDF' }).click()
  expect((await download).suggestedFilename()).toMatch(/portfolio\.pdf$/)

  // 13. A backup.
  await page.getByRole('button', { name: /Storage & backup/ }).click()
  download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download backup' }).click()
  const backupPath = test.info().outputPath('journey-backup.json')
  await copyFile(await (await download).path(), backupPath)
  await page.keyboard.press('Escape')

  // 14. Restored on a fresh browser profile: the career and its evidence are back.
  const freshContext = await browser.newContext()
  const fresh = await freshContext.newPage()
  await fresh.goto('/')
  await fresh.getByLabel('Your first name').fill('Sam')
  await fresh.getByRole('button', { name: 'Start my first day' }).click()
  await sitAtComputer(fresh)
  await fresh.getByRole('button', { name: /Storage & backup/ }).click()
  await fresh.getByTestId('backup-file-input').setInputFiles(backupPath)
  const safety = fresh.waitForEvent('download')
  await fresh.getByRole('button', { name: 'Replace my data with this backup' }).click()
  await safety
  await sitAtComputer(fresh)
  await openApp(fresh, 'Career')
  await expect(fresh.getByTestId('career-title')).toHaveText('Data Analyst')
  await openApp(fresh, 'Portfolio')
  await expect(
    fresh
      .getByTestId('portfolio-card')
      .filter({ hasText: 'Sales says your figures don’t match' }),
  ).toBeVisible()
  await freshContext.close()

  // 15. A second career, with the first kept.
  await openApp(page, 'Career')
  await page
    .getByTestId('career-software-development')
    .getByRole('button', { name: 'Start this career' })
    .click()
  await expect(page.getByTestId('office-panel').getByRole('heading')).toHaveText(
    'Reception',
  )
  await sitAtComputer(page)
  await openApp(page, 'Career')
  await expect(page.getByTestId('career-title')).toHaveText('Junior Developer')
  await expect(page.getByTestId('career-data-analytics')).toContainText('Data Analyst')

  // 16. After a reload, everything is where it was.
  await page.reload()
  await sitAtComputer(page)
  await openApp(page, 'Career')
  await expect(page.getByTestId('career-title')).toHaveText('Junior Developer')
  await expect(page.getByTestId('career-data-analytics')).toContainText('Data Analyst')
})
