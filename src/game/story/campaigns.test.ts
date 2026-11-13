import { describe, expect, it } from 'vitest'
import { TOWN_PEOPLE } from '../../content/townPeople'
import { officeWho } from '../../office/scene/officeCast'
import { newProfileData, type ProfileData } from '../career'
import { caseFor } from '../caseVariants'
import { CAMPAIGNS } from './campaigns'
import { STORY_TITLES } from './titles'
import {
  checkStory,
  currentObjective,
  missionsOf,
  playScene,
  progressOf,
  startMission,
  startStory,
  statusOf,
  storyOf,
} from './engine'
import type { Campaign } from './types'

const people = new Set([
  ...Object.keys(officeWho()),
  ...Object.values(TOWN_PEOPLE).map((w) => w.id),
])

/** Plays a whole campaign, choosing with `pick(scene, choices)`. */
function playAll(
  c: Campaign,
  pick: (scene: string, ids: string[]) => string,
): ProfileData {
  let p = startStory(newProfileData('Alex Rivera', 0, c.careerId))
  for (let guard = 0; guard < 80; guard++) {
    const s = storyOf(p)!
    if (!s.active) {
      const next = missionsOf(c).find((m) => statusOf(c, s, m) === 'open')
      if (!next) break
      p = startMission(p, next.id)
      continue
    }
    const o = currentObjective(c, s)!
    if (o.kind === 'talk')
      p = playScene(
        p,
        o.scene,
        pick(
          o.scene,
          c.scenes[o.scene].choices.map((x) => x.id),
        ),
      )
    else if (o.kind === 'case')
      p = checkStory({
        ...p,
        work: {
          ...p.work,
          cases: {
            ...p.work.cases,
            [o.case]: { ...p.work.cases[o.case]!, status: 'submitted' },
          },
        },
      })
    else if (o.kind === 'meeting')
      p = checkStory({
        ...p,
        work: {
          ...p.work,
          today: { ...p.work.today, meetings: { [o.meeting]: 'attended' } },
        },
      })
    else {
      const life = p.work.life
      p = checkStory({
        ...p,
        work: {
          ...p.work,
          life: {
            ...life,
            phase: 'evening',
            city: { ...life.city, at: o.state.slice(3) as 'cafe', inside: true },
          },
        },
      })
      p = { ...p, work: { ...p.work, life: { ...p.work.life, phase: 'work' } } }
    }
  }
  return p
}

describe('every career has its own story', () => {
  it('the titles on the first screen match the campaigns', () => {
    expect(STORY_TITLES).toEqual(
      Object.fromEntries(CAMPAIGNS.map((c) => [c.careerId, c.title])),
    )
  })

  it('eight campaigns, one per career, each with its own title and people', () => {
    expect(CAMPAIGNS).toHaveLength(8)
    expect(new Set(CAMPAIGNS.map((c) => c.careerId)).size).toBe(8)
    expect(new Set(CAMPAIGNS.map((c) => c.title)).size).toBe(8)
    expect(new Set(CAMPAIGNS.map((c) => c.cast.manager)).size).toBe(8)
  })

  for (const c of CAMPAIGNS)
    describe(`“${c.title}”`, () => {
      it('holds together: every scene, person and case exists; every scene is used', () => {
        const used = new Set<string>()
        for (const m of missionsOf(c))
          for (const o of m.objectives) {
            if (o.kind === 'talk') {
              expect(c.scenes[o.scene], o.scene).toBeDefined()
              expect(c.scenes[o.scene].person).toBe(o.person)
              expect(people.has(o.person), o.person).toBe(true)
              used.add(o.scene)
            }
            if (o.kind === 'case')
              expect(
                caseFor(newProfileData('A', 0, c.careerId), o.case),
                o.case,
              ).toBeDefined()
          }
        expect(Object.keys(c.scenes).filter((s) => !used.has(s))).toEqual([])
        // At least two chapters, side missions, and a choice that changes things.
        expect(c.chapters.length).toBeGreaterThanOrEqual(2)
        expect(missionsOf(c).some((m) => m.type !== 'main')).toBe(true)
      })

      it('can be played to the end, and the end depends on the choices', () => {
        // Five ways of choosing: always the first, always the last, always the
        // second, and the second then the first (a later scene can put things right).
        let n = 0
        const ways = [
          (ids: string[]) => ids[0],
          (ids: string[]) => ids[ids.length - 1],
          (ids: string[]) => ids[1] ?? ids[0],
          (ids: string[]) => (n++ % 2 === 0 ? (ids[1] ?? ids[0]) : ids[0]),
          // The last choice, and standing by it when asked.
          (ids: string[]) => (ids.includes('stand') ? 'stand' : ids[ids.length - 1]),
        ]
        const finale = missionsOf(c)
          .filter((m) => m.type === 'main')
          .at(-1)!
        const endings = new Set<string>()
        for (const way of ways) {
          const p = playAll(c, (_, ids) => way(ids))
          const s = storyOf(p)!
          expect(s.flags).toContain('story-complete')
          const prog = progressOf(c, s)
          expect(prog.done).toBe(prog.of)
          endings.add(finale.summary(s.flags))
        }
        expect(endings.size).toBeGreaterThanOrEqual(2)
      })
    })
})
