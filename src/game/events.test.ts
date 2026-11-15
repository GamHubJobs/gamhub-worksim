import { describe, expect, it } from 'vitest'
import { getAssignment } from '../content/assignments'
import { getCareer } from '../content/careers'
import { newProfileData, recordSubmission, type ProfileData } from './career'
import { checkEvents, eventScene, pendingEvents } from './events'
import type { GradeResult } from './grading'
import { trustOf } from './relationships'
import { applyEffects, recordScene } from './scenes'
import { afterSubmission, passTime } from './workday'

function grade(score: number): GradeResult {
  const rating = score < 70 ? 'fail' : score >= 90 ? 'excellent' : 'good'
  return {
    score,
    rating,
    passed: rating !== 'fail',
    earned: score,
    maxPoints: 100,
    checks: [],
  }
}

function at(profile: ProfileData, minute: number, day = profile.work.day): ProfileData {
  return { ...profile, work: { ...profile.work, day, minute } }
}

let submittedAt = 1

/** Starts (if needed) and submits an assignment with a score. */
function submit(profile: ProfileData, assignmentId: string, score: number): ProfileData {
  const assignment = getAssignment(assignmentId)!
  const started: ProfileData = profile.assignments[assignmentId]
    ? profile
    : {
        ...profile,
        assignments: {
          ...profile.assignments,
          [assignmentId]: {
            assignmentId,
            assignmentVersion: 1,
            documentId: '00000000-0000-4000-8000-000000000000',
            startedAt: 0,
            completedSteps: [],
            attempts: [],
          },
        },
      }
  const result = recordSubmission(started, assignment, grade(score), submittedAt++)
  return afterSubmission(result.profile, assignment, grade(score), result.reward)
}

function choose(profile: ProfileData, eventId: string, choiceId: string): ProfileData {
  const scene = eventScene(profile, eventId)!
  const choice = scene.choices!.find((c) => c.id === choiceId)!
  return applyEffects(recordScene(profile, eventId, choiceId), choice.effects)
}

const pendingIds = (profile: ProfileData) => pendingEvents(profile).map((e) => e.id)

function fresh(): ProfileData {
  return at(newProfileData('Alex Morgan', 0), 10 * 60 + 30)
}

describe('workplace events', () => {
  it('has nothing happen on the first morning', () => {
    expect(pendingIds(checkEvents(fresh()))).toEqual([])
  })

  it('brings feedback straight after a submission that did not pass', () => {
    const failed = checkEvents(submit(fresh(), 'supplies-order', 40))
    expect(pendingIds(failed)).toEqual(['mistake:supplies-order'])
    const scene = eventScene(failed, 'mistake:supplies-order')!
    expect(scene.lines[0]).toContain('40%')
    expect(scene.choices?.map((c) => c.id)).toEqual(['own-it', 'blame', 'self-doubt'])
    const owned = choose(failed, 'mistake:supplies-order', 'own-it')
    const blamed = choose(failed, 'mistake:supplies-order', 'blame')
    expect(trustOf(owned.work, 'manager')).toBeGreaterThan(
      trustOf(blamed.work, 'manager'),
    )
    expect(pendingIds(owned)).toEqual([])
  })

  it('drops the feedback if the task is fixed before Priya comes over', () => {
    const failed = checkEvents(submit(fresh(), 'supplies-order', 40))
    const fixed = checkEvents(submit(failed, 'supplies-order', 80))
    expect(pendingIds(fixed)).not.toContain('mistake:supplies-order')
  })

  it('recognises excellent first-time work, which can make Marcus jealous', () => {
    let profile = checkEvents(submit(fresh(), 'supplies-order', 95))
    expect(pendingIds(profile)).toEqual(['recognition'])
    profile = checkEvents(choose(profile, 'recognition', 'thanks'))
    expect(pendingIds(profile)).toEqual(['marcus-jealous'])
    const calm = choose(profile, 'marcus-jealous', 'acknowledge')
    const snapped = choose(profile, 'marcus-jealous', 'snap')
    expect(trustOf(calm.work, 'senior')).toBeGreaterThan(trustOf(snapped.work, 'senior'))
    expect(snapped.work.reputation).toBeLessThan(calm.work.reputation)
  })

  it('asks for a favour, which lapses with a small cost if ignored', () => {
    let profile = checkEvents(submit(fresh(), 'supplies-order', 80))
    expect(pendingIds(profile)).toEqual(['tom-favour'])
    const before = trustOf(profile.work, 'facilities')
    profile = checkEvents(passTime(profile, 61, 'work'))
    expect(pendingIds(profile)).not.toContain('tom-favour')
    expect(profile.work.events.done['tom-favour'].choice).toBe('ignored')
    expect(trustOf(profile.work, 'facilities')).toBe(before - 2)
    expect(profile.work.today.log.map((e) => e.text)).toContain(
      'You never got back to Tom about the delivery',
    )
  })

  it('makes helping take time and build trust', () => {
    const profile = checkEvents(submit(fresh(), 'supplies-order', 80))
    const helped = choose(profile, 'tom-favour', 'help')
    expect(helped.work.minute).toBe(profile.work.minute + 15)
    expect(trustOf(helped.work, 'facilities')).toBe(
      trustOf(profile.work, 'facilities') + 6,
    )
  })

  it('shows one event at a time', () => {
    let profile = checkEvents(submit(fresh(), 'supplies-order', 80))
    profile = checkEvents(submit(profile, 'expense-summary', 40))
    expect(pendingEvents(profile)).toHaveLength(1)
  })

  it('leads an urgent request to an ethical decision about a colleague’s mistake', () => {
    let profile = submit(fresh(), 'supplies-order', 80)
    profile = submit(profile, 'expense-summary', 80)
    for (const done of ['tom-favour', 'recognition', 'marcus-jealous']) {
      profile = recordScene(profile, done, 'help')
    }
    profile = checkEvents(profile)
    expect(pendingIds(profile)).toEqual(['priya-urgent'])
    const scene = eventScene(profile, 'priya-urgent')!
    // The player has a new task, so asking about priorities is offered.
    expect(scene.choices?.map((c) => c.id)).toEqual(['yes', 'prioritise', 'no'])
    profile = checkEvents(choose(profile, 'priya-urgent', 'prioritise'))
    expect(profile.work.deadlines['invoice-check'].extended).toBe(true)
    expect(pendingIds(profile)).toEqual(['marcus-error'])
    const private_ = choose(profile, 'marcus-error', 'tell-marcus')
    const silent = choose(profile, 'marcus-error', 'quiet-fix')
    expect(trustOf(private_.work, 'senior')).toBeGreaterThan(
      trustOf(silent.work, 'senior'),
    )
  })

  it('has Priya push back when a deadline is missed', () => {
    let profile = at(newProfileData('Alex', 0), 17 * 60 + 20)
    profile = checkEvents(passTime(profile, 15, 'work'))
    expect(profile.work.deadlines['supplies-order'].status).toBe('late')
    // After hours: she waits until the next working day.
    expect(pendingIds(profile)).toEqual([])
    profile = checkEvents(at(profile, 9 * 60 + 30, 2))
    expect(pendingIds(profile)).toEqual(['priya-pressure'])
  })

  it('checks in when the player is overloaded, at most once a week', () => {
    const base = fresh()
    const stressed = {
      ...base,
      work: { ...base.work, wellbeing: { ...base.work.wellbeing, stress: 80 } },
    }
    const profile = checkEvents(stressed)
    expect(pendingIds(profile)).toEqual(['wellbeing-check:1'])
    const honest = choose(profile, 'wellbeing-check:1', 'honest')
    expect(honest.work.wellbeing.stress).toBe(70)
    expect(honest.work.deadlines['supplies-order'].extended).toBe(true)
    expect(pendingIds(checkEvents(honest))).toEqual([])
  })

  it('never starts events outside working hours or after going home', () => {
    const base = at(newProfileData('Alex', 0), 8 * 60 + 55)
    const stressed = {
      ...base,
      work: { ...base.work, wellbeing: { ...base.work.wellbeing, stress: 90 } },
    }
    expect(pendingIds(checkEvents(stressed))).toEqual([])
    const home = {
      ...stressed,
      work: { ...stressed.work, minute: 12 * 60, dayOver: true },
    }
    expect(pendingIds(checkEvents(home))).toEqual([])
  })
})

describe('a promotion told in person', () => {
  const promoted = (): ProfileData => {
    const base = at(newProfileData('Alex Morgan', 0), 10 * 60 + 30)
    const { levels } = getCareer(base.careerId)
    return {
      ...base,
      levelId: levels[1].id,
      inbox: [
        ...base.inbox,
        {
          id: 'promo',
          from: 'manager',
          kind: 'promotion',
          receivedAt: 5,
          readAt: null,
          subject: `Congratulations, you are now ${levels[1].title}!`,
          body: 'Well done.',
        } as ProfileData['inbox'][number],
      ],
    }
  }

  it('the manager asks the player to the office, and announces it there', () => {
    const profile = checkEvents(promoted())
    const [waiting] = pendingEvents(profile)
    expect(waiting).toMatchObject({ person: 'manager', at: 'their-office' })
    const { levels } = getCareer(profile.careerId)
    const scene = eventScene(profile, waiting.id)!
    const said = scene.lines.join(' ')
    expect(said).toContain(`from today you are ${levels[1].title}`)
    expect(said).toContain(levels[0].title)
    expect(said).toMatch(/a week/)
    // Once heard, it is not told again.
    const done = recordScene(profile, waiting.id, 'thanks')
    expect(
      checkEvents({
        ...done,
        work: { ...done.work, events: { ...done.work.events, pending: [] } },
      }).work.events.pending.map((p) => p.id),
    ).not.toContain(waiting.id)
  })

  it('is not held without a promotion, nor at the first level', () => {
    const fresh = checkEvents(at(newProfileData('Alex Morgan', 0), 10 * 60 + 30))
    expect(pendingEvents(fresh).some((e) => e.id.startsWith('promotion-talk:'))).toBe(
      false,
    )
    const noLetter = { ...promoted(), inbox: [] }
    expect(
      pendingEvents(checkEvents(noLetter)).some((e) =>
        e.id.startsWith('promotion-talk:'),
      ),
    ).toBe(false)
  })

  it('other events still come to the desk', () => {
    const profile = checkEvents(
      applyEffects(at(newProfileData('Alex', 0), 10 * 60 + 30), {
        wellbeing: { stress: 60 },
      }),
    )
    for (const e of pendingEvents(profile)) expect(e.at).toBe('desk')
  })
})

describe('the office in person: a new starter, and the printer', () => {
  it('on the new starter’s first day, the manager brings them over to the desk', () => {
    const before = checkEvents(at(newProfileData('Alex', 0), 10 * 60, 2))
    expect(pendingEvents(before).some((e) => e.id === 'new-starter')).toBe(false)
    const profile = checkEvents(at(newProfileData('Alex', 0), 10 * 60, 3))
    const waiting = pendingEvents(profile).find((e) => e.id === 'new-starter')!
    expect(waiting).toMatchObject({ person: 'manager', with: 'starter', at: 'desk' })
    const scene = eventScene(profile, 'new-starter')!
    expect(scene.lines.join(' ')).toContain('joins the team today')
    expect(scene.choices?.map((c) => c.id)).toEqual(['show', 'hello'])
  })

  it('the printer jams on Tuesday afternoons, and the person waits at it', () => {
    const tuesday = checkEvents(at(newProfileData('Alex', 0), 14 * 60 + 30, 2))
    const jam = pendingEvents(tuesday).find((e) => e.id.startsWith('printer-jam:'))
    expect(jam).toMatchObject({ person: 'facilities', at: 'printer' })
    const morning = checkEvents(at(newProfileData('Alex', 0), 10 * 60, 2))
    expect(pendingEvents(morning).some((e) => e.id.startsWith('printer-jam:'))).toBe(
      false,
    )
    const monday = checkEvents(at(newProfileData('Alex', 0), 14 * 60 + 30, 1))
    expect(pendingEvents(monday).some((e) => e.id.startsWith('printer-jam:'))).toBe(false)
  })
})
