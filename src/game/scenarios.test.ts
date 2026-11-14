import { describe, expect, it } from 'vitest'
import { CAREERS } from '../content/careers'
import { getCase } from '../content/cases'
import { departmentFor } from '../content/departments'
import { SCENARIOS } from '../content/scenarios'
import type { Scenario } from '../content/scenarios/types'
import { HOURS } from '../content/workday'
import { bayFor, floorWith } from '../office/scene/bays'
import { themeOf } from '../office/scene/themeLayout'
import { buildGrid, findPath, standing } from '../world/physics/nav'
import { newProfileData, type ProfileData } from './career'
import { arriveCase } from './cases'
import { now } from './deadlines'
import {
  advance,
  applyScenario,
  bandFor,
  beatOf,
  choose,
  isOver,
  percentOf,
  present,
  speak,
  startRun,
  type Run,
} from './scenarios'

/** Plays a scenario through, always taking the best (or the worst) answer. */
export function playThrough(s: Scenario, best: boolean): Run {
  let run = startRun(s)
  for (let guard = 0; guard < 200 && !isOver(s, run); guard++) {
    const beat = beatOf(s, run)
    if (beat.kind === 'say') run = advance(s, run)
    else if (beat.kind === 'choose') {
      const sorted = [...beat.options].sort((a, b) => b.score - a.score)
      run = choose(s, run, (best ? sorted[0] : sorted[sorted.length - 1]).id).run
    } else if (beat.kind === 'exhibit')
      run = present(
        s,
        run,
        best ? beat.correct : beat.items.find((i) => i !== beat.correct)!,
      ).run
    else if (beat.kind === 'speak')
      run = speak(s, run, best ? beat.model : 'I agree.').run
  }
  return run
}

function profileFor(careerId: string): ProfileData {
  const base = newProfileData('Alex', 1, careerId)
  return { ...base, work: { ...base.work, minute: HOURS.start + 60 } }
}

describe.each(SCENARIOS.map((s) => [s.id, s] as const))('scenario %s', (_, s) => {
  const ids = s.beats.map((b) => b.id)
  const cast = new Set(s.cast.map((c) => c.id))

  it('is well formed: beats, cast, exhibits and links all exist', () => {
    expect(new Set(ids).size).toBe(ids.length)
    expect(s.beats.at(-1)?.kind).toBe('end')
    for (const beat of s.beats) {
      if (beat.kind === 'say' && beat.who !== 'narrator')
        expect(cast, beat.id).toContain(beat.who)
      if ('who' in beat && beat.who && beat.who !== 'narrator')
        expect(cast).toContain(beat.who)
      if (beat.kind === 'choose') {
        expect(
          beat.options.some((o) => o.score === 1),
          beat.id,
        ).toBe(true)
        for (const o of beat.options) {
          expect(o.score).toBeGreaterThanOrEqual(0)
          expect(o.score).toBeLessThanOrEqual(1)
          if (o.goto) expect(ids).toContain(o.goto)
          for (const line of o.reply)
            if (line.who !== 'narrator')
              expect(cast, `${beat.id}/${o.id}`).toContain(line.who)
        }
      }
      if (beat.kind === 'exhibit') {
        const exhibits = (s.exhibits ?? []).map((e) => e.id)
        for (const item of beat.items) expect(exhibits).toContain(item)
        expect(beat.items).toContain(beat.correct)
      }
    }
    for (const c of s.cast) for (const m of c.moves ?? []) expect(ids).toContain(m.from)
    for (const id of Object.keys(s.skills))
      expect(CAREERS.find((c) => c.id === s.careerId)?.skills).toContain(id)
  })

  it('is played in its career’s own workplace, where the player can stand', () => {
    expect(departmentFor(s.careerId).workplace ?? 'office').toBe(s.workplace)
    const boxes =
      s.workplace === 'office'
        ? floorWith(null)
        : floorWith(bayFor(s.workplace), themeOf(s.workplace))
    const grid = buildGrid(boxes, 0.32)
    expect(standing(grid, boxes, s.player.at)).toBe(true)
    expect(findPath(grid, { x: 2.4, z: 2.4 }, s.player.at)).not.toBeNull()
  })

  it('rewards the best answers and not the worst', () => {
    const best = playThrough(s, true)
    expect(percentOf(best)).toBe(100)
    expect(bandFor(percentOf(best))).toBe('excellent')
    const worst = playThrough(s, false)
    expect(bandFor(percentOf(worst))).toBe('poor')
  })

  it('gives XP the first time only, and records the result', () => {
    const profile = profileFor(s.careerId)
    const once = applyScenario(profile, s, playThrough(s, true), 1)
    expect(once.xp - profile.xp).toBe(s.xp)
    expect(once.work.scenarios?.[s.id]).toMatchObject({
      best: 100,
      times: 1,
      band: 'excellent',
    })
    const twice = applyScenario(once, s, playThrough(s, false), 2)
    expect(twice.xp).toBe(once.xp)
    expect(twice.work.scenarios?.[s.id]).toMatchObject({
      best: 100,
      last: percentOf(playThrough(s, false)),
      times: 2,
    })
  })

  it.runIf(!!s.caseLink)(
    'joins its case’s meeting and gives the case its answers',
    () => {
      const link = s.caseLink!
      const def = getCase(link.caseId)!
      let profile = arriveCase(profileFor(s.careerId), def, 1)
      // The meeting is on.
      const arrived = profile.work.cases[def.id]!.arrivedAt
      const start = arrived + def.meeting!.inHours * 60
      profile = {
        ...profile,
        work: {
          ...profile.work,
          minute: profile.work.minute + (start - now(profile.work)) + 1,
        },
      }
      const after = applyScenario(profile, s, playThrough(s, true), 1)
      const progress = after.work.cases[def.id]!
      expect(progress.joinedAt).toBeDefined()
      for (const a of link.answers)
        expect(Object.values(a.options)).toContain(progress.answers[a.step])
    },
  )
})
