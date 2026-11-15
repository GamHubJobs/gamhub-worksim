/**
 * Surfaces drawn in code (no downloaded images, so nothing to license or load):
 * asphalt, paving slabs, brick, render, grass, clinical vinyl, polished
 * concrete, carpet tiles and painted plaster. Each is a small seamless canvas,
 * made once and shared, with a matching roughness map so light catches it as
 * it would the real thing; the colour can be tinted per use.
 */
import {
  CanvasTexture,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three'

export type SurfaceId =
  | 'asphalt'
  | 'paving'
  | 'brick'
  | 'render'
  | 'grass'
  | 'vinyl'
  | 'concrete'
  | 'carpet'
  | 'plaster'
  | 'tiles'

/** A seeded random number, so the patterns are the same every time. */
function random(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

const SIZE = 256

/** Speckle: many small dots of lighter and darker tone. */
function speckle(c: CanvasRenderingContext2D, r: () => number, n: number, alpha: number) {
  for (let i = 0; i < n; i++) {
    const v = r() > 0.5 ? 255 : 0
    c.fillStyle = `rgba(${v},${v},${v},${alpha * r()})`
    c.fillRect(r() * SIZE, r() * SIZE, 1 + r() * 2, 1 + r() * 2)
  }
}

/** The pattern of each surface, in greys (the colour is applied by the material). */
const DRAW: Record<SurfaceId, (c: CanvasRenderingContext2D, r: () => number) => void> = {
  asphalt: (c, r) => {
    c.fillStyle = '#7a7a7a'
    c.fillRect(0, 0, SIZE, SIZE)
    speckle(c, r, 5000, 0.35)
    // A few patched repairs and oil stains.
    for (let i = 0; i < 4; i++) {
      c.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.06})`
      c.beginPath()
      c.ellipse(
        r() * SIZE,
        r() * SIZE,
        10 + r() * 30,
        6 + r() * 16,
        r() * 3,
        0,
        Math.PI * 2,
      )
      c.fill()
    }
  },
  paving: (c, r) => {
    c.fillStyle = '#c9c9c9'
    c.fillRect(0, 0, SIZE, SIZE)
    const slab = SIZE / 4
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const v = 190 + Math.floor(r() * 30)
        c.fillStyle = `rgb(${v},${v},${v})`
        c.fillRect(x * slab + 2, y * slab + 2, slab - 4, slab - 4)
      }
    speckle(c, r, 2500, 0.15)
  },
  brick: (c, r) => {
    c.fillStyle = '#bdbdbd' // mortar
    c.fillRect(0, 0, SIZE, SIZE)
    const rows = 16
    const h = SIZE / rows
    const w = SIZE / 4
    for (let y = 0; y < rows; y++)
      for (let x = -1; x < 5; x++) {
        const v = 120 + Math.floor(r() * 60)
        c.fillStyle = `rgb(${v},${v},${v})`
        const off = y % 2 ? w / 2 : 0
        c.fillRect(x * w + off + 1.5, y * h + 1.5, w - 3, h - 3)
      }
    speckle(c, r, 2000, 0.12)
  },
  render: (c, r) => {
    c.fillStyle = '#d8d8d8'
    c.fillRect(0, 0, SIZE, SIZE)
    speckle(c, r, 3500, 0.1)
  },
  grass: (c, r) => {
    c.fillStyle = '#9a9a9a'
    c.fillRect(0, 0, SIZE, SIZE)
    for (let i = 0; i < 4000; i++) {
      const v = 110 + Math.floor(r() * 100)
      c.strokeStyle = `rgba(${v},${v},${v},0.5)`
      const x = r() * SIZE
      const y = r() * SIZE
      c.beginPath()
      c.moveTo(x, y)
      c.lineTo(x + (r() - 0.5) * 3, y - 2 - r() * 4)
      c.stroke()
    }
  },
  vinyl: (c, r) => {
    // Sheet vinyl with a faint fleck and welded seams.
    c.fillStyle = '#e4e4e4'
    c.fillRect(0, 0, SIZE, SIZE)
    speckle(c, r, 1800, 0.08)
    c.fillStyle = 'rgba(0,0,0,0.06)'
    c.fillRect(0, 0, SIZE, 1.5)
  },
  concrete: (c, r) => {
    c.fillStyle = '#b5b5b5'
    c.fillRect(0, 0, SIZE, SIZE)
    for (let i = 0; i < 10; i++) {
      const g = c.createRadialGradient(
        r() * SIZE,
        r() * SIZE,
        0,
        r() * SIZE,
        r() * SIZE,
        60 + r() * 80,
      )
      const v = r() > 0.5 ? 255 : 0
      g.addColorStop(0, `rgba(${v},${v},${v},0.08)`)
      g.addColorStop(1, `rgba(${v},${v},${v},0)`)
      c.fillStyle = g
      c.fillRect(0, 0, SIZE, SIZE)
    }
    speckle(c, r, 2500, 0.12)
    // Saw-cut joints.
    c.fillStyle = 'rgba(0,0,0,0.18)'
    c.fillRect(0, 0, SIZE, 1)
    c.fillRect(0, 0, 1, SIZE)
  },
  carpet: (c, r) => {
    c.fillStyle = '#a8a8a8'
    c.fillRect(0, 0, SIZE, SIZE)
    for (let i = 0; i < 9000; i++) {
      const v = 130 + Math.floor(r() * 70)
      c.fillStyle = `rgba(${v},${v},${v},0.6)`
      c.fillRect(r() * SIZE, r() * SIZE, 1, 1)
    }
    // Carpet-tile edges, laid in quarter turns.
    c.fillStyle = 'rgba(0,0,0,0.1)'
    c.fillRect(0, 0, SIZE, 1.5)
    c.fillRect(0, 0, 1.5, SIZE)
  },
  plaster: (c, r) => {
    c.fillStyle = '#e8e8e8'
    c.fillRect(0, 0, SIZE, SIZE)
    speckle(c, r, 1500, 0.05)
  },
  tiles: (c, r) => {
    c.fillStyle = '#bcbcbc' // grout
    c.fillRect(0, 0, SIZE, SIZE)
    const t = SIZE / 4
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const v = 225 + Math.floor(r() * 18)
        c.fillStyle = `rgb(${v},${v},${v})`
        c.fillRect(x * t + 1.5, y * t + 1.5, t - 3, t - 3)
      }
  },
}

/** How rough each surface is, at its shiniest and dullest. */
const ROUGH: Record<SurfaceId, number> = {
  asphalt: 0.95,
  paving: 0.9,
  brick: 0.92,
  render: 0.9,
  grass: 1,
  vinyl: 0.45,
  concrete: 0.6,
  carpet: 1,
  plaster: 0.92,
  tiles: 0.3,
}

const textures = new Map<SurfaceId, Texture>()

function texture(id: SurfaceId): Texture | null {
  if (typeof document === 'undefined') return null
  const cached = textures.get(id)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const c = canvas.getContext('2d')
  if (!c) return null
  DRAW[id](c, random(id.length * 977 + 13))
  const t = new CanvasTexture(canvas)
  t.colorSpace = SRGBColorSpace
  t.wrapS = t.wrapT = RepeatWrapping
  t.anisotropy = 4
  textures.set(id, t)
  return t
}

const materials = new Map<string, MeshStandardMaterial>()

/**
 * A material of a surface in a colour, repeating every `tile` metres over an
 * area `w` by `d` (planes and boxes share one material per surface, colour and
 * repeat, so it is made once).
 */
export function surface(
  id: SurfaceId,
  color: string,
  repeat: [number, number] = [1, 1],
): MeshStandardMaterial {
  const key = `${id}|${color}|${repeat[0].toFixed(2)}|${repeat[1].toFixed(2)}`
  const cached = materials.get(key)
  if (cached) return cached
  const base = texture(id)
  const map = base ? base.clone() : null
  if (map) {
    map.repeat.set(repeat[0], repeat[1])
    map.needsUpdate = true
  }
  const m = new MeshStandardMaterial({ color, map, roughness: ROUGH[id] })
  materials.set(key, m)
  return m
}

/** The repeat for an area `w` by `d` metres, a pattern every `tile` metres. */
export const tiling = (w: number, d: number, tile: number): [number, number] => [
  Math.max(1, w / tile),
  Math.max(1, d / tile),
]
