/**
 * Homes and furniture. Each home has a rent, a distance from work and places
 * for furniture; each piece of furniture has a price, colours, and what it
 * does: unlock an activity, make one better, or make the home nicer to come
 * back to (which slows how fast fun falls). Prices in pence.
 */
import type { NeedId, RoomId } from './life'

export type HomeId = 'studio' | 'flat' | 'house'

/** A place for furniture: which slot, in which room, and where in the 3D home. */
export interface Place {
  slot: SlotId
  room: RoomId
  /** Position (x, z) and turn (radians) in the 3D home. */
  at: [number, number, number]
}

export interface Home {
  id: HomeId
  name: string
  description: string
  rent: number
  /** Minutes added to (or taken off) every commute. */
  commuteChange: number
  /** Floor size in the 3D view (width, depth), in metres. */
  size: [number, number]
  /** Where each room is (the camera looks at its centre). */
  rooms: Record<RoomId, [number, number]>
  places: Place[]
  /** Paid once to move in (a deposit and the move). */
  moveCost: number
}

export type SlotId =
  | 'bed'
  | 'sofa'
  | 'tv'
  | 'table'
  | 'desk'
  | 'kitchen'
  | 'coffee'
  | 'shower'
  | 'wardrobe'
  | 'shelf'
  | 'plant'
  | 'lamp'
  | 'rug'
  | 'console'
  | 'mat'

export const SLOT_NAMES: Record<SlotId, string> = {
  bed: 'Bed',
  sofa: 'Sofa',
  tv: 'Television',
  table: 'Dining table',
  desk: 'Desk',
  kitchen: 'Kitchen',
  coffee: 'Coffee machine',
  shower: 'Shower',
  wardrobe: 'Wardrobe',
  shelf: 'Bookshelf',
  plant: 'Plant',
  lamp: 'Lamp',
  rug: 'Rug',
  console: 'Games console',
  mat: 'Exercise mat',
}

const P = (slot: SlotId, room: RoomId, x: number, z: number, turn = 0): Place => ({
  slot,
  room,
  at: [x, z, turn],
})

export const HOMES: Home[] = [
  {
    id: 'studio',
    name: 'Studio on Mill Lane',
    description: 'One room with a kitchen corner and a shower room. Small, but yours.',
    rent: 16000,
    commuteChange: 0,
    size: [7, 6],
    rooms: {
      kitchen: [-2.2, -1.8],
      bathroom: [2.4, -1.9],
      bedroom: [2.1, 1.3],
      living: [-1.6, 1.2],
      door: [0, 2.7],
    },
    places: [
      P('kitchen', 'kitchen', -2.3, -2.6),
      P('coffee', 'kitchen', -1.2, -2.6),
      P('table', 'kitchen', -2.1, -1.2),
      P('shower', 'bathroom', 2.7, -2.3),
      P('bed', 'bedroom', 2.3, 1.2, Math.PI / 2),
      P('wardrobe', 'bedroom', 3.2, -0.4, -Math.PI / 2),
      P('sofa', 'living', -1.7, 1.9, Math.PI),
      P('tv', 'living', -1.7, 0.3),
      P('desk', 'living', 0.3, -0.6),
      P('shelf', 'living', -3.3, 0.6, Math.PI / 2),
      P('plant', 'living', -3.1, 2.5),
      P('lamp', 'bedroom', 1.0, 2.4),
      P('rug', 'living', -1.7, 1.1),
      P('console', 'living', -1.1, 0.35),
      P('mat', 'bedroom', 0.9, 0.7),
    ],
    moveCost: 0,
  },
  {
    id: 'flat',
    name: 'One-bedroom flat, Harbour Road',
    description:
      'A separate bedroom, a proper kitchen, and ten minutes nearer the office.',
    rent: 21500,
    commuteChange: -10,
    size: [9, 7],
    rooms: {
      kitchen: [-3, -2.2],
      bathroom: [3.4, -2.3],
      bedroom: [3, 1.5],
      living: [-2.2, 1.4],
      door: [0, 3.2],
    },
    places: [
      P('kitchen', 'kitchen', -3.1, -3.1),
      P('coffee', 'kitchen', -1.8, -3.1),
      P('table', 'kitchen', -2.7, -1.5),
      P('shower', 'bathroom', 3.7, -2.8),
      P('bed', 'bedroom', 3.3, 1.5, Math.PI / 2),
      P('wardrobe', 'bedroom', 4.2, -0.3, -Math.PI / 2),
      P('sofa', 'living', -2.3, 2.3, Math.PI),
      P('tv', 'living', -2.3, 0.5),
      P('desk', 'living', 0.4, -0.9),
      P('shelf', 'living', -4.3, 0.9, Math.PI / 2),
      P('plant', 'living', -4.0, 3.0),
      P('lamp', 'bedroom', 1.6, 2.9),
      P('rug', 'living', -2.3, 1.4),
      P('console', 'living', -1.6, 0.55),
      P('mat', 'bedroom', 1.6, 1.0),
    ],
    moveCost: 25000,
  },
  {
    id: 'house',
    name: 'Terraced house, Orchard Street',
    description: 'Space to spread out, a garden, and a short walk to work.',
    rent: 29500,
    commuteChange: -18,
    size: [11, 8],
    rooms: {
      kitchen: [-3.8, -2.5],
      bathroom: [4.2, -2.6],
      bedroom: [3.8, 1.7],
      living: [-2.8, 1.6],
      door: [0, 3.7],
    },
    places: [
      P('kitchen', 'kitchen', -3.9, -3.6),
      P('coffee', 'kitchen', -2.4, -3.6),
      P('table', 'kitchen', -3.4, -1.7),
      P('shower', 'bathroom', 4.6, -3.2),
      P('bed', 'bedroom', 4.1, 1.7, Math.PI / 2),
      P('wardrobe', 'bedroom', 5.2, -0.4, -Math.PI / 2),
      P('sofa', 'living', -2.9, 2.7, Math.PI),
      P('tv', 'living', -2.9, 0.6),
      P('desk', 'living', 0.6, -1.1),
      P('shelf', 'living', -5.3, 1.0, Math.PI / 2),
      P('plant', 'living', -5.0, 3.4),
      P('lamp', 'bedroom', 2.2, 3.3),
      P('rug', 'living', -2.9, 1.6),
      P('console', 'living', -2.2, 0.65),
      P('mat', 'bedroom', 2.2, 1.2),
    ],
    moveCost: 45000,
  },
]

export interface Furniture {
  id: string
  slot: SlotId
  name: string
  price: number
  colours: string[]
  /** What it does, in plain words (shown in the shop). */
  does: string
  /** Activities it makes possible (see life.ts HOME_ACTIONS). */
  enables?: string[]
  /** Extra need gained by an activity, e.g. a comfier sofa for a series. */
  better?: Array<{ action: string; needs: Partial<Record<NeedId, number>> }>
  /** Extra energy from a night's sleep (beds). */
  sleep?: number
  /** Makes home nicer: fun falls more slowly in the evening (points). */
  comfort?: number
}

export const FURNITURE: Furniture[] = [
  {
    id: 'bed-basic',
    slot: 'bed',
    name: 'Basic single bed',
    price: 9000,
    colours: ['#cbd5e1', '#a5b4fc'],
    does: 'Somewhere to sleep.',
  },
  {
    id: 'bed-comfy',
    slot: 'bed',
    name: 'Double bed with a good mattress',
    price: 42000,
    colours: ['#e2e8f0', '#fecaca', '#bbf7d0'],
    does: 'Better sleep: more energy every morning.',
    sleep: 8,
  },
  {
    id: 'sofa-small',
    slot: 'sofa',
    name: 'Two-seat sofa',
    price: 18000,
    colours: ['#64748b', '#9a3412', '#1e3a8a'],
    does: 'A comfortable evening: series are more fun.',
    better: [{ action: 'series', needs: { fun: 8 } }],
    comfort: 1,
  },
  {
    id: 'tv-small',
    slot: 'tv',
    name: 'Television',
    price: 22000,
    colours: ['#111827'],
    does: 'Watch series (without one, only on your phone).',
    better: [{ action: 'series', needs: { fun: 7 } }],
  },
  {
    id: 'table-small',
    slot: 'table',
    name: 'Table for two',
    price: 7000,
    colours: ['#d6c3a3', '#8a6a4a'],
    does: 'Cooking and eating properly is a little more enjoyable.',
    better: [{ action: 'cook', needs: { fun: 5 } }],
  },
  {
    id: 'desk-study',
    slot: 'desk',
    name: 'Study desk and chair',
    price: 15000,
    colours: ['#e3d3b8', '#ffffff'],
    does: 'Study in the evening: skill XP for your career.',
    enables: ['study'],
  },
  {
    id: 'kitchen-basic',
    slot: 'kitchen',
    name: 'Kitchenette',
    price: 0,
    colours: ['#e2e8f0'],
    does: 'A hob and a fridge.',
  },
  {
    id: 'kitchen-good',
    slot: 'kitchen',
    name: 'Fitted kitchen',
    price: 120000,
    colours: ['#f8fafc', '#1e293b', '#14532d'],
    does: 'Better meals: cooking fills you up more and is more fun.',
    better: [
      { action: 'cook', needs: { hunger: 10, fun: 8 } },
      { action: 'breakfast', needs: { hunger: 10 } },
    ],
    comfort: 2,
  },
  {
    id: 'coffee-machine',
    slot: 'coffee',
    name: 'Coffee machine',
    price: 8500,
    colours: ['#1f2937', '#b91c1c'],
    does: 'A proper coffee in the morning: more energy for the day.',
    enables: ['coffee'],
  },
  {
    id: 'shower-basic',
    slot: 'shower',
    name: 'Shower',
    price: 0,
    colours: ['#dbeafe'],
    does: 'Keeps you clean.',
  },
  {
    id: 'wardrobe',
    slot: 'wardrobe',
    name: 'Wardrobe',
    price: 11000,
    colours: ['#e3d3b8', '#ffffff', '#475569'],
    does: 'Work clothes ready to wear: getting dressed is quicker and less stressful.',
    better: [{ action: 'dress', needs: { fun: 2 } }],
    comfort: 1,
  },
  {
    id: 'shelf-books',
    slot: 'shelf',
    name: 'Bookshelf with books',
    price: 9500,
    colours: ['#8a6a4a', '#e3d3b8'],
    does: 'More to read: reading is more enjoyable.',
    better: [{ action: 'read', needs: { fun: 10 } }],
    comfort: 1,
  },
  {
    id: 'plant-big',
    slot: 'plant',
    name: 'Large house plant',
    price: 3500,
    colours: ['#3a7047'],
    does: 'Makes the place feel like home.',
    comfort: 1,
  },
  {
    id: 'lamp-floor',
    slot: 'lamp',
    name: 'Floor lamp',
    price: 4500,
    colours: ['#f59e0b', '#e2e8f0', '#0f172a'],
    does: 'Warm light in the evening.',
    comfort: 1,
  },
  {
    id: 'rug',
    slot: 'rug',
    name: 'Rug',
    price: 6000,
    colours: ['#b45309', '#1e3a8a', '#9d174d', '#14532d'],
    does: 'Softer and warmer underfoot.',
    comfort: 1,
  },
  {
    id: 'console',
    slot: 'console',
    name: 'Games console',
    price: 30000,
    colours: ['#111827', '#f8fafc'],
    does: 'Play games: lots of fun (and easy to lose track of time).',
    enables: ['games'],
  },
  {
    id: 'mat-yoga',
    slot: 'mat',
    name: 'Exercise mat',
    price: 2500,
    colours: ['#7c3aed', '#0d9488'],
    does: 'Stretch and do yoga at home: less stress.',
    enables: ['yoga'],
  },
]

/** What a new life starts with: the studio and the basics. */
export const STARTING_HOME: HomeId = 'studio'
export const STARTING_FURNITURE: Partial<Record<SlotId, string>> = {
  bed: 'bed-basic',
  kitchen: 'kitchen-basic',
  shower: 'shower-basic',
  table: 'table-small',
}

/** Second-hand furniture sells for this share of its price. */
export const RESALE = 0.4

export function getHome(id: string): Home {
  return HOMES.find((h) => h.id === id) ?? HOMES[0]
}

export function getFurniture(id: string): Furniture | undefined {
  return FURNITURE.find((f) => f.id === id)
}
