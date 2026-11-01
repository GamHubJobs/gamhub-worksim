/**
 * Things the player can put on their desk. Purely cosmetic and earned through
 * normal play (achievements or promotions); nothing is bought. Kept modest so
 * the office stays professional.
 */

export const DESK_SLOTS = [
  { id: 'plant', name: 'Plant' },
  { id: 'mug', name: 'Mug' },
  { id: 'lamp', name: 'Desk lamp' },
  { id: 'frame', name: 'Photo frame' },
  { id: 'board', name: 'Pinboard' },
  { id: 'chair', name: 'Chair' },
] as const

export type DeskSlot = (typeof DESK_SLOTS)[number]['id']

export interface DeskItem {
  id: string
  slot: DeskSlot
  name: string
  /** The main colour used to draw it. */
  color: string
  /** How it is earned: an achievement, a career level, or available from the start. */
  unlock: { achievement: string } | { level: number } | null
}

export const DESK_ITEMS: DeskItem[] = [
  { id: 'mug-white', slot: 'mug', name: 'White mug', color: '#f8fafc', unlock: null },
  { id: 'chair-blue', slot: 'chair', name: 'Blue chair', color: '#1d4ed8', unlock: null },
  {
    id: 'succulent',
    slot: 'plant',
    name: 'Small succulent',
    color: '#4d7c0f',
    unlock: { achievement: 'first-delivery' },
  },
  {
    id: 'fern',
    slot: 'plant',
    name: 'Fern',
    color: '#15803d',
    unlock: { achievement: 'right-first-time' },
  },
  {
    id: 'monstera',
    slot: 'plant',
    name: 'Large-leaf plant',
    color: '#166534',
    unlock: { achievement: 'integrated-project' },
  },
  {
    id: 'mug-teal',
    slot: 'mug',
    name: 'Teal mug',
    color: '#0f766e',
    unlock: { achievement: 'customer-care' },
  },
  {
    id: 'mug-team',
    slot: 'mug',
    name: 'Department mug',
    color: '#1e3a8a',
    unlock: { level: 2 },
  },
  {
    id: 'lamp-brass',
    slot: 'lamp',
    name: 'Brass desk lamp',
    color: '#b45309',
    unlock: { achievement: 'excellent-work' },
  },
  {
    id: 'lamp-black',
    slot: 'lamp',
    name: 'Black desk lamp',
    color: '#1f2937',
    unlock: { achievement: 'incident-resolved' },
  },
  {
    id: 'frame-wood',
    slot: 'frame',
    name: 'Wooden photo frame',
    color: '#92400e',
    unlock: { achievement: 'trusted-colleague' },
  },
  {
    id: 'frame-silver',
    slot: 'frame',
    name: 'Silver photo frame',
    color: '#94a3b8',
    unlock: { achievement: 'programme-contribution' },
  },
  {
    id: 'board-notes',
    slot: 'board',
    name: 'Pinboard with notes',
    color: '#d6b38a',
    unlock: { achievement: 'clean-handoff' },
  },
  {
    id: 'board-plan',
    slot: 'board',
    name: 'Team planning board',
    color: '#e2e8f0',
    unlock: { achievement: 'good-delegation' },
  },
  {
    id: 'chair-green',
    slot: 'chair',
    name: 'Green chair',
    color: '#15803d',
    unlock: { achievement: 'reliable' },
  },
  {
    id: 'chair-charcoal',
    slot: 'chair',
    name: 'Charcoal chair',
    color: '#374151',
    unlock: { level: 3 },
  },
]

/** What the desk has before the player changes anything. */
export const DEFAULT_DESK: Partial<Record<DeskSlot, string>> = {
  mug: 'mug-white',
  chair: 'chair-blue',
}

export function getDeskItem(id: string): DeskItem | undefined {
  return DESK_ITEMS.find((item) => item.id === id)
}
