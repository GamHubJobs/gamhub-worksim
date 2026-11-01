import { describe, expect, it } from 'vitest'
import { CAREERS } from '../content/careers'
import { CASES } from '../content/cases'
import { DESK_ITEMS, DESK_SLOTS } from '../content/desk'
import { PROJECTS } from '../content/projects'
import { HOURS } from '../content/workday'
import { ACHIEVEMENTS, checkAchievements, mainTool } from './achievements'
import { careerAssignments, newProfileData, type ProfileData } from './career'
import { chooseDeskItem, deskLayout, isUnlocked } from './desk'
import { skipToAssignment } from './devTools'
import { toolsOf } from './portfolio'

function profileFor(careerId: string): ProfileData {
  const base = newProfileData('Alex', 1, careerId)
  return { ...base, work: { ...base.work, minute: HOURS.start + 60 } }
}

/** The step kinds the case-based achievements need, by case kind. */
const NEEDS: Record<string, [string, string[]]> = {
  'ethical-judgement': ['decide', ['incident']],
  'clean-handoff': ['handoff', ['workflow']],
  'budget-guardian': ['approve', ['operations']],
  'good-delegation': ['assign', ['leadership']],
  'careful-reviewer': ['review', ['leadership']],
  'fair-resolution': ['decide', ['leadership']],
}

describe('achievements', () => {
  it('have unique IDs, and none is earned by a brand-new career', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length)
    for (const career of CAREERS) {
      const fresh = profileFor(career.id)
      expect(checkAchievements(fresh, 1)).toBe(fresh)
    }
  })

  it('can all be earned in every career (the content each needs exists)', () => {
    for (const career of CAREERS) {
      const cases = CASES.filter((c) => c.careerId === career.id)
      for (const [id, [stepKind, kinds]] of Object.entries(NEEDS)) {
        expect(
          cases.some(
            (c) => kinds.includes(c.kind) && c.steps.some((s) => s.kind === stepKind),
          ),
          `${id} in ${career.id}`,
        ).toBe(true)
      }
      expect(PROJECTS.some((p) => p.careerId === career.id)).toBe(true)
      const tool = mainTool(career.id)
      expect(
        careerAssignments(career.id).filter((a) => toolsOf(a)[0] === tool).length,
      ).toBeGreaterThanOrEqual(3)
      expect(career.levels.length).toBeGreaterThanOrEqual(4)
    }
  })

  it('are earned by real work, kept with the day, and logged once', () => {
    const career = 'it-support'
    const assignments = careerAssignments(career)
    let profile = profileFor(career)
    profile = { ...profile, work: { ...profile.work, day: 4 } }
    // Passing every task up to the sixth earns the task achievements.
    profile = skipToAssignment(profile, assignments[6].id)
    const earned = checkAchievements(profile, 99)
    const record = earned.work.record.achievements
    expect(record['first-delivery']).toEqual({ day: 4, at: 99 })
    expect(record['right-first-time']).toBeDefined()
    expect(record['excellent-work']).toBeDefined()
    expect(record['first-promotion']).toBeDefined()
    expect(record['customer-care']).toBeUndefined()
    const logged = earned.work.today.log.filter((l) => l.text.startsWith('Achievement'))
    expect(logged.map((l) => l.text)).toContain('Achievement earned: First delivery.')
    // Checking again changes nothing.
    expect(checkAchievements(earned, 200)).toBe(earned)
  })

  it('are never taken away', () => {
    const profile = profileFor('accounting')
    const earned: ProfileData = {
      ...profile,
      work: {
        ...profile.work,
        record: {
          ...profile.work.record,
          achievements: { 'trusted-colleague': { day: 2, at: 5 } },
        },
      },
    }
    expect(checkAchievements(earned, 10).work.record.achievements).toEqual({
      'trusted-colleague': { day: 2, at: 5 },
    })
  })
})

describe('the desk', () => {
  it('has an earnable item for every slot, each unlocked by a real achievement or level', () => {
    for (const slot of DESK_SLOTS)
      expect(
        DESK_ITEMS.filter((i) => i.slot === slot.id && i.unlock).length,
      ).toBeGreaterThan(0)
    for (const item of DESK_ITEMS) {
      if (item.unlock && 'achievement' in item.unlock)
        expect(ACHIEVEMENTS.map((a) => a.id)).toContain(item.unlock.achievement)
    }
  })

  it('starts with the defaults, and only takes items the player has earned', () => {
    const fresh = profileFor('data-analytics')
    expect(Object.values(deskLayout(fresh)).map((i) => i!.id)).toEqual([
      'mug-white',
      'chair-blue',
    ])
    expect(chooseDeskItem(fresh, 'plant', 'succulent')).toBe(fresh)
    const earned = checkAchievements(
      skipToAssignment(fresh, careerAssignments('data-analytics')[1].id),
      1,
    )
    expect(
      isUnlocked(
        earned,
        DESK_ITEMS.find((i) => i.id === 'succulent')!,
      ),
    ).toBe(true)
    const placed = chooseDeskItem(earned, 'plant', 'succulent')
    expect(deskLayout(placed).plant?.id).toBe('succulent')
    // An item in the wrong slot, or clearing the chair, is refused.
    expect(chooseDeskItem(placed, 'mug', 'succulent')).toBe(placed)
    expect(chooseDeskItem(placed, 'chair', null)).toBe(placed)
    expect(deskLayout(chooseDeskItem(placed, 'plant', null)).plant).toBeUndefined()
  })

  it('ignores a saved item that is unknown or not earned', () => {
    const fresh = profileFor('software-development')
    const tampered: ProfileData = {
      ...fresh,
      work: {
        ...fresh.work,
        record: { ...fresh.work.record, desk: { plant: 'monstera', chair: 'throne' } },
      },
    }
    const layout = deskLayout(tampered)
    expect(layout.plant).toBeUndefined()
    expect(layout.chair?.id).toBe('chair-blue')
  })
})
