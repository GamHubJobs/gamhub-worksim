/**
 * The floor plan drawn from the model, in millimetres (SVG user units = mm,
 * y down). The editor draws it on screen and the exports render the same
 * component to files, so what is exported is what is on screen.
 */
import { memo } from 'react'
import { catalogEntry, type Symbol } from '../../studio/catalog'
import {
  add,
  centroid,
  itemSize,
  openingSpan,
  pointAlong,
  polygonArea,
  scale,
  wallDir,
  wallLength,
  wallNormal,
  wallPieces,
} from '../../studio/geometry'
import { materialOrDefault } from '../../studio/materials'
import type { Item, Opening, Point, Ref, StudioState, Wall } from '../../studio/model'
import { stairCorners } from '../../studio/ops'
import { formatArea, formatLength } from '../../studio/units'
import { DEFAULT_LAYERS, type Layers } from './shared'

const INK = '#1e293b'
const SELECT = '#2563eb'
const pts = (p: Point[]) => p.map((q) => `${q.x},${q.y}`).join(' ')

function isSelected(selection: Ref[], kind: Ref['kind'], id: string) {
  return selection.some((r) => r.kind === kind && r.id === id)
}

/** A wall's solid outline pieces on the plan (full-height pieces). */
function wallPolys(wall: Wall, state: StudioState): Point[][] {
  const d = wallDir(wall)
  const n = scale(wallNormal(wall), wall.thickness / 2)
  return wallPieces(wall, state.openings, state.walls)
    .filter((p) => p.bottom === 0 && p.top === wall.height)
    .map((p) => {
      const a = add(wall.a, scale(d, p.from))
      const b = add(wall.a, scale(d, p.to))
      return [add(a, n), add(b, n), add(b, scale(n, -1)), add(a, scale(n, -1))]
    })
}

function OpeningSymbol({
  o,
  wall,
  selected,
  hint,
}: {
  o: Opening
  wall: Wall
  selected: boolean
  hint?: 'ok' | 'bad'
}) {
  const n = wallNormal(wall)
  const t = wall.thickness / 2
  const s = openingSpan(o)
  const a = pointAlong(wall, s.start)
  const b = pointAlong(wall, s.end)
  const stroke =
    hint === 'bad' ? '#dc2626' : hint === 'ok' ? '#16a34a' : selected ? SELECT : INK
  const jamb = (p: Point) => (
    <line
      x1={p.x + n.x * t}
      y1={p.y + n.y * t}
      x2={p.x - n.x * t}
      y2={p.y - n.y * t}
      stroke={stroke}
      strokeWidth={1.5}
      vectorEffect="non-scaling-stroke"
    />
  )
  if (o.kind === 'window') {
    const lines = [-t * 0.35, 0, t * 0.35].map((off, i) => (
      <line
        key={i}
        x1={a.x + n.x * off}
        y1={a.y + n.y * off}
        x2={b.x + n.x * off}
        y2={b.y + n.y * off}
        stroke={stroke}
        strokeWidth={i === 1 ? 1.4 : 1}
        vectorEffect="non-scaling-stroke"
      />
    ))
    return (
      <g data-kind="window">
        <polygon
          points={pts([
            add(a, scale(n, t)),
            add(b, scale(n, t)),
            add(b, scale(n, -t)),
            add(a, scale(n, -t)),
          ])}
          fill="#f8fafc"
          stroke={stroke}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {lines}
      </g>
    )
  }
  if (o.kind === 'pass') {
    return (
      <g data-kind="pass">
        {jamb(a)}
        {jamb(b)}
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={stroke}
          strokeWidth={1}
          strokeDasharray="6 4"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    )
  }
  // Doors: the leaf drawn open at 90° to its side, and the arc it sweeps.
  const side = o.side === 'left' ? 1 : -1
  const face = (p: Point) => add(p, scale(n, side * t))
  const leaves: Array<{ hinge: Point; free: Point; dir: number }> = []
  if (o.style === 'double') {
    leaves.push({ hinge: a, free: pointAlong(wall, o.offset), dir: 1 })
    leaves.push({ hinge: b, free: pointAlong(wall, o.offset), dir: -1 })
  } else if (o.style !== 'sliding') {
    const atStart = o.hinge === 'start'
    leaves.push({ hinge: atStart ? a : b, free: atStart ? b : a, dir: atStart ? 1 : -1 })
  }
  return (
    <g data-kind="door">
      {jamb(a)}
      {jamb(b)}
      {o.style === 'sliding' && (
        <>
          <line
            x1={a.x + n.x * t * 0.3}
            y1={a.y + n.y * t * 0.3}
            x2={pointAlong(wall, o.offset + 50).x + n.x * t * 0.3}
            y2={pointAlong(wall, o.offset + 50).y + n.y * t * 0.3}
            stroke={stroke}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={b.x - n.x * t * 0.3}
            y1={b.y - n.y * t * 0.3}
            x2={pointAlong(wall, o.offset - 50).x - n.x * t * 0.3}
            y2={pointAlong(wall, o.offset - 50).y - n.y * t * 0.3}
            stroke={stroke}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
      {leaves.map(({ hinge, free, dir }, i) => {
        const h = face(hinge)
        const len = Math.hypot(free.x - hinge.x, free.y - hinge.y)
        const open = add(h, scale(n, side * len))
        const closed = face(free)
        const sweep = side * dir > 0 ? 0 : 1
        return (
          <g key={i}>
            <line
              x1={h.x}
              y1={h.y}
              x2={open.x}
              y2={open.y}
              stroke={stroke}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={`M ${open.x} ${open.y} A ${len} ${len} 0 0 ${sweep} ${closed.x} ${closed.y}`}
              fill="none"
              stroke={stroke}
              strokeWidth={0.8}
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )
      })}
      {o.entrance && (
        <text
          x={pointAlong(wall, o.offset).x - n.x * side * (t + 260)}
          y={pointAlong(wall, o.offset).y - n.y * side * (t + 260)}
          fontSize={200}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#b45309"
          fontWeight={700}
        >
          ENTRANCE
        </text>
      )}
    </g>
  )
}

/** The plan symbol of a piece of furniture, in its own frame (centred, unrotated). */
function symbolShape(symbol: Symbol, w: number, d: number, stroke: string) {
  const sw = {
    stroke,
    strokeWidth: 1,
    vectorEffect: 'non-scaling-stroke' as const,
    fill: 'none',
  }
  const x0 = -w / 2
  const y0 = -d / 2
  switch (symbol) {
    case 'bed':
      return (
        <>
          <rect
            x={x0 + w * 0.08}
            y={y0 + d * 0.05}
            width={w * 0.38}
            height={d * 0.16}
            rx={40}
            {...sw}
          />
          <rect
            x={x0 + w * 0.54}
            y={y0 + d * 0.05}
            width={w * 0.38}
            height={d * 0.16}
            rx={40}
            {...sw}
          />
          <line x1={x0} y1={y0 + d * 0.3} x2={x0 + w} y2={y0 + d * 0.3} {...sw} />
        </>
      )
    case 'sofa':
      return (
        <>
          <rect x={x0} y={y0} width={w} height={d * 0.25} {...sw} />
          <rect x={x0} y={y0} width={w * 0.12} height={d} {...sw} />
          <rect x={x0 + w * 0.88} y={y0} width={w * 0.12} height={d} {...sw} />
        </>
      )
    case 'chair':
      return <rect x={x0} y={y0} width={w} height={d * 0.18} {...sw} />
    case 'round':
      return <ellipse cx={0} cy={0} rx={w / 2} ry={d / 2} {...sw} />
    case 'desk':
      return (
        <line
          x1={x0 + w * 0.3}
          y1={y0 + d}
          x2={x0 + w * 0.7}
          y2={y0 + d}
          {...sw}
          strokeWidth={3}
        />
      )
    case 'cabinet':
      return <line x1={x0} y1={y0} x2={x0 + w} y2={y0 + d} {...sw} />
    case 'wc':
      return (
        <>
          <rect x={x0} y={y0} width={w} height={d * 0.28} {...sw} />
          <ellipse cx={0} cy={y0 + d * 0.62} rx={w * 0.42} ry={d * 0.34} {...sw} />
        </>
      )
    case 'bath':
      return (
        <rect
          x={x0 + 60}
          y={y0 + 60}
          width={w - 120}
          height={d - 120}
          rx={Math.min(w, d) * 0.3}
          {...sw}
        />
      )
    case 'basin':
      return <ellipse cx={0} cy={y0 + d * 0.55} rx={w * 0.35} ry={d * 0.3} {...sw} />
    case 'shower':
      return (
        <>
          <line x1={x0} y1={y0} x2={x0 + w} y2={y0 + d} {...sw} />
          <line x1={x0 + w} y1={y0} x2={x0} y2={y0 + d} {...sw} />
        </>
      )
    case 'sink':
      return (
        <rect
          x={-w * 0.25}
          y={y0 + d * 0.2}
          width={w * 0.5}
          height={d * 0.55}
          rx={30}
          {...sw}
        />
      )
    case 'hob':
      return (
        <>
          {[-1, 1].flatMap((i) =>
            [-1, 1].map((j) => (
              <circle
                key={`${i}${j}`}
                cx={(i * w) / 5}
                cy={(j * d) / 5}
                r={Math.min(w, d) / 8}
                {...sw}
              />
            )),
          )}
        </>
      )
    case 'appliance':
      return (
        <>
          <line x1={x0} y1={y0} x2={x0 + w} y2={y0 + d} {...sw} />
          <line x1={x0 + w} y1={y0} x2={x0} y2={y0 + d} {...sw} />
        </>
      )
    case 'plant':
      return (
        <>
          <circle cx={0} cy={0} r={Math.min(w, d) / 2} {...sw} />
          {[0, 60, 120].map((a) => (
            <line
              key={a}
              x1={(Math.cos((a * Math.PI) / 180) * Math.min(w, d)) / 2}
              y1={(Math.sin((a * Math.PI) / 180) * Math.min(w, d)) / 2}
              x2={(-Math.cos((a * Math.PI) / 180) * Math.min(w, d)) / 2}
              y2={(-Math.sin((a * Math.PI) / 180) * Math.min(w, d)) / 2}
              {...sw}
            />
          ))}
        </>
      )
    case 'rug':
      return (
        <rect
          x={x0 + 40}
          y={y0 + 40}
          width={w - 80}
          height={d - 80}
          {...sw}
          strokeDasharray="8 6"
        />
      )
    case 'light':
      return (
        <>
          <line x1={x0} y1={0} x2={x0 + w} y2={0} {...sw} />
          <line x1={0} y1={y0} x2={0} y2={y0 + d} {...sw} />
        </>
      )
    case 'screen':
      return (
        <line
          x1={x0}
          y1={y0 + d - 20}
          x2={x0 + w}
          y2={y0 + d - 20}
          {...sw}
          strokeWidth={3}
        />
      )
    default:
      return null
  }
}

function ItemShape({
  item,
  selected,
  ghost,
}: {
  item: Item
  selected: boolean
  ghost?: 'ok' | 'bad'
}) {
  const entry = catalogEntry(item.kind)
  const { width: w, depth: d } = itemSize(item)
  const stroke = ghost === 'bad' ? '#dc2626' : selected || ghost ? SELECT : '#334155'
  const round =
    entry?.symbol === 'round' || entry?.symbol === 'plant' || entry?.symbol === 'light'
  const fill =
    entry?.symbol === 'rug'
      ? `${item.colour ?? entry.colour}55`
      : entry?.walkable && item.elevation > 300
        ? 'none'
        : '#ffffff'
  return (
    <g
      transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`}
      opacity={ghost ? 0.75 : 1}
      data-testid="plan-item"
      data-kind={item.kind}
    >
      {round ? (
        <ellipse
          cx={0}
          cy={0}
          rx={w / 2}
          ry={d / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={selected ? 2 : 1.2}
          vectorEffect="non-scaling-stroke"
          strokeDasharray={item.elevation > 300 ? '6 4' : undefined}
        />
      ) : (
        <rect
          x={-w / 2}
          y={-d / 2}
          width={w}
          height={d}
          rx={20}
          fill={fill}
          stroke={stroke}
          strokeWidth={selected ? 2 : 1.2}
          vectorEffect="non-scaling-stroke"
          strokeDasharray={item.elevation > 300 ? '6 4' : undefined}
        />
      )}
      {entry && symbolShape(entry.symbol, w, d, stroke)}
    </g>
  )
}

export interface PlanDrawingProps {
  state: StudioState
  floor: string
  selection?: Ref[]
  layers?: Layers
  /** Hide the background grid (exports). */
  grid?: boolean
  /** Extra: an opening shown while placing, an item ghost. */
  ghostOpening?: { opening: Opening; wall: Wall; ok: boolean } | null
  ghostItem?: { item: Item; ok: boolean } | null
  /** mm per screen pixel, for text sizes that stay readable. */
  pixel?: number
}

export const PlanDrawing = memo(function PlanDrawing({
  state,
  floor,
  selection = [],
  layers = DEFAULT_LAYERS,
  ghostOpening,
  ghostItem,
  pixel = 10,
}: PlanDrawingProps) {
  const units = state.project.units
  const walls = state.walls.filter((w) => w.floor === floor)
  const rooms = state.rooms.filter((r) => r.floor === floor)
  const sorted = [...state.floors].sort((a, b) => a.elevation - b.elevation)
  const index = sorted.findIndex((f) => f.id === floor)
  const below = index > 0 ? sorted[index - 1] : null
  const text = Math.max(110, Math.min(400, pixel * 12))
  return (
    <g data-testid="plan-drawing">
      {layers.below && below && (
        <g opacity={0.18} data-testid="plan-below">
          {state.walls
            .filter((w) => w.floor === below.id)
            .flatMap((w) =>
              wallPolys(w, state).map((p, i) => (
                <polygon key={`${w.id}-${i}`} points={pts(p)} fill="#64748b" />
              )),
            )}
        </g>
      )}
      {state.slabs
        .filter((s) => s.floor === floor)
        .map((s) => (
          <g key={s.id} data-testid="plan-slab">
            <polygon
              points={pts(s.outline)}
              fill={`${materialOrDefault(s.finish).colour}66`}
              stroke={isSelected(selection, 'slabs', s.id) ? SELECT : '#78716c'}
              strokeWidth={isSelected(selection, 'slabs', s.id) ? 2 : 1}
              strokeDasharray="10 6"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={centroid(s.outline).x}
              y={centroid(s.outline).y}
              fontSize={text}
              textAnchor="middle"
              fill="#57534e"
            >
              {s.kind === 'balcony' ? 'Balcony' : 'Terrace'}
            </text>
          </g>
        ))}
      {rooms.map((r) => {
        const sel = isSelected(selection, 'rooms', r.id)
        return (
          <polygon
            key={r.id}
            points={pts(r.outline)}
            fill={sel ? '#dbeafe' : `${materialOrDefault(r.floorFinish).colour}33`}
            stroke={sel ? SELECT : 'none'}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            data-testid="plan-room"
            data-name={r.name}
          />
        )
      })}
      {state.stairs
        .filter((s) => s.floor === floor || s.to === floor)
        .map((s) => {
          const c = stairCorners(s)
          const steps = Math.max(2, Math.round(s.run / 250))
          const sel = isSelected(selection, 'stairs', s.id)
          const lines = []
          for (let i = 1; i < steps; i++) {
            const t = i / steps
            lines.push(
              <line
                key={i}
                x1={c[0].x + (c[3].x - c[0].x) * t}
                y1={c[0].y + (c[3].y - c[0].y) * t}
                x2={c[1].x + (c[2].x - c[1].x) * t}
                y2={c[1].y + (c[2].y - c[1].y) * t}
                stroke="#475569"
                strokeWidth={0.8}
                vectorEffect="non-scaling-stroke"
              />,
            )
          }
          const mid0 = { x: (c[0].x + c[1].x) / 2, y: (c[0].y + c[1].y) / 2 }
          const mid1 = { x: (c[2].x + c[3].x) / 2, y: (c[2].y + c[3].y) / 2 }
          return (
            <g key={s.id} opacity={s.floor === floor ? 1 : 0.45} data-testid="plan-stair">
              <polygon
                points={pts(c)}
                fill="#f8fafc"
                stroke={sel ? SELECT : '#334155'}
                strokeWidth={sel ? 2 : 1.2}
                vectorEffect="non-scaling-stroke"
              />
              {lines}
              <line
                x1={mid0.x}
                y1={mid0.y}
                x2={mid1.x}
                y2={mid1.y}
                stroke="#334155"
                strokeWidth={1.2}
                vectorEffect="non-scaling-stroke"
                markerEnd="url(#studio-arrow)"
              />
              <text
                x={mid0.x}
                y={mid0.y + text}
                fontSize={text * 0.8}
                textAnchor="middle"
                fill="#334155"
              >
                {s.floor === floor ? 'UP' : 'DOWN'}
              </text>
            </g>
          )
        })}
      {layers.furniture &&
        state.items
          .filter((i) => i.floor === floor)
          .sort(
            (a, b) =>
              (catalogEntry(a.kind)?.symbol === 'rug' ? -1 : 0) -
                (catalogEntry(b.kind)?.symbol === 'rug' ? -1 : 0) ||
              a.elevation - b.elevation,
          )
          .map((i) => (
            <ItemShape
              key={i.id}
              item={i}
              selected={isSelected(selection, 'items', i.id)}
            />
          ))}
      {walls.map((w) => {
        const sel = isSelected(selection, 'walls', w.id)
        return (
          <g key={w.id} data-testid="plan-wall">
            {wallPolys(w, state).map((p, i) => (
              <polygon
                key={i}
                points={pts(p)}
                fill={
                  sel
                    ? SELECT
                    : w.type === 'exterior'
                      ? '#1e293b'
                      : w.type === 'interior'
                        ? '#475569'
                        : '#64748b'
                }
                stroke={sel ? SELECT : INK}
                strokeWidth={0.6}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        )
      })}
      {state.openings.map((o) => {
        const wall = walls.find((w) => w.id === o.wall)
        if (!wall) return null
        return (
          <OpeningSymbol
            key={o.id}
            o={o}
            wall={wall}
            selected={isSelected(selection, 'openings', o.id)}
          />
        )
      })}
      {state.columns
        .filter((c) => c.floor === floor)
        .map((c) => {
          const sel = isSelected(selection, 'columns', c.id)
          return c.round ? (
            <circle
              key={c.id}
              cx={c.x}
              cy={c.y}
              r={c.size / 2}
              fill={sel ? SELECT : '#334155'}
            />
          ) : (
            <rect
              key={c.id}
              x={c.x - c.size / 2}
              y={c.y - c.size / 2}
              width={c.size}
              height={c.size}
              fill={sel ? SELECT : '#334155'}
            />
          )
        })}
      {layers.roof &&
        state.roofs
          .filter((r) => r.floor === floor)
          .map((r) => (
            <polygon
              key={r.id}
              points={pts(r.outline)}
              fill="none"
              stroke={isSelected(selection, 'roofs', r.id) ? SELECT : '#9a3412'}
              strokeWidth={1.5}
              strokeDasharray="14 8"
              vectorEffect="non-scaling-stroke"
              data-testid="plan-roof"
            />
          ))}
      {layers.dimensions &&
        walls.map((w) => {
          const len = wallLength(w)
          if (len < 300) return null
          const n = wallNormal(w)
          const mid = pointAlong(w, len / 2)
          const off = w.thickness / 2 + text * 0.9
          const p = add(mid, scale(n, off))
          let angle = (Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x) * 180) / Math.PI
          if (angle > 90) angle -= 180
          if (angle < -90) angle += 180
          return (
            <text
              key={w.id}
              x={p.x}
              y={p.y}
              fontSize={text * 0.85}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#475569"
              transform={`rotate(${angle} ${p.x} ${p.y})`}
              data-testid="wall-length"
            >
              {formatLength(len, units)}
            </text>
          )
        })}
      {state.dimensions
        .filter((d) => d.floor === floor)
        .map((d) => {
          const len = Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y)
          if (len < 1) return null
          const n = { x: -(d.b.y - d.a.y) / len, y: (d.b.x - d.a.x) / len }
          const a = add(d.a, scale(n, d.offset))
          const b = add(d.b, scale(n, d.offset))
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
          let angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
          if (angle > 90) angle -= 180
          if (angle < -90) angle += 180
          const sel = isSelected(selection, 'dimensions', d.id)
          const c = sel ? SELECT : '#0f766e'
          return (
            <g key={d.id} data-testid="plan-dimension">
              <line
                x1={d.a.x}
                y1={d.a.y}
                x2={a.x + n.x * 80}
                y2={a.y + n.y * 80}
                stroke={c}
                strokeWidth={0.6}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={d.b.x}
                y1={d.b.y}
                x2={b.x + n.x * 80}
                y2={b.y + n.y * 80}
                stroke={c}
                strokeWidth={0.6}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={c}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                markerStart="url(#studio-tick)"
                markerEnd="url(#studio-tick)"
              />
              <text
                x={mid.x - n.x * text * 0.5}
                y={mid.y - n.y * text * 0.5}
                fontSize={text * 0.9}
                textAnchor="middle"
                fill={c}
                transform={`rotate(${angle} ${mid.x - n.x * text * 0.5} ${mid.y - n.y * text * 0.5})`}
              >
                {formatLength(len, units)}
              </text>
            </g>
          )
        })}
      {layers.labels &&
        rooms.map((r) => {
          const c = centroid(r.outline)
          return (
            <g key={r.id} pointerEvents="none">
              <text
                x={c.x}
                y={c.y - text * 0.2}
                fontSize={text * 1.1}
                fontWeight={600}
                textAnchor="middle"
                fill="#0f172a"
                data-testid="room-label"
              >
                {r.name}
              </text>
              <text
                x={c.x}
                y={c.y + text * 1.05}
                fontSize={text * 0.85}
                textAnchor="middle"
                fill="#475569"
                data-testid="room-area"
              >
                {formatArea(polygonArea(r.outline), units)}
              </text>
            </g>
          )
        })}
      {state.labels
        .filter((l) => l.floor === floor)
        .map((l) => (
          <text
            key={l.id}
            x={l.x}
            y={l.y}
            fontSize={text}
            textAnchor="middle"
            fill={isSelected(selection, 'labels', l.id) ? SELECT : '#7c2d12'}
            fontStyle="italic"
            data-testid="plan-label"
          >
            {l.text}
          </text>
        ))}
      {ghostOpening && (
        <OpeningSymbol
          o={ghostOpening.opening}
          wall={ghostOpening.wall}
          selected={false}
          hint={ghostOpening.ok ? 'ok' : 'bad'}
        />
      )}
      {ghostItem && (
        <ItemShape
          item={ghostItem.item}
          selected={false}
          ghost={ghostItem.ok ? 'ok' : 'bad'}
        />
      )}
    </g>
  )
})

/** Markers used by the drawing (arrowheads, dimension ticks). */
export function PlanDefs() {
  return (
    <defs>
      <marker
        id="studio-arrow"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="8"
        markerHeight="8"
        orient="auto-start-reverse"
      >
        <path d="M0 0 10 5 0 10z" fill="#334155" />
      </marker>
      <marker
        id="studio-tick"
        viewBox="0 0 10 10"
        refX="5"
        refY="5"
        markerWidth="10"
        markerHeight="10"
        orient="auto"
      >
        <path d="M2 8 8 2" stroke="#0f766e" strokeWidth="1.5" />
      </marker>
    </defs>
  )
}

/** A library item's plan symbol on its own (the library's tiles). */
export function ItemPreview({
  kind,
  className = 'h-12 w-12',
}: {
  kind: string
  className?: string
}) {
  const entry = catalogEntry(kind)
  if (!entry) return null
  const m = Math.max(entry.width, entry.depth) * 0.6
  const item: Item = {
    id: 'preview',
    floor: '',
    kind,
    x: 0,
    y: 0,
    rotation: 0,
    elevation: 0,
  }
  return (
    <svg viewBox={`${-m} ${-m} ${m * 2} ${m * 2}`} className={className} aria-hidden>
      <ItemShape item={item} selected={false} />
    </svg>
  )
}
