/**
 * The engineering firm's workshop (the engineering career), where the IT
 * corner is in the office: a circuit test bench, a pump locked out for
 * maintenance, a steel test beam on trestles, the CAD station and the safety
 * equipment board. Made from simple shapes, like the rest of the office.
 */
import { Box } from './parts'
import { Sign } from './signs'
import { BEAM_RIG, CAD_DESK, PPE_BOARD, PUMP, TEST_BENCH } from './workshopLayout'

export function Workshop() {
  const b = TEST_BENCH
  return (
    <group>
      {/* Workshop floor (grey resin) and the yellow walkway lines */}
      <Box size={[6.8, 0.01, 9.9]} position={[8.6, 0.012, 4.2]} color="#9ca3af" />
      {[5.45, 9.55].map((x) => (
        <Box
          key={x}
          size={[0.08, 0.012, 9.6]}
          position={[x, 0.02, 4.2]}
          color="#facc15"
        />
      ))}

      {/* Test bench: a steel bench with a power supply, a meter and a board */}
      <Box size={[0.9, 0.06, 2.2]} position={[b.x, 0.92, b.z]} color="#475569" />
      {[-0.95, 0.95].map((dz) => (
        <Box
          key={dz}
          size={[0.8, 0.9, 0.06]}
          position={[b.x, 0.45, b.z + dz]}
          color="#334155"
        />
      ))}
      <Box
        size={[0.35, 0.28, 0.45]}
        position={[b.x + 0.2, 1.09, b.z - 0.6]}
        color="#1f2937"
        emissive="#ef4444"
      />
      <Box size={[0.08, 0.2, 0.14]} position={[b.x - 0.1, 1.05, b.z]} color="#facc15" />
      <Box size={[0.5, 0.02, 0.6]} position={[b.x, 0.96, b.z + 0.5]} color="#15803d" />
      <Sign
        position={[12.0, 1.7, b.z]}
        rotation={-Math.PI / 2}
        className="bg-white text-[10px] text-slate-800"
      >
        Test bench · isolate, lock off, test dead
      </Sign>

      {/* The pump on its skid, locked out for maintenance */}
      <group position={[PUMP.x, 0, PUMP.z]}>
        <Box size={[1.3, 0.12, 0.84]} position={[0, 0.06, 0]} color="#374151" />
        <Box
          size={[0.6, 0.55, 0.55]}
          position={[-0.25, 0.42, 0]}
          color="#2563eb"
          radius={0.05}
        />
        <Box
          size={[0.45, 0.42, 0.42]}
          position={[0.35, 0.35, 0]}
          color="#64748b"
          radius={0.05}
        />
        <Box size={[0.12, 0.18, 0.04]} position={[0.35, 0.6, 0.23]} color="#dc2626" />
      </group>
      <Sign
        position={[PUMP.x, 1.35, PUMP.z]}
        className="bg-red-600 text-[9px] text-white"
      >
        LOCKED OUT · do not operate
      </Sign>

      {/* Steel test beam on two trestles, with a load hanging at mid span */}
      <group position={[BEAM_RIG.x, 0, BEAM_RIG.z]}>
        {[-1.45, 1.45].map((dx) => (
          <Box key={dx} size={[0.1, 0.8, 0.5]} position={[dx, 0.4, 0]} color="#78716c" />
        ))}
        <Box size={[3.3, 0.18, 0.12]} position={[0, 0.89, 0]} color="#b45309" />
        <Box size={[0.03, 0.35, 0.03]} position={[0, 0.63, 0]} color="#1f2937" />
        <Box size={[0.3, 0.25, 0.3]} position={[0, 0.33, 0]} color="#52525b" />
      </group>
      <Sign
        position={[BEAM_RIG.x, 1.4, BEAM_RIG.z]}
        className="bg-white text-[9px] text-slate-800"
      >
        Test beam · span 3 m · load at mid span
      </Sign>

      {/* CAD station: a desk with two screens */}
      <Box
        size={[0.9, 0.05, 1.8]}
        position={[CAD_DESK.x, 0.75, CAD_DESK.z]}
        color="#e5e7eb"
      />
      {[-0.8, 0.8].map((dz) => (
        <Box
          key={dz}
          size={[0.06, 0.73, 0.06]}
          position={[CAD_DESK.x, 0.37, CAD_DESK.z + dz]}
          color="#6b7280"
        />
      ))}
      {[-0.35, 0.35].map((dz) => (
        <Box
          key={dz}
          size={[0.05, 0.38, 0.62]}
          position={[CAD_DESK.x + 0.25, 1.0, CAD_DESK.z + dz]}
          color="#0f172a"
          emissive="#1d4ed8"
        />
      ))}

      {/* Safety equipment board at the entrance: hard hats, glasses, ear defenders */}
      <Box
        size={[1.6, 1.0, 0.05]}
        position={[PPE_BOARD.x, 1.45, PPE_BOARD.z]}
        color="#fef3c7"
      />
      {[-0.5, 0, 0.5].map((dx, i) => (
        <Box
          key={dx}
          size={[0.32, 0.18, 0.18]}
          position={[PPE_BOARD.x + dx, 1.3, PPE_BOARD.z + 0.1]}
          color={['#facc15', '#f8fafc', '#16a34a'][i]}
          radius={0.06}
        />
      ))}
      <Sign
        position={[PPE_BOARD.x, 1.82, PPE_BOARD.z + 0.04]}
        className="bg-blue-700 text-[9px] text-white"
      >
        Safety glasses must be worn beyond this point
      </Sign>
      <Sign
        position={[7.4, 2.45, -0.89]}
        className="bg-amber-500 text-[11px] font-bold tracking-wide text-slate-900"
      >
        WORKSHOP · PERMIT TO WORK
      </Sign>
    </group>
  )
}
