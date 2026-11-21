/**
 * Finishes for walls, floors, ceilings, furniture and roofs. Each is drawn
 * procedurally (a colour, a roughness, and a simple pattern), so no texture
 * files are needed. Prices are fictional, per square metre, for budgets.
 */

export type Pattern =
  | 'none'
  | 'boards'
  | 'tiles'
  | 'large-tiles'
  | 'herringbone'
  | 'brick'
  | 'speckle'
  | 'weave'

export interface Material {
  id: string
  name: string
  group:
    | 'paint'
    | 'wood'
    | 'tile'
    | 'stone'
    | 'concrete'
    | 'textile'
    | 'glass'
    | 'metal'
    | 'roof'
  /** Where it can be used. */
  uses: Array<'wall' | 'floor' | 'ceiling' | 'furniture' | 'roof' | 'outdoor'>
  colour: string
  /** A second colour for the pattern's lines or grain. */
  accent?: string
  roughness: number
  metalness?: number
  opacity?: number
  pattern: Pattern
  /** Size of one repeat of the pattern (mm). */
  repeat?: number
  /** £ per m², supplied and fitted (fictional). */
  price: number
}

export const MATERIALS: Material[] = [
  // Paint
  {
    id: 'paint-white',
    name: 'Warm white paint',
    group: 'paint',
    uses: ['wall', 'ceiling', 'furniture'],
    colour: '#f4f1ea',
    roughness: 0.9,
    pattern: 'none',
    price: 9,
  },
  {
    id: 'paint-grey',
    name: 'Soft grey paint',
    group: 'paint',
    uses: ['wall', 'ceiling', 'furniture'],
    colour: '#c9c8c3',
    roughness: 0.9,
    pattern: 'none',
    price: 9,
  },
  {
    id: 'paint-sage',
    name: 'Sage green paint',
    group: 'paint',
    uses: ['wall', 'furniture'],
    colour: '#a7b59a',
    roughness: 0.9,
    pattern: 'none',
    price: 10,
  },
  {
    id: 'paint-navy',
    name: 'Deep navy paint',
    group: 'paint',
    uses: ['wall', 'furniture'],
    colour: '#2f3d5c',
    roughness: 0.85,
    pattern: 'none',
    price: 11,
  },
  {
    id: 'paint-terracotta',
    name: 'Terracotta paint',
    group: 'paint',
    uses: ['wall', 'furniture'],
    colour: '#c0714f',
    roughness: 0.9,
    pattern: 'none',
    price: 11,
  },
  {
    id: 'paint-ochre',
    name: 'Ochre paint',
    group: 'paint',
    uses: ['wall', 'furniture'],
    colour: '#d2a24c',
    roughness: 0.9,
    pattern: 'none',
    price: 11,
  },
  {
    id: 'paint-blush',
    name: 'Blush pink paint',
    group: 'paint',
    uses: ['wall', 'furniture'],
    colour: '#e5c4bb',
    roughness: 0.9,
    pattern: 'none',
    price: 10,
  },
  {
    id: 'paint-charcoal',
    name: 'Charcoal paint',
    group: 'paint',
    uses: ['wall', 'furniture'],
    colour: '#3b3b3d',
    roughness: 0.85,
    pattern: 'none',
    price: 11,
  },
  // Wood
  {
    id: 'oak-boards',
    name: 'Oak boards',
    group: 'wood',
    uses: ['floor', 'furniture', 'wall'],
    colour: '#c49a6c',
    accent: '#a87f55',
    roughness: 0.6,
    pattern: 'boards',
    repeat: 180,
    price: 62,
  },
  {
    id: 'walnut-boards',
    name: 'Walnut boards',
    group: 'wood',
    uses: ['floor', 'furniture', 'wall'],
    colour: '#6f4e37',
    accent: '#5a3e2b',
    roughness: 0.55,
    pattern: 'boards',
    repeat: 180,
    price: 88,
  },
  {
    id: 'ash-herringbone',
    name: 'Ash herringbone',
    group: 'wood',
    uses: ['floor'],
    colour: '#d9c3a0',
    accent: '#bfa57f',
    roughness: 0.6,
    pattern: 'herringbone',
    repeat: 300,
    price: 95,
  },
  {
    id: 'birch-ply',
    name: 'Birch plywood',
    group: 'wood',
    uses: ['furniture', 'wall'],
    colour: '#e3cfa8',
    accent: '#cdb68b',
    roughness: 0.7,
    pattern: 'boards',
    repeat: 600,
    price: 40,
  },
  {
    id: 'timber-decking',
    name: 'Timber decking',
    group: 'wood',
    uses: ['outdoor', 'floor'],
    colour: '#9b7653',
    accent: '#7b5c40',
    roughness: 0.8,
    pattern: 'boards',
    repeat: 145,
    price: 70,
  },
  // Tile
  {
    id: 'white-tiles',
    name: 'White ceramic tiles',
    group: 'tile',
    uses: ['wall', 'floor'],
    colour: '#f2f2f0',
    accent: '#d5d5d2',
    roughness: 0.3,
    pattern: 'tiles',
    repeat: 200,
    price: 45,
  },
  {
    id: 'porcelain-grey',
    name: 'Grey porcelain, large format',
    group: 'tile',
    uses: ['floor', 'wall', 'outdoor'],
    colour: '#9a9c9d',
    accent: '#828485',
    roughness: 0.4,
    pattern: 'large-tiles',
    repeat: 600,
    price: 58,
  },
  {
    id: 'terrazzo',
    name: 'Terrazzo tiles',
    group: 'tile',
    uses: ['floor'],
    colour: '#e7e2d8',
    accent: '#9f8f7d',
    roughness: 0.35,
    pattern: 'speckle',
    repeat: 400,
    price: 85,
  },
  {
    id: 'green-zellige',
    name: 'Green glazed tiles',
    group: 'tile',
    uses: ['wall'],
    colour: '#4f7d6b',
    accent: '#3d6455',
    roughness: 0.2,
    pattern: 'tiles',
    repeat: 100,
    price: 120,
  },
  // Stone
  {
    id: 'limestone',
    name: 'Limestone',
    group: 'stone',
    uses: ['floor', 'wall', 'outdoor'],
    colour: '#d8cfbd',
    accent: '#c4b9a3',
    roughness: 0.55,
    pattern: 'large-tiles',
    repeat: 600,
    price: 110,
  },
  {
    id: 'slate',
    name: 'Slate',
    group: 'stone',
    uses: ['floor', 'wall', 'outdoor', 'roof'],
    colour: '#4a5058',
    accent: '#3b4047',
    roughness: 0.6,
    pattern: 'large-tiles',
    repeat: 400,
    price: 95,
  },
  {
    id: 'stone-paving',
    name: 'Stone paving',
    group: 'stone',
    uses: ['outdoor'],
    colour: '#b8b2a7',
    accent: '#9d978c',
    roughness: 0.8,
    pattern: 'large-tiles',
    repeat: 600,
    price: 60,
  },
  {
    id: 'brick-red',
    name: 'Red brick',
    group: 'stone',
    uses: ['wall', 'outdoor'],
    colour: '#a9533c',
    accent: '#d8c8b8',
    roughness: 0.85,
    pattern: 'brick',
    repeat: 225,
    price: 75,
  },
  // Concrete
  {
    id: 'concrete',
    name: 'Polished concrete',
    group: 'concrete',
    uses: ['floor', 'wall', 'ceiling', 'furniture'],
    colour: '#a8a7a2',
    accent: '#96958f',
    roughness: 0.5,
    pattern: 'speckle',
    repeat: 800,
    price: 55,
  },
  {
    id: 'render-white',
    name: 'White render',
    group: 'concrete',
    uses: ['wall'],
    colour: '#ece9e2',
    roughness: 0.95,
    pattern: 'none',
    price: 35,
  },
  // Textile
  {
    id: 'carpet-grey',
    name: 'Grey carpet tiles',
    group: 'textile',
    uses: ['floor'],
    colour: '#6f7378',
    accent: '#62666b',
    roughness: 1,
    pattern: 'weave',
    repeat: 500,
    price: 28,
  },
  {
    id: 'carpet-blue',
    name: 'Blue carpet',
    group: 'textile',
    uses: ['floor'],
    colour: '#46597a',
    accent: '#3d4e6b',
    roughness: 1,
    pattern: 'weave',
    repeat: 400,
    price: 32,
  },
  {
    id: 'fabric-linen',
    name: 'Linen',
    group: 'textile',
    uses: ['furniture'],
    colour: '#d9d0c1',
    roughness: 1,
    pattern: 'weave',
    repeat: 50,
    price: 30,
  },
  {
    id: 'fabric-velvet-green',
    name: 'Green velvet',
    group: 'textile',
    uses: ['furniture'],
    colour: '#3e6250',
    roughness: 0.9,
    pattern: 'none',
    price: 45,
  },
  {
    id: 'fabric-charcoal',
    name: 'Charcoal wool',
    group: 'textile',
    uses: ['furniture'],
    colour: '#45474b',
    roughness: 1,
    pattern: 'weave',
    repeat: 50,
    price: 38,
  },
  {
    id: 'leather-tan',
    name: 'Tan leather',
    group: 'textile',
    uses: ['furniture'],
    colour: '#a0673f',
    roughness: 0.6,
    pattern: 'none',
    price: 80,
  },
  // Glass and metal
  {
    id: 'glass-clear',
    name: 'Clear glass',
    group: 'glass',
    uses: ['furniture', 'wall'],
    colour: '#bfe3ef',
    roughness: 0.05,
    opacity: 0.35,
    pattern: 'none',
    price: 150,
  },
  {
    id: 'glass-frosted',
    name: 'Frosted glass',
    group: 'glass',
    uses: ['furniture', 'wall'],
    colour: '#e5eef1',
    roughness: 0.4,
    opacity: 0.7,
    pattern: 'none',
    price: 170,
  },
  {
    id: 'steel-black',
    name: 'Black steel',
    group: 'metal',
    uses: ['furniture'],
    colour: '#2b2b2d',
    roughness: 0.45,
    metalness: 0.7,
    pattern: 'none',
    price: 90,
  },
  {
    id: 'brushed-steel',
    name: 'Brushed steel',
    group: 'metal',
    uses: ['furniture', 'wall'],
    colour: '#b4b8bc',
    roughness: 0.35,
    metalness: 0.85,
    pattern: 'none',
    price: 110,
  },
  {
    id: 'brass',
    name: 'Brass',
    group: 'metal',
    uses: ['furniture'],
    colour: '#b8964f',
    roughness: 0.3,
    metalness: 0.9,
    pattern: 'none',
    price: 140,
  },
  // Roofs
  {
    id: 'roof-tiles',
    name: 'Clay roof tiles',
    group: 'roof',
    uses: ['roof'],
    colour: '#9c4f36',
    accent: '#7f3f2b',
    roughness: 0.8,
    pattern: 'boards',
    repeat: 250,
    price: 70,
  },
  {
    id: 'roof-slate',
    name: 'Slate roof',
    group: 'roof',
    uses: ['roof'],
    colour: '#4c535b',
    accent: '#3d434a',
    roughness: 0.7,
    pattern: 'boards',
    repeat: 200,
    price: 85,
  },
  {
    id: 'roof-membrane',
    name: 'Flat roof membrane',
    group: 'roof',
    uses: ['roof'],
    colour: '#5d6064',
    roughness: 0.9,
    pattern: 'none',
    price: 45,
  },
  {
    id: 'roof-zinc',
    name: 'Standing seam zinc',
    group: 'roof',
    uses: ['roof'],
    colour: '#8e9599',
    accent: '#7a8185',
    roughness: 0.4,
    metalness: 0.6,
    pattern: 'boards',
    repeat: 500,
    price: 120,
  },
]

const BY_ID = new Map(MATERIALS.map((m) => [m.id, m]))

export function material(id: string | undefined): Material | undefined {
  return id ? BY_ID.get(id) : undefined
}

/** The material, or a plain one if the ID is unknown (an old file, a typo). */
export function materialOrDefault(id: string | undefined): Material {
  return material(id) ?? MATERIALS[0]
}

export function materialsFor(use: Material['uses'][number]): Material[] {
  return MATERIALS.filter((m) => m.uses.includes(use))
}

export const LIGHTING = {
  day: { name: 'Day', description: 'Bright daylight' },
  evening: { name: 'Evening', description: 'Low, warm evening sun' },
  night: { name: 'Night', description: 'Dark outside, rooms lit by their lights' },
} as const
