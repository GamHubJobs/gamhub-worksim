/** The HUD layout's shared state (see Hud.tsx). */
import { createContext, useContext } from 'react'

export type HudZone =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export type HudMode = 'explore' | 'dialogue'

export interface HudState {
  zones: Partial<Record<HudZone, HTMLElement>>
  register: (zone: HudZone, el: HTMLElement | null) => void
  mode: HudMode
  setMode: (mode: HudMode) => void
}

export const HudContext = createContext<HudState | null>(null)

export function useHud() {
  return useContext(HudContext)
}
