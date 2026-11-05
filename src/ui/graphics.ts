/**
 * Graphics quality for the 3D views (office, home, street, places): Auto
 * lowers detail on computers that draw 3D in software; High and Low force it.
 * Kept on this device.
 */
import { useSyncExternalStore } from 'react'

export type Quality = 'auto' | 'high' | 'low'

export const GRAPHICS_KEY = 'worksim.graphics.v1'

const listeners = new Set<() => void>()

function read(): Quality {
  try {
    const value =
      typeof window === 'undefined' ? null : window.localStorage.getItem(GRAPHICS_KEY)
    return value === 'high' || value === 'low' ? value : 'auto'
  } catch {
    return 'auto'
  }
}

let current: Quality = read()

export function graphicsQuality(): Quality {
  return current
}

export function setGraphicsQuality(quality: Quality): void {
  current = quality
  try {
    window.localStorage.setItem(GRAPHICS_KEY, quality)
  } catch {
    // Storage blocked: the choice still applies until the page closes.
  }
  for (const listener of listeners) listener()
}

export function useGraphicsQuality(): Quality {
  return useSyncExternalStore(
    (change) => {
      listeners.add(change)
      return () => listeners.delete(change)
    },
    () => current,
  )
}

/** Whether to draw with less detail: the player's choice, or what the computer can do. */
export function isLow(quality: Quality, software: boolean): boolean {
  return quality === 'low' || (quality === 'auto' && software)
}
