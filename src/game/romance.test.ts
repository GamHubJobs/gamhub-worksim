import { describe, expect, it } from 'vitest'
import { ADULTS } from '../content/adults'
import { TOWN_PEOPLE } from '../content/townPeople'
import { LifeSchema } from '../persistence/schemas'
import { officeWho } from '../office/scene/officeCast'
import { newProfileData, type ProfileData } from './career'
import { holdEncounter, meet, relationOf, respond } from './encounters'
import { answered, ask, bondOf, NEW_BOND, talked, type Bond } from './romance'

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
