/**
 * The takeaway courier at the front door (see game/delivery.ts). When the
 * takeaway arrives, they walk along the landing outside to the door and ring
 * the bell, and ring again now and then while they wait. When the player
 * answers, the door swings open; they say hello, hold out the bag, let go of
 * it as the player takes it, and walk off as the door closes. If no one came,
 * the bag is left on the doorstep, where it waits to be picked up. Never in the
 * home itself: always outside the door.
 */
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import type { Group } from 'three'
import { audio } from '../../audio/manager'
import type { DeliveryStage } from '../../game/delivery'
import { Person, type Motion } from '../../office/scene/people'
import { clipFrame, type RigFrame } from '../../world/character/rig'
import { useWorld } from '../../world/context'
import { Prop } from '../../world/props'
import { DELIVERY_TIMES as T } from './homeLayout'
import { COURIER_LOOK } from './courierLook'

/** Seconds into answering the door when the bag changes hands, and when they leave. */
const HAND_OVER = T.open + T.greet + T.take * 0.45
const LEAVE = T.open + T.greet + T.take
const END = LEAVE + T.close

/** The courier and the bag: `door` is the doorway, `out` the way to the landing outside. */
export function Courier({
  stage,
  door,
}: {
  stage: DeliveryStage
  /** Where the doorway is (x, z), on the left wall. */
  door: [number, number]
}) {
  const { now } = useWorld()
  const group = useRef<Group>(null)
  const bag = useRef<Group>(null)
  const motion = useRef<Motion>({ walking: false })
  const rig = useRef<RigFrame | null>(null)
  const [holding, setHolding] = useState(true)
  const walk = useRef({ x: door[0] - 1.7, arrived: false, rang: 0, left: 0 })
  // Just outside the door, facing it.
  const stand = door[0] - 0.55
  const z = door[1]

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.5)
    const g = group.current
    if (!g) return
    const answering = now.current.id === 'takeaway-door'
    const t = answering ? now.current.t : 0
    const here = stage === 'at-door' || (answering && stage !== 'doorstep' && t < END)
    g.visible = here
    if (bag.current)
      bag.current.visible = stage === 'doorstep' && !(answering && t > T.open + 0.6)
    if (!here) {
      if (import.meta.env.DEV)
        (window as unknown as { __worksimCourier?: unknown }).__worksimCourier = {
          shown: false,
        }
      walk.current = { x: door[0] - 1.7, arrived: false, rang: 0, left: 0 }
      return
    }
    const w = walk.current
    let heading = -Math.PI / 2
    let walking = false
    if (answering && t >= LEAVE) {
      // Off along the landing.
      w.x -= dt * 1.3
      heading = Math.PI / 2
      walking = true
    } else if (!w.arrived) {
      // Coming along the landing to the door.
      w.x = Math.min(stand, w.x + dt * 1.2)
      walking = w.x < stand
      if (!walking) w.arrived = true
    } else if (!answering) {
      // Ringing, and again every so often while waiting.
      w.rang -= dt
      if (w.rang <= 0) {
        audio.play('doorbell')
        w.rang = 25
      }
    }
    g.position.set(w.x, 0, z)
    g.rotation.y = heading
    motion.current = { walking }
    rig.current = walking
      ? null
      : answering && t >= T.open && t < LEAVE
        ? clipFrame(t < T.open + T.greet ? 'talk' : 'reach', t)
        : clipFrame(answering ? 'stand' : 'phone', t)
    const has = !(answering && t >= HAND_OVER)
    if (has !== holding) setHolding(has)
    if (import.meta.env.DEV)
      (window as unknown as { __worksimCourier?: unknown }).__worksimCourier = {
        shown: true,
        x: w.x,
        holding: has,
        atDoor: w.arrived,
      }
  })

  return (
    <>
      <group ref={group} visible={false} userData={{ passable: true }}>
        <Person
          look={COURIER_LOOK}
          motion={motion}
          rig={rig}
          talking={false}
          hold={holding ? { right: <Prop kind="bag" /> } : undefined}
          phase={0.8}
        />
      </group>
      {/* Left on the doorstep, if no one answered. */}
      <group ref={bag} position={[door[0] - 0.4, 0.2, z + 0.25]} visible={false}>
        <Prop kind="bag" />
      </group>
    </>
  )
}
