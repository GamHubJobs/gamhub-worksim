/**
 * Getting to know the adults who could become close (see romance.ts and
 * content/adults.ts): the extra things the player can say to them (ask what
 * they love, pay a compliment, flirt, ask them out, hug), and what they say
 * back. Used by encounters.ts for those people; everyone else is unchanged.
 */
import type { Adult } from '../content/adults'
import { weekdayName } from './clock'
import type { Line, Option, Outcome, Relation, Situation, Who } from './encounters'
import {
  answered,
  ask,
  interestName,
  nextFreeEvening,
  nextInterest,
  talked,
  type Bond,
} from './romance'

const STAGES = ['met', 'friends', 'close', 'dating', 'partners', 'engaged', 'married']
/** Whether stage `a` is at least `b`. */
const atLeast = (a: string, b: string) => STAGES.indexOf(a) >= STAGES.indexOf(b)

const first = (who: Who) => who.name.split(' ')[0]
const say = (who: Who, text: string): Line => ({ speaker: who.name, text })
const act = (text: string): Line => ({ speaker: null, text })
const opt = (id: string, label: string): Option => ({ id, label, tone: 'kind' })

/** The personal things there are to say, by how well they know each other. */
export function personalOptions(who: Who, adult: Adult, bond: Bond): Option[] {
  const n = first(who)
  const out: Option[] = []
  void adult
  if (nextInterest(adult, bond))
    out.push(opt('interests', `Ask ${n} what they love doing`))
  out.push(opt('compliment', `Pay ${n} a compliment`))
  const friends = atLeast(bond.stage, 'friends')
  const partners = atLeast(bond.stage, 'partners')
  if (friends && !partners) out.push(opt('flirt', `Flirt with ${n} a little`))
  if (friends && !bond.date && !atLeast(bond.stage, 'dating'))
    out.push(opt('ask-out', `Ask ${n} out on a date`))
  if (bond.date) out.push(opt('date-check', 'Check your date is still on'))
  if (bond.closeness >= 40) out.push(opt('hug', `Give ${n} a hug`))
  return out
}

/** What they say to something personal; null for anything else. */
export function respondPersonal(
  who: Who,
  adult: Adult,
  situation: Situation,
  rel: Relation,
  bond: Bond,
  optionId: string,
): Outcome | null {
  const n = first(who)
  const day = rel.day ?? 1
  const firstToday = rel.today < 1
  const result = (
    lines: Line[],
    next: Bond,
    minutes: number,
    notes: string[] = [],
  ): Outcome => ({
    lines,
    trust: firstToday && next.closeness > bond.closeness ? 1 : 0,
    minutes,
    memory: optionId,
    notes,
    bond: next,
  })
  const context = { day, public: true, colleague: who.kind === 'colleague' }
  void situation
  switch (optionId) {
    case 'interests': {
      const i = nextInterest(adult, bond)
      if (!i) return null
      const name = interestName(i)
      return result(
        [
          say(
            who,
            `Honestly? ${name[0].toUpperCase() + name.slice(1)}. I could talk about it for hours.`,
          ),
          act(`*${n} lights up talking about it.*`),
        ],
        talked(bond, adult, 'interests', firstToday, i),
        5,
        [`You found out: ${n} loves ${name}.`],
      )
    }
    case 'compliment':
      return result(
        [
          act('*You say something kind, and mean it.*'),
          say(
            who,
            adult.romance && bond.closeness >= 25
              ? 'Oh! Thank you. That has made my day.'
              : 'Ha, thanks. That is nice of you.',
          ),
        ],
        talked(bond, adult, 'compliment', firstToday),
        2,
      )
    case 'flirt': {
      const next = talked(bond, adult, 'flirt', firstToday)
      if (!adult.romance)
        return result(
          [
            act('*You try a little charm.*'),
            say(who, 'Ha! I like you, but not like that. Friends?'),
          ],
          { ...next, attraction: bond.attraction },
          2,
          [`${n} is not interested in romance with you, and said so kindly.`],
        )
      return result(
        [
          act('*You flirt a little.*'),
          say(
            who,
            bond.closeness >= 25
              ? 'Ha. Smooth. *They do not look away.*'
              : 'Ha. Do I know you?',
          ),
        ],
        next,
        3,
      )
    }
    case 'ask-out': {
      const a = ask(adult, bond, 'date', context)
      const next = answered(bond, 'date', a, day, who.name)
      if (a.answer !== 'yes')
        return result(
          [act(`*You ask ${n} out.*`), say(who, a.line)],
          next,
          2,
          a.answer === 'no' ? [`${n} said no. You will not ask again for a while.`] : [],
        )
      const when = nextFreeEvening(adult, day)
      const place: 'cafe' | 'park' = adult.likes.includes('nature') ? 'park' : 'cafe'
      const where = place === 'park' ? 'the park' : 'Kettle & Crumb'
      return result(
        [
          act(`*You ask ${n} out.*`),
          say(who, a.line),
          say(
            who,
            `${when === day + 1 ? 'Tomorrow' : weekdayName(when)} at 7, then? ${place === 'park' ? 'Meet me by the park benches.' : 'At Kettle & Crumb.'}`,
          ),
        ],
        {
          ...next,
          date: { day: when, minute: 19 * 60, place },
          history: [
            ...next.history,
            { day, text: `Asked ${who.name} out, and they said yes` },
          ].slice(-20),
        },
        3,
        [`A date with ${n}: ${weekdayName(when)} at 7 pm, ${where}.`],
      )
    }
    case 'date-check': {
      const d = bond.date
      if (!d) return null
      return result(
        [
          say(
            who,
            `Of course! ${weekdayName(d.day)} at 7, ${d.place === 'park' ? 'the park' : 'Kettle & Crumb'}. Looking forward to it.`,
          ),
        ],
        bond,
        1,
      )
    }
    case 'hug': {
      const a = ask(adult, bond, 'hug', context)
      return result(
        [
          act(
            a.answer === 'yes'
              ? `*You and ${n} hug.*`
              : `*You open your arms; ${n} smiles and steps back.*`,
          ),
          say(who, a.line),
        ],
        answered(bond, 'hug', a, day, who.name),
        1,
        a.answer === 'yes' ? [] : [`${n} would rather not, for now.`],
      )
    }
  }
  return null
}
