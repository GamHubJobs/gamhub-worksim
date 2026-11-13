/**
 * The office floor as a walkable place: the walls and furniture, which area
 * the player is in (reception, the desks, the manager's office, the break
 * room: moving between them takes office time, as it always has), and an
 * activity for each thing the player can do there, at the object or person
 * it involves. Coordinates match OfficeScene.tsx.
 */
import { fill } from '../../content/departments'
import { SPOTS, type InteractionId, type SpotId } from '../../content/office'
import type { Box } from '../../world/character/controller'
import type { Activity } from '../../world/interaction/activity'
import { OFFICE_PEOPLE, OFFICE_PLACES, STANDING_DESK } from './officeCast'

/** The IT corner, on the right-hand side: the comms cabinet and the IT workbench. */
export const IT_CABINET = { x: 11.5, z: 2.2 }
export const IT_BENCH = { x: 11.3, z: 5.6 }

const box = (x: number, z: number, hx: number, hz: number, top = 1.1): Box => ({
  x,
  z,
  hx,
  hz,
  top,
})

export const OFFICE_BOXES: Box[] = [
  // The outer walls (the front is open, with a low edge for the camera to see over).
  box(0, -8.1, 12, 0.15, 2.9),
  box(-12.1, 0.5, 0.15, 8.5, 2.9),
  box(12.1, 0.5, 0.15, 8.5, 2.9),
  box(0, 9.2, 12, 0.15, 0.3),
  // Reception: the back panel, the desk, the sofa and its table.
  box(-6.6, 2.3, 2.6, 0.1, 2.7),
  box(-6.6, 4.2, 1.65, 0.4),
  box(-10.2, 6.6, 0.45, 1.0),
  box(-8.9, 6.6, 0.42, 0.42, 0.5),
  // The desks, back to back, with the partition between them.
  ...[-1.2, 0.6, 2.4].flatMap((x) => [
    box(x, 1.1, 0.75, 0.38),
    box(x, -0.45, 0.75, 0.38),
  ]),
  box(0.6, 0.33, 2.8, 0.05, 1.2),
  box(-2.9, 2.4, 0.75, 0.25, 2),
  box(4.3, -1.5, 0.28, 0.32),
  // The manager's glass office (a doorway between z −3.6 and −2.0) and its furniture.
  box(5, -5.8, 0.06, 2.2, 2.6),
  box(5, -1.5, 0.06, 0.5, 2.6),
  box(8.5, -1, 3.5, 0.06, 2.6),
  box(8.4, -4.3, 1.0, 0.5),
  box(10.4, -7.6, 1.1, 0.25, 2),
  // The break room: the half wall, the counter, the fridge, the table, the water.
  box(-4, -5.4, 0.08, 2.6, 1.2),
  box(-9.2, -7.5, 2.15, 0.36),
  box(-11.4, -7.45, 0.42, 0.36, 1.9),
  box(-7.4, -3.6, 0.62, 0.62, 0.8),
  box(-4.8, -7.4, 0.22, 0.22, 1.3),
  // The IT corner: the comms cabinet and the workbench.
  box(IT_CABINET.x, IT_CABINET.z, 0.35, 0.34, 2.0),
  box(IT_BENCH.x, IT_BENCH.z, 0.45, 0.95, 0.95),
]

const faceTo = (x: number, z: number, tx: number, tz: number) =>
  Math.atan2(-(tx - x), -(tz - z))

/** Where a colleague's own computer is (their desk), and where to stand at it. */
export function deskOf(person: string): {
  at: { x: number; z: number }
  stand: { x: number; z: number; heading: number }
} | null {
  const own = OFFICE_PEOPLE.find((p) => p.id === person)?.own
  const place = own ? OFFICE_PLACES[own] : undefined
  if (!own || !place) return null
  const at =
    own === 'standing'
      ? { x: STANDING_DESK.x, z: STANDING_DESK.z }
      : own.startsWith('desk:')
        ? { x: place.x, z: place.z > 0 ? 1.1 : -0.45 }
        : { x: place.x, z: place.z }
  const stand =
    own === 'standing'
      ? { x: at.x + 0.75, z: at.z + 0.55 }
      : own.startsWith('desk:')
        ? { x: place.x + 0.65, z: place.z > 0 ? 1.8 : -1.2 }
        : { x: place.x + 0.6, z: place.z + 0.3 }
  return { at, stand: { ...stand, heading: faceTo(stand.x, stand.z, at.x, at.z) } }
}

/** Where an IT job's equipment is: the cabinet, the bench, or a colleague's desk. */
export function equipmentAt(target: string): { x: number; z: number } | null {
  if (target === 'cabinet') return IT_CABINET
  if (target === 'bench') return IT_BENCH
  if (target.startsWith('person:'))
    return deskOf(target.slice('person:'.length))?.at ?? null
  return null
}

/**
 * Hands-on IT work, done in person: the cabinet and the bench are always
 * there; a colleague's desk only while there is a laptop to collect or return.
 */
export function itActivities(
  desks: Array<{ person: string; kind: 'collect' | 'return'; name: string }>,
): Activity[] {
  return [
    {
      id: 'onsite:cabinet',
      action: 'onsite:cabinet',
      prompt: 'open the comms cabinet',
      spot: { x: IT_CABINET.x - 0.7, z: IT_CABINET.z, reach: 1.1 },
      anchor: { x: IT_CABINET.x - 0.78, z: IT_CABINET.z, heading: -Math.PI / 2 },
      stages: [
        { clip: 'reach', seconds: 1.2, label: 'Unlocking and opening the cabinet' },
      ],
      sounds: [{ at: 0.6, id: 'door' }],
    },
    {
      id: 'onsite:bench',
      action: 'onsite:bench',
      prompt: 'work at the IT workbench',
      spot: { x: IT_BENCH.x - 0.75, z: IT_BENCH.z, reach: 1.2 },
      anchor: { x: IT_BENCH.x - 0.82, z: IT_BENCH.z, heading: -Math.PI / 2 },
      stages: [{ clip: 'reach', seconds: 1.0, label: 'Clearing a space on the bench' }],
    },
    ...desks.flatMap((d): Activity[] => {
      const desk = deskOf(d.person)
      if (!desk) return []
      const first = d.name.split(' ')[0]
      return [
        {
          id: `onsite:desk:${d.person}`,
          action: `onsite:desk:${d.person}`,
          prompt:
            d.kind === 'collect'
              ? `collect ${first}’s laptop`
              : `hand ${first}’s laptop back`,
          spot: { x: desk.stand.x, z: desk.stand.z, reach: 1.2 },
          anchor: desk.stand,
          stages:
            d.kind === 'collect'
              ? [
                  {
                    clip: 'talk',
                    seconds: 1.4,
                    label: `Telling ${first} you will take it to the bench`,
                  },
                  {
                    clip: 'reach',
                    seconds: 1.2,
                    label: 'Unplugging the laptop and picking it up',
                    hold: { right: 'document' },
                  },
                ]
              : [
                  { clip: 'reach', seconds: 1.2, label: 'Plugging the laptop back in' },
                  { clip: 'talk', seconds: 1.4, label: `Showing ${first} it starts` },
                ],
        },
      ]
    }),
  ]
}

/** The area of the office a point is in. */
export function spotAt(x: number, z: number): SpotId {
  if (x > 5 && z < -1) return 'manager'
  if (x < -3.6 && z < 0.4) return 'breakroom'
  if (x < -3.4 && z > 2.6) return 'reception'
  return 'desk'
}

/** Where to stand in each area when walking there. */
export function standIn(spot: SpotId): { x: number; z: number; heading: number } {
  const marker = SPOTS.find((s) => s.id === spot)!.marker
  // Markers are [x, height, z].
  return { x: marker[0], z: marker[2], heading: spot === 'reception' ? 0.4 : 0 }
}

const talk = (label: string): Activity['stages'] => [
  { clip: 'talk', seconds: 1.6, label },
]

/**
 * Things to do, by interaction ID (the game's own), plus walking to each area.
 * Made when the office is shown, with the names of the career's own people.
 */
export const officeActivities = (): Activity[] => [
  ...SPOTS.map((s) => ({
    id: `go:${s.id}`,
    action: `go:${s.id}`,
    prompt: fill(s.name),
    // Only asked for from the Places list or a floor marker: never offered nearby.
    spot: { x: 0, z: 0, reach: -1 },
    anchor: standIn(s.id),
    stages: [{ clip: 'stand' as const, seconds: 0.2 }],
  })),
  {
    id: 'computer',
    action: 'computer',
    prompt: 'use your computer',
    spot: { x: 0.65, z: 2.3, reach: 1.1 },
    anchor: { x: 0.68, z: 1.82, heading: 0 },
    stages: [
      { clip: 'sit', seconds: 1.2, label: 'Pulling out the chair and sitting down' },
      { clip: 'type', seconds: 2.2, label: 'Logging in' },
    ],
    sounds: [
      { at: 0.4, id: 'chair' },
      { at: 1.4, id: 'type', every: 0.17, until: 3.3 },
    ],
  },
  {
    id: 'arrange',
    action: 'arrange',
    prompt: 'arrange your desk',
    spot: { x: 1.4, z: 2.3, reach: 0.7 },
    anchor: { x: 1.3, z: 1.75, heading: 0 },
    stages: [{ clip: 'reach', seconds: 2.4, label: 'Tidying your desk' }],
  },
  {
    id: 'senior',
    action: 'senior',
    prompt: 'talk to your senior colleague',
    spot: { x: -1.0, z: 2.6, reach: 1 },
    anchor: { x: -0.85, z: 2.35, heading: 0.46 },
    stages: talk('Saying hello'),
  },
  {
    id: 'whiteboard',
    action: 'whiteboard',
    prompt: 'read the team whiteboard',
    spot: { x: -2.5, z: 3.2, reach: 1.1 },
    anchor: { x: -2.45, z: 3.25, heading: 0.5 },
    stages: [{ clip: 'stand', seconds: 1.6, label: 'Reading the whiteboard' }],
  },
  {
    id: 'receptionist',
    action: 'receptionist',
    prompt: 'talk to Nina at reception',
    spot: { x: -6.2, z: 5.1, reach: 1.2 },
    anchor: { x: -6.2, z: 5.0, heading: 0 },
    stages: talk('Saying hello to Nina'),
  },
  {
    id: 'home',
    action: 'home',
    prompt: 'go home (the exit)',
    spot: { x: -11, z: 7.4, reach: 1.3 },
    anchor: { x: -11.3, z: 7.4, heading: Math.PI / 2 },
    stages: [{ clip: 'push-door', seconds: 0.9, label: 'Heading out' }],
    sounds: [{ at: 0.4, id: 'door' }],
  },
  {
    id: 'manager',
    action: 'manager',
    prompt: 'sit down with your manager',
    spot: { x: 7.8, z: -2.6, reach: 1.1 },
    anchor: { x: 7.8, z: -3.3, heading: 0 },
    stages: [
      { clip: 'sit', seconds: 1.2, label: 'Taking a seat' },
      { clip: 'sit', seconds: 0.8, label: 'Ready to talk' },
    ],
    sounds: [{ at: 0.4, id: 'chair' }],
  },
  {
    id: 'coffee',
    action: 'coffee',
    prompt: 'make a coffee',
    spot: { x: -9.6, z: -6.5, reach: 1.1 },
    anchor: { x: -9.6, z: -6.65, heading: 0 },
    stages: [
      { clip: 'reach', seconds: 1.2, label: 'Making a coffee' },
      { clip: 'stand', seconds: 1.6, label: 'The machine pours', hold: { right: 'mug' } },
    ],
    sounds: [{ at: 1, id: 'pour' }],
    effects: [{ kind: 'steam', from: 1.4, to: 4, at: [0, 0.05, -0.04], follow: 'right' }],
  },
  {
    id: 'lunch',
    action: 'lunch',
    prompt: 'have lunch at the table',
    spot: { x: -6.3, z: -2.9, reach: 1.2 },
    anchor: { x: -6.35, z: -3.6, heading: Math.PI / 2 },
    stages: [
      { clip: 'sit', seconds: 1.2, label: 'Sitting down with your lunch' },
      { clip: 'eat', seconds: 6.4, label: 'Having lunch', hold: { right: 'sandwich' } },
    ],
    sounds: [
      { at: 0.4, id: 'chair' },
      { at: 2, id: 'bite', every: 3.2 },
    ],
  },
  {
    id: 'colleague',
    action: 'colleague',
    prompt: 'chat with Tom',
    spot: { x: -8.4, z: -5.2, reach: 1.1 },
    anchor: { x: -8.4, z: -5.25, heading: 0 },
    stages: talk('Saying hello to Tom'),
  },
  {
    id: 'noticeboard',
    action: 'noticeboard',
    prompt: 'read the notice board',
    spot: { x: -11, z: -4.2, reach: 1.1 },
    anchor: { x: -11.1, z: -4.2, heading: Math.PI / 2 },
    stages: [{ clip: 'stand', seconds: 1.6, label: 'Reading the notices' }],
  },
  // Meetings, attended in person (see MEETINGS in content/workday.ts): the player
  // takes their place, listens while the others speak in turn, gives their own
  // update, and only then has been there. Walking away part way is not attending.
  {
    id: 'meeting:standup',
    action: 'meeting:standup',
    prompt: 'join the stand-up',
    // The player's place in the circle round the whiteboard, facing it.
    spot: { x: -0.9, z: 4.07, reach: 1.3 },
    anchor: { x: -0.9, z: 4.07, heading: 0.875 },
    // Seen from behind the player: the circle and the whiteboard.
    view: 'behind',
    stages: [
      { clip: 'stand', seconds: 1.2, label: 'Joining the stand-up' },
      { clip: 'stand', seconds: 7, label: 'Listening to the team’s updates' },
      { clip: 'talk', seconds: 3.5, label: 'Giving your update' },
      { clip: 'stand', seconds: 2, label: 'Wrapping up' },
    ],
  },
  ...(['planning', 'one-to-one'] as const).map((id): Activity => ({
    id: `meeting:${id}`,
    action: `meeting:${id}`,
    prompt: id === 'planning' ? 'join the weekly planning' : 'start your one-to-one',
    // The player's chair at the manager's desk.
    spot: { x: 7.8, z: -2.6, reach: 1.1 },
    anchor: { x: 7.8, z: -3.3, heading: 0 },
    stages: [
      { clip: 'sit', seconds: 1.2, label: 'Taking a seat' },
      {
        clip: 'sit',
        seconds: id === 'planning' ? 7 : 5,
        label:
          id === 'planning' ? 'Planning the week together' : 'Talking through your week',
      },
      { clip: 'sit', seconds: 2.5, label: 'Agreeing what comes next' },
    ],
    sounds: [{ at: 0.4, id: 'chair' }],
  })),
]

/** The meeting an activity attends, if it is one. */
export const meetingOf = (action: string | null): string | null =>
  action?.startsWith('meeting:') ? action.slice('meeting:'.length) : null

export const isInteraction = (action: string): action is InteractionId =>
  !action.startsWith('go:') &&
  !action.startsWith('onsite:') &&
  !action.startsWith('meeting:') &&
  !action.startsWith('person:')
