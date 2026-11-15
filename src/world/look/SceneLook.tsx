/**
 * The light of a place, shared by every 3D view (office, courthouse, home,
 * street, the places in the neighbourhood), so they look like parts of the
 * same world: a sky light, a key light (the sun, or the room's main light)
 * that casts soft shadows, a gentle fill, and an environment drawn in the scene
 * (ceiling panels, windows; nothing downloaded) that gives screens, steel,
 * glass and polished floors their reflections. Each kind of place has its own
 * look (a clinical ward, a wood-panelled courtroom, a workshop, a warm flat in
 * the evening). Computers that draw 3D in software get the plain lights only.
 *
 * Shadows are redrawn once a second rather than every frame: the furniture
 * does not move and the people only a little, so this costs very little.
 */
import { Environment, Lightformer } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { DirectionalLight, Material, Mesh } from 'three'
import { LOOKS, type LookId } from './looks'
import { hearFrom } from '../../audio/listener'

export function SceneLook({
  look,
  low,
  extent = 14,
  center = [0, 0, 0],
  follow,
}: {
  look: LookId
  /** Plain lights only (software 3D, or the player chose Low). */
  low: boolean
  /** How far the key light's shadows reach from the centre (metres). */
  extent?: number
  /** The middle of the place, for the shadows. */
  center?: [number, number, number]
  /** For a long place (the street): where the shadows should be, followed as it moves. */
  follow?: () => { x: number; z: number }
}) {
  const l = LOOKS[look]
  const get = useThree((s) => s.get)
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    const { gl } = get()
    gl.toneMappingExposure = l.exposure
    invalidate()
  }, [get, invalidate, l.exposure])
  useShadowRefresh(low)
  // Where the player hears from (audio/listener.ts): this view's camera.
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    hearFrom(camera as unknown as Parameters<typeof hearFrom>[0])
    return () => hearFrom(null)
  }, [camera])
  // A long place: the shadows follow the player (moved a metre or more at a time).
  const key = useRef<DirectionalLight>(null)
  const at = useRef({ x: NaN, z: NaN })
  useFrame(() => {
    const light = key.current
    if (!follow || !light || low) return
    const p = follow()
    if (Math.hypot(p.x - at.current.x, p.z - at.current.z) < 1) return
    at.current = { x: p.x, z: p.z }
    light.position.set(
      p.x + l.key.position[0],
      l.key.position[1],
      p.z + l.key.position[2],
    )
    light.target.position.set(p.x, 0, p.z)
    light.target.updateMatrixWorld()
    get().gl.shadowMap.needsUpdate = true
  })
  const [cx, cy, cz] = center
  const [kx, ky, kz] = l.key.position
  return (
    <>
      <hemisphereLight args={[l.sky, l.ground, low ? l.hemi * 1.45 : l.hemi]} />
      <directionalLight
        ref={key}
        position={[cx + kx, cy + ky, cz + kz]}
        target-position={[cx, cy, cz]}
        intensity={low ? l.key.intensity * 0.85 : l.key.intensity}
        color={l.key.color}
        castShadow={!low}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-extent}
        shadow-camera-right={extent}
        shadow-camera-top={extent}
        shadow-camera-bottom={-extent}
        shadow-camera-near={0.5}
        shadow-camera-far={ky + extent * 3}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={4}
      />
      <directionalLight
        position={[cx + l.fill.position[0], l.fill.position[1], cz + l.fill.position[2]]}
        intensity={l.fill.intensity}
        color={l.fill.color}
      />
      {!low && (
        <Environment resolution={128} frames={1} environmentIntensity={l.environment}>
          {l.panels.map((p, i) => (
            <Lightformer
              key={i}
              form="rect"
              intensity={p.intensity}
              color={p.color}
              position={p.position}
              rotation={p.rotation ?? [0, 0, 0]}
              scale={p.scale}
            />
          ))}
        </Environment>
      )}
    </>
  )
}

/**
 * Solid things cast and take shadows (floors only take them), checked again
 * once a second for anything that has appeared; transparent ones (glass,
 * signs) neither.
 */
function useShadowRefresh(low: boolean) {
  const get = useThree((s) => s.get)
  useEffect(() => {
    if (low) return
    const { gl, scene } = get()
    gl.shadowMap.autoUpdate = false
    const refresh = () => {
      scene.traverse((object) => {
        const mesh = object as Mesh
        if (!mesh.isMesh) return
        const material = mesh.material as Material | Material[]
        const solid = !Array.isArray(material) && !material.transparent
        mesh.receiveShadow = solid
        mesh.castShadow = solid && !mesh.userData.floor && !mesh.userData.noShadow
      })
      gl.shadowMap.needsUpdate = true
    }
    refresh()
    const timer = window.setInterval(refresh, 1000)
    return () => {
      window.clearInterval(timer)
      gl.shadowMap.autoUpdate = true
    }
  }, [get, low])
}
