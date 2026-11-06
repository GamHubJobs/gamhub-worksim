import { describe, expect, it } from 'vitest'
import { WorkStateSchema } from '../../persistence/schemas'
import { newProfileData, type ProfileData } from '../career'
import { trustOf } from '../relationships'
import { FINANCE_STORY } from './campaigns/finance'
import {
  checkStory,
  currentObjective,
  endStory,
  missionById,
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
    expect(progressOf(FINANCE_STORY, story(p))).toEqual({ done: 3, of: 3 })
  })
})
