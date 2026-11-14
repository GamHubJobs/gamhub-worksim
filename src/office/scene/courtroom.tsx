/**
 * The law firm's moot courtroom (the law career), where the IT corner is in
 * the office: laid out like a courtroom of the fictional Westmark County
 * Court. The judge's raised bench under the court's crest, the witness box,
 * counsel's tables facing the bench and the public seats. Made from simple
 * shapes, like the rest of the office.
 */
import { Box } from './parts'
import { Sign as Label } from './signs'
import {
  BENCH,
  COUNSEL_TABLES,
  COURT_LIST,
  GALLERY,
  WITNESS_BOX,
} from './courtroomLayout'

const WOOD = '#7c4a24'
const WOOD_DARK = '#5b3417'

export function Courtroom() {
  return (
    <group>
      {/* Carpet (court green) and the raised dais for the bench */}
      <Box size={[6.8, 0.01, 9.9]} position={[8.6, 0.012, 4.2]} color="#3f6b52" />
      <Box
        size={[1.6, 0.25, 4.0]}
        position={[BENCH.x, 0.125, BENCH.z]}
        color={WOOD_DARK}
      />

      {/* The judge's bench, the chair behind it and the crest above */}
      <Box
        size={[0.3, 1.05, 3.4]}
        position={[BENCH.x - 0.45, 0.78, BENCH.z]}
        color={WOOD}
      />
      <Box
        size={[0.75, 0.06, 3.4]}
        position={[BENCH.x - 0.25, 1.3, BENCH.z]}
        color={WOOD_DARK}
      />
      {/* The judge's chair: a seat and a tall back (the judge sits in it during a hearing) */}
      <Box
        size={[0.5, 0.1, 0.6]}
        position={[BENCH.x + 0.4, 0.68, BENCH.z]}
        color="#7f1d1d"
        radius={0.03}
      />
      <Box
        size={[0.1, 1.2, 0.6]}
        position={[BENCH.x + 0.68, 1.2, BENCH.z]}
        color="#7f1d1d"
        radius={0.04}
      />
      <mesh position={[12.0, 2.15, BENCH.z]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.32, 0.32, 0.05, 24]} />
        <meshStandardMaterial color="#ca8a04" roughness={0.5} />
      </mesh>
      <Label
        position={[11.95, 2.65, BENCH.z]}
        rotation={-Math.PI / 2}
        className="bg-white text-[10px] text-slate-800"
      >
        Westmark County Court (fictional)
      </Label>

      {/* The witness box, with its rail */}
      <Box
        size={[0.9, 0.95, 0.06]}
        position={[WITNESS_BOX.x, 0.48, WITNESS_BOX.z - 0.42]}
        color={WOOD}
      />
      <Box
        size={[0.06, 0.95, 0.9]}
        position={[WITNESS_BOX.x - 0.42, 0.48, WITNESS_BOX.z]}
        color={WOOD}
      />
      <Box
        size={[0.9, 0.95, 0.06]}
        position={[WITNESS_BOX.x, 0.48, WITNESS_BOX.z + 0.42]}
        color={WOOD}
      />
      <Box
        size={[0.95, 0.05, 0.95]}
        position={[WITNESS_BOX.x, 1.0, WITNESS_BOX.z]}
        color={WOOD_DARK}
      />
      <Label
        position={[WITNESS_BOX.x, 1.45, WITNESS_BOX.z]}
        className="bg-white text-[9px] text-slate-800"
      >
        Witness box
      </Label>

      {/* Counsel's tables, facing the bench, with the bundles on them */}
      {COUNSEL_TABLES.map((t) => (
        <group key={t.side}>
          <Box size={[0.8, 0.05, 1.8]} position={[t.x, 0.76, t.z]} color={WOOD} />
          <Box
            size={[0.06, 0.74, 1.7]}
            position={[t.x + 0.36, 0.37, t.z]}
            color={WOOD_DARK}
          />
          <Box
            size={[0.3, 0.12, 0.4]}
            position={[t.x, 0.84, t.z - 0.4]}
            color="#1e3a8a"
          />
          <Box
            size={[0.25, 0.02, 0.32]}
            position={[t.x - 0.1, 0.8, t.z + 0.35]}
            color="#f8fafc"
          />
          <Label
            position={[t.x, 1.25, t.z]}
            className="bg-slate-800 text-[9px] text-white"
          >
            {t.side}
          </Label>
        </group>
      ))}

      {/* The public seats */}
      {GALLERY.map((g) => (
        <group key={g.z}>
          <Box size={[0.5, 0.08, 2.2]} position={[g.x, 0.45, g.z]} color={WOOD} />
          <Box
            size={[0.06, 0.55, 2.2]}
            position={[g.x - 0.25, 0.72, g.z]}
            color={WOOD_DARK}
          />
        </group>
      ))}

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
        Court list · 2 pm · Brightwater v Millstone
      </Label>
      <Label
        position={[9.4, 2.45, -0.89]}
        className="bg-indigo-900 text-[11px] font-bold tracking-wide text-white"
      >
        MOOT COURTROOM · ALL RISE
      </Label>
    </group>
  )
}
