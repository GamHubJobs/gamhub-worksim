/**
 * Works Desk: an engineering firm's technical tools in one console, one
 * section per discipline: circuits (electrical), beams (structural),
 * gear trains (mechanical), project planning and maintenance (industrial),
 * part inspection (quality) and environmental monitoring.
 *
 * SIMULATION FOR LEARNING. The formulas are the standard textbook ones, but
 * the catalogues, limits and safety factors are simplified and fictional.
 * Real engineering work needs the applicable codes and a competent,
 * qualified engineer.
 */
import { z } from 'zod'

const Id = z.string().min(1).max(40)

export const ComponentSchema = z.object({
  id: Id,
  kind: z.enum(['resistor', 'led']),
  /** Ohms for a resistor; forward voltage (V) for an LED. */
  value: z.number().min(0).max(1_000_000),
  /** Resistor power rating (W); LED maximum current (A). */
  rating: z.number().min(0).max(100),
})

export const CircuitSchema = z.object({
  id: Id,
  title: z.string().max(100),
  /** Supply voltage (V). */
  supply: z.number().min(0).max(1000),
  /** In series, in order. */
  components: z.array(ComponentSchema).max(12),
  /** The fuse fitted (A), or null. */
  fuse: z.number().min(0).max(100).nullable().default(null),
  /** What the circuit must do (e.g. target LED current). */
  brief: z.string().max(300).default(''),
})

export const BeamSchema = z.object({
  id: Id,
  title: z.string().max(100),
  /** Span (m), simply supported. */
  span: z.number().min(0.5).max(30),
  /** Point load at mid-span (kN). */
  load: z.number().min(0).max(1000),
  /** The section chosen (catalogue ID), or null. */
  section: z.string().max(20).nullable().default(null),
})

export const GearTrainSchema = z.object({
  id: Id,
  title: z.string().max(100),
  /** Motor speed (rpm). */
  inputRpm: z.number().min(1).max(20000),
  /** Required output speed (rpm). */
  targetRpm: z.number().min(0.1).max(20000),
  /** Pairs of (driver teeth, driven teeth). */
  stages: z
    .array(z.tuple([z.number().int().min(8).max(200), z.number().int().min(8).max(200)]))
    .max(4),
})

export const PlanTaskSchema = z.object({
  id: Id,
  name: z.string().max(80),
  days: z.number().int().min(1).max(200),
  after: z.array(Id).max(6).default([]),
})

export const PlanSchema = z.object({
  id: Id,
  title: z.string().max(100),
  tasks: z.array(PlanTaskSchema).max(20),
  /** Tasks the player marked as on the critical path. */
  critical: z.array(Id).max(20).default([]),
})

export const WorkOrderSchema = z.object({
  id: Id,
  equipment: z.string().max(80),
  fault: z.string().max(300),
  status: z.enum(['open', 'isolated', 'in-progress', 'tested', 'closed']),
  /** The safety steps done, in order. */
  steps: z
    .array(
      z.enum([
        'permit',
        'isolate',
        'lock',
        'test-dead',
        'repair',
        'remove-locks',
        'test-run',
      ]),
    )
    .default([]),
  /** The reading after the repair (e.g. bearing temperature, °C). */
  reading: z.number().nullable().default(null),
  limit: z.number(),
  note: z.string().max(400).default(''),
})

export const PartSchema = z.object({
  id: Id,
  /** Measured values, by feature ID (mm). */
  measured: z.record(z.string(), z.number()),
  decision: z.enum(['accept', 'reject']).nullable().default(null),
})

export const DrawingSchema = z.object({
  id: Id,
  title: z.string().max(100),
  features: z
    .array(
      z.object({
        id: Id,
        name: z.string().max(60),
        nominal: z.number(),
        tolerance: z.number().min(0),
      }),
    )
    .max(10),
  parts: z.array(PartSchema).max(30),
})

export const SampleSchema = z.object({
  id: Id,
  point: z.string().max(60),
  substance: z.string().max(40),
  value: z.number(),
  unit: z.string().max(20),
  /** The permit limit (fictional). */
  limit: z.number(),
  flagged: z.boolean().default(false),
  action: z.string().max(300).default(''),
})

export const EngineeringStateSchema = z.object({
  firm: z.string().max(80),
  user: z.object({ name: z.string().max(60), role: z.string().max(60) }),
  circuits: z.array(CircuitSchema).max(10).default([]),
  beams: z.array(BeamSchema).max(10).default([]),
  gears: z.array(GearTrainSchema).max(10).default([]),
  plans: z.array(PlanSchema).max(5).default([]),
  workOrders: z.array(WorkOrderSchema).max(30).default([]),
  drawings: z.array(DrawingSchema).max(5).default([]),
  samples: z.array(SampleSchema).max(50).default([]),
  audit: z
    .array(
      z.object({ action: z.string().max(80), detail: z.string().max(300).default('') }),
    )
    .max(1000)
    .default([]),
})

export type Component = z.infer<typeof ComponentSchema>
export type Circuit = z.infer<typeof CircuitSchema>
export type Beam = z.infer<typeof BeamSchema>
export type GearTrain = z.infer<typeof GearTrainSchema>
export type Plan = z.infer<typeof PlanSchema>
export type WorkOrder = z.infer<typeof WorkOrderSchema>
export type Drawing = z.infer<typeof DrawingSchema>
export type EngineeringState = z.infer<typeof EngineeringStateSchema>
export type SafetyStep = WorkOrder['steps'][number]
