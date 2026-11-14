/**
 * The cast of a live scenario (content/scenarios), in the room: each person
 * at their place facing who they address, seated or standing, moving between
 * beats (a witness into the box and back), and the one speaking now gesturing
 * as they talk, with their name and role above them.
 */
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { CastMember, Gesture, Place, Scenario } from '../../content/scenarios/types'
import { placeAt } from '../../game/scenarios'
import { clipFrame, type ClipId, type RigFrame } from '../../world/character/rig'
import { Person } from './people'

/** Facing from one point towards another (the same convention as the activities). */
const facing = (from: Place, to: Place) => Math.atan2(-(to.x - from.x), -(to.z - from.z))

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
  const t = useRef(member.id.length * 0.7)
  const clip: ClipId = speaking ? gesture : place.seated ? 'sit' : 'stand'
  useFrame((_, dt) => {
    t.current += dt
    rig.current = clipFrame(clip, t.current, place.seated ? 'seated' : 'standing')
  })
  const y = member.raised ?? 0
  return (
    <group>
      {member.figure !== false && (
        <Person
          position={[place.at.x, y, place.at.z]}
          rotation={facing(place.at, place.faces)}
          look={member.look}
          seated={place.seated}
          rig={rig}
        />
      )}
      {speaking && (
        <Html
          position={[place.at.x, y + (place.seated ? 1.55 : 2.05), place.at.z]}
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
