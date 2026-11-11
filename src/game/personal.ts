/**
 * Getting to know the adults who could become close (see romance.ts and
 * content/adults.ts): the extra things the player can say to them (ask what
 * they love, pay a compliment, flirt, ask them out, hug), and what they say
 * back. Used by encounters.ts for those people; everyone else is unchanged.
 */
import type { Adult } from '../content/adults'
import { weekdayName } from './clock'
import { BRUSHED_TEXT, BUDGET_TEXT } from './money'
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
export function personalOptions(
  who: Who,
  adult: Adult,
  bond: Bond,
  /** They already live with the player. */
  together = false,
  /** The family so far (children, one on the way). */
  family: { children: number; expected: boolean } = { children: 0, expected: false },
  /** Money is tight at home, and they want to talk about it (money.ts). */
  money = false,
): Option[] {
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
  const dating = atLeast(bond.stage, 'dating')
  if (dating && !partners) out.push(opt('exclusive', `Ask ${n} if you are a couple now`))
  if (dating && !bond.visit)
    out.push(opt('invite-home', `Invite ${n} round for an evening`))
  if (partners && !together) out.push(opt('move-in', `Ask ${n} to move in with you`))
  const engaged = atLeast(bond.stage, 'engaged')
  const married = bond.stage === 'married'
  if (partners && !engaged && together) out.push(opt('propose', `Ask ${n} to marry you`))
  if (bond.stage === 'engaged' && bond.wedding === null)
    out.push(opt('set-wedding', 'Set a date for the wedding'))
  if (married && family.children === 0 && !family.expected) {
    out.push(opt('family-baby', 'Talk about having a baby together'))
    out.push(opt('family-adopt', 'Talk about adopting a child'))
  }
  if (together && money) {
    out.push(opt('money-budget', 'Sit down and agree a budget together'))
    out.push({ id: 'money-brush', label: 'Say it will be fine', tone: 'neutral' })
  }
  if (dating && bond.closeness < 35)
    out.push(opt('make-amends', 'Talk it through, and say sorry'))
  if (bond.stage === 'separated' && bond.closeness >= 50)
    out.push(opt('make-up', 'Ask about giving it another go'))
  if (dating)
    out.push({
      id: 'break-up',
      label: married ? 'Ask for a divorce' : 'End the relationship',
      tone: 'neutral',
    })
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
    case 'exclusive':
    case 'invite-home':
    case 'move-in': {
      const step = optionId === 'invite-home' ? 'visit' : optionId
      const a = ask(adult, bond, step, context)
      const next = answered(bond, step, a, day, who.name)
      if (a.answer !== 'yes')
        return result(
          [act('*You ask.*'), say(who, a.line)],
          next,
          2,
          a.answer === 'no'
            ? [`${n} said no, for now. You will not ask again for a few days.`]
            : [],
        )
      if (optionId === 'invite-home')
        return result(
          [
            act('*You ask.*'),
            say(who, a.line),
            say(who, 'Tonight? I will come round about half seven.'),
          ],
          {
            ...next,
            visit: day,
            history: [...next.history, { day, text: `Invited ${who.name} round` }].slice(
              -20,
            ),
          },
          2,
          [`${n} is coming round to yours this evening, from 7:30 pm.`],
        )
      // (Moving in changes the home: applied once the conversation is held.)
      return {
        ...result(
          [act('*You ask.*'), say(who, a.line)],
          next,
          3,
          optionId === 'move-in'
            ? [`${n} is moving in with you. They will pay half the rent.`]
            : [`You and ${n} are a couple.`],
        ),
        effect: optionId === 'move-in' ? 'move-in' : undefined,
      }
    }
    case 'propose': {
      const a = ask(adult, bond, 'propose', context)
      const next = answered(bond, 'propose', a, day, who.name)
      return result(
        [act(`*You ask ${n} to marry you.*`), say(who, a.line)],
        next,
        5,
        a.answer === 'yes' ? [`You and ${n} are engaged.`] : [],
      )
    }
    case 'set-wedding': {
      const when = day + 2
      return result(
        [
          say(
            who,
            `${weekdayName(when)} evening, in the park? Everyone we love, under the trees.`,
          ),
        ],
        {
          ...bond,
          wedding: when,
          history: [
            ...bond.history,
            { day, text: `Set the wedding for ${weekdayName(when)}` },
          ].slice(-20),
        },
        5,
        [`The wedding: ${weekdayName(when)} evening, in the park, from 6 pm.`],
      )
    }
    case 'family-baby':
    case 'family-adopt': {
      const a = ask(adult, bond, 'family', context)
      const next = answered(bond, 'family', a, day, who.name)
      const adopt = optionId === 'family-adopt'
      return {
        ...result(
          [act('*You talk about it for a long time.*'), say(who, a.line)],
          next,
          30,
          a.answer === 'yes'
            ? [
                adopt
                  ? 'You have started the adoption, together.'
                  : 'A baby is on the way.',
              ]
            : [],
        ),
        effect: a.answer === 'yes' ? (adopt ? 'family-adopt' : 'family-baby') : undefined,
      }
    }
    case 'money-budget':
      return result(
        [
          say(who, 'Money is a bit tight at the moment. Can we look at it together?'),
          act(
            '*You go through it all at the table: the rent, the food, the rest. A plan you both agree on.*',
          ),
          say(who, 'That feels so much better. Thank you for taking it seriously.'),
        ],
        {
          ...bond,
          closeness: Math.min(100, bond.closeness + 8),
          history: [...bond.history, { day, text: BUDGET_TEXT }].slice(-20),
        },
        20,
        [`Closer to ${n}.`],
      )
    case 'money-brush':
      return result(
        [
          say(who, 'Money is a bit tight at the moment. Can we look at it together?'),
          say(who, 'Oh. Right. Fine, I suppose.'),
          act(`*${n} goes quiet. They wanted to talk about it.*`),
        ],
        {
          ...bond,
          closeness: Math.max(0, bond.closeness - 6),
          history: [...bond.history, { day, text: BRUSHED_TEXT }].slice(-20),
        },
        2,
      )
    case 'make-amends':
      return result(
        [
          act('*You sit down and talk properly, and you say sorry, and mean it.*'),
          say(who, 'Thank you. I needed to hear that. Let’s do better, both of us.'),
        ],
        {
          ...bond,
          closeness: Math.min(100, bond.closeness + 12),
          history: [
            ...bond.history,
            { day, text: `Talked it through with ${who.name}` },
          ].slice(-20),
        },
        20,
        [`Things feel better with ${n}.`],
      )
    case 'make-up': {
      const ok = bond.attraction >= 45 && bond.closeness >= 55
      return result(
        [
          act('*You ask, carefully.*'),
          say(
            who,
            ok
              ? 'I have missed you. Slowly, though. Okay?'
              : 'I do not think so. I am sorry.',
          ),
        ],
        ok
          ? {
              ...bond,
              stage: 'dating',
              history: [
                ...bond.history,
                { day, text: `Back together with ${who.name}` },
              ].slice(-20),
            }
          : bond,
        5,
        ok ? [`You and ${n} are giving it another go.`] : [],
      )
    }
    case 'break-up':
      return {
        ...result(
          [
            act('*You tell them, as kindly as you can.*'),
            say(
              who,
              bond.closeness >= 50
                ? 'I… did not see this coming. Okay.'
                : 'Maybe it is for the best.',
            ),
          ],
          bond,
          10,
          [`You and ${n} are no longer together.`],
        ),
        effect: 'separate',
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
