import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { openApp, startCareerIfNeeded } from './helpers.ts'

/**
 * Real Jobs (apps/jobs, jobs/): suggestions for the player's career where they
 * live, a search with filters, an advert in full with its own link to apply,
 * saving and tracking an application (kept after a reload), a feed that is
 * down, an advert its source has closed, the CV and a cover letter, and the
 * phone. The job sites are answered here with adverts shaped as theirs are
 * (tests must not depend on what is advertised today); the game's own code
 * asks them exactly as it does for real.
 */
const now = new Date().toISOString()
const FEEDS = {
  jobicy: {
    success: true,
    jobs: [
      {
        id: 501,
        url: 'https://jobicy.com/jobs/501-junior-finance-assistant',
        jobTitle: 'Junior Finance Assistant',
        companyName: 'Acme Payments',
        companyLogo: 'https://jobicy.com/data/acme.png',
        jobIndustry: ['Finance &amp; Accounting'],
        jobType: ['Full-Time'],
        jobGeo: 'EMEA',
        jobLevel: 'Junior',
        jobDescription:
          '<p>Process invoices and expenses. Strong <b>Excel</b> skills and attention to detail. ITIL not needed.</p>',
        pubDate: now,
        salaryMin: 24000,
        salaryMax: 28000,
        salaryCurrency: 'EUR',
        salaryPeriod: 'yearly',
      },
      {
        id: 502,
        url: 'https://jobicy.com/jobs/502-us-accounts-assistant',
        jobTitle: 'Accounts Assistant',
        companyName: 'Only USA Inc',
        jobIndustry: ['Finance &amp; Accounting'],
        jobType: ['Full-Time'],
        jobGeo: 'USA',
        jobLevel: 'Junior',
        jobDescription: '<p>US residents only.</p>',
        pubDate: now,
      },
    ],
  },
  remotive: {
    'job-count': 1,
    jobs: [
      {
        id: 9001,
        url: 'https://remotive.com/remote-jobs/finance/accounts-payable-specialist-9001',
        title: 'Accounts Payable Specialist',
        company_name: 'Globex',
        category: 'Finance',
        tags: ['excel'],
        job_type: 'full_time',
        publication_date: now.slice(0, 19),
        candidate_required_location: 'Worldwide',
        salary: '',
        description: '<p>Invoices, reconciliations and bookkeeping.</p>',
      },
    ],
  },
  arbeitnow: {
    data: [
      {
        slug: 'buchhaltung-berlin-77',
        company_name: 'Berliner Bäckerei GmbH',
        title: 'Sachbearbeiter Buchhaltung (m/w/d)',
        description: '<p>Rechnungen prüfen</p>',
        remote: false,
        url: 'https://www.arbeitnow.com/jobs/companies/berliner/buchhaltung-berlin-77',
        tags: [],
        job_types: ['Vollzeit'],
        location: 'Berlin',
        created_at: Math.floor(Date.now() / 1000),
      },
    ],
  },
}

async function answerFeeds(
  page: Page,
  { remoteokDown = true, closed = [] as number[] } = {},
) {
  const asked: string[] = []
  await page.route('https://jobicy.com/**', (route) => {
    const url = route.request().url()
    asked.push(url)
    if (url.includes('/api/jobs/status'))
      return route.fulfill({
        json: {
          success: true,
          jobs: [501, 502].map((id) => ({
            id,
            status: closed.includes(id) ? 'closed' : 'active',
          })),
        },
      })
    if (url.includes('/api/jobs')) return route.fulfill({ json: FEEDS.jobicy })
    return route.fulfill({ status: 404, body: '' })
  })
  await page.route('https://remotive.com/**', (route) => {
    asked.push(route.request().url())
    return route.fulfill({ json: FEEDS.remotive })
  })
  await page.route('https://www.arbeitnow.com/**', (route) => {
    asked.push(route.request().url())
    return route.fulfill({ json: FEEDS.arbeitnow })
  })
  await page.route('https://remoteok.com/**', (route) => {
    asked.push(route.request().url())
    return remoteokDown
      ? route.fulfill({ status: 503, body: 'down' })
      : route.fulfill({ json: [{ legal: 'x' }] })
  })
  return asked
}

const app = (page: Page) => page.getByTestId('jobs-app')

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
})

test('suggestions where the player lives, an advert in full, saved and tracked across a reload', async ({
  page,
}) => {
  test.setTimeout(240_000)
  const asked = await answerFeeds(page)
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await openApp(page, 'Real Jobs')
  await expect(app(page)).toBeVisible()
  // Living in The Gambia: the EMEA and worldwide jobs, not the US-only one.
  await app(page).getByTestId('job-country').selectOption('GM')
  const cards = app(page).getByTestId('job-card')
  await expect(cards.filter({ hasText: 'Junior Finance Assistant' })).toBeVisible({
    timeout: 30_000,
  })
  await expect(cards.filter({ hasText: 'Accounts Payable Specialist' })).toBeVisible()
  await expect(cards.filter({ hasText: 'Only USA Inc' })).toHaveCount(0)
  // Why: the player's kind of work, their level, open to them; the pay as the advert gives it.
  const junior = cards.filter({ hasText: 'Junior Finance Assistant' })
  await expect(junior).toContainText(/Open to applicants where you live/)
  await expect(junior).toContainText('€24,000 – €28,000 a year')
  await expect(junior).toContainText('via Jobicy')
  // Jobicy was asked for jobs open to EMEA, in finance.
  expect(
    asked.some(
      (u) => u.includes('geo=emea') && u.includes('industry=accounting-finance'),
    ),
  ).toBe(true)
  // Remote OK is down: said so, and the others are shown.
  await expect(app(page).getByTestId('job-sources')).toContainText(
    'Remote OK (unavailable)',
  )

  // Accessible.
  const audit = await new AxeBuilder({ page })
    .include('[data-testid="jobs-app"]')
    .withTags(['wcag2a', 'wcag2aa'])
    .disableRules(['color-contrast'])
    .analyze()
  expect(audit.violations.map((v) => v.id)).toEqual([])

  // In full: the original advert's own link to apply, opening in a new tab.
  await junior
    .getByRole('button', { name: 'Junior Finance Assistant', exact: true })
    .click()
  const detail = app(page).getByTestId('job-detail')
  const apply = detail.getByTestId('apply-link')
  await expect(apply).toHaveAttribute(
    'href',
    'https://jobicy.com/jobs/501-junior-finance-assistant',
  )
  await expect(apply).toHaveAttribute('target', '_blank')
  await expect(apply).toContainText('View and apply on Jobicy')
  await expect(detail).toContainText('never applies for you')
  // How it fits: practice in the game kept apart from real requirements.
  await expect(detail.getByTestId('job-fit')).toContainText(
    'not work experience, a qualification or a certificate',
  )
  await expect(detail).toContainText('Process invoices and expenses.')
  await expect(detail).not.toContainText('<b>')

  // Saved, then tracked: applied today, a note, a reminder for today.
  await detail.getByRole('button', { name: 'Save', exact: true }).click()
  const tracking = detail.getByTestId('job-tracking')
  await expect(tracking).toBeVisible()
  await tracking.getByLabel('Where it stands').selectOption('applied')
  await expect(tracking.getByLabel('Applied on')).not.toHaveValue('')
  const today = await page.evaluate(
    "(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') })()",
  )
  await tracking.getByLabel('Remind me on').fill(today as string)
  await tracking.getByLabel('Notes').fill('Spoke to Jo in finance')
  await tracking.getByLabel('Remind me on').focus()

  // After a reload: still saved, as recorded.
  await page.waitForTimeout(1500)
  await page.reload()
  await startCareerIfNeeded(page, 'Sam Taylor')
  await openApp(page, 'Real Jobs')
  await expect(app(page).getByTestId('job-reminders')).toContainText(
    'Junior Finance Assistant',
  )
  await app(page)
    .getByRole('navigation', { name: 'Jobs sections' })
    .getByRole('button', { name: /^Saved/ })
    .click()
  const row = app(page)
    .getByTestId('saved-job')
    .filter({ hasText: 'Junior Finance Assistant' })
  await expect(row).toHaveAttribute('data-status', 'applied')
  await expect(row).toContainText('Applied')
  await row.getByRole('button', { name: 'Junior Finance Assistant', exact: true }).click()
  await expect(app(page).getByTestId('job-tracking').getByLabel('Notes')).toHaveValue(
    'Spoke to Jo in finance',
  )
})

test('a search with filters; on site in Germany; an advert closed by its source; removed', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await answerFeeds(page, { closed: [501] })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await openApp(page, 'Real Jobs')
  await app(page)
    .getByRole('navigation', { name: 'Jobs sections' })
    .getByRole('button', { name: 'Search' })
    .click()
  await app(page).getByTestId('job-country').selectOption('DE')
  await app(page).getByTestId('job-field').selectOption('office-admin-finance')
  const cards = app(page).getByTestId('job-card')
  // On site in Berlin (Arbeitnow), and remote jobs open to someone in Germany.
  await expect(cards.filter({ hasText: 'Sachbearbeiter Buchhaltung' })).toBeVisible({
    timeout: 30_000,
  })
  await expect(cards.filter({ hasText: 'Sachbearbeiter Buchhaltung' })).toContainText(
    'Berlin · On site',
  )
  await expect(cards.filter({ hasText: 'Junior Finance Assistant' })).toBeVisible()
  // Only remote ones.
  await app(page).getByRole('checkbox', { name: 'Remote' }).check()
  await expect(cards.filter({ hasText: 'Sachbearbeiter Buchhaltung' })).toHaveCount(0)
  await expect(cards.filter({ hasText: 'Junior Finance Assistant' })).toBeVisible()
  // Only adverts that state the pay.
  await app(page)
    .getByRole('checkbox', { name: 'Only adverts that state the pay' })
    .check()
  await expect(cards.filter({ hasText: 'Accounts Payable Specialist' })).toHaveCount(0)
  await expect(app(page).getByTestId('jobs-count')).toHaveText(/^1 job/)
  // Words: nothing matching says so.
  await app(page)
    .getByPlaceholder(/Job title, skill or company/)
    .fill('astronaut')
  await app(page).getByRole('search').getByRole('button', { name: 'Search' }).click()
  // (Remotive is asked at most every 31 seconds, at its request: a new search waits its turn.)
  await expect(app(page).getByTestId('jobs-empty')).toBeVisible({ timeout: 60_000 })

  // Saved from the list; Jobicy says it has closed: marked so, kept with the player's notes.
  await app(page)
    .getByPlaceholder(/Job title, skill or company/)
    .fill('')
  await app(page).getByRole('search').getByRole('button', { name: 'Search' }).click()
  await cards
    .filter({ hasText: 'Junior Finance Assistant' })
    .getByRole('button', { name: /^Save / })
    .click()
  await app(page)
    .getByRole('navigation', { name: 'Jobs sections' })
    .getByRole('button', { name: /^Saved/ })
    .click()
  const row = app(page)
    .getByTestId('saved-job')
    .filter({ hasText: 'Junior Finance Assistant' })
  await expect(row).toContainText('Advert closed', { timeout: 30_000 })
  await row.getByRole('button', { name: /^Remove/ }).click()
  await expect(app(page).getByTestId('saved-empty')).toBeVisible()
})

test('the CV, a cover letter for one job, and the phone', async ({ page }) => {
  test.setTimeout(240_000)
  await answerFeeds(page)
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await openApp(page, 'Real Jobs')
  await app(page)
    .getByRole('navigation', { name: 'Jobs sections' })
    .getByRole('button', { name: 'CV & letters' })
    .click()
  await app(page)
    .getByLabel('About you')
    .fill('I keep the numbers straight. I want my first finance role.')
  await app(page).getByLabel('Education').fill('Banjul College, 2024')
  await app(page).getByLabel('Education').blur()
  const preview = app(page).getByTestId('cv-preview')
  await expect(preview).toContainText('SAM TAYLOR')
  await expect(preview).toContainText('Banjul College, 2024')
  // A new player has practised nothing yet: the CV claims nothing from the game.
  await expect(preview).not.toContainText('GAMHUB')
  await expect(
    app(page).getByRole('checkbox', {
      name: /clearly marked as practice in a simulation/,
    }),
  ).toBeChecked()
  await expect(app(page).getByRole('link', { name: 'Download' })).toHaveAttribute(
    'download',
    'CV - Sam Taylor.txt',
  )

  // A letter for one job: the job and company named, the real parts left to the player.
  await app(page)
    .getByRole('navigation', { name: 'Jobs sections' })
    .getByRole('button', { name: 'For you' })
    .click()
  await app(page).getByTestId('job-country').selectOption('GM')
  await app(page)
    .getByTestId('job-card')
    .filter({ hasText: 'Junior Finance Assistant' })
    .getByRole('button', { name: 'Junior Finance Assistant', exact: true })
    .click({ timeout: 30_000 })
  await app(page).getByRole('button', { name: 'Write a cover letter' }).click()
  const letter = app(page).getByLabel('Cover letter text')
  await expect(letter).toHaveValue(
    /apply for the Junior Finance Assistant role at Acme Payments/,
  )
  await expect(letter).toHaveValue(/I keep the numbers straight\./)
  await expect(letter).toHaveValue(/\[/)
  await app(page).getByRole('button', { name: 'Keep this letter' }).click()
  await expect(app(page).getByTestId('job-tracking')).toBeVisible()
  await app(page).getByRole('button', { name: 'Practise for the interview' }).click()
  await expect(app(page).getByTestId('interview-practice')).toContainText(
    'Why do you want to work as a Junior Finance Assistant at Acme Payments?',
  )
})

test('on the phone, in the world: suggestions, saved from there, and where each stands', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await answerFeeds(page)
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
  await page.getByTestId('office-3d').focus()
  await page.keyboard.press('p')
  const phone = page.getByTestId('phone')
  await expect(phone).toBeVisible()
  await phone.getByRole('button', { name: /^Real Jobs/ }).click()
  const jobs = phone.getByTestId('phone-real-jobs')
  await expect(jobs).toBeVisible()
  const card = jobs
    .getByTestId('phone-job')
    .filter({ hasText: 'Accounts Payable Specialist' })
  await expect(card).toBeVisible({ timeout: 30_000 })
  await expect(card.getByRole('link', { name: /View advert/ })).toHaveAttribute(
    'href',
    'https://remotive.com/remote-jobs/finance/accounts-payable-specialist-9001',
  )
  await card.getByRole('button', { name: 'Save' }).click()
  await jobs.getByRole('button', { name: 'Saved (1)', exact: true }).click()
  const saved = jobs.getByTestId('phone-saved-job')
  await expect(saved).toContainText('Accounts Payable Specialist')
  await saved.getByLabel('Where it stands').selectOption('preparing')
  await expect(saved.getByLabel('Where it stands')).toHaveValue('preparing')
})
