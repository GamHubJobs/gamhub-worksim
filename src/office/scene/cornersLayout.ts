/**
 * Each Cobalt Ridge department's own corner of the floor (where the IT team
 * has its IT corner): what is there, what is solid, and what the player does
 * at each object. Drawn in corners.tsx.
 *
 * - Finance & Administration: the post and print room (supplies, invoices).
 * - Accounting: the records room (the safe, filing, archive, the ledger desk).
 * - Digital Marketing: the content studio (a photo set, the campaign wall).
 * - Data & Insights: the insights wall (live dashboards, a standing table).
 * - Software Development: the team area (sprint board, test devices, pairing desk).
 *
 * An activity's action is `open:<app>` or `open:tool:<tool>` (see bays.ts).
 */
import type { Box as Solid } from '../../world/character/controller'
import type { Activity } from '../../world/interaction/activity'

const FACE_WALL = -Math.PI / 2 // facing the right-hand wall (+x)

// Finance & Administration: the post and print room -------------------------
export const POST = {
  copier: { x: 11.3, z: 1.6 },
  pigeonholes: { x: 11.75, z: 4.3 },
  supplies: { x: 11.55, z: 7.3 },
  table: { x: 8.2, z: 4.6 },
}
export const POSTROOM_BOXES: Solid[] = [
  { x: POST.copier.x, z: POST.copier.z, hx: 0.45, hz: 0.55, top: 1.2 },
  { x: POST.pigeonholes.x, z: POST.pigeonholes.z, hx: 0.3, hz: 1.0, top: 1.9 },
  { x: POST.supplies.x, z: POST.supplies.z, hx: 0.45, hz: 0.9, top: 2.0 },
  { x: POST.table.x, z: POST.table.z, hx: 0.5, hz: 1.0, top: 0.9 },
]
export function postroomActivities(): Activity[] {
  return [
    {
      id: 'supplies-cupboard',
      action: 'open:sheets',
      prompt: 'check the stock in the supplies cupboard (Grid Craft)',
      spot: { x: POST.supplies.x - 1.0, z: POST.supplies.z, reach: 1.2 },
      anchor: { x: POST.supplies.x - 0.95, z: POST.supplies.z, heading: FACE_WALL },
      stages: [
        { clip: 'reach', seconds: 1.0, label: 'Counting the paper, toner and envelopes' },
        {
          clip: 'phone',
          seconds: 1.0,
          label: 'Noting on your phone what is running low',
        },
      ],
    },
    {
      id: 'post-table',
      action: 'open:mail',
      prompt: 'sort today’s post and invoices (Mail)',
      spot: { x: POST.table.x - 0.95, z: POST.table.z, reach: 1.2 },
      anchor: { x: POST.table.x - 0.9, z: POST.table.z, heading: FACE_WALL },
      stages: [{ clip: 'reach', seconds: 1.2, label: 'Opening the post: two invoices' }],
    },
  ]
}

// Accounting: the records room -----------------------------------------------
export const RECORDS = {
  safe: { x: 11.5, z: 1.4 },
  cabinets: { x: 11.6, z: 4.4 },
  archive: { x: 11.6, z: 7.6 },
  ledger: { x: 8.1, z: 5.0 },
}
export const RECORDS_BOXES: Solid[] = [
  { x: RECORDS.safe.x, z: RECORDS.safe.z, hx: 0.42, hz: 0.42, top: 1.1 },
  { x: RECORDS.cabinets.x, z: RECORDS.cabinets.z, hx: 0.35, hz: 1.45, top: 1.3 },
  { x: RECORDS.archive.x, z: RECORDS.archive.z, hx: 0.38, hz: 1.0, top: 2.0 },
  { x: RECORDS.ledger.x, z: RECORDS.ledger.z, hx: 0.45, hz: 0.75, top: 0.78 },
]
export function recordsActivities(): Activity[] {
  return [
    {
      id: 'ledger-desk',
      action: 'open:tool:books',
      prompt: 'work through the ledgers at the records desk (Books)',
      spot: { x: RECORDS.ledger.x - 0.85, z: RECORDS.ledger.z, reach: 1.2 },
      anchor: { x: RECORDS.ledger.x - 0.8, z: RECORDS.ledger.z, heading: FACE_WALL },
      stages: [
        { clip: 'reach', seconds: 1.0, label: 'Taking out this month’s bank statements' },
        { clip: 'type', seconds: 1.0, label: 'Opening Books', posture: 'standing' },
      ],
    },
    {
      id: 'filing-cabinets',
      action: 'open:tool:books',
      prompt: 'find the supplier invoices in the filing cabinets (Books)',
      spot: { x: RECORDS.cabinets.x - 0.95, z: RECORDS.cabinets.z, reach: 1.2 },
      anchor: { x: RECORDS.cabinets.x - 0.9, z: RECORDS.cabinets.z, heading: FACE_WALL },
      stages: [
        { clip: 'reach', seconds: 1.2, label: 'Pulling the invoice file for March' },
      ],
    },
  ]
}

// Digital Marketing: the content studio --------------------------------------
export const STUDIO = {
  backdrop: { x: 11.65, z: 3.0 },
  product: { x: 10.6, z: 3.0 },
  tripod: { x: 8.9, z: 3.0 },
  lights: [
    { x: 9.7, z: 1.6 },
    { x: 9.7, z: 4.4 },
  ],
  wall: { x: 11.9, z: 7.1 },
}
export const STUDIO_BOXES: Solid[] = [
  { x: STUDIO.backdrop.x, z: STUDIO.backdrop.z, hx: 0.2, hz: 1.45, top: 2.4 },
  { x: STUDIO.product.x, z: STUDIO.product.z, hx: 0.35, hz: 0.45, top: 0.8 },
  { x: STUDIO.tripod.x, z: STUDIO.tripod.z, hx: 0.2, hz: 0.2, top: 1.5 },
  ...STUDIO.lights.map((l) => ({ x: l.x, z: l.z, hx: 0.22, hz: 0.22, top: 1.9 })),
]
export function studioActivities(): Activity[] {
  return [
    {
      id: 'photo-set',
      action: 'open:tool:social',
      prompt: 'shoot photos for this week’s posts (Social Planner)',
      spot: { x: STUDIO.tripod.x - 0.6, z: STUDIO.tripod.z, reach: 1.1 },
      anchor: { x: STUDIO.tripod.x - 0.55, z: STUDIO.tripod.z, heading: FACE_WALL },
      stages: [
        { clip: 'reach', seconds: 1.0, label: 'Turning the soft lights on' },
        { clip: 'phone', seconds: 1.2, label: 'Taking the product shot' },
      ],
    },
    {
      id: 'campaign-wall',
      action: 'open:tool:social',
      prompt: 'plan the posts on the campaign wall (Social Planner)',
      spot: { x: STUDIO.wall.x - 0.9, z: STUDIO.wall.z, reach: 1.2 },
      anchor: { x: STUDIO.wall.x - 0.85, z: STUDIO.wall.z, heading: FACE_WALL },
      stages: [{ clip: 'present', seconds: 1.2, label: 'Moving the cards to next week' }],
    },
  ]
}

// Data & Insights: the insights wall ----------------------------------------
export const INSIGHTS = {
  console: { x: 11.55, z: 4.0 },
  table: { x: 8.6, z: 4.0 },
  board: { x: 11.9, z: 8.0 },
}
export const INSIGHTS_BOXES: Solid[] = [
  { x: INSIGHTS.console.x, z: INSIGHTS.console.z, hx: 0.3, hz: 1.5, top: 0.9 },
  { x: INSIGHTS.table.x, z: INSIGHTS.table.z, hx: 0.5, hz: 0.9, top: 1.05 },
]
export function insightsActivities(): Activity[] {
  return [
    {
      id: 'dashboard-wall',
      action: 'open:tool:datastudio',
      prompt: 'review the live dashboards on the insights wall (Data Studio)',
      spot: { x: INSIGHTS.console.x - 0.95, z: INSIGHTS.console.z, reach: 1.3 },
      anchor: { x: INSIGHTS.console.x - 0.9, z: INSIGHTS.console.z, heading: FACE_WALL },
      stages: [
        { clip: 'present', seconds: 1.2, label: 'Reading yesterday’s sales dashboard' },
      ],
    },
    {
      id: 'standing-table',
      action: 'open:sheets',
      prompt: 'sketch the analysis at the standing table (Grid Craft)',
      spot: { x: INSIGHTS.table.x - 0.95, z: INSIGHTS.table.z, reach: 1.2 },
      anchor: { x: INSIGHTS.table.x - 0.9, z: INSIGHTS.table.z, heading: FACE_WALL },
      stages: [
        { clip: 'reach', seconds: 1.0, label: 'Sketching the chart on paper first' },
      ],
    },
  ]
}

// Software Development: the team area ---------------------------------------
export const DEVTEAM = {
  sprint: { x: 11.9, z: 2.6 },
  devices: { x: 11.55, z: 5.6 },
  rack: { x: 11.5, z: 8.2 },
  pairing: { x: 8.3, z: 4.8 },
}
export const DEVTEAM_BOXES: Solid[] = [
  { x: DEVTEAM.devices.x, z: DEVTEAM.devices.z, hx: 0.32, hz: 0.65, top: 1.1 },
  { x: DEVTEAM.rack.x, z: DEVTEAM.rack.z, hx: 0.38, hz: 0.38, top: 1.9 },
  { x: DEVTEAM.pairing.x, z: DEVTEAM.pairing.z, hx: 0.45, hz: 0.95, top: 0.78 },
]
export function devteamActivities(): Activity[] {
  return [
    {
      id: 'pairing-desk',
      action: 'open:code',
      prompt: 'test your change at the pairing desk (Code)',
      spot: { x: DEVTEAM.pairing.x - 0.85, z: DEVTEAM.pairing.z, reach: 1.2 },
      anchor: { x: DEVTEAM.pairing.x - 0.8, z: DEVTEAM.pairing.z, heading: FACE_WALL },
      stages: [
        {
          clip: 'type',
          seconds: 1.0,
          label: 'Pulling the latest code',
          posture: 'standing',
        },
      ],
    },
    {
      id: 'sprint-board',
      action: 'open:tasks',
      prompt: 'move your card on the sprint board (Tasks)',
      spot: { x: DEVTEAM.sprint.x - 0.9, z: DEVTEAM.sprint.z, reach: 1.2 },
      anchor: { x: DEVTEAM.sprint.x - 0.85, z: DEVTEAM.sprint.z, heading: FACE_WALL },
      stages: [{ clip: 'reach', seconds: 1.0, label: 'Moving your card to “In review”' }],
    },
  ]
}
