/**
 * Westmark County Court (fictional), drawn: the entrance hall with its
 * security arch, bag scanner and officer, the usher's desk, the day's cause
 * list and benches, and Court 2 through the double doors, with the same
 * furniture as the law firm's moot courtroom. Layout in courthouseLayout.ts.
 */
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Courtroom } from '../office/scene/courtroom'
import { Box } from '../office/scene/parts'
import { Person, type Motion, type PersonLook } from '../office/scene/people'
import { Sign } from '../office/scene/signs'
import { clipFrame, type RigFrame } from '../world/character/rig'
import {
  ARCH,
  BENCHES,
  CAUSE_LIST,
  COURT,
  COURT_DOOR,
  ENTRANCE,
  HALL,
  HEIGHT,
  SCANNER,
  USHER_DESK,
} from './courthouseLayout'

const WOOD = '#7c4a24'
const WOOD_DARK = '#5b3417'
const STONE = '#d6d3d1'
const PLASTER = '#f5f5f4'

/** A member of the court's staff at their post (not someone to chat to). */
function Official({
  look,
  x,
  z,
  heading,
}: {
  look: PersonLook
  x: number
  z: number
  heading: number
}) {
  const rig = useRef<RigFrame | null>(null)
  const motion = useRef<Motion>({ walking: false })
  const t = useRef(x + z)
  useFrame((_, dt) => {
    t.current += dt
    rig.current = clipFrame('stand', t.current, 'standing')
  })
  return (
    <group position={[x, 0, z]} rotation={[0, heading, 0]}>
      <Person look={look} seated={false} rig={rig} motion={motion} />
    </group>
  )
}

/** A wall from (x0, z0) to (x1, z1), along x or along z, with a wood panel below. */
function Wall({
  x0,
  z0,
  x1,
  z1,
  panelled = false,
}: {
  x0: number
  z0: number
  x1: number
  z1: number
  panelled?: boolean
}) {
  const alongX = z0 === z1
  const length = alongX ? x1 - x0 : z1 - z0
  const size = (h: number, t: number): [number, number, number] =>
    alongX ? [length, h, t] : [t, h, length]
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  return (
    <group>
      <Box size={size(HEIGHT, 0.24)} position={[cx, HEIGHT / 2, cz]} color={PLASTER} />
      {panelled && (
        <Box size={size(1.15, 0.28)} position={[cx, 0.575, cz]} color={WOOD} />
      )}
    </group>
  )
}

export function Courthouse() {
  const door0 = COURT_DOOR.x - COURT_DOOR.half
  const door1 = COURT_DOOR.x + COURT_DOOR.half
  return (
    <group>
      {/* The hall's stone floor, with a darker border */}
      <Box
        size={[HALL.x1 - HALL.x0, 0.02, HALL.z1 - HALL.z0]}
        position={[(HALL.x0 + HALL.x1) / 2, 0.0, (HALL.z0 + HALL.z1) / 2]}
        color={STONE}
      />
      <Box
        size={[1.6, 0.025, HALL.z1 - HALL.z0 - 0.4]}
        position={[ENTRANCE.x, 0.005, (HALL.z0 + HALL.z1) / 2]}
        color="#991b1b"
      />
      <Box
        size={[COURT.x1 - COURT.x0, 0.01, COURT.z1 - COURT.z0]}
        position={[(COURT.x0 + COURT.x1) / 2, 0.0, (COURT.z0 + COURT.z1) / 2]}
        color="#3f6b52"
      />

      {/* Walls: the outside, and between the hall and Court 2 (with its doors) */}
      <Wall
        x0={HALL.x0 - 0.12}
        z0={HALL.z0 - 0.12}
        x1={HALL.x1 + 0.12}
        z1={HALL.z0 - 0.12}
      />
      <Wall x0={HALL.x0 - 0.12} z0={HALL.z0} x1={HALL.x0 - 0.12} z1={HALL.z1} />
      <Wall x0={HALL.x1 + 0.12} z0={HALL.z0} x1={HALL.x1 + 0.12} z1={HALL.z1} />
      <Wall
        x0={HALL.x1 + 0.12}
        z0={COURT.z0}
        x1={HALL.x1 + 0.12}
        z1={COURT.z1}
        panelled
      />
      <Wall
        x0={COURT.x0 - 0.12}
        z0={COURT.z1 + 0.12}
        x1={COURT.x1 + 0.12}
        z1={COURT.z1 + 0.12}
        panelled
      />
      <Wall
        x0={COURT.x0 - 0.12}
        z0={COURT.z0}
        x1={COURT.x0 - 0.12}
        z1={COURT.z1}
        panelled
      />
      <Wall x0={HALL.x0 - 0.12} z0={HALL.z1} x1={door0} z1={HALL.z1} />
      <Wall x0={door1} z0={HALL.z1} x1={HALL.x1 + 0.12} z1={HALL.z1} />

      {/* Court 2's doors: frame, the doors standing open, and the sign */}
      <Box
        size={[door1 - door0 + 0.3, 0.35, 0.3]}
        position={[COURT_DOOR.x, 2.45, HALL.z1]}
        color={WOOD_DARK}
      />
      <Box
        size={[0.06, 2.3, 0.6]}
        position={[door0 + 0.05, 1.15, HALL.z1 + 0.32]}
        color={WOOD}
      />
      <Box
        size={[0.06, 2.3, 0.6]}
        position={[door1 - 0.05, 1.15, HALL.z1 + 0.32]}
        color={WOOD}
      />
      <Sign
        position={[COURT_DOOR.x, 2.95, HALL.z1 - 0.14]}
        rotation={Math.PI}
        className="bg-slate-900 text-[12px] tracking-wide text-white"
      >
        COURT 2 · Hearing in progress: knock and wait
      </Sign>

      {/* The way in from the street: glass doors */}
      <Box
        size={[1.5, 2.4, 0.06]}
        position={[ENTRANCE.x, 1.2, HALL.z0 + 0.0]}
        color="#93c5fd"
      />
      <Box
        size={[0.05, 2.4, 0.08]}
        position={[ENTRANCE.x, 1.2, HALL.z0 + 0.02]}
        color="#334155"
      />
      <Sign
        position={[ENTRANCE.x, 2.75, HALL.z0 + 0.14]}
        className="bg-emerald-700 text-[10px] text-white"
      >
        Way out
      </Sign>
      <Sign
        position={[8.4, 2.9, HALL.z0 + 0.14]}
        className="bg-white text-[13px] tracking-wide text-slate-900"
      >
        Westmark County Court (fictional)
      </Sign>
      <mesh position={[8.4, 2.3, HALL.z0 + 0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.05, 24]} />
        <meshStandardMaterial color="#ca8a04" roughness={0.5} />
      </mesh>

      {/* Security: the arch, the bag scanner and its belt, and the officer */}
      <Box
        size={[0.16, 2.2, 0.6]}
        position={[ARCH.x - 0.62, 1.1, ARCH.z]}
        color="#9ca3af"
      />
      <Box
        size={[0.16, 2.2, 0.6]}
        position={[ARCH.x + 0.62, 1.1, ARCH.z]}
        color="#9ca3af"
      />
      <Box size={[1.4, 0.22, 0.6]} position={[ARCH.x, 2.3, ARCH.z]} color="#6b7280" />
      <Box
        size={[1.7, 0.9, 0.7]}
        position={[SCANNER.x, 0.45, SCANNER.z]}
        color="#374151"
      />
      <Box
        size={[0.8, 0.55, 0.74]}
        position={[SCANNER.x, 1.17, SCANNER.z]}
        color="#9ca3af"
      />
      <Box
        size={[0.5, 0.12, 0.38]}
        position={[SCANNER.x - 0.55, 0.96, SCANNER.z]}
        color="#1e3a8a"
      />
      <Sign
        position={[SCANNER.x, 1.75, SCANNER.z]}
        className="bg-amber-300 text-[9px] text-amber-950"
      >
        Security: every bag is scanned
      </Sign>
      <Official
        look={{
          skin: 6,
          hair: 'bald',
          hairColor: 0,
          outfit: 'polo',
          top: '#1e3a8a',
          trousers: '#111827',
          sleeves: 'short',
        }}
        x={ARCH.x + 1.25}
        z={ARCH.z + 0.35}
        heading={Math.PI / 2}
      />

      {/* The usher's desk */}
      <Box
        size={[1.9, 1.0, 0.8]}
        position={[USHER_DESK.x, 0.5, USHER_DESK.z]}
        color={WOOD}
      />
      <Box
        size={[2.0, 0.05, 0.9]}
        position={[USHER_DESK.x, 1.03, USHER_DESK.z]}
        color={WOOD_DARK}
      />
      <Box
        size={[0.32, 0.02, 0.42]}
        position={[USHER_DESK.x - 0.3, 1.07, USHER_DESK.z + 0.1]}
        color="#f8fafc"
      />
      <Sign
        position={[USHER_DESK.x, 1.55, USHER_DESK.z + 0.42]}
        className="bg-white text-[9px] text-slate-800"
      >
        Usher · Sign in for your hearing
      </Sign>
      <Official
        look={{
          skin: 2,
          hair: 'ponytail',
          hairColor: 0,
          outfit: 'blazer',
          top: '#111827',
          trousers: '#111827',
          under: '#f8fafc',
        }}
        x={USHER_DESK.x}
        z={USHER_DESK.z - 0.75}
        heading={Math.PI}
      />

      {/* The day's cause list */}
      <Box
        size={[0.04, 1.1, 1.5]}
        position={[CAUSE_LIST.x, 1.5, CAUSE_LIST.z]}
        color="#f8fafc"
      />
      <Sign
        position={[CAUSE_LIST.x - 0.04, 1.75, CAUSE_LIST.z]}
        rotation={-Math.PI / 2}
        className="bg-white text-[8px] text-slate-800"
      >
        Cause list · Court 2 · District Judge Hartley
      </Sign>
      <Sign
        position={[CAUSE_LIST.x - 0.04, 1.45, CAUSE_LIST.z]}
        rotation={-Math.PI / 2}
        className="bg-white text-[8px] font-normal text-slate-700"
      >
        10:30 · Shah v Corner Lettings Ltd · small claim
      </Sign>

      {/* Benches for those waiting */}
      {BENCHES.map((b) => (
        <group key={b.z}>
          <Box size={[2.2, 0.08, 0.5]} position={[b.x, 0.45, b.z]} color={WOOD} />
          <Box
            size={[2.2, 0.5, 0.06]}
            position={[b.x, 0.72, b.z + (b.z > -3 ? -0.25 : 0.25)]}
            color={WOOD_DARK}
          />
        </group>
      ))}

      {/* Court 2 */}
      <Courtroom
        sign="COURT 2 · ALL RISE"
        list="Court 2 · 10:30 · Shah v Corner Lettings"
      />
    </group>
  )
}
