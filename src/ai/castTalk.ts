/**
 * Talking to the people in a live scenario once it is over: the player asks
 * any member of the cast a question (see office/ScenarioDebrief.tsx).
 *
 * Without a model, three questions have set answers, built from how the
 * scenario was actually played: what that person thought went well, what
 * could have been better (their own part of it first), and what happens now.
 * With the player's own AI model turned on (WorkSim AI), they can ask
 * anything and the person answers in character, from the same record. The
 * score never changes: the rubric sets it.
 */
import type { CastMember, Scenario } from '../content/scenarios/types'
import { bandFor, percentOf, type Answered, type Run } from '../game/scenarios'
import type { AiMessage } from './types'

export type Topic = 'well' | 'better' | 'next'

export const TOPICS: Array<{ id: Topic; question: string }> = [
  { id: 'well', question: 'What did I do well?' },
  { id: 'better', question: 'What could I have done better?' },
  { id: 'next', question: 'What happens now?' },
]

/** The player's name never leaves the computer: models see "the trainee". */
const anon = (s: string) => s.replaceAll('{name}', 'the trainee')

/** The beats this person spoke or asked in, by id. */
function theirBeats(scenario: Scenario, member: CastMember): Set<string> {
  return new Set(
    scenario.beats.filter((b) => 'who' in b && b.who === member.id).map((b) => b.id),
  )
}

/** A beat's question, without its own quotation marks, to quote inside a reply. */
const asked = (a: Answered) => a.prompt.replace(/[“”]/g, '').trim()

const share = (a: Answered) => (a.points ? a.earned / a.points : 1)

/** Their own part of the scenario first, then the rest. */
function byRelevance(scenario: Scenario, member: CastMember, answers: Answered[]) {
  const mine = theirBeats(scenario, member)
  return [...answers].sort((a, b) => Number(mine.has(b.beat)) - Number(mine.has(a.beat)))
}

/** A set answer from this member of the cast, from how the scenario went. */
export function builtinReply(
  scenario: Scenario,
  run: Run,
  member: CastMember,
  topic: Topic,
): string {
  const answers = byRelevance(scenario, member, run.answers)
  const outcome = scenario.outcomes[bandFor(percentOf(run))]
  if (topic === 'next') return `${outcome.verdict}. ${outcome.feedback}`
  if (topic === 'well') {
    const strong = answers.filter((a) => share(a) === 1)
    if (!strong.length)
      return `Honestly, not much went the way it needed to today. Start here: ${answers[0]?.lesson ?? 'prepare before you walk in.'}`
    const [first, second] = strong
    return [
      `You got this one right — ${asked(first)} ${first.lesson}`,
      second ? `And this was well handled too — ${asked(second)}` : '',
    ]
      .filter(Boolean)
      .join(' ')
  }
  const weak = answers.filter((a) => share(a) < 1)
  if (!weak.length)
    return 'Nothing I would change. Keep doing exactly that, and keep preparing the same way.'
  // Their own weakest moment, else the weakest overall.
  const mine = theirBeats(scenario, member)
  const pick =
    [...weak.filter((a) => mine.has(a.beat))].sort((a, b) => share(a) - share(b))[0] ??
    [...weak].sort((a, b) => share(a) - share(b))[0]
  const more =
    weak.length > 1 ? ` That was one of ${weak.length} answers that fell short.` : ''
  return `When it came to this — ${asked(pick)} — you said “${pick.answer}”. ${pick.lesson}${more}`
}

/** What the person knows: who they are, what happened, how it ended. */
export function castContext(scenario: Scenario, run: Run, member: CastMember): string {
  const percent = percentOf(run)
  const outcome = scenario.outcomes[bandFor(percent)]
  const others = scenario.cast
    .filter((c) => c.id !== member.id)
    .map((c) => `${c.name} (${c.role})`)
    .join(', ')
  const record = run.answers
    .map(
      (a) =>
        `- Asked: ${a.prompt}\n  The trainee: ${a.answer}\n  Marked ${a.earned}/${a.points}. Why: ${a.lesson}`,
    )
    .join('\n')
  return anon(
    `Scenario: ${scenario.title}, in ${scenario.room}. ${scenario.summary}\nAlso present: ${others}.\nWhat the trainee said and did:\n${record}\nOutcome: ${outcome.verdict} (${percent}%). ${outcome.feedback}`,
  )
}

/** The request to the player's own model, in character (exported for tests). */
export function castRequest(
  scenario: Scenario,
  run: Run,
  member: CastMember,
  history: AiMessage[],
): { messages: AiMessage[]; context: { label: string; text: string } } {
  const brief = `You are ${member.name}, ${member.role}, in a workplace training game. The scenario has just ended and the trainee is talking to you. Answer as ${member.name} would, in character and in plain spoken English, in 2 to 4 sentences. Be honest and specific about what happened, using only the record below; do not invent events, and do not give a mark or a percentage. If asked something your role would not know, say so.`
  const [first, ...rest] = history
  return {
    messages: first
      ? [
          { role: 'user', text: `${brief}\n\n${anon(first.text)}` },
          ...rest.map((m) => ({ ...m, text: anon(m.text) })),
        ]
      : [],
    context: {
      label: `Scenario: ${scenario.title}`,
      text: castContext(scenario, run, member),
    },
  }
}
