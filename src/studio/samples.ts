/**
 * Starting projects: built with the same operations the editor uses, so they
 * are ordinary projects in every way.
 */
import { catalogEntry, OPENING_PRESETS } from './catalog'
import { emptyProject, type Point, type RoomUse, type StudioState } from './model'
import {
  addFloor,
  addItem,
  addOpening,
  addRectRoom,
  addRoof,
  addStair,
  WALL_PRESETS,
  type WallStyle,
} from './ops'
import { projectOnSegment } from './geometry'

const preset = (id: string) => OPENING_PRESETS.find((p) => p.id === id)!

/** Helpers to write a plan in a few lines. */
export class PlanBuilder {
  state: StudioState
  floor: string
  constructor(state: StudioState, floor = state.floors[0].id) {
    this.state = state
    this.floor = floor
  }
  room(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    name: string,
    use: RoomUse,
    walls: WallStyle = WALL_PRESETS.interior,
  ) {
    this.state = addRectRoom(
      this.state,
      this.floor,
      { x: x0, y: y0 },
      { x: x1, y: y1 },
      { name, use, walls },
    ).state
    return this
  }
  /** An opening on the wall passing through point (x, y), centred there. */
  opening(
    presetId: string,
    x: number,
    y: number,
    patch: Partial<StudioState['openings'][number]> = {},
  ) {
    const p: Point = { x, y }
    const wall = this.state.walls
      .filter((w) => w.floor === this.floor)
      .map((w) => ({ w, proj: projectOnSegment(p, w.a, w.b) }))
      .filter((c) => c.proj.distance < 5)
      .sort((a, b) => a.proj.distance - b.proj.distance)[0]
    if (!wall) throw new Error(`No wall at ${x}, ${y}`)
    const r = addOpening(this.state, wall.w.id, wall.proj.along, preset(presetId))
    if (r.error || !r.id) throw new Error(`${presetId} at ${x}, ${y}: ${r.error}`)
    this.state = {
      ...r.state,
      openings: r.state.openings.map((o) => (o.id === r.id ? { ...o, ...patch } : o)),
    }
    return this
  }
  item(kind: string, x: number, y: number, rotation = 0) {
    if (!catalogEntry(kind)) throw new Error(`Unknown item ${kind}`)
    this.state = addItem(this.state, this.floor, kind, x, y, rotation).state
    return this
  }
}

/** The practice file: a furnished two-bedroom flat to explore. */
export function sampleApartment(): StudioState {
  const s = emptyProject('Practice flat, Larkfield Road')
  s.project.client = 'Practice'
  s.project.notes =
    'A two-bedroom flat: open living and kitchen to the south, bedrooms to the north.'
  const ext = WALL_PRESETS.exterior
  const b = new PlanBuilder(s)
    .room(0, 0, 4200, 3600, 'Bedroom 1', 'bedroom', ext)
    .room(4200, 0, 7200, 3600, 'Bedroom 2', 'bedroom', ext)
    .room(7200, 0, 9600, 3600, 'Bathroom', 'bathroom', ext)
    .room(0, 3600, 6000, 8400, 'Living and kitchen', 'living', ext)
    .room(6000, 3600, 9600, 8400, 'Hall', 'hall', ext)
  b.opening('door-front', 7800, 8400, { entrance: true, side: 'right' })
    .opening('door-single', 6000, 6600)
    .opening('door-single', 2400, 3600, { side: 'right' })
    .opening('door-single', 5400, 3600, { side: 'right' })
    .opening('door-single', 8400, 3600, { side: 'right' })
    .opening('window-wide', 2100, 0)
    .opening('window-casement', 5700, 0)
    .opening('window-small', 8400, 0)
    .opening('door-sliding', 3000, 8400)
    .opening('window-casement', 0, 6000)
    .item('bed-double', 2100, 1400)
    .item('bedside', 1050, 500)
    .item('bedside', 3150, 500)
    .item('wardrobe', 3500, 3150, 180)
    .item('bed-single', 5700, 1500)
    .item('desk', 6500, 3150, 180)
    .item('bath', 8400, 650)
    .item('wc', 9150, 2200, 270)
    .item('basin', 7550, 2200, 90)
    .item('sofa-3', 2400, 7100, 180)
    .item('coffee-table', 2400, 6300)
    .item('rug', 2400, 6300)
    .item('tv-unit', 2400, 4100)
    .item('armchair', 900, 5600, 90)
    .item('dining-table-4', 4700, 7300)
    .item('dining-chair', 4400, 7900, 180)
    .item('dining-chair', 5000, 7900, 180)
    .item('dining-chair', 4400, 6700)
    .item('dining-chair', 5000, 6700)
    .item('base-unit', 5600, 4050, 0)
    .item('sink-unit', 4800, 4050, 0)
    .item('hob-unit', 4000, 4050, 0)
    .item('fridge', 3300, 4080, 0)
    .item('plant-large', 500, 7900)
    .item('ceiling-light', 2100, 1800)
    .item('ceiling-light', 5700, 1800)
    .item('ceiling-light', 8400, 1800)
    .item('pendant', 2400, 6000)
    .item('ceiling-light', 7800, 6000)
    .item('coat-rack', 9200, 7900)
  let state = b.state
  state = addRoof(state, 'f0', 'flat').state
  return state
}

/** A small two-storey house, to show floors and stairs. */
export function sampleHouse(): StudioState {
  const s = emptyProject('Two-storey house')
  const ext = WALL_PRESETS.exterior
  const ground = new PlanBuilder(s)
    .room(0, 0, 6000, 4500, 'Living room', 'living', ext)
    .room(0, 4500, 3600, 8000, 'Kitchen', 'kitchen', ext)
    .room(3600, 4500, 6000, 8000, 'Hall', 'hall', ext)
    .opening('door-front', 4800, 8000, { entrance: true, side: 'right' })
    .opening('door-single', 3600, 6200)
    .opening('door-wide', 4800, 4500, { side: 'right' })
    .opening('window-wide', 3000, 0)
    .opening('window-casement', 0, 6200)
  let state = ground.state
  const up = addFloor(state, { copyWalls: true })
  state = up.state
  state = addStair(state, 'f0', 5400, 7700, 0).state
  const upper = new PlanBuilder(state, up.id)
  // The outside walls were copied up; add the rooms inside them.
  upper.state = addRectRoom(
    upper.state,
    up.id,
    { x: 0, y: 0 },
    { x: 6000, y: 4500 },
    { name: 'Bedroom', use: 'bedroom', walls: WALL_PRESETS.interior },
  ).state
  upper.state = addRectRoom(
    upper.state,
    up.id,
    { x: 0, y: 4500 },
    { x: 3600, y: 8000 },
    { name: 'Bathroom', use: 'bathroom', walls: WALL_PRESETS.interior },
  ).state
  upper.state = addRectRoom(
    upper.state,
    up.id,
    { x: 3600, y: 4500 },
    { x: 6000, y: 8000 },
    { name: 'Landing', use: 'hall', walls: WALL_PRESETS.interior },
  ).state
  upper
    .opening('door-single', 3600, 6200)
    .opening('door-single', 2400, 4500, { side: 'right' })
    .opening('window-wide', 3000, 0)
  state = addRoof(upper.state, up.id, 'gable').state
  return state
}
