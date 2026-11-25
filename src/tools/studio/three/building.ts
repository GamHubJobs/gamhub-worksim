/**
 * Builds the 3D building from the model: walls in pieces round their openings
 * (each face with its own finish), room floors and ceilings, doors, windows,
 * stairs, columns, balconies, roofs and furniture. Metres, y up; the plan's
 * (x, y) is (x, z). Everything is procedural: no model or texture files.
 */
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  RepeatWrapping,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  SRGBColorSpace,
  type Material as ThreeMaterial,
} from 'three'
import { catalogEntry, type Part } from '../../../studio/catalog'
import {
  bounds,
  itemSize,
  openingSpan,
  wallDir,
  wallLength,
  wallNormal,
  wallPieces,
} from '../../../studio/geometry'
import { materialOrDefault, type Material } from '../../../studio/materials'
import { isRectilinear, rectangles, type Rect } from '../../../studio/outline'
import type { Floor, Point, Ref, StudioState } from '../../../studio/model'

const M = 0.001

export interface BuildOptions {
  /** Floors shown: all, or the current floor and those below. */
  floors: 'all' | 'up-to-current'
  current: string
  walls: 'full' | 'low'
  ceilings: boolean
  roof: boolean
  furniture: boolean
  lighting: StudioState['lighting']
  /** Shadows cast and received (off on low-power computers). */
  shadows: boolean
}

/** A door leaf that swings: its pivot, its closed and open turns, and where the doorway is (m). */
export interface DoorLeaf {
  pivot: Object3D
  closed: number
  open: number
  x: number
  y: number
  z: number
}

export interface Built {
  group: Group
  /** Lights inside (lamps at night). */
  lights: PointLight[]
  /** Hinged door leaves, which open as someone comes near (shown open in the plan). */
  doors: DoorLeaf[]
  dispose: () => void
}

// ---------------------------------------------------------------- materials

const textureCache = new Map<string, CanvasTexture>()
const materialCache = new Map<string, MeshStandardMaterial>()

function patternTexture(m: Material): CanvasTexture | null {
  if (m.pattern === 'none' || typeof document === 'undefined') return null
  const cached = textureCache.get(m.id)
  if (cached) return cached
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const g = canvas.getContext('2d')
  if (!g) return null
  g.fillStyle = m.colour
  g.fillRect(0, 0, size, size)
  g.strokeStyle = m.accent ?? m.colour
  g.fillStyle = m.accent ?? m.colour
  switch (m.pattern) {
    case 'boards':
      g.lineWidth = 3
      for (let i = 0; i <= 4; i++) {
        g.beginPath()
        g.moveTo(0, i * 64)
        g.lineTo(size, i * 64)
        g.stroke()
        // Staggered board ends.
        const x = (i % 2) * 128 + 64
        g.beginPath()
        g.moveTo(x, i * 64)
        g.lineTo(x, i * 64 + 64)
        g.stroke()
      }
      g.globalAlpha = 0.18
      for (let i = 0; i < 40; i++)
        g.fillRect((i * 53) % size, (i * 97) % size, 40 + (i % 5) * 9, 1.5)
      break
    case 'herringbone':
      g.lineWidth = 3
      for (let i = -size; i < size * 2; i += 32) {
        g.beginPath()
        g.moveTo(i, 0)
        g.lineTo(i + size, size)
        g.stroke()
        g.beginPath()
        g.moveTo(i, size)
        g.lineTo(i + size, 0)
        g.stroke()
      }
      break
    case 'tiles':
    case 'large-tiles':
      g.lineWidth = m.pattern === 'tiles' ? 5 : 3
      g.strokeRect(0, 0, size, size)
      break
    case 'brick':
      g.lineWidth = 6
      g.strokeStyle = m.accent ?? '#ddd'
      for (let row = 0; row < 4; row++) {
        g.beginPath()
        g.moveTo(0, row * 64)
        g.lineTo(size, row * 64)
        g.stroke()
        for (let x = (row % 2) * 64; x < size; x += 128) {
          g.beginPath()
          g.moveTo(x, row * 64)
          g.lineTo(x, row * 64 + 64)
          g.stroke()
        }
      }
      break
    case 'speckle':
      for (let i = 0; i < 900; i++) {
        g.globalAlpha = 0.25 + ((i * 7) % 10) / 20
        g.fillRect((i * 73) % size, (i * 151) % size, 2 + (i % 3), 2 + (i % 2))
      }
      break
    case 'weave':
      g.globalAlpha = 0.35
      for (let i = 0; i < size; i += 4) {
        g.fillRect(i, 0, 1, size)
        g.fillRect(0, i, size, 1)
      }
      break
  }
  const t = new CanvasTexture(canvas)
  t.wrapS = t.wrapT = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  textureCache.set(m.id, t)
  return t
}

/** A finish's 3D material (with its pattern), shared by everything that uses it. */
export function finishMaterial(id: string | undefined): MeshStandardMaterial {
  const m = materialOrDefault(id)
  const cached = materialCache.get(`m:${m.id}`)
  if (cached) return cached
  const map = patternTexture(m)
  const mat = new MeshStandardMaterial({
    color: map ? '#ffffff' : m.colour,
    ...(map ? { map } : {}),
    roughness: m.roughness,
    metalness: m.metalness ?? 0,
    transparent: (m.opacity ?? 1) < 1,
    opacity: m.opacity ?? 1,
    depthWrite: (m.opacity ?? 1) >= 1,
  })
  materialCache.set(`m:${m.id}`, mat)
  return mat
}

function plain(
  colour: string,
  extra: {
    roughness?: number
    metalness?: number
    emissive?: string
    opacity?: number
  } = {},
): MeshStandardMaterial {
  const key = `c:${colour}:${extra.roughness ?? 0.7}:${extra.metalness ?? 0}:${extra.emissive ?? ''}:${extra.opacity ?? 1}`
  const cached = materialCache.get(key)
  if (cached) return cached
  const mat = new MeshStandardMaterial({
    color: colour,
    roughness: extra.roughness ?? 0.7,
    metalness: extra.metalness ?? 0,
    ...(extra.emissive
      ? { emissive: new Color(extra.emissive), emissiveIntensity: 1 }
      : {}),
    transparent: (extra.opacity ?? 1) < 1,
    opacity: extra.opacity ?? 1,
  })
  materialCache.set(key, mat)
  return mat
}

/** The material a furniture part takes. */
function partMaterial(
  role: Part['role'],
  colour: string,
  material: string | undefined,
  glow: boolean,
): ThreeMaterial {
  switch (role) {
    case 'main':
      return material ? finishMaterial(material) : plain(colour)
    case 'accent':
      return plain(new Color(colour).multiplyScalar(0.72).getStyle())
    case 'wood':
      return finishMaterial('oak-boards')
    case 'metal':
      return plain('#9ca3af', { roughness: 0.35, metalness: 0.8 })
    case 'white':
      return plain('#f5f5f4', { roughness: 0.35 })
    case 'black':
      return plain('#26272b', { roughness: 0.5 })
    case 'glass':
      return finishMaterial('glass-clear')
    case 'leaf':
      return plain('#4d7c3a', { roughness: 0.9 })
    case 'soil':
      return plain('#5b4636', { roughness: 1 })
    case 'glow':
      return glow
        ? plain('#fff3d1', { emissive: '#ffd27a' })
        : plain('#f7f1e3', { roughness: 0.4 })
    case 'screen':
      return plain('#111827', { roughness: 0.2, metalness: 0.3 })
  }
}

// ---------------------------------------------------------------- geometry helpers

const unitBox = new BoxGeometry(1, 1, 1)
const unitCylinder = new CylinderGeometry(0.5, 0.5, 1, 20)
const unitSphere = new SphereGeometry(0.5, 16, 12)

/** A box with UVs in metres (so patterns keep their real size), its faces in the order +x −x +y −y +z −z. */
function sizedBox(w: number, h: number, d: number, repeat: number): BoxGeometry {
  const g = new BoxGeometry(w, h, d)
  const uv = g.getAttribute('uv') as BufferAttribute
  // Face (u, v) sizes in metres for each of the six faces.
  const sizes: Array<[number, number]> = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ]
  for (let face = 0; face < 6; face++) {
    for (let v = 0; v < 4; v++) {
      const i = face * 4 + v
      uv.setXY(
        i,
        (uv.getX(i) * sizes[face][0]) / repeat,
        (uv.getY(i) * sizes[face][1]) / repeat,
      )
    }
  }
  uv.needsUpdate = true
  return g
}

function shapeOf(outline: Point[]): Shape {
  const s = new Shape()
  outline.forEach((p, i) =>
    i === 0 ? s.moveTo(p.x * M, -p.y * M) : s.lineTo(p.x * M, -p.y * M),
  )
  s.closePath()
  return s
}

function scaleUv(g: BufferGeometry, repeat: number) {
  const uv = g.getAttribute('uv') as BufferAttribute | undefined
  if (!uv) return
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / repeat, uv.getY(i) / repeat)
  uv.needsUpdate = true
}

const repeatOf = (id: string | undefined) =>
  (materialOrDefault(id).repeat ?? 1000) * M * 1.0

// ---------------------------------------------------------------- the building

export function buildBuilding(state: StudioState, o: BuildOptions): Built {
  const group = new Group()
  group.name = 'building'
  const owned: BufferGeometry[] = []
  const ownedMaterials: ThreeMaterial[] = []
  const lights: PointLight[] = []
  const doors: DoorLeaf[] = []
  const glow = o.lighting !== 'day'
  const floors = [...state.floors].sort((a, b) => a.elevation - b.elevation)
  const currentIndex = Math.max(
    0,
    floors.findIndex((f) => f.id === o.current),
  )
  const shown = o.floors === 'all' ? floors : floors.slice(0, currentIndex + 1)
  const topShown = shown[shown.length - 1]

  const add = (mesh: Mesh, ref?: Ref) => {
    mesh.castShadow = o.shadows
    mesh.receiveShadow = o.shadows
    if (ref) mesh.userData.ref = ref
    group.add(mesh)
    return mesh
  }
  const own = <G extends BufferGeometry>(g: G) => (owned.push(g), g)

  for (const floor of shown) {
    const base = floor.elevation * M
    const walls = state.walls.filter((w) => w.floor === floor.id)
    const wallTop = Math.max(2400, ...walls.map((w) => w.height))

    // Rooms: the slab, the finished floor, the ceiling.
    for (const room of state.rooms.filter((r) => r.floor === floor.id)) {
      const ref: Ref = { kind: 'rooms', id: room.id }
      // One solid: its top (and underside) in the floor finish, its edges as slab.
      // (A separate finish surface just above the slab flickers at a distance.)
      const slab = own(
        new ExtrudeGeometry(shapeOf(room.outline), {
          depth: floor.slab * M,
          bevelEnabled: false,
        }),
      )
      scaleUv(slab, repeatOf(room.floorFinish))
      const slabMesh = new Mesh(slab, [
        finishMaterial(room.floorFinish),
        plain('#b9b5ad', { roughness: 0.9 }),
      ])
      slabMesh.rotation.x = -Math.PI / 2
      slabMesh.position.y = base - floor.slab * M
      slabMesh.name = 'room-floor'
      add(slabMesh, ref)
      if (o.ceilings && room.ceiling && o.walls === 'full') {
        const ceil = own(
          new ShapeGeometry(shapeOf(room.outline.map((p) => ({ x: p.x, y: p.y })))),
        )
        scaleUv(ceil, repeatOf(room.ceilingFinish))
        // Seen from below in the walkthrough and from above when floors are cut away.
        const ceilingMaterial = finishMaterial(room.ceilingFinish).clone()
        ceilingMaterial.side = DoubleSide
        ownedMaterials.push(ceilingMaterial)
        const c = new Mesh(ceil, ceilingMaterial)
        c.rotation.x = -Math.PI / 2
        c.position.y = base + wallTop * M - 0.003
        c.castShadow = false
        add(c, ref)
      }
    }

    // Walls, piece by piece; each face its own finish.
    for (const wall of walls) {
      const ref: Ref = { kind: 'walls', id: wall.id }
      const d = wallDir(wall)
      const angle = -Math.atan2(d.y, d.x)
      const left = finishMaterial(wall.finishLeft)
      const right = finishMaterial(wall.finishRight)
      const cap = plain('#e7e5e4', { roughness: 0.9 })
      const limit = o.walls === 'low' ? Math.min(wall.height, 1200) : wall.height
      for (const piece of wallPieces(wall, state.openings, state.walls)) {
        const top = Math.min(piece.top, limit)
        if (top - piece.bottom < 1) continue
        const len = (piece.to - piece.from) * M
        const h = (top - piece.bottom) * M
        const g = own(sizedBox(len, h, wall.thickness * M, repeatOf(wall.finishLeft)))
        // Faces: +x, −x (ends), +y, −y (top, bottom), +z (right face), −z (left face).
        const mesh = new Mesh(g, [cap, cap, cap, cap, right, left])
        const mid = (piece.from + piece.to) / 2
        mesh.position.set(
          (wall.a.x + d.x * mid) * M,
          base + (piece.bottom * M + h / 2),
          (wall.a.y + d.y * mid) * M,
        )
        mesh.rotation.y = angle
        add(mesh, ref)
      }
      // Doors and windows in it.
      for (const op of state.openings.filter((x) => x.wall === wall.id)) {
        const oref: Ref = { kind: 'openings', id: op.id }
        const span = openingSpan(op)
        const n = wallNormal(wall)
        const at = (along: number, across = 0) => ({
          x: (wall.a.x + d.x * along + n.x * across) * M,
          z: (wall.a.y + d.y * along + n.y * across) * M,
        })
        const frame = plain('#f4f4f2', { roughness: 0.5 })
        const t = wall.thickness * M
        if (op.kind === 'window') {
          if (op.sill >= limit) continue
          const h = (Math.min(op.sill + op.height, limit) - op.sill) * M
          const c = at(op.offset)
          const glass = new Mesh(unitBox, finishMaterial('glass-clear'))
          glass.scale.set(op.width * M, h, 0.012)
          glass.position.set(c.x, base + op.sill * M + h / 2, c.z)
          glass.rotation.y = angle
          glass.castShadow = false
          add(glass, oref).castShadow = false
          // Frame: sill, head and the two sides; a mullion for casements.
          const bars: Array<[number, number, number, number]> = [
            [0, op.sill * M + 0.025, op.width * M, 0.05],
            [0, op.sill * M + h - 0.025, op.width * M, 0.05],
            [-(op.width * M) / 2 + 0.025, op.sill * M + h / 2, 0.05, h],
            [(op.width * M) / 2 - 0.025, op.sill * M + h / 2, 0.05, h],
          ]
          if (op.style !== 'fixed') bars.push([0, op.sill * M + h / 2, 0.04, h])
          if (op.style === 'sash') bars.push([0, op.sill * M + h / 2, op.width * M, 0.04])
          for (const [dx, y, w, bh] of bars) {
            const b = new Mesh(unitBox, frame)
            b.scale.set(w, bh, Math.min(t, 0.08))
            const p = at(op.offset + dx / M)
            b.position.set(p.x, base + y, p.z)
            b.rotation.y = angle
            add(b, oref)
          }
          // A window board inside.
          const board = new Mesh(unitBox, frame)
          board.scale.set(op.width * M + 0.06, 0.025, t + 0.06)
          const bp = at(op.offset)
          board.position.set(bp.x, base + op.sill * M, bp.z)
          board.rotation.y = angle
          add(board, oref)
        } else if (op.kind === 'door') {
          const h = Math.min(op.height, limit) * M
          // Frame (two jambs and a head).
          for (const [along, w, y, bh] of [
            [span.start + 25, 50, h / 2, h],
            [span.end - 25, 50, h / 2, h],
            [op.offset, op.width, h - 0.025, 0.05],
          ] as const) {
            const b = new Mesh(unitBox, frame)
            b.scale.set(w * M, bh, t + 0.02)
            const p = at(along)
            b.position.set(p.x, base + y, p.z)
            b.rotation.y = angle
            add(b, oref)
          }
          if (o.walls === 'low') continue
          const leafMat = op.entrance
            ? plain('#334155', { roughness: 0.5 })
            : finishMaterial('birch-ply')
          const side = op.side === 'left' ? 1 : -1
          if (op.style === 'sliding') {
            for (const k of [-1, 1]) {
              const leaf = new Mesh(unitBox, finishMaterial('glass-clear'))
              leaf.scale.set((op.width / 2) * M, h - 0.06, 0.03)
              const p = at(op.offset + (k * op.width) / 4, k * 30)
              leaf.position.set(p.x, base + (h - 0.06) / 2, p.z)
              leaf.rotation.y = angle
              add(leaf, oref).castShadow = false
            }
            continue
          }
          const leaves =
            op.style === 'double'
              ? [
                  { hinge: span.start, w: op.width / 2, dir: 1 },
                  { hinge: span.end, w: op.width / 2, dir: -1 },
                ]
              : [
                  {
                    hinge: op.hinge === 'start' ? span.start : span.end,
                    w: op.width,
                    dir: op.hinge === 'start' ? 1 : -1,
                  },
                ]
          for (const leaf of leaves) {
            // Open at 90° into its side, like the plan (closed, it lies along the wall).
            const pivot = new Object3D()
            const hp = at(leaf.hinge, side * (wall.thickness / 2))
            pivot.position.set(hp.x, base, hp.z)
            const open = angle + leaf.dir * side * (Math.PI / 2)
            pivot.rotation.y = open
            const mid = at(op.offset)
            doors.push({ pivot, closed: angle, open, x: mid.x, y: base, z: mid.z })
            const mesh = new Mesh(unitBox, leafMat)
            mesh.scale.set((leaf.w - 60) * M, h - 0.05, 0.04)
            mesh.position.set((leaf.dir * (leaf.w - 60) * M) / 2, (h - 0.05) / 2, 0)
            mesh.castShadow = o.shadows
            mesh.userData.ref = oref
            pivot.add(mesh)
            group.add(pivot)
          }
        }
      }
    }

    // Stairs: solid steps climbing to the floor above.
    for (const s of state.stairs.filter((x) => x.floor === floor.id)) {
      const to = state.floors.find((f) => f.id === s.to)
      if (!to) continue
      const rise = (to.elevation - floor.elevation) * M
      const steps = Math.max(3, Math.round(rise / 0.18))
      const going = (s.run * M) / steps
      const r = (s.rotation * Math.PI) / 180
      const up = { x: Math.sin(r), z: -Math.cos(r) }
      const mat = finishMaterial('oak-boards')
      for (let i = 0; i < steps; i++) {
        const h = ((i + 1) * rise) / steps
        const step = new Mesh(unitBox, mat)
        step.scale.set(s.width * M, h, going)
        const along = going * (i + 0.5)
        step.position.set(s.x * M + up.x * along, base + h / 2, s.y * M + up.z * along)
        step.rotation.y = -r
        add(step, { kind: 'stairs', id: s.id })
      }
    }

    // Columns.
    for (const c of state.columns.filter((x) => x.floor === floor.id)) {
      const h = (o.walls === 'low' ? 1200 : wallTop) * M
      const mesh = new Mesh(c.round ? unitCylinder : unitBox, finishMaterial(c.finish))
      mesh.scale.set(c.size * M, h, c.size * M)
      mesh.position.set(c.x * M, base + h / 2, c.y * M)
      add(mesh, { kind: 'columns', id: c.id })
    }

    // Balconies and terraces, with railings.
    for (const s of state.slabs.filter((x) => x.floor === floor.id)) {
      const g = own(
        new ExtrudeGeometry(shapeOf(s.outline), { depth: 0.2, bevelEnabled: false }),
      )
      scaleUv(g, repeatOf(s.finish))
      const mesh = new Mesh(g, [finishMaterial(s.finish), plain('#a8a29e')])
      mesh.rotation.x = -Math.PI / 2
      mesh.position.y =
        base - 0.2 + (s.kind === 'terrace' && floor === floors[0] ? 0.05 : 0)
      add(mesh, { kind: 'slabs', id: s.id })
      if (s.railing) {
        const rail = plain('#3f3f46', { roughness: 0.4, metalness: 0.6 })
        s.outline.forEach((p, i) => {
          const q = s.outline[(i + 1) % s.outline.length]
          // No railing against the building's walls.
          const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
          const againstWall = walls.some((w) => {
            const len = wallLength(w)
            const dd = wallDir(w)
            const along = (mid.x - w.a.x) * dd.x + (mid.y - w.a.y) * dd.y
            const off = Math.abs((mid.x - w.a.x) * dd.y - (mid.y - w.a.y) * dd.x)
            return along > 0 && along < len && off < w.thickness
          })
          if (againstWall) return
          const len = Math.hypot(q.x - p.x, q.y - p.y) * M
          const top = new Mesh(unitBox, rail)
          top.scale.set(len, 0.05, 0.05)
          top.position.set(mid.x * M, base + 1.05, mid.y * M)
          top.rotation.y = -Math.atan2(q.y - p.y, q.x - p.x)
          add(top)
          const glass = new Mesh(unitBox, finishMaterial('glass-frosted'))
          glass.scale.set(len, 0.9, 0.015)
          glass.position.set(mid.x * M, base + 0.5, mid.y * M)
          glass.rotation.y = top.rotation.y
          add(glass).castShadow = false
        })
      }
    }

    // Furniture.
    if (o.furniture) {
      for (const item of state.items.filter((i) => i.floor === floor.id)) {
        const entry = catalogEntry(item.kind)
        if (!entry) continue
        const { width, depth, height } = itemSize(item)
        const g = new Group()
        g.position.set(item.x * M, base + item.elevation * M, item.y * M)
        g.rotation.y = (-item.rotation * Math.PI) / 180
        g.userData.ref = { kind: 'items', id: item.id }
        for (const part of entry.build(width, depth, height)) {
          const geo =
            part.shape === 'box'
              ? unitBox
              : part.shape === 'cylinder'
                ? unitCylinder
                : unitSphere
          const mesh = new Mesh(
            geo,
            partMaterial(part.role, item.colour ?? entry.colour, item.material, glow),
          )
          mesh.scale.set(
            Math.max(0.001, part.sx * M),
            Math.max(0.001, part.sy * M),
            Math.max(0.001, part.sz * M),
          )
          mesh.position.set(part.x * M, part.y * M + (part.sy * M) / 2, part.z * M)
          mesh.castShadow = o.shadows && part.role !== 'glow'
          mesh.receiveShadow = o.shadows
          mesh.userData.ref = { kind: 'items', id: item.id }
          g.add(mesh)
        }
        group.add(g)
        if (entry.light && glow && lights.length < 12) {
          const light = new PointLight(
            '#ffd9a0',
            o.lighting === 'night' ? 2.2 : 0.9,
            6,
            1.6,
          )
          light.position.set(
            item.x * M,
            base + Math.min(item.elevation + height, wallTop - 150) * M,
            item.y * M,
          )
          lights.push(light)
          group.add(light)
        }
      }
    }
  }

  // Roofs on the top floor shown (or all floors' when every floor shows).
  if (o.roof) {
    for (const roof of state.roofs) {
      const floor = state.floors.find((f) => f.id === roof.floor)
      if (!floor || !shown.includes(floor)) continue
      if (o.floors !== 'all' && floor !== topShown) continue
      if (o.walls === 'low') continue
      const walls = state.walls.filter((w) => w.floor === floor.id)
      const eaves = (floor.elevation + Math.max(2400, ...walls.map((w) => w.height))) * M
      const mesh = roofMesh(roof, floor, eaves)
      owned.push(mesh.geometry)
      ownedMaterials.push(mesh.material as ThreeMaterial)
      add(mesh, { kind: 'roofs', id: roof.id })
    }
  }

  return {
    group,
    lights,
    doors,
    dispose: () => {
      for (const g of owned) g.dispose()
      for (const m of ownedMaterials) m.dispose()
    },
  }
}

/**
 * A roof over its outline: flat roofs follow the outline exactly; pitched
 * roofs (gable or hip) are built over each rectangle of a square-cornered
 * outline, so an L-shaped plan gets two roofs meeting at the corner (a
 * cross-gable), and over the outline's bounding rectangle otherwise.
 */
function roofMesh(
  roof: StudioState['roofs'][number],
  _floor: Floor,
  eaves: number,
): Mesh {
  const mat = finishMaterial(roof.finish)
  const material = mat.clone()
  material.side = DoubleSide
  if (roof.kind === 'flat') {
    const g = new ExtrudeGeometry(shapeOf(roof.outline), {
      depth: 0.25,
      bevelEnabled: false,
    })
    scaleUv(g, repeatOf(roof.finish))
    const mesh = new Mesh(g, material)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = eaves
    return mesh
  }
  const pieces = isRectilinear(roof.outline)
    ? rectangles(roof.outline)
    : (() => {
        const b = bounds(roof.outline)
        return [{ x0: b.minX, y0: b.minY, x1: b.maxX, y1: b.maxY }]
      })()
  const v: number[] = []
  for (const r of pieces) pitchedPiece(v, r, roof, eaves)
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(v), 3))
  // UVs from plan position, so the covering's pattern runs across the roof.
  const uv = new Float32Array((v.length / 3) * 2)
  const rep = repeatOf(roof.finish)
  for (let i = 0; i < v.length / 3; i++) {
    uv[i * 2] = v[i * 3] / rep
    uv[i * 2 + 1] = (v[i * 3 + 1] + v[i * 3 + 2]) / rep
  }
  g.setAttribute('uv', new BufferAttribute(uv, 2))
  g.computeVertexNormals()
  return new Mesh(g, material)
}

/** One gable or hip roof over a rectangle (mm), its ridge along the longer side. */
function pitchedPiece(
  v: number[],
  r: Rect,
  roof: StudioState['roofs'][number],
  eaves: number,
) {
  const o = roof.overhang
  const x0 = (r.x0 - o) * M
  const x1 = (r.x1 + o) * M
  const z0 = (r.y0 - o) * M
  const z1 = (r.y1 + o) * M
  const w = x1 - x0
  const d = z1 - z0
  const pitch = (roof.pitch * Math.PI) / 180
  const alongX = w >= d
  const half = (alongX ? d : w) / 2
  const top = eaves + Math.tan(pitch) * half
  const tri = (a: number[], b2: number[], c: number[]) => v.push(...a, ...b2, ...c)
  if (alongX) {
    const zm = (z0 + z1) / 2
    const inset = roof.kind === 'hip' ? Math.min(half, w / 2) : 0
    const r0 = [x0 + inset, top, zm]
    const r1 = [x1 - inset, top, zm]
    tri([x0, eaves, z0], r1, [x1, eaves, z0])
    tri([x0, eaves, z0], r0, r1)
    tri([x1, eaves, z1], r0, [x0, eaves, z1])
    tri([x1, eaves, z1], r1, r0)
    tri([x0, eaves, z1], r0, [x0, eaves, z0])
    tri([x1, eaves, z0], r1, [x1, eaves, z1])
  } else {
    const xm = (x0 + x1) / 2
    const inset = roof.kind === 'hip' ? Math.min(half, d / 2) : 0
    const r0 = [xm, top, z0 + inset]
    const r1 = [xm, top, z1 - inset]
    tri([x0, eaves, z1], r1, [x0, eaves, z0])
    tri([x0, eaves, z0], r1, r0)
    tri([x1, eaves, z0], r0, [x1, eaves, z1])
    tri([x1, eaves, z1], r0, r1)
    tri([x0, eaves, z0], r0, [x1, eaves, z0])
    tri([x1, eaves, z1], r1, [x0, eaves, z1])
  }
}

/** The point the camera looks at and how big the building is (m). */
export function buildingFrame(state: StudioState, floor?: string) {
  const pts = state.walls
    .filter((w) => !floor || w.floor === floor)
    .flatMap((w) => [w.a, w.b])
  const all = pts.length ? pts : state.walls.flatMap((w) => [w.a, w.b])
  if (all.length === 0) return { centre: { x: 4, z: 3 }, size: 10 }
  const b = bounds(all)
  return {
    centre: { x: ((b.minX + b.maxX) / 2) * M, z: ((b.minY + b.maxY) / 2) * M },
    size: Math.max(b.width, b.height, 4000) * M,
  }
}
