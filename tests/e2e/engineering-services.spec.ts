/**
 * The engineering career (standard formulas, simplified data): the circuit
 * task done end to end in Works Desk, and lockout-tagout enforced.
 */
import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers.ts'

const shots = process.env.WORKSIM_SHOTS ?? 'docs/screenshots'

async function startEngineering(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toContainText('Northbank Engineering Ltd')
  await page.getByRole('radio', { name: /Engineering & Technical Services/ }).check()
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
  await expect(page.getByTestId('works-desk')).toBeVisible()
}

test('Engineering: the indicator circuit made safe, marked 100%', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startEngineering(page)
  await startTask(page, 'eng-circuit', /The indicator lamp/)
  const desk = page.getByTestId('works-desk')
  const circuit = desk.getByTestId('circuit-C-1')
  // 100 Ω: 100 mA through a 30 mA LED.
  await expect(circuit.getByTestId('circuit-analysis')).toContainText('100 mA')
  await expect(circuit).toContainText('it will fail')
  await circuit.getByLabel('Resistance of r1').selectOption('560')
  await circuit.getByLabel('Power rating of r1').selectOption('0.25')
  await expect(circuit.getByTestId('circuit-analysis')).toContainText('17.9 mA')
  await expect(circuit).not.toContainText('it will fail')
  await page.screenshot({ path: `${shots}/engineering/circuit.png` })
  await page.getByRole('button', { name: /Submit to Helena/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByTestId('submission-results').getByTestId('score')).toHaveText(
    '100%',
  )
})

test('Engineering: no repair before the machine is isolated, locked and proved dead', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startEngineering(page)
  await startTask(page, 'eng-maintenance', /The hot bearing/)
  const desk = page.getByTestId('works-desk')
  await desk.getByRole('tab', { name: 'Maintenance' }).click()
  const wo = desk.getByTestId('wo-WO-311')
  await wo.getByRole('button', { name: 'Do the repair' }).click()
  await expect(desk.getByTestId('works-message')).toContainText('Never work on equipment')
  for (const step of [
    'Get the permit to work signed',
    'Isolate the power at the isolator',
    'Fit your personal lock and tag',
    'Test that it is dead (try to start it)',
    'Do the repair',
    'Remove your lock and tag (everyone clear)',
    'Restore power and test run',
  ])
    await wo.getByRole('button', { name: step }).click()
  await wo.getByLabel('Reading for WO-311').fill('64')
  await wo
    .getByLabel('What you did on WO-311')
    .fill('Replaced the drive-end bearing; runs quiet at 64 °C.')
  await wo.getByRole('button', { name: 'Close the work order' }).click()
  await expect(wo).toContainText('Closed: reading 64')
  await page.screenshot({ path: `${shots}/engineering/lockout.png` })
})

test('Engineering: the workshop in 3D, walked to the test bench, opens Works Desk', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await startEngineering(page)
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
  const bay = page.getByTestId('workshop-bay')
  await expect(bay).toContainText('safety glasses on')
  await page.waitForTimeout(2500)
  await page.getByRole('button', { name: 'View: from behind' }).click()
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${shots}/engineering/workshop-top-down.png` })
  await page.getByRole('button', { name: 'View: top-down' }).click()
  await bay.getByRole('button', { name: 'Go to the test bench (Works Desk)' }).click()
  await page.waitForTimeout(8000)
  await page.screenshot({ path: `${shots}/engineering/workshop.png` })
  const tool = page.getByRole('region', { name: 'Works Desk window' })
  await expect(tool).toBeVisible({ timeout: 120_000 })
  await expect(tool).toContainText('How to use Works Desk')
})
