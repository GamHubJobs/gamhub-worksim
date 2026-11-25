/**
 * Patient cases inside Ward Systems: one shared set of data. Starting a case
 * puts the patient in the patient record; observations recorded at the
 * bedside go on their observation chart (with the early-warning score),
 * notes, escalations and handovers go in their notes, specimens go to the
 * laboratory, the ward clock moves with the case, and the audit log shows
 * every step. Finishing a case scores it and keeps the attempt.
 *
 * Every function is pure and returns Ward Systems' usual Result.
 */
import type { Result } from '../tools/clinical/model'
import {
  addNote,
  clockText,
  flagFor,
  patientById,
  recordVitals,
} from '../tools/clinical/model'
import type { ClinicalState, LabOrder, Patient } from '../tools/clinical/schema'
import { getAction } from './actions'
import { assess, history, toAttempt } from './assessment'
import { getCase, casesFor } from './cases'
import { goodCare } from './demo'
import { act, advance, finish, phaseOf, say, startEncounter } from './engine'
import type { CaseDef, Difficulty, Measure, Role } from './model'
import { ROLE_OF_LEVEL, RUBRIC_NAMES, type Rubric } from './model'
import {
  emptyCases,
  type Attempt,
  type CaseAssignment,
  type CasesState,
  type Encounter,
} from './schema'

const ok = (state: ClinicalState): Result => ({ state, problems: [] })
const fail = (state: ClinicalState, ...problems: string[]): Result => ({
  state,
  problems,
})

/** How many recent attempts keep their full record for review. */
export const KEEP_REPLAYS = 12

export const casesOf = (s: ClinicalState): CasesState => s.cases ?? emptyCases()

export const roleFor = (levelId: string | undefined): Role =>
  ROLE_OF_LEVEL[levelId ?? ''] ?? 0

function audit(
  s: ClinicalState,
  action: string,
  patientId: string | null,
  detail = '',
): ClinicalState {
  return {
    ...s,
    audit: [
      ...s.audit,
      { at: clockText(s.clock), action, patientId, detail: detail.slice(0, 300) },
    ].slice(-1000),
  }
}

const withCases = (s: ClinicalState, cases: CasesState): ClinicalState => ({
  ...s,
  cases,
})

const ROOM_BEDS: Record<CaseDef['room'], string | null> = {
  bay: '4C-1',
  exam: null,
  emergency: 'EAU-2',
  treatment: '4-TR',
  observation: 'OBS-1',
  'side-room': '4-SR2',
  collection: null,
}

/** The case patient, as they appear in the patient record. */
export function patientRecord(def: CaseDef): Patient {
  const p = def.patient
  const bed = ROOM_BEDS[def.room]
  return {
    id: p.id,
    name: p.name,
    dob: `${2026 - p.age}-05-04`,
    sex: p.sex,
    status: bed ? 'admitted' : 'outpatient',
    bed,
    allergies: p.allergies,
    alerts: def.id === 'fall-on-ward' ? ['Falls risk'] : [],
    careTeam: true,
    reason: def.background.slice(0, 200),
  }
}

export function activeCase(s: ClinicalState): { def: CaseDef; enc: Encounter } | null {
  const enc = casesOf(s).active
  const def = enc ? getCase(enc.caseId) : undefined
  return enc && def ? { def, enc } : null
}

export function startCase(
  s: ClinicalState,
  caseId: string,
  difficulty: Difficulty,
  levelId: string | undefined,
  assignment = '',
): Result {
  const def = getCase(caseId)
  if (!def) return fail(s, 'There is no such patient case.')
  const current = activeCase(s)
  if (current && !current.enc.ended)
    return fail(s, `Finish or leave the case with ${current.def.patient.name} first.`)
  const role = roleFor(levelId)
  if (def.role > role)
    return fail(
      s,
      `This case is for a ${['trainee', 'healthcare assistant', 'senior healthcare assistant', 'ward coordinator'][def.role]} or above.`,
    )
  const enc = startEncounter(def, difficulty, role, s.clock, assignment)
  const record = patientRecord(def)
  const patients = patientById(s, record.id)
    ? s.patients
    : [...s.patients, record].slice(-60)
  const next = withCases({ ...s, patients }, { ...casesOf(s), active: enc })
  return ok(
    audit(next, 'Started a patient case', record.id, `${def.title} (${difficulty})`),
  )
}

/** The numbers measured most recently for each observation, as the chart takes them. */
export function chartValues(def: CaseDef, enc: Encounter) {
  const latest: Partial<Record<Measure, string>> = {}
  for (const m of enc.measurements) latest[m.measure] = m.phase
  const need: Measure[] = ['resp', 'spo2', 'temp', 'bp', 'pulse', 'avpu']
  if (!need.every((m) => latest[m])) return null
  const v = (m: Measure) => phaseOf(def, latest[m]!).vitals
  return {
    resp: v('resp').resp,
    spo2: v('spo2').spo2,
    temp: v('temp').temp,
    sys: v('bp').sys,
    dia: v('bp').dia,
    pulse: v('pulse').pulse,
    alert: v('avpu').alert,
  }
}

const NOTE_KIND: Record<string, 'nursing' | 'escalation' | 'handover'> = {
  'write-note': 'nursing',
  'update-fluid-chart': 'nursing',
  'tell-nurse': 'escalation',
  'call-outreach': 'escalation',
  'emergency-call': 'escalation',
  handover: 'handover',
}

/** Applies what happened in the case to the rest of Ward Systems. */
function mirror(
  s: ClinicalState,
  def: CaseDef,
  before: Encounter,
  enc: Encounter,
  actionId: string | null,
  text: string,
): ClinicalState {
  const pid = def.patient.id
  let next: ClinicalState = {
    ...s,
    clock: Math.min(24 * 60 - 1, enc.startClock + Math.floor(enc.t)),
  }
  if (actionId) {
    const action = getAction(actionId)
    const referred =
      enc.referred[actionId] !== undefined && before.referred[actionId] === undefined
    next = audit(
      next,
      referred ? 'Asked a qualified colleague' : `Bedside: ${action?.label ?? actionId}`,
      pid,
      def.title,
    )
    if (actionId === 'record-obs') {
      const values = chartValues(def, enc)
      if (values) {
        const r = recordVitals(next, pid, values)
        if (!r.problems.length) next = r.state
      } else
        next = audit(
          next,
          'Observations incomplete',
          pid,
          'A full set is needed for the chart and the score.',
        )
    }
    const kind = NOTE_KIND[actionId]
    if (kind && text.trim().length >= 10) {
      const r = addNote(next, pid, kind, text, true)
      if (!r.problems.length) next = r.state
    }
    if (actionId === 'send-specimen') {
      const sent = enc.specimens.filter(
        (sp, i) => sp.sent !== null && before.specimens[i]?.sent == null,
      )
      const labs: LabOrder[] = sent
        .filter(
          (sp): sp is typeof sp & { kind: 'blood' | 'urine' | 'swab' } =>
            sp.kind === 'blood' || sp.kind === 'urine' || sp.kind === 'swab',
        )
        .map((sp, i) => {
          const first = def.results?.specimens?.[sp.kind]?.results[0]
          return {
            id: `C-${next.labs.length + i + 1}`,
            patientId: pid,
            test: first?.test ?? `${sp.kind} sample`,
            specimen: sp.kind,
            orderedBy: 'Dr Felix Moreau',
            status: 'received',
            label: { name: def.patient.name, dob: patientRecord(def).dob },
            rejectReason: '',
            result: null,
            acknowledged: false,
            calledTo: '',
          }
        })
      if (labs.length)
        next = audit(
          { ...next, labs: [...next.labs, ...labs].slice(-200) },
          'Specimen received by the laboratory',
          pid,
          labs.map((l) => l.test).join(', '),
        )
    }
  }
  // Results that have come back since: onto the laboratory record.
  const labs = next.labs.map((l) => {
    if (l.patientId !== pid || l.result || l.status !== 'received') return l
    const spec = def.results?.specimens?.[l.specimen]
    const sp = enc.specimens.find((x) => x.kind === l.specimen && x.sent !== null)
    if (!spec || !sp || enc.t < sp.sent! + spec.minutes) return l
    const r = spec.results[0]
    return {
      ...l,
      status: 'resulted' as const,
      result: flagFor(r.test, r.value) ?? {
        value: r.value,
        unit: r.unit,
        low: r.low,
        high: r.high,
        flag:
          r.value < r.low
            ? ('low' as const)
            : r.value > r.high
              ? ('high' as const)
              : ('normal' as const),
      },
    }
  })
  next = { ...next, labs }
  for (const p of enc.phases.slice(before.phases.length))
    next = audit(next, 'Patient condition changed', pid, phaseOf(def, p.id).looks)
  return withCases(next, { ...casesOf(next), active: enc })
}

export function caseAct(s: ClinicalState, actionId: string, text = ''): Result {
  const current = activeCase(s)
  if (!current || current.enc.ended) return fail(s, 'There is no patient case open.')
  const { def, enc } = current
  const action = getAction(actionId)
  if (!action) return fail(s, 'That is not something you can do here.')
  if (['write-note', 'handover'].includes(actionId) && text.trim().length < 10)
    return fail(
      s,
      'Write the note in full: what you saw, what you did, and what happens next.',
    )
  const step = act(def, enc, actionId, text)
  return ok(mirror(s, def, enc, step.enc, actionId, text))
}

export function caseSay(s: ClinicalState, text: string): Result & { reply: string } {
  const current = activeCase(s)
  if (!current || current.enc.ended)
    return { ...fail(s, 'There is no patient case open.'), reply: '' }
  if (!text.trim()) return { ...fail(s, 'Type what you want to say.'), reply: '' }
  const { def, enc } = current
  const step = say(def, enc, text.slice(0, 500))
  return { ...ok(mirror(s, def, enc, step.enc, null, '')), reply: step.reply }
}

export function caseWait(s: ClinicalState, minutes: number): Result {
  const current = activeCase(s)
  if (!current || current.enc.ended) return fail(s, 'There is no patient case open.')
  const { def, enc } = current
  return ok(mirror(s, def, enc, advance(def, enc, minutes), null, ''))
}

/** Finishes (or leaves) the case: scores it and keeps the attempt. */
export function finishCase(
  s: ClinicalState,
  day: number,
  reason: 'finished' | 'abandoned' = 'finished',
): Result {
  const current = activeCase(s)
  if (!current) return fail(s, 'There is no patient case open.')
  const { def } = current
  const enc = finish(
    def,
    current.enc,
    current.enc.ended ? current.enc.ended.reason : reason,
  )
  const cases = casesOf(s)
  const attempt = toAttempt(def, enc, day, `att-${cases.attempts.length + 1}-${day}`)
  const attempts = [...cases.attempts, attempt].slice(-200)
  const keep = attempts.length - KEEP_REPLAYS
  const trimmed = attempts.map((a, i) => (i < keep ? { ...a, encounter: null } : a))
  const assigned = cases.assigned.map((a) =>
    !a.completed &&
    a.caseId === def.id &&
    attempt.passed &&
    DIFF_RANK[attempt.difficulty] >= DIFF_RANK[a.difficulty]
      ? { ...a, completed: attempt.id }
      : a,
  )
  const next = withCases(s, { active: null, attempts: trimmed, assigned })
  return ok(
    audit(
      next,
      reason === 'abandoned' ? 'Left a patient case' : 'Finished a patient case',
      def.patient.id,
      `${def.title}: ${attempt.score}%${attempt.passed ? ' (passed)' : ''}`,
    ),
  )
}

/** Closes the debrief of an ended case without scoring again (nothing open afterwards). */
export const lastAttempt = (s: ClinicalState): Attempt | null =>
  casesOf(s).attempts.at(-1) ?? null

export const DIFF_RANK: Record<Difficulty, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
  expert: 3,
}

// ---------------------------------------------------------------------------
// Grace's assignments and the educator dashboard
// ---------------------------------------------------------------------------

/** The rubric areas where the player's latest attempts are weakest. */
export function weakest(
  attempts: Attempt[],
): Array<{ id: Rubric; name: string; score: number }> {
  const latest = new Map<string, Attempt>()
  for (const a of attempts) latest.set(a.caseId, a)
  const totals = new Map<Rubric, number[]>()
  for (const a of latest.values())
    for (const [r, v] of Object.entries(a.rubric))
      totals.set(r as Rubric, [...(totals.get(r as Rubric) ?? []), v])
  return [...totals.entries()]
    .map(([id, vs]) => ({
      id,
      name: RUBRIC_NAMES[id],
      score: Math.round(vs.reduce((x, y) => x + y, 0) / vs.length),
    }))
    .sort((a, b) => a.score - b.score)
}

/** Critical actions missed in more than one attempt (recurring gaps). */
export function recurringGaps(
  attempts: Attempt[],
): Array<{ action: string; label: string; times: number }> {
  const count = new Map<string, number>()
  for (const a of attempts)
    for (const x of new Set([...a.criticalMissed, ...a.harmful]))
      count.set(x, (count.get(x) ?? 0) + 1)
  return [...count.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .map(([action, times]) => ({
      action,
      label: getAction(action)?.label ?? action,
      times,
    }))
}

const ROLE_DIFFICULTY: Difficulty[] = ['beginner', 'intermediate', 'advanced', 'expert']

/**
 * Grace assigns cases when the player has none open: the next cases for
 * their role they have not passed, preferring ones that practise their
 * weakest area, due in two working days.
 */
export function graceAssigns(
  s: ClinicalState,
  levelId: string | undefined,
  day: number,
): Result {
  const cases = casesOf(s)
  const open = cases.assigned.filter((a) => !a.completed)
  if (open.length) return fail(s, 'You already have cases assigned. Finish those first.')
  const role = roleFor(levelId)
  const passed = (id: string) => history(cases.attempts, id).passed
  const weak = weakest(cases.attempts)[0]
  const pool = casesFor(role).filter((c) => !passed(c.id))
  const practises = (c: CaseDef) =>
    weak
      ? Object.values(c.actions).some((a) => a.as === 'critical' && a.rubric === weak.id)
      : false
  const picks = [...pool.filter(practises), ...pool.filter((c) => !practises(c))].slice(
    0,
    2,
  )
  if (!picks.length)
    return fail(
      s,
      'You have passed every case for your role. Grace will add more as you are promoted.',
    )
  const made: CaseAssignment[] = picks.map((c, i) => ({
    id: `ga-${cases.assigned.length + i + 1}`,
    caseId: c.id,
    difficulty: ROLE_DIFFICULTY[Math.max(DIFF_RANK[c.difficulty], role)],
    by: 'Grace Mbeki',
    due: day + 2,
    note:
      weak && practises(c)
        ? `Your ${weak.name.toLowerCase()} needs work (${weak.score}%). This case practises it.`
        : `Next on your learning plan.`,
    completed: null,
  }))
  const next = withCases(s, {
    ...cases,
    assigned: [...cases.assigned, ...made].slice(-60),
  })
  return ok(
    audit(
      next,
      'Cases assigned by Grace Mbeki',
      null,
      made.map((m) => getCase(m.caseId)?.title).join(', '),
    ),
  )
}

export interface Dashboard {
  attempted: number
  passed: number
  total: number
  average: number | null
  rows: Array<{
    def: CaseDef
    first: Attempt | null
    latest: Attempt | null
    best: Attempt | null
    count: number
    passed: boolean
  }>
  weakest: ReturnType<typeof weakest>
  gaps: ReturnType<typeof recurringGaps>
  assignments: Array<
    CaseAssignment & { title: string; status: 'done' | 'open' | 'overdue' }
  >
}

/** The educator's view: every case, first/latest/best, the weakest areas and recurring gaps (all from the saved attempts). */
export function dashboard(
  s: ClinicalState,
  levelId: string | undefined,
  day: number,
): Dashboard {
  const cases = casesOf(s)
  const rows = casesFor(roleFor(levelId)).map((def) => ({
    def,
    ...history(cases.attempts, def.id),
  }))
  const latestScores = rows.flatMap((r) => (r.latest ? [r.latest.score] : []))
  return {
    attempted: rows.filter((r) => r.count).length,
    passed: rows.filter((r) => r.passed).length,
    total: rows.length,
    average: latestScores.length
      ? Math.round(latestScores.reduce((a, b) => a + b, 0) / latestScores.length)
      : null,
    rows,
    weakest: weakest(cases.attempts).slice(0, 3),
    gaps: recurringGaps(cases.attempts).slice(0, 5),
    assignments: cases.assigned.map((a) => ({
      ...a,
      title: getCase(a.caseId)?.title ?? a.caseId,
      status: a.completed ? 'done' : day > a.due ? 'overdue' : 'open',
    })),
  }
}

/** The debrief of an attempt (when its record was kept). */
export function debriefOf(a: Attempt) {
  const def = getCase(a.caseId)
  return def && a.encounter
    ? { def, enc: a.encounter, debrief: assess(def, a.encounter) }
    : null
}

/** A Ward Systems file in which the case was played with good care and passed (a task's model answer). */
export function solvedState(
  s: ClinicalState,
  caseId: string,
  difficulty: Difficulty,
  levelId: string,
  day = 1,
): ClinicalState {
  const started = startCase(s, caseId, difficulty, levelId)
  if (started.problems.length) throw new Error(started.problems.join(' '))
  const def = getCase(caseId)!
  const enc = goodCare(def, difficulty, roleFor(levelId), s.clock)
  const played = withCases(started.state, { ...casesOf(started.state), active: enc })
  const done = finishCase(played, day)
  if (done.problems.length) throw new Error(done.problems.join(' '))
  return done.state
}

export interface CaseCheckResult {
  fraction: number
  problems: string[]
}

/** Grades "pass this case at this difficulty or harder" from the saved attempts. */
export function gradeCase(
  s: ClinicalState | null,
  caseId: string,
  difficulty: Difficulty,
): CaseCheckResult {
  const def = getCase(caseId)
  const title = def?.title ?? caseId
  const attempts = (s ? casesOf(s).attempts : []).filter(
    (a) => a.caseId === caseId && DIFF_RANK[a.difficulty] >= DIFF_RANK[difficulty],
  )
  if (!attempts.length)
    return {
      fraction: 0,
      problems: [
        `The patient case "${title}" has not been completed at ${difficulty} level or harder.`,
      ],
    }
  if (attempts.some((a) => a.passed)) return { fraction: 1, problems: [] }
  const best = attempts.reduce((b, a) => (a.score > b.score ? a : b))
  const missed = best.criticalMissed.map((id) => getAction(id)?.label ?? id)
  const harmful = best.harmful.map((id) => getAction(id)?.label ?? id)
  return {
    fraction: Math.min(0.6, best.score / 100),
    problems: [
      `Best attempt at "${title}": ${best.score}%, not yet a pass.`,
      ...harmful.map((h) => `Harmful: ${h}.`),
      ...missed.map((m) => `Missed: ${m}.`),
    ],
  }
}
