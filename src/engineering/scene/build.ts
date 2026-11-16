/**
 * What the build model draws, worked out without React: how far each stage
 * has got, and the solid parts of a wall around its openings. Pure.
 */
import { walls, type BuildingDesign } from '../design'
import type { StageId } from '../quantities'

/** How far each stage has got (0 not started, 1 done). */
export type BuildState = Partial<Record<StageId, number>>

export const FINISHED: BuildState = {
  survey: 1,
  excavation: 1,
  reinforcement: 1,
  foundations: 1,
  slab: 1,
  structure: 1,
  walls: 1,
  openings: 1,
  roofing: 1,
  electrical: 1,
  plumbing: 1,
  hvac: 1,
  finishing: 1,
  inspection: 1,
  handover: 1,
}

/** The build state of a site: its stages done, the current one part way. */
export function buildState(
  stages: StageId[],
  cursor: number,
  fraction: number,
): BuildState {
  const out: BuildState = {}
  stages.forEach((s, i) => {
    out[s] = i < cursor ? 1 : i === cursor ? Math.max(0, Math.min(1, fraction)) : 0
  })
  return out
}

/** The solid parts of one wall, around its openings: [from, to] along it and [bottom, top]. */
export function wallPieces(design: BuildingDesign, index: number) {
  const edge = walls(design)[index]
  const H = design.wall.height
  const total = H * design.storeys
  const holes = design.openings
    .filter((o) => o.wall === index)
    .map((o) => ({
      s: o.offset - o.width / 2,
      e: o.offset + o.width / 2,
      z0: o.storey * H + o.sill,
      z1: o.storey * H + o.sill + o.height,
    }))
  const breaks = [...new Set([0, edge.length, ...holes.flatMap((h) => [h.s, h.e])])]
    .filter((v) => v >= 0 && v <= edge.length)
    .sort((p, q) => p - q)
  const pieces: Array<{ s: number; e: number; z0: number; z1: number }> = []
  for (let i = 0; i + 1 < breaks.length; i++) {
    const s = breaks[i]
    const e = breaks[i + 1]
    if (e - s < 1) continue
    const mid = (s + e) / 2
    const cuts = holes.filter((h) => h.s <= mid && h.e >= mid).sort((p, q) => p.z0 - q.z0)
    let z = 0
    for (const c of cuts) {
      if (c.z0 > z) pieces.push({ s, e, z0: z, z1: c.z0 })
      z = Math.max(z, c.z1)
    }
    if (z < total) pieces.push({ s, e, z0: z, z1: total })
  }
  return { edge, pieces }
}
