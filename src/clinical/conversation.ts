/**
 * Understanding what the player says to the patient, without any AI: which
 * facts they asked about, and how they spoke (introducing themselves,
 * checking identity, asking permission, reassuring, open questions, jargon,
 * and anything that strays into diagnosing). The patient's answers come only
 * from the case's facts, so the authoritative story never changes; an AI
 * model, when the player has one switched on, only rephrases those answers.
 */
import type { CaseDef, Fact, Phase } from './model'

export interface Heard {
  facts: Fact[]
  greet: boolean
  introduce: boolean
  checkId: boolean
  consent: boolean
  reassure: boolean
  open: boolean
  jargon: string[]
  /** They told the patient a diagnosis (beyond a support worker's role). */
  diagnosed: string
}

const norm = (text: string) =>
  ` ${text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `

const has = (text: string, phrase: string) => text.includes(` ${norm(phrase).trim()} `)

export const JARGON = [
  'tachycardic',
  'tachycardia',
  'bradycardic',
  'hypoxic',
  'hypoxia',
  'hypotensive',
  'hypertensive',
  'pyrexial',
  'pyrexia',
  'febrile',
  'dyspnoea',
  'dyspnea',
  'sats',
  'obs',
  'news score',
  'avpu',
  'acvpu',
  'nbm',
  'msu',
  'mane',
  'prn',
  'hypoglycaemic',
  'hypoglycemic',
  'tachypnoeic',
  'sepsis six',
  'cva',
  'mi',
  'acs',
  'sob',
  'loc',
]

const DIAGNOSES = [
  'sepsis',
  'heart attack',
  'a stroke',
  'stroke',
  'pneumonia',
  'an infection',
  'infection',
  'a uti',
  'uti',
  'a clot',
  'blood clot',
  'cancer',
  'appendicitis',
  'anaphylaxis',
  'an allergy',
  'diabetes',
  'a bleed',
  'internal bleeding',
]

/** Whether a fact is true now (some only appear once the patient changes). */
export function factAvailable(fact: Fact, phase: string): boolean {
  return !fact.phases || fact.phases.includes(phase)
}

export function hear(text: string, def: CaseDef, phase: string): Heard {
  const t = norm(text)
  const scored = def.facts
    .filter((f) => factAvailable(f, phase))
    .map((f) => ({
      f,
      best: Math.max(0, ...f.topics.filter((p) => has(t, p)).map((p) => p.length)),
    }))
    .filter((x) => x.best > 0)
    .sort((a, b) => b.best - a.best)
    .slice(0, 2)
    .map((x) => x.f)

  const diagnosed =
    /\b(you have|you've got|you have got|you're having|you are having|it's|it is|this is|sounds like|looks like) (probably |definitely |just )?(a |an )?([a-z ]+)/.exec(
      t.trim(),
    )?.[4] ?? ''
  const diagnosis =
    DIAGNOSES.find((d) => ` ${diagnosed} `.includes(` ${d.replace(/^(a|an) /, '')} `)) ??
    ''

  return {
    facts: scored,
    greet: /^ (hello|hi|hiya|good (morning|afternoon|evening)|hey) /.test(t),
    introduce:
      /( my name is | my name's | i'm [a-z]+ (and )?i'm (a|an|the|one of|your) | i am [a-z]+ (and )?i am (a|an|the|your) | i'm [a-z]+ (a|an|the|your) | i'm one of the | healthcare assistant | support worker | i'm the hca | i'll be looking after you )/.test(
        t,
      ),
    checkId:
      /( full name | your name | date of birth | your birthday | when were you born | wristband | name band | confirm who you are )/.test(
        t,
      ),
    consent:
      /( is it ok | is it okay | is that ok | is that okay | ok if | okay if | may i | can i | could i | would you mind | do you mind | is that all right | is that alright | all right if | alright if | with your permission | happy for me to | are you happy )/.test(
        t,
      ),
    reassure:
      /( don't worry | i understand | that sounds | i'm sorry | sorry to hear | you're safe | we'll look after | i'll stay | i will stay | take your time | you're in good hands | i'm here | i'll get | i will get | let me get | i'm going to get )/.test(
        t,
      ),
    open: /^ (how|what|when|where|tell me|can you tell|could you tell|could you describe|can you describe|describe) /.test(
      t,
    ),
    jargon: JARGON.filter((j) => has(t, j)),
    diagnosed: diagnosis,
  }
}

const pick = <T>(list: T[], n: number): T =>
  list[((n % list.length) + list.length) % list.length]

/** What the patient says back: built only from the case's facts. */
export function patientReply(
  def: CaseDef,
  phase: Phase,
  heard: Heard,
  turn: number,
): string {
  const p = def.patient
  if (!phase.vitals.alert)
    return pick(
      [
        "*mumbles* ...where's... where am I? I want to go home.",
        "*looks at you, then away* ...I don't... what time is it?",
        '*does not answer properly and tries to pull at the sheets*',
      ],
      turn,
    )
  const parts: string[] = []
  if (heard.greet && !heard.facts.length)
    parts.push(pick([`Hello, dear.`, `Hello.`, `Oh, hello.`], turn))
  if (heard.introduce && !heard.facts.length)
    parts.push(`Nice to meet you. Call me ${p.callMe}.`)
  if (heard.checkId) parts.push(`I'm ${p.name}. ${dobWords(p.age)}`)
  for (const f of heard.facts) parts.push(pick(f.answers, turn))
  if (heard.consent && !heard.facts.length)
    parts.push(pick(['Yes, that’s fine.', 'Go ahead.', 'Of course.'], turn))
  if (heard.reassure && !parts.length)
    parts.push(
      pick(['Thank you. That helps.', 'Thanks, love.', 'All right. Thank you.'], turn),
    )
  if (heard.diagnosed)
    parts.push(
      `*looks worried* ${capital(heard.diagnosed)}? Is that what the doctor thinks?`,
    )
  if (heard.jargon.length && !parts.length)
    parts.push(`Sorry, I don't know what "${heard.jargon[0]}" means.`)
  if (!parts.length)
    parts.push(
      pick(
        [
          "I'm not sure what you mean. Could you ask me another way?",
          'Sorry, could you say that again?',
          "I don't really know. What would you like to know?",
        ],
        turn,
      ),
    )
  return parts.join(' ')
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** The patient's date of birth in words, from their age (the simulation's date). */
export function dobWords(age: number): string {
  return `I was born in ${2026 - age}.`
}
