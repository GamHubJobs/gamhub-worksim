/**
 * At Westmark County Court in 3D (court/): the player walks in from the
 * street, does things at the things themselves (security, the usher, the
 * cause list, the way out) and takes their place in Court 2 for the hearing,
 * where the cast of the live scenario sits, stands, moves and speaks
 * (office/scene/ScenarioStage.tsx). Its own small scene: the office is not
 * drawn while the player is at court.
 */
import { Canvas, useFrame, type RootState } from '@react-three/fiber'
import { SceneLook } from '../world/look/SceneLook'
import { memo, useMemo, useRef, useState, type RefObject } from 'react'
import { getScenario } from '../content/scenarios'
import type { Gesture } from '../content/scenarios/types'
import { scenarioActivity } from '../game/scenarios'
import { Ticker } from '../city/scene/interiors/common'
import { PLAYER } from '../city/scene/interiors/kit'
import { playerWorkwear } from '../office/scene/workwear'
import { PeopleDetail } from '../office/scene/people'
import { ScenarioStage } from '../office/scene/ScenarioStage'
import { isLow, useGraphicsQuality } from '../ui/graphics'
import { prefersReducedMotion } from '../ui/motion'
import { World } from '../world/context'
import type { Activity } from '../world/interaction/activity'
import { lowDpr } from '../world/lowDpr'
import {
  PlayerRig,
  type ActivityNow,
  type Controls,
  type Hands,
  type Prompt,
} from '../world/PlayerRig'
import { Courthouse } from './Courthouse'
import {
  COURT_ROOM_NAMES,
  COURT_START,
  COURTHOUSE_BOXES,
  courtRoomAt,
  courthouseActivities,
  type CourtRoom,
} from './courthouseLayout'

const STILL = prefersReducedMotion()

export interface CourthouseSceneProps {
  controls: RefObject<Controls>
  request: { id: string; nonce: number } | null
  onPrompt: (prompt: Prompt | null) => void
  onProgress: (progress: { label: string; progress: number } | null) => void
  /** An activity finished (`court:…` or `scenario:…`): `completed` false if stopped part way. */
  onDone: (action: string | null, completed: boolean) => void
  onReady?: () => void
  /** Why an activity cannot be done yet, if it cannot. */
  blocked: (action: string | null) => string | null
  /** The room the player is in changed. */
  onRoom?: (room: string) => void
  /** The hearings here, by ID, comma-separated (each a place to take in court). */
  scenarios: string
  liveScenario: string | null
  liveBeat?: string
  liveSpeaker: string | null
  liveGesture?: Gesture
}

function isSoftware(gl: RootState['gl']): boolean {
  const context = gl.getContext()
  const info = context.getExtension('WEBGL_debug_renderer_info')
  const renderer = String(
    info
      ? context.getParameter(info.UNMASKED_RENDERER_WEBGL)
      : context.getParameter(context.RENDERER),
  )
  return /swiftshader|llvmpipe|software|basic render/i.test(renderer)
}

/** Reports the room the player walks into. */
function RoomWatch({
  now,
  onRoom,
}: {
  now: RefObject<ActivityNow>
  onRoom?: (room: string) => void
}) {
  const room = useRef<CourtRoom | null>(null)
  useFrame(() => {
    const here = courtRoomAt(now.current.x, now.current.z)
    if (here !== room.current) {
      room.current = here
      onRoom?.(COURT_ROOM_NAMES[here])
    }
  })
  return null
}

function CourthouseScene(props: CourthouseSceneProps) {
  const [software, setSoftware] = useState(false)
  const quality = useGraphicsQuality()
  const low = isLow(quality, software)
  const now = useRef<ActivityNow>({ id: null, t: 0, x: COURT_START.x, z: COURT_START.z })
  const hands = useRef<Hands>({ left: null, right: null })
  const world = useMemo(() => ({ now, hands, low }), [low])
  const live = props.liveScenario ? (getScenario(props.liveScenario) ?? null) : null
  const activities = useMemo<Activity[]>(() => {
    const hearings = props.scenarios.split(',').flatMap((id) => {
      const s = getScenario(id)
      return s ? [scenarioActivity(s)] : []
    })
    return [...courthouseActivities(), ...hearings]
  }, [props.scenarios])
  const { blocked, onDone } = props

  return (
    <Canvas
      dpr={low ? lowDpr(0.6) : [1, 1.5]}
      frameloop="demand"
      camera={{
        position: [COURT_START.x, 2.2, COURT_START.z - 2.5],
        fov: 50,
        near: 0.05,
        far: 80,
      }}
      gl={{ antialias: !low, powerPreference: 'default' }}
      shadows={!low}
      onCreated={({ gl }: RootState) => setSoftware(isSoftware(gl))}
      data-testid="courthouse-canvas"
    >
      <Ticker fps={STILL ? 1 / 30 : low ? 2 : 24} />
      <color attach="background" args={['#e6edf3']} />
      <SceneLook look="court" low={low} extent={13} center={[7, 0, 0]} />
      <World.Provider value={world}>
        <PeopleDetail low={low}>
          <Courthouse />
          {live && (
            <ScenarioStage
              scenario={live}
              beat={props.liveBeat ?? live.beats[0].id}
              speaker={props.liveSpeaker}
              gesture={props.liveGesture}
              boxes={COURTHOUSE_BOXES}
            />
          )}
          <PlayerRig
            start={COURT_START}
            boxes={COURTHOUSE_BOXES}
            activities={activities}
            blocked={(a) => blocked(a.action)}
            controls={props.controls}
            request={props.request}
            onPrompt={props.onPrompt}
            onProgress={props.onProgress}
            onDone={(a, completed) => onDone(a.action, completed)}
            onReady={props.onReady}
            look={playerWorkwear('courtroom', PLAYER)}
            surface="tile"
            low={low}
            now={now}
            hands={hands}
            startOrbit={{ yaw: Math.PI, pitch: 0.5, distance: 3.4 }}
            stage={live ? live.camera : null}
          />
          <RoomWatch now={now} onRoom={props.onRoom} />
        </PeopleDetail>
      </World.Provider>
    </Canvas>
  )
}

export default memo(CourthouseScene)
