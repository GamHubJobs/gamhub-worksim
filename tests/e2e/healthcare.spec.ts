/**
 * The healthcare career (a simulation with fictional patients): the first
 * task done end to end in Ward Systems, and the medicines round's safety
 * checks.
 */
import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers.ts'

const shots = process.env.WORKSIM_SHOTS ?? 'docs/screenshots'

async function startHealthcare(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  const option = page.getByRole('radio', { name: /Healthcare & Medical Services/ })
  await expect(page.getByTestId('onboarding')).toContainText(
    'Riverside Community Hospital',
  )
  await option.check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible()
}

async function startTask(page: Page, id: string, title: RegExp) {
  await openApp(page, 'Tasks')
  await page.evaluate(`window.__worksim.skipTo('${id}')`)
  await page.getByRole('button', { name: title }).first().click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(page.getByTestId('ward-systems')).toBeVisible()
}

async function openRecord(page: Page, name: string) {
  const ward = page.getByTestId('ward-systems')
  await ward.getByRole('tab', { name: 'Patient record' }).click()
  await ward
    .getByRole('complementary', { name: 'Patients' })
    .getByRole('button', { name: new RegExp(name) })
    .click()
  await expect(ward.getByTestId('patient-banner')).toContainText(name)
}

async function observations(page: Page, values: Record<string, string>) {
  const ward = page.getByTestId('ward-systems')
  await ward.getByRole('tab', { name: 'Observations' }).click()
  for (const [label, value] of Object.entries(values))
    await ward.getByLabel(label).fill(value)
}

test('Healthcare: the observations round, escalated with SBAR, marked 100%', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startHealthcare(page)
  await startTask(page, 'ward-observations', /The morning observations round/)
  const ward = page.getByTestId('ward-systems')
  await expect(ward).toContainText('Simulation for learning')

  // A patient outside the care team needs a reason.
  await ward.getByRole('button', { name: /Elena Marsh/ }).click()
  await expect(ward).toContainText('is not under your care')
  await ward.getByRole('button', { name: 'Don’t open it' }).click()

  await openRecord(page, 'Margaret Okafor')
  await expect(ward.getByTestId('patient-banner')).toContainText('ALLERGY: Penicillins')
  await observations(page, {
    'Breathing (per minute)': '23',
    'Oxygen saturation (%)': '93',
    'Temperature (°C)': '38.7',
    'Blood pressure, upper': '104',
    'Blood pressure, lower': '66',
    'Pulse (per minute)': '112',
  })
  await expect(ward.getByTestId('score-preview')).toContainText('Score 8')
  await expect(ward.getByTestId('score-preview')).toContainText('Emergency')
  await page.screenshot({ path: `${shots}/healthcare/observations.png` })
  await ward.getByRole('button', { name: 'Save observations' }).click()

  await ward.getByRole('tab', { name: 'Notes' }).click()
  await ward.getByLabel('Kind of note').selectOption('escalation')
  await ward
    .getByLabel('Escalated to (name and role)')
    .fill('Dr Felix Moreau, doctor on call')
  await ward
    .getByLabel(/^Situation/)
    .fill('Margaret Okafor has an early-warning score of 8, up from 3.')
  await ward
    .getByLabel(/^Background/)
    .fill('Chest infection, on antibiotics through a drip. Allergic to penicillins.')
  await ward
    .getByLabel(/^Assessment/)
    .fill('Breathing 23, oxygen saturation 93%, temperature 38.7, pulse 112.')
  await ward
    .getByLabel(/^Recommendation/)
    .fill('Please review her now; I am repeating her observations in 30 minutes.')
  await ward.getByRole('button', { name: 'Record the escalation' }).click()
  await expect(ward.getByTestId('ward-message')).toContainText('Done')

  await openRecord(page, 'George Whitfield')
  await observations(page, {
    'Breathing (per minute)': '16',
    'Oxygen saturation (%)': '97',
    'Temperature (°C)': '36.9',
    'Blood pressure, upper': '128',
    'Blood pressure, lower': '80',
    'Pulse (per minute)': '76',
  })
  await ward.getByRole('button', { name: 'Save observations' }).click()

  await ward.getByRole('tab', { name: 'Audit log' }).click()
  await expect(ward.getByTestId('audit-log')).toContainText('Recorded observations')

  await page.getByRole('button', { name: /Submit to Owen/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByTestId('submission-results').getByTestId('score')).toHaveText(
    '100%',
  )
})

test('Healthcare: an unsafe prescription is queried, never given', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startHealthcare(page)
  await startTask(page, 'ward-medicines', /The medicines round/)
  const ward = page.getByTestId('ward-systems')

  // Bedside checks are required before a dose is recorded as given.
  await openRecord(page, 'Margaret Okafor')
  await ward.getByRole('tab', { name: 'Medicines chart' }).click()
  const cefralin = ward.getByTestId('med-M-301')
  await cefralin.getByRole('button', { name: 'Record as given' }).click()
  await expect(ward.getByTestId('ward-message')).toContainText(
    'confirm who the patient is',
  )
  await cefralin.getByLabel(/asked the patient’s name/).check()
  await cefralin.getByLabel(/checked their allergies/).check()
  await cefralin.getByRole('button', { name: 'Record as given' }).click()
  await expect(cefralin).toContainText('Given by')

  // Pharmacy: the allergy alert is shown, and the prescription is queried.
  await ward.getByRole('tab', { name: 'Pharmacy' }).click()
  const rx = ward.getByTestId('rx-M-305')
  await expect(rx).toContainText('ALLERGY')
  await rx
    .getByLabel('Query about M-305')
    .fill(
      'Aisha is allergic to anti-inflammatories and Brufenac is one: please prescribe an alternative.',
    )
  await rx.getByRole('button', { name: 'Query' }).click()
  await page.screenshot({ path: `${shots}/healthcare/pharmacy.png` })
  await expect(ward.getByTestId('rx-M-305')).toHaveCount(0)
})

test('Healthcare: the ward in 3D, walked to the bedside, opens Ward Systems', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startHealthcare(page)
  // New staff arrive at the ward desk, in the 3D ward.
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
  const panel = page.getByTestId('office-panel')
  await expect(panel).toContainText('Ward desk')
  await expect(panel).toContainText('Talk to Rosa')
  await expect(page.getByTestId('ward-bay')).toBeVisible()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${shots}/healthcare/ward.png` })
  // From above: Bay A’s four beds on the right.
  await page.getByRole('button', { name: 'View: from behind' }).click()
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${shots}/healthcare/ward-top-down.png` })
  await page.getByRole('button', { name: 'View: top-down' }).click()
  await page
    .getByTestId('ward-bay')
    .getByRole('button', { name: 'Go to the bedside (Ward Systems)' })
    .click()
  // On the way: Bay A comes into view.
  await page.waitForTimeout(8000)
  await page.screenshot({ path: `${shots}/healthcare/ward-bay.png` })
  const tool = page.getByRole('region', { name: 'Ward Systems window' })
  await expect(tool).toBeVisible({ timeout: 120_000 })
  await expect(tool).toContainText('How to use Ward Systems')
})
