/**
 * A design, built as far as the site has got: drawn from the approved design
 * itself (walls where its outline is, openings where they were drawn, the
 * beams it specifies), stage by stage. Pegs and string lines, trenches,
 * reinforcement, concrete, the slab, the steel frame, the walls rising course
 * by course around their openings, doors and windows, the roof, the
 * services, finishes and the scaffold; or a bridge's abutments, girders,
 * deck and parapets.
 *
 * Also used by the CAD workstation's 3D view, with everything built.
 * Metres, y up, x east, z south; the plot is centred on the origin.
 */
import { useMemo } from 'react'
import {
  insideOutline,
  walls,
  bounds,
  type BridgeDesign,
  type BuildingDesign,
  type Design,
} from '../design'
import { sectionDepth } from '../checks'
import type { StageId } from '../quantities'
import { FINISHED, wallPieces, type BuildState } from './build'
import { plotPoint } from '../inspections'
import { surface, tiling } from '../../world/look/surfaces'

const mm = (n: number) => n / 1000

const WALL_COLOURS: Record<BuildingDesign['wall']['material'], string> = {
  blockwork: '#b9b6ae',
  brick: '#a5573d',
  'timber-frame': '#d8c39a',
  cladding: '#7d8b99',
}
const WALL_SURFACE: Record<
  BuildingDesign['wall']['material'],
  'concrete' | 'brick' | 'planks' | 'render'
> = {
  blockwork: 'concrete',
  brick: 'brick',
  'timber-frame': 'planks',
  cladding: 'render',
}

function Block({
  size,
  at,
  color,
  rough = 0.9,
  metal = 0,
  opacity,
  shadow = true,
}: {
  size: [number, number, number]
  at: [number, number, number]
  color: string
  rough?: number
  metal?: number
  opacity?: number
  shadow?: boolean
}) {
  if (size.some((s) => s <= 0.0001)) return null
  return (
    <mesh position={at} castShadow={shadow} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={rough}
        metalness={metal}
        transparent={opacity !== undefined}
        opacity={opacity ?? 1}
      />
    </mesh>
  )
}

/** A box lying along a wall: from plan point a to b (metres), across `width`, between heights y0 and y1. */
function AlongWall({
  a,
  b,
  width,
  y0,
  y1,
  color,
  material,
}: {
  a: { x: number; z: number }
  b: { x: number; z: number }
  width: number
  y0: number
  y1: number
  color?: string
  material?: ReturnType<typeof surface>
}) {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const length = Math.hypot(dx, dz)
  if (length < 0.001 || y1 - y0 < 0.001) return null
  return (
    <mesh
      position={[(a.x + b.x) / 2, (y0 + y1) / 2, (a.z + b.z) / 2]}
      rotation={[0, -Math.atan2(dz, dx), 0]}
      castShadow
      receiveShadow
      material={material}
    >
      <boxGeometry args={[length, y1 - y0, width]} />
      {!material && <meshStandardMaterial color={color} roughness={0.9} />}
    </mesh>
  )
}

function Building({
  design,
  state,
  ghost,
}: {
  design: BuildingDesign
  state: BuildState
  ghost?: boolean
}) {
  const s = (id: StageId) => state[id] ?? 0
  const p = (x: number, y: number) => plotPoint(design, x, y)
  const edges = useMemo(() => walls(design), [design])
  const b = bounds(design.outline)
  const H = mm(design.wall.height)
  const total = H * design.storeys
  const t = mm(design.wall.thickness)
  const fw = mm(design.foundation.width)
  const fd = mm(design.foundation.depth)
  const wallMaterial = useMemo(
    () =>
      surface(
        WALL_SURFACE[design.wall.material],
        WALL_COLOURS[design.wall.material],
        [3, 2],
      ),
    [design.wall.material],
  )
  const concrete = useMemo(() => surface('concrete', '#bdbab3', [2, 2]), [])
  const perimeterLength = edges.reduce((sum, e) => sum + e.length, 0)

  // Slab and roof bays: 2 m squares inside the outline, laid in order.
  const bays = useMemo(() => {
    const out: Array<{ x: number; z: number; w: number; d: number }> = []
    const step = 2000
    for (let y = b.y0; y < b.y1; y += step)
      for (let x = b.x0; x < b.x1; x += step) {
        const w = Math.min(step, b.x1 - x)
        const d = Math.min(step, b.y1 - y)
        if (!insideOutline(design.outline, x + w / 2, y + d / 2)) continue
        const c = p(x + w / 2, y + d / 2)
        out.push({ x: c.x, z: c.z, w: mm(w), d: mm(d) })
      }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design])

  // Beams: across the short side, every 4 m, at each floor and the roof.
  const beams = useMemo(() => {
    const out: Array<{
      a: { x: number; z: number }
      b: { x: number; z: number }
      y: number
    }> = []
    const alongX = b.x1 - b.x0 > b.y1 - b.y0
    for (let level = 1; level <= design.storeys; level++) {
      const y = level * H - mm(sectionDepth(design.beam.section)) / 2
      if (alongX)
        for (let x = b.x0 + 4000; x < b.x1 - 500; x += 4000)
          out.push({ a: p(x, b.y0), b: p(x, b.y1), y })
      else
        for (let yy = b.y0 + 4000; yy < b.y1 - 500; yy += 4000)
          out.push({ a: p(b.x0, yy), b: p(b.x1, yy), y })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design])

  const frame = [
    ...design.columns.map((c) => ({ kind: 'column' as const, at: p(c.x, c.y) })),
    ...beams.map((bm) => ({ kind: 'beam' as const, ...bm })),
  ]
  const frameShown = Math.floor(frame.length * s('structure') + 0.0001)
  const wallTop = total * s('walls')
  const openingsShown = Math.floor(design.openings.length * s('openings') + 0.0001)
  const roofBays = Math.floor(bays.length * s('roofing') + 0.0001)
  const slabBays = Math.floor(bays.length * s('slab') + 0.0001)
  const scaffold = !ghost && s('walls') > 0.25 && s('finishing') < 0.3
  const finished = s('finishing')

  return (
    <group>
      {/* Setting out: pegs at the corners and string lines offset from the walls. */}
      {s('survey') > 0 && s('foundations') < 1 && !ghost && (
        <group>
          {design.outline.map(([x, y], i) => {
            const c = p(x, y)
            return (
              <group key={i}>
                <Block size={[0.05, 0.5, 0.05]} at={[c.x, 0.25, c.z]} color="#c2410c" />
                <Block size={[0.07, 0.06, 0.07]} at={[c.x, 0.52, c.z]} color="#facc15" />
              </group>
            )
          })}
          {edges.map((e) => (
            <AlongWall
              key={e.index}
              a={p(e.a[0], e.a[1])}
              b={p(e.b[0], e.b[1])}
              width={0.008}
              y0={0.3}
              y1={0.31}
              color="#f8fafc"
            />
          ))}
        </group>
      )}

      {/* Trenches dug along the walls, then reinforcement, then concrete. */}
      {!ghost &&
        edges.map((e) => {
          const startAt =
            edges.slice(0, e.index).reduce((sum, x) => sum + x.length, 0) /
            perimeterLength
          const share = e.length / perimeterLength
          const dug = Math.max(0, Math.min(1, (s('excavation') - startAt) / share))
          if (dug <= 0) return null
          const a = p(e.a[0], e.a[1])
          const full = p(e.b[0], e.b[1])
          const end = { x: a.x + (full.x - a.x) * dug, z: a.z + (full.z - a.z) * dug }
          const poured = s('foundations')
          const fill = fd * poured
          return (
            <group key={e.index}>
              <AlongWall a={a} b={end} width={fw} y0={-0.02} y1={0.004} color="#3f2d20" />
              {s('reinforcement') > 0 && poured < 1 && (
                <>
                  <AlongWall
                    a={a}
                    b={end}
                    width={fw * 0.7}
                    y0={0.005}
                    y1={0.03}
                    color="#9a4a1d"
                  />
                  {Array.from(
                    { length: Math.floor((e.length / 1000) * 4 * s('reinforcement')) },
                    (_, k) => {
                      const f = (k + 0.5) / ((e.length / 1000) * 4)
                      const x = a.x + (full.x - a.x) * f
                      const z = a.z + (full.z - a.z) * f
                      return (
                        <Block
                          key={k}
                          size={[0.025, 0.04, 0.025]}
                          at={[x, 0.025, z]}
                          color="#7c2d12"
                          shadow={false}
                        />
                      )
                    },
                  )}
                </>
              )}
              {fill > 0 && (
                <AlongWall
                  a={a}
                  b={end}
                  width={fw}
                  y0={-0.02}
                  y1={0.012 + fill * 0.01}
                  material={concrete}
                />
              )}
            </group>
          )
        })}
      {/* The spoil heap from the trenches. */}
      {!ghost && s('excavation') > 0 && s('slab') < 1 && (
        <mesh
          position={[mm(b.x1 - b.x0) / 2 + 3.5, 0, 0]}
          scale={[1.8, 0.9 * s('excavation') + 0.1, 1.4]}
        >
          <sphereGeometry args={[1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#5b4331" roughness={1} />
        </mesh>
      )}

      {/* The slab, bay by bay. */}
      {bays.slice(0, ghost ? bays.length : slabBays).map((bay, i) => (
        <Block
          key={i}
          size={[bay.w, mm(design.slab.thickness), bay.d]}
          at={[bay.x, mm(design.slab.thickness) / 2, bay.z]}
          color="#c4c1ba"
        />
      ))}
      {/* Upper floors, once the frame carries them. */}
      {design.storeys > 1 &&
        (ghost || s('structure') >= 1) &&
        Array.from({ length: design.storeys - 1 }, (_, k) =>
          bays.map((bay, i) => (
            <Block
              key={`${k}-${i}`}
              size={[bay.w, 0.2, bay.d]}
              at={[bay.x, (k + 1) * H, bay.z]}
              color="#b8b5ae"
            />
          )),
        )}

      {/* The steel frame: columns, then beams. */}
      {frame
        .slice(0, ghost ? frame.length : frameShown)
        .map((f, i) =>
          f.kind === 'column' ? (
            <Block
              key={i}
              size={[0.2, total, 0.2]}
              at={[f.at.x, total / 2, f.at.z]}
              color="#3b5b7a"
              metal={0.4}
              rough={0.5}
            />
          ) : (
            <AlongWall
              key={i}
              a={f.a}
              b={f.b}
              width={0.15}
              y0={f.y - mm(sectionDepth(design.beam.section)) / 2}
              y1={f.y + mm(sectionDepth(design.beam.section)) / 2}
              color="#3b5b7a"
            />
          ),
        )}

      {/* The walls, rising course by course around their openings. */}
      {edges.map((e) => {
        const { pieces } = wallPieces(design, e.index)
        const top = ghost ? total : wallTop
        return pieces.map((piece, k) => {
          const y1 = Math.min(mm(piece.z1), top)
          if (y1 <= mm(piece.z0)) return null
          const a = { x: e.a[0] + e.dir[0] * piece.s, y: e.a[1] + e.dir[1] * piece.s }
          const bb = { x: e.a[0] + e.dir[0] * piece.e, y: e.a[1] + e.dir[1] * piece.e }
          return (
            <AlongWall
              key={`${e.index}-${k}`}
              a={p(a.x, a.y)}
              b={p(bb.x, bb.y)}
              width={t}
              y0={mm(piece.z0)}
              y1={y1}
              material={wallMaterial}
            />
          )
        })
      })}

      {/* Doors and windows, fitted in order. */}
      {design.openings
        .slice(0, ghost ? design.openings.length : openingsShown)
        .map((o) => {
          const e = edges[o.wall]
          if (!e) return null
          const s0 = o.offset - o.width / 2
          const s1 = o.offset + o.width / 2
          const a = p(e.a[0] + e.dir[0] * s0, e.a[1] + e.dir[1] * s0)
          const bb = p(e.a[0] + e.dir[0] * s1, e.a[1] + e.dir[1] * s1)
          const y0 = mm(o.storey * design.wall.height + o.sill)
          const y1 = y0 + mm(o.height)
          return (
            <group key={o.id}>
              <AlongWall
                a={a}
                b={bb}
                width={t * 0.4}
                y0={y0}
                y1={y1}
                color={
                  o.kind === 'door'
                    ? o.width >= 2400
                      ? '#6b7280'
                      : '#7c4a2a'
                    : '#9cc9e8'
                }
              />
              {/* The frame's head. */}
              <AlongWall
                a={a}
                b={bb}
                width={t + 0.02}
                y0={y1}
                y1={y1 + 0.04}
                color="#e5e7eb"
              />
            </group>
          )
        })}

      {/* The roof, bay by bay; a pitched roof once its bays are on. */}
      {(() => {
        const shown = ghost ? bays.length : roofBays
        if (!shown) return null
        const pitched = design.roof.type === 'pitched' && design.outline.length === 4
        if (pitched && shown === bays.length) {
          const w = mm(b.x1 - b.x0) + 0.4
          const d = mm(b.y1 - b.y0) + 0.4
          const alongX = w >= d
          const span = (alongX ? d : w) / 2
          const rise = Math.tan((design.roof.pitch * Math.PI) / 180) * span
          const slope = Math.hypot(span, rise)
          const angle = Math.atan2(rise, span)
          return (
            <group position={[0, total, 0]}>
              {[-1, 1].map((side) => (
                <mesh
                  key={side}
                  castShadow
                  receiveShadow
                  position={
                    alongX
                      ? [0, rise / 2, (side * span) / 2]
                      : [(side * span) / 2, rise / 2, 0]
                  }
                  rotation={alongX ? [side * angle, 0, 0] : [0, 0, -side * angle]}
                >
                  <boxGeometry args={alongX ? [w, 0.08, slope] : [slope, 0.08, d]} />
                  <meshStandardMaterial color="#6b4434" roughness={0.85} />
                </mesh>
              ))}
            </group>
          )
        }
        return bays
          .slice(0, shown)
          .map((bay, i) => (
            <Block
              key={i}
              size={[bay.w + 0.05, 0.22, bay.d + 0.05]}
              at={[bay.x, total + 0.11, bay.z]}
              color="#4b5563"
            />
          ))
      })()}

      {/* Services: the board and cable runs, pipes, heating and ventilation units. */}
      {(ghost || s('electrical') > 0) && (
        <group>
          {(() => {
            const c = p(b.x0 + 600, b.y1 - 600)
            return (
              <Block
                size={[0.5, 0.7, 0.18]}
                at={[c.x, 1.5, c.z + t / 2 + 0.1]}
                color="#e5e7eb"
              />
            )
          })()}
          {edges
            .slice(0, Math.ceil(edges.length * (ghost ? 1 : s('electrical'))))
            .map((e) => (
              <AlongWall
                key={e.index}
                a={p(e.a[0], e.a[1])}
                b={p(e.b[0], e.b[1])}
                width={t + 0.06}
                y0={2.3}
                y1={2.34}
                color="#f3f4f6"
              />
            ))}
        </group>
      )}
      {(ghost || s('plumbing') > 0) && design.services.sanitary > 0 && (
        <group>
          {Array.from(
            { length: Math.ceil(design.services.sanitary * (ghost ? 1 : s('plumbing'))) },
            (_, i) => {
              const c = p(b.x1 - 800 - i * 900, b.y1 - 700)
              return (
                <Block
                  key={i}
                  size={[0.45, 0.8, 0.6]}
                  at={[c.x, 0.4, c.z]}
                  color="#f8fafc"
                />
              )
            },
          )}
        </group>
      )}
      {(ghost || s('hvac') > 0) && design.services.hvac > 0 && (
        <group>
          {Array.from(
            { length: Math.ceil(design.services.hvac * (ghost ? 1 : s('hvac'))) },
            (_, i) => {
              const c = p(b.x0 + 2000 + i * 2200, (b.y0 + b.y1) / 2)
              return (
                <Block
                  key={i}
                  size={[1.1, 0.6, 0.8]}
                  at={[c.x, total + 0.55, c.z]}
                  color="#cbd5e1"
                  metal={0.3}
                />
              )
            },
          )}
        </group>
      )}

      {/* Finishes: gutters and a gravel strip round the building. */}
      {(ghost || finished > 0.5) && (
        <group>
          {edges.map((e) => {
            const a = p(e.a[0], e.a[1])
            const bb = p(e.b[0], e.b[1])
            return (
              <group key={e.index}>
                <AlongWall
                  a={a}
                  b={bb}
                  width={t + 0.24}
                  y0={total - 0.02}
                  y1={total + 0.06}
                  color="#374151"
                />
                <AlongWall
                  a={a}
                  b={bb}
                  width={t + 1.4}
                  y0={0.002}
                  y1={0.012}
                  color="#a8a29e"
                />
              </group>
            )
          })}
        </group>
      )}

      {/* The scaffold round the walls while they rise and the roof goes on. */}
      {scaffold &&
        edges.map((e) => {
          const out = { x: -e.dir[1], y: e.dir[0] }
          const sign = 1
          const off = 1100 * sign
          const posts = Math.max(2, Math.ceil(e.length / 2000) + 1)
          const lifts = Math.max(1, Math.ceil(Math.min(total, wallTop + 1) / 2))
          return (
            <group key={e.index}>
              {Array.from({ length: posts }, (_, k) => {
                const f = (k / (posts - 1)) * e.length
                const c = p(
                  e.a[0] + e.dir[0] * f - out.x * off,
                  e.a[1] + e.dir[1] * f - out.y * off,
                )
                return (
                  <Block
                    key={k}
                    size={[0.05, lifts * 2, 0.05]}
                    at={[c.x, lifts, c.z]}
                    color="#94a3b8"
                    metal={0.5}
                    rough={0.4}
                  />
                )
              })}
              {Array.from({ length: lifts }, (_, k) => (
                <AlongWall
                  key={`l${k}`}
                  a={p(e.a[0] - out.x * off, e.a[1] - out.y * off)}
                  b={p(e.b[0] - out.x * off, e.b[1] - out.y * off)}
                  width={0.6}
                  y0={(k + 1) * 2 - 0.04}
                  y1={(k + 1) * 2}
                  color="#a16207"
                />
              ))}
            </group>
          )
        })}
    </group>
  )
}

function Bridge({
  design,
  state,
  ghost,
}: {
  design: BridgeDesign
  state: BuildState
  ghost?: boolean
}) {
  const s = (id: StageId) => (ghost ? 1 : (state[id] ?? 0))
  const half = mm(design.span) / 2
  const width = mm(design.width)
  const base = mm(design.abutment.base)
  const height = mm(design.abutment.height)
  const depth = mm(sectionDepth(design.girders.section))
  const deckT = mm(design.deck.thickness)
  // The deck sits at ground level on the banks; the abutments go down below it.
  const seat = -depth
  const concrete = useMemo(
    () => surface('concrete', '#c2bfb8', tiling(base, height, 1)),
    [base, height],
  )
  const sides = [-1, 1]
  const girdersShown = Math.floor(design.girders.count * s('structure') + 0.0001)
  const deckPanels = 8
  const deckShown = Math.floor(deckPanels * s('slab') + 0.0001)
  return (
    <group>
      {!ghost &&
        s('survey') > 0 &&
        s('foundations') < 1 &&
        sides.flatMap((side) =>
          [-1, 1].map((k) => (
            <Block
              key={`${side}${k}`}
              size={[0.05, 0.5, 0.05]}
              at={[side * (half + base / 2), 0.25, (k * (width + 1)) / 2]}
              color="#c2410c"
            />
          )),
        )}
      {sides.map((side) => {
        const x = side * (half + base / 2)
        const dug = s('excavation')
        const poured = s('foundations')
        return (
          <group key={side}>
            {!ghost && dug > 0 && poured < 1 && (
              <Block
                size={[base + 0.6, 0.02, (width + 1.6) * dug]}
                at={[x, 0.004, 0]}
                color="#3f2d20"
                shadow={false}
              />
            )}
            {!ghost && s('reinforcement') > 0 && poured < 1 && (
              <Block
                size={[base * 0.8, 0.3 * s('reinforcement'), width + 0.6]}
                at={[x, 0.15 * s('reinforcement'), 0]}
                color="#9a4a1d"
                opacity={0.75}
              />
            )}
            {poured > 0 && (
              <mesh
                position={[x, seat - height + (height * poured) / 2 + 0.01, 0]}
                castShadow
                receiveShadow
                material={concrete}
              >
                <boxGeometry args={[base, height * poured, width + 1]} />
              </mesh>
            )}
          </group>
        )
      })}
      {Array.from({ length: girdersShown }, (_, i) => {
        const z = -width / 2 + (width * (i + 0.5)) / design.girders.count
        return (
          <Block
            key={i}
            size={[mm(design.span) + 0.8, depth, 0.2]}
            at={[0, seat + depth / 2, z]}
            color="#3b5b7a"
            metal={0.4}
            rough={0.5}
          />
        )
      })}
      {Array.from({ length: deckShown }, (_, i) => {
        const panel = (mm(design.span) + 1) / deckPanels
        return (
          <Block
            key={i}
            size={[panel - 0.01, deckT, width]}
            at={[-half - 0.5 + panel * (i + 0.5), deckT / 2, 0]}
            color={s('finishing') > 0.6 ? '#4b5563' : '#c4c1ba'}
          />
        )
      })}
      {s('finishing') > 0 &&
        sides.map((side) => (
          <group key={side}>
            <Block
              size={[(mm(design.span) + 1) * s('finishing'), 0.05, 0.06]}
              at={[
                -half - 0.5 + ((mm(design.span) + 1) * s('finishing')) / 2,
                deckT + mm(design.parapet.height),
                (side * width) / 2,
              ]}
              color="#475569"
              metal={0.5}
            />
            {Array.from(
              { length: Math.floor((mm(design.span) + 1) * s('finishing')) + 1 },
              (_, k) => (
                <Block
                  key={k}
                  size={[0.04, mm(design.parapet.height), 0.04]}
                  at={[
                    -half - 0.5 + k,
                    deckT + mm(design.parapet.height) / 2,
                    (side * width) / 2,
                  ]}
                  color="#475569"
                  metal={0.5}
                />
              ),
            )}
          </group>
        ))}
    </group>
  )
}

/** The design built to `state` (everything, for the CAD view). `ghost` draws it whole. */
export function BuildModel({
  design,
  state = FINISHED,
  ghost,
}: {
  design: Design
  state?: BuildState
  ghost?: boolean
}) {
  return design.kind === 'building' ? (
    <Building design={design} state={state} ghost={ghost} />
  ) : (
    <Bridge design={design} state={state} ghost={ghost} />
  )
}
