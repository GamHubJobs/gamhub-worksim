/**
 * What is solid, read from what is drawn: every visible object standing on
 * the floor between shin and head height becomes a collision shape on the
 * floor plan, matching it (a turned box for an upright object, a circle for a
 * round one, the outline for anything tipped over). So if a thing looks solid
 * it is solid, in every place, without a separate list to keep up to date.
 *
 * Left out: things the player can step over (under 25 cm, like rugs and
 * kerbs), things overhead (lamps, shelves above 1.2 m), the inside of a
 * dome, things too thin to stand against (wires, pens), and anything marked
 * passable (the player, moving traffic, effects): mark a group with
 * `userData.passable = true`. People are a circle where they stand, marked
 * with `userData.person = true`.
 */
import { BackSide, Matrix4, Vector3, type Mesh, type Object3D } from 'three'
import type { Box } from '../character/controller'

/** Below this a thing can be stepped over (metres). */
export const STEP = 0.25
/** Above this a thing is overhead. */
export const HEAD = 1.2
/** A person, standing or seated. */
export const PERSON_RADIUS = 0.24

const corner = new Vector3()
const axis = new Vector3()
const centre = new Vector3()
const relative = new Matrix4()

interface Material {
  side?: number
  visible?: boolean
  transparent?: boolean
  opacity?: number
}

function seeThrough(mesh: Mesh): boolean {
  const list = (
    Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  ) as Material[]
  return list.every(
    (m) =>
      !m ||
      m.visible === false ||
      m.side === BackSide ||
      (m.transparent && (m.opacity ?? 1) < 0.15),
  )
}

/** The floor-plan shape of one mesh (in the space of `root`), or null if it is not solid. */
export function solidOf(mesh: Mesh, toRoot: Matrix4): Box | null {
  const geometry = mesh.geometry
  if (!geometry || seeThrough(mesh)) return null
  if (!geometry.boundingBox) geometry.computeBoundingBox()
  const bb = geometry.boundingBox
  if (!bb || bb.isEmpty()) return null
  const m = relative.multiplyMatrices(toRoot, mesh.matrixWorld)
  // Its height in the room: from the lowest to the highest corner.
  let bottom = Infinity
  let top = -Infinity
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (let i = 0; i < 8; i++) {
    corner
      .set(
        i & 1 ? bb.max.x : bb.min.x,
        i & 2 ? bb.max.y : bb.min.y,
        i & 4 ? bb.max.z : bb.min.z,
      )
      .applyMatrix4(m)
    bottom = Math.min(bottom, corner.y)
    top = Math.max(top, corner.y)
    minX = Math.min(minX, corner.x)
    maxX = Math.max(maxX, corner.x)
    minZ = Math.min(minZ, corner.z)
    maxZ = Math.max(maxZ, corner.z)
  }
  if (top < STEP || bottom > HEAD) return null
  // Upright (turned only about the vertical): its own outline, turned.
  const e = m.elements
  axis.set(e[4], e[5], e[6])
  const upright = axis.length() > 1e-6 && Math.abs(axis.y / axis.length()) > 0.985
  if (upright) {
    const sx = Math.hypot(e[0], e[1], e[2])
    const sz = Math.hypot(e[8], e[9], e[10])
    let hx = ((bb.max.x - bb.min.x) / 2) * sx
    let hz = ((bb.max.z - bb.min.z) / 2) * sz
    if (hx < 0.02 && hz < 0.02) return null
    // Something very thin still has some thickness to stand against.
    hx = Math.max(hx, 0.02)
    hz = Math.max(hz, 0.02)
    centre.set((bb.min.x + bb.max.x) / 2, 0, (bb.min.z + bb.max.z) / 2).applyMatrix4(m)
    const yaw = Math.atan2(-e[2], e[0])
    const params = (
      geometry as { parameters?: { radiusTop?: number; radiusBottom?: number } }
    ).parameters
    const round =
      geometry.type === 'CylinderGeometry' &&
      params &&
      Math.abs(sx - sz) < 1e-3 &&
      Math.abs(hx - hz) < 1e-3
    const box: Box = round
      ? { x: centre.x, z: centre.z, hx, hz: hx, top, round: true }
      : { x: centre.x, z: centre.z, hx, hz, top }
    if (!round && Math.abs(Math.sin(yaw)) > 1e-4) box.yaw = yaw
    return box
  }
  // Tipped over: the outline it covers on the floor.
  const hx = (maxX - minX) / 2
  const hz = (maxZ - minZ) / 2
  if (hx < 0.02 && hz < 0.02) return null
  return {
    x: (minX + maxX) / 2,
    z: (minZ + maxZ) / 2,
    hx: Math.max(hx, 0.02),
    hz: Math.max(hz, 0.02),
    top,
  }
}

/**
 * Every solid thing under `root` (in its space), leaving out `skip` and its
 * children (the player). Read once a place is shown, and again when it changes.
 */
export function scanSolids(
  root: Object3D,
  skip?: Object3D | null,
  /** The space to give the shapes in (the player's room), if not root's. */
  frame: Object3D = root,
): Box[] {
  root.updateMatrixWorld(true)
  const toRoot = new Matrix4().copy(frame.matrixWorld).invert()
  const out: Box[] = []
  const visit = (o: Object3D) => {
    if (o === skip || !o.visible || o.userData.passable) return
    if (o.userData.person) {
      o.getWorldPosition(centre).applyMatrix4(toRoot)
      out.push({
        x: centre.x,
        z: centre.z,
        hx: PERSON_RADIUS,
        hz: PERSON_RADIUS,
        top: 1.7,
        round: true,
      })
      return
    }
    const mesh = o as Mesh
    if (
      mesh.isMesh &&
      !(o as { isInstancedMesh?: boolean }).isInstancedMesh &&
      !(o as { isSkinnedMesh?: boolean }).isSkinnedMesh
    ) {
      const box = solidOf(mesh, toRoot)
      if (box) out.push(box)
    }
    for (const child of o.children) visit(child)
  }
  visit(root)
  return out
}

/** For the camera: only what stands tall (walls, shelves, fridges), not chairs and tables. */
export function tall(boxes: Box[]): Box[] {
  return boxes.filter((b) => b.top >= 1.5)
}
