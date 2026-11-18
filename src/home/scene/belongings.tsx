/**
 * Belongings kept at home (game/accessories.ts: owned, not worn or packed): by
 * the front door, a coat stand with the bags, hats and briefcase on its hooks,
 * and a small table with a tray for watches and bracelets. Only there once the
 * player has something to keep there.
 */
import { Kept } from '../../world/character/accessories3d'
import { finish } from '../../world/character/accessoryLook'
import type { WornModel } from '../../game/accessories'

const WOOD = '#8b5e3c'

export function Belongings({
  kept,
  door,
}: {
  kept: WornModel[]
  door: [number, number]
}) {
  const hung = kept.filter(
    (k) => k.slot === 'back' || k.slot === 'carry' || k.slot === 'head',
  )
  const tray = kept.filter((k) => k.slot === 'wrist' || k.slot === 'wrist2')
  if (!hung.length && !tray.length) return null
  // Inside the door, to one side of the way in.
  const [dx, dz] = door
  return (
    <group data-belongings>
      {hung.length > 0 && (
        <group position={[dx - 0.7, 0, dz - 0.15]}>
          {/* The stand: a weighted foot, a pole, four hooks near the top */}
          <mesh position={[0, 0.02, 0]} material={finish(WOOD, 'leather')}>
            <cylinderGeometry args={[0.2, 0.22, 0.04, 20]} />
          </mesh>
          <mesh position={[0, 0.9, 0]} material={finish(WOOD, 'leather')}>
            <cylinderGeometry args={[0.022, 0.026, 1.76, 10]} />
          </mesh>
          {hung.slice(0, 4).map((k, i) => {
            const a = (i / 4) * Math.PI * 2 + Math.PI / 4
            const x = Math.sin(a) * 0.1
            const z = Math.cos(a) * 0.1
            return (
              <group key={`${k.id}-${i}`} position={[x, 1.62, z]} rotation={[0, a, 0]}>
                <mesh
                  material={finish('#cbd5e1', 'metal')}
                  rotation={[Math.PI / 2, 0, 0]}
                >
                  <cylinderGeometry args={[0.008, 0.008, 0.09, 6]} />
                </mesh>
                <group position={[0, -0.02, 0.07]}>
                  <Kept wear={k} />
                </group>
              </group>
            )
          })}
        </group>
      )}
      {tray.length > 0 && (
        <group position={[dx - 1.25, 0, dz - 0.2]}>
          {/* A small round table, with a tray on it */}
          <mesh position={[0, 0.68, 0]} material={finish(WOOD, 'leather')}>
            <cylinderGeometry args={[0.22, 0.22, 0.03, 22]} />
          </mesh>
          <mesh position={[0, 0.34, 0]} material={finish(WOOD, 'leather')}>
            <cylinderGeometry args={[0.03, 0.04, 0.66, 10]} />
          </mesh>
          <mesh position={[0, 0.71, 0]} material={finish('#1f2937', 'leather')}>
            <boxGeometry args={[0.3, 0.02, 0.2]} />
          </mesh>
          {tray.slice(0, 4).map((k, i) => (
            <group
              key={`${k.id}-${i}`}
              position={[-0.09 + (i % 2) * 0.18, 0.72, -0.05 + Math.floor(i / 2) * 0.1]}
            >
              <Kept wear={k} />
            </group>
          ))}
        </group>
      )}
    </group>
  )
}
