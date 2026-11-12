import { expect, test, type Page } from '@playwright/test'
import { openApp, waitUntilSaved } from './helpers.ts'

/**
 * The Help Desk as an IT operations application: the Overview, guidance with
 * progressive hints (counted, and kept in the ticket's history), and the
 * Knowledge Base (search, open, bookmark, kept across a reload).
 */
const shots = process.env.WORKSIM_SHOTS ?? 'test-results/deskops'

async function startWifiTask(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: /IT Help Desk/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible()
  await openApp(page, 'Tasks')
  await page.evaluate(`window.__worksim.skipTo('wifi-outage')`)
  await page
    .getByRole('button', { name: /Floor 2 has lost its Wi-Fi/ })
    .first()
    .click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(page.getByTestId('helpdesk')).toBeVisible()
}

const section = (page: Page, name: string) =>
  page.getByRole('tablist').getByRole('tab', { name, exact: true }).click()

test('Overview, guidance with progressive hints, and the Knowledge Base', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startWifiTask(page)

  // The Overview: counted from the queue.
  await section(page, 'Overview')
  await expect(page.getByTestId('stat-open')).toContainText('3')
  await expect(page.getByTestId('stat-held')).toContainText('3')
  await expect(page.getByTestId('impact')).toContainText('Payroll')
  await page.screenshot({ path: `${shots}/deskops-overview.png` })
  await page
    .getByRole('table', { name: 'Tickets overview' })
    .getByRole('button', { name: /No Wi-Fi on floor 2/ })
    .click()
  await expect(page.getByTestId('helpdesk')).toBeVisible()

  // Guidance: what is still wrong, then hints one at a time.
  const guidance = page.getByTestId('guidance')
  await guidance.getByRole('button', { name: /Guidance/ }).click()
  await expect(page.getByTestId('guidance-next')).toContainText('AP-FL2 is responding')
  await expect(guidance).toContainText('takes 5% off this task’s XP')
  await guidance.getByRole('button', { name: 'Show hint 1: The problem' }).click()
  await expect(page.getByTestId('hint')).toHaveCount(1)
  await expect(page.getByTestId('hint').first()).toContainText(
    'AP-FL2 is not responding.',
  )
  await guidance.getByRole('button', { name: 'Show hint 2: Where to look' }).click()
  await guidance.getByRole('button', { name: 'Show hint 3: What to try next' }).click()
  await expect(page.getByTestId('hint').nth(2)).toContainText('ping AP-FL2 (10.20.2.5)')
  await expect(guidance).toContainText('3 hints used')
  await expect(page.getByLabel('Ticket history')).toContainText('Hint 3 of 4 opened')
  await page.screenshot({ path: `${shots}/deskops-guidance.png` })

  // The hint's article, in the Knowledge Base: read it and bookmark it.
  await guidance
    .getByRole('button', { name: /Read “No network: one user or many\?”/ })
    .click()
  const article = page.getByTestId('kb-article')
  await expect(article).toContainText('Work outwards from the user')
  await article.getByRole('button', { name: 'Bookmark' }).click()
  await expect(article.getByRole('button', { name: 'Bookmarked' })).toBeVisible()
  await article.getByRole('button', { name: /All articles/ }).click()

  // Search and filter.
  const kb = page.getByTestId('knowledge-base')
  await kb.getByLabel('Search the Knowledge Base').fill('spooler')
  await expect(kb.getByTestId('kb-result').first()).toContainText('Printer not printing')
  await kb.getByLabel('Search the Knowledge Base').fill('')
  await kb.getByLabel('Category').selectOption('bookmarks')
  await expect(kb.getByTestId('kb-result')).toHaveCount(1)
  await page.screenshot({ path: `${shots}/deskops-knowledge.png` })
  await section(page, 'Ticket queue')
  await waitUntilSaved(page)

  // After a reload: the hints used and the bookmark are kept.
  await page.reload()
  await expect(page.getByTestId('desktop')).toBeVisible()
  await openApp(page, 'Help Desk')
  await page
    .getByRole('button', { name: /Service desk: floor 2 Wi-Fi/ })
    .first()
    .click()
  await page
    .getByTestId('guidance')
    .getByRole('button', { name: /Guidance/ })
    .click()
  await expect(page.getByTestId('guidance')).toContainText('3 hints used')
  await section(page, 'Knowledge Base')
  await page
    .getByTestId('knowledge-base')
    .getByLabel('Category')
    .selectOption('bookmarks')
  await expect(page.getByTestId('kb-result')).toContainText(
    'No network: one user or many?',
  )
})
