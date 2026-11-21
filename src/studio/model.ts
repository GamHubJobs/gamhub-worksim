/**
 * The building model of Space Studio: the one saved file that the 2D editor,
 * the 3D view, the walkthrough, the checks, the reviews and the exports all
 * read. Pure data and its schema (no React, no three.js).
 *
 * Lengths are millimetres. On the plan, x runs right and y runs down; in 3D,
 * the plan's y is z and height is y.
 */
import { z } from 'zod'

export const PointSchema = z.object({ x: z.number(), y: z.number() })
export type Point = z.infer<typeof PointSchema>

export const UNITS = ['mm', 'cm', 'm', 'ft-in'] as const
export type Units = (typeof UNITS)[number]

const id = z.string().min(1)

export const FloorSchema = z.object({
  id,
  name: z.string(),
  /** Top of this floor's slab above ground (mm). */
  elevation: z.number(),
  /** Floor to floor (mm): the walls' usual height plus the slab above. */
  height: z.number().positive().default(3000),
  /** Thickness of the slab this floor stands on (mm). */
  slab: z.number().nonnegative().default(200),
})
export type Floor = z.infer<typeof FloorSchema>

export const WALL_TYPES = ['exterior', 'interior', 'partition'] as const
export type WallType = (typeof WALL_TYPES)[number]

export const WallSchema = z.object({
  id,
  floor: id,
  a: PointSchema,
  b: PointSchema,
  thickness: z.number().positive(),
  height: z.number().positive(),
  type: z.enum(WALL_TYPES).default('interior'),
  /** Finish of the face on the left of a → b, and on the right (material IDs). */
  finishLeft: z.string().default('paint-white'),
  finishRight: z.string().default('paint-white'),
})
export type Wall = z.infer<typeof WallSchema>

export const OPENING_KINDS = ['door', 'window', 'pass'] as const
export type OpeningKind = (typeof OPENING_KINDS)[number]

export const OpeningSchema = z.object({
  id,
  wall: id,
  kind: z.enum(OPENING_KINDS),
  /** Distance from the wall's start (a) to the opening's centre (mm). */
  offset: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  /** Height of the bottom above the floor (0 for doors). */
  sill: z.number().nonnegative().default(0),
  /** Which way a door's leaf is hinged, seen from the left face; and which face it opens into. */
  hinge: z.enum(['start', 'end']).default('start'),
  side: z.enum(['left', 'right']).default('left'),
  /** Style: 'single', 'double', 'sliding' for doors; 'casement', 'fixed', 'sash' for windows. */
  style: z.string().default('single'),
  /** The entrance of the building (doors only). */
  entrance: z.boolean().default(false),
})
export type Opening = z.infer<typeof OpeningSchema>

export const ROOM_USES = [
  'living',
  'bedroom',
  'kitchen',
  'dining',
  'bathroom',
  'wc',
  'hall',
  'storage',
  'utility',
  'office',
  'meeting',
  'reception',
  'open-plan',
  'retail',
  'plant',
  'other',
] as const
export type RoomUse = (typeof ROOM_USES)[number]

export const RoomSchema = z.object({
  id,
  floor: id,
  name: z.string(),
  use: z.enum(ROOM_USES).default('other'),
  /** The room's outline on the walls' centre lines, in order. */
  outline: z.array(PointSchema).min(3),
  floorFinish: z.string().default('oak-boards'),
  ceilingFinish: z.string().default('paint-white'),
  ceiling: z.boolean().default(true),
})
export type Room = z.infer<typeof RoomSchema>

export const ItemSchema = z.object({
  id,
  floor: id,
  /** The catalogue entry (see catalog.ts). */
  kind: z.string(),
  x: z.number(),
  y: z.number(),
  /** Degrees, clockwise on the plan. */
  rotation: z.number().default(0),
  /** Overrides of the catalogue's size (mm). */
  width: z.number().positive().optional(),
  depth: z.number().positive().optional(),
  height: z.number().positive().optional(),
  colour: z.string().optional(),
  material: z.string().optional(),
  /** Raised above the floor (wall cabinets, wall lights), mm. */
  elevation: z.number().nonnegative().default(0),
})
export type Item = z.infer<typeof ItemSchema>

export const StairSchema = z.object({
  id,
  floor: id,
  /** The bottom step's centre at its front edge. */
  x: z.number(),
  y: z.number(),
  /** Degrees: 0 climbs towards −y (up the plan). */
  rotation: z.number().default(0),
  width: z.number().positive().default(1000),
  /** Horizontal length of the flight (mm). */
  run: z.number().positive().default(3600),
  /** The floor it arrives at. */
  to: id,
})
export type Stair = z.infer<typeof StairSchema>

export const ColumnSchema = z.object({
  id,
  floor: id,
  x: z.number(),
  y: z.number(),
  size: z.number().positive().default(300),
  round: z.boolean().default(false),
  finish: z.string().default('concrete'),
})
export type Column = z.infer<typeof ColumnSchema>

export const SlabSchema = z.object({
  id,
  floor: id,
  kind: z.enum(['balcony', 'terrace']),
  outline: z.array(PointSchema).min(3),
  railing: z.boolean().default(true),
  finish: z.string().default('stone-paving'),
})
export type Slab = z.infer<typeof SlabSchema>

export const RoofSchema = z.object({
  id,
  /** The floor whose walls it sits on. */
  floor: id,
  kind: z.enum(['flat', 'gable', 'hip']),
  outline: z.array(PointSchema).min(3),
  /** Degrees (pitched roofs). */
  pitch: z.number().min(0).max(60).default(35),
  overhang: z.number().nonnegative().default(300),
  finish: z.string().default('roof-tiles'),
})
export type Roof = z.infer<typeof RoofSchema>

export const LabelSchema = z.object({
  id,
  floor: id,
  x: z.number(),
  y: z.number(),
  text: z.string(),
})
export type Label = z.infer<typeof LabelSchema>

export const DimensionSchema = z.object({
  id,
  floor: id,
  a: PointSchema,
  b: PointSchema,
  /** Drawn this far to the side of the measured line (mm). */
  offset: z.number().default(400),
})
export type Dimension = z.infer<typeof DimensionSchema>

export const SavedViewSchema = z.object({
  id,
  name: z.string(),
  position: z.tuple([z.number(), z.number(), z.number()]),
  target: z.tuple([z.number(), z.number(), z.number()]),
})
export type SavedView = z.infer<typeof SavedViewSchema>

export const StudioStateSchema = z.object({
  version: z.literal(1).default(1),
  project: z.object({
    name: z.string().default('Untitled project'),
    client: z.string().default(''),
    units: z.enum(UNITS).default('mm'),
    /** Grid spacing (mm). */
    grid: z.number().positive().default(100),
    snap: z.boolean().default(true),
    /** The client's budget for furniture and finishes (£), when the brief sets one. */
    budget: z.number().nonnegative().optional(),
    /** Notes for the reviewers (the player's design statement). */
    notes: z.string().default(''),
  }),
  floors: z.array(FloorSchema).min(1),
  walls: z.array(WallSchema).default([]),
  openings: z.array(OpeningSchema).default([]),
  rooms: z.array(RoomSchema).default([]),
  items: z.array(ItemSchema).default([]),
  stairs: z.array(StairSchema).default([]),
  columns: z.array(ColumnSchema).default([]),
  slabs: z.array(SlabSchema).default([]),
  roofs: z.array(RoofSchema).default([]),
  labels: z.array(LabelSchema).default([]),
  dimensions: z.array(DimensionSchema).default([]),
  views: z.array(SavedViewSchema).default([]),
  lighting: z.enum(['day', 'evening', 'night']).default('day'),
})
export type StudioState = z.infer<typeof StudioStateSchema>

/** The collections of things that sit on a floor, by name. */
export const PARTS = [
  'walls',
  'openings',
  'rooms',
  'items',
  'stairs',
  'columns',
  'slabs',
  'roofs',
  'labels',
  'dimensions',
] as const
export type PartKind = (typeof PARTS)[number]

/** A reference to one thing in the model. */
export interface Ref {
  kind: PartKind
  id: string
}

export const sameRef = (a: Ref, b: Ref) => a.kind === b.kind && a.id === b.id

/** A new, empty project with one floor. */
export function emptyProject(name = 'Untitled project'): StudioState {
  return StudioStateSchema.parse({
    project: { name },
    floors: [{ id: 'f0', name: 'Ground floor', elevation: 0, height: 3000, slab: 200 }],
  })
}
