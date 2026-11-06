import { describe, expect, it } from 'vitest'
import { ADULTS } from '../content/adults'
import { TOWN_PEOPLE } from '../content/townPeople'
import { newProfileData, type ProfileData } from './career'
import { dateChoices, dateHere, dateMoment, finishDate, missedDates } from './dates'
import { bondOf, NEW_BOND, withBond, type Bond } from './romance'
import { calendar, notices } from './phone'

const maya = ADULTS['cafe:barista']
const who = TOWN_PEOPLE.barista
const arranged: Bond = {
  ...NEW_BOND,
  stage: 'friends',
  closeness: 45,
  attraction: 40,
  known: ['baking'],
  date: { day: 1, minute: 19 * 60, place: 'cafe' },
}

/** An evening, at a place, with Maya's date arranged for tonight. */
function evening(at: 'cafe' | 'park' | 'home', minute: number): ProfileData {
  const p = newProfileData('Alex Rivera', 0)
  const life = withBond(
    {
      ...p.work.life,
      phase: 'evening',
      minute,
      city: { ...p.work.life.city, at, inside: true },
    },
    who.id,
    arranged,
  )
  return { ...p, work: { ...p.work, life } }
}

describe('a date, when and where it was arranged', () => {
  it('they are waiting at the café from a little before seven, and not elsewhere or later', () => {
    expect(dateHere(evening('cafe', 19 * 60))?.id).toBe(who.id)
    expect(dateHere(evening('cafe', 18 * 60))).toBeNull()
    expect(dateHere(evening('cafe', 22 * 60))).toBeNull()
    expect(dateHere(evening('park', 19 * 60))).toBeNull()
  })

  it('it is in the phone: the calendar, and a reminder that day', () => {
    const p = evening('home', 18 * 60)
    expect(calendar(p).some((e) => e.title === 'A date with Maya')).toBe(true)
    expect(notices(p).some((n) => n.id.startsWith('date:'))).toBe(true)
  })

  it('not turning up is missed: remembered, and it costs a little closeness', () => {
    const p = evening('home', 23 * 60)
    const life = missedDates(p.work.life, 1)
    const b = bondOf(life, who.id)
    expect(b.date).toBeNull()
    expect(b.closeness).toBeLessThan(arranged.closeness)
    expect(b.history.at(-1)!.text).toMatch(/Missed a date with Maya/)
  })
})

describe('on the date', () => {
  const ctx = { day: 1, public: true }

  it('what to say: their interests the player has found out about; asking comes later', () => {
    const first = dateChoices(maya, arranged, 0).map((c) => c.id)
    expect(first).toContain('talk:baking')
    expect(first).not.toContain('kiss')
    expect(dateChoices(maya, arranged, 2).map((c) => c.id)).toContain('kiss')
  })

  it('talking about what they love goes well; holding hands is asked, and answered', () => {
    expect(dateMoment(maya, who, arranged, 'talk:baking', ctx).score).toBeGreaterThan(
      dateMoment(maya, who, arranged, 'your-work', ctx).score,
    )
    const hands = dateMoment(
      maya,
      who,
      { ...arranged, attraction: 50 },
      'hold-hands',
      ctx,
    )
    expect(hands.answer?.answer).toBe('yes')
    // Maya takes things slowly: no kiss on a first date, and that is respected.
    const kiss = dateMoment(
      maya,
      who,
      { ...arranged, attraction: 70, closeness: 60 },
      'kiss',
      ctx,
    )
    expect(kiss.answer?.answer).toBe('not-yet')
    expect(kiss.lines.join(' ')).toMatch(/completely fine/)
  })

  it('a first date that went well: dating, counted, in their history; the arrangement cleared', () => {
    const p = evening('cafe', 19 * 60)
    const { life, summary } = finishDate(p.work.life, who.id, arranged, 7, 1, 'cafe')
    const b = bondOf(life, who.id)
    expect(b.stage).toBe('dating')
    expect(b.dates).toBe(1)
    expect(b.date).toBeNull()
    expect(summary).toMatch(/dating now/)
    expect(b.history.at(-1)!.text).toMatch(/First date with Maya/)
    // A quiet one does not make them a couple.
    const quiet = finishDate(p.work.life, who.id, arranged, 1, 1, 'cafe')
    expect(bondOf(quiet.life, who.id).stage).toBe('friends')
  })
})
