/**
 * What a room's objects can see of the player while they act: which activity
 * is running and how far in, and where the hands are (so a barbell or a cup
 * can follow them). Filled in by the player every frame.
 */
import { createContext, useContext, type RefObject } from 'react'
import type { ActivityNow, Hands } from './PlayerRig'

export interface WorldState {
  now: RefObject<ActivityNow>
  hands: RefObject<Hands>
  /** Fewer particles and lights on low graphics. */
  low: boolean
}

export const World = createContext<WorldState | null>(null)

export function useWorld(): WorldState {
  const world = useContext(World)
  if (!world) throw new Error('useWorld needs a World provider (a walkable 3D view).')
  return world
}
