/**
 * Millpond Park, once through the gate: grass, a path round the pond, ducks
 * on the water, trees and flower beds, benches, lamp posts that light up in
 * the evening, and people walking and jogging. The path is a hotspot for a
 * walk, the running loop's marker for a run, a bench for sitting a while.
 */
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group, Mesh, MeshStandardMaterial } from 'three'
import type { Vector } from '../../../content/office'
import { Box } from '../../../office/scene/parts'
import { Walker, type PersonLook } from '../../../office/scene/people'
import { Npc } from '../../../world/npc/Npc'
import { DatePartner } from './DatePartner'
import { local, TOWN_PEOPLE } from '../../../content/townPeople'
import { prefersReducedMotion } from '../../../ui/motion'
import { Board, Hotspot } from './common'
import { signPainting, useInterior } from './kit'

const STILL = prefersReducedMotion()

function Tree({ position, scale = 1 }: { position: Vector; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.14, 0.2, 2, 8]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>
      {[
        [0, 2.6, 0, 1.1],
        [0.5, 2.2, 0.2, 0.8],
        [-0.45, 2.3, -0.2, 0.8],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]}>
          <icosahedronGeometry args={[r, 1]} />
          <meshStandardMaterial color={i ? '#4d7c0f' : '#3f6212'} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function ParkBench({ position, rotation = 0 }: { position: Vector; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[0, 0.14, 0.28].map((z) => (
        <Box
          key={z}
          size={[1.6, 0.05, 0.11]}
          position={[0, 0.45, z - 0.14]}
          color="#92400e"
        />
      ))}
      {[0.6, 0.75].map((y) => (
        <Box key={y} size={[1.6, 0.1, 0.04]} position={[0, y, 0.2]} color="#92400e" />
      ))}
      {[-0.7, 0.7].map((x) => (
        <Box key={x} size={[0.06, 0.45, 0.45]} position={[x, 0.22, 0]} color="#1f2937" />
      ))}
    </group>
  )
}

function LampPost({ position }: { position: Vector }) {
  const { dark, low } = useInterior()
  return (
    <group position={position}>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 3, 8]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh position={[0, 3.1, 0]}>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshBasicMaterial color={dark ? '#fde68a' : '#e5e7eb'} toneMapped={false} />
      </mesh>
      {dark && !low && (
        <pointLight position={[0, 3, 0]} color="#fde68a" intensity={8} distance={8} />
      )}
    </group>
  )
}

function Flowers({ position, colour }: { position: Vector; colour: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.8, 0.85, 0.2, 18]} />
        <meshStandardMaterial color="#57534e" />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        const r = 0.25 + (i % 3) * 0.17
        return (
          <mesh key={i} position={[Math.cos(a) * r, 0.3, Math.sin(a) * r]}>
            <sphereGeometry args={[0.09, 8, 6]} />
            <meshStandardMaterial color={i % 4 ? colour : '#fef08a'} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Ducks paddling slowly round the pond. */
function Ducks() {
  const group = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (!group.current || STILL) return
    group.current.rotation.y = clock.elapsedTime * 0.08
  })
  return (
    <group ref={group} position={[0, 0.05, -2]}>
      {[0, 2.2, 4.1].map((a, i) => (
        <group
          key={i}
          position={[Math.cos(a) * 2.2, 0, Math.sin(a) * 1.4]}
          rotation={[0, -a, 0]}
        >
          <mesh scale={[1.3, 0.7, 0.8]}>
            <sphereGeometry args={[0.16, 10, 8]} />
            <meshStandardMaterial color={i === 1 ? '#a16207' : '#f8fafc'} />
          </mesh>
          <mesh position={[0.18, 0.12, 0]}>
            <sphereGeometry args={[0.08, 8, 6]} />
            <meshStandardMaterial color={i === 1 ? '#15803d' : '#f8fafc'} />
          </mesh>
          <mesh position={[0.27, 0.11, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.03, 0.08, 6]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** The pond, with a gentle shimmer. */
function Pond() {
  const water = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!water.current || STILL) return
    const m = water.current.material as MeshStandardMaterial
    m.roughness = 0.15 + Math.sin(clock.elapsedTime * 0.8) * 0.06
  })
  return (
    <group position={[0, 0, -2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} scale={[1, 0.62, 1]}>
        <circleGeometry args={[4.2, 40]} />
        <meshStandardMaterial color="#78716c" />
      </mesh>
      <mesh
        ref={water}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.04, 0]}
        scale={[1, 0.62, 1]}
      >
        <circleGeometry args={[3.9, 40]} />
        <meshStandardMaterial color="#0e7490" metalness={0.3} roughness={0.15} />
      </mesh>
      {/* Reeds */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh
          key={i}
          position={[-3.2 + (i % 3) * 0.15, 0.35, 0.8 + Math.floor(i / 3) * 0.15]}
        >
          <cylinderGeometry args={[0.015, 0.02, 0.7, 4]} />
          <meshStandardMaterial color="#4d7c0f" />
        </mesh>
      ))}
      <Ducks />
    </group>
  )
}

/** Who the people walking in the park are. */
const VISITOR_WHO = Array.from({ length: 8 }, (_, i) => local('park', i))

const VISITORS: Array<{ path: Vector[]; look: PersonLook; speed: number }> = [
  {
    path: [
      [-6, 0, 3.2],
      [6, 0, 3.2],
    ],
    look: {
      skin: 2,
      hair: 'long',
      hairColor: 1,
      outfit: 'cardigan',
      top: '#be185d',
      under: '#fdf2f8',
      trousers: '#1e293b',
    },
    speed: 0.9,
  },
  {
    path: [
      [6.5, 0, -6],
      [6.5, 0, 2.5],
      [-6.5, 0, 2.5],
    ],
    look: {
      skin: 4,
      hair: 'crop',
      hairColor: 0,
      outfit: 'polo',
      top: '#f97316',
      trousers: '#111827',
      sleeves: 'short',
    },
    speed: 2.6,
  },
]

export default function Park() {
  const { low } = useInterior()
  return (
    <group>
      {/* Grass to the horizon, and the path round the pond */}
      <Box size={[60, 0.1, 50]} position={[0, -0.05, -10]} color="#65a30d" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -2]} scale={[1, 0.62, 1]}>
        <ringGeometry args={[4.6, 5.8, 48]} />
        <meshStandardMaterial color="#d6c7a1" />
      </mesh>
      <Box size={[1.4, 0.02, 6]} position={[0, 0.01, 4]} color="#d6c7a1" />
      <Box size={[16, 0.02, 1.2]} position={[0, 0.015, 3.2]} color="#d6c7a1" />
      <Pond />

      <Hotspot action="park-walk" position={[0, 0, 3.6]} ring={1} tag={1.9}>
        <Board
          size={[1.5, 0.4]}
          position={[1.1, 1.3, 0]}
          painting={signPainting('Pond walk', '#3f6212', '#ffffff')}
          paintingKey="pond-walk"
        />
        <mesh position={[1.1, 0.55, -0.02]}>
          <cylinderGeometry args={[0.04, 0.04, 1.1, 6]} />
          <meshStandardMaterial color="#44403c" />
        </mesh>
      </Hotspot>
      <Hotspot action="park-run" position={[5.6, 0, 1.2]} ring={1} tag={1.9}>
        <Board
          size={[1.5, 0.4]}
          position={[0, 1.3, 0]}
          painting={signPainting('Running loop 1 km', '#1d4ed8', '#ffffff')}
          paintingKey="run-loop"
        />
        <mesh position={[0, 0.55, -0.02]}>
          <cylinderGeometry args={[0.04, 0.04, 1.1, 6]} />
          <meshStandardMaterial color="#44403c" />
        </mesh>
      </Hotspot>
      <Hotspot action="park-bench" position={[-3.4, 0, 2.2]} ring={1.1} tag={1.8}>
        <ParkBench position={[0, 0, 0]} rotation={Math.PI} />
      </Hotspot>
      <DatePartner place="park" />
      <ParkBench position={[3.3, 0, -5.6]} rotation={0.3} />
      <Npc
        who={TOWN_PEOPLE.walter}
        position={[3.2, 0, -5.4]}
        rotation={0.3 + Math.PI}
        seated
        look={{
          skin: 0,
          hair: 'bald',
          hairColor: 3,
          outfit: 'cardigan',
          top: '#57534e',
          under: '#e7e5e4',
          trousers: '#44403c',
          glasses: true,
        }}
        phase={0.5}
      />

      {[
        [-7, 0, -6, 1.3],
        [7.5, 0, -7, 1.1],
        [-8, 0, 1, 1],
        [8.5, 0, 0, 1.2],
        [-4, 0, -10, 1.4],
        [3, 0, -11, 1.2],
        [10, 0, -12, 1.5],
        [-11, 0, -9, 1.3],
      ].map(([x, y, z, s], i) => (
        <Tree key={i} position={[x, y, z]} scale={s} />
      ))}
      <Flowers position={[-5.6, 0, 4.6]} colour="#e11d48" />
      <Flowers position={[4.6, 0, 4.8]} colour="#7c3aed" />
      {!low && <Flowers position={[-6.5, 0, -2]} colour="#f97316" />}
      <LampPost position={[-2.2, 0, 4.4]} />
      <LampPost position={[4.8, 0, -4.8]} />
      {!low && <LampPost position={[-5.2, 0, -5.2]} />}
      {(low ? VISITORS.slice(0, 1) : VISITORS).map((v, i) => (
        <Walker
          key={i}
          path={v.path}
          look={v.look}
          speed={v.speed}
          pause={1}
          phase={i}
          who={VISITOR_WHO[i]}
        />
      ))}
    </group>
  )
}
