/**
 * Whether the accessories shop or the wardrobe is open (AccessoryStore.tsx): one
 * shared state, so the phone's Style app, the pause menu's inventory and the
 * wardrobe at home all open the same place.
 */
import { useSyncExternalStore } from 'react'

export type StoreTab = 'shop' | 'wardrobe'

export interface StoreState {
  open: boolean
  tab: StoreTab
}

let state: StoreState = { open: false, tab: 'shop' }
const listeners = new Set<() => void>()

function set(next: StoreState) {
  state = next
  for (const l of listeners) l()
}

export function openStore(tab: StoreTab = 'shop'): void {
  set({ open: true, tab })
}

export function closeStore(): void {
  set({ ...state, open: false })
}

export function showTab(tab: StoreTab): void {
  set({ ...state, tab })
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const read = () => state

export function useStore(): StoreState {
  return useSyncExternalStore(subscribe, read, read)
}
