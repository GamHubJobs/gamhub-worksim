/**
 * The cast of a live scenario (content/scenarios), in the room: each person
 * at their place facing who they address, seated or standing, moving between
 * beats (a witness into the box and back), and the one speaking now gesturing
 * as they talk, with their name and role above them.
 */
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import type { CastMember, Gesture, Place, Scenario } from '../../content/scenarios/types'
import { placeAt } from '../../game/scenarios'
import { clipFrame, type ClipId, type RigFrame } from '../../world/character/rig'
import { Person, type Motion } from './people'
import { floorBoxes } from './bays'
import { buildGrid, findPath, type Grid, type Point } from '../../world/physics/nav'

/** Facing from one point towards another (the same convention as the activities). */
const facing = (from: Place, to: Place) => Math.atan2(-(to.x - from.x), -(to.z - from.z))

/** Walking pace between places, metres a second. */
const PACE = 1.3

function Figure({
  member,
  place,
  speaking,
  gesture,
  grid,
}: {
  member: CastMember
  place: { at: Place; faces: Place; seated: boolean }
  speaking: boolean
  gesture: Gesture
  /** The floor's walking grid, to route round furniture. */
  grid: Grid
}) {
  const rig = useRef<RigFrame | null>(null)
  // The way to the current place: round the furniture, recomputed when it changes.
  const route = useRef<{ key: string; points: Point[] }>({ key: '', points: [] })
  const motion = useRef<Motion>({ walking: false })
  const t = useRef(member.id.length * 0.7)
  const body = useRef<Group>(null)
  const tag = useRef<Group>(null)
  // Where they are now: they walk to a new place rather than appear there.
  const pos = useRef({ x: place.at.x, z: place.at.z })
  const [walking, setWalking] = useState(false)
  const clip: ClipId = speaking ? gesture : place.seated ? 'sit' : 'stand'
  const invalidate = useThree((s) => s.invalidate)
  useFrame((_, dt) => {
    t.current += dt
    const key = `${place.at.x},${place.at.z}`
    if (route.current.key !== key) {
      const far =
        Math.hypot(place.at.x - pos.current.x, place.at.z - pos.current.z) > 0.04
      route.current = {
        key,
        points: far ? (findPath(grid, pos.current, place.at) ?? [place.at]) : [],
      }
    }
    // Next point on the way (the place itself at the end).
    while (
      route.current.points.length > 1 &&
      Math.hypot(
        route.current.points[0].x - pos.current.x,
        route.current.points[0].z - pos.current.z,
      ) < 0.08
    )
      route.current.points.shift()
    const next = route.current.points[0] ?? place.at
    const dx = next.x - pos.current.x
    const dz = next.z - pos.current.z
    const away = Math.hypot(dx, dz)
    const moving = away > 0.04 || route.current.points.length > 1
    if (moving) {
      const step = Math.min(away, PACE * Math.min(dt, 0.1))
      if (away > 1e-6) {
        pos.current.x += (dx / away) * step
        pos.current.z += (dz / away) * step
      }
      motion.current.walking = true
      rig.current = null
      body.current?.rotation.set(0, Math.atan2(-dx, -dz), 0)
      invalidate()
    } else {
      pos.current = { x: place.at.x, z: place.at.z }
      motion.current.walking = false
      rig.current = clipFrame(clip, t.current, place.seated ? 'seated' : 'standing')
      body.current?.rotation.set(0, facing(place.at, place.faces), 0)
    }
    if (moving !== walking) setWalking(moving)
    body.current?.position.set(pos.current.x, member.raised ?? 0, pos.current.z)
    tag.current?.position.set(pos.current.x, 0, pos.current.z)
  })
  const y = member.raised ?? 0
  const seated = place.seated && !walking
  return (
    <group>
      {member.figure !== false && (
        <group ref={body} position={[place.at.x, y, place.at.z]}>
          <Person look={member.look} seated={seated} rig={rig} motion={motion} />
        </group>
      )}
      {speaking && (
        <group ref={tag} position={[place.at.x, 0, place.at.z]}>
          <Html
            position={[0, y + (seated ? 1.55 : 2.05), 0]}
            center
            pointerEvents="none"
            zIndexRange={[20, 0]}
          >
            <div
              className="rounded-md bg-slate-900/90 px-2 py-1 text-center whitespace-nowrap text-white shadow"
              data-testid="scenario-speaker-tag"
            >
              <p className="text-xs font-semibold">{member.name}</p>
              <p className="text-[10px] text-slate-300">{member.role}</p>
            </div>
          </Html>
        </group>
      )}
    </group>
  )
}

export function ScenarioStage({
  scenario,
  beat,
  speaker,
  gesture = 'talk',
  boxes,
}: {
  scenario: Scenario
  /** The beat being played (for where everyone is). */
  beat: string
  /** Who is speaking now, if anyone. */
  speaker: string | null
  gesture?: Gesture
  /** What is solid where it is played (the office floor by default). */
  boxes?: ReturnType<typeof floorBoxes>
}) {
  const grid = useMemo(() => buildGrid(boxes ?? floorBoxes(), 0.28), [boxes])
  return (
    <group>
      {scenario.cast.map((member) => (
        <Figure
          grid={grid}
          key={member.id}
          member={member}
          place={placeAt(scenario, member, beat)}
          speaking={member.id === speaker}
          gesture={gesture}
        />
      ))}
    </group>
  )
}
