import { describe as group, expect, it } from 'vitest'
import {
  ADOPTED_AGE,
  DAYS_PER_YEAR,
  ageOf,
  atSchool,
  describe,
  homeNow,
  scaleOf,
  stageOf,
} from './children'
import { meet, respond } from './encounters'
import { childWho, familyNight } from './family'
import { newProfileData } from './career'

const rel = { trust: 50, talks: 3, today: 0 }
const ids = (age: number, minute: number) =>
  meet(childWho(0, 'Ada', age), { availability: 'free', minute }, rel).options.map(
    (o) => o.id,
  )

group('children growing up', () => {
  it('a year every two game weeks, through every stage, and taller as they grow', () => {
    const ada = { name: 'Ada', born: 10, adopted: false }
    expect(ageOf(ada, 10)).toBe(0)
    expect(ageOf(ada, 10 + DAYS_PER_YEAR)).toBe(1)
    expect(ageOf(ada, 10 + 7 * DAYS_PER_YEAR + 3)).toBe(7)
    expect([0, 2, 7, 15, 18].map(stageOf)).toEqual([
      'baby',
      'toddler',
      'child',
      'teen',
      'grown',
    ])
    for (let a = 1; a < 18; a++) expect(scaleOf(a)).toBeGreaterThanOrEqual(scaleOf(a - 1))
    expect(scaleOf(17)).toBeLessThanOrEqual(1)
  })

  it('school on weekdays, a quarter to nine until half past three, from five', () => {
    // Day 1 is a Monday; day 6 a Saturday.
    expect(atSchool(7, 1, 10 * 60)).toBe(true)
    expect(atSchool(7, 1, 8 * 60)).toBe(false)
    expect(atSchool(7, 1, 16 * 60)).toBe(false)
    expect(atSchool(7, 6, 10 * 60)).toBe(false)
    expect(atSchool(3, 1, 10 * 60)).toBe(false)
    const ada = { name: 'Ada', born: 1 - 7 * DAYS_PER_YEAR, adopted: false }
    expect(homeNow(ada, 1, 10 * 60)).toBe(false)
    expect(homeNow(ada, 1, 19 * 60)).toBe(true)
    expect(describe(ada, 1, 10 * 60)).toBe('7 years old, at school')
    // Grown up: living away.
    const grown = { name: 'Theo', born: 1 - 19 * DAYS_PER_YEAR, adopted: false }
    expect(homeNow(grown, 1, 19 * 60)).toBe(false)
    expect(describe(grown, 1, 19 * 60)).toContain('grown up')
  })

  it('what there is to do depends on their age', () => {
    expect(ids(0, 19 * 60)).toEqual(['cuddle', 'feed', 'sing', 'leave'])
    expect(ids(3, 19 * 60)).toContain('story')
    expect(ids(3, 16 * 60)).toContain('blocks')
    expect(ids(8, 7 * 60)).toContain('school')
    expect(ids(8, 16 * 60)).toEqual(expect.arrayContaining(['day', 'homework']))
    expect(ids(15, 19 * 60)).toEqual(expect.arrayContaining(['day', 'homework', 'games']))
    expect(ids(15, 19 * 60)).not.toContain('story')
    // Every option has an answer of its own.
    for (const age of [0, 3, 8, 15])
      for (const id of ids(age, 19 * 60).filter((i) => i !== 'leave')) {
        const o = respond(
          childWho(0, 'Ada', age),
          { availability: 'free', minute: 19 * 60 },
          rel,
          id,
        )
        expect(o.lines[0].text).not.toBe('*Ada nods.*')
      }
  })

  it('a baby is born a baby; an adopted child comes home a little one', () => {
    const life = newProfileData('Sam', 0).work.life
    const born = familyNight(
      { ...life, family: { children: [], expected: { day: 20, adopted: false } } },
      20,
    )
    expect(ageOf(born.family.children[0], 20)).toBe(0)
    const adopted = familyNight(
      { ...life, family: { children: [], expected: { day: 20, adopted: true } } },
      20,
    )
    expect(ageOf(adopted.family.children[0], 20)).toBe(ADOPTED_AGE)
    expect(childWho(0, 'Ada', ADOPTED_AGE).role).toBe(`Your child, ${ADOPTED_AGE}`)
  })
})
