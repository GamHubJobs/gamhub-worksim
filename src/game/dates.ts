/**
 * Dates, as they happen (see romance.ts): on the evening arranged, from a
 * little before seven, the other person waits at the café (at a table) or in
 * the park (on a bench). The player goes there, walks up to them, sits down
 * with them (dinner at the café, the bench in the park) and they talk, in
 * three rounds: what the player says, what the other person loves, and asking
 * (always asking) to hold hands or kiss goodnight. How it went changes the
 * bond; a first date that goes well makes them a couple who are dating. Not
 * turning up counts. Pure, so it can be tested.
 */
import { ADULTS, type Adult } from '../content/adults'
import { TOWN_PEOPLE } from '../content/townPeople'
import { officeWho } from '../office/scene/officeCast'
import type { Life } from '../persistence/schemas'
import type { ProfileData } from './career'
import type { Who } from './encounters'
import {
  answered,
  ask,
  bondOf,
  interestName,
  withBond,
  type Answer,
  type Bond,
} from './romance'

/** When they wait: from 6:45 pm until 9:30 pm. */
export const DATE_FROM = 18 * 60 + 45
export const DATE_UNTIL = 21 * 60 + 30

/** Who someone is, for the date's screens. */
export function whoOf(id: string): Who | undefined {
  return Object.values(TOWN_PEOPLE).find((w) => w.id === id) ?? officeWho()[id]
}

/** Someone the player has a date with, here and now (they are waiting). */
export function dateHere(
  profile: ProfileData,
): { id: string; adult: Adult; bond: Bond } | null {
  const life = profile.work.life
  if (life.phase !== 'evening' || !life.city.inside) return null
  if (life.minute < DATE_FROM || life.minute > DATE_UNTIL) return null
  for (const [id, b] of Object.entries(life.bonds ?? {})) {
    const adult = ADULTS[id]
    if (
      adult &&
      b.date &&
      b.date.day === profile.work.day &&
      b.date.place === life.city.at
    )
      return { id, adult, bond: bondOf(life, id) }
  }
  return null
}

/** Dates today that have not happened, by the time the player goes to bed: missed. */
export function missedDates(life: Life, day: number): Life {
  let next = life
  for (const [id, raw] of Object.entries(life.bonds ?? {})) {
    // An evening round at the player's that did not happen (they were out).
    if (raw.visit !== null && raw.visit !== undefined && raw.visit <= day) {
      const b = bondOf(next, id)
      const name = whoOf(id)?.name ?? 'them'
      next = withBond(next, id, {
        ...b,
        visit: null,
        closeness: Math.max(0, b.closeness - 6),
        history: [
          ...b.history,
          { day, text: `${name} came round, but you were not there` },
        ].slice(-20),
      })
    }
    if (!raw.date || raw.date.day > day) continue
    const b = bondOf(next, id)
    const name = whoOf(id)?.name ?? 'them'
    next = withBond(next, id, {
      ...b,
      date: null,
      closeness: Math.max(0, b.closeness - 8),
      attraction: Math.max(0, b.attraction - 6),
      history: [...b.history, { day, text: `Missed a date with ${name}` }].slice(-20),
    })
  }
  return next
}

export interface DateChoice {
  id: string
  label: string
}

/** What there is to say or do in a round of the date (three rounds). */
export function dateChoices(adult: Adult, bond: Bond, round: number): DateChoice[] {
  const out: DateChoice[] = []
  for (const i of bond.known.slice(0, 2))
    out.push({ id: `talk:${i}`, label: `Talk about ${interestName(i as never)}` })
  out.push({ id: 'their-day', label: 'Ask about their day' })
  out.push({ id: 'your-work', label: 'Talk about your work' })
  if (round >= 1) out.push({ id: 'hold-hands', label: 'Ask if you can hold their hand' })
  if (round >= 2) out.push({ id: 'kiss', label: 'Ask if you can kiss them goodnight' })
  out.push({ id: 'end', label: 'Call it a night' })
  void adult
  return out
}

export interface DateMoment {
  lines: string[]
  /** How it went, this round (added up for the date). */
  score: number
  bond: Bond
  answer?: Answer
}

/** What happens when the player says or does something on the date. */
export function dateMoment(
  adult: Adult,
  who: Who,
  bond: Bond,
  choice: string,
  context: { day: number; public: boolean },
): DateMoment {
  const n = who.name.split(' ')[0]
  if (choice.startsWith('talk:')) {
    const i = choice.slice(5)
    const loves = adult.likes.includes(i as never)
    return {
      lines: loves
        ? [
            `*${n} lights up.*`,
            `${n}: “You remembered! Okay, so…”`,
            `*You talk for ages. Time flies.*`,
          ]
        : [`${n}: “Mm. It’s all right.”`],
      score: loves ? 3 : 0,
      bond: { ...bond, closeness: Math.min(100, bond.closeness + (loves ? 3 : 1)) },
    }
  }
  if (choice === 'their-day')
    return {
      lines: [
        `${n}: “Long, honestly. But better now.”`,
        `*${n} tells you about it, and you listen.*`,
      ],
      score: 2,
      bond: { ...bond, closeness: Math.min(100, bond.closeness + 2) },
    }
  if (choice === 'your-work')
    return {
      lines: [
        `*You talk about work.*`,
        adult.likes.length && who.personality === 'chatty'
          ? `${n}: “Ha! Your office sounds like a soap opera.”`
          : `${n}: “That sounds a lot. Do you like it?”`,
      ],
      score: 1,
      bond,
    }
  if (choice === 'hold-hands' || choice === 'kiss') {
    // As a date, they count as dating for what they would say yes to.
    const asDating: Bond = {
      ...bond,
      stage:
        bond.stage === 'friends' || bond.stage === 'close' || bond.stage === 'met'
          ? 'dating'
          : bond.stage,
    }
    const a = ask(adult, asDating, choice, { ...context, colleague: false })
    const after = answered(bond, choice, a, context.day, who.name)
    return {
      lines:
        a.answer === 'yes'
          ? choice === 'kiss'
            ? [`*You ask. ${n} smiles, and you kiss goodnight.*`]
            : context.public
              ? [`*You ask, and ${n} takes your hand across the table.*`]
              : [`*You ask, and ${n} takes your hand.*`]
          : [
              `*You ask.*`,
              `${n}: “${a.line}”`,
              '*You say that is completely fine, and mean it.*',
            ],
      score: a.answer === 'yes' ? 3 : 0,
      bond: {
        ...after,
        attraction: Math.min(100, after.attraction + (a.answer === 'yes' ? 4 : 0)),
      },
      answer: a,
    }
  }
  return { lines: [], score: 0, bond }
}

/**
 * The date is over: it happened (counted), how it went, and what they are
 * now. A first date that went well (and attraction both ways) means dating.
 */
export function finishDate(
  life: Life,
  id: string,
  bond: Bond,
  score: number,
  day: number,
  place: 'cafe' | 'park' | 'home',
): { life: Life; summary: string; bond: Bond } {
  const name = whoOf(id)?.name ?? 'them'
  const n = name.split(' ')[0]
  const good = score >= 5
  const first = bond.dates === 0
  let stage = bond.stage
  if (good && bond.attraction >= 30 && ['met', 'friends', 'close'].includes(stage))
    stage = 'dating'
  const next: Bond = {
    ...bond,
    stage,
    date: place === 'home' ? bond.date : null,
    visit: place === 'home' ? null : bond.visit,
    dates: bond.dates + (place === 'home' ? 0 : 1),
    closeness: Math.min(100, bond.closeness + (good ? 6 : 2)),
    attraction: Math.min(100, bond.attraction + (good ? 6 : 0)),
    history: [
      ...bond.history,
      {
        day,
        text:
          place === 'home'
            ? `An evening at yours with ${name}${good ? ': a lovely one' : ''}`
            : `${first ? 'First date' : 'A date'} with ${name} ${place === 'park' ? 'in the park' : 'at Kettle & Crumb'}${good ? ': it went really well' : ''}`,
      },
    ].slice(-20),
  }
  const summary = good
    ? stage === 'dating' && bond.stage !== 'dating'
      ? `It went really well. You and ${n} are dating now.`
      : `A lovely evening. ${n} is already asking when the next one is.`
    : `A nice evening, if a little quiet. ${n} says goodnight warmly.`
  return { life: withBond(life, id, next), summary, bond: next }
}

/**
 * Asked to stay the night, and they said yes: they stay (shown as a fade to
 * the morning; nothing more), and wake up there too.
 */
export function stayTheNight(life: Life, id: string, day: number): Life {
  const b = bondOf(life, id)
  const name = whoOf(id)?.name ?? 'them'
  return withBond(life, id, {
    ...b,
    visit: null,
    stayOver: day,
    history: [...b.history, { day, text: `${name} stayed the night` }].slice(-20),
  })
}
