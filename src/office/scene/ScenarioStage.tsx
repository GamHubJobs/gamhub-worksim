/**
 * The cast of a live scenario (content/scenarios), in the room: each person
 * at their place facing who they address, seated or standing, moving between
 * beats (a witness into the box and back), and the one speaking now gesturing
 * as they talk, with their name and role above them.
 */
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useState } from 'react'
import type { Group } from 'three'
import type { CastMember, Gesture, Place, Scenario } from '../../content/scenarios/types'
import { placeAt } from '../../game/scenarios'
import { clipFrame, type ClipId, type RigFrame } from '../../world/character/rig'
import { Person, type Motion } from './people'

/** Facing from one point towards another (the same convention as the activities). */
const facing = (from: Place, to: Place) => Math.atan2(-(to.x - from.x), -(to.z - from.z))

/** Walking pace between places, metres a second. */
const PACE = 1.3

function Figure({
  member,
  place,
  speaking,
  gesture,
}: {
  member: CastMember
  place: { at: Place; faces: Place; seated: boolean }
  speaking: boolean
  gesture: Gesture
}) {
  const rig = useRef<RigFrame | null>(null)
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
    const dx = place.at.x - pos.current.x
    const dz = place.at.z - pos.current.z
    const away = Math.hypot(dx, dz)
    const moving = away > 0.04
    if (moving) {
      const step = Math.min(away, PACE * Math.min(dt, 0.1))
      pos.current.x += (dx / away) * step
      pos.current.z += (dz / away) * step
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
}: {
  scenario: Scenario
  /** The beat being played (for where everyone is). */
  beat: string
  /** Who is speaking now, if anyone. */
  speaker: string | null
  gesture?: Gesture
}) {
  return (
    <group>
      {scenario.cast.map((member) => (
        <Figure
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
