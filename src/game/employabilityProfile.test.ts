import { Dexie } from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { getAssignment } from '../content/assignments'
import { createId } from '../lib/ids'
import { WorkSimDatabase } from '../persistence/db'
import { getProfileSettings, saveProfileSettings } from '../persistence/employability'
import type { PortfolioItem, Profile } from '../persistence/schemas'
import {
  buildEmployabilityProfile,
  defaultProfileSettings,
  misleadingWords,
  ProfileSettingsSchema,
} from './employabilityProfile'

const task = getAssignment('supplies-order')!
const profile = {
  id: 'p',
  name: 'Alex',
  careerId: task.careerId,
  levelId: task.levelId,
  assignments: {},
} as unknown as Profile

let next = 0
function item(fields: Partial<PortfolioItem>): PortfolioItem {
  next += 1
  return {
    id: `i${next}`,
    type: 'task',
    profileId: 'p',
    title: `Task ${next}`,
    summary: 'Did the work.',
    score: 90,
    completedAt: next,
    levelTitle: 'Intern',
    levelIndex: 1,
    skills: { formulas: 25 },
    tools: ['sheets'],
    attempts: [{ submittedAt: next, score: 90 }],
    included: true,
    featured: false,
    order: 0,
    ...fields,
  } as PortfolioItem
}

describe('employability profile', () => {
  it('is generated from the records, in the player’s own words', () => {
    const items = [
      item({ featured: true, order: 2 }),
      item({ featured: true, order: 1 }),
      item({}),
    ]
    const built = buildEmployabilityProfile(
      {
        displayName: 'Alex Morgan',
        headline: 'Aspiring analyst',
        summary: 'I like data.',
        hidden: [],
      },
      [profile],
      items,
    )
    expect(built.name).toBe('Alex Morgan')
    expect(built.careers[0].statement).toMatch(
      /^Reached .+ \(level 1 of \d\) in the simulated /,
    )
    expect(built.careers[0].tasksPassed).toBe(3)
    // Three level-1 tasks: Practised (Proficient needs one at level 2 or above).
    expect(built.competencies).toEqual([
      { level: 'practised', names: ['Spreadsheet formulas'] },
    ])
    // Featured work: only items the player featured, in their chosen order.
    expect(built.featured.map((f) => f.title)).toEqual(['Task 2', 'Task 1'])
    expect(built.tools).toEqual([{ name: 'Grid Craft', tasks: 3 }])
    expect(built.honesty).toContain('not a record of employment')
  })

  it('hidden sections are hidden; evidence is never taken from the settings', () => {
    const settings = {
      ...defaultProfileSettings('Alex'),
      hidden: ['tools' as const],
      score: 100,
      employer: 'Big Co',
    }
    const parsed = ProfileSettingsSchema.parse(settings)
    expect(parsed).toEqual({
      displayName: 'Alex',
      headline: '',
      summary: '',
      hidden: ['tools'],
    })
    const built = buildEmployabilityProfile(parsed, [profile], [item({ score: 75 })])
    expect(built.show.tools).toBe(false)
    expect(built.show.careers).toBe(true)
    expect(built.featured).toEqual([])
  })

  it('work left out of exports is never featured; other saves’ work is not counted', () => {
    const built = buildEmployabilityProfile(
      defaultProfileSettings('Alex'),
      [profile],
      [
        item({ featured: true, included: false }),
        item({ profileId: 'other', featured: true }),
      ],
    )
    expect(built.featured).toEqual([])
    // Passed work still counts in the totals even when left out of exports.
    expect(built.experience.tasks).toBe(1)
  })

  it('reminds the player not to describe the simulation as employment or qualifications', () => {
    expect(misleadingWords('Certified accountant with 5 years employment')).toBe(
      'Certified',
    )
    expect(misleadingWords('Worked at Cobalt Ridge')).toBe('Worked at')
    expect(misleadingWords('Enjoy reconciling accounts and learning SQL')).toBeNull()
  })
})

describe('profile settings storage', () => {
  let database: WorkSimDatabase
  afterEach(async () => {
    database.close()
    await Dexie.delete(database.name)
  })

  it('defaults to the career save’s name, and keeps only the allowed fields', async () => {
    database = new WorkSimDatabase(`test-${createId()}`)
    expect(await getProfileSettings('Alex', database)).toEqual(
      defaultProfileSettings('Alex'),
    )
    await saveProfileSettings(
      {
        displayName: ' Alex M ',
        headline: 'Hi',
        summary: '',
        hidden: [],
        extra: 1,
      } as never,
      database,
    )
    expect(await getProfileSettings('Alex', database)).toEqual({
      displayName: 'Alex M',
      headline: 'Hi',
      summary: '',
      hidden: [],
    })
  })
})
