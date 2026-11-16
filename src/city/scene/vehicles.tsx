/**
 * Vehicles for the street and Cog & Kerb: a bike, a car (a shaped body with
 * glass, lights, bumpers, mirrors and alloy wheels) and a bus.
 */
import type { Vector } from '../../content/office'
import { ExtrudeGeometry, Shape } from 'three'
import { Box } from '../../office/scene/parts'

/** A bike, facing along its rotation: two wheels, a frame, a saddle and handlebars. */
export function Bike({
  position,
  rotation,
  colour = '#dc2626',
}: {
  position: Vector
  rotation: number
  colour?: string
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-0.52, 0.52].map((z) => (
        <mesh key={z} position={[0, 0.34, z]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.32, 0.035, 8, 24]} />
          <meshStandardMaterial color="#18181b" roughness={0.6} />
        </mesh>
      ))}
      <Box size={[0.05, 0.05, 1.0]} position={[0, 0.62, 0]} color={colour} />
      <Box size={[0.05, 0.4, 0.05]} position={[0, 0.5, 0.22]} color={colour} />
      <Box size={[0.18, 0.05, 0.26]} position={[0, 0.78, 0.26]} color="#27272a" />
      <Box size={[0.55, 0.04, 0.04]} position={[0, 0.9, -0.46]} color="#27272a" />
      <Box size={[0.04, 0.3, 0.04]} position={[0, 0.74, -0.46]} color="#27272a" />
    </group>
  )
}

/**
 * A car's body: its side profile (bonnet, windscreen, roof, rear screen and
 * boot) pressed out to its width, with rounded edges. Shared by every car.
 */
const CAR_BODY = (() => {
  // In metres: x along the car (front at -2), y up from the sills.
  const s = new Shape()
  s.moveTo(-2.0, 0.18)
  s.lineTo(-2.02, 0.5)
  s.quadraticCurveTo(-1.95, 0.66, -1.6, 0.7) // the bonnet's nose
  s.lineTo(-0.75, 0.78) // the bonnet
  s.lineTo(-0.15, 1.28) // the windscreen
  s.lineTo(0.95, 1.3) // the roof
  s.lineTo(1.6, 0.86) // the rear screen
  s.lineTo(1.98, 0.8) // the boot
  s.quadraticCurveTo(2.05, 0.6, 2.0, 0.18)
  s.lineTo(-2.0, 0.18)
  const geometry = new ExtrudeGeometry(s, {
    depth: 1.62,
    bevelEnabled: true,
    bevelSize: 0.08,
    bevelThickness: 0.08,
    bevelSegments: 3,
    curveSegments: 8,
  })
  geometry.translate(0, 0, -0.81)
  return geometry
})()

/**
 * The glass of the cabin: the windscreen, side windows and rear screen, just
 * proud of the body (outside its rounded edges, so they show), under a roof
 * panel in the body's colour.
 */
const CAR_GLASS = (() => {
  const s = new Shape()
  s.moveTo(-0.8, 0.84)
  s.lineTo(-0.18, 1.37)
  s.lineTo(0.96, 1.39)
  s.lineTo(1.66, 0.9)
  s.lineTo(-0.8, 0.84)
  const geometry = new ExtrudeGeometry(s, { depth: 1.8, bevelEnabled: false })
  geometry.translate(0, 0, -0.9)
  return geometry
})()

function Wheel({ x, z, r = 0.33 }: { x: number; z: number; r?: number }) {
  return (
    <group position={[x, r, z]} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[r, r, 0.23, 20]} />
        <meshStandardMaterial color="#18181b" roughness={0.9} />
      </mesh>
      {/* The alloy wheel, on the outside face */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, side * 0.118, 0]}>
          <cylinderGeometry args={[r * 0.62, r * 0.62, 0.012, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

/** A small car, facing along its rotation (forwards is -z). */
export function Car({
  position,
  rotation,
  colour,
}: {
  position: Vector
  rotation: number
  colour: string
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* The body (its profile runs along x: turned so the front faces -z) */}
      <group rotation={[0, -Math.PI / 2, 0]}>
        <mesh geometry={CAR_BODY} position={[0, 0.06, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={colour} metalness={0.45} roughness={0.35} />
        </mesh>
        <mesh geometry={CAR_GLASS} position={[0, 0.06, 0]}>
          <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.1} />
        </mesh>
        {/* The roof panel over the glass, in the body's colour */}
        <mesh position={[0.4, 1.47, 0]}>
          <boxGeometry args={[1.05, 0.05, 1.66]} />
          <meshStandardMaterial color={colour} metalness={0.45} roughness={0.35} />
        </mesh>
      </group>
      {/* Pillars between the windows, and the door lines */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box
            size={[0.02, 0.4, 0.06]}
            position={[side * 0.9, 1.1, 0.35]}
            color={colour}
          />
          <Box
            size={[0.012, 0.5, 0.012]}
            position={[side * 0.905, 0.6, 0.35]}
            color="#0f172a"
          />
          <Box
            size={[0.012, 0.5, 0.012]}
            position={[side * 0.905, 0.6, -0.65]}
            color="#0f172a"
          />
          {/* The wing mirror */}
          <Box
            size={[0.16, 0.1, 0.08]}
            position={[side * 0.98, 0.98, -0.62]}
            color={colour}
          />
        </group>
      ))}
      {/* Bumpers, headlights and tail lights, the number plates */}
      <Box
        size={[1.7, 0.16, 0.1]}
        position={[0, 0.34, -2.08]}
        color="#27272a"
        radius={0.04}
      />
      <Box
        size={[1.7, 0.16, 0.1]}
        position={[0, 0.34, 2.08]}
        color="#27272a"
        radius={0.04}
      />
      {[-0.6, 0.6].map((x) => (
        <group key={x}>
          <Box
            size={[0.34, 0.1, 0.04]}
            position={[x, 0.62, -2.06]}
            color="#f8fafc"
            emissive="#fef9c3"
          />
          <Box
            size={[0.3, 0.1, 0.04]}
            position={[x, 0.72, 2.06]}
            color="#b91c1c"
            emissive="#7f1d1d"
          />
        </group>
      ))}
      <Box size={[0.5, 0.11, 0.02]} position={[0, 0.44, -2.14]} color="#f8fafc" />
      <Box size={[0.5, 0.11, 0.02]} position={[0, 0.5, 2.14]} color="#facc15" />
      <Wheel x={-0.82} z={-1.3} />
      <Wheel x={0.82} z={-1.3} />
      <Wheel x={-0.82} z={1.3} />
      <Wheel x={0.82} z={1.3} />
    </group>
  )
}

export function Bus({ colour }: { colour: string }) {
  return (
    <group>
      <Box size={[2.5, 2.6, 10]} position={[0, 1.6, 0]} color={colour} radius={0.2} />
      {/* The window band, divided into panes, and the windscreen */}
      <Box size={[2.54, 0.95, 8.4]} position={[0, 2.15, 0.5]} color="#1e293b" />
      {Array.from({ length: 7 }, (_, i) => (
        <Box
          key={i}
          size={[2.56, 0.95, 0.07]}
          position={[0, 2.15, -3.4 + i * 1.3]}
          color={colour}
        />
      ))}
      <Box size={[2.3, 1.2, 0.05]} position={[0, 2.0, -5.01]} color="#1e293b" />
      {/* The destination board, lit */}
      <Box
        size={[1.8, 0.28, 0.05]}
        position={[0, 2.72, -5.02]}
        color="#111827"
        emissive="#f59e0b"
      />
      {/* The doors (folding, at the front and middle) */}
      {[-3.9, 0.2].map((z) => (
        <Box
          key={z}
          size={[0.04, 2.0, 1.1]}
          position={[-1.27, 1.25, z]}
          color="#334155"
        />
      ))}
      {[-0.85, 0.85].map((x) => (
        <group key={x}>
          <Box
            size={[0.36, 0.14, 0.05]}
            position={[x, 0.75, -5.02]}
            color="#f8fafc"
            emissive="#fef9c3"
          />
          <Box
            size={[0.3, 0.3, 0.05]}
            position={[x, 0.85, 5.02]}
            color="#b91c1c"
            emissive="#7f1d1d"
          />
        </group>
      ))}
      {[-3.4, 3.4].map((z) =>
        [-1.2, 1.2].map((x) => <Wheel key={`${x}${z}`} x={x} z={z} r={0.48} />),
      )}
    </group>
  )
}
