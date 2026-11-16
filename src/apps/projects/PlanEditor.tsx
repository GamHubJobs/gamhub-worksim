/**
 * The plan editor: the building's plan on a grid, edited directly. Drag a
 * corner (walls stay square), place a door or a window on a wall (it shows
 * green where it fits and red where it does not, and why), drag openings
 * along their wall, place and move columns, and type exact sizes in the
 * inspector. Everything snaps to 100 mm. What is drawn here is the design
 * the checks, the documents and the site use.
 */
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { CATALOGUE, LINTEL, type Finding } from '../../engineering/checks'
import { SNAP, moveCorner, openingProblem } from './helpers'
import {
  bounds,
  insideOutline,
  walls,
  type BuildingDesign,
  type Column,
  type Opening,
} from '../../engineering/design'

type Tool = 'select' | 'door' | 'window' | 'column'
type Selection =
  | { kind: 'opening'; id: string }
  | { kind: 'column'; id: string }
  | { kind: 'corner'; index: number }
  | null

const snap = (v: number) => Math.round(v / SNAP) * SNAP

function nextId(design: BuildingDesign, prefix: string): string {
  const used = new Set([
    ...design.openings.map((o) => o.id),
    ...design.columns.map((c) => c.id),
  ])
  let n = 1
  while (used.has(`${prefix}${n}`)) n++
  return `${prefix}${n}`
}

interface Props {
  design: BuildingDesign
  findings: Finding[]
  readOnly?: boolean
  onChange: (design: BuildingDesign) => void
}

export function PlanEditor({ design, findings, readOnly, onChange }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [selected, setSelected] = useState<Selection>(null)
  const [storey, setStorey] = useState(0)
  const [width, setWidth] = useState({ door: 1000, window: 1200 })
  const [ghost, setGhost] = useState<{
    opening?: Opening
    column?: Column
    problem: string | null
  } | null>(null)
  const [drag, setDrag] = useState<{ draft: BuildingDesign } | null>(null)
  const shown = drag?.draft ?? design
  const edges = useMemo(() => walls(shown), [shown])
  const b = bounds(shown.outline)
  const margin = 3500
  const view = `${b.x0 - margin} ${-(b.y1 + margin)} ${b.x1 - b.x0 + 2 * margin} ${b.y1 - b.y0 + 2 * margin}`
  const bad = new Set(
    findings.flatMap((f) => {
      const m = f.id.match(/^(?:opening-\w+|door-\w+)-(\w+)$/)
      return m ? [m[1]] : []
    }),
  )
  const shortWalls = new Set(
    findings.flatMap((f) =>
      f.id.startsWith('wall-short-') ? [Number(f.id.slice(11))] : [],
    ),
  )

  function toPlan(event: { clientX: number; clientY: number }): [number, number] {
    const el = svg.current
    const ctm = el?.getScreenCTM()
    if (!el || !ctm) return [0, 0]
    const pt = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse())
    return [pt.x, -pt.y]
  }

  /** The wall nearest a point, and where along it (snapped). */
  function onWall(x: number, y: number) {
    let best: { index: number; offset: number; d: number } | null = null
    for (const e of edges) {
      const t = (x - e.a[0]) * e.dir[0] + (y - e.a[1]) * e.dir[1]
      if (t < 0 || t > e.length) continue
      const px = e.a[0] + e.dir[0] * t
      const py = e.a[1] + e.dir[1] * t
      const d = Math.hypot(px - x, py - y)
      if (d < Math.max(600, shown.wall.thickness * 2) && (!best || d < best.d))
        best = { index: e.index, offset: snap(t), d }
    }
    return best
  }

  function placeholder(kind: 'door' | 'window', wall: number, offset: number): Opening {
    return {
      id: nextId(shown, kind === 'door' ? 'D' : 'W'),
      kind,
      wall,
      offset,
      width: width[kind],
      height: kind === 'door' ? Math.min(2100, shown.wall.height - LINTEL) : 1050,
      sill: kind === 'door' ? 0 : 1050,
      storey,
    }
  }

  function onMove(event: ReactPointerEvent) {
    if (readOnly) return
    const [x, y] = toPlan(event)
    if (drag && selected) {
      const d = drag.draft
      if (selected.kind === 'corner') {
        setDrag({
          draft: {
            ...design,
            outline: moveCorner(design.outline, selected.index, snap(x), snap(y)),
          },
        })
      } else if (selected.kind === 'opening') {
        const o = design.openings.find((v) => v.id === selected.id)
        const e = o && walls(design)[o.wall]
        if (o && e) {
          const t = snap((x - e.a[0]) * e.dir[0] + (y - e.a[1]) * e.dir[1])
          setDrag({
            draft: {
              ...d,
              openings: design.openings.map((v) =>
                v.id === o.id ? { ...v, offset: t } : v,
              ),
            },
          })
        }
      } else if (selected.kind === 'column') {
        setDrag({
          draft: {
            ...d,
            columns: design.columns.map((c) =>
              c.id === selected.id ? { ...c, x: snap(x), y: snap(y) } : c,
            ),
          },
        })
      }
      return
    }
    if (tool === 'door' || tool === 'window') {
      const w = onWall(x, y)
      if (!w) return setGhost(null)
      const opening = placeholder(tool, w.index, w.offset)
      setGhost({ opening, problem: openingProblem(shown, opening) })
    } else if (tool === 'column') {
      const column: Column = {
        id: nextId(shown, 'C'),
        x: snap(x),
        y: snap(y),
        section: shown.columns[0]?.section ?? 'NB-200',
      }
      setGhost({
        column,
        problem: insideOutline(shown.outline, column.x, column.y)
          ? null
          : 'Columns go inside the building',
      })
    } else setGhost(null)
  }

  function onDown(event: ReactPointerEvent) {
    if (readOnly) return
    if (tool === 'select') {
      setSelected(null)
      return
    }
    if (!ghost || ghost.problem) return
    if (ghost.opening) {
      onChange({ ...design, openings: [...design.openings, ghost.opening] })
      setSelected({ kind: 'opening', id: ghost.opening.id })
    } else if (ghost.column) {
      onChange({ ...design, columns: [...design.columns, ghost.column] })
      setSelected({ kind: 'column', id: ghost.column.id })
    }
    setGhost(null)
    event.stopPropagation()
  }

  function startDrag(event: ReactPointerEvent, selection: Selection) {
    if (readOnly || tool !== 'select') return
    event.stopPropagation()
    ;(event.target as Element).setPointerCapture?.(event.pointerId)
    setSelected(selection)
    setDrag({ draft: design })
  }

  function endDrag() {
    if (!drag) return
    if (JSON.stringify(drag.draft) !== JSON.stringify(design)) onChange(drag.draft)
    setDrag(null)
  }

  const selOpening =
    selected?.kind === 'opening'
      ? design.openings.find((o) => o.id === selected.id)
      : undefined
  const selColumn =
    selected?.kind === 'column'
      ? design.columns.find((c) => c.id === selected.id)
      : undefined
  const selCorner =
    selected?.kind === 'corner' ? design.outline[selected.index] : undefined

  function updateOpening(change: Partial<Opening>) {
    if (!selOpening) return
    onChange({
      ...design,
      openings: design.openings.map((o) =>
        o.id === selOpening.id ? { ...o, ...change } : o,
      ),
    })
  }
  function updateColumn(change: Partial<Column>) {
    if (!selColumn) return
    onChange({
      ...design,
      columns: design.columns.map((c) =>
        c.id === selColumn.id ? { ...c, ...change } : c,
      ),
    })
  }
  function remove() {
    if (selOpening)
      onChange({
        ...design,
        openings: design.openings.filter((o) => o.id !== selOpening.id),
      })
    if (selColumn)
      onChange({
        ...design,
        columns: design.columns.filter((c) => c.id !== selColumn.id),
      })
    setSelected(null)
  }
  function nudge(dx: number, dy: number) {
    if (selOpening) updateOpening({ offset: selOpening.offset + (dx || dy) * SNAP })
    else if (selColumn)
      updateColumn({ x: selColumn.x + dx * SNAP, y: selColumn.y + dy * SNAP })
    else if (selected?.kind === 'corner' && selCorner)
      onChange({
        ...design,
        outline: moveCorner(
          design.outline,
          selected.index,
          selCorner[0] + dx * SNAP,
          selCorner[1] + dy * SNAP,
        ),
      })
  }

  const field = 'w-24 rounded border border-slate-300 px-2 py-1 text-sm'
  const num = (label: string, value: number, set: (v: number) => void, step = SNAP) => (
    <label className="flex items-center justify-between gap-2 text-xs text-slate-700">
      {label}
      <input
        type="number"
        className={field}
        value={value}
        step={step}
        disabled={readOnly}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (Number.isFinite(v)) set(Math.round(v))
        }}
      />
    </label>
  )

  const toolButton = (id: Tool, label: string) => (
    <button
      type="button"
      onClick={() => {
        setTool(id)
        setGhost(null)
      }}
      aria-pressed={tool === id}
      disabled={readOnly && id !== 'select'}
      className={`rounded-md px-2.5 py-1 text-sm ${tool === id ? 'bg-blue-700 text-white' : 'border border-slate-300 bg-white hover:bg-slate-50'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-2" data-testid="plan-editor">
      <div
        className="flex flex-wrap items-center gap-2"
        role="toolbar"
        aria-label="Plan tools"
      >
        {toolButton('select', 'Select and move')}
        {toolButton('door', 'Door')}
        {toolButton('window', 'Window')}
        {toolButton('column', 'Column')}
        {(tool === 'door' || tool === 'window') && (
          <label className="flex items-center gap-1 text-xs text-slate-700">
            Width (mm)
            <input
              type="number"
              step={SNAP}
              className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
              value={width[tool]}
              onChange={(e) =>
                setWidth((w) => ({
                  ...w,
                  [tool]: Math.max(300, Math.round(Number(e.target.value) || 0)),
                }))
              }
            />
          </label>
        )}
        {shown.storeys > 1 && (
          <label className="flex items-center gap-1 text-xs text-slate-700">
            Storey
            <select
              className="rounded border border-slate-300 px-1 py-1 text-sm"
              value={storey}
              onChange={(e) => setStorey(Number(e.target.value))}
            >
              {Array.from({ length: shown.storeys }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? 'Ground floor' : `Floor ${i}`}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className="ml-auto text-xs text-slate-500">
          Snaps to {SNAP} mm · grid 1 m
        </span>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <svg
          ref={svg}
          viewBox={view}
          className="min-h-[280px] flex-1 touch-none rounded-md border border-slate-300 bg-[#0f1b2b]"
          role="application"
          aria-label="The building's plan. Choose a tool, then click on a wall or inside the building."
          data-testid="plan-svg"
          onPointerMove={onMove}
          onPointerDown={onDown}
          onPointerUp={endDrag}
          onPointerLeave={() => {
            setGhost(null)
            endDrag()
          }}
          tabIndex={0}
          onKeyDown={(e) => {
            if (readOnly) return
            const keys: Record<string, [number, number]> = {
              ArrowLeft: [-1, 0],
              ArrowRight: [1, 0],
              ArrowUp: [0, 1],
              ArrowDown: [0, -1],
            }
            if (keys[e.key]) {
              e.preventDefault()
              nudge(...keys[e.key])
            } else if (e.key === 'Delete' || e.key === 'Backspace') remove()
          }}
        >
          {/* The grid: a line every metre. */}
          <g stroke="#1e3350" strokeWidth={12}>
            {Array.from(
              { length: Math.ceil((b.x1 - b.x0 + 2 * margin) / 1000) + 1 },
              (_, i) => {
                const x = Math.floor((b.x0 - margin) / 1000) * 1000 + i * 1000
                return (
                  <line
                    key={`x${i}`}
                    x1={x}
                    x2={x}
                    y1={-(b.y1 + margin)}
                    y2={-(b.y0 - margin)}
                  />
                )
              },
            )}
            {Array.from(
              { length: Math.ceil((b.y1 - b.y0 + 2 * margin) / 1000) + 1 },
              (_, i) => {
                const y = Math.floor((b.y0 - margin) / 1000) * 1000 + i * 1000
                return (
                  <line
                    key={`y${i}`}
                    y1={-y}
                    y2={-y}
                    x1={b.x0 - margin}
                    x2={b.x1 + margin}
                  />
                )
              },
            )}
          </g>
          {/* The foundations, dashed. */}
          <polygon
            points={shown.outline.map(([x, y]) => `${x},${-y}`).join(' ')}
            fill="none"
            stroke="#64748b"
            strokeWidth={shown.foundation.width}
            strokeOpacity={0.25}
          />
          {/* The walls. */}
          {edges.map((e) => (
            <line
              key={e.index}
              x1={e.a[0]}
              y1={-e.a[1]}
              x2={e.b[0]}
              y2={-e.b[1]}
              stroke={shortWalls.has(e.index) ? '#f87171' : '#e2e8f0'}
              strokeWidth={shown.wall.thickness}
              strokeLinecap="square"
            />
          ))}
          {/* Wall numbers and lengths, outside each wall. */}
          {edges.map((e) => {
            const mx = (e.a[0] + e.b[0]) / 2
            const my = (e.a[1] + e.b[1]) / 2
            const cx = (b.x0 + b.x1) / 2
            const cy = (b.y0 + b.y1) / 2
            const out = Math.hypot(mx - cx, my - cy) || 1
            const lx = mx + ((mx - cx) / out) * 1000
            const ly = my + ((my - cy) / out) * 1000
            // Labels of walls running north-south read along the wall.
            const vertical = Math.abs(e.dir[1]) > Math.abs(e.dir[0])
            return (
              <text
                key={e.index}
                x={lx}
                y={-ly}
                transform={vertical ? `rotate(-90 ${lx} ${-ly})` : undefined}
                fill="#93c5fd"
                fontSize={380}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                Wall {e.index + 1} · {Math.round(e.length)}
              </text>
            )
          })}
          {/* Openings (this storey solid, others faint). */}
          {shown.openings.map((o) => {
            const e = edges[o.wall]
            if (!e) return null
            const s = o.offset - o.width / 2
            const x1 = e.a[0] + e.dir[0] * s
            const y1 = e.a[1] + e.dir[1] * s
            const x2 = x1 + e.dir[0] * o.width
            const y2 = y1 + e.dir[1] * o.width
            const isSel = selected?.kind === 'opening' && selected.id === o.id
            const colour = bad.has(o.id)
              ? '#f87171'
              : o.kind === 'door'
                ? '#4ade80'
                : '#60a5fa'
            return (
              <g key={o.id} opacity={o.storey === storey ? 1 : 0.35}>
                <line
                  x1={x1}
                  y1={-y1}
                  x2={x2}
                  y2={-y2}
                  stroke="#0f1b2b"
                  strokeWidth={shown.wall.thickness + 20}
                />
                <line
                  x1={x1}
                  y1={-y1}
                  x2={x2}
                  y2={-y2}
                  stroke={colour}
                  strokeWidth={o.kind === 'door' ? shown.wall.thickness * 0.5 : 70}
                  strokeLinecap="butt"
                  data-testid={`opening-${o.id}`}
                  style={{ cursor: readOnly ? 'default' : 'grab' }}
                  onPointerDown={(ev) => startDrag(ev, { kind: 'opening', id: o.id })}
                />
                {isSel && (
                  <line
                    x1={x1}
                    y1={-y1}
                    x2={x2}
                    y2={-y2}
                    stroke="#facc15"
                    strokeWidth={shown.wall.thickness + 80}
                    strokeOpacity={0.35}
                    pointerEvents="none"
                  />
                )}
                <text
                  x={(x1 + x2) / 2 - e.dir[1] * 700}
                  y={-((y1 + y2) / 2 + e.dir[0] * 700)}
                  fill={colour}
                  fontSize={300}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  pointerEvents="none"
                >
                  {o.id}
                </text>
              </g>
            )
          })}
          {/* Columns. */}
          {shown.columns.map((c) => {
            const isSel = selected?.kind === 'column' && selected.id === c.id
            return (
              <g key={c.id}>
                <rect
                  x={c.x - 150}
                  y={-c.y - 150}
                  width={300}
                  height={300}
                  fill={bad.has(c.id) ? '#f87171' : '#f97316'}
                  stroke={isSel ? '#facc15' : 'none'}
                  strokeWidth={80}
                  data-testid={`column-${c.id}`}
                  style={{ cursor: readOnly ? 'default' : 'grab' }}
                  onPointerDown={(ev) => startDrag(ev, { kind: 'column', id: c.id })}
                />
                <text
                  x={c.x + 300}
                  y={-c.y - 250}
                  fill="#fdba74"
                  fontSize={280}
                  pointerEvents="none"
                >
                  {c.id}
                </text>
              </g>
            )
          })}
          {/* Corner handles. */}
          {!readOnly &&
            tool === 'select' &&
            shown.outline.map(([x, y], i) => (
              <circle
                key={i}
                cx={x}
                cy={-y}
                r={260}
                fill={
                  selected?.kind === 'corner' && selected.index === i
                    ? '#facc15'
                    : '#38bdf8'
                }
                stroke="#0f1b2b"
                strokeWidth={60}
                data-testid={`corner-${i}`}
                style={{ cursor: 'move' }}
                onPointerDown={(ev) => startDrag(ev, { kind: 'corner', index: i })}
              />
            ))}
          {/* The ghost of what the tool would place. */}
          {ghost?.opening &&
            (() => {
              const o = ghost.opening
              const e = edges[o.wall]
              const s = o.offset - o.width / 2
              const x1 = e.a[0] + e.dir[0] * s
              const y1 = e.a[1] + e.dir[1] * s
              return (
                <g pointerEvents="none">
                  <line
                    x1={x1}
                    y1={-y1}
                    x2={x1 + e.dir[0] * o.width}
                    y2={-(y1 + e.dir[1] * o.width)}
                    stroke={ghost.problem ? '#ef4444' : '#22c55e'}
                    strokeWidth={shown.wall.thickness + 120}
                    strokeOpacity={0.7}
                  />
                </g>
              )
            })()}
          {ghost?.column && (
            <rect
              x={ghost.column.x - 150}
              y={-ghost.column.y - 150}
              width={300}
              height={300}
              fill={ghost.problem ? '#ef4444' : '#22c55e'}
              opacity={0.7}
              pointerEvents="none"
            />
          )}
        </svg>

        <aside
          className="w-56 shrink-0 space-y-2 text-sm"
          aria-label="Inspector"
          data-testid="plan-inspector"
        >
          {ghost?.problem && (
            <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-800" role="status">
              {ghost.problem}
            </p>
          )}
          {selOpening && (
            <div className="space-y-1.5">
              <p className="font-semibold text-slate-900">
                {selOpening.kind === 'door' ? 'Door' : 'Window'} {selOpening.id}
              </p>
              <label className="flex items-center justify-between gap-2 text-xs text-slate-700">
                Wall
                <select
                  className={field}
                  value={selOpening.wall}
                  disabled={readOnly}
                  onChange={(e) => updateOpening({ wall: Number(e.target.value) })}
                >
                  {edges.map((e) => (
                    <option key={e.index} value={e.index}>
                      Wall {e.index + 1}
                    </option>
                  ))}
                </select>
              </label>
              {num('From wall start (mm)', selOpening.offset, (v) =>
                updateOpening({ offset: v }),
              )}
              {num('Width (mm)', selOpening.width, (v) => updateOpening({ width: v }))}
              {num(
                'Height (mm)',
                selOpening.height,
                (v) => updateOpening({ height: v }),
                50,
              )}
              {selOpening.kind === 'window' &&
                num('Sill (mm)', selOpening.sill, (v) => updateOpening({ sill: v }), 50)}
              {openingProblem(design, selOpening) && (
                <p className="text-xs text-red-700">
                  {openingProblem(design, selOpening)}
                </p>
              )}
              {!readOnly && (
                <button
                  type="button"
                  onClick={remove}
                  className="text-xs text-red-700 underline"
                >
                  Remove {selOpening.id}
                </button>
              )}
            </div>
          )}
          {selColumn && (
            <div className="space-y-1.5">
              <p className="font-semibold text-slate-900">Column {selColumn.id}</p>
              {num('x (mm)', selColumn.x, (v) => updateColumn({ x: v }))}
              {num('y (mm)', selColumn.y, (v) => updateColumn({ y: v }))}
              <label className="flex items-center justify-between gap-2 text-xs text-slate-700">
                Section
                <select
                  className={field}
                  value={selColumn.section}
                  disabled={readOnly}
                  onChange={(e) => updateColumn({ section: e.target.value })}
                >
                  {CATALOGUE.map((s) => (
                    <option key={s.id}>{s.id}</option>
                  ))}
                </select>
              </label>
              {!readOnly && (
                <button
                  type="button"
                  onClick={remove}
                  className="text-xs text-red-700 underline"
                >
                  Remove {selColumn.id}
                </button>
              )}
            </div>
          )}
          {selected?.kind === 'corner' && selCorner && (
            <div className="space-y-1.5">
              <p className="font-semibold text-slate-900">Corner {selected.index + 1}</p>
              {num('x (mm)', selCorner[0], (v) =>
                onChange({
                  ...design,
                  outline: moveCorner(design.outline, selected.index, v, selCorner[1]),
                }),
              )}
              {num('y (mm)', selCorner[1], (v) =>
                onChange({
                  ...design,
                  outline: moveCorner(design.outline, selected.index, selCorner[0], v),
                }),
              )}
              <p className="text-xs text-slate-500">
                The walls either side follow, staying square.
              </p>
            </div>
          )}
          {!selected && !ghost && (
            <p className="text-xs text-slate-500">
              {readOnly
                ? 'This revision is being checked or is approved: it cannot change. Start a new draft to change the design.'
                : 'Drag a corner to resize the building. Choose Door or Window and click on a wall; Column, and click inside. Select something to type its exact size; arrow keys nudge it 100 mm, Delete removes it.'}
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}
