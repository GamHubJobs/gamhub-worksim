/**
 * Where the café's and the shop's walk-in customers go (see Customers.tsx):
 * the counter or the checkout, a table, an aisle. Checked against the real
 * furniture there (world/npc/activities.ts).
 */
import type { Place } from '../../../world/npc/schedule'

export const CAFE_PLACES: Record<string, Place> = {
  counter: {
    x: -2.0,
    z: -2.0,
    heading: 0,
    clip: 'pay',
    also: ['stand'],
    label: 'ordering at the counter',
  },
  window: {
    x: 4.4,
    z: 1.85,
    heading: Math.PI,
    seated: true,
    clip: 'drink',
    also: ['read', 'phone'],
    label: 'having a coffee',
  },
  corner: {
    x: 0.4,
    z: 1.45,
    heading: Math.PI,
    seated: true,
    clip: 'eat',
    also: ['drink'],
    label: 'having something to eat',
  },
}

export const SHOP_PLACES: Record<string, Place> = {
  checkout: {
    x: 3.05,
    z: 1.35,
    heading: -Math.PI / 2,
    clip: 'pay',
    also: ['stand'],
    label: 'paying at the checkout',
  },
  aisle: {
    x: -0.05,
    z: -1.5,
    heading: Math.PI / 2,
    clip: 'reach',
    also: ['stand'],
    label: 'looking along the shelves',
  },
  back: {
    x: 2.4,
    z: -3.45,
    heading: 0,
    clip: 'reach',
    also: ['stand', 'phone'],
    label: 'choosing from the fridges',
  },
}
