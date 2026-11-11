/**
 * Detailed office furniture: bench desks with a steel frame, a drawer
 * pedestal, a slim monitor on a stand, a keyboard with keys, a mouse and
 * mat; task chairs with a five-star base, casters, a gas lift, a curved
 * back and armrests.
 *
 * Each piece is built once from many shapes merged into a few meshes (one
 * per material), and every desk and chair shares them, so the detailed
 * furniture costs no more to draw than the old box furniture. Surfaces use
 * small textures drawn in code (wood grain, keys, a screen), so nothing is
 * downloaded.
 */
import { useAnchors, type AnchorSpec } from '../../world/anchors'
import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Euler,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  RepeatWrapping,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Vector } from '../../content/office'
import { COLORS } from './colors'

type Turn = [number, number, number]

interface Placed {
  position?: Vector
  rotation?: number
}

/** A copy of a shape, moved, turned and scaled into place. */
function part(
  geometry: BufferGeometry,
  position: Vector,
  rotation: Turn = [0, 0, 0],
  scale: Vector = [1, 1, 1],
): BufferGeometry {
  const copy = geometry.clone()
  copy.applyMatrix4(
    new Matrix4().compose(
      new Vector3(...position),
      new Quaternion().setFromEuler(new Euler(...rotation)),
      new Vector3(...scale),
    ),
  )
  return copy
}

function merge(parts: BufferGeometry[]): BufferGeometry {
  // Rounded boxes come without an index; the other shapes with one. Merge them all without.
  const merged = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))
  if (!merged) throw new Error('Could not build the furniture')
  return merged
}

const box = (w: number, h: number, d: number) => new BoxGeometry(w, h, d)
const rounded = (w: number, h: number, d: number, r: number) =>
  new RoundedBoxGeometry(w, h, d, 2, r)
const cylinder = (top: number, bottom: number, h: number, segments = 16) =>
  new CylinderGeometry(top, bottom, h, segments)

/** Built on first use and then shared (the office module is only loaded with the office). */
function lazy<T>(build: () => T): () => T {
  let value: T | undefined
  return () => (value ??= build())
}

// ---------------------------------------------------------------------------
// Textures drawn in code
// ---------------------------------------------------------------------------

function canvasTexture(
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void,
  repeat?: [number, number],
): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (context) draw(context)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  if (repeat) {
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.repeat.set(...repeat)
  }
  return texture
}

/** A seeded random number, so the patterns are the same every time. */
function random(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

/** Light oak grain for desk tops. */
const deskWoodTexture = lazy(() =>
  canvasTexture(512, 256, (c) => {
    const r = random(7)
    c.fillStyle = '#ddc9a6'
    c.fillRect(0, 0, 512, 256)
    for (let i = 0; i < 90; i++) {
      const y = r() * 256
      c.strokeStyle = `rgba(${150 + r() * 30}, ${110 + r() * 25}, ${70 + r() * 20}, ${0.08 + r() * 0.12})`
      c.lineWidth = 0.6 + r() * 2.2
      c.beginPath()
      c.moveTo(0, y)
      for (let x = 0; x <= 512; x += 32)
        c.lineTo(x, y + Math.sin(x / 70 + i) * (2 + r() * 3))
      c.stroke()
    }
  }),
)

/** Wooden floor planks. */
const floorTexture = lazy(() =>
  canvasTexture(
    512,
    512,
    (c) => {
      const r = random(11)
      const rows = 8
      const h = 512 / rows
      for (let row = 0; row < rows; row++) {
        let x = -r() * 200
        while (x < 512) {
          const w = 160 + r() * 140
          const tone = 196 + r() * 22
          c.fillStyle = `rgb(${tone}, ${tone - 16}, ${tone - 38})`
          c.fillRect(x, row * h, w, h)
          for (let g = 0; g < 6; g++) {
            c.strokeStyle = `rgba(120, 90, 55, ${0.05 + r() * 0.08})`
            c.lineWidth = 1
            const y = row * h + r() * h
            c.beginPath()
            c.moveTo(x, y)
            c.lineTo(x + w, y + (r() - 0.5) * 4)
            c.stroke()
          }
          c.fillStyle = 'rgba(90, 70, 45, 0.35)'
          c.fillRect(x, row * h, 1.5, h)
          x += w
        }
        c.fillStyle = 'rgba(90, 70, 45, 0.3)'
        c.fillRect(0, row * h, 512, 1.5)
      }
    },
    [6, 4],
  ),
)

/** Carpet tiles in the open-plan area. */
const carpetTexture = lazy(() =>
  canvasTexture(
    256,
    256,
    (c) => {
      const r = random(5)
      for (let ty = 0; ty < 2; ty++)
        for (let tx = 0; tx < 2; tx++) {
          const tone = 178 + ((tx + ty) % 2) * 10
          c.fillStyle = `rgb(${tone - 8}, ${tone + 2}, ${tone + 14})`
          c.fillRect(tx * 128, ty * 128, 128, 128)
          for (let i = 0; i < 900; i++) {
            const v = r() * 40 - 20
            c.fillStyle = `rgba(${120 + v}, ${130 + v}, ${150 + v}, 0.18)`
            const vertical = (tx + ty) % 2 === 0
            c.fillRect(
              tx * 128 + r() * 128,
              ty * 128 + r() * 128,
              vertical ? 1 : 3,
              vertical ? 3 : 1,
            )
          }
          c.strokeStyle = 'rgba(90, 100, 120, 0.25)'
          c.strokeRect(tx * 128 + 0.5, ty * 128 + 0.5, 127, 127)
        }
    },
    [8, 6],
  ),
)

const keyboardTexture = lazy(() =>
  canvasTexture(256, 80, (c) => {
    c.fillStyle = '#d6dae0'
    c.fillRect(0, 0, 256, 80)
    const rows = [14, 14, 13, 12]
    rows.forEach((keys, row) => {
      const w = 256 / 14.6
      const offset = row * 3 + 2
      for (let k = 0; k < keys; k++) {
        c.fillStyle = '#f8fafc'
        c.fillRect(offset + k * w, 4 + row * 15, w - 2.5, 12)
      }
    })
    c.fillStyle = '#f8fafc'
    c.fillRect(60, 64, 120, 12)
  }),
)

/** A work screen: an app window with a title bar, a list and text, over a taskbar. */
const screenTexture = lazy(() =>
  canvasTexture(320, 184, (c) => {
    c.fillStyle = '#0b4f9c'
    c.fillRect(0, 0, 320, 184)
    c.fillStyle = '#ffffff'
    c.fillRect(18, 10, 284, 150)
    c.fillStyle = '#e5e7eb'
    c.fillRect(18, 10, 284, 12)
    c.fillStyle = '#f1f5f9'
    c.fillRect(18, 22, 80, 138)
    const r = random(3)
    for (let i = 0; i < 7; i++) {
      c.fillStyle = i === 1 ? '#bfdbfe' : '#cbd5e1'
      c.fillRect(24, 30 + i * 17, 62 * (0.6 + r() * 0.4), 6)
    }
    c.fillStyle = '#1e293b'
    c.fillRect(110, 32, 120, 8)
    for (let i = 0; i < 9; i++) {
      c.fillStyle = '#94a3b8'
      c.fillRect(110, 50 + i * 11, 180 * (0.5 + r() * 0.5), 4)
    }
    c.fillStyle = '#202020'
    c.fillRect(0, 170, 320, 14)
    c.fillStyle = '#76b9ed'
    c.fillRect(4, 173, 10, 8)
  }),
)

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

const materials = lazy(() => ({
  wood: new MeshStandardMaterial({ map: deskWoodTexture(), roughness: 0.55 }),
  steel: new MeshStandardMaterial({ color: '#4b5563', roughness: 0.38, metalness: 0.6 }),
  pedestal: new MeshStandardMaterial({
    color: '#d7dbe0',
    roughness: 0.55,
    metalness: 0.15,
  }),
  black: new MeshStandardMaterial({ color: '#111827', roughness: 0.35, metalness: 0.2 }),
  plastic: new MeshStandardMaterial({ color: '#25282e', roughness: 0.6 }),
  chrome: new MeshStandardMaterial({
    color: '#d4d8dd',
    roughness: 0.18,
    metalness: 0.95,
  }),
  light: new MeshStandardMaterial({ color: '#e5e7eb', roughness: 0.5 }),
  keys: new MeshStandardMaterial({ map: keyboardTexture(), roughness: 0.6 }),
  paper: new MeshStandardMaterial({ color: '#fbfbf9', roughness: 0.9 }),
  notebook: new MeshStandardMaterial({ color: '#1e3a8a', roughness: 0.7 }),
  screen: new MeshStandardMaterial({
    map: screenTexture(),
    emissiveMap: screenTexture(),
    emissive: '#ffffff',
    emissiveIntensity: 0.55,
    roughness: 0.2,
  }),
  screenAlert: new MeshStandardMaterial({
    map: screenTexture(),
    emissiveMap: screenTexture(),
    emissive: '#ffffff',
    emissiveIntensity: 1.1,
    roughness: 0.2,
  }),
}))

const mugMaterials = new Map<string, MeshStandardMaterial>()
function mugMaterial(color: string) {
  let material = mugMaterials.get(color)
  if (!material) {
    material = new MeshStandardMaterial({ color, roughness: 0.3 })
    mugMaterials.set(color, material)
  }
  return material
}

const fabricMaterials = new Map<string, MeshStandardMaterial>()
function fabric(color: string) {
  let material = fabricMaterials.get(color)
  if (!material) {
    material = new MeshStandardMaterial({ color, roughness: 0.95 })
    fabricMaterials.set(color, material)
  }
  return material
}

// ---------------------------------------------------------------------------
// The desk
// ---------------------------------------------------------------------------

/** The person sits on the +z side; the monitor is at the back (-z). */
const deskGeometry = lazy(() => {
  const steel: BufferGeometry[] = []
  for (const x of [-0.68, 0.68]) {
    for (const z of [-0.3, 0.3]) steel.push(part(box(0.04, 0.71, 0.04), [x, 0.365, z]))
    steel.push(part(box(0.05, 0.03, 0.7), [x, 0.015, 0]))
    steel.push(part(box(0.04, 0.03, 0.64), [x, 0.71, 0]))
  }
  steel.push(part(box(1.32, 0.04, 0.03), [0, 0.705, -0.3]))
  // A modesty panel at the back, and handles on the drawers.
  steel.push(part(box(1.3, 0.3, 0.012), [0, 0.53, -0.33]))
  for (const y of [0.52, 0.34, 0.16])
    steel.push(part(box(0.12, 0.012, 0.016), [0.45, y, 0.29]))

  const pedestal = [part(rounded(0.4, 0.55, 0.55, 0.01), [0.45, 0.32, 0.0])]
  const black: BufferGeometry[] = [
    // Drawer gaps
    ...[0.44, 0.26].map((y) => part(box(0.38, 0.006, 0.004), [0.45, y, 0.276])),
    // Monitor body, back, neck and base
    part(rounded(0.62, 0.37, 0.024, 0.006), [0, 1.13, -0.22]),
    part(box(0.3, 0.2, 0.04), [0, 1.11, -0.245]),
    part(box(0.05, 0.27, 0.025), [0, 0.9, -0.262], [-0.08, 0, 0]),
    part(cylinder(0.11, 0.115, 0.012, 24), [0, 0.771, -0.25], [0, 0, 0], [1, 1, 0.75]),
    // Mouse mat
    part(rounded(0.22, 0.004, 0.19, 0.002), [0.33, 0.767, 0.11]),
  ]
  const light = [
    part(rounded(0.44, 0.018, 0.14, 0.006), [0, 0.774, 0.08]),
    part(
      new SphereGeometry(1, 16, 10),
      [0.33, 0.777, 0.11],
      [0, 0, 0],
      [0.028, 0.014, 0.048],
    ),
  ]
  const paper = [
    part(box(0.21, 0.008, 0.29), [-0.42, 0.769, -0.15], [0, 0.2, 0]),
    part(box(0.21, 0.008, 0.29), [-0.41, 0.777, -0.14], [0, 0.32, 0]),
  ]
  const notebook = [
    part(rounded(0.15, 0.016, 0.21, 0.004), [-0.45, 0.773, 0.22], [0, -0.15, 0]),
  ]
  const mug = [
    part(cylinder(0.04, 0.036, 0.1, 18), [-0.58, 0.815, 0.0]),
    part(new TorusGeometry(0.026, 0.007, 8, 16), [-0.54, 0.818, 0.0], [0, 0, 0]),
  ]
  return {
    top: part(rounded(1.5, 0.035, 0.75, 0.008), [0, 0.7475, 0]),
    steel: merge(steel),
    pedestal: merge(pedestal),
    black: merge(black),
    light: merge(light),
    keys: part(new PlaneGeometry(0.42, 0.12), [0, 0.7835, 0.08], [-Math.PI / 2, 0, 0]),
    screen: part(new PlaneGeometry(0.586, 0.336), [0, 1.13, -0.2075]),
    paper: merge(paper),
    notebook: merge(notebook),
    mug: merge(mug),
  }
})

/** The desk's keyboard, for whoever sits at it (on the +z side, facing −z). */
const DESK_KEYS: AnchorSpec[] = [{ kind: 'keyboard', at: [0, 0.784, 0.08] }]

export function Desk({
  position,
  rotation = 0,
  glow = false,
  mug = '#f8fafc',
}: Placed & { glow?: boolean; mug?: string }) {
  const g = deskGeometry()
  const m = materials()
  const ref = useAnchors(DESK_KEYS)
  return (
    <group ref={ref} position={position} rotation={[0, rotation, 0]}>
      <mesh geometry={g.top} material={m.wood} />
      <mesh geometry={g.steel} material={m.steel} />
      <mesh geometry={g.pedestal} material={m.pedestal} />
      <mesh geometry={g.black} material={m.black} />
      <mesh geometry={g.light} material={m.light} />
      <mesh geometry={g.keys} material={m.keys} />
      <mesh geometry={g.screen} material={glow ? m.screenAlert : m.screen} />
      <mesh geometry={g.paper} material={m.paper} />
      <mesh geometry={g.notebook} material={m.notebook} />
      <mesh geometry={g.mug} material={mugMaterial(mug)} />
    </group>
  )
}

// ---------------------------------------------------------------------------
// The chair
// ---------------------------------------------------------------------------

/** The back is on the +z side: whoever sits faces -z. */
const chairGeometry = lazy(() => {
  const plastic: BufferGeometry[] = [part(cylinder(0.05, 0.055, 0.06), [0, 0.075, 0])]
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2
    plastic.push(
      part(
        box(0.045, 0.035, 0.3),
        [Math.sin(a) * 0.15, 0.065, Math.cos(a) * 0.15],
        [0, a, 0],
      ),
    )
    plastic.push(
      part(
        cylinder(0.024, 0.024, 0.03, 12),
        [Math.sin(a) * 0.29, 0.026, Math.cos(a) * 0.29],
        [0, a, Math.PI / 2],
      ),
    )
  }
  plastic.push(part(cylinder(0.032, 0.032, 0.12, 14), [0, 0.15, 0]))
  plastic.push(part(box(0.22, 0.04, 0.22), [0, 0.415, 0]))
  // The back's support, and the armrests
  plastic.push(part(box(0.06, 0.34, 0.03), [0, 0.56, 0.255], [0.1, 0, 0]))
  for (const x of [-0.275, 0.275]) {
    plastic.push(part(box(0.03, 0.2, 0.04), [x, 0.6, 0.03]))
    plastic.push(part(rounded(0.06, 0.03, 0.25, 0.012), [x, 0.71, -0.01]))
  }
  return {
    plastic: merge(plastic),
    chrome: part(cylinder(0.022, 0.022, 0.26, 14), [0, 0.27, 0]),
    fabric: merge([
      part(rounded(0.5, 0.08, 0.48, 0.035), [0, 0.47, 0]),
      part(rounded(0.46, 0.52, 0.07, 0.03), [0, 0.88, 0.25], [0.1, 0, 0]),
    ]),
  }
})

/** Where the hips go: on the cushion (its top 0.51 m up), back against the backrest. */
const CHAIR_SEAT: AnchorSpec[] = [{ kind: 'seat', at: [0, 0.51, 0.08], top: 0.51 }]

export function OfficeChair({
  position,
  rotation = 0,
  color = COLORS.fabric,
}: Placed & { color?: string }) {
  const g = chairGeometry()
  const m = materials()
  const ref = useAnchors(CHAIR_SEAT)
  return (
    <group ref={ref} position={position} rotation={[0, rotation, 0]}>
      <mesh geometry={g.plastic} material={m.plastic} />
      <mesh geometry={g.chrome} material={m.chrome} />
      <mesh geometry={g.fabric} material={fabric(color)} />
    </group>
  )
}

const floorMaterials = lazy(() => ({
  wood: new MeshStandardMaterial({ map: floorTexture(), roughness: 0.62 }),
  carpet: new MeshStandardMaterial({ map: carpetTexture(), roughness: 1 }),
}))

/** A floor: wooden planks, or carpet tiles. */
export function Floor({
  kind,
  position,
  size,
}: {
  kind: 'wood' | 'carpet'
  position: Vector
  size: [number, number]
}) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={position}
      material={floorMaterials()[kind]}
      // Floors take shadows but cast none.
      userData={{ floor: true }}
    >
      <planeGeometry args={size} />
    </mesh>
  )
}
