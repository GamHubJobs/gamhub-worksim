/**
 * The fabrication shop, drawn (layout in fabWing.ts): a sealed concrete
 * floor with the yellow-lined walkway, the lathe and its fabricator, steel
 * stock on a rack, the welding bay behind amber screens with its bench and
 * permit board, the inspection bench, a forklift parked in its bay, and the
 * roller shutter to the yard.
 */
import { HI_VIS } from '../../content/scenarios/looks'
import { Box } from './parts'
import { Sign } from './signs'
import {
  FABRICATOR,
  FORKLIFT,
  INSPECTION,
  LATHE,
  PERMIT_BOARD,
  STOCK_RACK,
  WALKWAY,
  WELD_BAY,
  WELD_SCREENS,
} from './fabWing'
import { OUTER_WALLS, WING, WING_DOOR } from './wingShell'
import { WingWorker } from './wingWorker'

const STEEL = '#64748b'

export function FabWing() {
  const depth = WING.z1 - WING.z0
  const midZ = (WING.z0 + WING.z1) / 2
  // The walls and screens, as they stand (the split right-hand wall is drawn with the building).
  const walls = [...OUTER_WALLS, ...WELD_SCREENS]
  return (
    <group>
      {/* Sealed concrete, and the yellow walkway lines */}
      <Box
        size={[WING.x1 - WING.x0, 0.01, depth]}
        position={[(WING.x0 + WING.x1) / 2, 0.012, midZ]}
        color="#a8a29e"
      />
      {[WALKWAY.x0, WALKWAY.x1].map((x) => (
        <Box
          key={x}
          size={[0.08, 0.012, depth]}
          position={[x, 0.02, midZ]}
          color="#facc15"
        />
      ))}
      {walls.map((w, i) => {
        const screen = WELD_SCREENS.includes(w)
        return (
          <Box
            key={i}
            size={[w.hx * 2, w.top, w.hz * 2]}
            position={[w.x, w.top / 2, w.z]}
            color={screen ? '#f59e0b' : '#e7e5e4'}
            opacity={screen ? 0.55 : undefined}
          />
        )
      })}
      <Sign
        position={[11.95, 2.35, (WING_DOOR.z0 + WING_DOOR.z1) / 2]}
        rotation={-Math.PI / 2}
        className="bg-amber-400 text-[10px] text-slate-900"
      >
        Fabrication shop · safety glasses and boots →
      </Sign>

      {/* The lathe: bed, headstock, chuck and guard */}
      <group position={[LATHE.x, 0, LATHE.z]}>
        <Box size={[2.3, 0.75, 0.7]} position={[0, 0.375, 0]} color="#334155" />
        <Box size={[2.2, 0.12, 0.45]} position={[0, 0.8, 0]} color={STEEL} />
        <Box size={[0.55, 0.5, 0.6]} position={[-0.85, 1.1, 0]} color="#1d4ed8" />
        <mesh position={[-0.5, 1.05, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.13, 0.13, 0.12, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.3} />
        </mesh>
        <Box
          size={[0.5, 0.35, 0.04]}
          position={[-0.45, 1.25, 0.3]}
          color="#fde68a"
          opacity={0.6}
        />
      </group>
      <WingWorker
        look={HI_VIS(6, 'short', 0, { glasses: true, hardhat: '#facc15' })}
        x={FABRICATOR.x}
        z={FABRICATOR.z}
        heading={0}
        clip="reach"
      />

      {/* Steel stock on the rack */}
      <group position={[STOCK_RACK.x, 0, STOCK_RACK.z]}>
        {[-2.4, 0, 2.4].map((dz) => (
          <Box key={dz} size={[0.9, 2.2, 0.08]} position={[0, 1.1, dz]} color="#ea580c" />
        ))}
        {[0.5, 1.1, 1.7].map((y) =>
          [-0.2, 0.15].map((dx) => (
            <mesh key={`${y}${dx}`} position={[dx, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 5, 8]} />
              <meshStandardMaterial color="#9ca3af" metalness={0.5} roughness={0.4} />
            </mesh>
          )),
        )}
      </group>

      {/* The welding bay: its bench, a gas bottle, and the permit board outside */}
      <Box size={[2.0, 0.9, 0.9]} position={[20.2, 0.45, -6.2]} color="#1f2937" />
      <mesh position={[21.5, 0.7, -7.4]}>
        <cylinderGeometry args={[0.16, 0.16, 1.4, 14]} />
        <meshStandardMaterial color="#16a34a" />
      </mesh>
      <Sign
        position={[(WELD_BAY.x0 + 22) / 2, 2.25, WELD_BAY.z1 + 0.1]}
        className="bg-amber-500 text-[10px] text-slate-950"
      >
        WELDING BAY · hot work by permit only
      </Sign>
      <Box
        size={[0.8, 0.6, 0.06]}
        position={[PERMIT_BOARD.x, 1.4, PERMIT_BOARD.z - 0.05]}
        color="#f8fafc"
      />
      <Box
        size={[0.06, 1.1, 0.06]}
        position={[PERMIT_BOARD.x, 0.55, PERMIT_BOARD.z - 0.05]}
        color={STEEL}
      />
      <Sign
        position={[PERMIT_BOARD.x, 1.85, PERMIT_BOARD.z]}
        className="bg-white text-[8px] text-slate-800"
      >
        Hot-work permit · fire watch
      </Sign>

      {/* The inspection bench: a granite surface plate and a height gauge */}
      <Box
        size={[1.4, 0.85, 1.0]}
        position={[INSPECTION.x, 0.425, INSPECTION.z]}
        color="#475569"
      />
      <Box
        size={[1.0, 0.12, 0.7]}
        position={[INSPECTION.x, 0.91, INSPECTION.z]}
        color="#1f2937"
      />
      <Box
        size={[0.08, 0.4, 0.08]}
        position={[INSPECTION.x + 0.3, 1.17, INSPECTION.z]}
        color="#cbd5e1"
      />

      {/* A forklift, parked, forks down */}
      <group position={[FORKLIFT.x, 0, FORKLIFT.z]}>
        <Box size={[1.1, 0.9, 1.6]} position={[0, 0.65, 0.2]} color="#f59e0b" />
        <Box
          size={[1.0, 1.1, 0.06]}
          position={[0, 1.6, -0.2]}
          color="#1f2937"
          opacity={0.5}
        />
        <Box size={[0.1, 2.0, 0.1]} position={[-0.4, 1.0, -0.7]} color="#1f2937" />
        <Box size={[0.1, 2.0, 0.1]} position={[0.4, 1.0, -0.7]} color="#1f2937" />
        <Box size={[0.12, 0.05, 0.9]} position={[-0.3, 0.05, -1.1]} color="#1f2937" />
        <Box size={[0.12, 0.05, 0.9]} position={[0.3, 0.05, -1.1]} color="#1f2937" />
      </group>

      {/* The roller shutter to the yard, down */}
      <group position={[WING.x1 - 0.02, 0, -0.2]}>
        <Box size={[0.06, 2.8, 3.4]} position={[0, 1.4, 0]} color="#94a3b8" />
        {[0.4, 0.9, 1.4, 1.9, 2.4].map((y) => (
          <Box key={y} size={[0.07, 0.03, 3.4]} position={[0, y, 0]} color="#64748b" />
        ))}
      </group>
      <Sign
        position={[WING.x1 - 0.08, 3.0, -0.2]}
        rotation={-Math.PI / 2}
        className="bg-slate-800 text-[10px] text-white"
      >
        To the yard
      </Sign>
    </group>
  )
}
