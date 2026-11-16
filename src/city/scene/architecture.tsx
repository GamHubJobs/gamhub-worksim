/**
 * The workplaces at the end of the street, each built for what it is:
 *
 * - an office tower: a glass curtain wall divided by mullions and floor
 *   bands, a recessed double-height lobby with a canopy, a crown of plant
 *   screens on the roof, and windows lit floor by floor in the evening;
 * - Riverside Community Hospital: a white clinical block with a teal band,
 *   rows of windows, the entrance canopy, the ambulance bay with its
 *   ambulance, and the red cross sign;
 * - Northbank Engineering's works: a portal-frame shed with a saw-tooth
 *   roof of north lights, roller doors, a yard with steel stock, and the sign.
 *
 * Built from boxes and instanced meshes (one draw call per kind of part).
 */
import { useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Color, InstancedMesh, Matrix4, MeshStandardMaterial } from 'three'
import { Box } from '../../office/scene/parts'
import { Sign } from '../../office/scene/signs'
import { Door } from '../../world/doors/Door'

/** A grid of identical boxes (panes, mullions), drawn as one instanced mesh. */
function Grid({
  points,
  size,
  color,
  lit,
  dark,
  metal = 0,
  rough = 0.6,
}: {
  points: Array<[number, number, number]>
  size: [number, number, number]
  color: string
  /** In the evening, these (by index) glow. */
  lit?: (i: number) => boolean
  dark?: boolean
  metal?: number
  rough?: number
}) {
  const ref = useRef<InstancedMesh>(null)
  // By the numbers, not the array (a new array each render would rebuild the
  // mesh, and the rebuilt one would have none of its instances placed).
  const [sx, sy, sz] = size
  const geometry = useMemo(() => new BoxGeometry(sx, sy, sz), [sx, sy, sz])
  // With colours per pane, those are the colour (the material's would tint them twice).
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: lit ? '#ffffff' : color,
        metalness: metal,
        roughness: rough,
      }),
    [color, lit, metal, rough],
  )
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new Matrix4()
    const on = new Color('#fde68a')
    const off = new Color(color)
    points.forEach(([x, y, z], i) => {
      m.makeTranslation(x, y, z)
      mesh.setMatrixAt(i, m)
      if (lit) mesh.setColorAt(i, dark && lit(i) ? on : off)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [points, color, lit, dark, geometry, material])
  useLayoutEffect(() => {
    material.emissive.set(dark && lit ? '#2a1c03' : '#000000')
  }, [dark, lit, material])
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, points.length]}
      castShadow
      receiveShadow
    />
  )
}

/** An office tower facing -x (towards the street), centred at (x, z). */
export function OfficeTower({
  x,
  z,
  w,
  d,
  h,
  tint,
  dark,
}: {
  x: number
  z: number
  w: number
  d: number
  h: number
  tint: string
  dark: boolean
}) {
  const floor = 3.6
  const floors = Math.floor((h - 6) / floor)
  const face = x - w / 2
  // Glass on all four faces: one pane per bay per floor.
  const panes = useMemo(() => {
    const out: Array<[number, number, number]> = []
    for (let f = 0; f < floors; f++) {
      const y = 6 + f * floor + floor / 2
      for (let i = 0; i < Math.floor(d / 1.5); i++) {
        const zz = z - d / 2 + 0.75 + i * 1.5
        out.push([face - 0.01, y, zz], [x + w / 2 + 0.01, y, zz])
      }
    }
    return out
  }, [floors, d, z, face, x, w])
  const sides = useMemo(() => {
    const out: Array<[number, number, number]> = []
    for (let f = 0; f < floors; f++) {
      const y = 6 + f * floor + floor / 2
      for (let i = 0; i < Math.floor(w / 1.5); i++) {
        const xx = x - w / 2 + 0.75 + i * 1.5
        out.push([xx, y, z - d / 2 - 0.01], [xx, y, z + d / 2 + 0.01])
      }
    }
    return out
  }, [floors, w, x, z, d])
  const bands = useMemo(
    () => Array.from({ length: floors + 1 }, (_, f) => 6 + f * floor),
    [floors],
  )
  const litPane = useMemo(() => (i: number) => (i * 13) % 7 < 3, [])
  return (
    <group>
      {/* The core behind the glass */}
      <Box size={[w - 0.3, h, d - 0.3]} position={[x, h / 2, z]} color="#1e293b" />
      <Grid
        points={panes}
        size={[0.06, floor - 0.35, 1.38]}
        color={tint}
        lit={litPane}
        dark={dark}
        metal={0.2}
        rough={0.18}
      />
      <Grid
        points={sides}
        size={[1.38, floor - 0.35, 0.06]}
        color={tint}
        lit={litPane}
        dark={dark}
        metal={0.2}
        rough={0.18}
      />
      {/* Floor bands (spandrels) round the building */}
      {bands.map((y) => (
        <Box
          key={y}
          size={[w + 0.12, 0.35, d + 0.12]}
          position={[x, y, z]}
          color="#cbd5e1"
        />
      ))}
      {/* Vertical mullions at the corners */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Box
            key={`${sx}${sz}`}
            size={[0.3, h - 6, 0.3]}
            position={[x + (sx * w) / 2, 6 + (h - 6) / 2, z + (sz * d) / 2]}
            color="#94a3b8"
          />
        )),
      )}
      {/* The lobby: double height, recessed, glazed, with a canopy over the doors */}
      <Box
        size={[0.08, 5.6, d - 2]}
        position={[face + 1.2, 2.8, z]}
        color={dark ? '#fde68a' : '#9fbfd3'}
        emissive={dark ? '#b45309' : undefined}
      />
      {/* The lobby's doors, in its glazing */}
      <Door
        position={[face + 1.1, 0, z]}
        rotation={-Math.PI / 2}
        kind="automatic"
        width={2.4}
        height={2.6}
        leaf="glass"
        frame="#334155"
        sense={2.4}
      />
      {[-1, 1].map((s) => (
        <Box
          key={s}
          size={[1.4, 6, 0.6]}
          position={[face + 0.5, 3, z + (s * (d - 1.4)) / 2]}
          color="#e2e8f0"
        />
      ))}
      <Box size={[3.2, 0.25, 4.5]} position={[face - 1.2, 3.6, z]} color="#334155" />
      {[-1.8, 1.8].map((dz) => (
        <Box
          key={dz}
          size={[0.12, 3.6, 0.12]}
          position={[face - 2.6, 1.8, z + dz]}
          color="#64748b"
        />
      ))}
      {/* The crown: a plant screen and a lift motor room on the roof */}
      <Box size={[w - 2, 2.4, d - 2]} position={[x, h + 1.2, z]} color="#94a3b8" />
      <Box size={[3, 3.6, 3]} position={[x + w / 5, h + 1.8, z]} color="#64748b" />
    </group>
  )
}

/** Riverside Community Hospital: a white clinical block facing -x, its entrance and ambulance bay. */
export function HospitalBlock({ x, z, dark }: { x: number; z: number; dark: boolean }) {
  const w = 14
  const d = 22
  const h = 18
  const face = x - w / 2
  const windows = useMemo(() => {
    const out: Array<[number, number, number]> = []
    for (let f = 0; f < 4; f++)
      for (let i = 0; i < 9; i++)
        out.push([face - 0.03, 5.2 + f * 3.4, z - d / 2 + 1.6 + i * 2.35])
    return out
  }, [face, z])
  const lit = useMemo(() => (i: number) => i % 3 !== 1, [])
  return (
    <group>
      <Box size={[w, h, d]} position={[x, h / 2, z]} color="#f1f5f9" />
      {/* The teal band and the plinth */}
      <Box size={[w + 0.1, 1.0, d + 0.1]} position={[x, 3.6, z]} color="#0f766e" />
      <Box size={[w + 0.2, 0.6, d + 0.2]} position={[x, 0.3, z]} color="#94a3b8" />
      <Grid
        points={windows}
        size={[0.08, 1.8, 1.7]}
        color="#8fb3c7"
        lit={lit}
        dark={dark}
        metal={0.2}
        rough={0.15}
      />
      <Grid
        points={windows.map(([px, py, pz]) => [px - 0.02, py - 1.0, pz])}
        size={[0.18, 0.12, 1.9]}
        color="#e2e8f0"
      />
      {/* The main entrance: a deep canopy on columns, sliding doors */}
      <Box size={[4, 0.4, 8]} position={[face - 2, 3.8, z - 4]} color="#e2e8f0" />
      {[-7.4, -0.6].map((dz) => (
        <mesh key={dz} position={[face - 3.6, 1.8, z + dz]}>
          <cylinderGeometry args={[0.18, 0.18, 3.6, 12]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
      ))}
      <Box
        size={[0.1, 2.6, 3.2]}
        position={[face - 0.02, 1.3, z - 4]}
        color={dark ? '#fef3c7' : '#a5c8d8'}
        emissive={dark ? '#a16207' : undefined}
      />
      {/* The main doors: automatic, parting for whoever walks up to them */}
      <Door
        position={[face - 0.1, 0, z - 4]}
        rotation={-Math.PI / 2}
        kind="automatic"
        width={2.4}
        height={2.5}
        leaf="glass"
        frame="#94a3b8"
        sense={2.4}
      />
      <Sign
        position={[face - 0.06, 4.6, z - 4]}
        rotation={-Math.PI / 2}
        className="bg-teal-800 text-[14px] font-semibold text-white"
      >
        Riverside Community Hospital · Main entrance
      </Sign>
      {/* The red cross, and the emergency sign over the ambulance bay */}
      <group position={[face - 0.05, h - 2.4, z + 6]}>
        <Box
          size={[0.1, 2.2, 0.7]}
          position={[0, 0, 0]}
          color="#dc2626"
          emissive={dark ? '#7f1d1d' : undefined}
        />
        <Box
          size={[0.1, 0.7, 2.2]}
          position={[0, 0, 0]}
          color="#dc2626"
          emissive={dark ? '#7f1d1d' : undefined}
        />
      </group>
      <Box size={[5, 0.35, 7]} position={[face - 2.5, 3.4, z + 6.5]} color="#e2e8f0" />
      <Sign
        position={[face - 0.06, 4.2, z + 6.5]}
        rotation={-Math.PI / 2}
        className="bg-red-700 text-[13px] font-bold text-white"
      >
        Emergency · ambulances only
      </Sign>
      <Ambulance x={face - 3.2} z={z + 6.5} />
    </group>
  )
}

/** An ambulance, parked nose out. */
function Ambulance({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, Math.PI / 2, 0]}>
      <Box
        size={[2.2, 2.4, 4.6]}
        position={[0, 1.6, 0.4]}
        color="#fde047"
        radius={0.15}
      />
      <Box
        size={[2.1, 1.5, 1.5]}
        position={[0, 1.2, -2.3]}
        color="#fde047"
        radius={0.12}
      />
      <Box size={[2.0, 0.6, 0.05]} position={[0, 1.6, -3.06]} color="#1e293b" />
      {/* The chequered band and the blue lights */}
      {Array.from({ length: 8 }, (_, i) => (
        <Box
          key={i}
          size={[2.24, 0.3, 0.55]}
          position={[0, 1.1, -1.4 + i * 0.6]}
          color={i % 2 ? '#1d4ed8' : '#fde047'}
        />
      ))}
      {[-0.7, 0.7].map((dx) => (
        <Box
          key={dx}
          size={[0.3, 0.15, 0.3]}
          position={[dx, 2.9, -1.6]}
          color="#2563eb"
          emissive="#1d4ed8"
        />
      ))}
      {[-2.4, 1.8].flatMap((wz) =>
        [-1.05, 1.05].map((wx) => (
          <mesh
            key={`${wz}${wx}`}
            position={[wx, 0.42, wz]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.42, 0.42, 0.25, 16]} />
            <meshStandardMaterial color="#18181b" />
          </mesh>
        )),
      )}
    </group>
  )
}

/** Northbank Engineering's works: a saw-tooth-roofed shed facing -x, with roller doors and its yard. */
export function EngineeringWorks({
  x,
  z,
  dark,
}: {
  x: number
  z: number
  dark: boolean
}) {
  const w = 18
  const d = 24
  const h = 8
  const face = x - w / 2
  const teeth = 4
  return (
    <group>
      {/* Cladding on a blockwork base */}
      <Box size={[w, 1.2, d]} position={[x, 0.6, z]} color="#9ca3af" />
      <Box
        size={[w, h - 1.2, d]}
        position={[x, 1.2 + (h - 1.2) / 2, z]}
        color="#5b6b7a"
      />
      {/* Vertical ribs of the profiled cladding on the front */}
      {Array.from({ length: Math.floor(d / 0.6) }, (_, i) => (
        <Box
          key={i}
          size={[0.06, h - 1.2, 0.08]}
          position={[face - 0.02, 1.2 + (h - 1.2) / 2, z - d / 2 + 0.3 + i * 0.6]}
          color="#4b5a68"
        />
      ))}
      {/* The saw-tooth roof: each tooth a steep glazed north light and a long slope */}
      {Array.from({ length: teeth }, (_, i) => {
        const span = w / teeth
        const x0 = x - w / 2 + i * span
        return (
          <group key={i}>
            <mesh position={[x0 + span * 0.62, h + 1.0, z]} rotation={[0, 0, -0.38]}>
              <boxGeometry args={[span * 0.86, 0.12, d]} />
              <meshStandardMaterial color="#64748b" roughness={0.6} />
            </mesh>
            <mesh position={[x0 + 0.12, h + 1.0, z]} rotation={[0, 0, 0.12]}>
              <boxGeometry args={[0.1, 2.0, d]} />
              <meshStandardMaterial
                color={dark ? '#fde68a' : '#bfdbfe'}
                emissive={dark ? '#92400e' : '#000000'}
                metalness={0.4}
                roughness={0.15}
              />
            </mesh>
          </group>
        )
      })}
      {/* Two roller doors, and a personnel door with its canopy */}
      {[-6, 2].map((dz) => (
        <group key={dz} position={[face - 0.05, 0, z + dz]}>
          <Box size={[0.1, 5, 4.6]} position={[0, 2.5, 0]} color="#cbd5e1" />
          {Array.from({ length: 10 }, (_, k) => (
            <Box
              key={k}
              size={[0.12, 0.04, 4.6]}
              position={[-0.01, 0.4 + k * 0.48, 0]}
              color="#94a3b8"
            />
          ))}
          <Box size={[0.3, 0.5, 4.9]} position={[0, 5.2, 0]} color="#334155" />
          {/* Yellow and black bollards either side */}
          {[-2.6, 2.6].map((b) => (
            <Box
              key={b}
              size={[0.25, 1.1, 0.25]}
              position={[-0.6, 0.55, b]}
              color="#facc15"
            />
          ))}
        </group>
      ))}
      <Box size={[0.1, 2.2, 1.0]} position={[face - 0.05, 1.1, z + 8]} color="#1e3a8a" />
      <Box size={[1.2, 0.15, 1.6]} position={[face - 0.6, 2.5, z + 8]} color="#334155" />
      <Sign
        position={[face - 0.08, h - 1.2, z - 2]}
        rotation={-Math.PI / 2}
        className="bg-orange-600 text-[16px] font-bold text-white"
      >
        NORTHBANK ENGINEERING LTD · Works
      </Sign>
      {/* The yard: steel stock on racks and a skip */}
      <group position={[face - 4, 0, z - 10]}>
        {[0, 1.6].map((dz) => (
          <Box
            key={dz}
            size={[0.15, 1.6, 0.15]}
            position={[0, 0.8, dz]}
            color="#ea580c"
          />
        ))}
        {[0.5, 0.9, 1.3].map((y) => (
          <Box key={y} size={[0.25, 0.2, 4]} position={[0.3, y, 0.8]} color="#64748b" />
        ))}
      </group>
    </group>
  )
}
