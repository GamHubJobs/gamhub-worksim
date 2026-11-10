/**
 * The neighbourhood drawn from its own data (city/worldMap.ts): the grass, the
 * park, the road with its pavements and crossings, the buildings, the places
 * (found ones with their icon; others as "not yet found"), the route, the
 * destination and the player. In street coordinates (x east, z south), so it
 * can be panned, zoomed and turned by the map that holds it.
 */
import { PLACES, type PlaceId } from '../../content/city'
import {
  BUILDING_DEPTH,
  BUILDING_FRONT,
  BUILDINGS,
  CROSSINGS,
  ICONS,
  PARK,
  PAVEMENTS,
  ROAD,
} from '../../city/worldMap'
import type { Pose } from './store'

export function MapDrawing({
  found,
  destination,
  route,
  player,
  selected,
  onSelect,
  labels = true,
  /** Turned so the player faces up (the mini-map): icons are turned back upright. */
  turn = 0,
}: {
  found: PlaceId[]
  destination: PlaceId | null
  route: Array<{ x: number; z: number }>
  player: Pose | null
  selected?: PlaceId | null
  onSelect?: (id: PlaceId) => void
  labels?: boolean
  turn?: number
}) {
  const upright = (x: number, z: number) => `rotate(${(turn * 180) / Math.PI} ${x} ${z})`
  return (
    <g>
      <rect x={-90} y={-60} width={180} height={100} fill="#a3b18a" />
      <rect
        x={PARK.minX}
        y={PARK.minZ}
        width={PARK.maxX - PARK.minX}
        height={PARK.maxZ - PARK.minZ}
        fill="#65a30d"
        rx={2}
      />
      <ellipse cx={45} cy={-28} rx={6} ry={4} fill="#38bdf8" opacity={0.8} />
      <rect
        x={ROAD.minX}
        y={-ROAD.halfWidth}
        width={ROAD.maxX - ROAD.minX}
        height={ROAD.halfWidth * 2}
        fill="#3f4349"
      />
      {PAVEMENTS.map((p) => (
        <rect
          key={p.z}
          x={ROAD.minX}
          y={p.z - p.width / 2}
          width={ROAD.maxX - ROAD.minX}
          height={p.width}
          fill="#d6d3d1"
        />
      ))}
      <line
        x1={ROAD.minX}
        y1={0}
        x2={ROAD.maxX}
        y2={0}
        stroke="#e7e5e4"
        strokeWidth={0.25}
        strokeDasharray="2.4 3.6"
      />
      {CROSSINGS.map((x) => (
        <rect
          key={x}
          x={x - 1.5}
          y={-ROAD.halfWidth}
          width={3}
          height={ROAD.halfWidth * 2}
          fill="url(#zebra)"
        />
      ))}
      <defs>
        <pattern id="zebra" width={3} height={1.8} patternUnits="userSpaceOnUse">
          <rect width={3} height={0.9} fill="#f5f5f4" />
        </pattern>
      </defs>
      {BUILDINGS.map((b, i) => (
        <rect
          key={i}
          x={b.x - b.w / 2}
          y={b.side > 0 ? BUILDING_FRONT : -BUILDING_FRONT - BUILDING_DEPTH}
          width={b.w}
          height={BUILDING_DEPTH}
          fill={b.color}
          stroke="#78716c"
          strokeWidth={0.2}
        />
      ))}
      {route.length > 1 && (
        <polyline
          data-testid="map-route"
          points={route.map((p) => `${p.x},${p.z}`).join(' ')}
          fill="none"
          stroke="#2563eb"
          strokeWidth={1.1}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
        />
      )}
      {PLACES.map((p) => {
        const known = found.includes(p.id)
        const [x, z] = p.door
        const isDest = destination === p.id
        return (
          <g
            key={p.id}
            data-testid={`map-place-${p.id}`}
            transform={upright(x, z)}
            onClick={onSelect ? () => onSelect(p.id) : undefined}
            style={onSelect ? { cursor: 'pointer' } : undefined}
            role={onSelect ? 'button' : undefined}
            aria-label={onSelect ? (known ? p.name : 'A place not yet found') : undefined}
          >
            {isDest && (
              <circle
                cx={x}
                cy={z}
                r={4.2}
                fill="none"
                stroke="#e11d48"
                strokeWidth={0.8}
              />
            )}
            <circle
              cx={x}
              cy={z}
              r={2.8}
              fill={known ? p.colour : '#9ca3af'}
              stroke={selected === p.id ? '#facc15' : '#ffffff'}
              strokeWidth={selected === p.id ? 0.9 : 0.5}
            />
            <text x={x} y={z + 1.2} textAnchor="middle" fontSize={3.2}>
              {known ? ICONS[p.id] : '?'}
            </text>
            {labels && (
              <text
                x={x}
                y={z + (z > 0 ? 6.5 : -4.2)}
                textAnchor="middle"
                fontSize={2.4}
                fontWeight={600}
                fill="#1c1917"
                stroke="#ffffff"
                strokeWidth={0.6}
                paintOrder="stroke"
              >
                {known ? p.name : 'Not yet found'}
              </text>
            )}
          </g>
        )
      })}
      {player && (
        <g
          data-testid="map-player"
          transform={`translate(${player.x} ${player.z}) rotate(${(-player.heading * 180) / Math.PI})`}
        >
          <circle r={2.2} fill="#2563eb" opacity={0.25} />
          <path
            d="M 0 -2 L 1.4 1.4 L 0 0.6 L -1.4 1.4 Z"
            fill="#1d4ed8"
            stroke="#ffffff"
            strokeWidth={0.35}
          />
        </g>
      )}
    </g>
  )
}
