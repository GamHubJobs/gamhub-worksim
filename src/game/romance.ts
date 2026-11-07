/**
 * Bonds between the player and the adults of the world (see
 * content/adults.ts and docs/RELATIONSHIPS_PLAN.md): how close they are, how
 * much attraction there is, the stage things have reached, what the player
 * has learned about them, and what has happened between them. Trust stays
 * where it always was (`work.relationships`); this adds the rest.
 *
 * Consent is one rule (`ask`): for every step, the other person answers yes,
 * no or not yet, according to who they are, their boundaries, and how things
 * stand. A "no" is respected: the same thing cannot be asked again for a few
 * days. Nothing is ever explicit. Pure, so it can be tested.
 */
import { ADULTS, INTERESTS, type Adult, type Interest } from '../content/adults'
import type { Life } from '../persistence/schemas'

export type Stage =
  | 'met'
  | 'friends'
  | 'close'
  | 'dating'
  | 'partners'
  | 'engaged'
  | 'married'
  | 'separated'

export const STAGE_NAMES: Record<Stage, string> = {
  met: 'Getting to know each other',
  friends: 'Friends',
  close: 'Close friends',
  dating: 'Dating',
  partners: 'Partners',
  engaged: 'Engaged',
  married: 'Married',
  separated: 'Separated',
}

const ORDER: Stage[] = [
  'met',
  'friends',
  'close',
  'dating',
  'partners',
  'engaged',
  'married',
]

export interface Bond {
  stage: Stage
  /** 0–100: how well they know and like each other. */
  closeness: number
  /** 0–100: romantic interest, for people open to it. */
  attraction: number
  /** Interests the player has found out about. */
  known: Interest[]
  /** Something asked and declined, and the day: not asked again for a while. */
  declined: Array<{ step: Step; day: number }>
  /** A date arranged: when and where. */
  date: { day: number; minute: number; place: 'cafe' | 'park' } | null
  dates: number
  /** What has happened between them, newest last. */
  history: Array<{ day: number; text: string }>
  /** An evening at the player's home arranged (the day), and the night they stay (the day). */
  visit: number | null
  stayOver: number | null
  /** The wedding day, once set. */
  wedding: number | null
}

export const NEW_BOND: Bond = {
  stage: 'met',
  closeness: 10,
  attraction: 0,
  known: [],
  declined: [],
  date: null,
  dates: 0,
  history: [],
  visit: null,
  stayOver: null,
  wedding: null,
}

export function bondOf(life: Life, id: string): Bond {
  const b = life.bonds?.[id]
  return b ? ({ ...NEW_BOND, ...b } as Bond) : NEW_BOND
}

export function adultOf(id: string): Adult | undefined {
  return ADULTS[id]
}

/** The steps a relationship can take, each one asked. */
export type Step =
  | 'date'
  /** An evening round at the player's. */
  | 'visit'
  | 'hold-hands'
  | 'hug'
  | 'kiss'
  | 'exclusive'
  | 'stay-over'
  | 'move-in'
  | 'propose'
  /** Starting a family, together. */
  | 'family'

/** Days before something declined can be asked again. */
export const DECLINE_DAYS = 3

export interface Answer {
  answer: 'yes' | 'no' | 'not-yet'
  /** What they say. */
  line: string
}

const at = (s: Stage) => ORDER.indexOf(s)

/**
 * Asking someone for a step: their answer. Never forced; never random; the
 * same question and the same situation give the same answer.
 */
export function ask(
  adult: Adult,
  bond: Bond,
  step: Step,
  context: { day: number; public: boolean; colleague: boolean },
): Answer {
  const recently = bond.declined.find(
    (d) => d.step === step && context.day - d.day < DECLINE_DAYS,
  )
  if (recently)
    return {
      answer: 'no',
      line: 'I said no to that, and I meant it. Please don’t ask again yet.',
    }
  if (step === 'hug') {
    // A hug between friends is fine for most; not for someone who barely knows you.
    if (bond.closeness >= 40) return { answer: 'yes', line: 'Come here.' }
    return { answer: 'not-yet', line: 'Ha, maybe when we know each other a bit better.' }
  }
  if (context.colleague && adult.boundaries.includes('not-at-work'))
    return {
      answer: 'no',
      line: 'I keep work and my personal life separate. Always have.',
    }
  if (!adult.romance)
    return {
      answer: 'no',
      line:
        adult.wants === 'friendship'
          ? 'Oh! That is sweet, but no. I like you as a friend, and I would like to keep it that way.'
          : 'I don’t feel that way, sorry. I hope that is all right.',
    }
  const needs: Record<
    Exclude<Step, 'hug'>,
    { stage: Stage; attraction: number; closeness: number }
  > = {
    date: { stage: 'friends', attraction: 25, closeness: 30 },
    visit: { stage: 'dating', attraction: 40, closeness: 45 },
    'hold-hands': { stage: 'dating', attraction: 40, closeness: 40 },
    kiss: { stage: 'dating', attraction: 55, closeness: 50 },
    exclusive: { stage: 'dating', attraction: 65, closeness: 60 },
    'stay-over': { stage: 'partners', attraction: 70, closeness: 70 },
    'move-in': { stage: 'partners', attraction: 75, closeness: 80 },
    propose: { stage: 'partners', attraction: 80, closeness: 88 },
    family: { stage: 'married', attraction: 70, closeness: 85 },
  }
  const need = needs[step]
  if (at(bond.stage) < at(need.stage) || bond.closeness < need.closeness)
    return { answer: 'not-yet', line: notYet(step) }
  if (bond.attraction < need.attraction)
    return {
      answer: bond.attraction < 10 ? 'no' : 'not-yet',
      line:
        bond.attraction < 10 ? 'I don’t think I see us like that. Sorry.' : notYet(step),
    }
  if (adult.boundaries.includes('slow') && step === 'kiss' && bond.dates < 2)
    return {
      answer: 'not-yet',
      line: 'I like taking things slowly. Not yet, but… ask me again some time.',
    }
  if (
    adult.boundaries.includes('private') &&
    context.public &&
    (step === 'kiss' || step === 'hold-hands')
  )
    return {
      answer: 'not-yet',
      line: 'Not here, with everyone around. I’m a private person.',
    }
  if (step === 'family' && !adult.family)
    return {
      answer: 'no',
      line: 'I love you, but I have never wanted children, and I am not going to change my mind. I hope that is all right.',
    }
  if (step === 'propose' && adult.wants !== 'serious' && bond.closeness < 95)
    return {
      answer: 'not-yet',
      line: 'I love what we have. I’m just not ready for that. Can we talk about it?',
    }
  return { answer: 'yes', line: yes(step) }
}

function notYet(step: Step): string {
  switch (step) {
    case 'date':
      return 'Like a date? Let us get to know each other first.'
    case 'move-in':
      return 'Living together is a big step. Not yet.'
    case 'propose':
      return 'I… wow. I’m not ready for that yet.'
    default:
      return 'Not yet. Give it time.'
  }
}

function yes(step: Step): string {
  switch (step) {
    case 'date':
      return 'I would like that. Yes.'
    case 'visit':
      return 'An evening at yours? I would love that.'
    case 'hold-hands':
      return '*Their hand finds yours.*'
    case 'kiss':
      return '*They lean in.*'
    case 'exclusive':
      return 'Just us? Yes. I would like that a lot.'
    case 'stay-over':
      return 'Stay. I would like you to.'
    case 'move-in':
      return 'Yes. Let’s do it. Let’s find somewhere together.'
    case 'propose':
      return 'Yes! Yes, of course!'
    case 'family':
      return 'I would love that. Let’s do it, together.'
    case 'hug':
      return 'Come here.'
  }
}

/** The bond after an answer: a "no" remembered; a yes moving things on. */
export function answered(
  bond: Bond,
  step: Step,
  a: Answer,
  day: number,
  name: string,
): Bond {
  if (a.answer !== 'yes')
    return {
      ...bond,
      declined:
        a.answer === 'no'
          ? [...bond.declined.filter((d) => d.step !== step), { step, day }]
          : bond.declined,
    }
  const next: Bond = { ...bond, closeness: Math.min(100, bond.closeness + 2) }
  const event = (text: string) => [...bond.history, { day, text }].slice(-20)
  switch (step) {
    case 'kiss':
      return {
        ...next,
        attraction: Math.min(100, bond.attraction + 3),
        history: bond.history.some((h) => h.text.startsWith('First kiss'))
          ? bond.history
          : event(`First kiss with ${name}`),
      }
    case 'exclusive':
      return {
        ...next,
        stage: 'partners',
        history: event(`Became a couple with ${name}`),
      }
    case 'propose':
      return { ...next, stage: 'engaged', history: event(`Engaged to ${name}`) }
    default:
      return next
  }
}

/**
 * Getting to know someone: what talking does to the bond. Closeness grows a
 * little each day they talk; attraction only for people open to it, and only
 * when the player is warm and attentive; the stage moves from met to friends
 * to close friends as closeness grows.
 */
export function talked(
  bond: Bond,
  adult: Adult | undefined,
  kind: 'chat' | 'interests' | 'compliment' | 'flirt' | 'rude',
  firstToday: boolean,
  interest?: Interest,
): Bond {
  let closeness = bond.closeness
  let attraction = bond.attraction
  if (kind === 'rude') {
    closeness = Math.max(0, closeness - 6)
    attraction = Math.max(0, attraction - 8)
  } else if (firstToday) {
    closeness += kind === 'interests' ? 5 : 3
    if (adult?.romance) {
      if (kind === 'compliment') attraction += 3
      if (kind === 'flirt') attraction += bond.closeness >= 25 ? 6 : 1
      if (kind === 'interests' && interest && adult.likes.includes(interest))
        attraction += 2
    }
  }
  closeness = Math.min(100, closeness)
  attraction = Math.min(100, attraction)
  const known =
    interest && !bond.known.includes(interest) ? [...bond.known, interest] : bond.known
  let stage = bond.stage
  if (at(stage) < at('friends') && closeness >= 30) stage = 'friends'
  if (at(stage) < at('close') && closeness >= 55) stage = 'close'
  return { ...bond, closeness, attraction, known, stage }
}

/** The next thing about them the player has not found out yet. */
export function nextInterest(adult: Adult, bond: Bond): Interest | undefined {
  return adult.likes.find((i) => !bond.known.includes(i))
}

export function interestName(i: Interest): string {
  return INTERESTS[i]
}

/** The weekday of a game day (0 = Monday). */
export const weekdayOf = (day: number) => (((day - 1) % 7) + 7) % 7

/** The next evening they are free, from tomorrow (the date is at 7 pm). */
export function nextFreeEvening(adult: Adult, day: number): number {
  for (let d = day + 1; d <= day + 7; d++) if (adult.free.includes(weekdayOf(d))) return d
  return day + 1
}

export function withBond(life: Life, id: string, bond: Bond): Life {
  return { ...life, bonds: { ...(life.bonds ?? {}), [id]: bond } }
}

/** Someone who lives with the player, if anyone. */
export function partnerOf(life: Life): string | null {
  return life.partner?.id ?? null
}

/**
 * Who is at the player's home now: the partner they live with (whenever the
 * player is at home), or someone visiting this evening (from 7 pm to 11 pm),
 * or staying the night and still there in the morning. `day` is the game's
 * day (in the morning, still the evening before's).
 */
export function atHome(life: Life, day: number): { id: string; living: boolean } | null {
  if (life.city.at !== 'home' || !life.city.inside) return null
  const partner = partnerOf(life)
  if (partner) return { id: partner, living: true }
  for (const [id, b] of Object.entries(life.bonds ?? {})) {
    // Round for the evening (from 7 pm), or staying the night.
    if (
      life.phase === 'evening' &&
      ((b.visit === day && life.minute >= 19 * 60 && life.minute < 23 * 60) ||
        b.stayOver === day)
    )
      return { id, living: false }
    // Woken up together (the game's day is still the evening's until work).
    if (life.phase === 'morning' && b.stayOver !== null && b.stayOver === day)
      return { id, living: false }
  }
  return null
}

/** Moving in together: they live at the player's home from today, paying half the rent. */
export function movedIn(life: Life, id: string, day: number, name: string): Life {
  const b = bondOf(life, id)
  return withBond({ ...life, partner: { id, since: day } }, id, {
    ...b,
    visit: null,
    history: [...b.history, { day, text: `Moved in with ${name}` }].slice(-20),
  })
}
