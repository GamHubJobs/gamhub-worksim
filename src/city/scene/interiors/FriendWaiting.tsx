/**
 * A friend the player has arranged to meet (see game/social.ts friendWaiting):
 * at the café, sitting at the table by the window, across from the player's
 * seat; in the park, by the start of the running loop, stretching. In the
 * park they run the laps with the player, a little behind and to one side.
 * Talking to them starts the plan; it counts once it has been played.
 */
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import type { Who } from '../../../game/encounters'
import { FRIEND_LOOKS as LOOKS } from '../../../content/adultLooks'
import { friendWho } from '../../../game/social'
import { Person, type Motion, type PersonLook } from '../../../office/scene/people'
import { useWorld } from '../../../world/context'
import { Npc } from '../../../world/npc/Npc'
import { bodyOf } from '../../../world/npc/bodies'
import { useInterior } from './kit'

/** Where they wait by the running loop in the park, and the activity they run in. */
const PARK_WAIT = { x: 6.3, z: 1.0, heading: -Math.PI / 2 }

export function FriendWaiting({ place }: { place: 'cafe' | 'park' }) {
  const { friend } = useInterior()
  const who = friend ? friendWho(friend) : undefined
  if (!friend || !who) return null
  const look = LOOKS[friend] ?? LOOKS.leo
  return place === 'cafe' ? (
    <Npc
      who={who}
      position={[-3, 0, 0.85]}
      rotation={Math.PI}
      seated
      look={look}
      phase={0.6}
      reach={1.9}
      doing="waiting for you with a drink"
    />
  ) : (
    <ParkRunner who={who} look={look} />
  )
}

/** In the park: waiting by the loop, then running it beside the player. */
function ParkRunner({ who, look }: { who: Who; look: PersonLook }) {
  const { now } = useWorld()
  const group = useRef<Group>(null)
  const motion = useRef<Motion>({ walking: false })
  const at = useRef({ x: PARK_WAIT.x, z: PARK_WAIT.z, heading: PARK_WAIT.heading })
  // The way the player is running, from where they were a moment ago.
  const player = useRef({ x: 0, z: 0, heading: 0 })
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.25)
    const n = now.current
    const together = n.id === 'friend-park' && n.t > 2
    const g = group.current
    if (!g) return
    // Where the player really is (the activity's own position stands still while
    // they run between its points).
    const body = bodyOf('player') ?? n
    const p = player.current
    if (Math.hypot(body.x - p.x, body.z - p.z) > 0.02)
      p.heading = Math.atan2(-(body.x - p.x), -(body.z - p.z))
    p.x = body.x
    p.z = body.z
    if (together) {
      // A pace behind and to the left of the player, catching up smoothly.
      const h = p.heading
      const tx = p.x + Math.sin(h) * 0.9 - Math.cos(h) * 0.7
      const tz = p.z + Math.cos(h) * 0.9 + Math.sin(h) * 0.7
      const k = Math.min(1, dt * 6)
      const dx = tx - at.current.x
      const dz = tz - at.current.z
      at.current.x += dx * k
      at.current.z += dz * k
      if (Math.hypot(dx, dz) > 0.05) at.current.heading = Math.atan2(-dx, -dz)
    }
    if (import.meta.env.DEV)
      (window as unknown as { __worksimFriendRun?: unknown }).__worksimFriendRun = {
        together,
        id: n.id,
        t: n.t,
        x: at.current.x,
        z: at.current.z,
        playerX: p.x,
        playerZ: p.z,
      }
    g.position.set(at.current.x, 0, at.current.z)
    g.rotation.y = at.current.heading
    motion.current = { walking: together }
    g.visible = together
  })
  return (
    <>
      {/* Waiting: talked to like anyone else. */}
      <WaitingDan who={who} look={look} />
      <group ref={group} visible={false} userData={{ passable: true }}>
        <Person look={look} motion={motion} talking={false} phase={0.9} />
      </group>
    </>
  )
}

/** Standing by the loop, stretching, until the run starts (then hidden: they run). */
function WaitingDan({ who, look }: { who: Who; look: PersonLook }) {
  const { now } = useWorld()
  const group = useRef<Group>(null)
  useFrame(() => {
    if (group.current)
      group.current.visible = !(now.current.id === 'friend-park' && now.current.t > 2)
  })
  return (
    <group ref={group}>
      <Npc
        who={who}
        position={[PARK_WAIT.x, 0, PARK_WAIT.z]}
        rotation={PARK_WAIT.heading}
        look={look}
        phase={0.9}
        activity="stretch"
        doing="stretching, ready for a run"
      />
    </group>
  )
}
