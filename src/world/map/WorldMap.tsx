/**
 * The world map (M, the HUD's Map button, the pause menu, or the phone's Maps
 * app): the whole neighbourhood, full screen over the paused world, drawn from
 * the same data as the 3D street. Wheel to zoom, drag to pan, click a place
 * for its name, what it is, opening hours, how far, and what there is to do;
 * set it as the destination, and the route (along the pavements, by the
 * street's own walking grid) shows here and on the mini-map. Esc or M closes
 * it, and the game carries on exactly where it was. Nothing here moves the
 * player: they walk there.
 */
import { useEffect, useRef, useState } from 'react'
import { PLACE_ACTIONS, PLACES, type PlaceId } from '../../content/city'
import { formatTime } from '../../game/clock'
import type { ProfileData } from '../../game/career'
import { minutesTo } from '../../game/city'
import { setDestination } from '../../game/nav'
import { ICONS, KINDS } from '../../city/worldMap'
import { MapDrawing } from './MapDrawing'
import { closeMap, useMap } from './store'
import { playerOnMap } from './where'

type Act = (change: (p: ProfileData) => ProfileData) => unknown

export function WorldMap({ profile, act }: { profile: ProfileData; act: Act }) {
  const { pose, route } = useMap()
  const nav = profile.work.life.nav
  const player = playerOnMap(profile, pose)
  const [view, setView] = useState({ x: player.x, z: player.z - 6, width: 120 })
  const [selected, setSelected] = useState<PlaceId | null>(nav.destination)
  const drag = useRef<{ x: number; y: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  useEffect(() => {
    box.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeMap()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const height = view.width * 0.58
  const place = PLACES.find((p) => p.id === selected)
  const known = place ? nav.found.includes(place.id) : false
  const metres = place
    ? Math.round(Math.hypot(place.door[0] - player.x, place.door[1] - player.z))
    : 0
  const indoors = !pose
  return (
    <div
      ref={box}
      tabIndex={-1}
      role="dialog"
      aria-label="World map"
      data-testid="world-map"
      className="fixed inset-0 z-50 flex bg-slate-900/85 outline-none backdrop-blur-sm"
    >
      <div className="relative min-w-0 flex-1">
        <svg
          ref={svg}
          data-testid="world-map-canvas"
          className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
          viewBox={`${view.x - view.width / 2} ${view.z - height / 2} ${view.width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          onWheel={(e) =>
            setView((v) => ({
              ...v,
              width: Math.min(190, Math.max(24, v.width * (1 + e.deltaY * 0.0012))),
            }))
          }
          onPointerDown={(e) => {
            drag.current = { x: e.clientX, y: e.clientY }
          }}
          onPointerMove={(e) => {
            const d = drag.current
            const el = svg.current
            if (!d || !el || e.buttons === 0) return
            const k = view.width / el.clientWidth
            setView((v) => ({
              ...v,
              x: v.x - (e.clientX - d.x) * k,
              z: v.z - (e.clientY - d.y) * k,
            }))
            drag.current = { x: e.clientX, y: e.clientY }
          }}
          onPointerUp={() => (drag.current = null)}
        >
          <MapDrawing
            found={nav.found}
            destination={nav.destination}
            route={route}
            player={player}
            selected={selected}
            onSelect={setSelected}
          />
        </svg>
        <div className="pointer-events-none absolute top-3 left-3 rounded-lg bg-black/60 px-3 py-2 text-sm text-white">
          <p className="font-semibold">The neighbourhood</p>
          <p className="text-xs text-white/80">
            {indoors
              ? 'You are indoors: your position is the place you are in.'
              : 'You are the blue arrow.'}{' '}
            Wheel to zoom, drag to move the map.
          </p>
        </div>
        <div className="absolute right-3 bottom-3 flex gap-1.5">
          {[
            ['−', 1.25],
            ['+', 0.8],
          ].map(([label, k]) => (
            <button
              key={label as string}
              type="button"
              aria-label={label === '+' ? 'Zoom in' : 'Zoom out'}
              onClick={() =>
                setView((v) => ({
                  ...v,
                  width: Math.min(190, Math.max(24, v.width * (k as number))),
                }))
              }
              className="h-9 w-9 rounded-full bg-white text-lg font-semibold text-slate-900 shadow hover:bg-slate-100"
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setView((v) => ({ ...v, x: player.x, z: player.z }))}
            className="rounded-full bg-white px-3 text-sm font-medium text-slate-900 shadow hover:bg-slate-100"
          >
            Where am I?
          </button>
        </div>
      </div>
      <aside className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto bg-white p-4 text-sm text-slate-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Map</h2>
          <button
            type="button"
            onClick={closeMap}
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close <kbd className="font-sans text-xs">M</kbd>
          </button>
        </div>
        {nav.destination && (
          <p
            className="rounded-lg bg-rose-50 p-2 text-rose-900"
            data-testid="map-destination"
          >
            Heading to:{' '}
            <strong>{PLACES.find((p) => p.id === nav.destination)!.name}</strong>
            {indoors && (
              <span className="block text-xs">Go outside to follow the route.</span>
            )}
          </p>
        )}
        {place ? (
          <section
            data-testid="map-details"
            aria-label={known ? place.name : 'A place not yet found'}
          >
            <p className="text-2xl">{known ? ICONS[place.id] : '?'}</p>
            <h3 className="text-base font-semibold text-slate-900">
              {known ? place.name : 'Not yet found'}
            </h3>
            {known ? (
              <>
                <p className="text-xs text-slate-500">{place.kind}</p>
                <p className="mt-1">{place.description}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {place.open
                    ? `Open ${formatTime(place.open[0])} to ${formatTime(place.open[1] % 1440)}`
                    : 'Always open'}{' '}
                  · {metres} m · {minutesTo(profile, place.id)} min on foot
                </p>
                {PLACE_ACTIONS.some((a) => a.place === place.id) && (
                  <ul className="mt-2 list-disc pl-5 text-xs">
                    {PLACE_ACTIONS.filter((a) => a.place === place.id).map((a) => (
                      <li key={a.id}>{a.label}</li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="mt-1">
                Somewhere along the street you have not been yet. Walk past it to find
                out.
              </p>
            )}
            {nav.destination === place.id ? (
              <button
                type="button"
                onClick={() => void act((p) => setDestination(p, null))}
                className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 font-medium hover:bg-slate-50"
              >
                Clear the destination
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void act((p) => setDestination(p, place.id))}
                className="mt-3 w-full rounded-lg bg-blue-700 px-3 py-2 font-medium text-white hover:bg-blue-800"
              >
                Set as destination
              </button>
            )}
          </section>
        ) : (
          <p>Click a place on the map to see what is there.</p>
        )}
        <section aria-label="Key">
          <p className="font-semibold text-slate-900">Key</p>
          <ul className="mt-1 grid grid-cols-2 gap-1 text-xs">
            {PLACES.map((p) => (
              <li key={p.id}>
                {ICONS[p.id]} {KINDS[p.id]}
              </li>
            ))}
            <li>🔵 You</li>
            <li>⭕ Destination</li>
          </ul>
        </section>
      </aside>
    </div>
  )
}
