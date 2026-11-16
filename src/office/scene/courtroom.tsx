/**
 * A courtroom (the law firm's moot court, and Court 2 at Westmark County
 * Court), laid out like a real one of the fictional Westmark County Court:
 *
 * - oak panelling behind the bench, with framed panels and a dado rail, and
 *   the court's crest (a quartered shield under a crown) above;
 * - the judge's raised, panelled bench: a high-backed buttoned chair, a
 *   reading lamp, microphones, the judge's notebook and laptop;
 * - the clerk's desk beside it: a screen, the recording unit with its red
 *   light, and the court file;
 * - the witness box, up a step, with its rail, microphone and water;
 * - counsel's tables facing the bench: lecterns, lever-arch bundles, a
 *   laptop, a microphone and water;
 * - the exhibit screen, on which evidence is shown to the court;
 * - the public benches, and a clock.
 *
 * Built from simple shapes, like the rest of the game; the furniture stands
 * where courtroomLayout.ts says, so the people and the walking are unchanged.
 */
import { Box } from './parts'
import { Sign as Label } from './signs'
import {
  BENCH,
  CLERK,
  COUNSEL_TABLES,
  COURT_LIST,
  GALLERY,
  WITNESS_BOX,
} from './courtroomLayout'

const WOOD = '#7c4a24'
const WOOD_DARK = '#5b3417'
const WOOD_LIGHT = '#9a6a3c'
const LEATHER = '#5f1414'
const BRASS = '#b8860b'

/** Framed panels on a wall facing -x at x, from z0 to z1, up to the dado rail. */
function Panelling({
  x,
  z0,
  z1,
  top = 2.3,
}: {
  x: number
  z0: number
  z1: number
  top?: number
}) {
  const n = Math.max(1, Math.round((z1 - z0) / 0.9))
  const w = (z1 - z0) / n
  return (
    <group>
      <Box
        size={[0.04, top, z1 - z0]}
        position={[x, top / 2, (z0 + z1) / 2]}
        color={WOOD}
      />
      {Array.from({ length: n }, (_, i) => {
        const z = z0 + w * (i + 0.5)
        return (
          <group key={i}>
            {/* Each panel: a raised field inside its frame */}
            <Box
              size={[0.03, top * 0.38, w - 0.18]}
              position={[x - 0.03, top * 0.72, z]}
              color={WOOD_LIGHT}
            />
            <Box
              size={[0.03, top * 0.3, w - 0.18]}
              position={[x - 0.03, top * 0.26, z]}
              color={WOOD_LIGHT}
            />
          </group>
        )
      })}
      {/* The dado rail and the skirting */}
      <Box
        size={[0.08, 0.07, z1 - z0]}
        position={[x - 0.04, top * 0.48, (z0 + z1) / 2]}
        color={WOOD_DARK}
      />
      <Box
        size={[0.08, 0.06, z1 - z0]}
        position={[x - 0.04, top, (z0 + z1) / 2]}
        color={WOOD_DARK}
      />
      <Box
        size={[0.06, 0.14, z1 - z0]}
        position={[x - 0.03, 0.07, (z0 + z1) / 2]}
        color={WOOD_DARK}
      />
    </group>
  )
}

/** A microphone on a short stand, facing -x. */
function Microphone({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group position={[x, y, z]}>
      <Box size={[0.08, 0.02, 0.08]} position={[0, 0.01, 0]} color="#111827" />
      <mesh position={[-0.04, 0.12, 0]} rotation={[0, 0, 0.5]}>
        <cylinderGeometry args={[0.005, 0.005, 0.22, 6]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[-0.1, 0.22, 0]}>
        <sphereGeometry args={[0.02, 8, 6]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
    </group>
  )
}

/** A water jug and a glass. */
function Water({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.045, 0.055, 0.2, 12]} />
        <meshStandardMaterial color="#dbeafe" transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, 0.04, 0.12]}>
        <cylinderGeometry args={[0.03, 0.026, 0.09, 10]} />
        <meshStandardMaterial color="#e0f2fe" transparent opacity={0.6} />
      </mesh>
    </group>
  )
}

/** Lever-arch files standing in a row: the trial bundles. */
function Bundles({ x, y, z, n = 4 }: { x: number; y: number; z: number; n?: number }) {
  const colours = ['#1e3a8a', '#7f1d1d', '#14532d', '#1e3a8a', '#713f12']
  return (
    <group position={[x, y, z]}>
      {Array.from({ length: n }, (_, i) => (
        <group key={i} position={[0, 0.16, -0.18 + i * 0.085]}>
          <Box
            size={[0.28, 0.32, 0.075]}
            position={[0, 0, 0]}
            color={colours[i % colours.length]}
          />
          <Box size={[0.02, 0.12, 0.05]} position={[-0.141, 0.06, 0]} color="#f8fafc" />
        </group>
      ))}
    </group>
  )
}

/** A laptop, open, facing -x (its user to the -x side). */
function Laptop({
  x,
  y,
  z,
  glow = '#93c5fd',
}: {
  x: number
  y: number
  z: number
  glow?: string
}) {
  return (
    <group position={[x, y, z]}>
      <Box size={[0.24, 0.015, 0.32]} position={[0, 0.008, 0]} color="#334155" />
      <group position={[0.11, 0.0, 0]} rotation={[0, 0, 0.25]}>
        <Box size={[0.015, 0.22, 0.32]} position={[0, 0.11, 0]} color="#334155" />
        <Box
          size={[0.004, 0.19, 0.29]}
          position={[-0.009, 0.11, 0]}
          color="#0f172a"
          emissive={glow}
        />
      </group>
    </group>
  )
}

/** The court's crest: a shield of four quarters under a crown, on the wall facing -x. */
function Crest({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group position={[x, y, z]}>
      {/* The shield's quarters, and its point */}
      <Box size={[0.05, 0.28, 0.24]} position={[0, 0.14, -0.12]} color="#b91c1c" />
      <Box size={[0.05, 0.28, 0.24]} position={[0, 0.14, 0.12]} color="#1e3a8a" />
      <Box size={[0.05, 0.28, 0.24]} position={[0, -0.14, -0.12]} color="#1e3a8a" />
      <Box size={[0.05, 0.28, 0.24]} position={[0, -0.14, 0.12]} color="#b91c1c" />
      <mesh position={[0, -0.34, 0]} rotation={[Math.PI / 4, 0, 0]}>
        <boxGeometry args={[0.05, 0.24, 0.24]} />
        <meshStandardMaterial color="#b91c1c" />
      </mesh>
      {/* The gold border and the crown above */}
      <Box size={[0.06, 0.6, 0.03]} position={[-0.005, 0, -0.255]} color={BRASS} />
      <Box size={[0.06, 0.6, 0.03]} position={[-0.005, 0, 0.255]} color={BRASS} />
      <Box size={[0.06, 0.03, 0.54]} position={[-0.005, 0.29, 0]} color={BRASS} />
      <Box size={[0.06, 0.12, 0.36]} position={[0, 0.42, 0]} color={BRASS} />
      {[-0.14, 0, 0.14].map((dz) => (
        <mesh key={dz} position={[0, 0.53, dz]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
    </group>
  )
}

export function Courtroom({
  sign = 'MOOT COURTROOM · ALL RISE',
  list = 'Court list · 2 pm · Brightwater v Millstone',
}: {
  /** Over the doors, inside (the firm's moot courtroom by default). */
  sign?: string
  /** Today's court list by the door. */
  list?: string
} = {}) {
  const bx = BENCH.x
  const bz = BENCH.z
  return (
    <group>
      {/* Carpet (court green) and the raised dais for the bench */}
      <Box size={[6.8, 0.01, 9.9]} position={[8.6, 0.012, 4.2]} color="#3f6b52" />
      <Box size={[1.6, 0.25, 4.0]} position={[bx, 0.125, bz]} color={WOOD_DARK} />
      <Box size={[0.25, 0.12, 4.0]} position={[bx - 0.9, 0.06, bz]} color={WOOD_DARK} />

      {/* Oak panelling behind the bench, the crest and the court's name above */}
      <Panelling x={12.0} z0={1.2} z1={8.2} top={2.6} />
      <Crest x={11.95} y={3.05} z={bz} />
      <Label
        position={[11.93, 3.62, bz]}
        rotation={-Math.PI / 2}
        className="bg-white text-[10px] text-slate-800"
      >
        Westmark County Court (fictional)
      </Label>

      {/* The judge's bench: a panelled front, the desk, and what is on it */}
      <Box size={[0.3, 1.05, 3.4]} position={[bx - 0.45, 0.78, bz]} color={WOOD} />
      {Array.from({ length: 4 }, (_, i) => (
        <Box
          key={i}
          size={[0.03, 0.62, 0.7]}
          position={[bx - 0.615, 0.8, bz - 1.275 + i * 0.85]}
          color={WOOD_LIGHT}
        />
      ))}
      <Box size={[0.75, 0.06, 3.4]} position={[bx - 0.25, 1.3, bz]} color={WOOD_DARK} />
      <Box size={[0.05, 0.08, 3.42]} position={[bx - 0.63, 1.36, bz]} color={WOOD_DARK} />
      <Laptop x={bx - 0.2} y={1.33} z={bz - 0.55} />
      <Box
        size={[0.22, 0.02, 0.3]}
        position={[bx - 0.3, 1.34, bz + 0.35]}
        color="#f8fafc"
      />
      <Microphone x={bx - 0.4} y={1.33} z={bz + 0.05} />
      {/* The reading lamp: a brass stem and a green shade */}
      <group position={[bx - 0.15, 1.33, bz + 1.1]}>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.36, 6]} />
          <meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.35} />
        </mesh>
        <Box
          size={[0.12, 0.08, 0.26]}
          position={[-0.05, 0.38, 0]}
          color="#14532d"
          emissive="#713f12"
        />
      </group>
      {/* The judge's chair: buttoned leather, a high back and arms */}
      <Box
        size={[0.52, 0.12, 0.62]}
        position={[bx + 0.4, 0.68, bz]}
        color={LEATHER}
        radius={0.04}
      />
      <Box
        size={[0.12, 1.35, 0.62]}
        position={[bx + 0.68, 1.28, bz]}
        color={LEATHER}
        radius={0.05}
      />
      {[-0.32, 0.32].map((dz) => (
        <Box
          key={dz}
          size={[0.5, 0.1, 0.08]}
          position={[bx + 0.42, 0.93, bz + dz]}
          color={LEATHER}
          radius={0.03}
        />
      ))}
      {[0.85, 1.15, 1.45, 1.75].flatMap((y) =>
        [-0.15, 0.15].map((dz) => (
          <mesh key={`${y}${dz}`} position={[bx + 0.615, y, bz + dz]}>
            <sphereGeometry args={[0.012, 6, 4]} />
            <meshStandardMaterial color="#3b0a0a" />
          </mesh>
        )),
      )}

      {/* The clerk's desk beside the bench: a screen, the recording unit, the court file */}
      <group position={[CLERK.x, 0, CLERK.z]}>
        <Box size={[0.7, 0.05, 1.1]} position={[0, 0.76, 0]} color={WOOD} />
        <Box size={[0.05, 0.74, 1.05]} position={[-0.33, 0.37, 0]} color={WOOD_DARK} />
        <Box size={[0.04, 0.3, 0.45]} position={[0.15, 1.0, -0.15]} color="#111827" />
        <Box
          size={[0.005, 0.26, 0.41]}
          position={[0.125, 1.0, -0.15]}
          color="#0f172a"
          emissive="#1e40af"
        />
        <Box size={[0.2, 0.06, 0.28]} position={[0, 0.82, 0.32]} color="#1f2937" />
        <Box
          size={[0.03, 0.02, 0.03]}
          position={[-0.09, 0.85, 0.42]}
          color="#dc2626"
          emissive="#dc2626"
        />
        <Box size={[0.24, 0.05, 0.32]} position={[-0.1, 0.81, -0.02]} color="#a16207" />
      </group>

      {/* The witness box, up a step, with its rail, microphone and water */}
      <Box
        size={[0.95, 0.15, 0.95]}
        position={[WITNESS_BOX.x, 0.075, WITNESS_BOX.z]}
        color={WOOD_DARK}
      />
      {[
        { size: [0.9, 0.95, 0.06], pos: [0, 0.55, -0.42] },
        { size: [0.06, 0.95, 0.9], pos: [-0.42, 0.55, 0] },
        { size: [0.9, 0.95, 0.06], pos: [0, 0.55, 0.42] },
      ].map((p, i) => (
        <Box
          key={i}
          size={p.size as [number, number, number]}
          position={[WITNESS_BOX.x + p.pos[0], p.pos[1], WITNESS_BOX.z + p.pos[2]]}
          color={WOOD}
        />
      ))}
      <Box
        size={[0.03, 0.5, 0.6]}
        position={[WITNESS_BOX.x - 0.46, 0.55, WITNESS_BOX.z]}
        color={WOOD_LIGHT}
      />
      <Box
        size={[0.95, 0.05, 0.95]}
        position={[WITNESS_BOX.x, 1.06, WITNESS_BOX.z]}
        color={WOOD_DARK}
      />
      <Microphone x={WITNESS_BOX.x - 0.3} y={1.08} z={WITNESS_BOX.z - 0.2} />
      <Water x={WITNESS_BOX.x - 0.3} y={1.08} z={WITNESS_BOX.z + 0.22} />
      <Label
        position={[WITNESS_BOX.x, 1.55, WITNESS_BOX.z]}
        className="bg-white text-[9px] text-slate-800"
      >
        Witness box
      </Label>

      {/* The exhibit screen, where evidence is shown to the court */}
      <group position={[WITNESS_BOX.x - 0.2, 0, WITNESS_BOX.z - 1.4]}>
        <Box size={[0.4, 0.04, 0.4]} position={[0, 0.02, 0]} color="#1f2937" />
        <mesh position={[0, 0.75, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 1.5, 8]} />
          <meshStandardMaterial color="#334155" metalness={0.5} />
        </mesh>
        <Box size={[0.06, 0.55, 0.9]} position={[0, 1.55, 0]} color="#111827" />
        <Box
          size={[0.005, 0.5, 0.84]}
          position={[-0.033, 1.55, 0]}
          color="#e5e7eb"
          emissive="#475569"
        />
        <Label
          position={[-0.05, 1.55, 0]}
          rotation={Math.PI / 2}
          className="bg-white text-[8px] text-slate-700"
        >
          Exhibit
        </Label>
      </group>

      {/* Counsel's tables, facing the bench: a lectern, the bundles, a laptop, a microphone, water */}
      {COUNSEL_TABLES.map((t) => (
        <group key={t.side}>
          <Box size={[0.8, 0.05, 1.8]} position={[t.x, 0.76, t.z]} color={WOOD} />
          <Box
            size={[0.06, 0.74, 1.7]}
            position={[t.x + 0.36, 0.37, t.z]}
            color={WOOD_DARK}
          />
          {[-0.82, 0.82].map((dz) => (
            <Box
              key={dz}
              size={[0.7, 0.74, 0.05]}
              position={[t.x, 0.37, t.z + dz]}
              color={WOOD_DARK}
            />
          ))}
          {/* A table lectern, sloped towards counsel */}
          <group position={[t.x + 0.1, 0.79, t.z + 0.05]} rotation={[0, 0, -0.35]}>
            <Box size={[0.3, 0.03, 0.42]} position={[0, 0.1, 0]} color={WOOD_LIGHT} />
            <Box size={[0.03, 0.18, 0.4]} position={[0.13, 0.03, 0]} color={WOOD_DARK} />
          </group>
          <Bundles x={t.x + 0.18} y={0.79} z={t.z - 0.55} />
          <Laptop x={t.x - 0.12} y={0.79} z={t.z + 0.55} />
          <Microphone x={t.x + 0.25} y={0.79} z={t.z + 0.35} />
          <Water x={t.x + 0.22} y={0.79} z={t.z + 0.75} />
          <Box
            size={[0.25, 0.02, 0.32]}
            position={[t.x - 0.15, 0.8, t.z - 0.05]}
            color="#f8fafc"
          />
          <Label
            position={[t.x, 1.3, t.z]}
            className="bg-slate-800 text-[9px] text-white"
          >
            {t.side}
          </Label>
        </group>
      ))}

      {/* The public benches, with backs and ends */}
      {GALLERY.map((g) => (
        <group key={g.z}>
          <Box size={[0.5, 0.08, 2.2]} position={[g.x, 0.45, g.z]} color={WOOD} />
          <Box
            size={[0.06, 0.55, 2.2]}
            position={[g.x - 0.25, 0.72, g.z]}
            color={WOOD_DARK}
          />
          {[-1.1, 1.1].map((dz) => (
            <Box
              key={dz}
              size={[0.55, 0.75, 0.06]}
              position={[g.x - 0.02, 0.38, g.z + dz]}
              color={WOOD_DARK}
            />
          ))}
        </group>
      ))}

      {/* The clock, on the wall facing the bench */}
      <group position={[5.25, 2.7, bz]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.24, 0.24, 0.05, 24]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[-0.005, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.24, 0.02, 6, 24]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
        <Box size={[0.01, 0.16, 0.015]} position={[0.03, 0.06, 0]} color="#111827" />
        <Box size={[0.01, 0.015, 0.12]} position={[0.03, 0, 0.05]} color="#111827" />
      </group>

      {/* Today's court list, on the wall by the door */}
      <Box
        size={[0.7, 0.9, 0.03]}
        position={[COURT_LIST.x, 1.5, COURT_LIST.z]}
        color="#f8fafc"
      />
      <Label
        position={[COURT_LIST.x, 1.5, COURT_LIST.z + 0.03]}
        className="bg-white text-[8px] text-slate-800"
      >
        {list}
      </Label>
      <Label
        position={[9.4, 2.45, -0.89]}
        className="bg-indigo-900 text-[11px] font-bold tracking-wide text-white"
      >
        {sign}
      </Label>
    </group>
  )
}
