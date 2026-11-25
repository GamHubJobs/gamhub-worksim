/**
 * Patient cases in the Healthcare career, played in the real app: the task
 * from Grace, the case library, a conversation with the patient, the bedside
 * equipment and actions (and one beyond the role, referred), the shared
 * patient record, a reload in the middle of the case, the debrief with
 * Grace's feedback, the progress dashboard with assigned cases, and the task
 * handed in and marked from the saved attempts.
 */
import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers.ts'

const shots = process.env.WORKSIM_SHOTS ?? 'docs/screenshots'

async function startHealthcare(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('radio', { name: /Healthcare & Medical Services/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible({ timeout: 30_000 })
}

const ward = (page: Page) => page.getByTestId('ward-systems')

async function say(page: Page, text: string, reply: RegExp) {
  await ward(page).getByTestId('case-say').fill(text)
  await ward(page).getByTestId('case-send').click()
  await expect(ward(page).getByTestId('case-conversation')).toContainText(reply)
}

const act = (page: Page, id: string) => ward(page).getByTestId(`action-${id}`).click()

async function startCase(page: Page, id: string) {
  await ward(page).getByRole('tab', { name: 'Patient cases' }).click()
  await ward(page).getByTestId(`case-${id}`).click()
  await ward(page).getByTestId('case-start').click()
  await expect(ward(page).getByTestId('case-active')).toBeVisible()
}

async function finish(page: Page) {
  await ward(page).getByTestId('case-finish').click()
  await expect(ward(page).getByTestId('case-debrief')).toBeVisible()
}

test('Healthcare: patient cases at the bedside, debriefed, tracked and marked', async ({
  page,
}) => {
  test.setTimeout(420_000)
  await page.setViewportSize({ width: 1600, height: 1000 })
  await startHealthcare(page)
  await openApp(page, 'Tasks')
  await page.evaluate("window.__worksim.skipTo('ward-first-case')")
  await page
    .getByRole('button', { name: /Your first patients/ })
    .first()
    .click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Start task' })
    .click()
  await expect(ward(page)).toBeVisible({ timeout: 30_000 })

  // The library: 22 fictional patients; a case above the trainee grade is closed.
  await ward(page).getByRole('tab', { name: 'Patient cases' }).click()
  await expect(ward(page).getByTestId('case-library')).toContainText(
    '22 fictional patients',
  )
  await ward(page).getByTestId('case-sepsis-signs').click()
  await expect(ward(page).getByTestId('case-start')).toBeDisabled()

  // Maggie's morning observations.
  await startCase(page, 'routine-obs')
  await expect(ward(page).getByTestId('bedside-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
  await say(
    page,
    "Hello, my name is Alex, I'm one of the healthcare assistants. Could you tell me your full name and date of birth?",
    /Margaret Ellis/,
  )
  await say(page, 'How are you feeling today?', /Much better/)
  await say(page, 'Is it okay if I take your observations?', /fine|Go ahead|Of course/)
  await act(page, 'hand-hygiene')
  await act(page, 'full-obs')
  await expect(ward(page).getByTestId('case-monitor')).toContainText('97%')
  await expect(ward(page).getByTestId('case-score')).toContainText(
    'Early-warning score 0',
  )
  await act(page, 'record-obs')

  // Beyond a support worker's role: referred, not done.
  await act(page, 'give-medicine')
  await expect(ward(page).getByTestId('case-log')).toContainText('registered clinician')

  // The observations are in the shared patient record.
  await ward(page).getByRole('tab', { name: 'Audit log' }).click()
  await expect(ward(page).getByTestId('audit-log')).toContainText('Recorded observations')
  await expect(ward(page).getByTestId('audit-log')).toContainText(
    'Started a patient case',
  )

  // A reload in the middle of the case: it carries on where it was.
  await page.waitForTimeout(1500)
  await page.reload()
  await expect(page.getByTestId('desktop')).toBeVisible({ timeout: 60_000 })
  // Back to the task's file through the Tasks app (it reopens where it was).
  await openApp(page, 'Tasks')
  await page
    .getByRole('button', { name: /Your first patients/ })
    .first()
    .click()
  await page
    .getByTestId('task-detail')
    .getByRole('button', { name: 'Continue working' })
    .click()
  await expect(ward(page)).toBeVisible({ timeout: 30_000 })
  await ward(page).getByRole('tab', { name: 'Patient cases' }).click()
  await expect(ward(page).getByTestId('case-active')).toBeVisible({ timeout: 30_000 })
  await expect(ward(page).getByTestId('case-conversation')).toContainText('Much better')

  await say(page, 'Is there any pain in your leg?', /two out of ten/)
  await say(page, 'Have you had anything to eat or drink?', /porridge/)
  await say(page, 'Do you have any allergies?', /no allergies/)
  await act(page, 'look-legs')
  await act(page, 'write-note')
  await ward(page)
    .getByTestId('case-composer')
    .getByLabel('Note')
    .fill(
      'Morning observations taken and recorded, score 1. Left leg redness shrinking inside the pen line, pain 2/10. Comfortable, eating and drinking well.',
    )
  await ward(page).getByTestId('composer-submit').click()
  await act(page, 'call-bell')
  await page.screenshot({ path: `${shots}/healthcare/patient-case.png` })
  await finish(page)
  await expect(ward(page).getByTestId('debrief-score')).toContainText('Passed')
  await expect(ward(page).getByTestId('grace-feedback')).toContainText(/At \d\d:\d\d you/)
  await expect(ward(page).getByTestId('debrief-items')).toContainText(
    'Take a full set of observations',
  )
  await page.screenshot({ path: `${shots}/healthcare/patient-case-debrief.png` })
  await ward(page).getByTestId('debrief-back').click()

  // Helen's sample: the second case of the task.
  await startCase(page, 'urine-sample')
  await say(
    page,
    "Hi, I'm Alex, a healthcare assistant. Can you tell me your full name and date of birth?",
    /Helen Clarke/,
  )
  await say(
    page,
    'Is it okay if I explain how to give the sample?',
    /fine|Go ahead|Of course/,
  )
  await say(page, 'What symptoms have you had?', /Stinging/)
  await say(page, 'Are you on any antibiotics?', /haven't started/)
  await act(page, 'hand-hygiene')
  await act(page, 'gloves')
  await act(page, 'collect-urine')
  await act(page, 'send-specimen')
  await act(page, 'write-note')
  await ward(page)
    .getByTestId('case-composer')
    .getByLabel('Note')
    .fill(
      'Urine sample collected, labelled at the point of collection and sent to the lab.',
    )
  await ward(page).getByTestId('composer-submit').click()
  await finish(page)
  await expect(ward(page).getByTestId('debrief-score')).toContainText('Passed')
  await ward(page).getByTestId('debrief-back').click()

  // Case progress: first, latest and best from the saved attempts; Grace assigns more.
  await ward(page).getByRole('tab', { name: 'Case progress' }).click()
  const progress = ward(page).getByTestId('case-progress')
  await expect(progress.getByTestId('progress-table')).toContainText(
    'Morning observations',
  )
  await expect(progress).toContainText('Passed')
  await progress.getByTestId('grace-assign').click()
  await expect(progress.getByTestId('assignments')).toContainText('due day')
  await page.screenshot({ path: `${shots}/healthcare/case-progress.png` })

  await page.getByRole('button', { name: /Submit to Grace/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByTestId('submission-results').getByTestId('score')).toHaveText(
    '100%',
    { timeout: 30_000 },
  )
})
