/**
 * Designs used by the tests (and the browser tests' set-up): the briefs'
 * concepts with their faults put right, as a careful engineer would.
 */
import { getBrief } from './briefs'
import type { BridgeDesign, BuildingDesign } from './design'

/** The yard store: a forklift door, three windows, a heavier beam, wider and deeper footings. */
export function correctedYardStore(): BuildingDesign {
  const concept = getBrief('yard-store')!.concept as BuildingDesign
  return {
    ...concept,
    openings: [
      {
        id: 'D1',
        kind: 'door',
        wall: 0,
        offset: 4000,
        width: 3000,
        height: 3000,
        sill: 0,
        storey: 0,
      },
      {
        id: 'W1',
        kind: 'window',
        wall: 2,
        offset: 6000,
        width: 1200,
        height: 1050,
        sill: 1200,
        storey: 0,
      },
      {
        id: 'W2',
        kind: 'window',
        wall: 2,
        offset: 9500,
        width: 1200,
        height: 1050,
        sill: 1200,
        storey: 0,
      },
      {
        id: 'W3',
        kind: 'window',
        wall: 1,
        offset: 4000,
        width: 1200,
        height: 1050,
        sill: 1200,
        storey: 0,
      },
    ],
    beam: { section: 'NB-300' },
    foundation: { type: 'strip', width: 600, depth: 750 },
  }
}

/** The footbridge: wide enough for cyclists, three girders, a proper parapet. */
export function correctedFootbridge(): BridgeDesign {
  const concept = getBrief('mill-footbridge')!.concept as BridgeDesign
  return {
    ...concept,
    width: 2000,
    girders: { count: 3, section: 'NB-500' },
    parapet: { height: 1200 },
  }
}

/** The workshop and offices: a column line, enough circuits, washrooms and heating. */
export function correctedWorkshop(): BuildingDesign {
  const concept = getBrief('workshop-office')!.concept as BuildingDesign
  return {
    ...concept,
    columns: [
      { id: 'C1', x: 4500, y: 5000, section: 'NB-200' },
      { id: 'C2', x: 9000, y: 5000, section: 'NB-200' },
      { id: 'C3', x: 13500, y: 5000, section: 'NB-200' },
    ],
    services: { circuits: 8, sanitary: 4, hvac: 4 },
  }
}
