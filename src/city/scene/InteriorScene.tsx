/**
 * Inside a place in the neighbourhood, in 3D: only that place is loaded and
 * drawn (each interior is its own small file), lit for the hour. The player
 * walks about in third person (see world/PlayerRig.tsx) and does things there
 * for real: the place's layout lists what is solid and every activity. A
 * ringed object, the "Press E" prompt and the list beside the view all start
 * the same activity; its game action is completed when it has been played.
 */
import { lowDpr } from '../../world/lowDpr'
import { Canvas, type RootState } from '@react-three/fiber'
import { lazy, memo, Suspense, useMemo, useRef, useState, type RefObject } from 'react'
import type { WebGLRenderer } from 'three'
import type { PlaceId } from '../../content/city'
import { PeopleDetail } from '../../office/scene/people'
import { prefersReducedMotion } from '../../ui/motion'
import { isLow, useGraphicsQuality } from '../../ui/graphics'
import { World } from '../../world/context'
import type { Activity } from '../../world/interaction/activity'
import {
  PlayerRig,
  type ActivityNow,
  type Controls,
  type Hands,
  type Prompt,
} from '../../world/PlayerRig'
import { ActivityEffects } from '../../world/vfx/ActivityEffects'
import { Rain } from '../../world/vfx/Rain'
import { Ticker } from './interiors/common'
import { GYM_ACTIVITIES, GYM_BOXES, GYM_SIZE, GYM_START } from './interiors/gymLayout'
import { Interior, PLAYER, type Doing, type InteriorState } from './interiors/kit'
import { CAFE, GARAGE, PARK, SHOP, type Layout } from './interiors/layouts'

const STILL = prefersReducedMotion()

export type InteriorId = Exclude<PlaceId, 'home' | 'office'>

const ROOMS = {
  cafe: lazy(() => import('./interiors/Cafe')),
  shop: lazy(() => import('./interiors/Shop')),
  gym: lazy(() => import('./interiors/Gym')),
  park: lazy(() => import('./interiors/Park')),
  garage: lazy(() => import('./interiors/Garage')),
} satisfies Record<InteriorId, unknown>

const LAYOUTS: Record<InteriorId, Layout> = {
  cafe: CAFE,
  shop: SHOP,
  park: PARK,
  garage: GARAGE,
  gym: {
    size: GYM_SIZE,
    start: GYM_START,
    boxes: GYM_BOXES,
    activities: GYM_ACTIVITIES,
    surface: 'tile',
  },
}

export interface InteriorSceneProps {
  place: InteriorId
  dark: boolean
  morning: boolean
  /** What can be done here now (the same list as the buttons). */
  doings: Doing[]
  /** Someone waiting here for a date with the player (see game/dates.ts). */
  date?: string | null
  /** The player's wedding, here today (their partner's id). */
  wedding?: string | null
  /** Keys and mouse, from the page around the view. */
  controls: RefObject<Controls>
  /** An activity asked for from the list or a ringed object. */
  request: { id: string; nonce: number } | null
  /** Asks for an activity (a ringed object was clicked). */
  onRequest: (id: string) => void
  onPrompt: (prompt: Prompt | null) => void
  onProgress: (progress: { label: string; progress: number } | null) => void
  /** An activity finished: `completed` false if it was stopped part way. */
  onDone: (action: string | null, completed: boolean) => void
  /** The 3D view is ready: activities can be handed to it. */
  onReady?: () => void
  dressed: boolean
  /** It is raining today (seen in the park). */
  raining?: boolean
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

function InteriorScene(props: InteriorSceneProps) {
  const { place, dark, morning, doings } = props
  const [software, setSoftware] = useState(false)
  const quality = useGraphicsQuality()
  const low = isLow(quality, software)
  const layout = LAYOUTS[place]
  const Room = ROOMS[place]
  const outdoors = place === 'park'
  const sky = dark
    ? '#1e293b'
    : outdoors && props.raining
      ? '#94a3b8'
      : morning
        ? '#cfe8f7'
        : '#f3c99b'
  const now = useRef<ActivityNow>({
    id: null,
    t: 0,
    x: layout.start.x,
    z: layout.start.z,
  })
  const hands = useRef<Hands>({ left: null, right: null })
  const byAction = useMemo(
    () => Object.fromEntries(doings.map((d) => [d.id, d])),
    [doings],
  )
  // Only what can be done here now (at this time of day, with what the player owns).
  const activities = useMemo(
    () => layout.activities.filter((a) => a.action === null || byAction[a.action]),
    [layout, byAction],
  )
  const state: InteriorState = useMemo(
    () => ({
      doings: byAction,
      act: props.onRequest,
      dark,
      low,
      last: null,
      date: props.date ?? null,
      wedding: props.wedding ?? null,
    }),
    [byAction, props.onRequest, dark, low, props.date, props.wedding],
  )
  const world = useMemo(() => ({ now, hands, low }), [low])
  const onDone = props.onDone
  const look = props.dressed
    ? { ...PLAYER, outfit: 'shirt' as const, top: '#dbeafe', tie: '#1e3a8a' }
    : PLAYER

  return (
    <Canvas
      key={place}
      dpr={low ? lowDpr(0.6) : [1, 1.5]}
      frameloop="demand"
      camera={{
        position: [layout.start.x, 2, layout.start.z + 3],
        fov: 60,
        near: 0.05,
        far: 120,
      }}
      gl={{ antialias: !low, powerPreference: 'default' }}
      onCreated={({ gl }: RootState) => setSoftware(isSoftware(gl))}
    >
      <Ticker fps={STILL ? 1 / 30 : low ? 4 : 12} />
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
      <World.Provider value={world}>
        <Interior.Provider value={state}>
          <PeopleDetail low={low}>
            <Suspense fallback={null}>
              <Room />
            </Suspense>
            <PlayerRig
              start={layout.start}
              boxes={layout.boxes}
              ceiling={outdoors ? undefined : layout.size.height}
              activities={activities}
              blocked={(a: Activity) =>
                a.action ? (byAction[a.action]?.blocked ?? null) : null
              }
              controls={props.controls}
              request={props.request}
              onPrompt={props.onPrompt}
              onProgress={props.onProgress}
              onDone={(a, completed) =>
                // A date's own steps (sitting together, goodnight) by their id.
                onDone(a.action ?? (a.id.startsWith('date-') ? a.id : null), completed)
              }
              look={look}
              surface={layout.surface}
              low={low}
              now={now}
              onReady={props.onReady}
              hands={hands}
            />
            <ActivityEffects activities={activities} />
            {outdoors && props.raining && <Rain low={low} />}
          </PeopleDetail>
        </Interior.Provider>
      </World.Provider>
    </Canvas>
  )
}

export default memo(InteriorScene)
