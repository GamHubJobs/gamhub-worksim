/**
 * The Projects app's helpers that are not components: plan geometry, the
 * inspection due, names, downloads.
 */
import { LINTEL, PIER } from '../../engineering/checks'
import { walls, type BuildingDesign, type Opening } from '../../engineering/design'
import type { InspectionId } from '../../engineering/inspections'
import type { ProjectState, Revision } from '../../engineering/state'

/** The plan editor snaps to this (mm). */
export const SNAP = 100

/** Moves a corner; its neighbours follow so every wall stays along the grid. */
export function moveCorner(
  outline: Array<[number, number]>,
  index: number,
  x: number,
  y: number,
): Array<[number, number]> {
  const n = outline.length
  const pts = outline.map((p) => [p[0], p[1]] as [number, number])
  const [ox, oy] = pts[index]
  for (const j of [(index - 1 + n) % n, (index + 1) % n]) {
    if (pts[j][1] === oy) pts[j][1] = y
    else if (pts[j][0] === ox) pts[j][0] = x
  }
  pts[index] = [x, y]
  return pts
}

/** Why an opening cannot go there (null: it fits). */
export function openingProblem(design: BuildingDesign, o: Opening): string | null {
  const w = walls(design)[o.wall]
  if (!w) return 'Not on a wall'
  if (o.offset - o.width / 2 < PIER || o.offset + o.width / 2 > w.length - PIER)
    return `Needs ${PIER} mm of wall either side`
  if (o.sill + o.height > design.wall.height - LINTEL)
    return `Too tall: leave ${LINTEL} mm for the lintel`
  for (const other of design.openings) {
    if (other.id === o.id || other.wall !== o.wall || other.storey !== o.storey) continue
    const gap = Math.abs(other.offset - o.offset) - (other.width + o.width) / 2
    if (gap < PIER) return `Too close to ${other.id}`
  }
  return null
}

/** The inspection due now (or being reworked), if any. */
export function dueInspection(project: ProjectState): InspectionId | null {
  const entry = Object.entries(project.inspections).find(
    ([, s]) => s.status === 'due' || s.status === 'rework',
  )
  return entry ? (entry[0] as InspectionId) : null
}

export function sourceName(source: Revision['source']): string {
  return {
    concept: 'the bid',
    'plan-editor': 'the plan editor',
    specification: 'the specification',
    cadcraft: 'CAD Craft',
    freecad: 'FreeCAD',
  }[source]
}

/** Starts a browser download of text or bytes as a file. */
export function download(
  name: string,
  data: string | Uint8Array,
  type = 'application/octet-stream',
) {
  const blob = new Blob([typeof data === 'string' ? data : data.slice().buffer], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
