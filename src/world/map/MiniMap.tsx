/**
 * The mini-map on the HUD (see store.ts): the street round the player, turned
 * so the way they face is up, with nearby places, the destination, the route
 * and a pointer towards the destination when it is off the edge; "N" shows
 * north. Indoors, it says where the player is. Off in the phone's Settings.
 */
import { PLACES, type PlaceId } from '../../content/city'
import type { ProfileData } from '../../game/career'
import { MapDrawing } from './MapDrawing'
import { openMap, useMap } from './store'
import { playerOnMap } from './where'

const RADIUS = 26

export function MiniMap({ profile }: { profile: ProfileData }) {
  const { pose, route } = useMap()
  const life = profile.work.life
  if (!life.phone.minimap) return null
  const nav = life.nav
  const player = playerOnMap(profile, pose)
  const deg = (player.heading * 180) / Math.PI
  const dest = PLACES.find((p) => p.id === nav.destination)
  // Towards the destination, if it is off the edge (in the turned map).
  let pointer: { x: number; y: number } | null = null
  if (dest) {
    const dx = dest.door[0] - player.x
    const dz = dest.door[1] - player.z
    const c = Math.cos(player.heading)
    const s = Math.sin(player.heading)
    const rx = dx * c - dz * s
    const rz = dx * s + dz * c
    const d = Math.hypot(rx, rz)
    if (d > RADIUS * 0.85)
      pointer = { x: (rx / d) * RADIUS * 0.85, y: (rz / d) * RADIUS * 0.85 }
  }
  const inside = !pose
  const here = PLACES.find(
    (p) => p.id === (life.phase === 'work' ? 'office' : life.city.at),
  )
  return (
    <button
      type="button"
      onClick={openMap}
      data-testid="minimap"
      className="hud-minimap pointer-events-auto relative h-40 w-40 overflow-hidden rounded-full bg-slate-900/85 shadow-lg ring-2 ring-white/30"
    >
      <span className="sr-only">Mini-map: open the world map</span>
      <svg
        aria-hidden
        viewBox={`${-RADIUS} ${-RADIUS} ${RADIUS * 2} ${RADIUS * 2}`}
        className="h-full w-full"
      >
        <g transform={`rotate(${deg}) translate(${-player.x} ${-player.z})`}>
          <MapDrawing
            found={nav.found}
            destination={nav.destination as PlaceId | null}
            route={route}
            player={null}
            labels={false}
            turn={-player.heading}
          />
        </g>
        {/* The player, always in the middle, facing up. */}
        <path
          d="M 0 -2.4 L 1.7 1.7 L 0 0.8 L -1.7 1.7 Z"
          fill="#60a5fa"
          stroke="#ffffff"
          strokeWidth={0.4}
        />
        {pointer && (
          <circle
            data-testid="minimap-pointer"
            cx={pointer.x}
            cy={pointer.y}
            r={1.8}
            fill="#e11d48"
            stroke="#fff"
            strokeWidth={0.4}
          />
        )}
        {/* North. */}
        <text
          x={Math.sin(-player.heading) * -(RADIUS - 3)}
          y={-Math.cos(-player.heading) * (RADIUS - 3)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={3.4}
          fontWeight={700}
          fill="#ffffff"
        >
          N
        </text>
      </svg>
      {inside && here && (
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-3 text-center text-[10px] font-semibold text-white"
        >
          {life.phase === 'work' ? 'At the office' : `In: ${here.name}`}
        </span>
      )}
    </button>
  )
}
