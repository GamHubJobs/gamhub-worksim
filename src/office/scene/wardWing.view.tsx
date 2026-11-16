/**
 * The rest of Ward 4, drawn (layout in wardWing.ts): the doorway from Bay A,
 * the ward corridor with the gloves-and-aprons trolley and a linen trolley,
 * Bay B's four beds with a nurse at work, and the two side rooms, the first
 * marked for isolation. Patients are fictional.
 */
import { Door } from '../../world/doors/Door'
import { Box } from './parts'
import { Sign } from './signs'
import { Bed } from './wardBed'
import { WingWorker } from './wingWorker'
import {
  BAY_B_BEDS,
  BAY_B_NURSE,
  CORRIDOR_WALL,
  DOORS,
  LINEN_TROLLEY,
  PPE_TROLLEY,
  SIDE_BEDS,
  WING,
  WING_BED_X,
  WING_DOOR,
  WING_WALLS,
} from './wardWing'

const WALL = '#eef2f1'

/** The nurse in Bay B, checking a patient's observations. */
function Nurse() {
  return (
    <WingWorker
      look={{
        skin: 3,
        hair: 'bun',
        hairColor: 1,
        outfit: 'scrubs',
        top: '#3b82f6',
        trousers: '#3b82f6',
        sleeves: 'short',
        shoes: '#e5e7eb',
        badge: '#0f766e',
        stethoscope: true,
      }}
      x={BAY_B_NURSE.x}
      z={BAY_B_NURSE.z}
      heading={-Math.PI / 2}
    />
  )
}

export function WardWing() {
  const width = WING.x1 - WING.x0
  const depth = WING.z1 - WING.z0
  return (
    <group>
      {/* Floors: pale vinyl in the rooms, a darker run along the corridor */}
      <Box
        size={[width, 0.01, depth]}
        position={[(WING.x0 + WING.x1) / 2, 0.012, (WING.z0 + WING.z1) / 2]}
        color="#d9e7e4"
      />
      <Box
        size={[CORRIDOR_WALL - WING.x0, 0.012, depth]}
        position={[(WING.x0 + CORRIDOR_WALL) / 2, 0.014, (WING.z0 + WING.z1) / 2]}
        color="#bcd3cd"
      />
      {/* The walls, as they stand */}
      {WING_WALLS.map((w, i) => (
        <Box
          key={i}
          size={[w.hx * 2, w.top, w.hz * 2]}
          position={[w.x, w.top / 2, w.z]}
          color={WALL}
        />
      ))}
      {/* Handrail along the corridor wall */}
      <Box
        size={[0.05, 0.05, depth]}
        position={[CORRIDOR_WALL - 0.12, 0.95, 0.6]}
        color="#0f766e"
      />

      {/* The way through from Bay A */}
      <Sign
        position={[11.95, 2.35, (WING_DOOR.z0 + WING_DOOR.z1) / 2]}
        rotation={-Math.PI / 2}
        className="bg-teal-700 text-[10px] text-white"
      >
        Ward corridor · Bay B · Side rooms →
      </Sign>

      {/* The doors: double doors into the wing, and one into each room off the corridor */}
      <Door
        position={[12, 0, (WING_DOOR.z0 + WING_DOOR.z1) / 2]}
        rotation={-Math.PI / 2}
        kind="double"
        width={WING_DOOR.z1 - WING_DOOR.z0}
        height={2.2}
        leaf="metal"
        colour="#e2e8f0"
        frame="#0f766e"
        sense={1.7}
      />
      {Object.values(DOORS).map((d) => (
        <Door
          key={d.z0}
          position={[CORRIDOR_WALL, 0, (d.z0 + d.z1) / 2]}
          rotation={-Math.PI / 2}
          kind={d.z1 - d.z0 > 1.6 ? 'double' : 'hinged'}
          width={d.z1 - d.z0}
          height={2.15}
          leaf="metal"
          colour="#f1f5f9"
          frame="#0f766e"
          sense={1.5}
        />
      ))}

      {/* Bay B */}
      {BAY_B_BEDS.map((b) => (
        <Bed key={b.id} {...b} x={WING_BED_X} signX={WING.x1 - 0.06} />
      ))}
      <Sign
        position={[CORRIDOR_WALL - 0.1, 2.4, (DOORS.bayB.z0 + DOORS.bayB.z1) / 2]}
        rotation={-Math.PI / 2}
        className="bg-teal-700 text-[11px] font-bold tracking-wide text-white"
      >
        BAY B · BEDS 1–4
      </Sign>
      <Nurse />

      {/* The side rooms */}
      {SIDE_BEDS.map((b) => (
        <Bed key={b.id} {...b} x={WING_BED_X} signX={WING.x1 - 0.06} />
      ))}
      <Sign
        position={[CORRIDOR_WALL - 0.1, 2.4, (DOORS.side1.z0 + DOORS.side1.z1) / 2]}
        rotation={-Math.PI / 2}
        className="bg-amber-300 text-[10px] text-amber-950"
      >
        SIDE ROOM 1 · ISOLATION: gloves and apron
      </Sign>
      <Sign
        position={[CORRIDOR_WALL - 0.1, 2.4, (DOORS.side2.z0 + DOORS.side2.z1) / 2]}
        rotation={-Math.PI / 2}
        className="bg-teal-700 text-[10px] text-white"
      >
        SIDE ROOM 2
      </Sign>

      {/* Gloves and aprons outside the isolation room */}
      <group position={[PPE_TROLLEY.x, 0, PPE_TROLLEY.z]}>
        <Box
          size={[0.7, 0.9, 0.55]}
          position={[0, 0.5, 0]}
          color="#f1f5f9"
          radius={0.03}
        />
        <Box size={[0.22, 0.1, 0.12]} position={[-0.18, 1.0, 0]} color="#bfdbfe" />
        <Box size={[0.22, 0.1, 0.12]} position={[0.08, 1.0, 0]} color="#fecaca" />
        <mesh position={[0.25, 1.02, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.16, 12]} />
          <meshStandardMaterial color="#fde047" />
        </mesh>
      </group>
      {/* A linen trolley, and hand gel on the corridor wall */}
      <group position={[LINEN_TROLLEY.x, 0, LINEN_TROLLEY.z]}>
        <Box size={[0.55, 0.05, 0.95]} position={[0, 0.25, 0]} color="#94a3b8" />
        <Box size={[0.55, 0.05, 0.95]} position={[0, 0.85, 0]} color="#94a3b8" />
        <Box size={[0.5, 0.25, 0.85]} position={[0, 0.98, 0]} color="#f8fafc" />
        <Box size={[0.5, 0.2, 0.85]} position={[0, 0.38, 0]} color="#e0f2fe" />
      </group>
      <Box
        size={[0.1, 0.24, 0.14]}
        position={[CORRIDOR_WALL - 0.13, 1.25, 3.0]}
        color="#e0f2fe"
      />
    </group>
  )
}
