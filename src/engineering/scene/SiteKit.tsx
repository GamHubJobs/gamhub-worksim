/**
 * The construction site's equipment and fixtures, built from simple shapes
 * like the rest of the game's world, and working while their stage is on:
 * the excavator digs and slews, the mixer's drum turns and its chute pours,
 * the crane slews and raises its load, the dumper shuttles. The hoarding,
 * the site cabin with its sign, the stores compound (its stocks running down
 * as they are used), a skip and welfare units.
 */
import { useFrame } from '@react-three/fiber'
import { useRef, type ReactNode } from 'react'
import type { Group, Mesh } from 'three'
import { Sign } from '../../office/scene/signs'
import { prefersReducedMotion } from '../../ui/motion'

const STILL = prefersReducedMotion()

function B({
  size,
  at,
  color,
  metal = 0,
  rough = 0.8,
  rotation,
}: {
  size: [number, number, number]
  at: [number, number, number]
  color: string
  metal?: number
  rough?: number
  rotation?: [number, number, number]
}) {
  return (
    <mesh position={at} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} metalness={metal} roughness={rough} />
    </mesh>
  )
}

function Wheel({
  at,
  r = 0.35,
  w = 0.25,
}: {
  at: [number, number, number]
  r?: number
  w?: number
}) {
  return (
    <mesh position={at} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[r, r, w, 16]} />
      <meshStandardMaterial color="#1f2937" roughness={0.9} />
    </mesh>
  )
}

const YELLOW = '#e9b308'

/** A tracked excavator; `working` swings the boom and curls the bucket, slewing between trench and heap. */
export function Excavator({
  x,
  z,
  heading = 0,
  working,
}: {
  x: number
  z: number
  heading?: number
  working: boolean
}) {
  const slew = useRef<Group>(null)
  const boom = useRef<Group>(null)
  const arm = useRef<Group>(null)
  const bucket = useRef<Group>(null)
  const rod = useRef<Mesh>(null)
  const soil = useRef<Mesh>(null)
  const t = useRef(0)
  useFrame((_, dt) => {
    if (!working || STILL) return
    t.current += dt
    const cycle = (t.current % 8) / 8
    // Dig (boom down, bucket curls), lift and slew to the heap, dump, slew back.
    const dig = Math.sin(cycle * Math.PI * 2)
    if (slew.current)
      slew.current.rotation.y =
        cycle > 0.4 && cycle < 0.9 ? Math.sin(((cycle - 0.4) / 0.5) * Math.PI) * 1.4 : 0
    if (boom.current) boom.current.rotation.z = -0.35 + dig * 0.3
    if (arm.current) arm.current.rotation.z = 0.9 + Math.cos(cycle * Math.PI * 2) * 0.5
    // The bucket: open to dig, curled shut to carry the soil to the heap, open
    // again to dump it. Its ram's rod runs out and back with it.
    const curl =
      cycle < 0.25
        ? cycle / 0.25
        : cycle < 0.7
          ? 1
          : cycle < 0.8
            ? 1 - (cycle - 0.7) / 0.1
            : 0
    if (bucket.current) bucket.current.rotation.z = 0.4 - curl * 1.3
    if (rod.current) rod.current.position.x = 1.0 + curl * 0.18
    // Full of soil from the dig until it is dumped.
    if (soil.current) soil.current.visible = cycle > 0.12 && cycle < 0.75
  })
  return (
    <group position={[x, 0, z]} rotation={[0, heading, 0]}>
      {/* Tracks: the track frame, its rollers and the sprocket and idler at each end */}
      {[-0.85, 0.85].map((s) => (
        <group key={s}>
          <B size={[3, 0.6, 0.5]} at={[0, 0.3, s]} color="#262626" rough={1} />
          {[-1.1, -0.55, 0, 0.55, 1.1].map((rx) => (
            <mesh
              key={rx}
              position={[rx, 0.16, s + Math.sign(s) * 0.26]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.1, 0.1, 0.04, 10]} />
              <meshStandardMaterial color="#525252" metalness={0.5} />
            </mesh>
          ))}
          {[-1.35, 1.35].map((rx) => (
            <mesh
              key={rx}
              position={[rx, 0.32, s + Math.sign(s) * 0.26]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.24, 0.24, 0.05, 14]} />
              <meshStandardMaterial color="#404040" metalness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
      <group ref={slew} position={[0, 0.7, 0]}>
        <B size={[2.4, 1.0, 2.0]} at={[-0.2, 0.5, 0]} color={YELLOW} />
        {/* The cab: its frame, glass on three sides, and the roof */}
        <B size={[1.0, 1.1, 0.9]} at={[0.6, 1.4, 0.45]} color={YELLOW} />
        <B
          size={[0.9, 0.8, 0.02]}
          at={[0.6, 1.5, 0.91]}
          color="#93c5fd"
          metal={0.2}
          rough={0.1}
        />
        <B
          size={[0.02, 0.7, 0.75]}
          at={[1.11, 1.5, 0.45]}
          color="#93c5fd"
          metal={0.2}
          rough={0.1}
        />
        <B size={[1.05, 0.06, 0.95]} at={[0.6, 1.98, 0.45]} color="#3f3f46" />
        {/* The counterweight, the engine cover's grille, and the exhaust */}
        <B size={[0.7, 0.9, 1.9]} at={[-1.2, 0.55, 0]} color="#a16207" />
        {Array.from({ length: 5 }, (_, i) => (
          <B
            key={i}
            size={[0.5, 0.03, 0.02]}
            at={[-0.6, 0.75 - i * 0.1, -1.01]}
            color="#3f3f46"
          />
        ))}
        <mesh position={[-0.5, 1.25, -0.6]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
          <meshStandardMaterial color="#1f2937" metalness={0.6} />
        </mesh>
        <group ref={boom} position={[0.9, 0.9, -0.3]}>
          <B size={[2.6, 0.32, 0.3]} at={[1.3, 0, 0]} color={YELLOW} />
          {/* The boom's hydraulic ram: a barrel and a polished rod */}
          <mesh position={[0.65, -0.28, 0]} rotation={[0, 0, Math.PI / 2 - 0.25]}>
            <cylinderGeometry args={[0.07, 0.07, 0.9, 10]} />
            <meshStandardMaterial color="#3f3f46" metalness={0.4} />
          </mesh>
          <mesh position={[1.25, -0.12, 0]} rotation={[0, 0, Math.PI / 2 - 0.25]}>
            <cylinderGeometry args={[0.035, 0.035, 0.6, 8]} />
            <meshStandardMaterial color="#e5e7eb" metalness={0.9} roughness={0.15} />
          </mesh>
          <group ref={arm} position={[2.6, 0, 0]}>
            <B size={[1.9, 0.26, 0.26]} at={[0.95, 0, 0]} color={YELLOW} />
            {/* The arm's ram, on top */}
            <mesh position={[0.5, 0.22, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.055, 0.055, 0.8, 10]} />
              <meshStandardMaterial color="#3f3f46" metalness={0.4} />
            </mesh>
            <mesh ref={rod} position={[1.05, 0.22, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
              <meshStandardMaterial color="#e5e7eb" metalness={0.9} roughness={0.15} />
            </mesh>
            {/* The bucket on its pin at the end of the arm, with its teeth and,
                while it carries some, the soil */}
            <group ref={bucket} position={[1.85, 0, 0]}>
              <B size={[0.55, 0.45, 0.6]} at={[0.1, -0.15, 0]} color="#3f3f46" />
              {[-0.2, 0, 0.2].map((tz) => (
                <B
                  key={tz}
                  size={[0.12, 0.08, 0.08]}
                  at={[0.4, -0.38, tz]}
                  color="#d4d4d8"
                  metal={0.6}
                />
              ))}
              <mesh ref={soil} position={[0.12, 0.08, 0]} visible={false}>
                <sphereGeometry args={[0.28, 10, 8]} />
                <meshStandardMaterial color="#6b4f2a" roughness={1} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

/** A concrete mixer truck; its drum turns, and `pouring` swings the chute out. */
export function MixerTruck({
  x,
  z,
  heading = 0,
  pouring,
}: {
  x: number
  z: number
  heading?: number
  pouring: boolean
}) {
  const drum = useRef<Group>(null)
  useFrame((_, dt) => {
    if (drum.current && !STILL) drum.current.rotation.x += dt * (pouring ? -1.4 : 0.8)
  })
  return (
    <group position={[x, 0, z]} rotation={[0, heading, 0]}>
      <B size={[6.4, 0.4, 2.2]} at={[0, 0.75, 0]} color="#374151" />
      <B size={[1.8, 1.6, 2.2]} at={[2.6, 1.75, 0]} color="#f8fafc" />
      <B
        size={[0.05, 0.8, 1.9]}
        at={[3.51, 2.0, 0]}
        color="#93c5fd"
        metal={0.2}
        rough={0.1}
      />
      <group ref={drum} position={[-0.7, 2.2, 0]} rotation={[0, 0, Math.PI / 2 - 0.25]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.9, 1.25, 3.6, 18]} />
          <meshStandardMaterial color="#e5e7eb" roughness={0.5} />
        </mesh>
        {[-1, 0, 1].map((k) => (
          <mesh key={k} position={[0, k * 0.9, 0]} rotation={[0, k, 0]}>
            <torusGeometry args={[1.05 - k * 0.1, 0.04, 6, 24]} />
            <meshStandardMaterial color="#ea580c" />
          </mesh>
        ))}
      </group>
      {/* The chute at the back, out to the pour when pouring. */}
      <B
        size={[1.6, 0.12, 0.4]}
        at={[-3.4, 1.3, pouring ? 0.9 : 0]}
        rotation={[0, pouring ? -0.9 : 0, -0.35]}
        color="#9ca3af"
        metal={0.5}
      />
      {[-2.2, -0.8, 2.6].flatMap((wx) =>
        [-1, 1].map((s) => (
          <Wheel key={`${wx}${s}`} at={[wx, 0.45, s * 1.05]} r={0.45} w={0.3} />
        )),
      )}
    </group>
  )
}

/**
 * A mobile crane on outriggers. `lifting` slews the jib and raises and lowers
 * the hook (with its load, a steel beam, a panel, a unit) towards `target`.
 */
export function MobileCrane({
  x,
  z,
  lifting,
  target,
  load,
}: {
  x: number
  z: number
  lifting: boolean
  target: { x: number; z: number; y: number }
  load?: ReactNode
}) {
  const slew = useRef<Group>(null)
  const hook = useRef<Group>(null)
  const t = useRef(0)
  const toTarget = Math.atan2(-(target.z - z), target.x - x)
  const reach = Math.hypot(target.x - x, target.z - z)
  const jib = Math.max(8, reach + 2)
  const angle = Math.acos(Math.min(0.95, reach / jib))
  useFrame((_, dt) => {
    if (!lifting || STILL) return
    t.current += dt
    const c = (t.current % 14) / 14
    // From the stores (behind) round to the work, then down, then back.
    const swing = c < 0.5 ? Math.sin((c / 0.5) * Math.PI) * 0.6 : 0
    if (slew.current) slew.current.rotation.y = toTarget + swing
    if (hook.current)
      hook.current.position.y =
        -2 - (c > 0.45 && c < 0.75 ? Math.sin(((c - 0.45) / 0.3) * Math.PI) * 3 : 0)
  })
  const tipY = Math.sin(angle) * jib
  const tipX = Math.cos(angle) * jib
  return (
    <group position={[x, 0, z]}>
      <B size={[4.5, 1.0, 2.4]} at={[0, 0.9, 0]} color="#dc2626" />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <B
            key={`${sx}${sz}`}
            size={[0.3, 0.9, 0.3]}
            at={[sx * 2.1, 0.45, sz * 1.6]}
            color="#374151"
          />
        )),
      )}
      {[-1.6, 0, 1.6].flatMap((wx) =>
        [-1, 1].map((s) => (
          <Wheel key={`${wx}${s}`} at={[wx, 0.5, s * 1.15]} r={0.5} w={0.35} />
        )),
      )}
      <group ref={slew} position={[0, 1.5, 0]} rotation={[0, toTarget, 0]}>
        <B size={[2.2, 1.2, 2.0]} at={[-0.4, 0.6, 0]} color="#facc15" />
        <B size={[0.9, 1.0, 0.8]} at={[0.6, 0.9, 0.6]} color="#facc15" />
        <group rotation={[0, 0, angle]} position={[0.5, 1.0, -0.3]}>
          <B size={[jib, 0.45, 0.45]} at={[jib / 2, 0, 0]} color="#facc15" metal={0.2} />
        </group>
        <group position={[0.5 + tipX, 1.0 + tipY, -0.3]}>
          <group ref={hook} position={[0, -2, 0]}>
            <mesh position={[0, 1, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 2, 4]} />
              <meshStandardMaterial color="#111827" />
            </mesh>
            <B size={[0.25, 0.35, 0.25]} at={[0, 0, 0]} color="#ef4444" />
            <group position={[0, -0.5, 0]}>{load}</group>
          </group>
        </group>
      </group>
    </group>
  )
}

/** A site dumper; `working` shuttles it between `from` and `to`. */
export function Dumper({
  from,
  to,
  working,
}: {
  from: { x: number; z: number }
  to: { x: number; z: number }
  working: boolean
}) {
  const g = useRef<Group>(null)
  const t = useRef(0)
  useFrame((_, dt) => {
    if (!g.current) return
    if (working && !STILL) t.current += dt
    const c = (t.current % 16) / 16
    const f = c < 0.5 ? c * 2 : 2 - c * 2
    g.current.position.set(from.x + (to.x - from.x) * f, 0, from.z + (to.z - from.z) * f)
    g.current.rotation.y =
      Math.atan2(-(to.z - from.z), to.x - from.x) + (c < 0.5 ? 0 : Math.PI)
  })
  return (
    <group ref={g}>
      <B size={[1.6, 0.5, 1.2]} at={[-0.4, 0.75, 0]} color="#ea580c" />
      <B
        size={[1.2, 0.7, 1.3]}
        at={[0.6, 1.0, 0]}
        color="#f97316"
        rotation={[0, 0, 0.25]}
      />
      <Wheel at={[-0.6, 0.4, 0.62]} r={0.4} />
      <Wheel at={[-0.6, 0.4, -0.62]} r={0.4} />
      <Wheel at={[0.7, 0.4, 0.62]} r={0.4} />
      <Wheel at={[0.7, 0.4, -0.62]} r={0.4} />
    </group>
  )
}

/** A trade van, parked. */
export function Van({
  x,
  z,
  heading = 0,
  color = '#f8fafc',
}: {
  x: number
  z: number
  heading?: number
  color?: string
}) {
  return (
    <group position={[x, 0, z]} rotation={[0, heading, 0]}>
      <B size={[4.8, 1.9, 2.0]} at={[0, 1.35, 0]} color={color} />
      <B
        size={[0.05, 0.75, 1.8]}
        at={[2.41, 1.8, 0]}
        color="#93c5fd"
        metal={0.2}
        rough={0.1}
      />
      <B size={[3, 0.3, 2.02]} at={[-0.5, 1.2, 0]} color="#1d4ed8" />
      {[-1.6, 1.6].flatMap((wx) =>
        [-1, 1].map((s) => <Wheel key={`${wx}${s}`} at={[wx, 0.4, s * 1.0]} r={0.4} />),
      )}
    </group>
  )
}

/** The site cabin (office and welfare), with the project's board. */
export function SiteCabin({
  x,
  z,
  title,
  client,
}: {
  x: number
  z: number
  title: string
  client: string
}) {
  return (
    <group position={[x, 0, z]}>
      <B size={[6, 2.6, 2.6]} at={[0, 1.4, 0]} color="#e2e8f0" />
      <B size={[6.2, 0.15, 2.8]} at={[0, 2.78, 0]} color="#475569" />
      {[-1.8, 0.2, 2.0].map((wx) => (
        <B
          key={wx}
          size={[1.0, 0.8, 0.04]}
          at={[wx, 1.7, 1.31]}
          color="#bfdbfe"
          metal={0.2}
          rough={0.1}
        />
      ))}
      <B size={[0.9, 2.0, 0.05]} at={[-0.8, 1.1, 1.31]} color="#334155" />
      <B size={[1.0, 0.2, 0.6]} at={[-0.8, 0.1, 1.6]} color="#64748b" />
      <Sign position={[0.9, 3.4, 1.32]} className="bg-blue-900 text-[11px] text-white">
        Northbank Engineering Ltd · {title} · for {client}
      </Sign>
      <Sign
        position={[0.9, 2.45, 1.34]}
        className="bg-amber-400 text-[9px] text-slate-950"
      >
        Site office · all visitors sign in · hard hats, boots and hi-vis
      </Sign>
    </group>
  )
}

/** The hoarding round the site, with the gate in the south side. */
export function Hoarding({
  x0,
  x1,
  z0,
  z1,
  gateX,
}: {
  x0: number
  x1: number
  z0: number
  z1: number
  gateX: number
}) {
  const panels: Array<{ at: [number, number, number]; len: number; along: 'x' | 'z' }> =
    []
  const run = (a: number, b: number, fixed: number, along: 'x' | 'z') => {
    for (let v = a; v < b - 0.01; v += 3.5) {
      const len = Math.min(3.5, b - v)
      panels.push({
        at: along === 'x' ? [v + len / 2, 1, fixed] : [fixed, 1, v + len / 2],
        len,
        along,
      })
    }
  }
  run(x0, x1, z0, 'x')
  run(z0, z1, x0, 'z')
  run(z0, z1, x1, 'z')
  run(x0, gateX - 1.5, z1, 'x')
  run(gateX + 1.5, x1, z1, 'x')
  return (
    <group>
      {panels.map((p, i) => (
        <mesh key={i} position={p.at} castShadow receiveShadow>
          <boxGeometry
            args={p.along === 'x' ? [p.len - 0.04, 2, 0.06] : [0.06, 2, p.len - 0.04]}
          />
          <meshStandardMaterial color={i % 2 ? '#1e3a8a' : '#1d4ed8'} roughness={0.7} />
        </mesh>
      ))}
      {[gateX - 1.5, gateX + 1.5].map((gx) => (
        <B key={gx} size={[0.15, 2.4, 0.15]} at={[gx, 1.2, z1]} color="#facc15" />
      ))}
      <Sign
        position={[gateX, 2.6, z1 + 0.05]}
        className="bg-amber-400 text-[11px] font-semibold text-slate-950"
      >
        Site entrance · report to the site office
      </Sign>
    </group>
  )
}

/** The stores compound: pallets of blocks, rebar, steel and pipes; `stock` 0–1 runs down as used. */
export function Stores({
  x,
  z,
  stock,
}: {
  x: number
  z: number
  stock: Record<'blocks' | 'rebar' | 'steel', number>
}) {
  const pallets = Math.round(6 * stock.blocks)
  return (
    <group position={[x, 0, z]}>
      {/* Mesh fence panels. */}
      {[-1, 1].map((s) => (
        <B
          key={s}
          size={[5.2, 1.6, 0.04]}
          at={[0, 0.8, s * 2.1]}
          color="#9ca3af"
          metal={0.6}
          rough={0.4}
        />
      ))}
      <B
        size={[0.04, 1.6, 4.2]}
        at={[2.6, 0.8, 0]}
        color="#9ca3af"
        metal={0.6}
        rough={0.4}
      />
      {Array.from({ length: pallets }, (_, i) => (
        <group
          key={i}
          position={[-1.8 + (i % 3) * 1.15, 0, -1.2 + Math.floor(i / 3) * 1.1]}
        >
          <B size={[1.0, 0.12, 1.0]} at={[0, 0.06, 0]} color="#a16207" />
          <B size={[0.95, 0.6, 0.95]} at={[0, 0.42, 0]} color="#b9b6ae" />
        </group>
      ))}
      {stock.rebar > 0 && (
        <group position={[1.4, 0.15, -1.2]}>
          {Array.from({ length: Math.ceil(8 * stock.rebar) }, (_, i) => (
            <mesh
              key={i}
              position={[0, (i % 3) * 0.05, -0.2 + (i % 4) * 0.08]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.012, 0.012, 3, 5]} />
              <meshStandardMaterial color="#7c2d12" />
            </mesh>
          ))}
        </group>
      )}
      {stock.steel > 0 && (
        <group position={[1.2, 0, 1.0]}>
          {Array.from({ length: Math.ceil(4 * stock.steel) }, (_, i) => (
            <B
              key={i}
              size={[3.2, 0.2, 0.14]}
              at={[0, 0.15 + i * 0.21, 0]}
              color="#3b5b7a"
              metal={0.4}
            />
          ))}
        </group>
      )}
    </group>
  )
}

export function Skip({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <B size={[3.0, 1.0, 1.7]} at={[0, 0.5, 0]} color="#f59e0b" />
      <B size={[2.6, 0.3, 1.3]} at={[0, 0.95, 0]} color="#57534e" />
    </group>
  )
}

export function Welfare({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {[0, 1.3].map((dx) => (
        <group key={dx} position={[dx, 0, 0]}>
          <B size={[1.1, 2.3, 1.2]} at={[0, 1.15, 0]} color="#2563eb" />
          <B size={[1.15, 0.1, 1.25]} at={[0, 2.35, 0]} color="#e2e8f0" />
        </group>
      ))}
    </group>
  )
}

/** A steel beam on the crane's hook. */
export function BeamLoad({ length = 4 }: { length?: number }) {
  return <B size={[length, 0.3, 0.15]} at={[0, -0.15, 0]} color="#3b5b7a" metal={0.4} />
}

/** A bulldozer; `working` pushes it back and forth between `from` and `to`, blade down. */
export function Bulldozer({
  from,
  to,
  working,
}: {
  from: { x: number; z: number }
  to: { x: number; z: number }
  working: boolean
}) {
  const g = useRef<Group>(null)
  const blade = useRef<Group>(null)
  const t = useRef(0)
  useFrame((_, dt) => {
    if (!g.current) return
    if (working && !STILL) t.current += dt
    const c = (t.current % 12) / 12
    const f = c < 0.5 ? c * 2 : 2 - c * 2
    g.current.position.set(from.x + (to.x - from.x) * f, 0, from.z + (to.z - from.z) * f)
    g.current.rotation.y = Math.atan2(-(to.z - from.z), to.x - from.x)
    if (blade.current) blade.current.position.y = c < 0.5 ? 0.35 : 0.6
  })
  return (
    <group ref={g} position={[from.x, 0, from.z]}>
      {[-0.8, 0.8].map((s) => (
        <B key={s} size={[2.8, 0.55, 0.5]} at={[0, 0.28, s]} color="#262626" rough={1} />
      ))}
      <B size={[2.2, 0.9, 1.6]} at={[-0.1, 1.0, 0]} color={YELLOW} />
      <B size={[1.0, 0.9, 1.3]} at={[-0.6, 1.85, 0]} color={YELLOW} />
      <B
        size={[0.02, 0.6, 1.1]}
        at={[-0.09, 1.9, 0]}
        color="#93c5fd"
        metal={0.2}
        rough={0.1}
      />
      <B size={[0.08, 0.6, 0.08]} at={[0.3, 1.8, 0.5]} color="#374151" />
      <group ref={blade} position={[1.7, 0.35, 0]}>
        <B size={[0.15, 0.7, 2.4]} at={[0, 0, 0]} color={YELLOW} />
        <B size={[0.9, 0.1, 0.12]} at={[-0.5, 0.15, 0.7]} color="#374151" />
        <B size={[0.9, 0.1, 0.12]} at={[-0.5, 0.15, -0.7]} color="#374151" />
      </group>
    </group>
  )
}

/** A flatbed lorry with its load (pallets of blocks, bundles of bars, steel), delivering. */
export function Lorry({
  x,
  z,
  heading = 0,
  load,
}: {
  x: number
  z: number
  heading?: number
  load: 'blocks' | 'rebar' | 'steel' | 'roof'
}) {
  return (
    <group position={[x, 0, z]} rotation={[0, heading, 0]}>
      <B size={[7.2, 0.35, 2.3]} at={[-0.6, 1.0, 0]} color="#475569" />
      <B size={[1.9, 2.0, 2.3]} at={[3.4, 1.9, 0]} color="#1d4ed8" />
      <B
        size={[0.05, 0.9, 2.0]}
        at={[4.36, 2.3, 0]}
        color="#93c5fd"
        metal={0.2}
        rough={0.1}
      />
      <B size={[0.1, 1.0, 2.3]} at={[2.4, 1.6, 0]} color="#334155" />
      {[-3.4, -2.2, 3.2].flatMap((wx) =>
        [-1, 1].map((s) => (
          <Wheel key={`${wx}${s}`} at={[wx, 0.5, s * 1.1]} r={0.5} w={0.35} />
        )),
      )}
      {/* The load on the bed */}
      {load === 'blocks' &&
        [-3, -1.8, -0.6, 0.6].flatMap((lx) =>
          [-0.5, 0.5].map((lz) => (
            <group key={`${lx}${lz}`} position={[lx, 1.18, lz]}>
              <B size={[1.0, 0.12, 0.95]} at={[0, 0.06, 0]} color="#a16207" />
              <B size={[0.95, 0.6, 0.9]} at={[0, 0.42, 0]} color="#b9b6ae" />
            </group>
          )),
        )}
      {load === 'rebar' &&
        Array.from({ length: 10 }, (_, i) => (
          <mesh
            key={i}
            position={[-0.6, 1.25 + (i % 3) * 0.06, -0.7 + (i % 5) * 0.32]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.02, 0.02, 6.4, 6]} />
            <meshStandardMaterial color="#7c2d12" />
          </mesh>
        ))}
      {(load === 'steel' || load === 'roof') &&
        Array.from({ length: 5 }, (_, i) => (
          <B
            key={i}
            size={[6.4, load === 'steel' ? 0.3 : 0.08, load === 'steel' ? 0.16 : 2.0]}
            at={[
              -0.6,
              1.33 + i * (load === 'steel' ? 0.31 : 0.09),
              load === 'steel' ? -0.7 + i * 0.35 : 0,
            ]}
            color={load === 'steel' ? '#3b5b7a' : '#4b5563'}
            metal={0.4}
          />
        ))}
    </group>
  )
}

/** The site generator, its exhaust stack and a cable to the cabin. */
export function Generator({ x, z, running }: { x: number; z: number; running: boolean }) {
  const lid = useRef<Group>(null)
  const t = useRef(0)
  useFrame((_, dt) => {
    // A running engine shakes its canopy a little.
    if (!running || STILL || !lid.current) return
    t.current += dt
    lid.current.position.y = Math.sin(t.current * 60) * 0.004
  })
  return (
    <group position={[x, 0, z]}>
      <B size={[2.0, 0.15, 1.0]} at={[0, 0.08, 0]} color="#374151" />
      <group ref={lid}>
        <B size={[1.9, 1.1, 0.95]} at={[0, 0.7, 0]} color="#16a34a" />
        <B size={[0.6, 0.3, 0.02]} at={[0.5, 0.9, 0.48]} color="#0f172a" />
        <B
          size={[0.08, 0.06, 0.02]}
          at={[0.35, 0.95, 0.49]}
          color={running ? '#22c55e' : '#7f1d1d'}
        />
      </group>
      <mesh position={[-0.7, 1.45, 0.2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
        <meshStandardMaterial color="#1f2937" metalness={0.5} />
      </mesh>
    </group>
  )
}
