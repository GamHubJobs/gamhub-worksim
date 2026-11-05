/**
 * Things the character holds, drawn in the hand's own space: the hand is at
 * the origin, the forearm runs up (+y) from it and the palm faces -z.
 */
import type { PropKind } from './interaction/activity'

export function Prop({ kind }: { kind: PropKind }) {
  switch (kind) {
    case 'cup':
    case 'mug':
      return (
        <group position={[0, -0.05, -0.04]}>
          <mesh>
            <cylinderGeometry args={[0.04, 0.034, 0.1, 14]} />
            <meshStandardMaterial color={kind === 'mug' ? '#1d4ed8' : '#fafaf9'} />
          </mesh>
          <mesh position={[0, 0.045, 0]}>
            <cylinderGeometry args={[0.036, 0.036, 0.005, 14]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
        </group>
      )
    case 'bottle':
      return (
        <group position={[0, -0.06, -0.035]}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.03, 0.2, 12]} />
            <meshStandardMaterial color="#7dd3fc" transparent opacity={0.7} />
          </mesh>
          <mesh position={[0, -0.03, 0]}>
            <cylinderGeometry args={[0.027, 0.027, 0.12, 12]} />
            <meshStandardMaterial color="#38bdf8" />
          </mesh>
        </group>
      )
    case 'fork':
    case 'spoon':
      return (
        <group position={[0, -0.04, -0.03]} rotation={[0.6, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.012, 0.16, 0.004]} />
            <meshStandardMaterial color="#d4d4d8" metalness={0.6} roughness={0.3} />
          </mesh>
          {kind === 'fork' ? (
            <mesh position={[0, -0.09, 0.006]}>
              <sphereGeometry args={[0.014, 8, 6]} />
              <meshStandardMaterial color="#ca8a04" />
            </mesh>
          ) : (
            <mesh position={[0, -0.09, 0]} scale={[1, 1.4, 0.4]}>
              <sphereGeometry args={[0.018, 8, 6]} />
              <meshStandardMaterial color="#d4d4d8" metalness={0.6} roughness={0.3} />
            </mesh>
          )}
        </group>
      )
    case 'sandwich':
      return (
        <group position={[0, -0.04, -0.05]}>
          <mesh>
            <boxGeometry args={[0.1, 0.035, 0.08]} />
            <meshStandardMaterial color="#e7c48d" />
          </mesh>
          <mesh>
            <boxGeometry args={[0.104, 0.012, 0.084]} />
            <meshStandardMaterial color="#65a30d" />
          </mesh>
        </group>
      )
    case 'phone':
      return (
        <mesh position={[0, -0.03, -0.025]}>
          <boxGeometry args={[0.07, 0.14, 0.01]} />
          <meshStandardMaterial
            color="#111827"
            emissive="#1e3a8a"
            emissiveIntensity={0.4}
          />
        </mesh>
      )
    case 'dumbbell':
      return (
        <group position={[0, -0.02, -0.01]} rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[0.018, 0.018, 0.22, 8]} />
            <meshStandardMaterial color="#a1a1aa" metalness={0.7} roughness={0.3} />
          </mesh>
          {[-0.09, 0.09].map((y) => (
            <mesh key={y} position={[0, y, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.05, 14]} />
              <meshStandardMaterial color="#18181b" />
            </mesh>
          ))}
        </group>
      )
    case 'basket':
      return (
        <group position={[0, -0.18, -0.02]}>
          <mesh>
            <boxGeometry args={[0.4, 0.2, 0.28]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
          <mesh position={[0, 0.13, 0]}>
            <boxGeometry args={[0.02, 0.1, 0.02]} />
            <meshStandardMaterial color="#7f1d1d" />
          </mesh>
          {[-0.1, 0.05].map((x, i) => (
            <mesh key={x} position={[x, 0.12, 0]}>
              <boxGeometry args={[0.1, 0.1, 0.08]} />
              <meshStandardMaterial color={i ? '#f59e0b' : '#16a34a'} />
            </mesh>
          ))}
        </group>
      )
    case 'product':
      return (
        <mesh position={[0, -0.05, -0.05]}>
          <boxGeometry args={[0.1, 0.14, 0.07]} />
          <meshStandardMaterial color="#2563eb" />
        </mesh>
      )
    case 'card':
      return (
        <mesh position={[0, -0.04, -0.03]}>
          <boxGeometry args={[0.085, 0.054, 0.003]} />
          <meshStandardMaterial color="#0f766e" />
        </mesh>
      )
    case 'toothbrush':
      return (
        <mesh position={[0, -0.04, -0.03]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.012, 0.17, 0.012]} />
          <meshStandardMaterial color="#38bdf8" />
        </mesh>
      )
    case 'book':
      return (
        <mesh position={[0, -0.05, -0.06]} rotation={[0.9, 0, 0]}>
          <boxGeometry args={[0.16, 0.22, 0.03]} />
          <meshStandardMaterial color="#9a3412" />
        </mesh>
      )
    case 'pen':
      return (
        <mesh position={[0, -0.04, -0.03]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.14, 6]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      )
  }
}
