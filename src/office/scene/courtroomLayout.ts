/**
 * The law firm's moot courtroom (the law career): where the IT corner is in
 * the office, Kestrel & Vane has a training courtroom laid out like a
 * courtroom of the (fictional) Westmark County Court: the judge's bench, the
 * witness box, counsel's tables and the public seats. What is solid, and
 * what the player can do there. Drawn in courtroom.tsx.
 */
import type { Box as Solid } from '../../world/character/controller'
import type { Activity } from '../../world/interaction/activity'

/** The judge's bench, raised, against the far wall. */
export const BENCH = { x: 11.2, z: 4.6 }
export const WITNESS_BOX = { x: 10.2, z: 7.9 }
/** Counsel's tables, facing the bench: the claimant's and the defendant's. */
export const COUNSEL_TABLES = [
  { x: 8.3, z: 3.0, side: 'Claimant' },
  { x: 8.3, z: 6.2, side: 'Defendant' },
]
/** The public seats: two short rows by the entrance, with the aisle between. */
export const GALLERY = [
  { x: 6.1, z: 1.8 },
  { x: 6.1, z: 7.4 },
]
/** Today's court list, on the glass wall at the entrance. */
export const COURT_LIST = { x: 7.0, z: -0.88 }

export const COURTROOM_BOXES: Solid[] = [
  { x: BENCH.x, z: BENCH.z, hx: 0.6, hz: 1.7, top: 1.3 },
  { x: WITNESS_BOX.x, z: WITNESS_BOX.z, hx: 0.45, hz: 0.45, top: 1.1 },
  ...COUNSEL_TABLES.map((t) => ({ x: t.x, z: t.z, hx: 0.4, hz: 0.9, top: 0.78 })),
  ...GALLERY.map((g) => ({ x: g.x, z: g.z, hx: 0.25, hz: 1.1, top: 0.5 })),
]

/** At counsel's table and the court list: each opens Matter Desk there. */
export function courtroomActivities(): Activity[] {
  const table = COUNSEL_TABLES[0]
  return [
    {
      id: 'counsel-table',
      action: 'bay',
      prompt: 'take your place at counsel’s table (Matter Desk)',
      spot: { x: table.x - 0.8, z: table.z, reach: 1.2 },
      anchor: { x: table.x - 0.75, z: table.z, heading: -Math.PI / 2 },
      stages: [
        { clip: 'reach', seconds: 1.0, label: 'Laying out the hearing bundle' },
        { clip: 'stand', seconds: 0.8, label: 'Standing as the judge comes in' },
      ],
    },
    {
      id: 'court-list',
      action: 'bay',
      prompt: 'check today’s court list (Matter Desk: calendar)',
      spot: { x: COURT_LIST.x, z: COURT_LIST.z + 0.8, reach: 1.0 },
      anchor: { x: COURT_LIST.x, z: COURT_LIST.z + 0.7, heading: Math.PI },
      stages: [
        { clip: 'present', seconds: 1.0, label: 'Finding your matter on the list' },
      ],
    },
  ]
}
