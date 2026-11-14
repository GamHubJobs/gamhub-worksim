/**
 * The engineering firm's workshop (the engineering career): where the IT
 * corner is in the office, Northbank has a small workshop. A test bench for
 * circuits, a locked-out pump, a test beam on trestles and the CAD station,
 * what is solid, and what the player can do there. Drawn in workshop.tsx.
 */
import type { Box as Solid } from '../../world/character/controller'
import type { Activity } from '../../world/interaction/activity'

export const TEST_BENCH = { x: 11.25, z: 2.6 }
export const CAD_DESK = { x: 11.3, z: 7.3 }
export const BEAM_RIG = { x: 7.8, z: 6.9 }
export const PUMP = { x: 7.2, z: 2.2 }
/** The safety equipment board, on the glass wall at the workshop's entrance. */
export const PPE_BOARD = { x: 9.6, z: -0.88 }

/** What the player cannot walk through in the workshop. */
export const WORKSHOP_BOXES: Solid[] = [
  { x: TEST_BENCH.x, z: TEST_BENCH.z, hx: 0.45, hz: 1.1, top: 0.95 },
  { x: CAD_DESK.x, z: CAD_DESK.z, hx: 0.45, hz: 0.9, top: 0.78 },
  { x: BEAM_RIG.x, z: BEAM_RIG.z, hx: 1.7, hz: 0.32, top: 1.0 },
  { x: PUMP.x, z: PUMP.z, hx: 0.65, hz: 0.42, top: 0.9 },
]

/** At the bench, the beam and the CAD station: each opens Works Desk there. */
export function workshopActivities(): Activity[] {
  return [
    {
      id: 'test-bench',
      action: 'bay',
      prompt: 'test the circuit at the bench (Works Desk)',
      spot: { x: TEST_BENCH.x - 0.85, z: TEST_BENCH.z, reach: 1.2 },
      anchor: { x: TEST_BENCH.x - 0.85, z: TEST_BENCH.z, heading: -Math.PI / 2 },
      stages: [
        { clip: 'reach', seconds: 1.0, label: 'Putting on your safety glasses' },
        {
          clip: 'reach',
          seconds: 1.2,
          label: 'Checking the supply is isolated: tested dead before you touch it',
        },
      ],
    },
    {
      id: 'beam-rig',
      action: 'bay',
      prompt: 'inspect the test beam (Works Desk: structures)',
      spot: { x: BEAM_RIG.x, z: BEAM_RIG.z - 0.8, reach: 1.2 },
      anchor: { x: BEAM_RIG.x, z: BEAM_RIG.z - 0.72, heading: 0 },
      stages: [
        {
          clip: 'present',
          seconds: 1.2,
          label: 'Reading the span and the load off the label',
        },
      ],
    },
    {
      id: 'cad-station',
      action: 'bay',
      prompt: 'open the drawings at the CAD station (Works Desk)',
      spot: { x: CAD_DESK.x - 0.85, z: CAD_DESK.z, reach: 1.1 },
      anchor: { x: CAD_DESK.x - 0.85, z: CAD_DESK.z, heading: -Math.PI / 2 },
      stages: [
        {
          clip: 'type',
          seconds: 1.0,
          label: 'Logging in to the CAD station',
          posture: 'standing',
        },
      ],
    },
  ]
}
