/**
 * Interaction anchors (see docs/NPC_ACTIVITIES.md): the places on real
 * furniture and equipment where a person uses it. A chair says where the hips
 * go, which way the sitter faces and how high its cushion is; a desk says
 * where its keyboard is; a printer, a shelf, a counter or a coffee machine
 * says where hands reach to. Each piece of furniture registers its own
 * anchors from its own geometry, in world space, when it appears (and takes
 * them away when it goes), so anything drawn anywhere is usable the same way.
 *
 * People (world/npc/activities.ts) only do an activity when what it needs is
 * really there; seated poses are fitted to the seat they are on
 * (character/fit.ts). Nothing here is hard-coded per scene.
 */
import { useEffect, useRef } from 'react'
import { Euler, Quaternion, Vector3, type Group } from 'three'
import type { PropKind } from './interaction/activity'

export type AnchorKind =
  /** Somewhere to sit: x/z where the hips go, `top` the seat's surface. */
  | 'seat'
  /** A keyboard (a desk computer, a laptop): `y` its keys. */
  | 'keyboard'
  /** A printer's controls and tray. */
  | 'printer'
  /** Shelves, a filing cabinet, fridges: things taken from and put back. */
  | 'shelf'
  /** A counter or worktop (a reception desk, a café counter, a kitchen). */
  | 'counter'
  /** A till at a checkout. */
  | 'checkout'
  /** A coffee machine. */
  | 'coffee-machine'
  /** A water cooler. */
  | 'water'
  /** A whiteboard or screen to present at. */
  | 'whiteboard'
  /** A plant to water. */
  | 'plant'

export interface Anchor {
  id: string
  kind: AnchorKind
  /** World position: for a seat, where the hips go; otherwise where hands reach. */
  x: number
  y: number
  z: number
  /** The way someone using it faces (radians; 0 faces −z, as people do). */
  heading: number
  /** A seat's surface height (world y). */
  top?: number
  /** What someone using it holds (a basket at the shop's shelves, a document from a filing cabinet). */
  carry?: { left?: PropKind; right?: PropKind }
}

const anchors = new Map<string, Anchor>()
let version = 0

/** Bumped whenever anchors come or go (for anything that resolves against them). */
export const anchorsVersion = () => version

export function setAnchor(a: Anchor) {
  anchors.set(a.id, a)
  version++
}

export function removeAnchor(id: string) {
  if (anchors.delete(id)) version++
}

/** Who is on each seat (or has it as theirs): one person a seat. */
const claims = new Map<string, string>()

/** Takes a seat for someone (false if it is someone else's). */
export function claimSeat(id: string, by: string): boolean {
  const owner = claims.get(id)
  if (owner && owner !== by) return false
  claims.set(id, by)
  return true
}

/** Gives up whatever seat someone had. */
export function releaseSeats(by: string) {
  for (const [id, owner] of claims) if (owner === by) claims.delete(id)
}

/** Seats that are someone else's. */
export function seatsTakenBut(by: string): Set<string> {
  const out = new Set<string>()
  for (const [id, owner] of claims) if (owner !== by) out.add(id)
  return out
}

export function seatOwner(id: string): string | undefined {
  return claims.get(id)
}

export function allAnchors(): Anchor[] {
  return [...anchors.values()]
}

/** The nearest anchor of a kind within `within` metres (flat distance), not in `skip`. */
export function nearestAnchor(
  kinds: AnchorKind | readonly AnchorKind[],
  x: number,
  z: number,
  within: number,
  skip?: ReadonlySet<string>,
  from: Iterable<Anchor> = anchors.values(),
): Anchor | null {
  const wanted = typeof kinds === 'string' ? [kinds] : kinds
  let best: Anchor | null = null
  let bestD = within
  for (const a of from) {
    if (!wanted.includes(a.kind) || skip?.has(a.id)) continue
    const d = Math.hypot(a.x - x, a.z - z)
    if (d <= bestD) {
      best = a
      bestD = d
    }
  }
  return best
}

export interface AnchorSpec {
  kind: AnchorKind
  /** In the furniture's own space (as its geometry is drawn). */
  at: [number, number, number]
  /** The way its user faces, in the furniture's own space (0: towards −z). */
  heading?: number
  /** For a seat: the height of its surface, in the furniture's own space. */
  top?: number
  carry?: Anchor['carry']
}

let next = 0
const v = new Vector3()
const q = new Quaternion()
const e = new Euler()

/**
 * Registers a piece of furniture's anchors (put the ref on its group): worked
 * out in world space once it is placed, and removed when it goes.
 */
export function useAnchors(specs: readonly AnchorSpec[]) {
  const ref = useRef<Group>(null)
  const key = JSON.stringify(specs)
  useEffect(() => {
    const g = ref.current
    if (!g) return
    const base = `a${next++}`
    g.updateWorldMatrix(true, false)
    g.getWorldQuaternion(q)
    const yaw = e.setFromQuaternion(q, 'YXZ').y
    const ids = specs.map((s, i) => {
      const id = `${base}:${s.kind}:${i}`
      // The seat's surface, through the same transform (scaled furniture is lower).
      const top =
        s.top === undefined ? undefined : g.localToWorld(v.set(s.at[0], s.top, s.at[2])).y
      v.set(...s.at)
      g.localToWorld(v)
      setAnchor({
        id,
        kind: s.kind,
        x: v.x,
        y: v.y,
        z: v.z,
        heading: yaw + (s.heading ?? 0),
        top,
        carry: s.carry,
      })
      return id
    })
    return () => ids.forEach(removeAnchor)
    // The specs are compared by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return ref
}

// In development, browser tests can see every anchor.
if (import.meta.env.DEV && typeof window !== 'undefined')
  Object.assign(window, {
    __worksimAnchors: () =>
      allAnchors().map((a) => ({ ...a, owner: claims.get(a.id) ?? null })),
  })
