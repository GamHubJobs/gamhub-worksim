/**
 * Works Desk practice data: Northbank Engineering Ltd, a fictional
 * multi-discipline engineering firm. The section catalogue, permit limits
 * and allowable stress are simplified and fictional, for learning only.
 */
import type { EngineeringState } from './schema'

export const FIRM = 'Northbank Engineering Ltd'

/** Standard resistor values (the E12 series, one decade, times powers of ten). */
export const E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2]
export const RESISTOR_VALUES = [10, 100, 1000, 10000].flatMap((d) =>
  E12.map((v) => Math.round(v * d)),
)
export const POWER_RATINGS = [0.125, 0.25, 0.5, 1, 2]

/**
 * Steel beam sections (fictional catalogue): elastic section modulus Z (cm³)
 * and mass (kg/m). The allowable bending stress already includes the
 * (simplified) safety factor.
 */
export const SECTIONS: Array<{ id: string; z: number; mass: number }> = [
  { id: 'NB-100', z: 50, mass: 9 },
  { id: 'NB-150', z: 110, mass: 15 },
  { id: 'NB-200', z: 190, mass: 22 },
  { id: 'NB-250', z: 310, mass: 31 },
  { id: 'NB-300', z: 480, mass: 42 },
]
export const ALLOWABLE_STRESS = 165 // N/mm², simplified, includes the safety factor

export function sampleEngineering(): EngineeringState {
  return {
    firm: FIRM,
    user: { name: 'You', role: 'Graduate engineer' },
    circuits: [
      {
        id: 'C-1',
        title: 'Panel indicator lamp',
        supply: 12,
        components: [
          { id: 'r1', kind: 'resistor', value: 100, rating: 0.125 },
          { id: 'led1', kind: 'led', value: 2.0, rating: 0.03 },
        ],
        fuse: null,
        brief:
          'A green LED (2.0 V, 30 mA maximum) on the 12 V panel supply. Aim for about 20 mA, and never more than 30 mA.',
      },
    ],
    beams: [
      {
        id: 'B-1',
        title: 'Mezzanine floor beam',
        span: 6,
        load: 20,
        section: null,
      },
    ],
    gears: [
      {
        id: 'G-1',
        title: 'Conveyor drive',
        inputRpm: 1450,
        targetRpm: 290,
        stages: [[20, 40]],
      },
    ],
    plans: [
      {
        id: 'P-1',
        title: 'Warehouse mezzanine: installation plan',
        tasks: [
          { id: 'A', name: 'Design and approval', days: 5, after: [] },
          { id: 'B', name: 'Order and deliver steel', days: 10, after: ['A'] },
          { id: 'C', name: 'Prepare the floor area', days: 3, after: ['A'] },
          { id: 'D', name: 'Pour the column foundations', days: 6, after: ['C'] },
          { id: 'E', name: 'Erect the steelwork', days: 7, after: ['B', 'D'] },
          { id: 'F', name: 'Inspect and hand over', days: 2, after: ['E'] },
        ],
        critical: [],
      },
    ],
    workOrders: [
      {
        id: 'WO-311',
        equipment: 'Conveyor 3 drive motor',
        fault: 'The motor bearing is running hot (95 °C) and noisy. Replace the bearing.',
        status: 'open',
        steps: [],
        reading: null,
        limit: 80,
        note: '',
      },
    ],
    drawings: [
      {
        id: 'DW-12',
        title: 'Drive shaft, drawing DW-12 rev B',
        features: [
          { id: 'length', name: 'Overall length', nominal: 120, tolerance: 0.5 },
          { id: 'dia', name: 'Bearing diameter', nominal: 25, tolerance: 0.05 },
          { id: 'key', name: 'Keyway width', nominal: 8, tolerance: 0.03 },
        ],
        parts: [
          {
            id: 'S-01',
            measured: { length: 120.1, dia: 25.02, key: 8.01 },
            decision: null,
          },
          {
            id: 'S-02',
            measured: { length: 119.8, dia: 25.08, key: 8.0 },
            decision: null,
          },
          {
            id: 'S-03',
            measured: { length: 120.4, dia: 24.97, key: 7.98 },
            decision: null,
          },
          {
            id: 'S-04',
            measured: { length: 120.0, dia: 25.0, key: 8.05 },
            decision: null,
          },
        ],
      },
    ],
    samples: [
      {
        id: 'E-1',
        point: 'Discharge to the river',
        substance: 'Suspended solids',
        value: 42,
        unit: 'mg/L',
        limit: 30,
        flagged: false,
        action: '',
      },
      {
        id: 'E-2',
        point: 'Discharge to the river',
        substance: 'Ammonia',
        value: 3.1,
        unit: 'mg/L',
        limit: 5,
        flagged: false,
        action: '',
      },
      {
        id: 'E-3',
        point: 'Discharge to the river',
        substance: 'Oil and grease',
        value: 12.5,
        unit: 'mg/L',
        limit: 10,
        flagged: false,
        action: '',
      },
      {
        id: 'E-4',
        point: 'Boiler stack',
        substance: 'Nitrogen oxides',
        value: 180,
        unit: 'mg/m³',
        limit: 200,
        flagged: false,
        action: '',
      },
    ],
    audit: [],
  }
}
