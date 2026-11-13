/**
 * Works Desk: the calculations and actions, as pure functions. Each action
 * returns the new state and the problems that stopped it.
 *
 * The formulas are standard textbook ones (Ohm's law, P = I²R, M = PL/4,
 * σ = M/Z, gear ratios, the critical path). Catalogues, limits and safety
 * factors are simplified and fictional: this is for learning, not design.
 */
import { ALLOWABLE_STRESS, SECTIONS } from './data'
import type {
  Beam,
  Circuit,
  Component,
  EngineeringState,
  GearTrain,
  Plan,
  SafetyStep,
} from './schema'

export interface Result {
  state: EngineeringState
  problems: string[]
}

const ok = (state: EngineeringState): Result => ({ state, problems: [] })
const fail = (state: EngineeringState, ...problems: string[]): Result => ({
  state,
  problems,
})
const log = (s: EngineeringState, action: string, detail = ''): EngineeringState => ({
  ...s,
  audit: [...s.audit, { action, detail }].slice(-1000),
})
const round = (n: number, dp = 3) => Math.round(n * 10 ** dp) / 10 ** dp

// ---------------------------------------------------------------------------
// Circuits (series): Ohm's law and power
// ---------------------------------------------------------------------------

export interface CircuitAnalysis {
  resistance: number
  /** Amps. */
  current: number
  parts: Array<{
    id: string
    kind: Component['kind']
    drop: number
    power: number
    ok: boolean
    problem: string
  }>
  problems: string[]
}

export function analyseCircuit(c: Circuit): CircuitAnalysis {
  const resistance = c.components
    .filter((p) => p.kind === 'resistor')
    .reduce((s, p) => s + p.value, 0)
  const forward = c.components
    .filter((p) => p.kind === 'led')
    .reduce((s, p) => s + p.value, 0)
  const headroom = c.supply - forward
  const current =
    resistance > 0 && headroom > 0 ? headroom / resistance : headroom > 0 ? Infinity : 0
  const parts = c.components.map((p) => {
    if (p.kind === 'resistor') {
      const drop = current * p.value
      const power = current * current * p.value
      const ok = power <= p.rating
      return {
        id: p.id,
        kind: p.kind,
        drop: round(drop),
        power: round(power, 4),
        ok,
        problem: ok
          ? ''
          : `${p.id} dissipates ${round(power, 3)} W but is rated ${p.rating} W: it will overheat.`,
      }
    }
    const ok = current <= p.rating
    return {
      id: p.id,
      kind: p.kind,
      drop: p.value,
      power: round(current * p.value, 4),
      ok,
      problem: ok
        ? ''
        : `${p.id} carries ${round(current * 1000, 1)} mA, above its ${p.rating * 1000} mA maximum: it will fail.`,
    }
  })
  const problems = parts.filter((p) => !p.ok).map((p) => p.problem)
  if (current === Infinity)
    problems.push('There is no resistance: the current is not limited (a short circuit).')
  if (headroom <= 0) problems.push('The supply is too low to light the LEDs.')
  return {
    resistance,
    current: current === Infinity ? Infinity : round(current, 5),
    parts,
    problems,
  }
}

const updateCircuit = (
  s: EngineeringState,
  id: string,
  change: (c: Circuit) => Circuit,
) => ({
  ...s,
  circuits: s.circuits.map((c) => (c.id === id ? change(c) : c)),
})

export function setComponent(
  s: EngineeringState,
  circuitId: string,
  componentId: string,
  value: number,
  rating: number,
): Result {
  const circuit = s.circuits.find((c) => c.id === circuitId)
  if (!circuit?.components.some((p) => p.id === componentId))
    return fail(s, 'There is no such component.')
  if (!(value > 0) || !(rating > 0))
    return fail(s, 'Enter a value and a rating greater than zero.')
  return ok(
    log(
      updateCircuit(s, circuitId, (c) => ({
        ...c,
        components: c.components.map((p) =>
          p.id === componentId ? { ...p, value, rating } : p,
        ),
      })),
      'Changed a component',
      `${circuitId} ${componentId}: ${value}, rated ${rating}`,
    ),
  )
}

// ---------------------------------------------------------------------------
// Beams: simply supported, point load at mid-span
// ---------------------------------------------------------------------------

export function beamCheck(b: Beam, sectionId = b.section) {
  /** kN·m */
  const moment = (b.load * b.span) / 4
  const section = SECTIONS.find((x) => x.id === sectionId)
  if (!section) return { moment, stress: null, utilisation: null, passes: false }
  // N·mm ÷ mm³ = N/mm²
  const stress = round((moment * 1e6) / (section.z * 1e3), 1)
  const utilisation = round(stress / ALLOWABLE_STRESS, 2)
  return { moment, stress, utilisation, passes: stress <= ALLOWABLE_STRESS }
}

/** The lightest section that passes. */
export function lightestSection(b: Beam): string | null {
  return (
    [...SECTIONS].sort((a, c) => a.mass - c.mass).find((x) => beamCheck(b, x.id).passes)
      ?.id ?? null
  )
}

export function chooseSection(
  s: EngineeringState,
  beamId: string,
  sectionId: string,
): Result {
  const beam = s.beams.find((b) => b.id === beamId)
  if (!beam || !SECTIONS.some((x) => x.id === sectionId))
    return fail(s, 'Choose a beam and a section.')
  return ok(
    log(
      {
        ...s,
        beams: s.beams.map((b) => (b.id === beamId ? { ...b, section: sectionId } : b)),
      },
      'Chose a beam section',
      `${beamId}: ${sectionId}`,
    ),
  )
}

// ---------------------------------------------------------------------------
// Gear trains
// ---------------------------------------------------------------------------

export function gearRatio(g: GearTrain): number {
  return round(
    g.stages.reduce((r, [driver, driven]) => r * (driven / driver), 1),
    4,
  )
}

export const outputRpm = (g: GearTrain) => round(g.inputRpm / gearRatio(g), 1)

export function setStages(
  s: EngineeringState,
  gearId: string,
  stages: GearTrain['stages'],
): Result {
  if (!s.gears.some((g) => g.id === gearId))
    return fail(s, 'There is no such gear train.')
  if (!stages.length) return fail(s, 'Add at least one pair of gears.')
  if (stages.some(([a, b]) => a < 8 || b < 8))
    return fail(s, 'A gear needs at least 8 teeth.')
  return ok(
    log(
      { ...s, gears: s.gears.map((g) => (g.id === gearId ? { ...g, stages } : g)) },
      'Changed a gear train',
      `${gearId}: ${stages.map(([a, b]) => `${a}:${b}`).join(', ')}`,
    ),
  )
}

// ---------------------------------------------------------------------------
// Project planning: the critical path
// ---------------------------------------------------------------------------

export function schedule(plan: Plan) {
  const byId = new Map(plan.tasks.map((t) => [t.id, t]))
  const early = new Map<string, { start: number; finish: number }>()
  const visit = (id: string): { start: number; finish: number } => {
    const known = early.get(id)
    if (known) return known
    const t = byId.get(id)!
    const start = Math.max(0, ...t.after.map((a) => visit(a).finish))
    const result = { start, finish: start + t.days }
    early.set(id, result)
    return result
  }
  plan.tasks.forEach((t) => visit(t.id))
  const finish = Math.max(0, ...[...early.values()].map((e) => e.finish))
  // Latest finish, backwards.
  const late = new Map<string, number>()
  const successors = (id: string) => plan.tasks.filter((t) => t.after.includes(id))
  const lateFinish = (id: string): number => {
    const known = late.get(id)
    if (known !== undefined) return known
    const next = successors(id)
    const value = next.length
      ? Math.min(...next.map((n) => lateFinish(n.id) - n.days))
      : finish
    late.set(id, value)
    return value
  }
  const rows = plan.tasks.map((t) => {
    const e = early.get(t.id)!
    const float = lateFinish(t.id) - e.finish
    return { ...t, start: e.start, finish: e.finish, float }
  })
  return { finish, rows, critical: rows.filter((r) => r.float === 0).map((r) => r.id) }
}

export function toggleCritical(
  s: EngineeringState,
  planId: string,
  taskId: string,
): Result {
  const plan = s.plans.find((p) => p.id === planId)
  if (!plan?.tasks.some((t) => t.id === taskId)) return fail(s, 'There is no such task.')
  const on = plan.critical.includes(taskId)
  return ok(
    log(
      {
        ...s,
        plans: s.plans.map((p) =>
          p.id === planId
            ? {
                ...p,
                critical: on
                  ? p.critical.filter((c) => c !== taskId)
                  : [...p.critical, taskId],
              }
            : p,
        ),
      },
      on ? 'Unmarked a critical task' : 'Marked a critical task',
      `${planId} ${taskId}`,
    ),
  )
}

// ---------------------------------------------------------------------------
// Maintenance: permit to work and lockout-tagout
// ---------------------------------------------------------------------------

/** The safe order of work on powered equipment. */
export const SAFE_ORDER: SafetyStep[] = [
  'permit',
  'isolate',
  'lock',
  'test-dead',
  'repair',
  'remove-locks',
  'test-run',
]

export const STEP_NAMES: Record<SafetyStep, string> = {
  permit: 'Get the permit to work signed',
  isolate: 'Isolate the power at the isolator',
  lock: 'Fit your personal lock and tag',
  'test-dead': 'Test that it is dead (try to start it)',
  repair: 'Do the repair',
  'remove-locks': 'Remove your lock and tag (everyone clear)',
  'test-run': 'Restore power and test run',
}

export function doStep(s: EngineeringState, orderId: string, step: SafetyStep): Result {
  const order = s.workOrders.find((w) => w.id === orderId)
  if (!order) return fail(s, 'There is no such work order.')
  if (order.status === 'closed') return fail(s, 'This work order is closed.')
  const next = SAFE_ORDER[order.steps.length]
  if (step !== next)
    return fail(
      s,
      `Not yet: “${STEP_NAMES[step]}” must not come before “${STEP_NAMES[next]}”.${step === 'repair' ? ' Never work on equipment that has not been isolated, locked off and proved dead.' : ''}`,
    )
  const status: (typeof order)['status'] =
    step === 'lock'
      ? 'isolated'
      : step === 'repair'
        ? 'in-progress'
        : step === 'test-run'
          ? 'tested'
          : order.status
  return ok(
    log(
      {
        ...s,
        workOrders: s.workOrders.map((w) =>
          w.id === orderId ? { ...w, steps: [...w.steps, step], status } : w,
        ),
      },
      STEP_NAMES[step],
      orderId,
    ),
  )
}

export function closeWorkOrder(
  s: EngineeringState,
  orderId: string,
  reading: number,
  note: string,
): Result {
  const order = s.workOrders.find((w) => w.id === orderId)
  if (!order) return fail(s, 'There is no such work order.')
  if (!order.steps.includes('test-run'))
    return fail(s, 'Test run the equipment before closing the work order.')
  if (!Number.isFinite(reading)) return fail(s, 'Record the reading from the test run.')
  if (reading > order.limit)
    return fail(
      s,
      `${reading} is above the limit of ${order.limit}: the fault is not fixed. Do not close it.`,
    )
  if (note.trim().length < 10)
    return fail(s, 'Write what you did, for the equipment’s history.')
  return ok(
    log(
      {
        ...s,
        workOrders: s.workOrders.map((w) =>
          w.id === orderId ? { ...w, status: 'closed', reading, note: note.trim() } : w,
        ),
      },
      'Closed work order',
      `${orderId}: ${reading}`,
    ),
  )
}

// ---------------------------------------------------------------------------
// Inspection against a drawing
// ---------------------------------------------------------------------------

export function partFindings(s: EngineeringState, drawingId: string, partId: string) {
  const drawing = s.drawings.find((d) => d.id === drawingId)
  const part = drawing?.parts.find((p) => p.id === partId)
  if (!drawing || !part) return []
  return drawing.features.map((f) => {
    const value = part.measured[f.id]
    const deviation = round(value - f.nominal, 3)
    return { feature: f, value, deviation, ok: Math.abs(deviation) <= f.tolerance + 1e-9 }
  })
}

export const partConforms = (s: EngineeringState, drawingId: string, partId: string) =>
  partFindings(s, drawingId, partId).every((f) => f.ok)

export function decidePart(
  s: EngineeringState,
  drawingId: string,
  partId: string,
  decision: 'accept' | 'reject',
): Result {
  const drawing = s.drawings.find((d) => d.id === drawingId)
  if (!drawing?.parts.some((p) => p.id === partId))
    return fail(s, 'There is no such part.')
  return ok(
    log(
      {
        ...s,
        drawings: s.drawings.map((d) =>
          d.id === drawingId
            ? {
                ...d,
                parts: d.parts.map((p) => (p.id === partId ? { ...p, decision } : p)),
              }
            : d,
        ),
      },
      decision === 'accept' ? 'Accepted a part' : 'Rejected a part',
      partId,
    ),
  )
}

// ---------------------------------------------------------------------------
// Environmental monitoring
// ---------------------------------------------------------------------------

export function flagSample(
  s: EngineeringState,
  sampleId: string,
  action: string,
): Result {
  const sample = s.samples.find((x) => x.id === sampleId)
  if (!sample) return fail(s, 'There is no such sample.')
  if (action.trim().length < 10)
    return fail(
      s,
      'Record what you are doing about it (who you told, and the next step).',
    )
  return ok(
    log(
      {
        ...s,
        samples: s.samples.map((x) =>
          x.id === sampleId ? { ...x, flagged: true, action: action.trim() } : x,
        ),
      },
      'Flagged a sample',
      `${sample.substance}: ${sample.value} ${sample.unit}`,
    ),
  )
}

export function unflagSample(s: EngineeringState, sampleId: string): Result {
  if (!s.samples.some((x) => x.id === sampleId))
    return fail(s, 'There is no such sample.')
  return ok(
    log(
      {
        ...s,
        samples: s.samples.map((x) =>
          x.id === sampleId ? { ...x, flagged: false, action: '' } : x,
        ),
      },
      'Unflagged a sample',
      sampleId,
    ),
  )
}
