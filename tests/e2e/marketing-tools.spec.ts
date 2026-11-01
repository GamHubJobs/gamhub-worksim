import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers.ts'

async function startTask(page: Page, id: string, title: RegExp, testId: string) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: /Digital Marketing/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible()
  await openApp(page, 'Tasks')
  await page.evaluate(`window.__worksim.skipTo('${id}')`)
  await page.getByRole('button', { name: title }).first().click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(page.getByTestId(testId)).toBeVisible()
}

async function submit(page: Page) {
  await page.getByRole('button', { name: /Submit to Sofia/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  return page.getByTestId('submission-results').getByTestId('score')
}

test('Social Planner: the launch week written and scheduled', async ({ page }) => {
  test.setTimeout(240_000)
  await startTask(page, 'social-launch', /Schedule the launch week/, 'social')
  const offer =
    'Book a free 30-minute review and get 20% off with code SPRING20: cobaltridge.example/spring'
  const posts: Array<
    [channel: string, day: string, time: string, text: string, image?: string]
  > = [
    ['LinkedIn', '2026-04-20', '08:30', `Spring planning starts here. ${offer}`],
    ['X', '2026-04-20', '12:30', offer],
    [
      'Instagram',
      '2026-04-21',
      '18:30',
      'Free business review this spring, 20% off with SPRING20. Link in bio.',
      'spring-banner.png',
    ],
    ['X', '2026-04-22', '13:15', `Reminder: ${offer}`],
    [
      'LinkedIn',
      '2026-04-23',
      '09:00',
      `“Three changes in one week.” Last call: ${offer}`,
    ],
  ]
  const composer = page.getByTestId('composer')
  for (const [channel, day, time, text, image] of posts) {
    await page.getByRole('button', { name: `New ${channel} post` }).click()
    await composer.getByLabel('Post text').fill(text)
    if (image) await composer.getByLabel('Image').selectOption(image)
    await composer.getByLabel('Day').selectOption(day)
    await composer.getByLabel('Time').fill(time)
    await composer.getByRole('button', { name: 'Schedule' }).click()
    await expect(composer).toContainText('scheduled')
  }
  // The maintenance window is enforced.
  await page.getByRole('button', { name: 'New X post' }).click()
  await composer.getByLabel('Post text').fill('Test')
  await composer.getByLabel('Day').selectOption('2026-04-22')
  await composer.getByLabel('Time').fill('11:30')
  await composer.getByRole('button', { name: 'Schedule' }).click()
  await expect(page.getByRole('alert')).toContainText('maintenance')
  await composer.getByRole('button', { name: 'Delete' }).click()

  await page
    .getByRole('navigation', { name: 'Social Planner sections' })
    .getByRole('button', { name: 'Calendar' })
    .click()
  await expect(page.getByTestId('social-calendar')).toContainText('18:30 Instagram')

  await expect(await submit(page)).toHaveText('100%')
})

test('Ad Campaigns: losers paused, budget moved, the month on budget', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await startTask(page, 'campaign-budget', /Rescue the April ad budget/, 'campaigns')
  await page
    .getByRole('navigation', { name: 'Ad Campaigns sections' })
    .getByRole('button', { name: 'Campaigns' })
    .click()
  await expect(page.getByTestId('pacing')).toContainText('over budget')
  for (const name of [
    'Social: lookalike audience',
    'Display: business news sites',
    'Social: finance job titles',
  ]) {
    await page.getByRole('switch', { name: `${name} on` }).uncheck()
  }
  const budget = page.getByLabel('Search: advisory services daily budget')
  await budget.fill('300')
  await budget.press('Enter')
  await expect(page.getByTestId('pacing')).toContainText('under budget (97%)')
  await expect(await submit(page)).toHaveText('100%')
})

test('SEO Audit: fixes only count once the site is crawled again', async ({ page }) => {
  test.setTimeout(240_000)
  await startTask(page, 'seo-fixes', /Get the website ready for search/, 'seo')
  await page.getByTestId('seo-issues').getByRole('button', { name: 'Run crawl' }).click()
  await expect(page.getByTestId('crawl-summary')).toContainText('15 issues')
  const nav = page.getByRole('navigation', { name: 'SEO Audit sections' })
  await nav.getByRole('button', { name: 'Redirects' }).click()
  await page.getByLabel('Redirect from').selectOption('/spring-offer-2025')
  await page.getByLabel('Redirect to').selectOption('/spring-offer')
  await page.getByRole('button', { name: 'Add redirect' }).click()
  await expect(page.getByTestId('redirect')).toContainText(
    '/spring-offer-2025 → /spring-offer',
  )
  await nav.getByRole('button', { name: 'Site audit' }).click()
  await expect(page.getByTestId('crawl-summary')).toContainText('15 issues')
  await page
    .getByTestId('seo-issues')
    .getByRole('button', { name: 'Crawl again' })
    .click()
  await expect(page.getByTestId('crawl-summary')).toContainText('13 issues')
  // Open a page from the audit and fix its title.
  await page.getByRole('button', { name: '/spring-offer', exact: true }).first().click()
  const editor = page.getByTestId('page-editor')
  await editor
    .getByLabel('Title')
    .fill('Free business review with a senior adviser | Cobalt Ridge')
  await editor.getByLabel('Main heading').click()
  await expect(editor).toContainText('Free business review with a senior adviser')
})
