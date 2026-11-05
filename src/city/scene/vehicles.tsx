/** Vehicles for the street and Cog & Kerb: a bike, a small car and a bus. */
import type { Vector } from '../../content/office'
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
      <Box size={[1.8, 0.7, 4]} position={[0, 0.65, 0]} color={colour} radius={0.15} />
      <Box
        size={[1.6, 0.6, 2.1]}
        position={[0, 1.25, 0.3]}
        color="#cbd5e1"
        radius={0.12}
      />
      {[
        [-0.85, -1.3],
        [0.85, -1.3],
        [-0.85, 1.3],
        [0.85, 1.3],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.33, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.33, 0.33, 0.22, 14]} />
          <meshStandardMaterial color="#18181b" />
        </mesh>
      ))}
    </group>
  )
}

export function Bus({ colour }: { colour: string }) {
  return (
    <group>
      <Box size={[2.5, 2.6, 10]} position={[0, 1.6, 0]} color={colour} radius={0.2} />
      <Box size={[2.54, 0.9, 8.6]} position={[0, 2.1, 0.3]} color="#1e293b" />
      {[-3.4, 3.4].map((z) =>
        [-1.2, 1.2].map((x) => (
          <mesh key={`${x}${z}`} position={[x, 0.45, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.45, 0.45, 0.3, 14]} />
            <meshStandardMaterial color="#18181b" />
          </mesh>
        )),
      )}
    </group>
  )
}
