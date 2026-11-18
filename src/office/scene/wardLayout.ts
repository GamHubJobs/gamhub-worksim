/**
 * The hospital ward's layout (the healthcare career): the beds of Bay A, the
 * medicines trolley, what is solid, and what the player can do there.
 * Drawn in ward.tsx.
 */
import type { Box as Solid } from '../../world/character/controller'
import type { Activity } from '../../world/interaction/activity'

/** The bay's beds: the headboard against the right-hand wall. */
export const WARD_BEDS: Array<{
  id: string
  z: number
  patient: string | null
  blanket: string
}> = [
  { id: '4A-1', z: 1.6, patient: 'M. Okafor', blanket: '#93c5fd' },
  { id: '4A-2', z: 3.9, patient: 'D. Price', blanket: '#a7f3d0' },
  { id: '4A-3', z: 6.2, patient: 'A. Rahman', blanket: '#fde68a' },
  { id: '4A-4', z: 8.3, patient: 'G. Whitfield', blanket: '#fbcfe8' },
]
export const BED_X = 10.55
/**
 * The bed the patient-flow task discharges from (content/assignments/healthcare/
 * beds.ts: Daniel Price goes home from 4A-2): empty once that task is done.
 */
export const DISCHARGE = { bed: '4A-2', task: 'ward-beds' }
export const MED_TROLLEY = { x: 6.4, z: 5.2 }
/** At the far end of the bay: the resuscitation trolley and the vital signs monitor. */
export const RESUS = { x: 5.9, z: 8.75 }
export const VITALS = { x: 6.85, z: 8.8 }

/** What the player cannot walk through on the ward (the beds and the trolley). */
export const WARD_BOXES: Solid[] = [
  ...WARD_BEDS.map((b) => ({ x: BED_X, z: b.z, hx: 1.05, hz: 0.5, top: 0.75 })),
  { x: MED_TROLLEY.x, z: MED_TROLLEY.z, hx: 0.4, hz: 0.28, top: 1.0 },
  { x: RESUS.x, z: RESUS.z, hx: 0.42, hz: 0.28, top: 1.3 },
  { x: VITALS.x, z: VITALS.z, hx: 0.18, hz: 0.18, top: 1.45 },
]

/** At the bedside: opens Ward Systems (the patient record) there. */
export function wardActivities(): Activity[] {
  return [
    {
      id: 'bedside',
      action: 'bedside',
      prompt: 'see your patients at the bedside (Ward Systems)',
      spot: { x: 8.75, z: 4.9, reach: 1.3 },
      anchor: { x: 8.75, z: 4.9, heading: -Math.PI / 2 },
      stages: [
        { clip: 'reach', seconds: 1.0, label: 'Cleaning your hands with the gel' },
        { clip: 'talk', seconds: 1.2, label: 'Saying hello and checking the wristband' },
      ],
    },
    {
      id: 'medicines-trolley',
      action: 'bedside',
      prompt: 'open the medicines trolley (Ward Systems)',
      spot: { x: MED_TROLLEY.x, z: MED_TROLLEY.z + 0.75, reach: 1.0 },
      anchor: { x: MED_TROLLEY.x, z: MED_TROLLEY.z + 0.62, heading: Math.PI },
      stages: [{ clip: 'reach', seconds: 1.0, label: 'Unlocking the medicines trolley' }],
      sounds: [{ at: 0.5, id: 'door' }],
    },
  ]
}
