/**
 * The café, the food shop, the park and Cog & Kerb: what is solid and what
 * the player can do, where (Forge Fitness is in gymLayout.ts). Coordinates
 * match each place's 3D file. Each activity completes the place's real game
 * action only when it has been played to the end.
 */
import type { Box } from '../../../world/character/controller'
import type { Activity } from '../../../world/interaction/activity'

export interface Layout {
  size: { width: number; depth: number; height: number }
  start: { x: number; z: number; heading: number }
  boxes: Box[]
  activities: Activity[]
  surface: 'wood' | 'tile' | 'pavement' | 'grass' | 'carpet'
}

const box = (x: number, z: number, hx: number, hz: number, top = 1.2): Box => ({
  x,
  z,
  hx,
  hz,
  top,
})

/** Four walls round a room `w` by `d` (centred on the origin). */
const walls = (w: number, d: number, h = 3.4): Box[] => [
  box(0, -d / 2 - 0.1, w / 2, 0.15, h),
  box(0, d / 2 + 0.1, w / 2, 0.15, h),
  box(-w / 2 - 0.1, 0, 0.15, d / 2, h),
  box(w / 2 + 0.1, 0, 0.15, d / 2, h),
]

// ---------------------------------------------------------------------------
// Kettle & Crumb
// ---------------------------------------------------------------------------

/** The free table by the left window, and its chair facing the counter. */
const SEAT = { x: -3, z: 2.35, heading: 0 }

const order = (what: string): Activity['stages'] => [
  { clip: 'pay', seconds: 2.4, label: `Ordering ${what}`, hold: { right: 'card' } },
  { clip: 'stand', seconds: 2.2, label: 'The barista gets it ready' },
]

export const CAFE: Layout = {
  size: { width: 12, depth: 9, height: 3.4 },
  start: { x: 1.2, z: 3.4, heading: 0 },
  surface: 'wood',
  boxes: [
    ...walls(12, 9),
    box(-3.3, -2.8, 2.35, 0.45),
    box(0.3, -2.8, 0.98, 0.42),
    box(-4.4, -4.2, 1.1, 0.25, 2.2),
    box(-3, 1.6, 0.6, 1.05, 0.8),
    box(3, -0.6, 0.6, 1.05, 0.8),
    box(4.4, 2.6, 0.6, 1.05, 0.8),
    box(0.4, 2.2, 0.6, 1.05, 0.8),
    box(5.4, -3.9, 0.35, 0.35),
    box(-5.4, 3.6, 0.35, 0.35),
    box(1.6, -3.9, 0.3, 0.3),
  ],
  activities: [
    {
      id: 'coffee',
      action: 'cafe-coffee',
      prompt: 'order a coffee and a slice of cake',
      spot: { x: -3.6, z: -1.8, reach: 1.2 },
      anchor: { x: -3.6, z: -1.95, heading: 0 },
      stages: [
        ...order('a coffee and a slice of cake'),
        {
          clip: 'reach',
          seconds: 1,
          label: 'Collecting your coffee',
          hold: { right: 'mug' },
        },
        {
          clip: 'sit',
          seconds: 1.2,
          label: 'Sitting down',
          hold: { right: 'mug' },
          at: SEAT,
        },
        { clip: 'drink', seconds: 9, label: 'Coffee and cake', hold: { right: 'mug' } },
        { clip: 'sit', seconds: 1, label: 'Finishing up' },
      ],
      sounds: [
        { at: 1.4, id: 'beep' },
        { at: 2.8, id: 'pour' },
        { at: 8.4, id: 'chair' },
        { at: 9.4, id: 'sip', every: 4.5, until: 17.8 },
      ],
      effects: [
        { kind: 'steam', from: 3.6, to: 17.8, at: [0, 0.05, -0.04], follow: 'right' },
      ],
      object: 'cake',
    },
    {
      id: 'breakfast',
      action: 'cafe-breakfast',
      prompt: 'order breakfast',
      spot: { x: 0.3, z: -1.8, reach: 1.2 },
      anchor: { x: 0.3, z: -1.95, heading: 0 },
      stages: [
        ...order('breakfast'),
        { clip: 'reach', seconds: 1, label: 'Collecting your breakfast' },
        { clip: 'sit', seconds: 1.2, label: 'Sitting down', at: SEAT },
        { clip: 'eat', seconds: 9.6, label: 'Eating breakfast', hold: { right: 'fork' } },
        { clip: 'drink', seconds: 4.5, label: 'A cup of tea', hold: { right: 'cup' } },
      ],
      sounds: [
        { at: 1.4, id: 'beep' },
        { at: 6.8, id: 'chair' },
        { at: 8.8, id: 'bite', every: 3.2, until: 17.6 },
        { at: 20, id: 'sip' },
      ],
      effects: [{ kind: 'steam', from: 7, to: 22, at: [-3, 0.85, 1.75] }],
      object: 'plate',
    },
    {
      // Saying goodnight after a date: standing face to face (see npc/moment.ts).
      id: 'date-goodnight',
      action: null,
      prompt: 'say goodnight',
      spot: { x: -4.6, z: 1.6, reach: 0 },
      anchor: { x: -4.6, z: 1.6, heading: -Math.PI / 2 },
      view: 'side',
      stages: [{ clip: 'stand', seconds: 4.5, label: 'Saying goodnight' }],
    },
    {
      // On a date (see game/dates.ts): sitting together while they talk. Started by the
      // date, never offered by itself (nothing to reach); moving stands up.
      id: 'date-sit',
      action: null,
      prompt: 'sit with your date',
      spot: { x: -3, z: 2.35, reach: 0 },
      anchor: { x: -3, z: 2.35, heading: 0 },
      stages: [
        { clip: 'sit', seconds: 1.2, label: 'Sitting down together' },
        { clip: 'sit-relax', seconds: 600, label: 'On a date' },
      ],
    },
    {
      id: 'dinner',
      action: 'cafe-dinner',
      prompt: 'order dinner',
      spot: { x: -1.9, z: -1.8, reach: 1 },
      anchor: { x: -2.2, z: -1.95, heading: 0 },
      stages: [
        ...order('the dinner of the day'),
        { clip: 'reach', seconds: 1, label: 'Collecting your dinner' },
        { clip: 'sit', seconds: 1.2, label: 'Sitting down', at: SEAT },
        { clip: 'eat', seconds: 12.8, label: 'Eating dinner', hold: { right: 'fork' } },
        {
          clip: 'drink',
          seconds: 4.5,
          label: 'A glass of water',
          hold: { right: 'cup' },
        },
      ],
      sounds: [
        { at: 1.4, id: 'beep' },
        { at: 6.8, id: 'chair' },
        { at: 8.8, id: 'bite', every: 3.2, until: 20.8 },
        { at: 23, id: 'sip' },
      ],
      effects: [{ kind: 'steam', from: 7, to: 21, at: [-3, 0.85, 1.75] }],
      object: 'plate',
    },
  ],
}

// ---------------------------------------------------------------------------
// Daily Basket
// ---------------------------------------------------------------------------

/** Where the customer stands at the checkout, facing the cashier. */
const TILL = { x: 2.9, z: 1.2, heading: -Math.PI / 2 }

export const SHOP: Layout = {
  size: { width: 13, depth: 10, height: 3.4 },
  start: { x: 0.6, z: 3.6, heading: 0 },
  surface: 'tile',
  boxes: [
    ...walls(13, 10),
    box(-3.5, -1, 0.45, 2.05, 2),
    box(-1, -1, 0.45, 2.05, 2),
    box(1.5, -1, 0.45, 2.05, 2),
    box(2.4, -4.1, 2.25, 0.5, 2.2),
    box(4.6, -1.6, 0.6, 1.35, 0.9),
    box(-2.1, 2.3, 0.6, 0.6, 1.1),
    box(3.7, 1.2, 0.4, 1.15, 1),
  ],
  activities: [
    {
      id: 'groceries',
      action: 'shop-groceries',
      prompt: 'do a week’s shopping (take a basket)',
      spot: { x: -2.2, z: 1.3, reach: 1.1 },
      anchor: { x: -2.2, z: 1.45, heading: Math.PI },
      stages: [
        {
          clip: 'reach',
          seconds: 1.2,
          label: 'Taking a basket',
          hold: { left: 'basket' },
        },
        {
          clip: 'reach',
          seconds: 2.4,
          label: 'Bread and cereal',
          hold: { left: 'basket', right: 'product' },
          at: { x: -2.85, z: -1.4, heading: Math.PI / 2 },
        },
        {
          clip: 'reach',
          seconds: 2.4,
          label: 'Tins and pasta',
          hold: { left: 'basket', right: 'product' },
          at: { x: -1.65, z: -0.4, heading: -Math.PI / 2 },
        },
        {
          clip: 'reach',
          seconds: 2.4,
          label: 'Milk and cheese',
          hold: { left: 'basket', right: 'bottle' },
          at: { x: 1.9, z: -3.2, heading: 0 },
        },
        {
          clip: 'reach',
          seconds: 2.4,
          label: 'Fruit and veg',
          hold: { left: 'basket', right: 'product' },
          at: { x: 3.6, z: -1.6, heading: -Math.PI / 2 },
        },
        {
          clip: 'pay',
          seconds: 3,
          label: 'Paying at the checkout',
          hold: { left: 'basket', right: 'card' },
          at: TILL,
        },
      ],
      sounds: [
        { at: 1.2, id: 'rustle' },
        { at: 2.4, id: 'rustle', every: 2.4, until: 11 },
        { at: 11.4, id: 'beep', every: 0.5, until: 12.6 },
      ],
      object: 'basket',
    },
    {
      id: 'meal',
      action: 'shop-meal',
      prompt: 'pick a ready meal from the fridge',
      spot: { x: 2.4, z: -3, reach: 1.2 },
      anchor: { x: 2.4, z: -3.2, heading: 0 },
      stages: [
        {
          clip: 'reach',
          seconds: 2.4,
          label: 'Choosing a ready meal',
          hold: { right: 'product' },
        },
        {
          clip: 'pay',
          seconds: 3,
          label: 'Paying at the checkout',
          hold: { right: 'card' },
          at: TILL,
        },
      ],
      sounds: [
        { at: 1, id: 'rustle' },
        { at: 3.2, id: 'beep' },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Millpond Park
// ---------------------------------------------------------------------------

/** Points round the path circling the pond (an ellipse), starting by the gate. */
function loop(n: number): Array<{ x: number; z: number; heading: number }> {
  const out = []
  for (let i = 1; i <= n; i++) {
    const a = Math.PI / 2 + (i / n) * Math.PI * 2
    const x = Math.cos(a) * 5.2
    const z = -2 + Math.sin(a) * 3.25
    const ta = a + Math.PI / 2
    out.push({ x, z, heading: Math.atan2(Math.sin(ta) * 5.2, Math.cos(ta) * 3.25) })
  }
  return out
}

export const PARK: Layout = {
  size: { width: 30, depth: 26, height: 30 },
  start: { x: 0.6, z: 5.4, heading: 0 },
  surface: 'grass',
  boxes: [
    // The edge of the park, and the pond (walk round it, not through).
    box(0, -15, 15, 0.2, 1),
    box(0, 7.5, 15, 0.2, 1),
    box(-14, -4, 0.2, 12, 1),
    box(14, -4, 0.2, 12, 1),
    box(0, -2, 3.7, 1.55, 0.3),
    box(0, -2, 2.6, 2.3, 0.3),
    // Benches, flower beds, trees and lamp posts.
    box(-3.4, 2.2, 0.8, 0.25, 0.8),
    box(3.3, -5.6, 0.8, 0.3, 0.8),
    box(-5.6, 4.6, 0.75, 0.75, 0.5),
    box(4.6, 4.8, 0.75, 0.75, 0.5),
    box(-6.5, -2, 0.75, 0.75, 0.5),
    ...[
      [-7, -6],
      [7.5, -7],
      [-8, 1],
      [8.5, 0],
      [-4, -10],
      [3, -11],
    ].map(([x, z]) => box(x, z, 0.3, 0.3, 3)),
  ],
  activities: [
    {
      id: 'walk',
      action: 'park-walk',
      prompt: 'walk round the pond',
      spot: { x: 0, z: 3.6, reach: 1.4 },
      anchor: { x: 0, z: 3.4, heading: 0 },
      stages: [
        ...loop(10).map((at) => ({
          clip: 'stand' as const,
          seconds: 0.2,
          label: 'Walking round the pond',
          at,
        })),
        { clip: 'stretch', seconds: 2.5, label: 'A good stretch' },
      ],
    },
    {
      id: 'run',
      action: 'park-run',
      prompt: 'run a lap of the loop',
      spot: { x: 5.6, z: 1.6, reach: 1.2 },
      anchor: { x: 5.4, z: 1.2, heading: 0 },
      stages: [
        ...loop(12).map((at) => ({
          clip: 'stand' as const,
          seconds: 0.05,
          label: 'Running the loop',
          at,
          run: true,
        })),
        { clip: 'squat', seconds: 2.6, label: 'Catching your breath' },
      ],
      sounds: [{ at: 0.2, id: 'breath' }],
      effects: [
        { kind: 'breath', from: 0, to: 3.2, at: [0, 0.05, -0.3], follow: 'right' },
      ],
    },
    {
      // The wedding (see interiors/Wedding.tsx): under the arch, facing each other.
      id: 'date-wedding',
      action: null,
      prompt: 'the wedding',
      spot: { x: 7, z: -3.75, reach: 0 },
      anchor: { x: 7, z: -3.75, heading: 0 },
      view: 'side',
      stages: [{ clip: 'stand', seconds: 6, label: 'The ceremony' }],
    },
    {
      id: 'date-dance',
      action: null,
      prompt: 'the first dance',
      spot: { x: 7, z: -3.75, reach: 0 },
      anchor: { x: 7, z: -3.75, heading: 0 },
      view: 'side',
      stages: [{ clip: 'stand', seconds: 9, label: 'Your first dance' }],
    },
    {
      // Saying goodnight after a date: standing face to face (see npc/moment.ts).
      id: 'date-goodnight-park',
      action: null,
      prompt: 'say goodnight',
      spot: { x: -3.7, z: 1.3, reach: 0 },
      anchor: { x: -3.7, z: 1.3, heading: -Math.PI / 2 },
      view: 'side',
      stages: [{ clip: 'stand', seconds: 4.5, label: 'Saying goodnight' }],
    },
    {
      // On a date (see game/dates.ts): sitting together while they talk. Started by the
      // date, never offered by itself (nothing to reach); moving stands up.
      id: 'date-bench',
      action: null,
      prompt: 'sit with your date',
      spot: { x: -3.4, z: 2.05, reach: 0 },
      anchor: { x: -3.4, z: 2.05, heading: 0 },
      stages: [
        { clip: 'sit', seconds: 1.2, label: 'Sitting down together' },
        { clip: 'sit-relax', seconds: 600, label: 'On a date, on the bench' },
      ],
    },
    {
      id: 'bench',
      action: 'park-bench',
      prompt: 'sit on the bench',
      spot: { x: -3.4, z: 1.4, reach: 1.1 },
      anchor: { x: -3.4, z: 2.05, heading: 0 },
      stages: [
        { clip: 'sit', seconds: 1.2, label: 'Sitting down' },
        { clip: 'sit-relax', seconds: 14, label: 'Watching the world go by' },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Cog & Kerb
// ---------------------------------------------------------------------------

const COUNTER = { x: 3.4, z: 4.15, heading: 0 }

export const GARAGE: Layout = {
  size: { width: 14, depth: 10, height: 3.4 },
  start: { x: 1.2, z: 3.4, heading: 0 },
  surface: 'tile',
  boxes: [
    ...walls(14, 10),
    box(-1.8, -1.8, 1.6, 1.6),
    box(4, -1.2, 1.7, 1.4),
    box(-4.6, -3.2, 1.5, 0.6),
    box(3.4, 3.4, 1.35, 0.4),
    box(-5.6, 2.6, 0.9, 0.4),
  ],
  activities: [
    {
      id: 'buy-bike',
      action: 'buy-bike',
      prompt: 'buy a city bike',
      spot: { x: -4.6, z: -2.1, reach: 1.3 },
      anchor: { x: -4.6, z: -2.3, heading: 0 },
      stages: [
        { clip: 'reach', seconds: 1.4, label: 'Choosing a bike' },
        {
          clip: 'pay',
          seconds: 3,
          label: 'Paying at the counter',
          hold: { right: 'card' },
          at: COUNTER,
        },
      ],
      sounds: [{ at: 2.4, id: 'beep' }],
    },
    {
      id: 'sell-bike',
      action: 'sell-bike',
      prompt: 'sell your bike back',
      spot: { x: 3.4, z: 4.1, reach: 1.2 },
      anchor: COUNTER,
      stages: [{ clip: 'pay', seconds: 3, label: 'Handing the bike back' }],
      sounds: [{ at: 1.4, id: 'beep' }],
    },
    {
      id: 'lease-car',
      action: 'lease-car',
      prompt: 'lease the small car',
      spot: { x: -0.4, z: 0.3, reach: 1.6 },
      anchor: { x: -0.4, z: 0.1, heading: Math.PI / 4 },
      stages: [
        { clip: 'stand', seconds: 1.2, label: 'Looking the car over' },
        {
          clip: 'write',
          seconds: 3,
          label: 'Signing the lease at the counter',
          hold: { right: 'pen' },
          at: COUNTER,
        },
        { clip: 'reach', seconds: 1.2, label: 'Taking the keys' },
      ],
      sounds: [{ at: 4.2, id: 'beep' }],
    },
    {
      id: 'end-lease',
      action: 'end-lease',
      prompt: 'hand the car back',
      spot: { x: 3.4, z: 4.1, reach: 1.2 },
      anchor: COUNTER,
      stages: [{ clip: 'pay', seconds: 2.5, label: 'Handing back the keys' }],
    },
  ],
}
