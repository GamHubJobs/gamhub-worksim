/**
 * Model files from FreeCAD (or any CAD program): OBJ and STL meshes, read
 * enough to know their size and to check them against the design they
 * claim to be. Drawn by three.js's own loaders in the 3D viewer. Pure
 * TypeScript.
 */
import { expectedExtent } from './freecad'
import type { Design } from '../design'

export interface MeshInfo {
  format: 'obj' | 'stl'
  vertices: number
  triangles: number
  /** Bounding box in the file's units (FreeCAD: millimetres, z up). */
  bounds: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }
}

/** The largest model file the game keeps (bytes). */
export const MAX_MODEL_BYTES = 8 * 1024 * 1024

function box() {
  return {
    x0: Infinity,
    y0: Infinity,
    z0: Infinity,
    x1: -Infinity,
    y1: -Infinity,
    z1: -Infinity,
  }
}

function grow(b: MeshInfo['bounds'], x: number, y: number, z: number) {
  if (x < b.x0) b.x0 = x
  if (y < b.y0) b.y0 = y
  if (z < b.z0) b.z0 = z
  if (x > b.x1) b.x1 = x
  if (y > b.y1) b.y1 = y
  if (z > b.z1) b.z1 = z
}

export function readObj(text: string): MeshInfo {
  const b = box()
  let vertices = 0
  let triangles = 0
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.split(/\s+/).map(Number)
      if ([x, y, z].every(Number.isFinite)) {
        grow(b, x, y, z)
        vertices++
      }
    } else if (line.startsWith('f '))
      triangles += Math.max(1, line.split(/\s+/).length - 3)
  }
  if (!vertices) throw new Error('the OBJ file has no vertices')
  return { format: 'obj', vertices, triangles, bounds: b }
}

export function readStl(bytes: Uint8Array): MeshInfo {
  const b = box()
  const head = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 512)))
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const count = bytes.length >= 84 ? view.getUint32(80, true) : 0
  // Binary STL: an 80-byte header, a count, then 50 bytes a triangle.
  if (bytes.length === 84 + count * 50 && count > 0) {
    for (let i = 0; i < count; i++) {
      const at = 84 + i * 50 + 12
      for (let v = 0; v < 3; v++)
        grow(
          b,
          view.getFloat32(at + v * 12, true),
          view.getFloat32(at + v * 12 + 4, true),
          view.getFloat32(at + v * 12 + 8, true),
        )
    }
    return { format: 'stl', vertices: count * 3, triangles: count, bounds: b }
  }
  if (!head.trimStart().startsWith('solid')) throw new Error('this is not an STL file')
  let vertices = 0
  for (const line of new TextDecoder().decode(bytes).split('\n')) {
    const t = line.trim()
    if (!t.startsWith('vertex')) continue
    const [, x, y, z] = t.split(/\s+/).map(Number)
    grow(b, x, y, z)
    vertices++
  }
  if (!vertices) throw new Error('the STL file has no triangles')
  return { format: 'stl', vertices, triangles: Math.round(vertices / 3), bounds: b }
}

/**
 * Does a mesh look like the design (its plan size within 3%)? A mesh of
 * another project, or of an old revision, is reported, not silently used.
 */
export function meshMatches(
  info: MeshInfo,
  design: Design,
): { ok: boolean; message: string } {
  const want = expectedExtent(design)
  const x = info.bounds.x1 - info.bounds.x0
  const y = info.bounds.y1 - info.bounds.y0
  const off = (a: number, b: number) => Math.abs(a - b) / Math.max(1, b)
  const ok = off(x, want.x) <= 0.03 && off(y, want.y) <= 0.03
  const size = `${(x / 1000).toFixed(2)} × ${(y / 1000).toFixed(2)} m`
  return {
    ok,
    message: ok
      ? `The model (${size} on plan) matches the design.`
      : `The model is ${size} on plan; the design would be about ${(want.x / 1000).toFixed(2)} × ${(want.y / 1000).toFixed(2)} m. Is it the export of this revision?`,
  }
}
