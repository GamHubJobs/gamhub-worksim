/**
 * The records room and conference suite, drawn (layout in lawWing.ts): a
 * carpeted corridor with framed prints, rolling shelving full of files and
 * deed boxes, the scanning station with the records clerk, and the
 * conference room's long table, chairs, water and screen.
 */
import { SMART } from '../../content/scenarios/looks'
import { Box } from './parts'
import { Sign } from './signs'
import {
  CLERK,
  CONF_SCREEN,
  CONF_TABLE,
  LAW_CORRIDOR_WALL,
  LAW_DOORS,
  LAW_SPLIT,
  LAW_WALLS,
  SCANNER,
  SHELVES,
} from './lawWing'
import { WING, WING_DOOR } from './wingShell'
import { WingWorker } from './wingWorker'

const WOOD = '#6b3f22'
const FILES = ['#1e3a8a', '#7f1d1d', '#14532d', '#78350f', '#334155']

export function LawWing() {
  const depth = WING.z1 - WING.z0
  const midZ = (WING.z0 + WING.z1) / 2
  return (
    <group>
      {/* Carpet: the firm's deep red in the corridor, grey in the rooms */}
      <Box
        size={[WING.x1 - WING.x0, 0.01, depth]}
        position={[(WING.x0 + WING.x1) / 2, 0.012, midZ]}
        color="#9ca3af"
      />
      <Box
        size={[LAW_CORRIDOR_WALL - WING.x0, 0.012, depth]}
        position={[(WING.x0 + LAW_CORRIDOR_WALL) / 2, 0.014, midZ]}
        color="#7f1d1d"
      />
      {LAW_WALLS.map((w, i) => (
        <Box
          key={i}
          size={[w.hx * 2, w.top, w.hz * 2]}
          position={[w.x, w.top / 2, w.z]}
          color="#f5f0e6"
        />
      ))}
      {/* Framed prints along the corridor */}
      {[-6.2, 4.4, 7.2].map((z) => (
        <Box
          key={z}
          size={[0.04, 0.6, 0.8]}
          position={[LAW_CORRIDOR_WALL - 0.1, 1.6, z]}
          color="#1f2937"
        />
      ))}
      <Sign
        position={[11.95, 2.35, (WING_DOOR.z0 + WING_DOOR.z1) / 2]}
        rotation={-Math.PI / 2}
        className="bg-indigo-900 text-[10px] text-white"
      >
        Records room · Conference room →
      </Sign>
      <Sign
        position={[
          LAW_CORRIDOR_WALL - 0.1,
          2.3,
          (LAW_DOORS.records.z0 + LAW_DOORS.records.z1) / 2,
        ]}
        rotation={-Math.PI / 2}
        className="bg-indigo-900 text-[10px] text-white"
      >
        RECORDS · staff only
      </Sign>
      <Sign
        position={[
          LAW_CORRIDOR_WALL - 0.1,
          2.3,
          (LAW_DOORS.conference.z0 + LAW_DOORS.conference.z1) / 2,
        ]}
        rotation={-Math.PI / 2}
        className="bg-indigo-900 text-[10px] text-white"
      >
        CONFERENCE ROOM
      </Sign>

      {/* Rolling shelves, full of files and deed boxes */}
      {SHELVES.map((s) => (
        <group key={s.x} position={[s.x, 0, s.z]}>
          <Box size={[0.9, 2.2, 4.0]} position={[0, 1.1, 0]} color="#d6d3d1" />
          {[0.35, 0.85, 1.35, 1.85].map((y, row) =>
            [-1.5, -0.5, 0.5, 1.5].map((dz, i) => (
              <Box
                key={`${y}${dz}`}
                size={[0.95, 0.32, 0.8]}
                position={[0, y, dz]}
                color={row % 2 ? '#e7d8b6' : FILES[(i + row) % FILES.length]}
              />
            )),
          )}
          {/* The wheel that winds them apart */}
          <mesh position={[0, 1.0, 2.05]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.14, 0.02, 8, 18]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
        </group>
      ))}

      {/* The scanning station, and the records clerk at it */}
      <Box
        size={[0.9, 0.95, 0.8]}
        position={[SCANNER.x, 0.475, SCANNER.z]}
        color="#e5e7eb"
      />
      <Box
        size={[0.6, 0.12, 0.45]}
        position={[SCANNER.x, 1.01, SCANNER.z]}
        color="#374151"
      />
      <WingWorker
        look={SMART(2, 'bob', 1, '#0f766e')}
        x={CLERK.x}
        z={CLERK.z}
        heading={-Math.PI / 2}
        clip="type"
      />
      <Sign
        position={[(LAW_CORRIDOR_WALL + WING.x1) / 2, 2.4, LAW_SPLIT - 0.1]}
        rotation={Math.PI}
        className="bg-white text-[9px] text-slate-700"
      >
        Deeds, wills and closed files · signed out and back
      </Sign>

      {/* The conference room: a long table, chairs, water, the screen */}
      <Box
        size={[2.0, 0.06, 4.4]}
        position={[CONF_TABLE.x, 0.76, CONF_TABLE.z]}
        color={WOOD}
      />
      <Box
        size={[1.6, 0.7, 3.8]}
        position={[CONF_TABLE.x, 0.36, CONF_TABLE.z]}
        color="#4a2c17"
      />
      {[-1.6, -0.55, 0.55, 1.6].flatMap((dz) =>
        [-1.35, 1.35].map((dx) => (
          <group key={`${dx}${dz}`} position={[CONF_TABLE.x + dx, 0, CONF_TABLE.z + dz]}>
            <Box size={[0.5, 0.08, 0.5]} position={[0, 0.48, 0]} color="#1f2937" />
            <Box
              size={[0.08, 0.55, 0.5]}
              position={[dx > 0 ? 0.24 : -0.24, 0.8, 0]}
              color="#1f2937"
            />
          </group>
        )),
      )}
      <mesh position={[CONF_TABLE.x, 0.9, CONF_TABLE.z]}>
        <cylinderGeometry args={[0.07, 0.06, 0.24, 14]} />
        <meshStandardMaterial color="#bfdbfe" transparent opacity={0.7} />
      </mesh>
      <Box
        size={[0.05, 1.0, 1.7]}
        position={[CONF_SCREEN.x, 1.55, CONF_SCREEN.z]}
        color="#0f172a"
      />
    </group>
  )
}
