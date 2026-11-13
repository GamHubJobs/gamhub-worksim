import { expect, test, type Page } from '@playwright/test'

/**
 * The HUD over the 3D office never overlaps: at each screen size, while
 * exploring and in a conversation, every visible piece of HUD (the location
 * panel, the next step, the places, the camera buttons, the controls help,
 * the minimap, needs and buttons, the mission tracker, a conversation) sits
 * in its own zone and on the screen.
 */
const shots = process.env.WORKSIM_SHOTS ?? 'test-results/hud'

const SIZES: Array<[number, number]> = [
  [1366, 768],
  [1440, 900],
  [1600, 900],
  [1920, 1080],
  [1280, 720],
  [1024, 768],
  [390, 844],
]

const PIECES = [
  '[data-testid="office-panel"]',
  '[data-testid="guide-bar"]',
  'nav[aria-label="Places"]',
  '[data-tour="view-toggle"]',
  '[data-testid="hud-needs"]',
  '.hud-minimap',
  '[data-testid="story-tracker"]',
  '[data-testid="office-dialogue"]',
  '[data-testid="prompt"]',
]

/** The parts of an element the measuring needs (tests are typed without the DOM). */
interface Box {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}
interface Shown {
  getClientRects(): { length: number }
  getBoundingClientRect(): Box
  closest(selector: string): { getBoundingClientRect(): Box } | null
}

async function rects(page: Page) {
  return page.evaluate((selectors) => {
    const out: Array<{ name: string; x: number; y: number; w: number; h: number }> = []
    for (const s of selectors) {
      const el = (
        globalThis as unknown as { document: { querySelector(s: string): Shown | null } }
      ).document.querySelector(s)
      if (!el || !el.getClientRects().length) continue
      // What is visible: clipped to its HUD slot, which scrolls on small screens.
      const own = el.getBoundingClientRect()
      const slot = el.closest('.hud-slot')?.getBoundingClientRect()
      const left = Math.max(own.left, slot?.left ?? -Infinity)
      const top = Math.max(own.top, slot?.top ?? -Infinity)
      const right = Math.min(own.right, slot?.right ?? Infinity)
      const bottom = Math.min(own.bottom, slot?.bottom ?? Infinity)
      const r = { left, top, width: right - left, height: bottom - top }
      if (r.width < 2 || r.height < 2) continue
      out.push({ name: s, x: r.left, y: r.top, w: r.width, h: r.height })
    }
    return out
  }, PIECES)
}

function overlaps(list: Awaited<ReturnType<typeof rects>>) {
  const problems: string[] = []
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]
      const b = list[j]
      const x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
      const y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
      if (x > 1 && y > 1) problems.push(`${a.name} overlaps ${b.name}`)
    }
  return problems
}

test('the office HUD has no overlaps, at every screen size, exploring and in a conversation', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/')
  await page.getByRole('radio', { name: /IT Help Desk/ }).check()
  await page.getByLabel('Your first name').fill('Alex')
  await page.getByRole('button', { name: 'Start my first day' }).click()
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByTestId('office-panel')).toBeVisible()
  const vh = () => page.viewportSize()!

  for (const [width, height] of SIZES) {
    await page.setViewportSize({ width, height })
    await page.waitForTimeout(400)
    const exploring = await rects(page)
    expect(overlaps(exploring), `${width}×${height}, exploring`).toEqual([])
    for (const r of exploring) {
      expect(r.x, `${r.name} at ${width}×${height}`).toBeGreaterThanOrEqual(-1)
      expect(r.x + r.w, `${r.name} at ${width}×${height}`).toBeLessThanOrEqual(
        vh().width + 1,
      )
      expect(r.y + r.h, `${r.name} at ${width}×${height}`).toBeLessThanOrEqual(
        vh().height + 1,
      )
    }
    if (width === 1366) await page.screenshot({ path: `${shots}/hud-1366-exploring.png` })
  }

  // A conversation: it takes the right-hand column; nothing collides with it.
  await page.setViewportSize({ width: 1366, height: 768 })
  await page
    .getByTestId('office-panel')
    .getByRole('button', { name: /Talk to/ })
    .first()
    .click()
  const dialogue = page.getByTestId('office-dialogue')
  await expect(dialogue).toBeVisible({ timeout: 60_000 })
  for (const [width, height] of SIZES) {
    await page.setViewportSize({ width, height })
    await page.waitForTimeout(400)
    expect(overlaps(await rects(page)), `${width}×${height}, in a conversation`).toEqual(
      [],
    )
    if (width === 1366) await page.screenshot({ path: `${shots}/hud-1366-dialogue.png` })
  }
  // Collapsing the location panel keeps the place's name.
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.getByRole('button', { name: 'Collapse this panel' }).click()
  await expect(page.getByTestId('office-panel')).toHaveAttribute('data-collapsed', 'true')
  await expect(page.getByTestId('office-panel').getByRole('heading')).toBeVisible()
})
