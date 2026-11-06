/**
 * Development only: shows what is solid, to find anything that looks solid
 * but is not (or the other way round). Press F8 in a 3D view to turn it on or
 * off (kept for the tab). Orange: what the player bumps into, drawn at the
 * floor and at its top; green: the player's capsule; yellow: where each
 * activity can be started, and magenta where it is done; cyan: the way being
 * walked. Never in the built game.
 */
import { useEffect, useMemo, useState, type RefObject } from 'react'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { Body, Box } from '../character/controller'
import { RADIUS } from '../character/controller'
import type { Activity } from '../interaction/activity'
import type { Point } from './nav'

/** The outline of a shape on the floor plan, as points round it. */
function outline(b: Box): Array<[number, number]> {
  if (b.round) {
    return Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2
      return [b.x + Math.cos(a) * b.hx, b.z + Math.sin(a) * b.hx] as [number, number]
    })
  }
  const c = Math.cos(b.yaw ?? 0)
  const s = Math.sin(b.yaw ?? 0)
  return (
    [
      [-b.hx, -b.hz],
      [b.hx, -b.hz],
      [b.hx, b.hz],
      [-b.hx, b.hz],
    ] as Array<[number, number]>
  ).map(([lx, lz]) => [b.x + lx * c + lz * s, b.z - lx * s + lz * c])
}

function lines(loops: Array<{ points: Array<[number, number]>; y: number }>) {
  const v: number[] = []
  for (const { points, y } of loops)
    points.forEach((p, i) => {
      const q = points[(i + 1) % points.length]
      v.push(p[0], y, p[1], q[0], y, q[1])
    })
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(v, 3))
  return g
}

const ring = (x: number, z: number, r: number) =>
  outline({ x, z, hx: r, hz: r, top: 0, round: true })

export function CollisionDebug({
  boxes,
  spots,
  path,
  player,
}: {
  boxes: Box[]
  spots: Array<{ x: number; z: number; reach: number; activity: Activity }>
  path: Point[]
  player: RefObject<Body>
}) {
  const solid = useMemo(
    () =>
      lines(
        boxes.flatMap((b) => [
          { points: outline(b), y: 0.03 },
          { points: outline(b), y: Math.min(b.top, 3) },
        ]),
      ),
    [boxes],
  )
  const marks = useMemo(
    () =>
      lines(
        spots
          .filter((s) => s.reach > 0)
          .map((s) => ({ points: ring(s.x, s.z, s.reach), y: 0.05 })),
      ),
    [spots],
  )
  const anchors = useMemo(
    () =>
      lines(
        spots.map((s) => ({
          points: ring(s.activity.anchor.x, s.activity.anchor.z, 0.1),
          y: 0.06,
        })),
      ),
    [spots],
  )
  const way = useMemo(() => {
    const v: number[] = []
    for (let i = 1; i < path.length; i++)
      v.push(path[i - 1].x, 0.08, path[i - 1].z, path[i].x, 0.08, path[i].z)
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(v, 3))
    return g
  }, [path])
  const me = useMemo(
    () =>
      lines([
        { points: ring(0, 0, RADIUS), y: 0.05 },
        { points: ring(0, 0, RADIUS), y: 1.75 },
      ]),
    [],
  )
  const [at, setAt] = useState<[number, number]>([0, 0])
  useEffect(() => {
    const id = window.setInterval(() => {
      const p = player.current
      if (p) setAt([p.x, p.z])
    }, 100)
    return () => window.clearInterval(id)
  }, [player])
  return (
    <group userData={{ passable: true }}>
      <lineSegments geometry={solid}>
        <lineBasicMaterial color="#f97316" depthTest={false} />
      </lineSegments>
      <lineSegments geometry={marks}>
        <lineBasicMaterial color="#facc15" depthTest={false} />
      </lineSegments>
      <lineSegments geometry={anchors}>
        <lineBasicMaterial color="#d946ef" depthTest={false} />
      </lineSegments>
      <lineSegments geometry={way}>
        <lineBasicMaterial color="#22d3ee" depthTest={false} />
      </lineSegments>
      <lineSegments geometry={me} position={[at[0], 0, at[1]]}>
        <lineBasicMaterial color="#22c55e" depthTest={false} />
      </lineSegments>
    </group>
  )
}
