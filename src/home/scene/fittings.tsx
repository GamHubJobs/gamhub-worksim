/**
 * The parts of a home that come with it (not bought in the furniture shop):
 * floors for each room, tall back and side walls with windows, curtains and
 * pictures, a fridge and wall cupboards, the bathroom's toilet, basin and
 * mirror, ceiling lights, a radiator, and the front door with coat hooks.
 * Placed from the home's size and room centres, so every home has them.
 */
import type { Home } from '../../content/home'
import { Box } from '../../office/scene/parts'
import { Hotspot } from '../../city/scene/interiors/common'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { useWorld } from '../../world/context'
import { DELIVERY_TIMES } from './homeLayout'

const WALL = 2.5

/** Seconds into answering the door that it stands open (see homeLayout's DELIVERY_TIMES). */
const OPEN = {
  from: 0.3,
  to: DELIVERY_TIMES.open + DELIVERY_TIMES.greet + DELIVERY_TIMES.take + 0.6,
}

/** The front door: shut, except while the player answers it, when it swings open into the hall. */
function FrontDoor() {
  const { now } = useWorld()
  const hinge = useRef<Group>(null)
  useFrame((_, dt) => {
    const h = hinge.current
    if (!h) return
    const n = now.current
    const doorstep = n.id === 'takeaway-door'
    const open = doorstep && n.t > OPEN.from && n.t < OPEN.to ? 1 : 0
    const target = 1.35 * open
    h.rotation.y += (target - h.rotation.y) * Math.min(1, dt * 5)
  })
  // Hinged at the back edge of the doorway; the leaf spans the opening.
  return (
    <group position={[-0.47, 0, -0.475]}>
      <group ref={hinge}>
        <group position={[0, 0, 0.475]} rotation={[0, Math.PI / 2, 0]}>
          <Box size={[0.95, 2.05, 0.08]} position={[0, 1.02, 0]} color="#7c2d12" />
          <Box size={[0.06, 0.06, 0.1]} position={[0.35, 1.0, 0.06]} color="#d4d4d8" />
        </group>
      </group>
    </group>
  )
}

export function Fittings({ home, evening }: { home: Home; evening: boolean }) {
  const [w, d] = home.size
  const back = -d / 2
  const left = -w / 2
  const { kitchen, bathroom, bedroom, living } = home.rooms
  const bathWall = bathroom[0] - 1.2
  const glass = evening ? '#1e293b' : '#bae6fd'
  return (
    <group>
      {/* Floors: tiles in the kitchen and bathroom, carpet in the bedroom */}
      <Box
        size={[w / 2 - 0.2, 0.012, d * 0.42]}
        position={[kitchen[0] + 0.3, 0.012, back + d * 0.21]}
        color="#d6d3d1"
      />
      {Array.from({ length: 8 }, (_, i) => (
        <Box
          key={i}
          size={[0.012, 0.014, d * 0.42]}
          position={[left + 0.4 + i * ((w / 2 - 0.4) / 8), 0.014, back + d * 0.21]}
          color="#a8a29e"
        />
      ))}
      <Box
        size={[w / 2 - bathWall, 0.012, d * 0.42]}
        position={[(bathWall + w / 2) / 2, 0.013, back + d * 0.21]}
        color="#e0f2fe"
      />
      <Box
        size={[w / 2 - 0.6, 0.012, d * 0.45]}
        position={[bedroom[0], 0.012, bedroom[1] + 0.2]}
        color="#c7b8a3"
      />

      {/* Tall back and left walls (the camera looks in from the front right) */}
      <Box size={[w, WALL, 0.14]} position={[0, WALL / 2, back]} color="#efe9df" />
      {/* The left wall, with the front doorway (and the landing outside it) */}
      <Box
        size={[0.14, WALL, d - 1.4]}
        position={[left, WALL / 2, -0.7]}
        color="#e8e0d2"
      />
      <Box
        size={[0.14, WALL, 0.4]}
        position={[left, WALL / 2, d / 2 - 0.2]}
        color="#e8e0d2"
      />
      <Box
        size={[0.14, WALL - 2.1, 1.0]}
        position={[left, 2.1 + (WALL - 2.1) / 2, d / 2 - 0.9]}
        color="#e8e0d2"
      />
      <Box
        size={[1.9, 0.02, 2.4]}
        position={[left - 0.95, 0.006, d / 2 - 0.9]}
        color="#9ca3af"
      />
      <Box
        size={[0.12, WALL, 2.4]}
        position={[left - 1.9, WALL / 2, d / 2 - 0.9]}
        color="#cbd5e1"
      />
      <Box
        size={[0.1, WALL, d * 0.42]}
        position={[bathWall, WALL / 2, back + d * 0.21]}
        color="#e7e1d6"
      />
      <Box size={[w, 0.12, 0.05]} position={[0, 0.06, back + 0.1]} color="#a8a29e" />

      {/* Windows with curtains: the living room and the bedroom */}
      {[living[0], bedroom[0] - 0.4].map((x, i) => (
        <group key={i} position={[x, 1.45, back + 0.08]}>
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[1.5, 1.1]} />
            <meshBasicMaterial color={glass} toneMapped={false} />
          </mesh>
          <Box size={[1.6, 0.06, 0.06]} position={[0, 0.58, 0.03]} color="#f5f5f4" />
          <Box size={[1.6, 0.06, 0.06]} position={[0, -0.58, 0.03]} color="#f5f5f4" />
          <Box size={[0.05, 1.1, 0.05]} position={[0, 0, 0.03]} color="#f5f5f4" />
          {[-0.95, 0.95].map((cx) => (
            <Box
              key={cx}
              size={[0.4, 1.5, 0.05]}
              position={[cx, -0.1, 0.07]}
              color={i ? '#7c3aed' : '#0f766e'}
            />
          ))}
          {/* A radiator under the window */}
          <Box size={[1.1, 0.5, 0.08]} position={[0, -1.05, 0.06]} color="#f8fafc" />
        </group>
      ))}

      {/* Pictures on the left wall */}
      {[
        [living[1] - 0.6, '#f59e0b'],
        [living[1] + 0.5, '#0ea5e9'],
      ].map(([z, colour], i) => (
        <group
          key={i}
          position={[left + 0.08, 1.55, z as number]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <Box size={[0.7, 0.5, 0.03]} position={[0, 0, 0]} color="#292524" />
          <Box
            size={[0.6, 0.4, 0.02]}
            position={[0, 0, 0.015]}
            color={colour as string}
          />
          <mesh position={[0.08, -0.05, 0.03]}>
            <circleGeometry args={[0.1, 16]} />
            <meshStandardMaterial color="#fef3c7" />
          </mesh>
        </group>
      ))}

      {/* Kitchen: a fridge and wall cupboards */}
      <group position={[left + 0.4, 0, back + 0.4]}>
        <Box
          size={[0.65, 1.8, 0.6]}
          position={[0, 0.9, 0]}
          color="#e5e7eb"
          radius={0.04}
        />
        <Box size={[0.03, 0.5, 0.04]} position={[0.26, 1.2, 0.31]} color="#9ca3af" />
        <Box size={[0.66, 0.02, 0.02]} position={[0, 1.15, 0.31]} color="#9ca3af" />
      </group>
      <Box
        size={[2.2, 0.55, 0.32]}
        position={[kitchen[0] + 0.4, 1.95, back + 0.2]}
        color="#f5f5f4"
      />
      <Box
        size={[2.2, 0.02, 0.02]}
        position={[kitchen[0] + 0.4, 1.95, back + 0.37]}
        color="#a8a29e"
      />

      {/* Bathroom: toilet, basin and mirror, a towel */}
      <group position={[bathWall + 0.45, 0, back + 0.4]}>
        <Box
          size={[0.4, 0.4, 0.55]}
          position={[0, 0.2, 0.05]}
          color="#f8fafc"
          radius={0.08}
        />
        <Box
          size={[0.42, 0.45, 0.18]}
          position={[0, 0.6, -0.2]}
          color="#f8fafc"
          radius={0.04}
        />
      </group>
      <group position={[bathWall + 1.15, 0, back + 0.25]}>
        <Box
          size={[0.5, 0.15, 0.35]}
          position={[0, 0.85, 0.05]}
          color="#f8fafc"
          radius={0.05}
        />
        <Box size={[0.12, 0.78, 0.12]} position={[0, 0.4, 0]} color="#f1f5f9" />
        <mesh position={[0, 1.45, -0.08]}>
          <planeGeometry args={[0.5, 0.6]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>
      <Box
        size={[0.05, 0.6, 0.35]}
        position={[bathWall + 0.08, 1.2, back + 1.1]}
        color="#f472b6"
      />

      {/* Ceiling lights, glowing in the evening */}
      {[living, kitchen, bedroom].map(([x, z], i) => (
        <group key={i} position={[x, WALL - 0.1, z]}>
          <mesh>
            <sphereGeometry args={[0.16, 12, 10]} />
            <meshBasicMaterial
              color={evening ? '#fde68a' : '#f5f5f4'}
              toneMapped={false}
            />
          </mesh>
          {evening && <pointLight color="#ffd9a0" intensity={4} distance={5} decay={2} />}
        </group>
      ))}

      {/* The front door, coat hooks and a doormat */}
      {/* On the left wall near the front, out of the camera's way */}
      <Hotspot
        action="go-out"
        position={[left + 0.55, 0, d / 2 - 0.9]}
        ring={0.5}
        tag={2.4}
      >
        <FrontDoor />
      </Hotspot>
      <Box
        size={[0.55, 0.02, 0.9]}
        position={[left + 0.4, 0.012, d / 2 - 0.9]}
        color="#78350f"
      />
      <group position={[left + 0.1, 1.6, d / 2 - 2]} rotation={[0, Math.PI / 2, 0]}>
        <Box size={[0.9, 0.06, 0.04]} position={[0, 0, 0]} color="#57534e" />
        <Box size={[0.25, 0.7, 0.1]} position={[-0.25, -0.35, 0.05]} color="#1e3a8a" />
        <Box size={[0.22, 0.55, 0.1]} position={[0.2, -0.3, 0.05]} color="#b45309" />
      </group>
    </group>
  )
}
