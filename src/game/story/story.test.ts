import { describe, expect, it } from 'vitest'
import { WorkStateSchema } from '../../persistence/schemas'
import { newProfileData, type ProfileData } from '../career'
import { trustOf } from '../relationships'
import { caseFor } from '../caseVariants'
import { officeWho } from '../../office/scene/officeCast'
import { TOWN_PEOPLE } from '../../content/townPeople'
import { FINANCE_STORY } from './campaigns/finance'
import {
  checkStory,
  currentObjective,
  endStory,
  missionById,
  missionsOf,
  playScene,
  progressOf,
  sceneFor,
  sceneLines,
  seenFinished,
  startMission,
  startStory,
  statusOf,
  storyOf,
} from './engine'

const fresh = () => newProfileData('Alex Rivera', 0, 'office-admin-finance')
const story = (p: ProfileData) => storyOf(p)!
const status = (p: ProfileData, id: string) =>
  statusOf(FINANCE_STORY, story(p), missionById(FINANCE_STORY, id)!)

/** Plays the first morning: Nina, then Priya. */
function firstMorning() {
  let p = startStory(fresh())
  p = playScene(p, 'nina-welcome', 'ask')
  p = playScene(p, 'priya-first', 'good-month')
  return p
}

describe('a story is kept apart from free play', () => {
  it('free play has no story; starting one opens the first mission', () => {
    const p = fresh()
    expect(storyOf(p)).toBeUndefined()
    const s = startStory(p)
    expect(story(s).active).toBe('first-morning')
    expect(currentObjective(FINANCE_STORY, story(s))?.id).toBe('nina')
    // Nothing else about the career changes.
    expect(s.xp).toBe(p.xp)
    expect(s.work.day).toBe(p.work.day)
  })

  it('older saves without a story load unchanged; a story round-trips through the save', () => {
    const p = fresh()
    expect(WorkStateSchema.parse(p.work).story).toBeUndefined()
    const s = firstMorning()
    expect(WorkStateSchema.parse(s.work).story).toEqual(story(s))
  })

  it('putting the story away goes back to free play, keeping the career', () => {
    const s = firstMorning()
    const back = endStory(s)
    expect(storyOf(back)).toBeUndefined()
    expect(back.xp).toBe(s.xp)
  })
})

describe('missions are played by walking up to people', () => {
  it('only the person the current objective names has a scene for the player', () => {
    const p = startStory(fresh())
    expect(sceneFor(p, 'reception')?.id).toBe('nina-welcome')
    // Priya comes second: walking up to her first is ordinary conversation.
    expect(sceneFor(p, 'manager')).toBeNull()
    expect(sceneFor(p, 'backM')).toBeNull()
    const after = playScene(p, 'nina-welcome', 'nervous')
    expect(sceneFor(after, 'manager')?.id).toBe('priya-first')
    expect(sceneLines(after, sceneFor(after, 'manager')!).join(' ')).not.toContain(
      '{name}',
    )
  })

  it('finishing a mission: its reward once, its summary, and what opens next', () => {
    const before = fresh()
    const p = firstMorning()
    expect(story(p).done).toEqual(['first-morning'])
    expect(story(p).finished).toBe('first-morning')
    expect(p.xp).toBe(before.xp + 20)
    expect(trustOf(p.work, 'manager')).toBeGreaterThan(trustOf(before.work, 'manager'))
    // Checking again gives nothing more.
    expect(checkStory(p).xp).toBe(p.xp)
    expect(seenFinished(p).work.story!.finished).toBeNull()
    for (const id of ['faces-and-names', 'missing-invoice', 'bakery'])
      expect(status(p, id)).toBe('open')
    expect(status(p, 'month-end')).toBe('locked')
  })

  it('a choice is made once: playing a scene again changes nothing', () => {
    const p = firstMorning()
    expect(playScene(p, 'nina-welcome', 'nervous')).toBe(p)
  })
})

describe('a mission with several physical objectives', () => {
  it('the missing invoice: two people, a case on the computer, then the manager', () => {
    let p = startMission(firstMorning(), 'missing-invoice')
    expect(story(p).active).toBe('missing-invoice')
    // The case arrives for the player to answer in the work tools.
    expect(p.work.cases['fa-short-delivery']?.status).toBe('open')
    p = playScene(p, 'marcus-invoice', 'fix')
    p = playScene(p, 'ben-files', 'thank')
    expect(currentObjective(FINANCE_STORY, story(p))?.kind).toBe('case')
    // Not done until the case is actually answered.
    expect(sceneFor(p, 'manager')).toBeNull()
    p = checkStory({
      ...p,
      work: {
        ...p.work,
        cases: {
          ...p.work.cases,
          'fa-short-delivery': {
            ...p.work.cases['fa-short-delivery']!,
            status: 'submitted',
          },
        },
      },
    })
    expect(sceneFor(p, 'manager')?.id).toBe('priya-invoice')
    p = playScene(p, 'priya-invoice', 'straight')
    expect(story(p).done).toContain('missing-invoice')
    expect(status(p, 'month-end')).toBe('open')
  })

  it('a meeting objective is done by being at the meeting', () => {
    let p = solveInvoice('fix')
    p = startMission(p, 'month-end')
    expect(currentObjective(FINANCE_STORY, story(p))?.id).toBe('standup')
    p = checkStory({
      ...p,
      work: { ...p.work, today: { ...p.work.today, meetings: { standup: 'attended' } } },
    })
    expect(currentObjective(FINANCE_STORY, story(p))?.id).toBe('word')
  })

  it('a side mission out in town: the neighbour in the park, then the café', () => {
    let p = startMission(firstMorning(), 'bakery')
    p = playScene(p, 'walter-bakery', 'offer')
    expect(currentObjective(FINANCE_STORY, story(p))?.id).toBe('cafe')
    const life = p.work.life
    p = checkStory({
      ...p,
      work: {
        ...p.work,
        life: {
          ...life,
          phase: 'evening',
          city: { ...life.city, at: 'cafe', inside: true },
        },
      },
    })
    expect(story(p).done).toContain('bakery')
    expect(story(p).flags).toContain('bakery-offer')
  })
})

function solveInvoice(choice: 'cover' | 'honest' | 'fix') {
  let p = startMission(firstMorning(), 'missing-invoice')
  p = playScene(p, 'marcus-invoice', choice)
  p = playScene(p, 'ben-files', 'thank')
  p = checkStory({
    ...p,
    work: {
      ...p.work,
      cases: {
        ...p.work.cases,
        'fa-short-delivery': {
          ...p.work.cases['fa-short-delivery']!,
          status: 'submitted',
        },
      },
    },
  })
  return playScene(p, 'priya-invoice', 'straight')
}

describe('decisions change what happens later', () => {
  it('covering for Marcus or fixing the process: Priya says different things, then and at month-end', () => {
    const covered = solveInvoice('cover')
    const fixed = solveInvoice('fix')
    const at = (p: ProfileData) => {
      p = startMission(p, 'month-end')
      p = checkStory({
        ...p,
        work: {
          ...p.work,
          today: { ...p.work.today, meetings: { standup: 'attended' } },
        },
      })
      return sceneLines(p, sceneFor(p, 'manager')!).join(' ')
    }
    expect(at(covered)).toMatch(/auditors/)
    expect(at(fixed)).toMatch(/caught two more/)
    // And the mission summaries differ.
    const m = missionById(FINANCE_STORY, 'missing-invoice')!
    expect(m.summary(story(covered).flags)).not.toBe(m.summary(story(fixed).flags))
    // Trust with Marcus too.
    expect(trustOf(covered.work, 'senior')).toBeGreaterThan(trustOf(fixed.work, 'senior'))
  })

  it('completing the chapter', () => {
    let p = startMission(solveInvoice('fix'), 'month-end')
    p = checkStory({
      ...p,
      work: { ...p.work, today: { ...p.work.today, meetings: { standup: 'attended' } } },
    })
    p = playScene(p, 'priya-month-end', 'own')
    expect(story(p).flags).toContain('chapter1-done')
    expect(progressOf(FINANCE_STORY, story(p))).toEqual({ done: 3, of: 6 })
    expect(story(p).chapter).toBe('ch2')
  })
})

describe('the whole of “Short Delivery”', () => {
  it('holds together: every scene, person and case an objective names exists', () => {
    const people = new Set([
      ...Object.keys(officeWho()),
      ...Object.values(TOWN_PEOPLE).map((w) => w.id),
    ])
    const ids = new Set<string>()
    for (const m of missionsOf(FINANCE_STORY)) {
      expect(ids.has(m.id), m.id).toBe(false)
      ids.add(m.id)
      for (const id of [...(m.after ?? [])])
        expect(ids.has(id), `${m.id} after ${id}`).toBe(true)
      for (const o of m.objectives) {
        if (o.kind === 'talk') {
          expect(FINANCE_STORY.scenes[o.scene], o.scene).toBeDefined()
          expect(FINANCE_STORY.scenes[o.scene].person, o.scene).toBe(o.person)
          expect(people.has(o.person), o.person).toBe(true)
        }
        if (o.kind === 'case') expect(caseFor(fresh(), o.case), o.case).toBeDefined()
      }
    }
    // Every scene is used, and every flag a mission needs can be set by a choice.
    const used = new Set(
      missionsOf(FINANCE_STORY).flatMap((m) =>
        m.objectives.flatMap((o) => (o.kind === 'talk' ? [o.scene] : [])),
      ),
    )
    expect(Object.keys(FINANCE_STORY.scenes).filter((s) => !used.has(s))).toEqual([])
    const settable = new Set([
      ...Object.values(FINANCE_STORY.scenes).flatMap((s) =>
        s.choices.flatMap((c) => c.flags ?? []),
      ),
      ...missionsOf(FINANCE_STORY).flatMap((m) => m.flags ?? []),
    ])
    for (const m of missionsOf(FINANCE_STORY))
      for (const f of m.needs ?? [])
        expect(settable.has(f), `${m.id} needs ${f}`).toBe(true)
  })

  /** Plays the whole story, choosing with `pick` (scene id → choice id). */
  function playAll(pick: Record<string, string>) {
    let p = startStory(fresh())
    const submitted = (q: ProfileData, id: string) =>
      checkStory({
        ...q,
        work: {
          ...q.work,
          cases: { ...q.work.cases, [id]: { ...q.work.cases[id]!, status: 'submitted' } },
        },
      })
    const atStandup = (q: ProfileData) =>
      checkStory({
        ...q,
        work: {
          ...q.work,
          today: { ...q.work.today, meetings: { standup: 'attended' } },
        },
      })
    for (let guard = 0; guard < 60; guard++) {
      const s = story(p)
      if (!s.active) {
        const next = missionsOf(FINANCE_STORY).find(
          (m) => statusOf(FINANCE_STORY, s, m) === 'open',
        )
        if (!next) break
        p = startMission(p, next.id)
        continue
      }
      const o = currentObjective(FINANCE_STORY, s)!
      if (o.kind === 'talk') {
        const scene = FINANCE_STORY.scenes[o.scene]
        p = playScene(p, o.scene, pick[o.scene] ?? scene.choices[0].id)
      } else if (o.kind === 'case') p = submitted(p, o.case)
      else if (o.kind === 'meeting') {
        // A new day's stand-up.
        p = atStandup({
          ...p,
          work: { ...p.work, today: { ...p.work.today, meetings: {} } },
        })
      } else {
        const life = p.work.life
        p = checkStory({
          ...p,
          work: {
            ...p.work,
            life: {
              ...life,
              phase: 'evening',
              city: { ...life.city, at: 'cafe', inside: true },
            },
          },
        })
        p = { ...p, work: { ...p.work, life: { ...p.work.life, phase: 'work' } } }
      }
    }
    return p
  }

  it('can be played to the end, through all three chapters, to three different endings', () => {
    const lead = playAll({
      'priya-offer': 'lead',
      'marcus-first': 'brief',
      'walter-bakery': 'later',
    })
    const marcus = playAll({
      'priya-offer': 'marcus',
      'marcus-first': 'shadow',
      'marcus-secret': 'tell',
    })
    const ownWay = playAll({ 'priya-offer': 'own-way', 'walter-bakery': 'offer' })
    for (const p of [lead, marcus, ownWay]) {
      expect(story(p).flags).toContain('story-complete')
      expect(progressOf(FINANCE_STORY, story(p))).toEqual({ done: 6, of: 6 })
      expect(story(p).chapter).toBe('ch3')
    }
    const ending = (p: ProfileData) =>
      missionById(FINANCE_STORY, 'next-step')!.summary(story(p).flags)
    expect(new Set([ending(lead), ending(marcus), ending(ownWay)]).size).toBe(3)
    // Side missions only when their flag was earned.
    expect(story(marcus).done).toContain('marcus-thursday')
    expect(story(lead).done).not.toContain('marcus-thursday')
    expect(story(ownWay).done).toContain('bakery-books')
    expect(story(lead).done).not.toContain('bakery-books')
  })

  it('what was hidden in chapter 1 comes back in chapter 3', () => {
    const covered = playAll({ 'marcus-invoice': 'cover' })
    const fixed = playAll({ 'marcus-invoice': 'fix' })
    const audit = missionById(FINANCE_STORY, 'audit-week')!
    expect(
      FINANCE_STORY.scenes['nina-auditors'].lines(story(covered).flags).join(' '),
    ).toMatch(/credit note/)
    expect(
      FINANCE_STORY.scenes['nina-auditors'].lines(story(fixed).flags).join(' '),
    ).not.toMatch(/credit note/)
    expect(
      FINANCE_STORY.scenes['marcus-audit'].lines(story(covered).flags).join(' '),
    ).toMatch(/pale/)
    expect(audit.summary(['audit-truth'])).not.toBe(audit.summary([]))
  })
})
