/**
 * What a character wears, and the materials accessories are drawn in
 * (accessories3d.tsx draws them): shared, so each colour and finish is made once.
 */
import { MeshStandardMaterial } from 'three'
import type { Model, Slot } from '../../content/accessories'

/** What a character wears: each model in its colour, at its slot. */
export interface Wear {
  model: Model
  slot: Slot
  colour: string
}

export type Finish =
  'metal' | 'gold' | 'plastic' | 'leather' | 'fabric' | 'glass' | 'rubber' | 'screen'

const FINISH: Record<Finish, { roughness: number; metalness: number; opacity?: number }> =
  {
    metal: { roughness: 0.25, metalness: 0.9 },
    gold: { roughness: 0.22, metalness: 1 },
    plastic: { roughness: 0.45, metalness: 0.05 },
    leather: { roughness: 0.6, metalness: 0 },
    fabric: { roughness: 0.92, metalness: 0 },
    glass: { roughness: 0.05, metalness: 0.1, opacity: 0.45 },
    rubber: { roughness: 0.8, metalness: 0 },
    screen: { roughness: 0.15, metalness: 0.2 },
  }

const MATERIALS = new Map<string, MeshStandardMaterial>()

/** One material per colour and finish, shared. */
export function finish(colour: string, kind: Finish): MeshStandardMaterial {
  const key = `${kind}:${colour}`
  let m = MATERIALS.get(key)
  if (!m) {
    const f = FINISH[kind]
    m = new MeshStandardMaterial({
      color: colour,
      roughness: f.roughness,
      metalness: f.metalness,
      transparent: f.opacity !== undefined,
      opacity: f.opacity ?? 1,
      emissive: kind === 'screen' ? colour : '#000000',
      emissiveIntensity: kind === 'screen' ? 0.6 : 0,
    })
    MATERIALS.set(key, m)
  }
  return m
}

export const has = (wear: Wear[] | undefined, slot: Slot) =>
  wear?.find((w) => w.slot === slot)

/** Headwear that hides the hair under it (a beanie, a helmet, a scrub cap, a hard hat). */
export function hidesHair(wear: Wear[] | undefined): boolean {
  const h = has(wear, 'head')
  return !!h && ['beanie', 'hardhat', 'helmet', 'scrub-cap'].includes(h.model)
}

/** Gloves, if worn: the hands are drawn in them. */
export function gloveColour(wear: Wear[] | undefined): string | undefined {
  return has(wear, 'hands')?.colour
}

/** A hi-vis vest over the clothes, if worn (people.tsx draws it). */
export function vestColour(wear: Wear[] | undefined): string | undefined {
  return has(wear, 'body')?.colour
}
