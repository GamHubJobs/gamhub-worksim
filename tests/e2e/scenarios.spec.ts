/**
 * Live workplace scenarios, played in person in the 3D workplace: the player
 * takes their place, the cast speaks and reacts, the player answers (choices,
 * exhibits, their own words), and the outcome counts. One per career.
 */
import { expect, test, type Page } from '@playwright/test'

const shots = process.env.WORKSIM_SHOTS ?? 'docs/screenshots'

async function start(page: Page, career: RegExp) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.getByRole('radio', { name: career }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
  // After the stand-up, so no meeting interrupts.
  await page.evaluate('window.__worksim.setTime(1, 10 * 60 + 30)')
}

/** Takes one's place for a scenario from the panel, and waits for it to begin. */
async function begin(page: Page, title: string) {
  const offered = page.getByTestId('live-scenarios')
  await expect(offered).toContainText(title)
  await offered.getByRole('button', { name: title }).click()
  await expect(page.getByTestId('scenario')).toBeVisible({ timeout: 90_000 })
}

/**
 * Plays the scenario on screen, taking the best (or worst) answer at each
 * beat, and photographing the beats named in `shoot`. Returns the beats seen.
 */
async function play(
  page: Page,
  best: boolean,
  shoot: Record<string, string> = {},
): Promise<string[]> {
  const panel = page.getByTestId('scenario')
  const seen: string[] = []
  for (let guard = 0; guard < 150; guard++) {
    if (await page.getByTestId('scenario-result').isVisible()) break
    const id = (await panel.getAttribute('data-beat'))!
    if (seen.at(-1) !== id) seen.push(id)
    if (shoot[id]) {
      await page.waitForTimeout(800)
      await page.screenshot({ path: `${shots}/scenarios/${shoot[id]}.png` })
      delete shoot[id]
    }
    const cont = panel.getByRole('button', { name: 'Continue' })
    if (await cont.isVisible()) {
      await cont.click()
      continue
    }
    const answer = (await page.evaluate(`window.__worksimScenarioAnswer(${best})`)) as {
      kind: string
      label: string
    } | null
    if (!answer) continue
    const label = answer.label.replaceAll('{name}', 'Alex')
    if (answer.kind === 'choose')
      await panel.getByRole('button', { name: label, exact: true }).click()
    else if (answer.kind === 'exhibit')
      await panel
        .getByRole('button', { name: `Present ${label.split(':')[0]}`, exact: true })
        .click()
    else if (answer.kind === 'speak') {
      await panel.getByRole('textbox').fill(label)
      await panel.getByRole('button', { name: 'Say it' }).click()
    }
  }
  return seen
}

test('Law: a full hearing in the courtroom, played in person, won with costs', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await start(page, /Law & Legal Services/)
  await begin(page, 'Hearing: Brightwater v Millstone')
  const panel = page.getByTestId('scenario')
  await expect(panel).toContainText('All rise')
  await expect(page.getByTestId('scenario-speaker-tag')).toContainText('Ruth Adeyemi')
  // The area panel steps aside so the court is in view.
  await expect(page.getByTestId('office-panel')).toBeHidden()
  const seen = await play(page, true, {
    rise: 'law-hearing-all-rise',
    open: 'law-hearing-judge-opens',
    chief: 'law-hearing-witness',
    object: 'law-hearing-objection',
    'put-log': 'law-hearing-exhibit',
    candour: 'law-hearing-judge',
    closing: 'law-hearing-closing',
  })
  for (const beat of [
    'appear',
    'chief',
    'show-mould',
    'object',
    'cross',
    'put-log',
    'candour',
    'adjourn',
    'closing',
  ])
    expect(seen).toContain(beat)
  const result = page.getByTestId('scenario-result')
  await expect(result).toHaveAttribute('data-band', 'excellent')
  await expect(result).toContainText('Judgment for the claimant: £18,400 and costs')
  await expect(page.getByTestId('scenario-score')).toContainText('100%')
  await expect(page.getByTestId('scenario-score')).toContainText('+120 XP')
  await page.screenshot({ path: `${shots}/scenarios/law-hearing-judgment.png` })
  await result.getByRole('button', { name: 'Finish' }).click()
  await expect(panel).toBeHidden()
  await expect(page.getByTestId('office-panel')).toBeVisible()
  // Recorded: offered again as practice, with the best score.
  await expect(page.getByTestId('live-scenarios')).toContainText('Best so far: 100%')
})

test('Law: a poor hearing loses the case, and the court says why', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, /Law & Legal Services/)
  await begin(page, 'Hearing: Brightwater v Millstone')
  await play(page, false)
  const result = page.getByTestId('scenario-result')
  await expect(result).toHaveAttribute('data-band', 'poor')
  await expect(result).toContainText('Claim dismissed')
  // Every answer is reviewed with its lesson.
  await result.getByText('Review your answers').click()
  await expect(result).toContainText(
    'Misleading the court is serious professional misconduct.',
  )
  await result.getByRole('button', { name: 'Finish' }).click()
})

const CAREERS: Array<[string, RegExp, string, string, string]> = [
  [
    'accounting-audit',
    /^Accounting/,
    'The auditor’s visit',
    'A clean audit outcome: findings corrected openly',
    'honest',
  ],
  [
    'finance-expenses',
    /Office Administration & Finance/,
    'The payroll printout and the expense claims',
    'Personal data secured, the policy applied fairly, the rules kept',
    'confidential',
  ],
  [
    'dev-planning',
    /Software Development/,
    'Sprint planning at the board',
    'A realistic, secure sprint the whole team believes in',
    'security',
  ],
  [
    'data-incident',
    /Data Analysis/,
    'The dashboard that doubled overnight',
    'Error caught and corrected before anyone acted on it',
    'cause',
  ],
  [
    'marketing-shoot',
    /Digital Marketing/,
    'The photo shoot and the post',
    'A legal, accessible post with happy customers',
    'consent',
  ],
  [
    'engineering-review',
    /Engineering & Technical Services/,
    'Design review: Mill Lane footbridge',
    'Design review closed: safe parapet, the right drawings on site, the change agreed properly',
    'rev',
  ],
  [
    'it-incident',
    /IT Help Desk/,
    'Major incident: email is down',
    'Major incident handled: the board got its papers and the company was kept informed',
    'untested',
  ],
  [
    'law-interview',
    /Law & Legal Services/,
    'First interview with a new client',
    'Instructed: a new client who trusts the firm',
    'document',
  ],
  [
    'healthcare-admission',
    /Healthcare & Medical Services/,
    'Admitting a new patient: bed 4A-4',
    'A safe admission: delirium, pressure damage and a possible fracture all caught early',
    'skin',
  ],
  [
    'healthcare',
    /Healthcare & Medical Services/,
    'Ward round and emergency: bed 4A-2',
    'Mr Price stabilised: early escalation and an allergy caught',
    'allergy',
  ],
  [
    'engineering',
    /Engineering & Technical Services/,
    'Safety walk and project meeting',
    'A safe day: live work stopped, the beam out of use, the client kept informed',
    'isolate',
  ],
  [
    'it',
    /IT Help Desk/,
    'Desk-side support: “nothing works”',
    'Floor 2 back online in 40 minutes; Leila made her call',
    'cause',
  ],
  [
    'accounting',
    /^Accounting/,
    'Month-end review with a client',
    'Accounts agreed; the client understands them and trusts your advice',
    'backdate',
  ],
  [
    'finance',
    /Office Administration & Finance/,
    'A supplier calls in: the unpaid invoice',
    'No duplicate paid, a fraud attempt stopped, the rules kept',
    'fraud',
  ],
  [
    'dev',
    /Software Development/,
    'Release day: review, go or no-go, and an incident',
    'A safe release: VAT error kept out, incident over in seven minutes',
    'go',
  ],
  [
    'data',
    /Data Analysis/,
    'Presenting findings to the sales director',
    'Recommendation accepted: the director funds a proper test',
    'outliers',
  ],
  [
    'marketing',
    /Digital Marketing/,
    'Campaign review with a client',
    'Client renews, with an honest, testable campaign',
    'claim',
  ],
]

for (const [id, career, title, verdict, key] of CAREERS) {
  test(`${id}: “${title}” played in person, best outcome`, async ({ page }) => {
    test.setTimeout(300_000)
    await start(page, career)
    await begin(page, title)
    await play(page, true, { [key]: `${id}-scenario` })
    const result = page.getByTestId('scenario-result')
    await expect(result).toHaveAttribute('data-band', 'excellent')
    await expect(result).toContainText(verdict)
    await page.screenshot({ path: `${shots}/scenarios/${id}-scenario-result.png` })
    await result.getByRole('button', { name: 'Finish' }).click()
    await expect(page.getByTestId('live-scenarios')).toContainText('Best so far: 100%')
  })
}

test('Law: coaching on the closing from the player’s own AI model, without changing the score', async ({
  page,
}) => {
  test.setTimeout(300_000)
  // The player has turned on a model of their own (through the bridge) and agreed.
  await page.addInitScript(() => {
    localStorage.setItem(
      'gamhub-worksim:ai-settings',
      JSON.stringify({ engine: 'bridge', consent: true, mode: 'learning' }),
    )
  })
  let sent = ''
  await page.route('http://127.0.0.1:8787/**', async (route) => {
    const request = route.request()
    const headers = {
      'access-control-allow-origin': request.headers().origin ?? '*',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'content-type': 'application/json',
    }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (request.url().endsWith('/v1/status'))
      return route.fulfill({
        headers,
        body: JSON.stringify({
          providers: { anthropic: { ready: true, model: 'test-model' } },
          limit: 10,
          used: 0,
        }),
      })
    sent = JSON.stringify(request.postDataJSON())
    return route.fulfill({
      headers,
      body: JSON.stringify({
        text: 'Good use of the hidden-defect point. Name Harlow and the storage log next time.',
        model: 'test-model',
      }),
    })
  })
  await start(page, /Law & Legal Services/)
  await begin(page, 'Hearing: Brightwater v Millstone')
  const panel = page.getByTestId('scenario')
  // Play well up to the closing, then say something short of its own.
  for (let guard = 0; guard < 150; guard++) {
    if (await panel.getByRole('textbox').isVisible()) break
    const cont = panel.getByRole('button', { name: 'Continue' })
    if (await cont.isVisible()) {
      await cont.click()
      continue
    }
    const answer = (await page.evaluate('window.__worksimScenarioAnswer(true)')) as {
      kind: string
      label: string
    } | null
    if (!answer) continue
    const label = answer.label.replaceAll('{name}', 'Alex')
    if (answer.kind === 'choose')
      await panel.getByRole('button', { name: label, exact: true }).click()
    else if (answer.kind === 'exhibit')
      await panel
        .getByRole('button', { name: `Present ${label.split(':')[0]}`, exact: true })
        .click()
  }
  await panel
    .getByRole('textbox')
    .fill('The mould was hidden inside the sacks, so we should win.')
  await panel.getByRole('button', { name: 'Say it' }).click()
  const coaching = page.getByTestId('scenario-ai')
  await coaching.getByRole('button', { name: /coaching on what you said/ }).click()
  await expect(coaching).toContainText('Name Harlow and the storage log next time')
  await expect(coaching).toContainText('test-model')
  expect(sent).toContain('The mould was hidden inside the sacks')
  expect(sent).not.toContain('Alex')
  await page.screenshot({
    path: `${shots}/scenarios/law-hearing-ai-coaching.png`,
  })
  // The rubric, not the model, sets the score: one of four points covered.
  await panel.getByRole('button', { name: 'Continue' }).click()
  await panel.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByTestId('scenario-result')).toBeVisible()
})
