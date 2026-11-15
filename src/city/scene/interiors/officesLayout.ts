/**
 * Harbourside House inside: serviced offices where local employers hold their
 * interviews in the evening (see game/careerLife.ts). The front door is at
 * the south wall (+z); the reception desk is ahead and to the left, the
 * waiting chairs along the right wall, and Meeting Room 2 behind a glass
 * partition at the back left. Coordinates match Offices.tsx.
 */
import type { Box } from '../../../world/character/controller'
import type { Place } from '../../../world/npc/schedule'
import type { Layout } from './layouts'

const box = (x: number, z: number, hx: number, hz: number, top = 1.2): Box => ({
  x,
  z,
  hx,
  hz,
  top,
})

export const OFFICES_SIZE = { width: 12, depth: 10, height: 3.2 }

export const RECEPTION_DESK = { x: -2.6, z: 1.0, hx: 1.3, hz: 0.4 }
/** The receptionist, behind the desk, facing the door. */
export const RECEPTIONIST = { x: -2.6, z: 0.25, heading: Math.PI }
/** The waiting chairs along the right wall, facing into the room. */
export const WAITING_CHAIRS = [0.4, 1.3, 2.2].map((z) => ({
  x: 5.2,
  z,
  heading: Math.PI / 2,
}))
/** Meeting Room 2: a glass partition with a doorway, and the table inside. */
export const MEETING = { x0: -6, x1: 0.5, z0: -5, z1: -1.5, door: [-1.5, -0.3] as const }
export const MEETING_TABLE = { x: -3, z: -3.3, hx: 1.0, hz: 0.5 }
/** The interviewer's chair (facing the door) and the candidate's, across the table. */
export const INTERVIEWER_CHAIR = { x: -3, z: -4.2, heading: Math.PI }
export const CANDIDATE_CHAIR = { x: -3, z: -2.4, heading: 0 }

const H = OFFICES_SIZE.width / 2
const D = OFFICES_SIZE.depth / 2

export const OFFICES_BOXES: Box[] = [
  // The outer walls.
  box(0, -D - 0.1, H, 0.15, 3.2),
  box(0, D + 0.1, H, 0.15, 3.2),
  box(-H - 0.1, 0, 0.15, D, 3.2),
  box(H + 0.1, 0, 0.15, D, 3.2),
  // The reception desk.
  box(RECEPTION_DESK.x, RECEPTION_DESK.z, RECEPTION_DESK.hx, RECEPTION_DESK.hz, 1.1),
  // The meeting room's glass partition (a doorway between −1.5 and −0.3) and side.
  box(
    (MEETING.x0 + MEETING.door[0]) / 2,
    MEETING.z1,
    (MEETING.door[0] - MEETING.x0) / 2,
    0.06,
    2.6,
  ),
  box(
    (MEETING.door[1] + MEETING.x1) / 2,
    MEETING.z1,
    (MEETING.x1 - MEETING.door[1]) / 2,
    0.06,
    2.6,
  ),
  box(
    MEETING.x1,
    (MEETING.z0 + MEETING.z1) / 2,
    0.06,
    (MEETING.z1 - MEETING.z0) / 2,
    2.6,
  ),
  // The meeting table.
  box(MEETING_TABLE.x, MEETING_TABLE.z, MEETING_TABLE.hx, MEETING_TABLE.hz, 0.75),
  // A low table by the waiting chairs, and a plant in the corner.
  box(4.4, 1.3, 0.35, 0.5, 0.45),
  box(5.3, -4.3, 0.4, 0.4, 1.4),
]

/** Where the interviewer is: at the table, or come out to call the player in. */
export const INTERVIEWER_PLACES: Record<string, Place> = {
  room: {
    x: INTERVIEWER_CHAIR.x,
    z: INTERVIEWER_CHAIR.z,
    heading: INTERVIEWER_CHAIR.heading,
    seated: true,
    clip: 'write',
    also: ['read'],
    label: 'reading your application in Meeting Room 2',
  },
  /** Standing in front of the waiting chairs, to call the player in. */
  collect: {
    x: 3.7,
    z: 1.3,
    heading: -Math.PI / 2,
    clip: 'talk',
    label: 'calling you in for your interview',
  },
}

export const OFFICES: Layout = {
  size: OFFICES_SIZE,
  start: { x: 1.4, z: 3.3, heading: 0 },
  surface: 'carpet',
  boxes: OFFICES_BOXES,
  activities: [
    {
      id: 'interview-sign-in',
      action: 'interview-sign-in',
      prompt: 'sign in for your interview',
      spot: { x: RECEPTION_DESK.x, z: 2.0, reach: 1.3 },
      anchor: { x: RECEPTION_DESK.x, z: 1.72, heading: 0 },
      stages: [
        { clip: 'talk', seconds: 1.6, label: 'Giving your name at reception' },
        {
          clip: 'write',
          seconds: 2.4,
          label: 'Signing the visitors’ book',
          hold: { right: 'pen' },
        },
        { clip: 'reach', seconds: 1.2, label: 'Taking your visitor badge' },
      ],
    },
    {
      id: 'interview-wait',
      action: 'interview-wait',
      prompt: 'take a seat and wait',
      spot: { x: 4.4, z: 2.3, reach: 1.2 },
      anchor: WAITING_CHAIRS[1],
      stages: [
        { clip: 'sit', seconds: 1.2, label: 'Sitting down to wait' },
        { clip: 'sit-relax', seconds: 5, label: 'Waiting to be called' },
      ],
    },
    {
      id: 'interview-room',
      action: 'interview-room',
      prompt: 'go into the interview',
      spot: { x: 3.9, z: 1.3, reach: 1.6 },
      anchor: CANDIDATE_CHAIR,
      stages: [{ clip: 'sit', seconds: 1.2, label: 'Taking a seat across the table' }],
    },
    {
      // In the interview: sitting across the table while it lasts (started by the
      // interview, never offered by itself).
      id: 'interview-sit',
      action: null,
      prompt: 'sit in the interview',
      spot: { x: CANDIDATE_CHAIR.x, z: CANDIDATE_CHAIR.z, reach: 0 },
      anchor: CANDIDATE_CHAIR,
      stages: [
        { clip: 'sit', seconds: 0.6, label: 'In the interview' },
        { clip: 'sit-relax', seconds: 900, label: 'In the interview' },
      ],
    },
    {
      // Done: a handshake across the table on the way out.
      id: 'interview-goodbye',
      action: null,
      prompt: 'say goodbye',
      spot: { x: -1.0, z: -0.9, reach: 0 },
      anchor: { x: -1.0, z: -0.9, heading: Math.PI },
      stages: [{ clip: 'wave', seconds: 2.4, label: 'Thanking the interviewer' }],
    },
  ],
}
