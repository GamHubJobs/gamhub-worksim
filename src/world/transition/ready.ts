/**
 * Whether the world on screen is ready to be seen, for the game's opening
 * (launch/): the 3D place has drawn itself (WalkView, from the player rig's
 * first frames), or the screen shown is not a 3D place at all (the work
 * computer, the day's end, the first-day screen). And whether something covers
 * the world (the opening): while it does, the places do not redraw for nothing.
 */
import { useSyncExternalStore } from 'react'

let ready = false
let loaded = false
let covered = false
const listeners = new Set<() => void>()
const emit = () => {
  for (const l of listeners) l()
}

/** The place (or screen) on show is ready to be seen. */
export function markWorldReady(): void {
  if (ready) return
  ready = true
  emit()
}

/** The game itself (the desk, the world) has loaded and is on the page. */
export function markGameLoaded(): void {
  if (loaded) return
  loaded = true
  emit()
}

export function useGameLoaded(): boolean {
  return useSyncExternalStore(subscribe, () => loaded)
}

export function worldIsReady(): boolean {
  return ready
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function useWorldReady(): boolean {
  return useSyncExternalStore(subscribe, () => ready)
}

/** The opening covers the world (it draws only when something changes). */
export function setWorldCovered(on: boolean): void {
  covered = on
}

/**
 * Read by the places' slow redraw (their Ticker). Only once the place has drawn
 * itself: until then it must keep drawing, or it would never be ready.
 */
export function worldCovered(): boolean {
  return covered && ready
}

/** For tests. */
export function resetWorldReady(): void {
  ready = false
  loaded = false
  covered = false
}
