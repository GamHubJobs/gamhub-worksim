/**
 * The maps' live state (see WorldMap.tsx and MiniMap.tsx): whether the world
 * map is open; where the player is in the street and which way they face
 * (written by the 3D street every frame); and the route to the destination,
 * worked out by the street's own walking grid (so it follows the pavements and
 * crossings, never through buildings). The destination itself is in the save
 * (life.nav).
 */
import { useSyncExternalStore } from 'react'

export interface Pose {
  x: number
  z: number
  /** Radians; 0 faces −z (north on the map). */
  heading: number
}

interface MapState {
  open: boolean
  /** In the street: the player's pose. Null indoors (the map shows the place instead). */
  pose: Pose | null
  /** The way to the destination, from the player (street coordinates). */
  route: Array<{ x: number; z: number }>
}

let state: MapState = { open: false, pose: null, route: [] }
const listeners = new Set<() => void>()
const emit = () => {
  for (const l of listeners) l()
}

export function openMap(): void {
  state = { ...state, open: true }
  emit()
}

export function closeMap(): void {
  state = { ...state, open: false }
  emit()
}

export function toggleMap(): void {
  if (state.open) closeMap()
  else openMap()
}

export function mapIsOpen(): boolean {
  return state.open
}

/** The street's 3D view: where the player is (cheap; only redraws when they have moved). */
export function setPose(pose: Pose | null): void {
  const p = state.pose
  if (
    pose &&
    p &&
    Math.abs(p.x - pose.x) < 0.05 &&
    Math.abs(p.z - pose.z) < 0.05 &&
    Math.abs(p.heading - pose.heading) < 0.03
  )
    return
  if (!pose && !p) return
  state = { ...state, pose }
  emit()
}

export function setRoute(route: Array<{ x: number; z: number }>): void {
  state = { ...state, route }
  emit()
}

export function useMap(): MapState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

/** How a route is worked out (the street's walking grid registers it while shown). */
let router:
  ((to: { x: number; z: number }) => Array<{ x: number; z: number }> | null) | null = null

export function setRouter(fn: typeof router): void {
  router = fn
}

export function routeTo(to: {
  x: number
  z: number
}): Array<{ x: number; z: number }> | null {
  return router ? router(to) : null
}
