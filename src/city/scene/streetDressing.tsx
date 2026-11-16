/**
 * The high street's surfaces and building fronts: asphalt with its markings,
 * paving slabs and granite kerbs, a grass verge beyond, and on each building a
 * brick or rendered front with a shop-front band, a cornice, and real windows
 * on every floor (a frame, a sill, glass that catches the sky; lit in the
 * evening). The windows of the whole street are drawn as a few instanced
 * meshes, so the detail costs a handful of draw calls.
 */
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  Color,
  Matrix4,
  type InstancedMesh,
  MeshStandardMaterial,
  BoxGeometry,
} from 'three'
import { surface, tiling } from '../../world/look/surfaces'

export interface FrontSpec {
  x: number
  side: 1 | -1
  w: number
  h: number
  color: string
}

/** How far the buildings' fronts are from the middle of the road, and how deep they are. */
const FRONT = 10
const DEPTH = 14

/** Which buildings are brick and which rendered (a little variety along the street). */
const isBrick = (i: number) => i % 3 !== 1

export function StreetSurfaces() {
  return (
    <group>
      {/* Grass beyond the street */}
      <mesh
        position={[0, -0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={surface('grass', '#7d9a5a', tiling(260, 200, 3))}
        userData={{ floor: true }}
      >
        <planeGeometry args={[260, 200]} />
      </mesh>
      {/* The road */}
      <mesh
        position={[0, 0.001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={surface('asphalt', '#6b7077', tiling(150, 10, 4))}
        userData={{ floor: true }}
      >
        <planeGeometry args={[150, 10]} />
      </mesh>
      {/* Pavements of paving slabs, and granite kerbs along the road */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh
            position={[0, 0.06, s * 7.5]}
            material={surface('paving', '#d6d0c6', tiling(150, 5, 1.2))}
            userData={{ floor: true }}
          >
            <boxGeometry args={[150, 0.12, 5]} />
          </mesh>
          <mesh position={[0, 0.07, s * 5.07]} material={KERB} userData={{ floor: true }}>
            <boxGeometry args={[150, 0.14, 0.18]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

const KERB = new MeshStandardMaterial({ color: '#9ca3af', roughness: 0.8 })

/** Windows on one front: where each is (the middle of its glass), floor by floor. */
function windowsOf(b: FrontSpec): Array<{ x: number; y: number; z: number }> {
  const out: Array<{ x: number; y: number; z: number }> = []
  const floors = Math.floor((b.h - 4) / 3.2)
  const across = Math.max(1, Math.floor((b.w - 1.5) / 2.3))
  const gap = (b.w - 1.5) / across
  const z = b.side * FRONT - b.side * 0.03
  for (let f = 0; f < floors; f++)
    for (let i = 0; i < across; i++)
      out.push({ x: b.x - (b.w - 1.5) / 2 + gap * (i + 0.5), y: 4.9 + f * 3.2, z })
  return out
}

const PANE = new BoxGeometry(1.25, 1.55, 0.06)
const FRAME = new BoxGeometry(1.45, 1.75, 0.04)
const SILL = new BoxGeometry(1.6, 0.1, 0.22)
const HEAD = new BoxGeometry(1.62, 0.16, 0.12)
const BAR = new BoxGeometry(0.05, 1.55, 0.08)

/**
 * The fronts of the street's buildings: a brick or rendered face, a shop-front
 * band above the ground floor, a cornice under the roof, and the windows.
 */
export function Fronts({ buildings, dark }: { buildings: FrontSpec[]; dark: boolean }) {
  const windows = useMemo(() => buildings.flatMap((b) => windowsOf(b)), [buildings])
  const panes = useRef<InstancedMesh>(null)
  const frames = useRef<InstancedMesh>(null)
  const sills = useRef<InstancedMesh>(null)
  const heads = useRef<InstancedMesh>(null)
  const bars = useRef<InstancedMesh>(null)
  const glass = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#9fbfd3',
        roughness: 0.08,
        metalness: 0.6,
        emissive: '#000000',
      }),
    [],
  )
  const frameMat = useMemo(
    () => new MeshStandardMaterial({ color: '#f5f5f4', roughness: 0.6 }),
    [],
  )
  useLayoutEffect(() => {
    const m = new Matrix4()
    const lit = new Color('#fcd34d')
    const unlit = new Color('#9fbfd3')
    windows.forEach((w, i) => {
      m.makeTranslation(w.x, w.y, w.z)
      panes.current?.setMatrixAt(i, m)
      // In the evening, some windows are lit (the same ones every time).
      panes.current?.setColorAt(i, dark && (i * 7) % 5 < 2 ? lit : unlit)
      m.makeTranslation(w.x, w.y, w.z + Math.sign(w.z) * 0.02)
      frames.current?.setMatrixAt(i, m)
      m.makeTranslation(w.x, w.y - 0.88, w.z - Math.sign(w.z) * 0.08)
      sills.current?.setMatrixAt(i, m)
      m.makeTranslation(w.x, w.y + 0.96, w.z - Math.sign(w.z) * 0.04)
      heads.current?.setMatrixAt(i, m)
      m.makeTranslation(w.x, w.y, w.z + Math.sign(w.z) * 0.04)
      bars.current?.setMatrixAt(i, m)
    })
    for (const mesh of [
      panes.current,
      frames.current,
      sills.current,
      heads.current,
      bars.current,
    ]) {
      if (!mesh) continue
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.computeBoundingSphere()
    }
    glass.emissive.set(dark ? '#3b2a05' : '#000000')
  }, [windows, dark, glass])
  return (
    <group>
      {buildings.map((b, i) => {
        const z = b.side * FRONT + b.side * (DEPTH / 2)
        const face = isBrick(i)
          ? surface('brick', b.color, tiling(b.w, b.h, 1.6))
          : surface('render', b.color, tiling(b.w, b.h, 3))
        return (
          <group key={i}>
            <mesh position={[b.x, b.h / 2, z]} material={face}>
              <boxGeometry args={[b.w, b.h, DEPTH]} />
            </mesh>
            {/* The shop-front band above the ground floor, and the cornice */}
            <mesh position={[b.x, 3.55, b.side * FRONT - b.side * 0.12]} material={BAND}>
              <boxGeometry args={[b.w, 0.35, 0.25]} />
            </mesh>
            <mesh
              position={[b.x, b.h - 0.15, b.side * FRONT - b.side * 0.15]}
              material={CORNICE}
            >
              <boxGeometry args={[b.w + 0.3, 0.3, 0.35]} />
            </mesh>
            {/* Parapet and roof */}
            <mesh position={[b.x, b.h + 0.2, z]} material={ROOF}>
              <boxGeometry args={[b.w + 0.4, 0.4, DEPTH + 0.4]} />
            </mesh>
            {/* Chimney stacks on the brick buildings, vents and a plant box on the others */}
            {isBrick(i) ? (
              [-0.3, 0.3].map((f) => (
                <group key={f} position={[b.x + f * b.w, b.h + 0.4, z]}>
                  <mesh position={[0, 0.8, 0]} material={face}>
                    <boxGeometry args={[0.9, 1.6, 0.6]} />
                  </mesh>
                  {[-0.2, 0.2].map((p) => (
                    <mesh key={p} position={[p, 1.75, 0]} material={ROOF}>
                      <cylinderGeometry args={[0.1, 0.12, 0.35, 8]} />
                    </mesh>
                  ))}
                </group>
              ))
            ) : (
              <mesh position={[b.x + b.w * 0.2, b.h + 0.85, z]} material={ROOF}>
                <boxGeometry args={[1.6, 0.9, 1.2]} />
              </mesh>
            )}
          </group>
        )
      })}
      <instancedMesh ref={frames} args={[FRAME, frameMat, windows.length]} />
      <instancedMesh ref={panes} args={[PANE, glass, windows.length]} />
      <instancedMesh ref={sills} args={[SILL, frameMat, windows.length]} />
      <instancedMesh ref={heads} args={[HEAD, frameMat, windows.length]} />
      <instancedMesh ref={bars} args={[BAR, frameMat, windows.length]} />
    </group>
  )
}

const BAND = new MeshStandardMaterial({ color: '#57534e', roughness: 0.7 })
const CORNICE = new MeshStandardMaterial({ color: '#e7e5e4', roughness: 0.8 })
const ROOF = new MeshStandardMaterial({ color: '#78716c', roughness: 0.9 })
