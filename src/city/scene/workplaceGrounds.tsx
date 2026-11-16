/**
 * What surrounds the workplaces at the end of the street, so they read as
 * working buildings rather than shells:
 *
 * - car parks: asphalt, painted bays, cars parked in some of them, a lamp
 *   column at each end, kerbs, and a footpath to the door;
 * - landscaping: trees and planted beds;
 * - Northbank Engineering's office block, in front of its works: two storeys of
 *   glazing with the design office visible inside (desks, twin screens, a
 *   drawing board, people at work, lights on), an entrance canopy over real
 *   automatic doors, and the company's sign.
 *
 * Built from boxes, instanced where there are many (window panes).
 */
import type { Vector } from '../../content/office'
import { Box } from '../../office/scene/parts'
import { Sign } from '../../office/scene/signs'
import { Door } from '../../world/doors/Door'
import { Car } from './vehicles'

const CAR_COLOURS = ['#1d4ed8', '#e5e7eb', '#b91c1c', '#0f766e', '#334155', '#a16207']

/**
 * A car park: `bays` bays side by side along x, from (x, z), each 2.6 m wide and
 * 5 m deep, the cars nose-in facing +z or -z (`facing`). `taken` says which bays
 * have a car in them.
 */
export function CarPark({
  x,
  z,
  bays,
  facing,
  taken,
  dark,
}: {
  x: number
  z: number
  bays: number
  facing: 1 | -1
  taken: number[]
  dark: boolean
}) {
  const width = bays * 2.6
  return (
    <group>
      {/* The asphalt, and the kerb round it */}
      <Box
        size={[width + 1, 0.02, 6]}
        position={[x + width / 2, 0.012, z]}
        color="#3f3f46"
      />
      <Box
        size={[width + 1.2, 0.12, 0.15]}
        position={[x + width / 2, 0.06, z - facing * 3]}
        color="#a8a29e"
      />
      {/* The white lines between the bays */}
      {Array.from({ length: bays + 1 }, (_, i) => (
        <Box
          key={i}
          size={[0.1, 0.01, 4.6]}
          position={[x + i * 2.6, 0.026, z + facing * 0.4]}
          color="#f5f5f4"
        />
      ))}
      {taken.map((bay, i) => (
        <Car
          key={bay}
          position={[x + 1.3 + bay * 2.6, 0, z + facing * 0.4]}
          rotation={facing > 0 ? Math.PI : 0}
          colour={CAR_COLOURS[(bay + i) % CAR_COLOURS.length]}
        />
      ))}
      {[x - 0.6, x + width + 0.6].map((lx) => (
        <LampColumn key={lx} position={[lx, 0, z - facing * 2.6]} dark={dark} />
      ))}
    </group>
  )
}

/** A lamp column: lit in the evening. */
export function LampColumn({ position, dark }: { position: Vector; dark: boolean }) {
  return (
    <group position={position}>
      <Box size={[0.12, 5, 0.12]} position={[0, 2.5, 0]} color="#52525b" />
      <Box size={[0.9, 0.08, 0.12]} position={[0.4, 5, 0]} color="#52525b" />
      <Box
        size={[0.5, 0.1, 0.25]}
        position={[0.7, 4.94, 0]}
        color={dark ? '#fef3c7' : '#e4e4e7'}
        emissive={dark ? '#fbbf24' : undefined}
      />
    </group>
  )
}

/** A street tree: trunk and a rounded crown. */
export function Tree({ position, scale = 1 }: { position: Vector; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 2.4, 8]} />
        <meshStandardMaterial color="#57534e" roughness={1} />
      </mesh>
      {[
        [0, 3.0, 0, 1.3],
        [0.6, 2.6, 0.3, 0.9],
        [-0.5, 2.7, -0.3, 0.9],
      ].map(([px, py, pz, r]) => (
        <mesh key={`${px}${pz}`} position={[px, py, pz]}>
          <icosahedronGeometry args={[r, 1]} />
          <meshStandardMaterial color="#3f6212" roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  )
}

/** A planted bed with its kerb, `w` × `d`. */
export function Bed({ position, w, d }: { position: Vector; w: number; d: number }) {
  return (
    <group position={position}>
      <Box size={[w, 0.3, d]} position={[0, 0.15, 0]} color="#a8a29e" />
      <Box size={[w - 0.2, 0.06, d - 0.2]} position={[0, 0.32, 0]} color="#4d7c0f" />
      {Array.from({ length: Math.max(1, Math.floor(w / 1.2)) }, (_, i) => (
        <mesh key={i} position={[-w / 2 + 0.6 + i * 1.2, 0.6, 0]}>
          <icosahedronGeometry args={[0.35, 0]} />
          <meshStandardMaterial color="#65a30d" flatShading />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Northbank Engineering's office block, its front facing -z (the street) at
 * `z`, from x0 to x1: two storeys of glazing on a frame, the design office seen
 * inside on both floors, the entrance at `door` under a canopy with the sign.
 */
export function NorthbankOffice({
  x0,
  x1,
  z,
  door,
  dark,
}: {
  x0: number
  x1: number
  z: number
  door: number
  dark: boolean
}) {
  const w = x1 - x0
  const depth = 3.2
  const cx = (x0 + x1) / 2
  const back = z + depth
  const floors = [0, 3.4]
  const bays = Math.floor(w / 1.6)
  const lit = dark ? '#fef3c7' : '#e2e8f0'
  return (
    <group>
      {/* The block: back wall, floors, roof and the ends */}
      <Box size={[w, 7, 0.3]} position={[cx, 3.5, back]} color="#475569" />
      <Box size={[w, 0.25, depth]} position={[cx, 3.4, z + depth / 2]} color="#cbd5e1" />
      <Box
        size={[w + 0.3, 0.4, depth + 0.3]}
        position={[cx, 7, z + depth / 2]}
        color="#334155"
      />
      {[x0, x1].map((ex) => (
        <Box
          key={ex}
          size={[0.3, 7, depth]}
          position={[ex, 3.5, z + depth / 2]}
          color="#475569"
        />
      ))}
      {/* The lit ceiling inside each floor (lights on, more so in the evening) */}
      {floors.map((fy) => (
        <Box
          key={fy}
          size={[w - 0.4, 0.04, depth - 0.4]}
          position={[cx, fy + 3.1, z + depth / 2]}
          color={lit}
          emissive={dark ? '#a16207' : '#64748b'}
        />
      ))}
      {/* Inside, both floors: desks along the glass with twin screens, chairs,
          an engineer at every other desk, and a drawing board at each end */}
      {floors.map((fy) =>
        Array.from({ length: bays }, (_, i) => {
          const dx = x0 + 0.8 + i * 1.6
          if (fy === 0 && Math.abs(dx - door) < 1.6) return null
          return (
            <group key={`${fy}-${i}`} position={[dx, fy, z + 1.4]}>
              <Box size={[1.3, 0.05, 0.7]} position={[0, 0.74, 0]} color="#d6c3a3" />
              <Box size={[0.05, 0.72, 0.6]} position={[-0.6, 0.37, 0]} color="#71717a" />
              <Box size={[0.05, 0.72, 0.6]} position={[0.6, 0.37, 0]} color="#71717a" />
              {[-0.28, 0.28].map((sx) => (
                <Box
                  key={sx}
                  size={[0.5, 0.32, 0.03]}
                  position={[sx, 1.05, 0.25]}
                  color="#0f172a"
                  emissive={i % 3 === 0 ? '#1e3a8a' : '#334155'}
                />
              ))}
              <Box size={[0.5, 0.08, 0.5]} position={[0, 0.48, -0.55]} color="#1f2937" />
              {i % 2 === 0 && (
                <group position={[0, 0, -0.55]}>
                  <Box
                    size={[0.42, 0.55, 0.26]}
                    position={[0, 0.85, 0]}
                    color="#1e3a8a"
                  />
                  <mesh position={[0, 1.27, 0]}>
                    <sphereGeometry args={[0.13, 10, 8]} />
                    <meshStandardMaterial color="#a16207" />
                  </mesh>
                </group>
              )}
            </group>
          )
        }),
      )}
      {floors.map((fy) => (
        <group
          key={`board-${fy}`}
          position={[x1 - 0.8, fy, z + 2.3]}
          rotation={[0, 0, 0]}
        >
          <Box
            size={[1.2, 0.04, 0.9]}
            position={[0, 1.0, 0]}
            rotation={0}
            color="#f8fafc"
          />
          <Box size={[0.06, 1.0, 0.06]} position={[0, 0.5, 0]} color="#52525b" />
        </group>
      ))}
      {/* The glazing: mullions and transoms on the front, the glass itself */}
      {Array.from({ length: bays + 1 }, (_, i) => (
        <Box
          key={i}
          size={[0.08, 7, 0.1]}
          position={[x0 + i * (w / bays), 3.5, z]}
          color="#1f2937"
        />
      ))}
      {[0.15, 3.4, 6.85].map((y) => (
        <Box key={y} size={[w, 0.18, 0.12]} position={[cx, y, z]} color="#1f2937" />
      ))}
      <Box
        size={[w, 7, 0.03]}
        position={[cx, 3.5, z - 0.02]}
        color="#bae6fd"
        opacity={0.22}
      />
      {/* The entrance: a canopy, automatic doors, the sign over them */}
      <Box size={[3.6, 0.2, 2.4]} position={[door, 2.9, z - 1.2]} color="#ea580c" />
      {[-1.6, 1.6].map((dx) => (
        <Box
          key={dx}
          size={[0.12, 2.9, 0.12]}
          position={[door + dx, 1.45, z - 2.3]}
          color="#52525b"
        />
      ))}
      <Door
        position={[door, 0, z - 0.05]}
        rotation={Math.PI}
        kind="automatic"
        width={2.0}
        height={2.4}
        leaf="glass"
        frame="#1f2937"
        sense={2.4}
      />
      <Sign
        position={[door, 3.25, z - 2.42]}
        rotation={Math.PI}
        className="bg-orange-600 text-[15px] font-bold tracking-wide text-white"
      >
        NORTHBANK ENGINEERING · Reception
      </Sign>
    </group>
  )
}
