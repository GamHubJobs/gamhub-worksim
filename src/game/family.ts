/**
 * Married life and an optional family (see docs/RELATIONSHIPS_PLAN.md): the
 * wedding day, a child on the way (a baby, shown only as "on the way" and then
 * arrived) or adopted, the children at home, and the nightly look at how a
 * relationship stands: a partner who has felt neglected for a long while can
 * end it (their choice, from what actually happened, never at random), a
 * missed wedding is postponed. Children are only ever children: never part of
 * anything romantic. Nothing here is required by the career. Pure.
 */
import type { Life } from '../persistence/schemas'
import { whoOf } from './dates'
import type { Who } from './encounters'
import { bondOf, withBond, type Bond } from './romance'

const NAMES = ['Ada', 'Theo', 'Isla', 'Kai', 'Noor', 'Rafi']
/** Days a baby is "on the way" in the game (no more is shown), and before an adopted child joins. */
export const BABY_DAYS = 7
export const ADOPTION_DAYS = 3

const event = (b: Bond, day: number, text: string): Bond => ({
  ...b,
  history: [...b.history, { day, text }].slice(-20),
})

/** The wedding: married from today. */
export function marry(life: Life, id: string, day: number): Life {
  const b = bondOf(life, id)
  const name = whoOf(id)?.name ?? 'them'
  return withBond(
    life,
    id,
    event({ ...b, stage: 'married', wedding: null }, day, `Married ${name}`),
  )
}

/** They said yes to a family: a baby on the way, or a child to adopt. */
export function startFamily(life: Life, id: string, day: number, adopted: boolean): Life {
  const b = bondOf(life, id)
  const next = withBond(
    life,
    id,
    event(b, day, adopted ? 'Started the adoption, together' : 'A baby on the way'),
  )
  return {
    ...next,
    family: {
      ...next.family,
      expected: { day: day + (adopted ? ADOPTION_DAYS : BABY_DAYS), adopted },
    },
  }
}

/** Each child, as a person at home (for talking to them: playing, a story, school). */
export function childWho(i: number, name: string): Who {
  return {
    id: `child:${i}`,
    name,
    role: 'Your child',
    kind: 'child',
    personality: 'chatty',
  }
}

/**
 * The night: a child who was due arrives; a missed wedding is postponed; and a
 * partner who has felt neglected for a long time (closeness under 15, from
 * missed dates and evenings) ends it themselves.
 */
export function familyNight(life: Life, day: number): Life {
  let next = life
  const expected = next.family.expected
  if (expected && expected.day <= day) {
    const i = next.family.children.length
    const name = NAMES[(day + i) % NAMES.length]
    next = {
      ...next,
      family: {
        children: [
          ...next.family.children,
          { name, born: day, adopted: expected.adopted },
        ],
        expected: null,
      },
    }
    if (next.partner) {
      const b = bondOf(next, next.partner.id)
      next = withBond(
        next,
        next.partner.id,
        event(b, day, `${name} ${expected.adopted ? 'came home' : 'was born'}`),
      )
    }
  }
  for (const [id] of Object.entries(next.bonds ?? {})) {
    let b = bondOf(next, id)
    const name = whoOf(id)?.name ?? 'them'
    if (b.wedding !== null && b.wedding < day) {
      b = event(
        { ...b, wedding: null, closeness: Math.max(0, b.closeness - 10) },
        day,
        'The wedding was missed, and postponed',
      )
      next = withBond(next, id, b)
    }
    const together = ['dating', 'partners', 'engaged', 'married'].includes(b.stage)
    if (together && b.closeness < 15) {
      next = withBond(
        next,
        id,
        event(
          { ...b, stage: 'separated', date: null, visit: null, wedding: null },
          day,
          `${name} ended it: “I feel like I am always waiting for you.”`,
        ),
      )
      if (next.partner?.id === id) next = { ...next, partner: null }
    }
  }
  return next
}

/** The player ends it (no one can be kept in a relationship): separated, and they move out. */
export function separate(life: Life, id: string, day: number): Life {
  const b = bondOf(life, id)
  const name = whoOf(id)?.name ?? 'them'
  const married = b.stage === 'married'
  const next = withBond(
    life,
    id,
    event(
      {
        ...b,
        stage: 'separated',
        date: null,
        visit: null,
        wedding: null,
        stayOver: null,
        closeness: Math.max(0, b.closeness - 20),
      },
      day,
      married ? `Divorced ${name}` : `Broke up with ${name}`,
    ),
  )
  return next.partner?.id === id ? { ...next, partner: null } : next
}

/** The player's wedding, here and now (in the park, from 6 pm until 9:30 pm on the day). */
export function weddingHere(life: Life, day: number): string | null {
  if (life.phase !== 'evening' || !life.city.inside || life.city.at !== 'park')
    return null
  if (life.minute < 18 * 60 || life.minute > 21 * 60 + 30) return null
  for (const [id, b] of Object.entries(life.bonds ?? {})) if (b.wedding === day) return id
  return null
}
