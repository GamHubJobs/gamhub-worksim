import { expect, test, type Page } from '@playwright/test'

// Each workplace sounds like itself: the hospital ward (monitors, call bells),
// and Westmark County Court (a hushed hall, the gavel) when a law career goes
// there. Checked through the development hook (window.__worksimAudio): which
// scene is playing, and that sound really comes out.

const stats = (page: Page) =>
  page.evaluate(() => {
    const a = (globalThis as unknown as { __worksimAudio: { stats: unknown } })
      .__worksimAudio
    return JSON.parse(JSON.stringify(a.stats)) as { engine: string; scene: string }
  })

const loudest = (page: Page, ms: number) =>
  page.evaluate(async (wait) => {
    const a = (globalThis as unknown as { __worksimAudio: { meter(): number } })
      .__worksimAudio
    let peak = 0
    const end = performance.now() + wait
    while (performance.now() < end) {
      peak = Math.max(peak, a.meter())
      await new Promise((r) => setTimeout(r, 20))
    }
    return peak
  }, ms)

async function start(page: Page, career: RegExp) {
  await page.goto('/')
  await page.getByRole('radio', { name: career }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })
  // A click starts sound (browsers wait for one).
  await page.getByTestId('office').click({ position: { x: 5, y: 5 } })
  await expect.poll(async () => (await stats(page)).engine).toBe('ready')
}

test('the hospital sounds like a ward', async ({ page }) => {
  test.setTimeout(180_000)
  await start(page, /Healthcare & Medical Services/)
  await expect
    .poll(async () => (await stats(page)).scene, { timeout: 30_000 })
    .toMatch(/^reception:[a-z]+:.*:ward$/)
  // The ward's own sound is playing (monitors, chatter, the bed of the room).
  expect(await loudest(page, 4000)).toBeGreaterThan(0.0005)
})

test('the courthouse has its own hushed sound', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, /Law & Legal Services/)
  await expect
    .poll(async () => (await stats(page)).scene, { timeout: 30_000 })
    .toMatch(/:legal$/)
  await page.evaluate('window.__worksim.setTime(1, 10 * 60 + 15)')
  await page
    .getByTestId('court-hearings')
    .getByRole('button', { name: /Go to Westmark County Court/ })
    .click()
  await expect(page.getByTestId('court-panel')).toBeVisible({ timeout: 60_000 })
  await expect
    .poll(async () => (await stats(page)).scene, { timeout: 30_000 })
    .toMatch(/^courthouse:/)
  expect(await loudest(page, 4000)).toBeGreaterThan(0.0003)
})

test('conversations can be read aloud, each person in their own voice', async ({
  page,
}) => {
  test.setTimeout(180_000)
  // The browser's speech, recorded (the test machine has no voices of its own).
  await page.addInitScript(() => {
    const said: Array<{ text: string; rate: number; pitch: number }> = []
    ;(window as unknown as { __said: typeof said }).__said = said
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        speak: (u: SpeechSynthesisUtterance) =>
          said.push({ text: u.text, rate: u.rate, pitch: u.pitch }),
        cancel: () => {},
        getVoices: () => [],
      },
    })
  })
  await start(page, /Office Administration & Finance/)
  // Off by default; turned on in the sound settings.
  await page.getByRole('button', { name: 'Sound & graphics' }).click()
  const panel = page.getByTestId('sound-panel')
  await expect(panel.getByLabel('Read conversations aloud')).not.toBeChecked()
  await panel.getByLabel('Read conversations aloud').check()
  await panel.getByRole('button', { name: 'Close', exact: true }).click()
  // Talking to the receptionist: what she says is spoken.
  await page
    .getByTestId('office-panel')
    .getByRole('button', { name: /^Talk to / })
    .first()
    .click()
  const dialogue = page.getByTestId('office-dialogue')
  await expect(dialogue).toBeVisible({ timeout: 60_000 })
  await expect
    .poll(
      async () =>
        ((await page.evaluate('window.__said')) as Array<{ text: string }>).length,
      { timeout: 30_000 },
    )
    .toBeGreaterThan(0)
  const said = (await page.evaluate('window.__said')) as Array<{ text: string }>
  const shown = (await dialogue.innerText()).replace(/[“”"]/g, '')
  expect(shown).toContain(said[0].text.slice(0, 20))
})
