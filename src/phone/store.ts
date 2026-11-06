/**
 * Whether the phone is out, and which app is open: one shared state, so the
 * page shows the phone, and the character in 3D takes it out, holds it and
 * stands still while it is in use (see PlayerRig), wherever the player is.
 */
import { useSyncExternalStore } from 'react'
import type { PhoneApp } from '../game/phone'

export interface PhoneState {
  open: boolean
  /** The app on screen, or null for the home screen. */
  app: PhoneApp | null
}

let state: PhoneState = { open: false, app: null }
const listeners = new Set<() => void>()

function set(next: PhoneState) {
  state = next
  for (const l of listeners) l()
}

export function openPhone(app: PhoneApp | null = null): void {
  set({ open: true, app })
}

export function closePhone(): void {
  set({ ...state, open: false })
}

export function togglePhone(): void {
  if (state.open) closePhone()
  else openPhone(null)
}

export function showApp(app: PhoneApp | null): void {
  set({ ...state, app })
}

/** Read outside React (the 3D view, every frame). */
export function phoneIsOpen(): boolean {
  return state.open
}

export function usePhone(): PhoneState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}
