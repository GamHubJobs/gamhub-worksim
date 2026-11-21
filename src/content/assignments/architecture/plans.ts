/**
 * The plans behind the architecture tasks: each task's starting file and its
 * model answer, drawn with the same operations the player uses in Space
 * Studio. Simplified, fictional briefs and prices: for learning.
 */
import { analyse } from '../../../studio/analysis'
import { emptyProject, type Point, type StudioState } from '../../../studio/model'
import {
  addFloor,
  addRoof,
  addStair,
  addWall,
  deleteParts,
  updatePart,
  WALL_PRESETS,
} from '../../../studio/ops'
import { PlanBuilder } from '../../../studio/samples'

/** An empty building: four outside walls, w × d mm, with the front door at `door` on the outline. */
export function shell(
  name: string,
  client: string,
  w: number,
  d: number,
  door: Point,
  doorPreset = 'door-front',
): PlanBuilder {
  let s = emptyProject(name)
  s.project.client = client
  const corners = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: d },
    { x: 0, y: d },
  ]
  for (let i = 0; i < 4; i++)
    s = addWall(s, 'f0', corners[i], corners[(i + 1) % 4], WALL_PRESETS.exterior).state
  return new PlanBuilder(s).opening(doorPreset, door.x, door.y, { entrance: true })
}

const withBudget = (s: StudioState, budget: number): StudioState => ({
  ...s,
  project: { ...s.project, budget },
})

/** A budget a little above what the model answer costs (rounded to £500). */
const budgetFor = (s: StudioState, margin = 1.08) =>
  Math.ceil((analyse(s).costs.total * margin) / 500) * 500

// ---------------------------------------------------------------- 1. two-bedroom flat

export function twoBedStart(): StudioState {
  return shell(
    'Harbour Housing: flat type B',
    'Harbour Housing Association',
    10000,
    8000,
    { x: 10000, y: 4500 },
  ).state
}

function twoBedRooms(b: PlanBuilder): PlanBuilder {
  return b
    .room(0, 0, 4000, 3600, 'Bedroom 1', 'bedroom')
    .room(4000, 0, 7000, 3600, 'Bedroom 2', 'bedroom')
    .room(7000, 0, 10000, 3600, 'Bathroom', 'bathroom')
    .room(0, 3600, 6000, 8000, 'Living room', 'living')
    .room(6000, 3600, 10000, 5400, 'Hall', 'hall')
    .room(6000, 5400, 10000, 8000, 'Kitchen', 'kitchen')
    .opening('door-single', 6400, 3600)
    .opening('door-single', 8500, 3600)
    .opening('door-single', 6000, 4500)
    .opening('door-single', 8000, 5400, { side: 'right' })
    .opening('door-single', 2000, 3600)
    .opening('window-wide', 2000, 0)
    .opening('window-casement', 5500, 0)
    .opening('window-small', 8500, 0)
    .opening('window-casement', 0, 6000)
    .opening('door-sliding', 3000, 8000)
    .opening('window-casement', 8000, 8000)
}

export function twoBedSolution(): StudioState {
  const b = twoBedRooms(new PlanBuilder(twoBedStart()))
    .item('bed-double', 2000, 1300)
    .item('bedside', 900, 500)
    .item('wardrobe', 3200, 3150, 180)
    .item('bed-single', 5000, 1300)
    .item('chest', 6300, 3200, 180)
    .item('bath', 8500, 600)
    .item('wc', 9500, 2300, 270)
    .item('basin', 7400, 2300, 90)
    .item('sofa-3', 2500, 7300, 180)
    .item('armchair', 800, 5600, 90)
    .item('coffee-table', 2500, 6300)
    .item('hob-unit', 7000, 7500, 180)
    .item('sink-unit', 8000, 7500, 180)
    .item('fridge', 9500, 7475, 180)
    .item('dining-table-4', 7800, 6300)
  return b.state
}

// ---------------------------------------------------------------- 2. furnish an office

function officeShell(): PlanBuilder {
  return shell(
    'Lumen Analytics: new office',
    'Lumen Analytics',
    14000,
    9000,
    { x: 5000, y: 9000 },
    'door-double',
  )
    .room(0, 0, 10000, 9000, 'Open-plan office', 'open-plan')
    .room(10000, 0, 14000, 5000, 'Meeting room', 'meeting')
    .room(10000, 5000, 14000, 9000, 'Tea point', 'kitchen')
    .opening('door-single', 10000, 2500, { side: 'right' })
    .opening('door-single', 10000, 7000)
    .opening('window-wide', 2500, 0)
    .opening('window-wide', 7500, 0)
    .opening('window-wide', 12000, 0)
    .opening('window-casement', 14000, 7000)
}

function officeFurniture(b: PlanBuilder): PlanBuilder {
  for (const x of [1500, 3500, 5500, 7500]) {
    b.item('workstation', x, 2000).item('office-chair', x, 2700, 180)
    b.item('workstation', x, 5500, 180).item('office-chair', x, 4800)
  }
  b.item('meeting-table', 12000, 2500)
  for (const x of [11300, 12000, 12700])
    b.item('office-chair', x, 1750).item('office-chair', x, 3250, 180)
  return b
    .item('ceiling-light', 3000, 3700)
    .item('ceiling-light', 7000, 3700)
    .item('ceiling-light', 12000, 2500)
    .item('plant-large', 9400, 600)
    .item('sink-unit', 12000, 8400, 180)
    .item('fridge', 13300, 8375, 180)
}

export const OFFICE_BUDGET = budgetFor(officeFurniture(officeShell()).state)

export function officeStart(): StudioState {
  return withBudget(officeShell().state, OFFICE_BUDGET)
}
export function officeSolution(): StudioState {
  return withBudget(officeFurniture(officeShell()).state, OFFICE_BUDGET)
}

// ---------------------------------------------------------------- 3. reception redesign

function receptionBase(): PlanBuilder {
  const b = shell(
    'Brightsmile Dental: reception',
    'Brightsmile Dental Practice',
    8000,
    6000,
    { x: 4000, y: 6000 },
    'door-single',
  )
    .room(0, 0, 8000, 6000, 'Reception', 'reception')
    .opening('door-single', 6500, 0)
    .opening('window-wide', 0, 3000)
    .opening('window-wide', 8000, 3000)
  return b
}

export function receptionStart(): StudioState {
  const b = receptionBase()
  let s = b.state
  // The doors as they are: 762 mm leaves, and both swing into the room.
  for (const o of s.openings.filter((x) => x.kind === 'door'))
    s = updatePart(s, 'openings', o.id, {
      width: 762,
      side: o.entrance ? 'right' : 'left',
    })
  const room = s.rooms[0]
  s = updatePart(s, 'rooms', room.id, { floorFinish: 'carpet-grey' })
  return new PlanBuilder(s)
    .item('reception-desk', 4000, 5100) // right in the entrance door's swing
    .item('office-chair', 4000, 4500, 180)
    .item('lounge-chair', 1200, 1500)
    .item(
      'lounge-chair',
      1400,
      1600,
    ) // on top of the first
  .state
}

export function receptionSolution(): StudioState {
  let s = receptionBase().state
  // Accessible doors (926 mm leaves), opening inwards where they are clear.
  for (const o of s.openings.filter((x) => x.kind === 'door'))
    s = updatePart(s, 'openings', o.id, { width: 926 })
  s = updatePart(s, 'rooms', s.rooms[0].id, { floorFinish: 'terrazzo' })
  return new PlanBuilder(s)
    .item('reception-desk', 5800, 2600, 270)
    .item('office-chair', 6600, 2600, 90)
    .item('waiting-bench', 1300, 1800, 90)
    .item('lounge-chair', 800, 4300, 90)
    .item('lounge-chair', 2000, 4900)
    .item('lounge-chair', 3000, 1000, 180)
    .item('coffee-table', 2400, 2900, 90)
    .item('plant-large', 7400, 5300)
    .item('plant-small', 2400, 2900).state
}

// ---------------------------------------------------------------- 4. optimise a tight office

function tightShell(): PlanBuilder {
  return shell(
    'Northgate Lettings: office',
    'Northgate Lettings',
    9000,
    7000,
    { x: 4500, y: 7000 },
    'door-single',
  )
    .room(0, 0, 9000, 7000, 'Office', 'open-plan')
    .opening('window-wide', 2200, 0)
    .opening('window-wide', 6800, 0)
}

export function tightStart(): StudioState {
  const b = tightShell()
  let s = b.state
  const door = s.openings.find((o) => o.entrance)!
  s = updatePart(s, 'openings', door.id, { side: 'right' }) // swings in
  const p = new PlanBuilder(s)
  // Twelve desks squeezed in, overlapping, one in the door's way.
  for (let i = 0; i < 6; i++)
    p.item('workstation', 1000 + i * 1400, 1200).item(
      'office-chair',
      1000 + i * 1400,
      1900,
      180,
    )
  for (let i = 0; i < 5; i++)
    p.item('workstation', 1000 + i * 1400, 3800, 180).item(
      'office-chair',
      1000 + i * 1400,
      3100,
    )
  p.item('workstation', 4500, 6200)
  return p.state
}

export function tightSolution(): StudioState {
  const s = tightShell().state
  const p = new PlanBuilder(s)
  for (const x of [1000, 2700, 4400, 6100, 7800]) {
    p.item('workstation', x, 1200).item('office-chair', x, 1950, 180)
    p.item('workstation', x, 4600, 180).item('office-chair', x, 3850)
  }
  return p.state
}

// ---------------------------------------------------------------- 5. corrections

export function correctionsStart(): StudioState {
  let s = twoBedSolution()
  s = {
    ...s,
    project: { ...s.project, name: 'Harbour Housing: flat type B (for checking)' },
  }
  // Bedroom 2 lost its door and its window; the bathroom has an oak floor.
  const door = s.openings.find((o) => o.kind === 'door' && Math.abs(o.offset - 600) < 1)
  const bedWindow = s.openings.find(
    (o) =>
      o.kind === 'window' &&
      o.style === 'casement' &&
      sameWallY(s, o.wall, 0) &&
      Math.abs(o.offset - 5500) < 1,
  )
  s = deleteParts(
    s,
    [door, bedWindow]
      .filter(Boolean)
      .map((o) => ({ kind: 'openings' as const, id: o!.id })),
  )
  const bath = s.rooms.find((r) => r.use === 'bathroom')!
  return updatePart(s, 'rooms', bath.id, { floorFinish: 'oak-boards' })
}

function sameWallY(s: StudioState, wallId: string, y: number) {
  const w = s.walls.find((x) => x.id === wallId)
  return !!w && w.a.y === y && w.b.y === y
}

export function correctionsSolution(): StudioState {
  let s = twoBedSolution()
  s = {
    ...s,
    project: { ...s.project, name: 'Harbour Housing: flat type B (for checking)' },
  }
  const bath = s.rooms.find((r) => r.use === 'bathroom')!
  return updatePart(s, 'rooms', bath.id, { floorFinish: 'white-tiles' })
}

// ---------------------------------------------------------------- 6. a small commercial building

export function commercialStart(): StudioState {
  return shell(
    'Market Street: shop unit',
    'Fernhill Bakery',
    15000,
    10000,
    { x: 5000, y: 10000 },
    'door-double',
  ).state
}

export function commercialSolution(): StudioState {
  return new PlanBuilder(commercialStart())
    .room(0, 0, 10000, 10000, 'Shop floor', 'retail')
    .room(10000, 0, 15000, 4000, 'Office', 'office')
    .room(10000, 4000, 15000, 7000, 'Store', 'storage')
    .room(10000, 7000, 12500, 10000, 'Accessible WC', 'wc')
    .opening('door-single', 10000, 2000)
    .opening('door-single', 10000, 5500)
    .opening('door-wide', 10000, 8500)
    .opening('window-casement', 12500, 0)
    .opening('window-full', 2500, 10000)
    .opening('window-full', 7500, 10000)
    .item('shelving', 1000, 2000, 90)
    .item('shelving', 1000, 4000, 90)
    .item('reception-desk', 5000, 2500, 180)
    .item('desk', 12500, 1500)
    .item('office-chair', 12500, 2200, 180).state
}

// ---------------------------------------------------------------- 7. a second storey

function groundFloor(): PlanBuilder {
  return shell('Orchard Close: family house', 'The Okafor family', 9000, 8000, {
    x: 7200,
    y: 8000,
  })
    .room(0, 0, 5500, 5000, 'Living room', 'living')
    .room(0, 5000, 5500, 8000, 'Kitchen', 'kitchen')
    .room(5500, 0, 9000, 8000, 'Hall', 'hall')
    .opening('door-single', 5500, 2500)
    .opening('door-single', 5500, 6500)
    .opening('window-wide', 2700, 0)
    .opening('window-casement', 0, 6500)
}

export function storeyStart(): StudioState {
  return groundFloor().state
}

export function storeySolution(): StudioState {
  const up = addFloor(groundFloor().state, { copyWalls: true })
  let s = addStair(up.state, 'f0', 6400, 7000, 0).state
  const b = new PlanBuilder(s, up.id)
    .room(0, 0, 5500, 3000, 'Bedroom 1', 'bedroom')
    .room(0, 3000, 5500, 5500, 'Bedroom 2', 'bedroom')
    .room(0, 5500, 2500, 8000, 'Bathroom', 'bathroom')
    .room(2500, 5500, 5500, 8000, 'Bedroom 3', 'bedroom')
    .room(5500, 0, 9000, 8000, 'Landing', 'hall')
    .opening('door-single', 5500, 1500)
    .opening('door-single', 5500, 4250)
    .opening('door-single', 5500, 6750)
    .opening('door-single', 1250, 5500)
    .opening('window-wide', 2700, 0)
    .opening('window-casement', 0, 4250)
    .opening('window-casement', 4000, 8000)
    .opening('window-small', 1250, 8000)
  s = addRoof(b.state, up.id, 'gable').state
  return s
}

// ---------------------------------------------------------------- 8. interior proposal

const PROPOSAL_NOTE =
  'A calm, durable scheme for a young family. The living room is organised round a three-seat sofa and two armchairs, so four people can sit together, with the dining table close to the kitchen. Wet rooms are finished in tiles and porcelain that stand up to water, and the bedrooms keep warm oak boards. Walls stay warm white so the rooms feel bright, and every habitable room keeps its window. Storage is built into each bedroom, and the layout leaves at least 600 mm to walk round every piece of furniture. The furniture and finishes come in under the agreed budget.'

function proposalBase(): StudioState {
  const s = twoBedSolution()
  return {
    ...s,
    project: {
      ...s.project,
      name: 'Harbour Housing: show flat interior',
      client: 'Harbour Housing Association',
    },
  }
}

function proposalDone(): StudioState {
  let s = proposalBase()
  const bath = s.rooms.find((r) => r.use === 'bathroom')!
  const kitchen = s.rooms.find((r) => r.use === 'kitchen')!
  s = updatePart(s, 'rooms', bath.id, { floorFinish: 'white-tiles' })
  s = updatePart(s, 'rooms', kitchen.id, { floorFinish: 'porcelain-grey' })
  s = new PlanBuilder(s).item('armchair', 800, 4600, 90).state
  return { ...s, project: { ...s.project, notes: PROPOSAL_NOTE } }
}

export const PROPOSAL_BUDGET = budgetFor(proposalDone())

export function proposalStart(): StudioState {
  let s = proposalBase()
  const bath = s.rooms.find((r) => r.use === 'bathroom')!
  const kitchen = s.rooms.find((r) => r.use === 'kitchen')!
  s = updatePart(s, 'rooms', bath.id, { floorFinish: 'carpet-grey' })
  s = updatePart(s, 'rooms', kitchen.id, { floorFinish: 'oak-boards' })
  // The living room seats four today only if the sofa's three count: take it out.
  const sofa = s.items.find((i) => i.kind === 'sofa-3')!
  s = deleteParts(s, [{ kind: 'items', id: sofa.id }])
  s = new PlanBuilder(s).item('armchair', 2500, 7300, 180).state
  return withBudget(s, PROPOSAL_BUDGET)
}

export function proposalSolution(): StudioState {
  return withBudget(proposalDone(), PROPOSAL_BUDGET)
}

// ---------------------------------------------------------------- 9. within budget

function fitOutShell(): PlanBuilder {
  return shell(
    'Kite & Co: studio fit-out',
    'Kite & Co Architects',
    12000,
    8000,
    { x: 4000, y: 8000 },
    'door-double',
  )
    .room(0, 0, 8000, 8000, 'Studio', 'open-plan')
    .room(8000, 0, 12000, 8000, 'Meeting room', 'meeting')
    .opening('door-single', 8000, 4000)
    .opening('window-wide', 2000, 0)
    .opening('window-wide', 6000, 0)
    .opening('window-wide', 10000, 0)
}

function fitOutEssentials(b: PlanBuilder): PlanBuilder {
  for (const x of [1300, 3300, 5300]) {
    b.item('desk', x, 1500).item('office-chair', x, 2150, 180)
    b.item('desk', x, 4500, 180).item('office-chair', x, 3850)
  }
  b.item('round-table', 10000, 2500)
  for (const [x, y, r] of [
    [10000, 1650, 0],
    [10000, 3350, 180],
    [9150, 2500, 270],
    [10850, 2500, 90],
  ] as const)
    b.item('dining-chair', x, y, r)
  return b.item('ceiling-light', 4000, 3000).item('ceiling-light', 10000, 2500)
}

export const FITOUT_BUDGET = budgetFor(fitOutEssentials(fitOutShell()).state, 1.1)

export function fitOutStart(): StudioState {
  const b = fitOutShell()
  for (const x of [1300, 3300, 5300]) {
    b.item('workstation', x, 1500).item('office-chair', x, 2200, 180)
    b.item('workstation', x, 4500, 180).item('office-chair', x, 3800)
  }
  b.item('meeting-table', 10000, 2500, 90)
  for (const y of [1600, 2500, 3400])
    b.item('office-chair', 9300, y, 270).item('office-chair', 10700, y, 90)
  b.item('display-screen', 10000, 7900, 180)
    .item('piano', 10000, 6200)
    .item('reception-desk', 4000, 6700)
    .item('lounge-chair', 1200, 6800)
    .item('lounge-chair', 6800, 6800)
  return withBudget(b.state, FITOUT_BUDGET)
}

export function fitOutSolution(): StudioState {
  return withBudget(fitOutEssentials(fitOutShell()).state, FITOUT_BUDGET)
}
