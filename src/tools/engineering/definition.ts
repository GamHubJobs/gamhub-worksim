/** Works Desk: its registration with the tools framework (checks, grading, guide). */
import { z } from 'zod'
import { FileCheckBaseSchema } from '../../content/schemas'
import { checkResult } from '../checks'
import type { ToolDefinition } from '../types'
import { sampleEngineering } from './data'
import { analyseCircuit, beamCheck, outputRpm, partConforms, schedule } from './model'
import { EngineeringStateSchema, type EngineeringState } from './schema'

export const EngineeringCheckSchema = z.discriminatedUnion('type', [
  /** A circuit is safe (no component over its rating) with its current in a range (A). */
  FileCheckBaseSchema.extend({
    type: z.literal('circuit'),
    circuit: z.string(),
    minCurrent: z.number(),
    maxCurrent: z.number(),
  }),
  /** A beam has a section that passes (and, if given, this one: the lightest). */
  FileCheckBaseSchema.extend({
    type: z.literal('beam'),
    beam: z.string(),
    section: z.string().optional(),
  }),
  /** A gear train gives this output speed (rpm), within a tolerance. */
  FileCheckBaseSchema.extend({
    type: z.literal('gears'),
    gear: z.string(),
    rpm: z.number(),
    tolerance: z.number().default(1),
  }),
  /** The critical path is marked exactly. */
  FileCheckBaseSchema.extend({ type: z.literal('critical-path'), plan: z.string() }),
  /** A work order was done safely and closed. */
  FileCheckBaseSchema.extend({ type: z.literal('work-order'), order: z.string() }),
  /** Every part of a drawing decided correctly. */
  FileCheckBaseSchema.extend({ type: z.literal('parts'), drawing: z.string() }),
  /** Exactly the samples over their limits are flagged, with an action. */
  FileCheckBaseSchema.extend({ type: z.literal('samples') }),
])

export type EngineeringCheck = z.infer<typeof EngineeringCheckSchema>

function gradeCheck(check: EngineeringCheck, s: EngineeringState) {
  switch (check.type) {
    case 'circuit': {
      const c = s.circuits.find((x) => x.id === check.circuit)
      if (!c) return checkResult(check, 0, ['The circuit is missing.'])
      const a = analyseCircuit(c)
      const problems = [...a.problems]
      if (a.current < check.minCurrent || a.current > check.maxCurrent)
        problems.push(
          `The current is ${Number.isFinite(a.current) ? `${Math.round(a.current * 10000) / 10} mA` : 'unlimited'}; it should be between ${check.minCurrent * 1000} and ${check.maxCurrent * 1000} mA.`,
        )
      return checkResult(
        check,
        problems.length ? (a.problems.length ? 0 : 0.5) : 1,
        problems,
      )
    }
    case 'beam': {
      const b = s.beams.find((x) => x.id === check.beam)
      if (!b?.section) return checkResult(check, 0, ['No section was chosen.'])
      const r = beamCheck(b)
      if (!r.passes)
        return checkResult(check, 0, [
          `${b.section} is overstressed (${r.stress} N/mm²): it would fail.`,
        ])
      if (check.section && b.section !== check.section)
        return checkResult(check, 0.5, [
          `${b.section} is safe but heavier than it needs to be: a lighter section passes.`,
        ])
      return checkResult(check, 1, [])
    }
    case 'gears': {
      const g = s.gears.find((x) => x.id === check.gear)
      if (!g) return checkResult(check, 0, ['The gear train is missing.'])
      const rpm = outputRpm(g)
      return Math.abs(rpm - check.rpm) <= check.tolerance
        ? checkResult(check, 1, [])
        : checkResult(check, 0, [
            `The output is ${rpm} rpm; it should be ${check.rpm} rpm.`,
          ])
    }
    case 'critical-path': {
      const p = s.plans.find((x) => x.id === check.plan)
      if (!p) return checkResult(check, 0, ['The plan is missing.'])
      const right = schedule(p).critical
      const missing = right.filter((id) => !p.critical.includes(id))
      const extra = p.critical.filter((id) => !right.includes(id))
      const problems = [
        ...missing.map((id) => `Task ${id} is on the critical path but not marked.`),
        ...extra.map((id) => `Task ${id} has float: it is not critical.`),
      ]
      return checkResult(
        check,
        Math.max(0, 1 - problems.length / Math.max(1, right.length)),
        problems,
      )
    }
    case 'work-order': {
      const w = s.workOrders.find((x) => x.id === check.order)
      if (!w) return checkResult(check, 0, ['The work order is missing.'])
      if (w.status !== 'closed')
        return checkResult(check, w.steps.length / 8, [
          `${w.id} is “${w.status}”, not closed.`,
        ])
      return checkResult(check, 1, [])
    }
    case 'parts': {
      const d = s.drawings.find((x) => x.id === check.drawing)
      if (!d) return checkResult(check, 0, ['The drawing is missing.'])
      const problems = d.parts.flatMap((p) => {
        const right = partConforms(s, d.id, p.id) ? 'accept' : 'reject'
        if (p.decision === right) return []
        return [
          p.decision
            ? `${p.id} was ${p.decision}ed; it should be ${right}ed.`
            : `${p.id} was not inspected.`,
        ]
      })
      return checkResult(check, 1 - problems.length / d.parts.length, problems)
    }
    case 'samples': {
      const problems = s.samples.flatMap((x) => {
        const over = x.value > x.limit
        if (over && !x.flagged)
          return [
            `${x.substance} at ${x.point} (${x.value} ${x.unit}) is over its limit of ${x.limit}: not flagged.`,
          ]
        if (!over && x.flagged)
          return [
            `${x.substance} (${x.value} ${x.unit}) is within its limit: it should not be flagged.`,
          ]
        return []
      })
      return checkResult(
        check,
        1 - problems.length / Math.max(1, s.samples.length),
        problems,
      )
    }
  }
}

export const engineering: ToolDefinition<EngineeringState, EngineeringCheck> = {
  id: 'engineering',
  name: 'Works Desk',
  category: 'Engineering design and operations tools (simulation)',
  icon: 'engineering',
  sections: [
    {
      id: 'circuits',
      name: 'Circuits',
      description: 'Electrical: series circuits, Ohm’s law and component ratings.',
    },
    {
      id: 'beams',
      name: 'Beams',
      description: 'Structural (educational): bending in a simply supported beam.',
    },
    { id: 'gears', name: 'Gear trains', description: 'Mechanical: speed ratios.' },
    {
      id: 'planning',
      name: 'Project planning',
      description: 'Industrial: schedules and the critical path.',
    },
    {
      id: 'maintenance',
      name: 'Maintenance',
      description: 'Work orders, permit to work and lockout-tagout.',
    },
    {
      id: 'inspection',
      name: 'Inspection',
      description: 'Quality: parts against the drawing’s tolerances.',
    },
    {
      id: 'environment',
      name: 'Environment',
      description: 'Monitoring results against the site’s permit limits.',
    },
    { id: 'audit', name: 'Audit log', description: 'Every action.' },
  ],
  state: EngineeringStateSchema,
  practice: sampleEngineering,
  summary: (s) =>
    `${s.workOrders.filter((w) => w.status !== 'closed').length} open work orders · ${s.audit.length} actions logged`,
  check: EngineeringCheckSchema,
  grade: (checks, player) =>
    checks.map((check) =>
      player
        ? gradeCheck(check, player)
        : checkResult(check, 0, ['Nothing was done in Works Desk.']),
    ),
  guide: {
    intro:
      'Works Desk brings together the everyday tools of a multi-discipline engineering firm. The formulas are the standard textbook ones; the catalogues, limits and safety factors are simplified and fictional. It is for learning: real designs need the applicable codes and a competent, qualified engineer.',
    topics: [
      {
        title: 'Circuits',
        body: 'In a series circuit the same current flows through everything: I = (supply − LED voltages) ÷ total resistance. Each resistor dissipates P = I²R and must be rated above that. Choose a standard resistor value that keeps the LED below its maximum current.',
      },
      {
        title: 'Beams',
        body: 'For a point load P at the middle of a simply supported span L, the largest bending moment is M = P × L ÷ 4. The bending stress is σ = M ÷ Z, where Z is the section modulus. Choose the lightest section whose stress is within the allowable stress.',
      },
      {
        title: 'Gear trains',
        body: 'Each pair reduces the speed by driven teeth ÷ driver teeth. Multiply the stages for the overall ratio; the output speed is the input speed divided by the ratio.',
      },
      {
        title: 'The critical path',
        body: 'Each task starts when everything before it has finished. The critical path is the chain of tasks with no float: a delay to any of them delays the whole project.',
      },
      {
        title: 'Permit to work and lockout-tagout',
        body: 'Never work on powered equipment until it is safe: permit signed, power isolated, your own lock and tag fitted, and the equipment proved dead. Only remove your lock when everyone is clear, then test run it. Close the work order only when the readings are within limits.',
      },
      {
        title: 'Inspection and the environment',
        body: 'A part conforms only if every feature is within its tolerance. A monitoring result above the site’s permit limit is reported straight away, with the action taken.',
      },
    ],
    glossary: [
      {
        term: 'Ohm’s law',
        meaning: 'V = I × R: voltage equals current times resistance.',
      },
      {
        term: 'Section modulus (Z)',
        meaning: 'How well a beam’s shape resists bending.',
      },
      {
        term: 'Float',
        meaning: 'How long a task can slip without delaying the project.',
      },
      {
        term: 'Lockout-tagout (LOTO)',
        meaning:
          'Isolating equipment and fitting a personal lock and tag so it cannot be restarted while someone works on it.',
      },
      {
        term: 'Tolerance',
        meaning: 'How far a dimension may differ from its nominal size.',
      },
      {
        term: 'Permit limit',
        meaning: 'The most of a substance a site is allowed to release.',
      },
    ],
  },
}
