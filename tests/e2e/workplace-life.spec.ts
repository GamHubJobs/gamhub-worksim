import { expect, test, type Page } from '@playwright/test'

/**
 * Colleagues do their own profession's work, at the workplace's own equipment
 * (office/scene/stations.ts): through the day some of them go to a work station
 * (the sprint board or the test devices in the dev team area, a bed or the
 * treatment room on the ward) and work there. Development builds list where
 * everyone is going (`__worksimNpcs`). The team board on the wall is written up
 * from the save (workBoard.ts).
 */
type Npc = { id: string; place: string | null; status: string }

async function start(page: Page, career: RegExp) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.getByRole('radio', { name: career }).first().check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('desktop')).toBeVisible({ timeout: 30_000 })
  const leave = page.getByRole('button', { name: 'Leave desk', exact: true })
  if (await leave.isVisible().catch(() => false)) await leave.click()
  await expect(page.getByTestId('office-3d').locator('canvas')).toBeVisible({
    timeout: 120_000,
  })
  await page.evaluate('window.__worksimSpeed = 12')
}

/** Through the working day, hour by hour: who goes to a work station. */
async function atStations(page: Page): Promise<Set<string>> {
  const seen = new Set<string>()
  for (let hour = 9; hour <= 16 && seen.size < 2; hour++) {
    await page.evaluate(`window.__worksim.setTime(1, ${hour} * 60 + 20)`)
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(1000)
      const npcs = (await page.evaluate(
        '(window.__worksimNpcs ?? []).map((p) => ({ id: p.id, place: p.place, status: p.status }))',
      )) as Npc[]
      for (const p of npcs) if (p.place?.startsWith('station:')) seen.add(p.id)
    }
  }
  return seen
}

for (const [name, career] of [
  ['software development', /Software Development/],
  ['healthcare', /Healthcare & Medical Services/],
] as const)
  test(`${name}: colleagues work at the workplace's own equipment`, async ({ page }) => {
    test.setTimeout(400_000)
    await start(page, career)
    const seen = await atStations(page)
    expect(seen.size).toBeGreaterThan(0)
  })

/**
 * The afternoon huddle (officeCast.ts): at half past two on a weekday the
 * senior colleague goes to the workplace's main work station and two of the
 * team stand in with them. Every career: they must actually get there.
 */
const CAREERS: Array<[string, RegExp]> = [
  ['office administration', /Office Administration/],
  ['accounting', /Accounting/],
  ['IT help desk', /IT Help Desk/],
  ['digital marketing', /Digital Marketing/],
  ['data analysis', /Data Analysis/],
  ['software development', /Software Development/],
  ['healthcare', /Healthcare & Medical Services/],
  ['legal', /Law & Legal Services/],
  ['engineering', /Engineering & Technical Services/],
]
for (const [name, career] of CAREERS)
  test(`${name}: the afternoon huddle gathers at the workplace's equipment`, async ({
    page,
  }) => {
    test.setTimeout(300_000)
    await start(page, career)
    await page.evaluate('window.__worksim.setTime(1, 14 * 60 + 31)')
    await expect
      .poll(
        async () =>
          (
            (await page.evaluate(
              '(window.__worksimNpcs ?? []).map((p) => ({ id: p.id, place: p.place, status: p.status }))',
            )) as Npc[]
          )
            .filter((p) => p.place?.startsWith('huddle:') && p.status === 'there')
            .map((p) => p.place)
            .sort(),
        { timeout: 120_000, intervals: [2000] },
      )
      .toEqual(['huddle:0', 'huddle:1', 'huddle:2'])
  })

/**
 * Each themed workplace's tasks are lit at the equipment they are done at
 * (taskSpots.ts, TaskLamps.tsx): on a new save, the first task is there, to
 * start.
 */
for (const [name, career, task] of [
  ['healthcare', /Healthcare & Medical Services/, 'ward-'],
  ['legal', /Law & Legal Services/, 'legal-'],
  ['engineering', /Engineering & Technical Services/, 'eng-'],
] as const)
  test(`${name}: the work in hand is lit at its equipment`, async ({ page }) => {
    test.setTimeout(300_000)
    await start(page, career)
    const lamps = page.locator(`[data-task^="${task}"]`)
    await expect(lamps.first()).toBeAttached({ timeout: 60_000 })
    const states = await lamps.evaluateAll((els) =>
      els.map((e) => e.getAttribute('data-state')),
    )
    expect(states).toContain('next')
  })
