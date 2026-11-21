/**
 * The furniture and object library. Every entry has its real size, a
 * (fictional) price for budgets, a plan symbol, and a 3D build made of simple
 * parts that scale with the item's size, so a resized sofa is still a sofa.
 * No model files: everything is procedural and original.
 */

export const GROUPS = [
  { id: 'living', name: 'Living' },
  { id: 'bedroom', name: 'Bedroom' },
  { id: 'dining', name: 'Dining' },
  { id: 'kitchen', name: 'Kitchen' },
  { id: 'bathroom', name: 'Bathroom' },
  { id: 'office', name: 'Office' },
  { id: 'meeting', name: 'Meeting & reception' },
  { id: 'storage', name: 'Storage' },
  { id: 'lighting', name: 'Lighting' },
  { id: 'decor', name: 'Decoration' },
  { id: 'plants', name: 'Plants' },
  { id: 'outdoor', name: 'Outdoor' },
] as const
export type GroupId = (typeof GROUPS)[number]['id']

/** How the item is drawn on the plan. */
export type Symbol =
  | 'bed'
  | 'sofa'
  | 'chair'
  | 'table'
  | 'round'
  | 'desk'
  | 'cabinet'
  | 'wc'
  | 'bath'
  | 'basin'
  | 'shower'
  | 'sink'
  | 'hob'
  | 'appliance'
  | 'plant'
  | 'rug'
  | 'light'
  | 'screen'
  | 'plain'

/** The colour a part takes: the item's own colour and material, or a fixed one. */
export type Role =
  | 'main'
  | 'accent'
  | 'wood'
  | 'metal'
  | 'white'
  | 'black'
  | 'glass'
  | 'leaf'
  | 'soil'
  | 'glow'
  | 'screen'

/** One part of the 3D build, in mm: centred at (x, z) on the plan, from y up to y + sy. */
export interface Part {
  shape: 'box' | 'cylinder' | 'sphere'
  x: number
  y: number
  z: number
  sx: number
  sy: number
  sz: number
  role: Role
}

export interface CatalogEntry {
  id: string
  name: string
  group: GroupId
  width: number
  depth: number
  height: number
  /** £, fictional, supplied and installed. */
  price: number
  symbol: Symbol
  /** The 3D build. */
  build: Builder
  colour: string
  material?: string
  /** Search words. */
  tags: string[]
  /** Raised above the floor by default (wall cabinets, wall lights), mm. */
  elevation?: number
  /** Gives light (shown lit at night). */
  light?: boolean
  /** Does not block the way (rugs, ceiling lights). */
  walkable?: boolean
  /** Fixed to the building (counted as fit-out, not loose furniture). */
  fixture?: boolean
}

type Builder = (w: number, d: number, h: number) => Part[]

const box = (
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  role: Role = 'main',
): Part => ({ shape: 'box', x, y, z, sx, sy, sz, role })
const cyl = (
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  role: Role = 'main',
): Part => ({ shape: 'cylinder', x, y, z, sx, sy, sz, role })
const ball = (x: number, y: number, z: number, s: number, role: Role = 'main'): Part => ({
  shape: 'sphere',
  x,
  y,
  z,
  sx: s,
  sy: s,
  sz: s,
  role,
})

/** Four legs inset from the corners. */
const legs = (
  w: number,
  d: number,
  h: number,
  t = 40,
  inset = 40,
  role: Role = 'wood',
): Part[] =>
  [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([i, j]) =>
    box(i * (w / 2 - inset - t / 2), 0, j * (d / 2 - inset - t / 2), t, h, t, role),
  )

const B: Record<string, Builder> = {
  block: (w, d, h) => [box(0, 0, 0, w, h, d)],
  table: (w, d, h) => [box(0, h - 30, 0, w, 30, d, 'main'), ...legs(w, d, h - 30)],
  roundTable: (w, d, h) => [
    cyl(0, h - 30, 0, w, 30, d, 'main'),
    cyl(0, 0, 0, 70, h - 30, 70, 'metal'),
    cyl(0, 0, 0, w * 0.5, 20, d * 0.5, 'metal'),
  ],
  chair: (w, d, h) => [
    box(0, 430, 0, w, 50, d),
    box(0, 480, -d / 2 + 25, w, h - 480, 50),
    ...legs(w, d, 430, 30, 20, 'metal'),
  ],
  officeChair: (w, d, h) => [
    box(0, 450, 0, w * 0.9, 70, d * 0.85, 'main'),
    box(0, 520, -d / 2 + 60, w * 0.85, h - 520, 60, 'main'),
    cyl(0, 80, 0, 60, 370, 60, 'metal'),
    cyl(0, 0, 0, w, 80, d, 'black'),
  ],
  stool: (w, d, h) => [
    cyl(0, h - 50, 0, w, 50, d),
    cyl(0, 0, 0, 50, h - 50, 50, 'metal'),
    cyl(0, 0, 0, w * 0.8, 20, d * 0.8, 'metal'),
  ],
  sofa: (w, d, h) => [
    box(0, 100, 50, w - 200, 330, d - 100),
    box(0, 100, -d / 2 + 100, w, h - 100, 200),
    box(-w / 2 + 100, 100, 0, 200, 600 - 100, d),
    box(w / 2 - 100, 100, 0, 200, 600 - 100, d),
    ...legs(w, d, 100, 40, 60, 'black'),
  ],
  armchair: (w, d, h) => [
    box(0, 120, 60, w - 220, 320, d - 120),
    box(0, 120, -d / 2 + 90, w, h - 120, 180),
    box(-w / 2 + 110, 120, 0, 220, 480, d),
    box(w / 2 - 110, 120, 0, 220, 480, d),
    ...legs(w, d, 120, 40, 50, 'wood'),
  ],
  bed: (w, d, h) => [
    box(0, 0, 0, w, 300, d, 'wood'),
    box(0, 300, 50, w - 60, 220, d - 160, 'white'),
    box(0, 0, -d / 2 + 40, w, h, 80, 'main'),
    box(-w / 4, 520, -d / 2 + 260, w / 2 - 120, 120, 360, 'white'),
    box(w / 4, 520, -d / 2 + 260, w / 2 - 120, 120, 360, 'white'),
    box(0, 520, d / 6, w - 50, 40, d * 0.6, 'accent'),
  ],
  cabinet: (w, d, h) => [
    box(0, 60, 0, w, h - 60, d),
    box(0, 0, 0, w - 40, 60, d - 40, 'black'),
    box(0, h * 0.55, d / 2 + 5, w * 0.12, 20, 20, 'metal'),
  ],
  wardrobe: (w, d, h) => [
    box(0, 0, 0, w, h, d),
    box(-w / 4 + 40, h * 0.5, d / 2 + 5, 20, 300, 20, 'metal'),
    box(w / 4 - 40, h * 0.5, d / 2 + 5, 20, 300, 20, 'metal'),
    box(0, 0, d / 2 + 2, 6, h, 6, 'black'),
  ],
  shelf: (w, d, h) => {
    const parts: Part[] = [
      box(-w / 2 + 15, 0, 0, 30, h, d, 'main'),
      box(w / 2 - 15, 0, 0, 30, h, d, 'main'),
    ]
    for (let i = 0; i <= 4; i++)
      parts.push(box(0, (i * (h - 30)) / 4, 0, w, 30, d, 'main'))
    for (let i = 0; i < 4; i++)
      parts.push(
        box(
          -w / 4 + (i % 2) * w * 0.4,
          (i * (h - 30)) / 4 + 30,
          0,
          w * 0.25,
          (h - 150) / 4 - 40,
          d * 0.7,
          'accent',
        ),
      )
    return parts
  },
  desk: (w, d, h) => [
    box(0, h - 30, 0, w, 30, d, 'main'),
    box(-w / 2 + 30, 0, 0, 40, h - 30, d - 60, 'metal'),
    box(w / 2 - 30, 0, 0, 40, h - 30, d - 60, 'metal'),
    box(0, h * 0.35, -d / 2 + 40, w - 100, h * 0.4, 20, 'metal'),
  ],
  deskWithScreen: (w, d, h) => [
    ...B.desk(w, d, h),
    box(0, h, -d / 4, 560, 340, 30, 'screen'),
    box(0, h, -d / 4 + 40, 80, 120, 80, 'black'),
    box(0, h, d / 8, 440, 20, 140, 'black'),
  ],
  receptionDesk: (w, d, h) => [
    box(0, 0, d / 2 - 40, w, h, 80, 'main'),
    box(0, h, d / 2 - 80, w + 40, 30, 200, 'accent'),
    box(0, 720, -60, w - 100, 30, d - 120, 'wood'),
    box(-w / 2 + 40, 0, 0, 80, h, d, 'main'),
    box(w / 2 - 40, 0, 0, 80, h, d, 'main'),
  ],
  counter: (w, d, h) => [
    box(0, 100, 0, w, h - 140, d - 20, 'main'),
    box(0, h - 40, 0, w, 40, d, 'accent'),
    box(0, 0, -20, w, 100, d - 60, 'black'),
  ],
  sinkUnit: (w, d, h) => [
    ...B.counter(w, d, h),
    box(0, h - 10, 20, w * 0.5, 15, d * 0.55, 'metal'),
    cyl(0, h, -d / 2 + 90, 30, 250, 30, 'metal'),
  ],
  hobUnit: (w, d, h) => [
    ...B.counter(w, d, h),
    box(0, h - 5, 0, w * 0.8, 10, d * 0.75, 'black'),
  ],
  tall: (w, d, h) => [
    box(0, 0, 0, w, h, d),
    box(w / 2 - 50, h * 0.45, d / 2 + 10, 20, h * 0.35, 25, 'metal'),
  ],
  bath: (w, d, h) => [
    box(0, 0, 0, w, h, d, 'white'),
    box(0, h - 40, 0, w - 140, 45, d - 140, 'glass'),
  ],
  shower: (w, d, h) => [
    box(0, 0, 0, w, 60, d, 'white'),
    box(0, 60, d / 2 - 5, w, h - 60, 10, 'glass'),
    box(w / 2 - 5, 60, 0, 10, h - 60, d, 'glass'),
    cyl(0, h - 200, -d / 2 + 60, 200, 20, 200, 'metal'),
  ],
  wc: (w, d, h) => [
    box(0, 0, -d / 2 + 90, w, h, 180, 'white'),
    cyl(0, 0, 60, w * 0.9, 400, d * 0.65, 'white'),
  ],
  basin: (w, d, h) => [
    box(0, h - 150, 0, w, 150, d, 'white'),
    box(0, 0, -d / 2 + 60, 200, h - 150, 120, 'white'),
    cyl(0, h, -d / 2 + 60, 30, 180, 30, 'metal'),
  ],
  vanity: (w, d, h) => [
    box(0, 150, 0, w, h - 300, d, 'main'),
    box(0, h - 150, 0, w, 150, d, 'white'),
    cyl(0, h, -d / 2 + 60, 30, 180, 30, 'metal'),
  ],
  floorLamp: (w, d, h) => [
    cyl(0, 0, 0, w * 0.8, 30, d * 0.8, 'metal'),
    cyl(0, 30, 0, 30, h - 330, 30, 'metal'),
    cyl(0, h - 300, 0, w, 300, d, 'glow'),
  ],
  tableLamp: (w, d, h) => [
    cyl(0, 0, 0, w * 0.6, 30, d * 0.6, 'metal'),
    cyl(0, 30, 0, 20, h * 0.5, 20, 'metal'),
    cyl(0, h * 0.5, 0, w, h * 0.5, d, 'glow'),
  ],
  pendant: (w, d, h) => [
    cyl(0, 0, 0, 10, 600, 10, 'black'),
    cyl(0, -h, 0, w, h, d, 'glow'),
  ],
  ceilingLight: (w, d, h) => [cyl(0, 0, 0, w, h, d, 'glow')],
  wallLight: (w, d, h) => [
    box(0, 0, -d / 2 + 15, w * 0.5, h, 30, 'metal'),
    box(0, 0, 0, w, h * 0.8, d * 0.7, 'glow'),
  ],
  plant: (w, d, h) => [
    cyl(0, 0, 0, w * 0.6, h * 0.3, d * 0.6, 'main'),
    ball(0, h * 0.3, 0, Math.min(w, h * 0.7), 'leaf'),
    ball(w * 0.15, h * 0.55, 0, Math.min(w, h * 0.5) * 0.8, 'leaf'),
  ],
  tree: (w, _d, h) => [
    cyl(0, 0, 0, 160, h * 0.45, 160, 'wood'),
    ball(0, h * 0.4, 0, Math.min(w, h * 0.65), 'leaf'),
  ],
  rug: (w, d, h) => [box(0, 0, 0, w, h, d)],
  tv: (w, d, h) => [
    box(0, 0, 0, w * 0.35, 40, d, 'black'),
    box(0, 40, 0, 60, 120, 60, 'black'),
    box(0, 160, 0, w, h - 160, 40, 'screen'),
  ],
  mediaUnit: (w, d, h) => [
    box(0, 80, 0, w, h - 80, d),
    ...legs(w, d, 80, 30, 40, 'metal'),
  ],
  printer: (w, d, h) => [
    box(0, 0, 0, w, h * 0.75, d, 'white'),
    box(0, h * 0.75, -d / 6, w * 0.9, h * 0.25, d * 0.6, 'black'),
  ],
  whiteboard: (w, d, h) => [
    box(0, h * 0.35, 0, w, h * 0.65, d, 'white'),
    box(-w / 2 + 20, 0, 0, 40, h, 40, 'metal'),
    box(w / 2 - 20, 0, 0, 40, h, 40, 'metal'),
  ],
  artwork: (w, d, h) => [
    box(0, 0, 0, w, h, d, 'accent'),
    box(0, 30, d / 2, w - 60, h - 60, 4, 'main'),
  ],
  mirror: (w, d, h) => [
    box(0, 0, 0, w, h, d, 'metal'),
    box(0, 25, d / 2, w - 50, h - 50, 4, 'glass'),
  ],
  bench: (w, d, h) => [
    box(0, h - 60, 0, w, 60, d, 'wood'),
    box(-w / 2 + 80, 0, 0, 60, h - 60, d - 40, 'metal'),
    box(w / 2 - 80, 0, 0, 60, h - 60, d - 40, 'metal'),
  ],
  parasol: (w, d, h) => [
    cyl(0, 0, 0, 400, 60, 400, 'black'),
    cyl(0, 60, 0, 40, h - 260, 40, 'metal'),
    cyl(0, h - 260, 0, w, 200, d, 'main'),
  ],
  planter: (w, d, h) => [
    box(0, 0, 0, w, h * 0.5, d, 'main'),
    ball(0, h * 0.45, 0, Math.min(w, d), 'leaf'),
  ],
  bbq: (w, d, h) => [
    box(0, 0, 0, w, h - 150, d, 'black'),
    box(0, h - 150, 0, w, 150, d * 0.9, 'metal'),
  ],
  server: (w, d, h) => [
    box(0, 0, 0, w, h, d, 'black'),
    box(0, h * 0.1, d / 2 + 2, w * 0.8, h * 0.8, 4, 'glass'),
  ],
  partition: (w, d, h) => [
    box(0, 0, 0, w, h, d, 'main'),
    box(0, 0, 0, w, 30, d + 20, 'metal'),
  ],
  piano: (w, d, h) => [
    box(0, 0, -d / 4, w, h, d / 2, 'black'),
    box(0, 700, d / 4, w, 30, d / 2, 'black'),
    box(0, 730, d / 8, w * 0.9, 20, d / 4, 'white'),
  ],
}

const e = (
  id: string,
  name: string,
  group: GroupId,
  size: [number, number, number],
  price: number,
  symbol: Symbol,
  build: keyof typeof B,
  colour: string,
  tags: string[],
  extra: Partial<CatalogEntry> = {},
): CatalogEntry => ({
  id,
  name,
  group,
  width: size[0],
  depth: size[1],
  height: size[2],
  price,
  symbol,
  build: B[build],
  colour,
  tags,
  ...extra,
})

export const CATALOG: CatalogEntry[] = [
  // Living
  e(
    'sofa-2',
    'Sofa, two-seat',
    'living',
    [1600, 900, 820],
    850,
    'sofa',
    'sofa',
    '#7a8792',
    ['couch', 'settee', 'seating'],
    { material: 'fabric-linen' },
  ),
  e(
    'sofa-3',
    'Sofa, three-seat',
    'living',
    [2200, 950, 820],
    1200,
    'sofa',
    'sofa',
    '#55606b',
    ['couch', 'settee', 'seating'],
    { material: 'fabric-charcoal' },
  ),
  e(
    'armchair',
    'Armchair',
    'living',
    [850, 850, 850],
    520,
    'sofa',
    'armchair',
    '#3e6250',
    ['chair', 'seating', 'lounge'],
    { material: 'fabric-velvet-green' },
  ),
  e(
    'coffee-table',
    'Coffee table',
    'living',
    [1100, 600, 420],
    260,
    'table',
    'table',
    '#c49a6c',
    ['table', 'low'],
    { material: 'oak-boards' },
  ),
  e(
    'side-table',
    'Side table',
    'living',
    [450, 450, 550],
    120,
    'round',
    'roundTable',
    '#6f4e37',
    ['table', 'small'],
  ),
  e(
    'tv-unit',
    'Media unit',
    'living',
    [1800, 450, 500],
    380,
    'cabinet',
    'mediaUnit',
    '#e3cfa8',
    ['tv', 'storage', 'sideboard'],
    { material: 'birch-ply' },
  ),
  e('tv', 'Television, 55"', 'living', [1250, 250, 800], 600, 'screen', 'tv', '#222222', [
    'screen',
    'media',
  ]),
  e(
    'bookcase',
    'Bookcase',
    'living',
    [900, 350, 2000],
    290,
    'cabinet',
    'shelf',
    '#c49a6c',
    ['shelves', 'books', 'storage'],
  ),
  e(
    'piano',
    'Upright piano',
    'living',
    [1500, 600, 1250],
    3200,
    'cabinet',
    'piano',
    '#1c1c1c',
    ['music', 'instrument'],
  ),
  // Bedroom
  e(
    'bed-double',
    'Double bed',
    'bedroom',
    [1400, 2000, 1000],
    650,
    'bed',
    'bed',
    '#8b6f56',
    ['bed', 'sleep'],
    { material: 'walnut-boards' },
  ),
  e(
    'bed-king',
    'King-size bed',
    'bedroom',
    [1600, 2100, 1050],
    900,
    'bed',
    'bed',
    '#8b6f56',
    ['bed', 'sleep', 'king'],
  ),
  e(
    'bed-single',
    'Single bed',
    'bedroom',
    [900, 2000, 900],
    350,
    'bed',
    'bed',
    '#c49a6c',
    ['bed', 'sleep', 'child'],
  ),
  e(
    'bedside',
    'Bedside table',
    'bedroom',
    [450, 400, 500],
    110,
    'cabinet',
    'cabinet',
    '#c49a6c',
    ['nightstand', 'table'],
  ),
  e(
    'wardrobe',
    'Wardrobe',
    'bedroom',
    [1200, 600, 2100],
    700,
    'cabinet',
    'wardrobe',
    '#e9e5dc',
    ['closet', 'storage', 'clothes'],
  ),
  e(
    'chest',
    'Chest of drawers',
    'bedroom',
    [900, 500, 850],
    320,
    'cabinet',
    'cabinet',
    '#e9e5dc',
    ['drawers', 'dresser', 'storage'],
  ),
  e(
    'dressing-table',
    'Dressing table',
    'bedroom',
    [1000, 450, 750],
    280,
    'desk',
    'table',
    '#d9c3a0',
    ['vanity', 'desk'],
  ),
  // Dining
  e(
    'dining-table-4',
    'Dining table, four seats',
    'dining',
    [1200, 800, 750],
    450,
    'table',
    'table',
    '#c49a6c',
    ['table', 'eat'],
    { material: 'oak-boards' },
  ),
  e(
    'dining-table-6',
    'Dining table, six seats',
    'dining',
    [1800, 900, 750],
    650,
    'table',
    'table',
    '#6f4e37',
    ['table', 'eat'],
    { material: 'walnut-boards' },
  ),
  e(
    'round-table',
    'Round table',
    'dining',
    [1100, 1100, 750],
    420,
    'round',
    'roundTable',
    '#e3cfa8',
    ['table', 'cafe'],
  ),
  e(
    'dining-chair',
    'Dining chair',
    'dining',
    [450, 500, 850],
    95,
    'chair',
    'chair',
    '#2b2b2d',
    ['chair', 'seat'],
  ),
  e(
    'bar-stool',
    'Bar stool',
    'dining',
    [400, 400, 750],
    85,
    'round',
    'stool',
    '#2b2b2d',
    ['stool', 'seat', 'counter'],
  ),
  e(
    'sideboard',
    'Sideboard',
    'dining',
    [1600, 450, 800],
    520,
    'cabinet',
    'cabinet',
    '#6f4e37',
    ['storage', 'buffet'],
  ),
  // Kitchen
  e(
    'base-unit',
    'Base cabinet, 600 mm',
    'kitchen',
    [600, 600, 900],
    260,
    'cabinet',
    'counter',
    '#f4f1ea',
    ['cupboard', 'worktop', 'counter'],
    { fixture: true },
  ),
  e(
    'base-unit-1000',
    'Base cabinet, 1000 mm',
    'kitchen',
    [1000, 600, 900],
    380,
    'cabinet',
    'counter',
    '#f4f1ea',
    ['cupboard', 'worktop', 'counter'],
    { fixture: true },
  ),
  e(
    'sink-unit',
    'Sink unit',
    'kitchen',
    [1000, 600, 900],
    520,
    'sink',
    'sinkUnit',
    '#f4f1ea',
    ['sink', 'tap', 'washing'],
    { fixture: true },
  ),
  e(
    'hob-unit',
    'Hob and oven',
    'kitchen',
    [600, 600, 900],
    750,
    'hob',
    'hobUnit',
    '#f4f1ea',
    ['cooker', 'stove', 'oven'],
    { fixture: true },
  ),
  e(
    'fridge',
    'Fridge freezer',
    'kitchen',
    [600, 650, 1850],
    650,
    'appliance',
    'tall',
    '#d9dcdf',
    ['refrigerator', 'appliance', 'cold'],
    { fixture: true },
  ),
  e(
    'dishwasher',
    'Dishwasher',
    'kitchen',
    [600, 600, 850],
    420,
    'appliance',
    'counter',
    '#d9dcdf',
    ['appliance', 'washing'],
  ),
  e(
    'tall-unit',
    'Tall larder unit',
    'kitchen',
    [600, 600, 2100],
    480,
    'cabinet',
    'tall',
    '#f4f1ea',
    ['pantry', 'larder', 'storage'],
    { fixture: true },
  ),
  e(
    'wall-unit',
    'Wall cabinet',
    'kitchen',
    [800, 350, 700],
    180,
    'cabinet',
    'cabinet',
    '#f4f1ea',
    ['cupboard', 'wall'],
    { elevation: 1450, walkable: true, fixture: true },
  ),
  e(
    'island',
    'Kitchen island',
    'kitchen',
    [1800, 900, 900],
    1400,
    'cabinet',
    'counter',
    '#2f3d5c',
    ['island', 'worktop', 'breakfast bar'],
    { fixture: true },
  ),
  // Bathroom
  e(
    'bath',
    'Bath',
    'bathroom',
    [1700, 750, 560],
    600,
    'bath',
    'bath',
    '#ffffff',
    ['bathtub', 'tub'],
    { fixture: true },
  ),
  e(
    'shower',
    'Shower enclosure',
    'bathroom',
    [900, 900, 2000],
    750,
    'shower',
    'shower',
    '#ffffff',
    ['shower', 'cubicle'],
    { fixture: true },
  ),
  e(
    'wc',
    'Toilet',
    'bathroom',
    [380, 650, 800],
    280,
    'wc',
    'wc',
    '#ffffff',
    ['toilet', 'wc', 'loo'],
    { fixture: true },
  ),
  e(
    'basin',
    'Basin',
    'bathroom',
    [550, 450, 850],
    220,
    'basin',
    'basin',
    '#ffffff',
    ['sink', 'washbasin'],
    { fixture: true },
  ),
  e(
    'vanity',
    'Vanity unit with basin',
    'bathroom',
    [800, 480, 850],
    480,
    'basin',
    'vanity',
    '#6f4e37',
    ['sink', 'basin', 'storage'],
    { fixture: true },
  ),
  e(
    'mirror',
    'Mirror',
    'bathroom',
    [600, 30, 800],
    90,
    'plain',
    'mirror',
    '#b4b8bc',
    ['mirror', 'wall'],
    { elevation: 1100, walkable: true },
  ),
  // Office
  e('desk', 'Desk', 'office', [1400, 700, 740], 320, 'desk', 'desk', '#e3cfa8', [
    'desk',
    'work',
    'table',
  ]),
  e(
    'workstation',
    'Workstation with monitor',
    'office',
    [1600, 800, 740],
    900,
    'desk',
    'deskWithScreen',
    '#f4f1ea',
    ['desk', 'computer', 'monitor', 'workstation'],
  ),
  e(
    'office-chair',
    'Office chair',
    'office',
    [650, 650, 1100],
    260,
    'chair',
    'officeChair',
    '#2b2b2d',
    ['chair', 'task chair', 'seat'],
  ),
  e(
    'filing-cabinet',
    'Filing cabinet',
    'office',
    [470, 620, 1320],
    230,
    'cabinet',
    'cabinet',
    '#9aa0a6',
    ['files', 'storage', 'drawers'],
  ),
  e(
    'printer',
    'Printer',
    'office',
    [600, 600, 1100],
    1500,
    'appliance',
    'printer',
    '#e8e8e8',
    ['copier', 'printer', 'scanner'],
  ),
  e(
    'server-rack',
    'Server cabinet',
    'office',
    [600, 1000, 2000],
    2200,
    'appliance',
    'server',
    '#1c1c1c',
    ['server', 'rack', 'network'],
  ),
  e(
    'whiteboard',
    'Whiteboard',
    'office',
    [1800, 500, 1900],
    240,
    'screen',
    'whiteboard',
    '#ffffff',
    ['board', 'meeting'],
  ),
  e(
    'partition-screen',
    'Desk screen',
    'office',
    [1600, 60, 1500],
    180,
    'plain',
    'partition',
    '#46597a',
    ['screen', 'divider', 'acoustic'],
  ),
  e(
    'locker',
    'Lockers',
    'office',
    [900, 450, 1800],
    380,
    'cabinet',
    'wardrobe',
    '#5d6b7a',
    ['locker', 'storage'],
  ),
  // Meeting & reception
  e(
    'meeting-table',
    'Meeting table, eight seats',
    'meeting',
    [2400, 1100, 740],
    1100,
    'table',
    'table',
    '#f4f1ea',
    ['boardroom', 'conference', 'table'],
  ),
  e(
    'reception-desk',
    'Reception desk',
    'meeting',
    [2000, 800, 1100],
    2400,
    'desk',
    'receptionDesk',
    '#e9e5dc',
    ['reception', 'front desk', 'counter'],
  ),
  e(
    'lounge-chair',
    'Lounge chair',
    'meeting',
    [750, 750, 800],
    450,
    'sofa',
    'armchair',
    '#a0673f',
    ['waiting', 'chair', 'seating'],
    { material: 'leather-tan' },
  ),
  e(
    'waiting-bench',
    'Waiting bench',
    'meeting',
    [1800, 500, 450],
    420,
    'plain',
    'bench',
    '#c49a6c',
    ['bench', 'waiting', 'seating'],
  ),
  e(
    'display-screen',
    'Wall display',
    'meeting',
    [1650, 80, 1000],
    1200,
    'screen',
    'tv',
    '#1c1c1c',
    ['tv', 'screen', 'presentation'],
    { elevation: 900, walkable: true },
  ),
  // Storage
  e(
    'shelving',
    'Shelving unit',
    'storage',
    [1000, 400, 1800],
    150,
    'cabinet',
    'shelf',
    '#9aa0a6',
    ['shelves', 'rack', 'storage'],
  ),
  e(
    'cupboard',
    'Cupboard',
    'storage',
    [800, 450, 1800],
    340,
    'cabinet',
    'wardrobe',
    '#e9e5dc',
    ['storage', 'closet'],
  ),
  e(
    'coat-rack',
    'Coat stand',
    'storage',
    [450, 450, 1750],
    70,
    'round',
    'floorLamp',
    '#2b2b2d',
    ['coats', 'hall'],
  ),
  // Lighting
  e(
    'ceiling-light',
    'Ceiling light',
    'lighting',
    [400, 400, 80],
    90,
    'light',
    'ceilingLight',
    '#fff6dd',
    ['lamp', 'downlight', 'light'],
    { light: true, walkable: true, elevation: 2320 },
  ),
  e(
    'pendant',
    'Pendant light',
    'lighting',
    [450, 450, 300],
    140,
    'light',
    'pendant',
    '#fff6dd',
    ['lamp', 'hanging', 'light'],
    { light: true, walkable: true, elevation: 2000 },
  ),
  e(
    'floor-lamp',
    'Floor lamp',
    'lighting',
    [400, 400, 1600],
    150,
    'light',
    'floorLamp',
    '#fff6dd',
    ['lamp', 'standing', 'light'],
    { light: true },
  ),
  e(
    'table-lamp',
    'Table lamp',
    'lighting',
    [300, 300, 450],
    60,
    'light',
    'tableLamp',
    '#fff6dd',
    ['lamp', 'light'],
    { light: true, walkable: true, elevation: 750 },
  ),
  e(
    'wall-light',
    'Wall light',
    'lighting',
    [250, 150, 250],
    75,
    'light',
    'wallLight',
    '#fff6dd',
    ['sconce', 'lamp', 'light'],
    { light: true, walkable: true, elevation: 1700 },
  ),
  // Decoration
  e(
    'rug',
    'Rug',
    'decor',
    [2000, 1400, 10],
    240,
    'rug',
    'rug',
    '#b98a6a',
    ['carpet', 'mat'],
    { walkable: true },
  ),
  e(
    'rug-round',
    'Round rug',
    'decor',
    [1600, 1600, 10],
    200,
    'rug',
    'rug',
    '#8a9a8a',
    ['carpet', 'mat'],
    { walkable: true },
  ),
  e(
    'artwork',
    'Framed artwork',
    'decor',
    [900, 30, 650],
    160,
    'plain',
    'artwork',
    '#2b2b2d',
    ['picture', 'painting', 'art'],
    { elevation: 1300, walkable: true },
  ),
  e(
    'cushions',
    'Floor cushions',
    'decor',
    [600, 600, 200],
    60,
    'round',
    'block',
    '#c0714f',
    ['pouf', 'cushion'],
  ),
  // Plants
  e(
    'plant-large',
    'Large plant',
    'plants',
    [600, 600, 1600],
    120,
    'plant',
    'plant',
    '#c0714f',
    ['plant', 'tree', 'green'],
  ),
  e(
    'plant-small',
    'Small plant',
    'plants',
    [300, 300, 450],
    30,
    'plant',
    'plant',
    '#f4f1ea',
    ['plant', 'green', 'pot'],
    { walkable: true },
  ),
  e(
    'planter',
    'Planter box',
    'plants',
    [1200, 400, 700],
    180,
    'plant',
    'planter',
    '#4a5058',
    ['planter', 'green', 'trough'],
  ),
  // Outdoor
  e('tree', 'Tree', 'outdoor', [3000, 3000, 5000], 450, 'plant', 'tree', '#4f7d3a', [
    'tree',
    'garden',
  ]),
  e(
    'garden-bench',
    'Garden bench',
    'outdoor',
    [1500, 600, 450],
    260,
    'plain',
    'bench',
    '#9b7653',
    ['bench', 'seat', 'garden'],
  ),
  e(
    'outdoor-table',
    'Outdoor table',
    'outdoor',
    [1200, 1200, 740],
    320,
    'round',
    'roundTable',
    '#4a5058',
    ['table', 'patio', 'garden'],
  ),
  e(
    'parasol',
    'Parasol',
    'outdoor',
    [2500, 2500, 2400],
    180,
    'round',
    'parasol',
    '#e9e5dc',
    ['umbrella', 'shade'],
  ),
  e('bbq', 'Barbecue', 'outdoor', [1200, 600, 1100], 400, 'appliance', 'bbq', '#2b2b2d', [
    'grill',
    'cooking',
  ]),
]

const BY_ID = new Map(CATALOG.map((c) => [c.id, c]))

export function catalogEntry(id: string): CatalogEntry | undefined {
  return BY_ID.get(id)
}

/** Entries matching the words (name, group or tags), optionally in one group. */
export function searchCatalog(query: string, group?: GroupId | null): CatalogEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return CATALOG.filter((c) => {
    if (group && c.group !== group) return false
    const hay = `${c.name} ${c.group} ${c.tags.join(' ')}`.toLowerCase()
    return words.every((w) => hay.includes(w))
  })
}

/** Doors and windows in the library: presets for the opening tools. */
export interface OpeningPreset {
  id: string
  name: string
  kind: 'door' | 'window' | 'pass'
  width: number
  height: number
  sill: number
  style: string
  price: number
}

export const OPENING_PRESETS: OpeningPreset[] = [
  {
    id: 'door-single',
    name: 'Internal door',
    kind: 'door',
    width: 900,
    height: 2040,
    sill: 0,
    style: 'single',
    price: 320,
  },
  {
    id: 'door-wide',
    name: 'Accessible door, 926 mm',
    kind: 'door',
    width: 926,
    height: 2040,
    sill: 0,
    style: 'single',
    price: 420,
  },
  {
    id: 'door-double',
    name: 'Double doors',
    kind: 'door',
    width: 1500,
    height: 2100,
    sill: 0,
    style: 'double',
    price: 780,
  },
  {
    id: 'door-sliding',
    name: 'Sliding glass doors',
    kind: 'door',
    width: 2400,
    height: 2100,
    sill: 0,
    style: 'sliding',
    price: 1650,
  },
  {
    id: 'door-front',
    name: 'Front door',
    kind: 'door',
    width: 1010,
    height: 2100,
    sill: 0,
    style: 'single',
    price: 950,
  },
  {
    id: 'window-casement',
    name: 'Casement window',
    kind: 'window',
    width: 1200,
    height: 1200,
    sill: 900,
    style: 'casement',
    price: 520,
  },
  {
    id: 'window-wide',
    name: 'Wide window',
    kind: 'window',
    width: 1800,
    height: 1350,
    sill: 750,
    style: 'casement',
    price: 780,
  },
  {
    id: 'window-small',
    name: 'Small window',
    kind: 'window',
    width: 600,
    height: 600,
    sill: 1500,
    style: 'casement',
    price: 260,
  },
  {
    id: 'window-full',
    name: 'Full-height glazing',
    kind: 'window',
    width: 2000,
    height: 2300,
    sill: 100,
    style: 'fixed',
    price: 1500,
  },
  {
    id: 'window-sash',
    name: 'Sash window',
    kind: 'window',
    width: 900,
    height: 1500,
    sill: 800,
    style: 'sash',
    price: 640,
  },
  {
    id: 'pass-arch',
    name: 'Open pass-through',
    kind: 'pass',
    width: 1200,
    height: 2100,
    sill: 0,
    style: 'single',
    price: 150,
  },
]

export function openingPreset(id: string): OpeningPreset | undefined {
  return OPENING_PRESETS.find((p) => p.id === id)
}
