/**
 * The HUD layout manager: one grid over the 3D world, with fixed zones that
 * never overlap (the corners, the top and bottom centre, and a right-hand
 * column for conversations). Every piece of HUD renders into its zone with
 * <HudSlot>, so pieces sharing a zone stack instead of covering each other,
 * and the zones resize with the screen (CSS grid, variables in index.css).
 *
 * Where there is no grid (the city, home, the computer), a slot renders its
 * fallback in place, exactly as before.
 *
 * The context also carries what the player is doing (exploring, or in a
 * conversation), so non-essential pieces can step aside (contextual priority).
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { HudContext, useHud, type HudMode, type HudZone } from './hudContext'

export function HudProvider({ children }: { children: ReactNode }) {
  const [zones, setZones] = useState<Partial<Record<HudZone, HTMLElement>>>({})
  const [mode, setMode] = useState<HudMode>('explore')
  const register = useCallback((zone: HudZone, el: HTMLElement | null) => {
    setZones((z) => {
      if ((z[zone] ?? null) === el) return z
      const next = { ...z }
      if (el) next[zone] = el
      else delete next[zone]
      return next
    })
  }, [])
  const value = useMemo(
    () => ({ zones, register, mode, setMode }),
    [zones, register, mode],
  )
  return <HudContext.Provider value={value}>{children}</HudContext.Provider>
}

const ZONE_CLASS: Record<HudZone, string> = {
  'top-left': 'hud-tl items-start',
  'top-center': 'hud-tc items-center',
  'top-right': 'hud-tr items-end',
  right: 'hud-mr items-end justify-end',
  'bottom-left': 'hud-bl items-start justify-end',
  'bottom-center': 'hud-bc items-center justify-end',
  'bottom-right': 'hud-br items-end justify-end',
}

/** The grid itself: place it over the world, inside a positioned container. */
export function HudLayout() {
  const hud = useHud()
  const register = hud?.register
  // One stable ref callback per zone (a new one each render would unregister and
  // register the zone again, and so render again, forever).
  const refs = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(ZONE_CLASS) as HudZone[]).map((zone) => [
          zone,
          (el: HTMLDivElement | null) => register?.(zone, el),
        ]),
      ) as Record<HudZone, (el: HTMLDivElement | null) => void>,
    [register],
  )
  return (
    <div className="hud-grid" data-testid="hud-layout" data-mode={hud?.mode ?? 'explore'}>
      {(Object.keys(ZONE_CLASS) as HudZone[]).map((zone) => (
        <div
          key={zone}
          ref={refs[zone]}
          className={`hud-zone ${ZONE_CLASS[zone]}`}
          data-hud-zone={zone}
        />
      ))}
    </div>
  )
}

/**
 * Renders into a zone of the grid when there is one (ordered within it),
 * otherwise as the fallback (its own positioning, as before).
 */
export function HudSlot({
  zone,
  order = 0,
  hideWhen,
  passive = false,
  children,
  fallback,
}: {
  zone: HudZone
  order?: number
  /** Steps aside in this mode (contextual priority). */
  hideWhen?: HudMode
  /** Lets clicks through to the world. */
  passive?: boolean
  children: ReactNode
  /** Without a grid: how it shows instead (default: as it is). */
  fallback?: (children: ReactNode) => ReactNode
}) {
  const hud = useHud()
  const el = hud?.zones[zone]
  if (!el) return <>{fallback ? fallback(children) : children}</>
  if (hideWhen && hud.mode === hideWhen) return null
  return createPortal(
    <div
      className={`hud-slot ${passive ? 'pointer-events-none' : 'pointer-events-auto'}`}
      style={{ order }}
    >
      {children}
    </div>,
    el,
  )
}
