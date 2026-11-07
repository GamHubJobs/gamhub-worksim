import { describe, expect, it } from 'vitest'
import { ADULTS } from '../content/adults'
import { TOWN_PEOPLE } from '../content/townPeople'
import { LifeSchema } from '../persistence/schemas'
import { officeWho } from '../office/scene/officeCast'
import { newProfileData, type ProfileData } from './career'
import { holdEncounter, meet, relationOf, respond } from './encounters'
import { goToBed } from './life'
import {
  answered,
  ask,
  atHome,
  bondOf,
  NEW_BOND,
  talked,
  withBond,
  type Bond,
} from './romance'
import { missedDates, stayTheNight } from './dates'
import { familyNight, marry } from './family'

const ctx = { day: 10, public: false, colleague: false }
const maya = ADULTS['cafe:barista']
const leila = ADULTS.backM
const close: Bond = { ...NEW_BOND, stage: 'friends', closeness: 45, attraction: 40 }

describe('the adults of the world', () => {
  it('are all adults, each with their own interests, wants and boundaries', () => {
    for (const a of Object.values(ADULTS)) {
      expect(a.age, a.id).toBeGreaterThanOrEqual(18)
      expect(a.likes.length, a.id).toBeGreaterThan(0)
    }
    expect(new Set(Object.values(ADULTS).map((a) => a.likes.join())).size).toBe(
      Object.keys(ADULTS).length,
    )
    // Some are simply not interested in romance with the player.
    expect(Object.values(ADULTS).some((a) => !a.romance)).toBe(true)
  })
})

describe('consent: every step is asked, and can be declined', () => {
  it('too soon is “not yet”; someone not interested says no, kindly', () => {
    expect(ask(maya, NEW_BOND, 'date', ctx).answer).toBe('not-yet')
    expect(ask(maya, close, 'date', ctx).answer).toBe('yes')
    const no = ask(leila, { ...close, attraction: 90 }, 'date', ctx)
    expect(no.answer).toBe('no')
    expect(no.line).toMatch(/friend/)
  })

  it('a no is respected: the same thing cannot be asked again for a few days', () => {
    const cold: Bond = { ...close, attraction: 5 }
    const a = ask(maya, cold, 'date', ctx)
    expect(a.answer).toBe('no')
    const after = answered(cold, 'date', a, 10, 'Maya')
    // Even if things change, not again straight away.
    expect(
      ask(maya, { ...after, attraction: 60 }, 'date', { ...ctx, day: 11 }).answer,
    ).toBe('no')
    expect(
      ask(maya, { ...after, attraction: 60 }, 'date', { ...ctx, day: 14 }).answer,
    ).toBe('yes')
  })

  it('boundaries: taking it slowly, privacy, and not dating colleagues', () => {
    const dating: Bond = {
      ...close,
      stage: 'dating',
      closeness: 60,
      attraction: 70,
      dates: 1,
    }
    expect(ask(maya, dating, 'kiss', ctx).answer).toBe('not-yet')
    expect(ask(maya, { ...dating, dates: 2 }, 'kiss', ctx).answer).toBe('yes')
    const chris = ADULTS['gym:runner1']
    expect(ask(chris, dating, 'kiss', { ...ctx, public: true }).answer).toBe('not-yet')
    expect(ask(chris, dating, 'kiss', ctx).answer).toBe('yes')
    expect(ask(leila, dating, 'date', { ...ctx, colleague: true }).line).toMatch(
      /separate/,
    )
  })

  it('the same question in the same situation always gets the same answer', () => {
    for (let i = 0; i < 5; i++)
      expect(ask(maya, close, 'kiss', ctx)).toEqual(ask(maya, close, 'kiss', ctx))
  })
})

describe('a bond grows slowly, through real conversations', () => {
  it('closeness once a day; attraction only for people open to it; stages follow', () => {
    let b = NEW_BOND
    b = talked(b, maya, 'flirt', true)
    const once = b
    b = talked(b, maya, 'flirt', false)
    expect(b.closeness).toBe(once.closeness)
    expect(talked(close, leila, 'flirt', true).attraction).toBe(close.attraction)
    let days = NEW_BOND
    for (let d = 0; d < 12; d++)
      days = talked(days, maya, 'interests', true, maya.likes[0])
    expect(days.stage).toBe('close')
    expect(days.known).toEqual([maya.likes[0]])
    expect(talked(close, maya, 'rude', true).closeness).toBeLessThan(close.closeness)
  })
})

describe('in conversation, and in the save', () => {
  const at = (minute = 19 * 60) => ({ availability: 'free' as const, minute })
  const who = TOWN_PEOPLE.barista

  it('personal options appear for the adults who could become close, not for everyone else', () => {
    const p = newProfileData('Alex Rivera', 0)
    const ids = (w: typeof who) =>
      meet(w, at(), relationOf(p, w.id)).options.map((o) => o.id)
    expect(ids(who)).toContain('interests')
    expect(ids(who)).not.toContain('ask-out')
    expect(ids(TOWN_PEOPLE.cashier)).not.toContain('interests')
    expect(ids(officeWho().manager)).not.toContain('compliment')
  })

  it('getting to know Maya over days, asking her out: the date is arranged and kept', () => {
    let p: ProfileData = newProfileData('Alex Rivera', 0)
    for (let day = 0; day < 14; day++) {
      p = {
        ...p,
        work: { ...p.work, day: 1 + day, today: { ...p.work.today, talks: {} } },
      }
      const rel = relationOf(p, who.id)
      const offered = meet(who, at(), rel).options.map((o) => o.id)
      // A flirt once they are friends; otherwise getting to know them.
      const option = offered.includes('flirt')
        ? 'flirt'
        : offered.includes('interests')
          ? 'interests'
          : 'chat'
      p = holdEncounter(p, [who.id], respond(who, at(), rel, option), 'out')
    }
    const before = bondOf(p.work.life, who.id)
    expect(before.stage).not.toBe('met')
    p = { ...p, work: { ...p.work, today: { ...p.work.today, talks: {} } } }
    const rel = relationOf(p, who.id)
    expect(meet(who, at(), rel).options.map((o) => o.id)).toContain('ask-out')
    const out = respond(who, at(), rel, 'ask-out')
    p = holdEncounter(p, [who.id], out, 'out')
    const bond = bondOf(p.work.life, who.id)
    expect(bond.date).not.toBeNull()
    expect(bond.date!.day).toBeGreaterThan(p.work.day)
    expect(bond.history.at(-1)!.text).toMatch(/said yes/)
    // In the save, through the schema.
    expect(LifeSchema.parse(p.work.life).bonds[who.id].date).toEqual(bond.date)
  })

  it('older saves without bonds load, with none', () => {
    const p = newProfileData('Alex Rivera', 0)
    const { bonds: _b, ...old } = p.work.life
    void _b
    expect(LifeSchema.parse(old).bonds).toEqual({})
  })
})

describe('evenings at home, staying over, moving in', () => {
  const who = TOWN_PEOPLE.barista
  const at = { availability: 'free' as const, minute: 19 * 60 }
  const withMaya = (b: Partial<Bond>): ProfileData => {
    const p = newProfileData('Alex Rivera', 0)
    return {
      ...p,
      work: {
        ...p.work,
        life: {
          ...p.work.life,
          bonds: {
            [who.id]: {
              ...NEW_BOND,
              stage: 'dating',
              closeness: 60,
              attraction: 70,
              ...b,
            },
          },
        },
      },
    }
  }

  it('dating: they can be asked round, and they come that evening', () => {
    const p = withMaya({})
    const rel = relationOf(p, who.id)
    expect(meet(who, at, rel).options.map((o) => o.id)).toContain('invite-home')
    const next = holdEncounter(p, [who.id], respond(who, at, rel, 'invite-home'), 'out')
    expect(bondOf(next.work.life, who.id).visit).toBe(next.work.day)
    const home = {
      ...next.work.life,
      phase: 'evening' as const,
      minute: 19 * 60 + 40,
      city: { ...next.work.life.city, at: 'home' as const, inside: true },
    }
    expect(atHome(home, next.work.day)).toEqual({ id: who.id, living: false })
    expect(atHome({ ...home, minute: 18 * 60 }, next.work.day)).toBeNull()
  })

  it('staying over is asked: not yet while just dating; yes for a couple, and they wake up there', () => {
    expect(
      ask(maya, withMaya({}).work.life.bonds![who.id] as Bond, 'stay-over', ctx).answer,
    ).toBe('not-yet')
    const couple = {
      ...NEW_BOND,
      stage: 'partners' as const,
      closeness: 80,
      attraction: 80,
    }
    expect(ask(maya, couple, 'stay-over', ctx).answer).toBe('yes')
    const life = stayTheNight(withMaya(couple).work.life, who.id, 3)
    const morning = {
      ...life,
      phase: 'morning' as const,
      city: { ...life.city, at: 'home' as const, inside: true },
    }
    expect(atHome(morning, 3)).toEqual({ id: who.id, living: false })
    expect(bondOf(life, who.id).history.at(-1)!.text).toMatch(/stayed the night/)
  })

  it('a visit not gone to is missed', () => {
    const life = missedDates(withMaya({ visit: 1 }).work.life, 1)
    expect(bondOf(life, who.id).visit).toBeNull()
    expect(bondOf(life, who.id).history.at(-1)!.text).toMatch(/you were not there/)
  })

  it('moving in, asked as a couple: they live there, and pay half the rent', () => {
    const p = withMaya({ stage: 'partners', closeness: 85, attraction: 80 })
    const rel = relationOf(p, who.id)
    expect(meet(who, at, rel).options.map((o) => o.id)).toContain('move-in')
    const next = holdEncounter(p, [who.id], respond(who, at, rel, 'move-in'), 'out')
    expect(next.work.life.partner?.id).toBe(who.id)
    expect(relationOf(next, who.id).together).toBe(true)
    expect(
      meet(who, at, relationOf(next, who.id)).options.map((o) => o.id),
    ).not.toContain('move-in')
    // Wherever the player is at home, they are there.
    const home = {
      ...next.work.life,
      city: { ...next.work.life.city, at: 'home' as const, inside: true },
    }
    expect(atHome(home, next.work.day)).toEqual({ id: who.id, living: true })
  })
})

describe('living together: the rent', () => {
  it('on Monday morning, half the rent is the player’s when they live with someone', () => {
    const base = newProfileData('Alex Rivera', 0)
    const friday = (partner: boolean): ProfileData => ({
      ...base,
      work: {
        ...base.work,
        day: 5,
        dayOver: true,
        life: {
          ...base.work.life,
          phase: 'evening',
          minute: 22 * 60,
          rentWeek: 1,
          city: { ...base.work.life.city, at: 'home', inside: true },
          partner: partner ? { id: 'cafe:barista', since: 1 } : null,
        },
      },
    })
    const paid = (p: ProfileData) => p.work.life.money - goToBed(p).work.life.money
    const alone = paid(friday(false))
    const together = paid(friday(true))
    expect(alone).toBeGreaterThan(0)
    expect(together).toBe(Math.round(alone / 2))
  })
})

describe('marriage, a family, and when things go wrong', () => {
  const who = TOWN_PEOPLE.barista
  const at = { availability: 'free' as const, minute: 19 * 60 }
  const living = (b: Partial<Bond>): ProfileData => {
    const p = newProfileData('Alex Rivera', 0)
    return {
      ...p,
      work: {
        ...p.work,
        life: {
          ...p.work.life,
          partner: { id: who.id, since: 1 },
          bonds: {
            [who.id]: {
              ...NEW_BOND,
              stage: 'partners',
              closeness: 92,
              attraction: 88,
              ...b,
            },
          },
        },
      },
    }
  }
  const say = (p: ProfileData, option: string) =>
    holdEncounter(p, [who.id], respond(who, at, relationOf(p, who.id), option), 'out')
  const options = (p: ProfileData) =>
    meet(who, at, relationOf(p, who.id)).options.map((o) => o.id)

  it('a proposal (asked), a wedding date, and the wedding', () => {
    let p = living({})
    expect(options(p)).toContain('propose')
    p = say(p, 'propose')
    expect(bondOf(p.work.life, who.id).stage).toBe('engaged')
    p = say(p, 'set-wedding')
    const day = bondOf(p.work.life, who.id).wedding!
    expect(day).toBe(p.work.day + 2)
    const life = marry(p.work.life, who.id, day)
    expect(bondOf(life, who.id).stage).toBe('married')
    expect(bondOf(life, who.id).wedding).toBeNull()
  })

  it('a wedding not gone to is postponed, not forgotten', () => {
    const p = living({ stage: 'engaged', wedding: 3 })
    const life = familyNight(p.work.life, 4)
    expect(bondOf(life, who.id).wedding).toBeNull()
    expect(bondOf(life, who.id).stage).toBe('engaged')
    expect(bondOf(life, who.id).history.at(-1)!.text).toMatch(/postponed/)
  })

  it('a family is optional, asked, and only with someone who wants one', () => {
    let p = living({ stage: 'married' })
    expect(options(p)).toEqual(expect.arrayContaining(['family-baby', 'family-adopt']))
    p = say(p, 'family-adopt')
    expect(p.work.life.family.expected).toEqual({ day: p.work.day + 3, adopted: true })
    // They arrive, and are at home.
    const life = familyNight(p.work.life, p.work.day + 3)
    expect(life.family.children).toHaveLength(1)
    expect(life.family.expected).toBeNull()
    // Someone who never wanted children says so, kindly, and it is respected.
    const priti = ADULTS['cafe:friend']
    const married: Bond = { ...NEW_BOND, stage: 'married', closeness: 95, attraction: 90 }
    expect(ask(priti, married, 'family', ctx)).toMatchObject({ answer: 'no' })
  })

  it('breaking up is the player’s choice: separated, and they move out; making up is possible', () => {
    let p = living({})
    expect(options(p)).toContain('break-up')
    p = say(p, 'break-up')
    expect(bondOf(p.work.life, who.id).stage).toBe('separated')
    expect(p.work.life.partner).toBeNull()
    p = {
      ...p,
      work: {
        ...p.work,
        today: { ...p.work.today, talks: {} },
        life: withBond(p.work.life, who.id, {
          ...bondOf(p.work.life, who.id),
          closeness: 60,
          attraction: 60,
        }),
      },
    }
    expect(options(p)).toContain('make-up')
    p = say(p, 'make-up')
    expect(bondOf(p.work.life, who.id).stage).toBe('dating')
  })

  it('they end it themselves only after a long neglect, never at random; working does not count', () => {
    const fine = familyNight(living({ closeness: 40 }).work.life, 5)
    expect(bondOf(fine, who.id).stage).toBe('partners')
    const neglected = familyNight(living({ closeness: 10 }).work.life, 5)
    expect(bondOf(neglected, who.id).stage).toBe('separated')
    expect(neglected.partner).toBeNull()
    // A low patch can be talked through first.
    const p = living({ closeness: 30 })
    expect(options(p)).toContain('make-amends')
    expect(bondOf(say(p, 'make-amends').work.life, who.id).closeness).toBe(42)
  })
})
