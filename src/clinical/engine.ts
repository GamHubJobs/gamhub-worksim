/**
 * The encounter engine: one engine for every case. It holds the patient's
 * true condition and the event log on the case clock, applies the player's
 * actions (within their role), measures true observations, moves the patient
 * between stages by the case's rules, and answers what the player says from
 * the case's facts. Every function is pure: it returns a new encounter.
 *
 * The engine is the authority. Nothing outside it (an AI model included) can
 * change what the patient's condition is, what was found, or what was done.
 */
import { clockText, warningScore } from '../tools/clinical/model'
import { allowed, getAction, outOfScope } from './actions'
import { hear, patientReply } from './conversation'
import type { CaseDef, Difficulty, Measure, Phase, Role, Vitals } from './model'
import { ROLE_TITLES } from './model'
import type { CaseEvent, Encounter } from './schema'

export interface Step {
  enc: Encounter
  /** What happened, in order, for the screen (the same as the new log entries). */
  events: CaseEvent[]
}

export function phaseOf(def: CaseDef, id: string): Phase {
  return def.phases.find((p) => p.id === id) ?? def.phases[0]
}

export function startEncounter(
  def: CaseDef,
  difficulty: Difficulty,
  role: Role,
  startClock: number,
  assignment = '',
): Encounter {
  const first = phaseOf(def, def.start)
  const enc: Encounter = {
    caseId: def.id,
    difficulty,
    role,
    startClock,
    t: 0,
    phase: first.id,
    phaseSince: 0,
    phases: [{ id: first.id, t: 0 }],
    log: [],
    done: {},
    referred: {},
    asked: {},
    measurements: [],
    written: [],
    specimens: [],
    speech: { lines: 0, open: 0, jargon: [] },
    assignment,
    ended: null,
  }
  const events: CaseEvent[] = [
    { t: 0, kind: 'action', text: `${def.task.from}: ${def.task.text}` },
    { t: 0, kind: 'finding', text: first.looks, phase: first.id },
  ]
  if (first.says)
    events.push({ t: 0, kind: 'patient', text: first.says, phase: first.id })
  return { ...enc, log: events }
}

const add = (enc: Encounter, events: CaseEvent[]): Encounter => ({
  ...enc,
  log: [...enc.log, ...events].slice(-600),
})

/** The value of one observation, as the monitor or the player would read it. */
export function reading(v: Vitals, m: Measure): string {
  switch (m) {
    case 'resp':
      return `${v.resp} breaths/min`
    case 'spo2':
      return `${v.spo2}%`
    case 'temp':
      return `${v.temp.toFixed(1)} °C`
    case 'bp':
      return `${v.sys}/${v.dia} mmHg`
    case 'pulse':
      return `${v.pulse} beats/min`
    case 'avpu':
      return v.alert ? 'Alert' : 'New confusion'
    case 'pain':
      return `${v.pain} out of 10`
    case 'glucose':
      return `${v.glucose.toFixed(1)} mmol/L`
  }
}

/** The ward clock now, as text. */
export function clockNow(enc: Encounter): string {
  return clockText((enc.startClock + Math.floor(enc.t)) % (24 * 60))
}

export function timesDone(enc: Encounter, action: string): number[] {
  return enc.done[action] ?? []
}

const doneSince = (enc: Encounter, action: string, since: number) =>
  timesDone(enc, action).some((t) => t >= since)

/** The latest reading of each observation the player took. */
export function latestReadings(
  enc: Encounter,
): Partial<Record<Measure, { value: string; t: number }>> {
  const out: Partial<Record<Measure, { value: string; t: number }>> = {}
  for (const m of enc.measurements) out[m.measure] = { value: m.value, t: m.t }
  return out
}

/** The early-warning score of the patient's true condition now (for the debrief and the engine). */
export function trueScore(def: CaseDef, enc: Encounter): number {
  const v = phaseOf(def, enc.phase).vitals
  return warningScore({
    resp: v.resp,
    spo2: v.spo2,
    temp: v.temp,
    sys: v.sys,
    dia: v.dia,
    pulse: v.pulse,
    alert: v.alert,
  }).score
}

function changeTo(
  def: CaseDef,
  enc: Encounter,
  to: string,
  t: number,
  why: string,
): Encounter {
  const next = phaseOf(def, to)
  const events: CaseEvent[] = [
    { t, kind: 'change', text: why, phase: next.id },
    { t, kind: 'finding', text: next.looks, phase: next.id },
  ]
  if (next.says) events.push({ t, kind: 'patient', text: next.says, phase: next.id })
  return add(
    {
      ...enc,
      phase: next.id,
      phaseSince: t,
      phases: [...enc.phases, { id: next.id, t }],
    },
    events,
  )
}

/** When the next timed rule fires from the current stage (Infinity if none). */
function nextRule(
  def: CaseDef,
  enc: Encounter,
): { at: number; rule: CaseDef['rules'][number] } | null {
  let best: { at: number; rule: CaseDef['rules'][number] } | null = null
  for (const rule of def.rules) {
    if (!rule.from.includes(enc.phase)) continue
    let at = Infinity
    if (rule.after !== undefined) at = enc.phaseSince + rule.after
    if (rule.notDone && !doneSince(enc, rule.notDone.action, enc.phaseSince))
      at = Math.min(at, enc.phaseSince + rule.notDone.within)
    if (at < Infinity && (!best || at < best.at)) best = { at, rule }
  }
  return best
}

/** Lets time pass, applying the case's timed rules in order. */
export function advance(def: CaseDef, enc: Encounter, minutes: number): Encounter {
  if (enc.ended) return enc
  const target = Math.min(enc.t + minutes, def.limit)
  let cur = enc
  for (let guard = 0; guard < 40; guard++) {
    const next = nextRule(def, cur)
    if (!next || next.at > target) break
    cur = changeTo(
      def,
      { ...cur, t: Math.max(cur.t, next.at) },
      next.rule.to,
      Math.max(cur.t, next.at),
      next.rule.event,
    )
  }
  cur = { ...cur, t: target }
  if (target >= def.limit) cur = finish(def, cur, 'time')
  return cur
}

function teamReply(def: CaseDef, enc: Encounter, to: string): string {
  const phase = phaseOf(def, enc.phase)
  if (phase.concerning)
    return `${to} comes straight away: "Thank you for telling me. I'm coming now. Stay with them, and keep the observations going."`
  return `${to}: "Thanks for letting me know. Keep an eye on them and tell me if anything changes."`
}

/**
 * Does one action from the catalogue. `text` is what was written (a note,
 * an escalation in SBAR form, a handover) for the actions that need it.
 */
export function act(def: CaseDef, enc: Encounter, actionId: string, text = ''): Step {
  const before = enc.log.length
  if (enc.ended) return { enc, events: [] }
  const action = getAction(actionId)
  if (!action) return { enc, events: [] }
  const role = enc.role as Role
  const t = enc.t

  if (!allowed(action, role)) {
    const who = action.referTo ?? 'the nurse in charge'
    const why = outOfScope(action)
      ? `"${action.label}" is for a registered clinician, not healthcare support staff. You ask ${who}.`
      : `As a ${ROLE_TITLES[role]}, you are not signed off for "${action.label}" yet. You ask ${who}.`
    const next = add(
      { ...enc, referred: { ...enc.referred, [actionId]: enc.referred[actionId] ?? t } },
      [{ t, kind: 'referred', text: why, action: actionId }],
    )
    return { enc: next, events: next.log.slice(before) }
  }

  const phase = phaseOf(def, enc.phase)
  const judged = def.actions[actionId]
  let cur: Encounter = {
    ...enc,
    done: { ...enc.done, [actionId]: [...timesDone(enc, actionId), t] },
  }
  const events: CaseEvent[] = [{ t, kind: 'action', text: action.done, action: actionId }]

  for (const m of action.measure ?? []) {
    const value = reading(phase.vitals, m)
    cur = {
      ...cur,
      measurements: [...cur.measurements, { t, measure: m, value, phase: phase.id }],
    }
    events.push({
      t,
      kind: 'measure',
      text: `${measureLabel(m)}: ${value}`,
      action: actionId,
    })
  }
  const finding = phase.findings?.[actionId]
  if (finding)
    events.push({ t, kind: 'finding', text: finding, action: actionId, phase: phase.id })
  if (judged?.result)
    events.push({ t, kind: 'finding', text: judged.result, action: actionId })
  if (actionId === 'read-notes') {
    const known = def.facts.filter(
      (f) => f.inNotes && (!f.phases || f.phases.includes(phase.id)),
    )
    const asked = { ...cur.asked }
    for (const f of known) if (asked[f.id] === undefined) asked[f.id] = t
    cur = { ...cur, asked }
    for (const f of known)
      events.push({
        t,
        kind: 'finding',
        text: `From the notes: ${f.answers[0]}`,
        action: actionId,
      })
  }

  if (action.category === 'specimens' && actionId !== 'send-specimen') {
    const kind = (
      {
        'collect-urine': 'urine',
        'collect-stool': 'stool',
        'collect-swab': 'swab',
        'collect-sputum': 'sputum',
        'collect-blood': 'blood',
      } as const
    )[actionId as 'collect-urine']
    if (kind) cur = { ...cur, specimens: [...cur.specimens, { kind, t, sent: null }] }
  }
  if (actionId === 'send-specimen') {
    const waiting = cur.specimens.filter((s) => s.sent === null)
    if (!waiting.length)
      events.push({ t, kind: 'finding', text: 'There is nothing collected to send yet.' })
    cur = {
      ...cur,
      specimens: cur.specimens.map((s) => (s.sent === null ? { ...s, sent: t } : s)),
    }
  }
  if (actionId === 'view-results')
    events.push(
      ...resultsNow(def, cur).map((text) => ({ t, kind: 'result' as const, text })),
    )
  if (actionId === 'ecg' && def.results?.ecg)
    events.push({
      t,
      kind: 'result',
      text: `ECG recorded (${def.results.ecg.trace} trace). You show it to the doctor to read: you do not interpret it yourself.`,
    })

  if (actionId === 'write-note' || actionId === 'update-fluid-chart')
    cur = {
      ...cur,
      written: [...cur.written, { t, kind: 'note', to: '', text: text.slice(0, 4000) }],
    }
  if (actionId === 'handover')
    cur = {
      ...cur,
      written: [
        ...cur.written,
        { t, kind: 'handover', to: 'the next shift', text: text.slice(0, 4000) },
      ],
    }
  if (action.category === 'escalation') {
    const to =
      actionId === 'tell-nurse'
        ? 'Owen Fraser (nurse in charge)'
        : actionId === 'call-outreach'
          ? 'The outreach team'
          : 'The emergency team'
    cur = {
      ...cur,
      written: [...cur.written, { t, kind: 'escalation', to, text: text.slice(0, 4000) }],
    }
    if (text.trim())
      events.push({
        t,
        kind: 'escalation',
        text: text.trim().slice(0, 2000),
        action: actionId,
      })
    events.push({ t, kind: 'team', text: teamReply(def, cur, to), action: actionId })
  }
  if (actionId === 'ask-nurse' && text.trim())
    events.push({
      t,
      kind: 'team',
      text: `Owen Fraser: "${nurseAnswer(def, cur, text)}"`,
    })

  cur = add(cur, events)

  // Rules that fire on this action, in this stage.
  const rule = def.rules.find((r) => r.done === actionId && r.from.includes(cur.phase))
  if (rule) cur = changeTo(def, cur, rule.to, t, rule.event)

  cur = advance(def, cur, action.minutes)
  return { enc: cur, events: cur.log.slice(before) }
}

/** The player speaks to the patient. One minute passes. */
export function say(
  def: CaseDef,
  enc: Encounter,
  text: string,
): Step & { reply: string } {
  const before = enc.log.length
  if (enc.ended || !text.trim()) return { enc, events: [], reply: '' }
  const t = enc.t
  const phase = phaseOf(def, enc.phase)
  const heard = hear(text, def, enc.phase)
  const reply = patientReply(def, phase, heard, enc.speech.lines)
  let cur: Encounter = {
    ...enc,
    speech: {
      lines: enc.speech.lines + 1,
      open: enc.speech.open + (heard.open ? 1 : 0),
      jargon: [...new Set([...enc.speech.jargon, ...heard.jargon])].slice(0, 40),
    },
  }
  const mark = (id: string) => {
    cur = { ...cur, done: { ...cur.done, [id]: [...timesDone(cur, id), t] } }
  }
  if (heard.introduce) mark('introduce')
  if (heard.checkId) mark('check-id')
  if (heard.consent) mark('consent')
  if (heard.reassure) mark('reassure')
  if (phase.vitals.alert) {
    const asked = { ...cur.asked }
    for (const f of heard.facts) if (asked[f.id] === undefined) asked[f.id] = t
    cur = { ...cur, asked }
  }
  const events: CaseEvent[] = [
    { t, kind: 'said', text: text.trim().slice(0, 2000) },
    { t, kind: 'patient', text: reply, phase: phase.id },
  ]
  if (heard.diagnosed)
    events.push({
      t,
      kind: 'conduct',
      text: `You told the patient it might be "${heard.diagnosed}". Diagnosing is for the doctor: a support worker reports what they see and lets the doctor explain.`,
    })
  cur = add(cur, events)
  cur = advance(def, cur, 1)
  return { enc: cur, events: cur.log.slice(before), reply }
}

/** The results the player can see now (specimens that reached the lab long enough ago). */
export function resultsNow(def: CaseDef, enc: Encounter): string[] {
  const out: string[] = []
  for (const s of enc.specimens) {
    const spec = def.results?.specimens?.[s.kind]
    if (s.sent === null) continue
    if (!spec) {
      out.push(
        `${capital(s.kind)} sample: received by the laboratory; nothing to report.`,
      )
      continue
    }
    if (enc.t < s.sent + spec.minutes) {
      out.push(
        `${capital(s.kind)} sample: received by the laboratory, results expected in about ${Math.ceil(s.sent + spec.minutes - enc.t)} minutes.`,
      )
      continue
    }
    for (const r of spec.results) {
      const flag = r.value < r.low ? 'LOW' : r.value > r.high ? 'HIGH' : 'normal'
      out.push(
        `${r.test}: ${r.value} ${r.unit} (${r.low}-${r.high}) ${flag}. ${r.meaning}`,
      )
    }
  }
  if (timesDone(enc, 'ecg').length && def.results?.ecg)
    out.push(`ECG on file, waiting for the doctor to read it.`)
  if (def.results?.imaging)
    out.push(
      `${def.results.imaging.study}: requested by the doctor; the report will come to them.`,
    )
  if (!out.length) out.push('No new results for this patient.')
  return out
}

function nurseAnswer(def: CaseDef, enc: Encounter, question: string): string {
  const q = question.toLowerCase()
  if (/(drink|eat|food|water|nil by mouth)/.test(q))
    return def.actions['offer-drink']?.as === 'harmful'
      ? 'No, nothing to eat or drink for now, please.'
      : 'Yes, they can have a drink if they want one.'
  if (/(oxygen|medicine|pain relief|tablet|drip)/.test(q))
    return "That's mine to sort out. Tell me what you're seeing and I'll take it from there."
  if (/(walk|mobilise|toilet|get up)/.test(q))
    return def.actions['help-walk']?.as === 'harmful'
      ? 'No, keep them in bed for now. Bring a commode or bedpan if they need it.'
      : 'Yes, with help.'
  if (phaseOf(def, enc.phase).concerning)
    return 'What are their observations? If you are worried, tell me now: that is never wrong.'
  return 'Do the observations first and tell me what you find.'
}

export function finish(
  def: CaseDef,
  enc: Encounter,
  reason: 'finished' | 'time' | 'abandoned' = 'finished',
): Encounter {
  if (enc.ended) return enc
  const text =
    reason === 'time'
      ? `Time is up: ${def.limit} minutes on the case.`
      : reason === 'abandoned'
        ? 'You left the case.'
        : 'You finished the case.'
  return add({ ...enc, ended: { t: enc.t, reason } }, [{ t: enc.t, kind: 'end', text }])
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function measureLabel(m: Measure): string {
  return (
    {
      resp: 'Breathing rate',
      spo2: 'Oxygen saturation',
      temp: 'Temperature',
      bp: 'Blood pressure',
      pulse: 'Pulse',
      avpu: 'Alertness',
      pain: 'Pain score',
      glucose: 'Blood glucose',
    } as const
  )[m]
}

/** The minutes since the patient first entered a concerning stage (null if never). */
export function concerningSince(def: CaseDef, enc: Encounter): number | null {
  const first = enc.phases.find((p) => phaseOf(def, p.id).concerning)
  return first ? first.t : null
}
