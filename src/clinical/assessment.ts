/**
 * Scoring and the debrief. Every point comes from the encounter's event log
 * (what was actually done, said and written, and when) judged against the
 * case: critical actions done in time, recommended ones, unnecessary and
 * harmful ones, key facts found, what a good note contains, and how the
 * player spoke. Difficulty changes the time allowed and the pass mark, never
 * the facts. Simplified for learning; not a validated clinical assessment.
 */
import { getAction } from './actions'
import { clockNow, concerningSince, phaseOf, timesDone } from './engine'
import type { CaseAction, CaseDef, Classification, Difficulty, Rubric } from './model'
import { RUBRIC_NAMES } from './model'
import type { Attempt, Encounter } from './schema'

export const TIME_FACTOR: Record<Difficulty, number> = {
  beginner: 1.5,
  intermediate: 1.25,
  advanced: 1,
  expert: 0.75,
}
export const PASS_MARK: Record<Difficulty, number> = {
  beginner: 60,
  intermediate: 70,
  advanced: 75,
  expert: 80,
}

/** Rubrics that matter most for safety, weighted double in the overall score. */
const HEAVY: Rubric[] = ['safety', 'escalation', 'recognition']

export type Outcome =
  | 'done'
  | 'late'
  | 'missed'
  | 'not-needed'
  | 'avoided'
  | 'done-unnecessary'
  | 'done-harmful'
  | 'referred'

export interface Item {
  action: string
  label: string
  as: Classification
  why: string
  rubric: Rubric
  outcome: Outcome
  /** Minutes into the case it was first done (or null). */
  t: number | null
  /** The deadline it was judged against (minutes into the case), if timed. */
  deadline: number | null
}

export interface Debrief {
  score: number
  passed: boolean
  passMark: number
  rubric: Array<{ id: Rubric; name: string; score: number | null }>
  items: Item[]
  criticalMissed: Item[]
  harmful: Item[]
  unnecessary: Item[]
  factsFound: string[]
  factsMissed: Array<{ id: string; ask: string }>
  documentation: { found: string[]; missing: string[] }
  conduct: string[]
  referred: string[]
  jargon: string[]
  /** When the patient first became concerning, and when the player escalated (minutes). */
  deterioration: { at: number | null; escalated: number | null; delay: number | null }
  strengths: string[]
  improvements: string[]
  minutes: number
}

interface Tally {
  earned: number
  possible: number
}

/** When an action's clock starts: the case start, or when the patient first entered a stage. */
function startOf(enc: Encounter, from: string | undefined): number | null {
  if (!from) return 0
  const first = enc.phases.find((p) => p.id === from)
  return first ? first.t : null
}

function judge(enc: Encounter, id: string, rule: CaseAction): Item {
  const label = getAction(id)?.label ?? id
  const start = startOf(enc, rule.within?.from)
  const times = [id, ...(rule.alt ?? [])]
    .flatMap((a) => timesDone(enc, a))
    .sort((x, y) => x - y)
  const needed = rule.requires ? timesDone(enc, rule.requires)[0] : undefined
  if (rule.requires && times.length && (needed === undefined || times[0] < needed))
    return {
      action: id,
      label,
      as: 'harmful',
      why: rule.fault ?? rule.why,
      rubric: rule.rubric,
      outcome: 'done-harmful',
      t: times[0],
      deadline: null,
    }
  const after =
    start === null ? [] : times.filter((t) => t >= (rule.within?.from ? start : 0))
  const first = (rule.within?.from ? after : times)[0] ?? null
  const deadline =
    rule.within && start !== null
      ? start + rule.within.minutes * TIME_FACTOR[enc.difficulty as Difficulty]
      : null
  let outcome: Outcome
  if (rule.as === 'harmful') outcome = times.length ? 'done-harmful' : 'avoided'
  else if (rule.as === 'unnecessary')
    outcome = times.length ? 'done-unnecessary' : 'avoided'
  else if (rule.within?.from && start === null) outcome = 'not-needed'
  else if (first === null)
    outcome = enc.referred[id] !== undefined ? 'referred' : 'missed'
  else if (deadline !== null && first > deadline) outcome = 'late'
  else outcome = 'done'
  return {
    action: id,
    label,
    as: rule.as,
    why: rule.why,
    rubric: rule.rubric,
    outcome,
    t: first,
    deadline,
  }
}

const matches = (text: string, words: string[]) =>
  words.some((w) => text.includes(w.toLowerCase()))

export function assess(def: CaseDef, enc: Encounter): Debrief {
  const tallies = new Map<Rubric, Tally>()
  const tally = (r: Rubric, earned: number, possible: number) => {
    const cur = tallies.get(r) ?? { earned: 0, possible: 0 }
    tallies.set(r, { earned: cur.earned + earned, possible: cur.possible + possible })
  }

  const items = Object.entries(def.actions).map(([id, rule]) => judge(enc, id, rule))
  for (const it of items) {
    if (it.as === 'critical' && it.outcome !== 'not-needed')
      tally(
        it.rubric,
        it.outcome === 'done'
          ? 3
          : it.outcome === 'late'
            ? 1.5
            : it.outcome === 'referred'
              ? 2
              : 0,
        3,
      )
    if (it.as === 'recommended' && it.outcome !== 'not-needed')
      tally(
        it.rubric,
        it.outcome === 'done'
          ? 1
          : it.outcome === 'late'
            ? 0.5
            : it.outcome === 'referred'
              ? 0.75
              : 0,
        1,
      )
    if (it.as === 'unnecessary' && it.outcome === 'done-unnecessary')
      tally(it.rubric, -0.5, 0)
    if (it.as === 'harmful' && it.outcome === 'done-harmful') {
      tally(it.rubric, -3, 0)
      if (it.rubric !== 'safety') tally('safety', -3, 0)
    }
  }
  // Safety always counts: avoiding every harmful action earns it.
  tally('safety', 1, 1)

  // Information: the key facts true in the stages the patient went through.
  const reached = new Set(enc.phases.map((p) => p.id))
  const keyFacts = def.facts.filter(
    (f) => f.key && (!f.phases || f.phases.some((p) => reached.has(p))),
  )
  const factsFound = keyFacts
    .filter((f) => enc.asked[f.id] !== undefined)
    .map((f) => f.id)
  const factsMissed = keyFacts
    .filter((f) => enc.asked[f.id] === undefined)
    .map((f) => ({ id: f.id, ask: f.topics[0] }))
  if (keyFacts.length) tally('information', factsFound.length, keyFacts.length)

  // Documentation: what the notes, escalations and handovers say.
  const written = enc.written.map((w) => w.text.toLowerCase()).join('\n')
  const docFound = def.documentation.filter((g) => matches(written, g)).map((g) => g[0])
  const docMissing = def.documentation
    .filter((g) => !matches(written, g))
    .map((g) => g[0])
  if (def.documentation.length)
    tally('documentation', docFound.length, def.documentation.length)

  // Communication: plain words and open questions.
  if (enc.speech.lines > 0) {
    tally('communication', enc.speech.open > 0 ? 1 : 0, 1)
    if (enc.speech.jargon.length)
      tally('communication', -0.5 * Math.min(2, enc.speech.jargon.length), 0)
  }

  // Professional conduct: starts whole; telling a patient a diagnosis costs it.
  const conduct = enc.log.filter((e) => e.kind === 'conduct').map((e) => e.text)
  tally('conduct', 1, 1)
  if (conduct.length) tally('conduct', -0.5 * conduct.length, 0)

  // Recognition and escalation: how quickly a deterioration reached the nurse.
  const at = concerningSince(def, enc)
  const escalations = ['tell-nurse', 'call-outreach', 'emergency-call']
    .flatMap((a) => timesDone(enc, a))
    .sort((a, b) => a - b)
  const escalated = at === null ? null : (escalations.find((t) => t >= at) ?? null)
  const delay = at === null || escalated === null ? null : escalated - at
  if (at !== null) {
    const allowed = 10 * TIME_FACTOR[enc.difficulty as Difficulty]
    tally('recognition', escalated === null ? 0 : delay! <= allowed ? 2 : 1, 2)
  }

  const rubric = (Object.keys(RUBRIC_NAMES) as Rubric[]).map((id) => {
    const t = tallies.get(id)
    const score =
      t && t.possible > 0
        ? Math.round(Math.max(0, Math.min(1, t.earned / t.possible)) * 100)
        : null
    return { id, name: RUBRIC_NAMES[id], score }
  })
  const scored = rubric.filter((r) => r.score !== null)
  const weight = (r: Rubric) => (HEAVY.includes(r) ? 2 : 1)
  const score = Math.round(
    scored.reduce((a, r) => a + r.score! * weight(r.id), 0) /
      Math.max(
        1,
        scored.reduce((a, r) => a + weight(r.id), 0),
      ),
  )

  const criticalMissed = items.filter(
    (i) => i.as === 'critical' && i.outcome === 'missed',
  )
  const harmful = items.filter((i) => i.outcome === 'done-harmful')
  const unnecessary = items.filter((i) => i.outcome === 'done-unnecessary')
  const safetyCritical = criticalMissed.some((i) => HEAVY.includes(i.rubric))
  const passMark = PASS_MARK[enc.difficulty as Difficulty]
  const passed = score >= passMark && !harmful.length && !safetyCritical

  const strengths: string[] = []
  const improvements: string[] = []
  for (const i of items) {
    if (i.as === 'critical' && i.outcome === 'done')
      strengths.push(`${i.label}: ${i.why}`)
    if (i.as === 'critical' && i.outcome === 'missed')
      improvements.push(`Missed: ${i.label}. ${i.why}`)
    if (i.outcome === 'late') improvements.push(`Too late: ${i.label}. ${i.why}`)
    if (i.outcome === 'done-harmful') improvements.push(`Harmful: ${i.label}. ${i.why}`)
    if (i.outcome === 'done-unnecessary')
      improvements.push(`Not needed: ${i.label}. ${i.why}`)
  }
  if (delay !== null && delay <= 5)
    strengths.unshift(
      `You escalated within ${delay} minutes of the patient getting worse.`,
    )
  if (at !== null && escalated === null)
    improvements.unshift('The patient got worse and nobody qualified was told.')
  if (factsMissed.length)
    improvements.push(`Not found out: ${factsMissed.map((f) => f.ask).join(', ')}.`)
  if (docMissing.length && def.documentation.length)
    improvements.push(`Your notes did not mention: ${docMissing.join(', ')}.`)
  if (enc.speech.jargon.length)
    improvements.push(
      `Jargon the patient may not understand: ${enc.speech.jargon.join(', ')}.`,
    )

  return {
    score,
    passed,
    passMark,
    rubric,
    items,
    criticalMissed,
    harmful,
    unnecessary,
    factsFound,
    factsMissed,
    documentation: { found: docFound, missing: docMissing },
    conduct,
    referred: Object.keys(enc.referred),
    jargon: enc.speech.jargon,
    deterioration: { at, escalated, delay },
    strengths,
    improvements,
    minutes: Math.round(enc.t),
  }
}

/** Makes the attempt record kept in the Ward Systems file. */
export function toAttempt(
  def: CaseDef,
  enc: Encounter,
  day: number,
  id: string,
): Attempt {
  const d = assess(def, enc)
  return {
    id,
    caseId: def.id,
    difficulty: enc.difficulty,
    role: enc.role,
    day,
    at: clockNow(enc),
    minutes: d.minutes,
    score: d.score,
    passed: d.passed,
    rubric: Object.fromEntries(
      d.rubric.filter((r) => r.score !== null).map((r) => [r.id, r.score!]),
    ),
    criticalMissed: d.criticalMissed.map((i) => i.action),
    harmful: d.harmful.map((i) => i.action),
    encounter: enc,
  }
}

export interface History {
  first: Attempt | null
  latest: Attempt | null
  best: Attempt | null
  count: number
  passed: boolean
}

export function history(
  attempts: Attempt[],
  caseId: string,
  difficulty?: Difficulty,
): History {
  const list = attempts.filter(
    (a) => a.caseId === caseId && (!difficulty || a.difficulty === difficulty),
  )
  const best = list.reduce<Attempt | null>(
    (b, a) => (!b || a.score > b.score ? a : b),
    null,
  )
  return {
    first: list[0] ?? null,
    latest: list.at(-1) ?? null,
    best,
    count: list.length,
    passed: list.some((a) => a.passed),
  }
}

/** The phase names the patient went through, for the debrief timeline. */
export function course(
  def: CaseDef,
  enc: Encounter,
): Array<{ t: number; looks: string; concerning: boolean }> {
  return enc.phases.map((p) => ({
    t: p.t,
    looks: phaseOf(def, p.id).looks,
    concerning: !!phaseOf(def, p.id).concerning,
  }))
}
