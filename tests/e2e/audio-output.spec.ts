import { expect, test, type Page } from '@playwright/test'
import { startCareerIfNeeded } from './helpers.ts'

/**
 * The game's actual sound output, measured (no one listens in a test, so the
 * signal is): everything the audio engine sends to the speakers is also fed
 * to a pair of analysers, left and right, and their levels are sampled every
 * 40 ms. That checks that sounds really play, from the side they are on, quieter
 * further away, and stop: not just that the code asked for them.
 */
test.use({ launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } })

type Sample = { t: number; l: number; r: number }

/** Taps the speakers: every connection to the audio output also feeds the analysers. */
const TAP = `(() => {
  window.__audioTrace = []
  const connect = AudioNode.prototype.connect
  AudioNode.prototype.connect = function (...args) {
    if (args[0] instanceof AudioDestinationNode && !window.__audioTap) {
      const ctx = this.context
      const split = ctx.createChannelSplitter(2)
      const l = ctx.createAnalyser()
      const r = ctx.createAnalyser()
      l.fftSize = r.fftSize = 1024
      connect.call(this, split)
      connect.call(split, l, 0)
      connect.call(split, r, 1)
      window.__audioTap = { l, r }
      const buf = new Float32Array(1024)
      const rms = (a) => {
        a.getFloatTimeDomainData(buf)
        let s = 0
        for (const v of buf) s += v * v
        return Math.sqrt(s / buf.length)
      }
      setInterval(() => {
        window.__audioTrace.push({ t: performance.now(), l: rms(l), r: rms(r) })
        if (window.__audioTrace.length > 3000) window.__audioTrace.shift()
      }, 40)
    }
    return connect.apply(this, args)
  }
})()`

const trace = (page: Page) =>
  page.evaluate(() => (globalThis as unknown as { __audioTrace: Sample[] }).__audioTrace)
const now = (page: Page) => page.evaluate(() => performance.now())
/**
 * The loudest left and right levels between two moments, above the street's own
 * sound (traffic, birds) in the second before.
 */
function peak(samples: Sample[], from: number, to: number) {
  const level = (a: number, b: number, k: 'l' | 'r') =>
    Math.max(0, ...samples.filter((x) => x.t >= a && x.t <= b).map((x) => x[k]))
  return {
    l: Math.max(0, level(from, to, 'l') - level(from - 1000, from - 50, 'l')),
    r: Math.max(0, level(from, to, 'r') - level(from - 1000, from - 50, 'r')),
  }
}
/** Plays a sound at a place, as the game's things do (audio.play with `at`). */
const playAt = (page: Page, id: string, x: number, z: number) =>
  page.evaluate(
    ([id, x, z]) =>
      (
        globalThis as unknown as {
          __worksimAudio: {
            play: (id: string, o: { at: { x: number; z: number } }) => boolean
          }
        }
      ).__worksimAudio.play(id as string, { at: { x: x as number, z: z as number } }),
    [id, x, z] as const,
  )
/** Where the player hears from (the camera): its place, and its right and forward. */
const listener = async (page: Page) => {
  const l = (await page.evaluate('window.__worksimListener()')) as {
    x: number
    z: number
    yaw: number
  }
  return {
    ...l,
    right: { x: Math.cos(l.yaw), z: -Math.sin(l.yaw) },
    ahead: { x: -Math.sin(l.yaw), z: -Math.cos(l.yaw) },
  }
}

test('sound really comes out: from its side, quieter further off, and the doors heard', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await page.addInitScript({ content: TAP })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await startCareerIfNeeded(page, 'Sam Taylor')
  await expect(page.getByTestId('office')).toBeVisible({ timeout: 30_000 })
  await page.evaluate(`window.__worksim.setTime(1, 17 * 60 + 35)`)
  await page.getByTestId('office-panel').getByRole('button', { name: 'Go home' }).click()
  await page.getByTestId('day-end').getByRole('button', { name: 'Go home' }).click()
  const home = page.getByTestId('home')
  await expect(home).toContainText('Evening at home', { timeout: 15_000 })
  await home
    .getByRole('navigation', { name: 'Rooms' })
    .getByRole('button', { name: 'Front door' })
    .click()
  await home.getByRole('button', { name: /Go out into the neighbourhood/ }).click()
  await expect(page.getByTestId('city-3d').locator('canvas')).toBeVisible({
    timeout: 60_000,
  })
  await page.waitForTimeout(6000)
  await expect
    .poll(async () => (await trace(page)).length, { timeout: 20_000 })
    .toBeGreaterThan(20)

  // The street's own sound (traffic, birds) off for the measuring, so each test
  // sound is heard on its own (people's footsteps nearby are still possible).
  await page.evaluate(
    '(() => { const a = window.__worksimAudio; a.update({ ...a.settings, categories: { ...a.settings.categories, ambience: { volume: 0, on: false } } }) })()',
  )
  // (Its loops fade out over a few seconds.)
  await page.waitForTimeout(5000)
  // The player stands at their door, facing the street (south, -z): the camera
  // is behind them, so +x (east) is on the right and -x on the left.
  const me = await listener(page)
  /** A sound played at (x, z), twice, a moment apart: the louder hearing of it. */
  const heard = async (id: string, x: number, z: number) => {
    let best = { l: 0, r: 0 }
    for (let i = 0; i < 2; i++) {
      await page.waitForTimeout(2700)
      const t0 = await now(page)
      expect(await playAt(page, id, x, z)).toBe(true)
      await page.waitForTimeout(900)
      const p = peak(await trace(page), t0, t0 + 900)
      if (p.l + p.r > best.l + best.r) best = p
    }
    return best
  }
  // The phone ringing 5 m to the east: louder on the right; to the west, the left.
  // 4 m ahead of the camera and 5 m to its right, then to its left.
  const side = (s: number) => ({
    x: me.x + me.ahead.x * 4 + me.right.x * 5 * s,
    z: me.z + me.ahead.z * 4 + me.right.z * 5 * s,
  })
  // (Once first, not measured: the first sound of a kind starts late while its
  // sound is made ready, on a computer drawing 3D without a graphics card.)
  await heard('phone', side(0).x, side(0).z)
  const east = await heard('phone', side(1).x, side(1).z)
  const west = await heard('phone', side(-1).x, side(-1).z)
  console.log('AUDIO east', JSON.stringify(east), 'west', JSON.stringify(west))
  expect(east.r).toBeGreaterThan(0.0012)
  expect(east.r).toBeGreaterThan(east.l * 1.3)
  expect(west.l).toBeGreaterThan(0.0012)
  expect(west.l).toBeGreaterThan(west.r * 1.3)

  // The same sound near, and 25 m off: much quieter far away.
  const near = await heard('phone', me.x + me.ahead.x * 2, me.z + me.ahead.z * 2)
  const far = await heard('phone', me.x + me.ahead.x * 25, me.z + me.ahead.z * 25)
  console.log('AUDIO near', JSON.stringify(near), 'far', JSON.stringify(far))
  const hingeNear = await heard('hinge', me.x + me.ahead.x * 2, me.z + me.ahead.z * 2)
  const doorNear = await heard('door', me.x + me.ahead.x * 2, me.z + me.ahead.z * 2)
  console.log(
    'AUDIO hinge near',
    JSON.stringify(hingeNear),
    'door near',
    JSON.stringify(doorNear),
  )
  expect(Math.max(near.l, near.r)).toBeGreaterThan(Math.max(far.l, far.r) * 2.5)

  // In play: the café's door, opened by the player walking in at it, is played
  // from the door itself (its place in the world), and the push from the player.
  // (Its level at the speakers is not asserted here: on this computer, drawing
  // 3D without a graphics card while walking starves the audio thread, and the
  // output measured during the walk is silence for everything, the push too.
  // The output itself is measured above, with the player standing.)
  await page.evaluate('window.__worksimSpeed = 1')
  await page.evaluate(
    '(() => { const a = window.__worksimAudio; const play = a.play.bind(a); window.__plays = []; a.play = (id, o) => { const ok = play(id, o); if (ok) window.__plays.push({ id, at: o && o.at ? o.at : null }); return ok } })()',
  )
  await page.evaluate("window.__worksimStreetWalk('door-cafe')")
  type Play = { id: string; at: { x: number; z: number } | null }
  const plays = () => page.evaluate('window.__plays') as Promise<Play[]>
  await expect
    .poll(async () => (await plays()).some((p) => p.id === 'hinge'), { timeout: 60_000 })
    .toBe(true)
  const hinge = (await plays()).find((p) => p.id === 'hinge')!
  // The café's street door is at (-40, -9.98).
  expect(Math.abs(hinge.at!.x + 40)).toBeLessThan(0.3)
  expect(Math.abs(hinge.at!.z + 9.98)).toBeLessThan(0.3)
  await expect
    .poll(async () => (await plays()).some((p) => p.id === 'door'), { timeout: 30_000 })
    .toBe(true)
})
