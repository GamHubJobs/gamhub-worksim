/**
 * Inside a place in the neighbourhood, in 3D: only that place is loaded and
 * drawn (each interior is its own small file), lit for the hour, with a
 * camera the player can turn and zoom a little to look around. Clicking a
 * hotspot does the same as the button in the list beside it.
 */
import { OrbitControls } from '@react-three/drei'
import { Canvas, type RootState } from '@react-three/fiber'
import { lazy, memo, Suspense, useMemo, useState } from 'react'
import type { WebGLRenderer } from 'three'
import type { PlaceId } from '../../content/city'
import type { Vector } from '../../content/office'
import { PeopleDetail } from '../../office/scene/people'
import { prefersReducedMotion } from '../../ui/motion'
import { isLow, useGraphicsQuality } from '../../ui/graphics'
import { Ticker } from './interiors/common'
import { Interior, type Doing, type InteriorState } from './interiors/kit'

const STILL = prefersReducedMotion()

export type InteriorId = Exclude<PlaceId, 'home' | 'office'>

const ROOMS = {
  cafe: lazy(() => import('./interiors/Cafe')),
  shop: lazy(() => import('./interiors/Shop')),
  gym: lazy(() => import('./interiors/Gym')),
  park: lazy(() => import('./interiors/Park')),
  garage: lazy(() => import('./interiors/Garage')),
} satisfies Record<InteriorId, unknown>

/** Where the camera starts, what it looks at, and how far it may move. */
const VIEWS: Record<
  InteriorId,
  { camera: Vector; target: Vector; near: number; far: number }
> = {
  cafe: { camera: [0.6, 2.3, 4.1], target: [-0.4, 1.1, -1.6], near: 2.5, far: 6.2 },
  shop: { camera: [1.4, 2.4, 4.6], target: [0, 1.1, -1.2], near: 2.5, far: 6.4 },
  gym: { camera: [0.8, 2.5, 4.6], target: [0, 1, -1.2], near: 2.5, far: 6.4 },
  park: { camera: [0, 4.2, 11.5], target: [0, 0.8, -1.5], near: 5, far: 15 },
  garage: { camera: [0.8, 2.5, 4.6], target: [-0.6, 1, -1.2], near: 2.5, far: 6.6 },
}

export interface InteriorSceneProps {
  place: InteriorId
  dark: boolean
  morning: boolean
  doings: Doing[]
  last: string | null
  onAct: (id: string) => void
}

function isSoftware(gl: WebGLRenderer): boolean {
  const context = gl.getContext()
  const info = context.getExtension('WEBGL_debug_renderer_info')
  const renderer = String(
    info
      ? context.getParameter(info.UNMASKED_RENDERER_WEBGL)
      : context.getParameter(context.RENDERER),
  )
  return /swiftshader|llvmpipe|software|basic render/i.test(renderer)
}

function InteriorScene({
  place,
  dark,
  morning,
  doings,
  last,
  onAct,
}: InteriorSceneProps) {
  const [software, setSoftware] = useState(false)
  const quality = useGraphicsQuality()
  const low = isLow(quality, software)
  const [moving, setMoving] = useState(false)
  const view = VIEWS[place]
  const Room = ROOMS[place]
  const outdoors = place === 'park'
  const sky = dark ? '#1e293b' : morning ? '#cfe8f7' : '#f3c99b'
  const state: InteriorState = useMemo(
    () => ({
      doings: Object.fromEntries(doings.map((d) => [d.id, d])),
      act: onAct,
      dark,
      low,
      last,
    }),
    [doings, onAct, dark, low, last],
  )

  return (
    <Canvas
      key={place}
      dpr={low ? 0.6 : [1, 1.5]}
      frameloop="demand"
      camera={{ position: view.camera, fov: outdoors ? 50 : 62, near: 0.1, far: 120 }}
      gl={{ antialias: !low, powerPreference: 'default' }}
      onCreated={({ gl }: RootState) => setSoftware(isSoftware(gl))}
    >
      <Ticker fps={STILL ? 1 / 30 : moving ? 30 : low ? 2 : 12} />
      <color attach="background" args={[outdoors ? sky : '#1c1917']} />
      {outdoors && <fog attach="fog" args={[sky, 18, 60]} />}
      <hemisphereLight
        args={[
          dark ? '#c7d2fe' : '#ffffff',
          outdoors ? '#4d7c0f' : '#78716c',
          outdoors ? (dark ? 0.5 : 1.3) : dark ? 0.9 : 1.15,
        ]}
      />
      <directionalLight
        position={morning ? [6, 10, 6] : [-6, 8, 5]}
        intensity={outdoors ? (dark ? 0.2 : 1.2) : 0.6}
        color={morning ? '#fff8ee' : '#ffe4c4'}
      />
      <Interior.Provider value={state}>
        <PeopleDetail low={low}>
          <Suspense fallback={null}>
            <Room />
          </Suspense>
        </PeopleDetail>
      </Interior.Provider>
      <OrbitControls
        target={view.target}
        enablePan={false}
        enableDamping={!STILL}
        minDistance={view.near}
        maxDistance={view.far}
        minPolarAngle={0.55}
        maxPolarAngle={1.38}
        minAzimuthAngle={-0.85}
        maxAzimuthAngle={0.85}
        onStart={() => setMoving(true)}
        onEnd={() => setMoving(false)}
      />
    </Canvas>
  )
}

export default memo(InteriorScene)
