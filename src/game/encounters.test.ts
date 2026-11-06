import { describe, expect, it } from 'vitest'
import { officeWho } from '../office/scene/officeCast'
import { local, TOWN_PEOPLE } from '../content/townPeople'
import { newProfileData } from './career'
import {
  holdEncounter,
  meet,
  relationOf,
  respond,
  TALKS_BEFORE_BUSY,
  type Relation,
  type Situation,
  type Who,
} from './encounters'

const fresh: Relation = { trust: 50, talks: 0, today: 0 }
const known: Relation = { trust: 55, talks: 4, today: 0 }
const at = (availability: Situation['availability'], extra: Partial<Situation> = {}) => ({
  availability,
  minute: 10 * 60,
  ...extra,
})

const everyone: Who[] = [
  ...Object.values(officeWho()),
  ...Object.values(TOWN_PEOPLE),
  local('street', 0),
  local('park', 1),
]

describe('talking to anyone', () => {
  it('everyone in every place has something to say and something to be asked', () => {
    for (const who of everyone) {
      const e = meet(who, at('free'), fresh)
      expect(e.opening.length, who.id).toBeGreaterThan(0)
      expect(e.options.length, who.id).toBeGreaterThan(0)
      // Every option has a reply.
      for (const o of e.options) {
        const out = respond(who, at('free'), fresh, o.id)
        expect(out.lines.length, `${who.id} ${o.id}`).toBeGreaterThan(0)
      }
    }
  })

  it('options depend on the work they do: not the same list for everyone', () => {
    const lists = new Set(
      everyone.map((w) =>
        meet(w, at('free'), known)
          .options.map((o) => o.id)
          .join(','),
      ),
    )
    expect(lists.size).toBeGreaterThanOrEqual(10)
    const ids = (w: Who) => meet(w, at('free'), known).options.map((o) => o.id)
    expect(ids(TOWN_PEOPLE.barista)).toContain('order')
    expect(ids(TOWN_PEOPLE.cashier)).toContain('checkout')
    expect(ids(TOWN_PEOPLE.trainer)).toContain('guidance')
    expect(ids(officeWho().manager)).toContain('feedback')
    expect(ids(officeWho().reception)).toContain('directions')
    expect(ids(local('street', 2))).toContain('invite')
  })

  it('a first meeting is an introduction; later, personality shows', () => {
    const leila = officeWho().backM
    const first = meet(leila, at('free'), fresh)
      .opening.map((l) => l.text)
      .join(' ')
    expect(first).toMatch(/I'm Leila/)
    const quiet = meet(officeWho().backR, at('free'), known).opening.at(-1)!.text
    const chatty = meet(leila, at('free'), known).opening.at(-1)!.text
    expect(quiet).not.toBe(chatty)
  })

  it('busy people say so: in a meeting, serving, exercising, heading home', () => {
    for (const a of ['meeting', 'serving', 'exercising', 'leaving'] as const) {
      const e = meet(officeWho().backL, at(a), known)
      expect(e.busy, a).toBe(true)
      expect(e.options.map((o) => o.id)).toEqual(['later', 'interrupt'])
    }
    expect(meet(officeWho().backL, at('working'), known).busy).toBe(false)
  })

  it('people chatting can be joined, and both of them answer', () => {
    const who = officeWho()
    const e = meet(who.backM, at('chatting', { with: who.backL }), known)
    expect(e.options[0].id).toBe('join')
    const out = respond(who.backM, at('chatting', { with: who.backL }), known, 'join')
    const speakers = new Set(out.lines.map((l) => l.speaker).filter(Boolean))
    expect(speakers).toEqual(new Set([who.backM.name, who.backL.name]))
  })

  it('interrupting or being rude costs trust and is remembered', () => {
    const who = officeWho().backM
    expect(respond(who, at('meeting'), known, 'interrupt').trust).toBeLessThan(0)
    const rude = respond(who, at('free'), known, 'rude')
    expect(rude.trust).toBeLessThan(0)
    expect(rude.memory).toBe('rude')
    // Next time, they are wary.
    const next = meet(who, at('free'), { ...known, last: 'rude' })
    expect(next.opening.map((l) => l.text).join(' ')).toMatch(/warily/)
  })

  it('no farming: only the first chat of the day builds trust, and the fourth is turned away', () => {
    const who = officeWho().front2
    expect(respond(who, at('free'), known, 'chat').trust).toBeGreaterThan(0)
    expect(respond(who, at('free'), { ...known, today: 1 }, 'chat').trust).toBe(0)
    const tired = meet(who, at('free'), { ...known, today: TALKS_BEFORE_BUSY })
    expect(tired.busy).toBe(true)
    expect(tired.options.map((o) => o.id)).toEqual(['leave'])
  })

  it('a favour is worth more than a chat, but takes time, and only once a day', () => {
    const who = officeWho().coordinator
    const help = respond(who, at('free'), known, 'help-offer')
    const chat = respond(who, at('free'), known, 'chat')
    expect(help.trust).toBeGreaterThan(chat.trust)
    expect(help.minutes).toBe(15)
    expect(respond(who, at('free'), { ...known, today: 1 }, 'help-offer').trust).toBe(0)
  })

  it('staff can do their job from the conversation (the barista makes a coffee)', () => {
    expect(respond(TOWN_PEOPLE.barista, at('free'), known, 'order').action).toBe(
      'cafe-coffee',
    )
    expect(respond(TOWN_PEOPLE.cashier, at('free'), known, 'checkout').action).toBe(
      'shop-groceries',
    )
  })

  it('the time of day is in the greeting', () => {
    const who = local('street', 0)
    const say = (minute: number) =>
      meet(who, { availability: 'free', minute }, fresh)
        .opening.map((l) => l.text)
        .join(' ')
    expect(say(9 * 60)).toMatch(/Morning/)
    expect(say(19 * 60)).toMatch(/Evening/)
  })
})

describe('what a conversation changes in the save', () => {
  it('trust, the number of talks, today’s count and what was said', () => {
    const p = newProfileData('Alex Rivera', 0)
    const who = officeWho().backM
    const out = respond(who, at('free'), relationOf(p, who.id), 'chat')
    const next = holdEncounter(p, [who.id], out, 'office')
    const rel = relationOf(next, who.id)
    expect(rel.talks).toBe(1)
    expect(rel.today).toBe(1)
    expect(rel.last).toBe('chat')
    expect(rel.trust).toBe(relationOf(p, who.id).trust + out.trust)
    // Time passed in the office.
    expect(next.work.minute).toBeGreaterThan(p.work.minute)
  })

  it('joining a group conversation is remembered by both', () => {
    const p = newProfileData('Alex Rivera', 0)
    const who = officeWho()
    const out = respond(who.backM, at('chatting', { with: who.backL }), fresh, 'join')
    const next = holdEncounter(p, [who.backM.id, who.backL.id], out, 'office')
    expect(relationOf(next, who.backM.id).talks).toBe(1)
    expect(relationOf(next, who.backL.id).talks).toBe(1)
  })

  it('out and about, the evening moves on and a friendly chat helps the social need', () => {
    const base = newProfileData('Alex Rivera', 0)
    const p = {
      ...base,
      work: {
        ...base.work,
        life: { ...base.work.life, needs: { ...base.work.life.needs, social: 40 } },
      },
    }
    const who = TOWN_PEOPLE.walter
    const out = respond(who, at('free'), fresh, 'chat')
    const next = holdEncounter(p, [who.id], out, 'out')
    expect(next.work.life.minute).toBe(p.work.life.minute + out.minutes)
    expect(next.work.life.needs.social).toBeGreaterThan(39)
  })

  it('saying goodbye straight away changes nothing', () => {
    const p = newProfileData('Alex Rivera', 0)
    const who = officeWho().backM
    const out = respond(who, at('free'), fresh, 'leave')
    expect(holdEncounter(p, [who.id], out, 'office')).toBe(p)
  })

  it('older saves (relationships without a memory) still load and work', () => {
    const p = newProfileData('Alex Rivera', 0)
    const old = {
      ...p,
      work: { ...p.work, relationships: { backM: { trust: 60, talks: 2 } } },
    }
    expect(relationOf(old, 'backM')).toMatchObject({
      trust: 60,
      talks: 2,
      today: 0,
      last: undefined,
    })
  })
})
