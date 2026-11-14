/**
 * Westmark County Court: a law career goes there from the office for a real
 * hearing, walks in through security, signs in with the usher, takes their
 * place in Court 2 and plays the hearing in person, then goes back.
 */
import { expect, test, type Page } from '@playwright/test'

const shots = process.env.WORKSIM_SHOTS ?? 'docs/screenshots'

async function playBest(page: Page) {
  const panel = page.getByTestId('scenario')
  for (let guard = 0; guard < 150; guard++) {
    if (await page.getByTestId('scenario-result').isVisible()) return
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
    else if (answer.kind === 'speak') {
      await panel.getByRole('textbox').fill(label)
      await panel.getByRole('button', { name: 'Say it' }).click()
    }
  }
}

test('Law: to Westmark County Court for a hearing, in person, and back', async ({
  page,
}) => {
  test.setTimeout(420_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.getByRole('radio', { name: /Law & Legal Services/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })

  // Too early: the court is not sitting yet.
  const offer = page.getByTestId('court-hearings')
  await expect(offer).toContainText('At court: Shah v Corner Lettings')
  await expect(
    offer.getByRole('button', { name: /Go to Westmark County Court/ }),
  ).toBeDisabled()
  await page.evaluate('window.__worksim.setTime(1, 10 * 60 + 15)')
  await offer.getByRole('button', { name: /Go to Westmark County Court/ }).click()

  // At court: the entrance hall, the office's panel and places put away.
  const court = page.getByTestId('court-panel')
  await expect(court).toBeVisible()
  await expect(page.getByTestId('office-panel')).toBeHidden()
  await expect(page.getByRole('navigation', { name: 'Places' })).toBeHidden()
  // The street map and the office guide are about the office: they step aside.
  await expect(page.getByTestId('minimap')).toBeHidden()
  await expect(page.getByTestId('courthouse-canvas')).toBeVisible({ timeout: 120_000 })
  await expect(court.getByTestId('court-room')).toContainText('The entrance hall', {
    timeout: 60_000,
  })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${shots}/court/court-entrance-hall.png` })

  // Signing in needs security first; the hearing needs signing in.
  await expect(
    court.getByRole('button', { name: 'Sign in with the usher' }),
  ).toBeDisabled()
  await court.getByRole('button', { name: 'Go through security' }).click()
  await expect(court.getByRole('button', { name: '✓ Go through security' })).toBeVisible({
    timeout: 60_000,
  })
  await court.getByRole('button', { name: 'Sign in with the usher' }).click()
  await expect(court.getByTestId('court-note')).toContainText('Court 2', {
    timeout: 60_000,
  })
  await page.screenshot({ path: `${shots}/court/court-usher.png` })

  // Into Court 2, to the claimant's table: the hearing begins.
  await court
    .getByRole('button', { name: /Take your place: Shah v Corner Lettings/ })
    .click()
  await expect(page.getByTestId('scenario')).toBeVisible({ timeout: 90_000 })
  await expect(page.getByTestId('scenario')).toContainText(
    'Court 2, Westmark County Court',
  )
  await page.getByTestId('scenario').getByRole('button', { name: 'Continue' }).click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${shots}/court/court-hearing.png` })
  await playBest(page)
  const result = page.getByTestId('scenario-result')
  await expect(result).toHaveAttribute('data-band', 'excellent')
  await expect(result).toContainText('Judgment for Ms Shah: £1,290 and the court fee')
  await page.screenshot({ path: `${shots}/court/court-judgment.png` })
  await result.getByRole('button', { name: 'Finish' }).click()

  // Back to the office: the journey takes office time each way.
  await expect(court).toContainText('best so far: 100%')
  await court.getByRole('button', { name: /Leave and go back to the office/ }).click()
  await expect(page.getByTestId('office-panel')).toBeVisible({ timeout: 90_000 })
  await expect(page.getByTestId('minimap')).toBeVisible()
  await expect(page.getByTestId('court-hearings')).toContainText('Best so far: 100%')
})
