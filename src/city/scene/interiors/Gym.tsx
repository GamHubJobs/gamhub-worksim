/**
 * Forge Fitness inside: treadmills and exercise bikes facing a mirror wall,
 * a dumbbell rack and benches, a class studio with mats, the reception desk,
 * lockers, a water station and the door to the changing rooms. The weights
 * are a hotspot for a workout, the studio for a class, the changing-room door
 * for a shower.
 */
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Vector3, type Group, type Mesh } from 'three'
import { useWorld } from '../../../world/context'
import type { Vector } from '../../../content/office'
import { Box, Plant } from '../../../office/scene/parts'
import { Person, type Motion, type PersonLook } from '../../../office/scene/people'
import type { Who } from '../../../game/encounters'
import { Npc } from '../../../world/npc/Npc'
import { TOWN_PEOPLE } from '../../../content/townPeople'
import { Board, Hotspot, Lamp, Room } from './common'
import { signPainting, useInterior } from './kit'

function Treadmill({
  position,
  runner,
  who,
  player,
}: {
  position: Vector
  runner?: PersonLook
  /** Who is running on it. */
  who?: Who
  /** The one the player can use: its belt moves while they run on it. */
  player?: boolean
}) {
  const motion = useRef<Motion>({ walking: true })
  const belt = useRef<Group>(null)
  const { now } = useWorld()
  useFrame((_, dt) => {
    const b = belt.current
    if (!b) return
    const on =
      runner ||
      (player &&
        now.current.id === 'treadmill' &&
        now.current.t > 1.1 &&
        now.current.t < 15.6)
    if (on) b.position.z = (b.position.z + dt * 2.8) % 0.25
  })
  return (
    <group position={position}>
      <Box size={[0.8, 0.15, 1.8]} position={[0, 0.1, 0]} color="#27272a" />
      <Box size={[0.6, 0.03, 1.5]} position={[0, 0.19, 0.05]} color="#3f3f46" />
      {/* Slats on the belt, moving towards the back while it runs */}
      <group ref={belt}>
        {Array.from({ length: 6 }, (_, i) => (
          <Box
            key={i}
            size={[0.58, 0.005, 0.03]}
            position={[0, 0.207, -0.6 + i * 0.25]}
            color="#52525b"
          />
        ))}
      </group>
      {[-0.35, 0.35].map((x) => (
        <Box key={x} size={[0.05, 1.1, 0.05]} position={[x, 0.7, -0.8]} color="#52525b" />
      ))}
      <Box size={[0.8, 0.3, 0.12]} position={[0, 1.25, -0.8]} color="#18181b" />
      <Box
        size={[0.4, 0.15, 0.02]}
        position={[0, 1.28, -0.73]}
        color="#0f172a"
        emissive="#38bdf8"
      />
      {runner && (
        <Npc who={who!} position={[0, 0.2, 0]} availability="exercising">
          <Person look={runner} motion={motion} phase={position[0]} />
        </Npc>
      )}
    </group>
  )
}

function ExerciseBike({
  position,
  rider,
  player,
}: {
  position: Vector
  rider?: PersonLook
  player?: boolean
}) {
  const wheel = useRef<Mesh>(null)
  const { now } = useWorld()
  useFrame((_, dt) => {
    const on =
      rider ||
      (player && now.current.id === 'bike' && now.current.t > 1 && now.current.t < 15)
    if (on && wheel.current) wheel.current.rotation.x += dt * 7
  })
  return (
    <group position={position}>
      <Box size={[0.3, 0.1, 1.1]} position={[0, 0.05, 0]} color="#27272a" />
      <Box size={[0.08, 0.7, 0.08]} position={[0, 0.45, 0.3]} color="#52525b" />
      <Box size={[0.3, 0.08, 0.35]} position={[0, 0.82, 0.3]} color="#111827" />
      <Box size={[0.08, 0.9, 0.08]} position={[0, 0.55, -0.35]} color="#52525b" />
      <Box size={[0.5, 0.05, 0.08]} position={[0, 1.0, -0.38]} color="#111827" />
      <group position={[0, 0.35, -0.2]} rotation={[0, 0, Math.PI / 2]}>
        <mesh ref={wheel}>
          <cylinderGeometry args={[0.25, 0.25, 0.08, 20]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
        <Box size={[0.04, 0.09, 0.45]} position={[0, 0, 0]} color="#7f1d1d" />
      </group>
      {rider && (
        <Npc
          who={TOWN_PEOPLE.rider}
          position={[0, 0.4, 0.3]}
          seated
          look={rider}
          phase={position[0]}
          availability="exercising"
        />
      )}
    </group>
  )
}

function DumbbellRack() {
  const pair = useRef<Group>(null)
  const { now } = useWorld()
  useFrame(() => {
    const t = now.current.t
    if (pair.current)
      pair.current.visible = !(now.current.id === 'curls' && t > 1.1 && t < 14.5)
  })
  const sizes = [0.07, 0.08, 0.09, 0.1, 0.11, 0.12]
  return (
    <group>
      <Box size={[3, 0.06, 0.6]} position={[0, 0.5, 0]} color="#3f3f46" />
      <Box size={[3, 0.06, 0.6]} position={[0, 0.95, -0.1]} color="#3f3f46" />
      {[-1.45, 1.45].map((x) => (
        <Box key={x} size={[0.06, 1, 0.6]} position={[x, 0.5, 0]} color="#27272a" />
      ))}
      {[0.55, 1.0].map((y, row) =>
        sizes.map((r, i) => (
          <group key={`${row}${i}`} ref={row === 0 && i === 2 ? pair : undefined}>
            <group key={`${row}${i}`} position={[-1.2 + i * 0.48, y + r, row ? -0.1 : 0]}>
              {[-0.13, 0.13].map((x) => (
                <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[r, r, 0.07, 14]} />
                  <meshStandardMaterial color="#18181b" roughness={0.5} />
                </mesh>
              ))}
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
                <meshStandardMaterial color="#a1a1aa" metalness={0.7} roughness={0.3} />
              </mesh>
            </group>
          </group>
        )),
      )}
    </group>
  )
}

function Bench({
  position,
  rotation = 0,
  bar = true,
}: {
  position: Vector
  rotation?: number
  bar?: boolean
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={[0.4, 0.1, 1.3]} position={[0, 0.45, 0]} color="#111827" radius={0.03} />
      <Box size={[0.08, 0.4, 0.08]} position={[0, 0.2, 0.45]} color="#52525b" />
      <Box size={[0.08, 0.4, 0.08]} position={[0, 0.2, -0.45]} color="#52525b" />
      {/* A bar on its rack */}
      {[-0.35, 0.35].map((x) => (
        <Box
          key={x}
          size={[0.05, 1.1, 0.05]}
          position={[x, 0.55, -0.6]}
          color="#52525b"
        />
      ))}
      {bar && (
        <group position={[0, 1.05, -0.6]}>
          <BarAndPlates />
        </group>
      )}
    </group>
  )
}

function BarAndPlates() {
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 1.6, 8]} />
        <meshStandardMaterial color="#a1a1aa" metalness={0.7} roughness={0.3} />
      </mesh>
      {[-0.7, 0.7].map((x) => (
        <group key={x}>
          <mesh position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.22, 0.22, 0.06, 18]} />
            <meshStandardMaterial color="#1d4ed8" />
          </mesh>
          <mesh position={[x + Math.sign(x) * 0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.16, 0.16, 0.04, 16]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/**
 * The bench press bar: on its rack, or, while the player presses, in their
 * hands (between the two hand markers), so it moves with every rep.
 */
function Barbell({ rest }: { rest: Vector }) {
  const group = useRef<Group>(null)
  const { now, hands } = useWorld()
  const l = useRef(new Vector3())
  const r = useRef(new Vector3())
  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const { id, t } = now.current
    const lifting = id === 'bench' && t > 2.2 && t < 17.6
    const { left, right } = hands.current
    if (lifting && left && right) {
      left.getWorldPosition(l.current)
      right.getWorldPosition(r.current)
      const k = t < 3 || t > 16.8 ? 1 - Math.exp(-dt * 10) : 1
      g.position.lerp(l.current.add(r.current).multiplyScalar(0.5), k)
    } else g.position.lerp(new Vector3(...rest), 1 - Math.exp(-dt * 8))
  })
  return (
    <group ref={group} position={rest}>
      <BarAndPlates />
    </group>
  )
}

/** A shower cubicle in the corner by the changing rooms: glass, a tray, a showerhead. */
function ShowerCubicle() {
  return (
    <group>
      <Box size={[1.4, 0.06, 1.4]} position={[5.3, 0.03, 4.25]} color="#e2e8f0" />
      <Box
        size={[1.4, 2.1, 0.03]}
        position={[5.3, 1.08, 3.55]}
        color="#bae6fd"
        opacity={0.3}
      />
      <Box
        size={[0.03, 2.1, 1.4]}
        position={[4.6, 1.08, 4.25]}
        color="#bae6fd"
        opacity={0.3}
      />
      <Box size={[1.4, 2.4, 0.04]} position={[5.3, 1.2, 4.96]} color="#cbd5e1" />
      {/* The pipe from the wall and the head */}
      <Box size={[0.04, 0.04, 0.7]} position={[5.3, 2.32, 4.6]} color="#a1a1aa" />
      <mesh position={[5.3, 2.28, 4.25]}>
        <cylinderGeometry args={[0.12, 0.08, 0.05, 18]} />
        <meshStandardMaterial color="#d4d4d8" metalness={0.6} roughness={0.25} />
      </mesh>
      <Box size={[0.08, 0.12, 0.05]} position={[5.75, 1.15, 4.92]} color="#a1a1aa" />
      <Board
        size={[0.8, 0.22]}
        position={[5.3, 2.62, 3.53]}
        rotation={Math.PI}
        painting={signPainting('Showers', '#1e40af', '#ffffff')}
        paintingKey="showers"
      />
    </group>
  )
}

const MEMBERS: PersonLook[] = [
  {
    skin: 4,
    hair: 'crop',
    hairColor: 0,
    outfit: 'polo',
    top: '#f97316',
    trousers: '#111827',
    sleeves: 'short',
    build: 'broad',
  },
  {
    skin: 1,
    hair: 'ponytail',
    hairColor: 2,
    outfit: 'polo',
    top: '#ec4899',
    trousers: '#1f2937',
    sleeves: 'short',
  },
  {
    skin: 2,
    hair: 'short',
    hairColor: 1,
    outfit: 'polo',
    top: '#22c55e',
    trousers: '#374151',
    sleeves: 'short',
  },
  {
    skin: 5,
    hair: 'bun',
    hairColor: 0,
    outfit: 'polo',
    top: '#a855f7',
    trousers: '#111827',
    sleeves: 'short',
  },
]

export default function Gym() {
  const { low } = useInterior()
  return (
    <group>
      <Room
        width={14}
        depth={10}
        floor="#3f3f46"
        wall="#a8a29e"
        side="#d6d3d1"
        ceiling="#e7e5e4"
      />
      {/* Rubber floor tiles */}
      {Array.from({ length: 7 }, (_, i) => (
        <Box
          key={i}
          size={[0.03, 0.01, 10]}
          position={[-6 + i * 2, 0.01, 0]}
          color="#52525b"
        />
      ))}
      {/* A red stripe along the wall */}
      <Box size={[14, 0.3, 0.03]} position={[0, 0.6, -4.88]} color="#dc2626" />
      {/* Mirror wall */}
      <Box size={[8, 2.4, 0.04]} position={[-2, 1.5, -4.87]} color="#cbd5e1" />
      <mesh position={[-2, 1.5, -4.84]}>
        <planeGeometry args={[7.9, 2.3]} />
        <meshStandardMaterial color="#dbeafe" metalness={0.15} roughness={0.12} />
      </mesh>
      <Board
        size={[3.2, 0.6]}
        position={[3.6, 2.2, -4.86]}
        painting={signPainting('FORGE FITNESS', '#dc2626', '#ffffff')}
        paintingKey="forge"
        glow
      />

      {/* Cardio: treadmills and bikes, members working out */}
      <Treadmill position={[-5, 0, -2.8]} runner={MEMBERS[0]} who={TOWN_PEOPLE.runner1} />
      <Treadmill position={[-3.8, 0, -2.8]} player />
      <Treadmill
        position={[-2.6, 0, -2.8]}
        runner={low ? undefined : MEMBERS[1]}
        who={TOWN_PEOPLE.runner2}
      />
      <ExerciseBike position={[-1.2, 0, -3]} rider={MEMBERS[2]} />
      <ExerciseBike position={[-0.2, 0, -3]} player />

      {/* Weights: a workout */}
      <Hotspot action="gym-workout" position={[1.2, 0, 0.6]} ring={1.6} tag={2.2}>
        <group position={[0, 0, -1]}>
          <DumbbellRack />
        </group>
        <Bench position={[0.2, 0, 0.6]} bar={false} />
      </Hotspot>
      <Bench position={[-2.5, 0, 0.8]} rotation={0.3} />
      <Barbell rest={[1.4, 1.05, 0.6]} />
      <ShowerCubicle />
      <Npc
        who={TOWN_PEOPLE.trainer}
        position={[-2.3, 0, 1.6]}
        rotation={Math.PI}
        look={MEMBERS[3]}
        phase={0.9}
      />

      {/* The class studio: mats and a step */}
      <Hotspot action="gym-class" position={[4.7, 0, -1.8]} ring={1.6} tag={2.2}>
        <Box size={[3.4, 0.02, 3.4]} position={[0, 0.01, 0]} color="#7c2d12" />
        {[
          [-0.9, -0.9],
          [0.9, -0.9],
          [-0.9, 0.9],
          [0.9, 0.9],
        ].map(([x, z], i) => (
          <Box
            key={i}
            size={[0.6, 0.02, 1.4]}
            position={[x, 0.03, z]}
            color={['#0ea5e9', '#a855f7', '#22c55e', '#f43f5e'][i]}
          />
        ))}
        <Box size={[0.8, 0.15, 0.35]} position={[0, 0.08, 0]} color="#111827" />
      </Hotspot>

      {/* Reception, lockers, water and the changing rooms */}
      <group position={[-5, 0, 2.8]}>
        <Box size={[2, 1.05, 0.7]} position={[0, 0.52, 0]} color="#dc2626" />
        <Box size={[2.1, 0.05, 0.8]} position={[0, 1.07, 0]} color="#18181b" />
        <Box
          size={[0.4, 0.3, 0.03]}
          position={[0.4, 1.3, -0.1]}
          color="#0f172a"
          emissive="#38bdf8"
        />
        <Npc
          who={TOWN_PEOPLE.gymDesk}
          reach={2.1}
          position={[0, 0, -0.75]}
          rotation={Math.PI}
          look={{
            skin: 3,
            hair: 'side',
            hairColor: 0,
            outfit: 'polo',
            top: '#18181b',
            trousers: '#18181b',
            sleeves: 'short',
            smile: true,
          }}
          phase={0.2}
        />
      </group>
      <group position={[6.75, 0, 2]} rotation={[0, -Math.PI / 2, 0]}>
        {Array.from({ length: 6 }, (_, i) => (
          <group key={i} position={[-1.5 + i * 0.6, 0, 0]}>
            <Box size={[0.56, 1.9, 0.45]} position={[0, 0.95, 0]} color="#475569" />
            <Box size={[0.04, 0.14, 0.02]} position={[0.2, 1.1, 0.24]} color="#e2e8f0" />
            <Box size={[0.3, 0.04, 0.01]} position={[0, 1.7, 0.23]} color="#94a3b8" />
          </group>
        ))}
      </group>
      <Hotspot action="gym-shower" position={[6.2, 0, 4]} ring={0.8} tag={2.5}>
        <group position={[0.4, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <Box size={[1, 2.1, 0.08]} position={[0, 1.05, 0]} color="#1e40af" />
          <Box size={[0.06, 0.06, 0.1]} position={[0.35, 1, 0.06]} color="#e2e8f0" />
          <Board
            size={[0.8, 0.25]}
            position={[0, 2.35, 0.05]}
            painting={signPainting('Changing rooms', '#1e40af', '#ffffff')}
            paintingKey="changing"
          />
        </group>
      </Hotspot>
      <group position={[2.6, 0, 4.4]}>
        <Box size={[0.45, 0.9, 0.35]} position={[0, 0.45, 0]} color="#e5e7eb" />
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.45, 16]} />
          <meshStandardMaterial color="#7dd3fc" transparent opacity={0.6} />
        </mesh>
      </group>
      <Plant position={[-6.4, 0, -4.2]} />
      {[-4, 0, 4].map((x) => (
        <Lamp
          key={x}
          position={[x, 3.0, -1]}
          colour="#f8fafc"
          intensity={5}
          shade="#3f3f46"
        />
      ))}
    </group>
  )
}
