/** Small things the Space Studio screens share (kept out of component files). */
import { bounds } from '../../studio/geometry'
import type { Material } from '../../studio/materials'
import type { StudioState } from '../../studio/model'

export interface Layers {
  furniture: boolean
  labels: boolean
  dimensions: boolean
  below: boolean
  roof: boolean
}

export const DEFAULT_LAYERS: Layers = {
  furniture: true,
  labels: true,
  dimensions: true,
  below: true,
  roof: false,
}

const USE_NAMES: Record<string, string> = {
  living: 'Living room',
  bedroom: 'Bedroom',
  kitchen: 'Kitchen',
  dining: 'Dining room',
  bathroom: 'Bathroom',
  wc: 'WC',
  hall: 'Hall or landing',
  storage: 'Storage',
  utility: 'Utility',
  office: 'Office',
  meeting: 'Meeting room',
  reception: 'Reception',
  'open-plan': 'Open-plan office',
  retail: 'Shop floor',
  plant: 'Plant room',
  other: 'Other',
}

/** A room use as people say it, e.g. "Hall or landing". */
export const roomUseName = (use: string) => USE_NAMES[use] ?? use

/** A CSS background that looks like the finish (for swatches). */
export function swatch(m: Material): string {
  const a = m.accent ?? m.colour
  switch (m.pattern) {
    case 'boards':
    case 'herringbone':
      return `repeating-linear-gradient(90deg, ${m.colour} 0 6px, ${a} 6px 7px)`
    case 'tiles':
    case 'large-tiles':
      return `linear-gradient(${a} 1px, transparent 1px) 0 0/8px 8px, linear-gradient(90deg, ${a} 1px, ${m.colour} 1px) 0 0/8px 8px`
    case 'brick':
      return `repeating-linear-gradient(0deg, ${m.colour} 0 5px, ${a} 5px 6px)`
    case 'speckle':
    case 'weave':
      return `radial-gradient(${a} 1px, ${m.colour} 1px) 0 0/4px 4px`
    default:
      return m.colour
  }
}

export interface View {
  cx: number
  cy: number
  /** Millimetres per screen pixel. */
  scale: number
}

export const clampScale = (s: number) => Math.max(0.5, Math.min(200, s))

/** A view that shows the whole floor (or a 12 m square near the origin when it is empty). */
export function initialView(
  state: StudioState,
  floor: string,
  w: number,
  h: number,
): View {
  const pts = [
    ...state.walls.filter((x) => x.floor === floor).flatMap((x) => [x.a, x.b]),
    ...state.rooms.filter((x) => x.floor === floor).flatMap((x) => x.outline),
    ...state.items.filter((x) => x.floor === floor).map((x) => ({ x: x.x, y: x.y })),
  ]
  if (pts.length === 0)
    return {
      cx: 4000,
      cy: 3000,
      scale: clampScale(12000 / Math.max(200, Math.min(w, h))),
    }
  const b = bounds(pts)
  const margin = 1500
  const scale = clampScale(
    Math.max((b.width + margin * 2) / w, (b.height + margin * 2) / h),
  )
  return { cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, scale }
}
