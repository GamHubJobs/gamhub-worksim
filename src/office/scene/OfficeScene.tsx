/**
 * The 3D office floor of Cobalt Ridge Consulting. Loaded only when the office
 * is shown, so the rest of the app stays small and fast.
 *
 * Navigation is click-to-go: the camera glides between fixed viewpoints
 * (reception, your desk, the manager's office, the break room). Clicking a glowing
 * floor marker or an object moves there.
 */
import { Anchors } from '../../world/AnchorPoints'
import { dressed, usePlayerWear, wornUses } from '../../world/character/playerWear'
import { withOwnKit } from './ownKit'
import { BenchKit, CommsRack } from './itKit'
import { Door } from '../../world/doors/Door'
import type { AnchorSpec } from '../../world/anchors'
import { lowDpr } from '../../world/lowDpr'
import { ContactShadows, Html, useCursor } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { Vector3, type Group, type Mesh, type WebGLRenderer } from 'three'
import { activeEmployer } from '../../content/departments'
import { SceneLook } from '../../world/look/SceneLook'
import { surface, tiling } from '../../world/look/surfaces'
import { dressAll, playerWorkwear } from './workwear'
import type { LookId } from '../../world/look/looks'
import { CELEBRATION } from '../../content/workday'
import {
  activeDepartment,
  fill,
  placeText,
  workplaceKind,
} from '../../content/departments'
import { WardBay } from './ward'
import { activeBay, activeTheme, floorBoxes, roomAt, workplaceActivities } from './bays'
import { stationsFrom } from './stations'
import { TaskLamps } from './TaskLamps'
import { TeamBoard } from './TeamBoard'
import { WorkContext, workStateOf } from './workState'
import { DeskDressing } from './deskStyles'
import { SPLIT_RIGHT_WALL } from './wingShell'
import { WardWing } from './wardWing.view'
import { FabWing } from './fabWing.view'
import { LawWing } from './lawWing.view'
import { overShoulder } from './overShoulder'
import type { Activity } from '../../world/interaction/activity'
import { deskStyleFor, deskTop } from './deskStyle'
import { DevTeamArea, InsightsWall, PostRoom, RecordsRoom, Studio } from './corners'
import { PALETTE } from './themeLayout'
import { ThemeDressing } from './themes'
import { ScenarioStage } from './ScenarioStage'
import { getScenario, type Scenario } from '../../content/scenarios'
import type { Gesture } from '../../content/scenarios/types'
import { scenarioActivity } from '../../game/scenarios'
import { useFrontOnly } from './frontOnly'
import { Courtroom } from './courtroom'
import { Workshop } from './workshop'
import {
  SPOTS,
  getInteraction,
  getSpot,
  type InteractionId,
  type SpotId,
  type Vector,
} from '../../content/office'
import { COLORS } from './colors'
import { prefersReducedMotion } from '../../ui/motion'
import { PLAYER } from '../../city/scene/interiors/kit'
import {
  PlayerRig,
  type ActivityNow,
  type Controls,
  type Hands,
  type Prompt,
} from '../../world/PlayerRig'
import {
  equipmentAt,
  IT_BENCH,
  IT_CABINET,
  itActivities,
  officeActivities,
  spotAt,
  standIn,
} from './officeLayout'

/** With reduced motion, the camera jumps between places and nothing moves by itself. */
const STILL = prefersReducedMotion()
import { getDeskItem, type DeskItem } from '../../content/desk'
import { Desk, Floor, OfficeChair } from './furniture'
import { Box, Place, Plant, Sofa } from './parts'
import { PeopleDetail, type PersonLook } from './people'
import { Crowd } from '../../world/npc/Crowd'
import {
  DOOR,
  OFFICE_GATHERINGS,
  OFFICE_PEOPLE,
  OFFICE_PLACES,
  PRINTER,
  STANDING_DESK,
  officeWho,
  setStations,
  setWorkNow,
} from './officeCast'
import { isLow, useGraphicsQuality } from '../../ui/graphics'

/**
 * The people of the office, each with their own look. Who sits where is fixed;
 * names change with the department, so the looks are kept generic.
 */
const LOOKS = {
  reception: {
    skin: 4,
    hair: 'long',
    hairColor: 0,
    outfit: 'blouse',
    top: '#9f1239',
    trousers: '#1f2937',
    smile: true,
  },
  senior: {
    skin: 5,
    hair: 'short',
    hairColor: 1,
    outfit: 'shirt',
    top: '#0f766e',
    sleeves: 'rolled',
    trousers: '#334155',
    glasses: true,
  },
  backLeft: {
    skin: 1,
    hair: 'bob',
    hairColor: 2,
    outfit: 'cardigan',
    top: '#6d28d9',
    under: '#f1f5f9',
    trousers: '#27272a',
    height: 0.96,
    build: 'slim',
  },
  backMiddle: {
    skin: 6,
    hair: 'curly',
    hairColor: 0,
    outfit: 'sweater',
    top: '#a16207',
    trousers: '#3f3f46',
    build: 'broad',
    smile: true,
  },
  backRight: {
    skin: 0,
    hair: 'side',
    hairColor: 4,
    outfit: 'shirt',
    top: '#dbeafe',
    tie: '#1e3a8a',
    trousers: '#1e293b',
    glasses: true,
    height: 1.04,
  },
  filing: {
    skin: 3,
    hair: 'crop',
    hairColor: 5,
    outfit: 'polo',
    top: '#15803d',
    trousers: '#57534e',
    beard: true,
    build: 'broad',
  },
  manager: {
    skin: 2,
    hair: 'bun',
    hairColor: 1,
    outfit: 'blazer',
    top: '#1e293b',
    under: '#f8fafc',
    trousers: '#1e293b',
    smile: true,
  },
  facilities: {
    skin: 0,
    hair: 'short',
    hairColor: 3,
    outfit: 'shirt',
    top: '#b45309',
    sleeves: 'rolled',
    trousers: '#44403c',
    beard: true,
    build: 'broad',
    height: 1.05,
    smile: true,
  },
  lunch: {
    skin: 7,
    hair: 'ponytail',
    hairColor: 0,
    outfit: 'sweater',
    top: '#4338ca',
    trousers: '#1f2937',
    smile: true,
  },
  walker: {
    skin: 5,
    hair: 'long',
    hairColor: 3,
    outfit: 'blazer',
    top: '#7f1d1d',
    under: '#e0f2fe',
    trousers: '#262626',
    height: 0.97,
  },
} satisfies Record<string, PersonLook>

/** Who looks like whom, by their place in the office's cast. */
const CAST_LOOKS: Record<string, PersonLook> = {
  reception: LOOKS.reception,
  manager: LOOKS.manager,
  senior: LOOKS.senior,
  facilities: LOOKS.facilities,
  backL: LOOKS.backLeft,
  backM: LOOKS.backMiddle,
  backR: LOOKS.backRight,
  front2: {
    ...LOOKS.senior,
    top: '#be123c',
    skin: 4,
    hair: 'bob',
    hairColor: 2,
    glasses: false,
  },
  coordinator: LOOKS.walker,
  admin: LOOKS.filing,
  analyst: LOOKS.lunch,
  starter: {
    ...LOOKS.lunch,
    skin: 2,
    hair: 'ponytail',
    hairColor: 3,
    top: '#0891b2',
    glasses: false,
  },
}

export interface OfficeSceneProps {
  spot: SpotId
  /** Highlights the computer when there is something new to read. */
  computerAlert: boolean
  /** The team board, written up from the save (workBoard.ts), as JSON. */
  board?: string
  playerName: string
  /** The items on the player's desk, by ID, comma-separated (a string so the scene only redraws when they change). */
  desk: string
  onGo: (spot: SpotId) => void
  onInteract: (interaction: InteractionId) => void
  /** Who the player is talking to (a colleague ID), so they face the player and talk. */
  talkingTo?: string | null
  /** Colleagues who have come over to the player's desk, by where they wait. */
  callers?: Record<string, string>
  /** A promotion letter waits on the manager's desk. */
  letter?: boolean
  /** The office clock, for where everyone is (a day number and minutes since midnight). */
  day: number
  minute: number
  /** Walking the office in third person (instead of the camera moving between areas). */
  walk?: OfficeWalk
  /**
   * Hands-on IT work waiting in the office, as JSON (a string so the scene
   * only redraws when it changes): [{ target, kind, name }] (see game/fieldJobs.ts).
   */
  itJobs?: string
  /** The live scenarios on offer here, by ID, comma-separated (each a place to take). */
  scenarios?: string
  /** A live scenario being played: its ID, the beat, who is speaking and how. */
  liveScenario?: string | null
  liveBeat?: string
  liveSpeaker?: string | null
  liveGesture?: Gesture
  /**
   * A tool open where it is (office/InPlaceTool.tsx): the action of the thing it
   * was opened at. The camera closes in over the player's shoulder on it.
   */
  focus?: string | null
}

export interface ItJobMark {
  target: string
  kind: 'cabinet' | 'collect' | 'repair' | 'return' | 'build'
  /** The colleague's name, for a desk. */
  name: string
}

const readJobs = (json: string | undefined): ItJobMark[] => {
  try {
    return json ? (JSON.parse(json) as ItJobMark[]) : []
  } catch {
    return []
  }
}

export interface OfficeWalk {
  controls: RefObject<Controls>
  request: { id: string; nonce: number } | null
  onPrompt: (prompt: Prompt | null) => void
  onProgress: (progress: { label: string; progress: number } | null) => void
  /** An activity finished (`completed` false if it was stopped part way). */
  onDone: (action: string | null, completed: boolean) => void
  onReady: () => void
  /** The player walked into another area. */
  onArea: (spot: SpotId) => void
  /** The player walked into or out of a room within an area (null: the open floor). */
  onRoom?: (room: string | null) => void
  /** Why something cannot be done now (a meeting that is not on), or null. */
  blocked?: (action: string | null) => string | null
}

/**
 * Computers without a graphics card draw 3D in software, which is slow. They
 * get fewer frames per second and no soft shadows, so the rest of the app
 * stays responsive.
 */
function isSoftwareContext(
  context: WebGLRenderingContext | WebGL2RenderingContext,
): boolean {
  const info = context.getExtension('WEBGL_debug_renderer_info')
  const renderer = String(
    info
      ? context.getParameter(info.UNMASKED_RENDERER_WEBGL)
      : context.getParameter(context.RENDERER),
  )
  return /swiftshader|llvmpipe|software|basic render/i.test(renderer)
}

function isSoftwareRenderer(gl: WebGLRenderer): boolean {
  return isSoftwareContext(gl.getContext())
}

/**
 * Only redrawn when what it shows changes (where the player stands, the mail
 * alert), not on every change to the career, such as the clock moving.
 */
export default memo(OfficeScene, sameProps)

/** The same scene if every prop is the same, comparing the walking settings by their contents. */
/**
 * The building, its rooms and furniture. Redrawn only when what they show
 * changes (the desk, the mail alert, the work board), not every game minute
 * as the people about are.
 */
const Premises = memo(function Premises({
  playerName,
  computerAlert,
  desk,
  board,
  onInteract,
  itJobs,
}: {
  playerName: string
  computerAlert: boolean
  desk: string
  board: string
  onInteract: Interact['onInteract']
  itJobs?: string
}) {
  return (
    <>
      <Building playerName={playerName} />
      <Reception />
      <Workspace
        computerAlert={computerAlert}
        desk={desk}
        board={board}
        onInteract={onInteract}
      />
      <ManagerOffice />
      <CornerFor itJobs={itJobs} />
      <WingFor />
      <ThemeDressing theme={activeTheme()} />
      <TaskLamps theme={activeTheme()} />
      <BreakRoom onInteract={onInteract} />
    </>
  )
})

function sameProps(a: OfficeSceneProps, b: OfficeSceneProps): boolean {
  for (const key of Object.keys({ ...a, ...b }) as Array<keyof OfficeSceneProps>) {
    if (key === 'walk') {
      const x = a.walk
      const y = b.walk
      if (!x || !y) {
        if (x !== y) return false
        continue
      }
      for (const k of Object.keys({ ...x, ...y }) as Array<keyof OfficeWalk>)
        if (!Object.is(x[k], y[k])) return false
    } else if (!Object.is(a[key], b[key])) return false
  }
  return true
}

function OfficeScene(props: OfficeSceneProps) {
  const live = props.liveScenario ? (getScenario(props.liveScenario) ?? null) : null
  // Who everyone is (names follow the department).
  const who = useMemo(() => officeWho(), [])
  // Where colleagues do this profession's work: the workplace's own equipment
  // (stations.ts), before their day is planned.
  useState(() => {
    const bay = activeBay()
    const own = [
      ...workplaceActivities(bay, activeTheme()),
      ...(bay ? [] : itActivities([])),
    ]
    setStations(stationsFrom(own))
    // Development builds: where each of the workplace's activities is done (tests).
    if (import.meta.env.DEV)
      (window as unknown as { __worksimEquipment?: unknown }).__worksimEquipment =
        own.map((a) => ({ id: a.id, ...a.anchor }))
    return true
  })
  // Dressed for the workplace: scrubs on the ward, hi-vis in the workshop, suits at a law firm.
  const castLooks = useMemo(() => dressAll(workplaceKind(), CAST_LOOKS), [])
  const start = getSpot(props.spot).camera
  // How the team's work stands (from the save), for the things on the floor that show it.
  const work = useMemo(() => workStateOf(props.board), [props.board])
  // Colleagues respond to how the work stands (work sent back: a word about it).
  useEffect(() => setWorkNow(work), [work])
  // What the computer can do, and the player's choice in Settings.
  const [software, setLowPower] = useState(false)
  const quality = useGraphicsQuality()
  const lowPower = isLow(quality, software)
  // Shadows, reflections and contact shadows are costly to build: they wait until
  // the graphics have been checked, so a computer without a graphics card never
  // has to build them first.
  const [checked, setChecked] = useState(false)
  const full = checked && !lowPower
  return (
    <Canvas
      // Software 3D draws at a lower resolution: much faster, slightly softer.
      dpr={lowPower ? lowDpr() : [1, 1.5]}
      frameloop="demand"
      shadows={full}
      camera={{ position: start.position, fov: 45, near: 0.1, far: 80 }}
      gl={{ antialias: true, powerPreference: 'default' }}
      onCreated={({ gl }) => {
        setLowPower(isSoftwareRenderer(gl))
        setChecked(true)
      }}
      data-lowpower={lowPower}
    >
      {/* Still scenes only redraw now and then, to keep the wall clock right. In software
          3D a frame takes about a quarter of a second, so the gentle movement is
          drawn once a second, leaving the computer free for the apps; anything that
          changes (the camera moving, a conversation) is still drawn at once. */}
      <Ticker fps={STILL ? 1 / 30 : lowPower ? 1 : 30} />
      <color attach="background" args={['#e6edf3']} />
      <SceneLook look={officeLook()} low={!full} extent={18} center={[4, 0, 0]} />
      {full && !STILL && <SlowWatch onSlow={() => setLowPower(true)} />}
      {props.walk ? (
        <OfficeWalker
          walk={props.walk}
          spot={props.spot}
          low={lowPower}
          itJobs={props.itJobs}
          scenarios={props.scenarios}
          stage={live ? live.camera : null}
          focus={props.focus ?? null}
          cake={cakeOn(props.day, props.minute)}
        />
      ) : (
        <CameraRig spot={props.spot} />
      )}
      <PeopleDetail low={lowPower}>
        <WorkContext.Provider value={work}>
          <Premises
            playerName={props.playerName}
            computerAlert={props.computerAlert}
            desk={props.desk}
            board={props.board ?? ''}
            onInteract={props.onInteract}
            itJobs={props.itJobs}
          />
        </WorkContext.Provider>
        {live && (
          <ScenarioStage
            scenario={live}
            beat={props.liveBeat ?? live.beats[0].id}
            speaker={props.liveSpeaker ?? null}
            gesture={props.liveGesture}
          />
        )}
        <Crowd
          people={OFFICE_PEOPLE}
          places={OFFICE_PLACES}
          gatherings={OFFICE_GATHERINGS}
          door={DOOR}
          day={props.day}
          minute={props.minute}
          looks={castLooks}
          talkingTo={props.talkingTo}
          callers={props.callers}
          low={lowPower}
          who={who}
        />
      </PeopleDetail>
      {props.letter && <PromotionLetter />}
      {cakeOn(props.day, props.minute) && <FridayCake />}
      {SPOTS.map((s) => (
        <Marker
          key={s.id}
          hidden={s.id === props.spot}
          position={s.marker}
          label={fill(placeText(s).name)}
          onClick={() => props.onGo(s.id)}
        />
      ))}
      {full && (
        <ContactShadows
          position={[0, 0.011, 0]}
          scale={30}
          opacity={0.3}
          blur={2.4}
          far={3}
          resolution={1024}
          frames={1}
        />
      )}
    </Canvas>
  )
}

/** The light of the workplace: clinical on the ward, a workshop's, a law firm's, or an office's. */
function officeLook(): LookId {
  const kind = workplaceKind()
  if (kind === 'ward') return 'clinical'
  if (kind === 'workshop') return 'workshop'
  if (kind === 'courtroom') return 'law'
  return 'office'
}

/**
 * Some browsers hide which graphics the computer has (Firefox and Safari do,
 * for privacy), so a computer drawing 3D in software is not always
 * recognised. This watches the first frames instead: if the office draws at
 * fewer than about seven frames a second, it switches to the simpler office.
 */
function SlowWatch({ onSlow }: { onSlow: () => void }) {
  const samples = useRef<number[]>([])
  const done = useRef(false)
  useFrame((_, delta) => {
    if (done.current) return
    // A hidden tab pauses drawing: those gaps say nothing about speed.
    if (document.visibilityState !== 'visible' || delta > 2) return
    samples.current.push(delta)
    // The first frames include building shaders: they do not count.
    if (samples.current.length < 28) return
    done.current = true
    const sorted = samples.current.slice(6).sort((a, b) => a - b)
    if (sorted[Math.floor(sorted.length / 2)] > 0.15) onSlow()
  })
  return null
}

/**
 * Draws a new frame a fixed number of times per second. The office only needs
 * gentle movement, so this is far lighter than drawing as fast as possible.
 */
function Ticker({ fps }: { fps: number }) {
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    invalidate()
    const timer = window.setInterval(() => invalidate(), 1000 / fps)
    return () => window.clearInterval(timer)
  }, [fps, invalidate])
  return null
}

/** Glides the camera to the current viewpoint (or jumps, with reduced motion). */
function CameraRig({ spot }: { spot: SpotId }) {
  const camera = useThree((state) => state.camera)
  const invalidate = useThree((state) => state.invalidate)
  const goal = useMemo(() => getSpot(spot).camera, [spot])
  const target = useRef(new Vector3(...goal.target))
  const goalPosition = useMemo(() => new Vector3(...goal.position), [goal])
  const goalTarget = useMemo(() => new Vector3(...goal.target), [goal])

  useFrame((_, delta) => {
    const step = STILL ? 1 : 1 - Math.exp(-delta * 3)
    camera.position.lerp(goalPosition, step)
    target.current.lerp(goalTarget, step)
    camera.lookAt(target.current)
    // Keep drawing smoothly until the camera has arrived.
    if (
      camera.position.distanceToSquared(goalPosition) > 1e-5 ||
      target.current.distanceToSquared(goalTarget) > 1e-5
    ) {
      invalidate()
    }
  })
  return null
}

/** The player in the office: walks about, and does things in person. */

function OfficeWalker({
  walk,
  spot,
  low,
  itJobs,
  scenarios,
  stage,
  focus,
  cake,
}: {
  walk: OfficeWalk
  spot: SpotId
  low: boolean
  itJobs?: string
  scenarios?: string
  stage: Scenario['camera'] | null
  focus: string | null
  /** The team's Friday cake is on (its place in the break room is offered only then). */
  cake: boolean
}) {
  // The trainee dressed for the workplace (scrubs, hi-vis, a suit, office clothes).
  // With the accessories they wear (playerWear.ts).
  const worn = usePlayerWear()
  const kitKey = [...wornUses(worn)].sort().join(',')
  // (Only when what the worn things do changes.)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const kitUses = useMemo(() => wornUses(worn), [kitKey])
  const playerLook = useMemo(
    () => dressed(playerWorkwear(workplaceKind(), PLAYER), worn),
    [worn],
  )
  const now = useRef<ActivityNow>({ id: null, t: 0, x: 0, z: 0 })
  const hands = useRef<Hands>({ left: null, right: null })
  const [start] = useState(() => standIn(spot))
  const [base] = useState(officeActivities)
  // The IT corner is always there; a colleague's desk only while their laptop waits.
  const activities = useMemo(() => {
    const desks = readJobs(itJobs).flatMap((j) =>
      (j.kind === 'collect' || j.kind === 'return') && j.target.startsWith('person:')
        ? [{ person: j.target.slice('person:'.length), kind: j.kind, name: j.name }]
        : [],
    )
    const bay = activeBay()
    const own = workplaceActivities(bay, activeTheme())
    const live = (scenarios ?? '').split(',').flatMap((id) => {
      const s = getScenario(id)
      return s ? [scenarioActivity(s)] : []
    })
    // With the player's own equipment (ownKit.ts): a stethoscope at the bedside, a badge at reception.
    return withOwnKit(
      [
        ...base.filter((a) => a.action !== 'celebration' || cake),
        ...own,
        ...live,
        ...(bay ? [] : itActivities(desks)),
      ],
      kitUses,
    )
  }, [base, itJobs, scenarios, cake, kitUses])
  // A tool open at a thing: over the shoulder, the thing to the left of the
  // frame (which takes the right of the view). Worked out once, where the
  // player stands when it opens.
  const focusView = useMemo(() => {
    if (!focus) return null
    // Where each such activity ends (its last stage's own spot, if it moves on,
    // e.g. from the gloves trolley to the bed): the one the player is at.
    const endOf = (a: Activity) =>
      [...a.stages].reverse().find((s) => s.at)?.at ?? a.anchor
    const away = (a: Activity) =>
      Math.hypot(endOf(a).x - now.current.x, endOf(a).z - now.current.z)
    const near = activities
      .filter((a) => a.action === focus)
      .sort((a, b) => away(a) - away(b))[0]
    return near ? overShoulder(endOf(near)) : null
    // Only when a tool opens or closes, not as the player's place changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus])
  const area = useRef<SpotId>(spot)
  const onArea = walk.onArea
  const room = useRef<string | null>(null)
  const onRoom = walk.onRoom
  // A new area counts once the player has been in it for a moment (so standing on
  // a boundary does not flip between two, each costing office time).
  const entering = useRef<{ spot: SpotId; since: number } | null>(null)
  useFrame((_, dt) => {
    if (now.current.x === 0 && now.current.z === 0) return
    const inRoom = roomAt(now.current.x, now.current.z, activeBay(), activeTheme())
    if (inRoom !== room.current) {
      room.current = inRoom
      onRoom?.(inRoom)
    }
    const here = spotAt(now.current.x, now.current.z)
    if (here === area.current) {
      entering.current = null
      return
    }
    if (entering.current?.spot !== here) entering.current = { spot: here, since: 0 }
    entering.current.since += dt
    if (entering.current.since > 0.35) {
      area.current = here
      entering.current = null
      onArea(here)
    }
  })
  return (
    <PlayerRig
      start={start}
      // Arriving at reception: in through the automatic doors (they part for them).
      arrive={spot === 'reception' ? ENTRANCE_IN : undefined}
      boxes={floorBoxes()}
      activities={activities}
      blocked={(a) => walk.blocked?.(a.action) ?? null}
      controls={walk.controls}
      request={walk.request}
      onPrompt={walk.onPrompt}
      onProgress={walk.onProgress}
      onDone={(a, completed) => walk.onDone(a.action, completed)}
      onReady={walk.onReady}
      look={playerLook}
      surface="carpet"
      low={low}
      now={now}
      hands={hands}
      startOrbit={{ yaw: 0.5, pitch: 0.5, distance: 4.2 }}
      stage={stage ?? focusView}
    />
  )
}

/** A glowing ring on the floor: click it to walk there. */
function Marker({
  position,
  label,
  hidden,
  onClick,
}: {
  position: Vector
  label: string
  hidden: boolean
  onClick: () => void
}) {
  const ring = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered && !hidden)
  useFrame(({ clock }) => {
    if (STILL) return
    if (ring.current)
      ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2.5) * 0.08)
  })
  return (
    <group
      position={position}
      visible={!hidden}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        if (hidden) return
        event.stopPropagation()
        onClick()
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        if (hidden) return
        event.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.32, 0.46, 40]} />
        <meshBasicMaterial
          color={hovered ? '#2563eb' : '#3b82f6'}
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <circleGeometry args={[0.3, 32]} />
        <meshBasicMaterial color="#93c5fd" transparent opacity={hovered ? 0.6 : 0.3} />
      </mesh>
      {hovered && !hidden && (
        <Html
          position={[0, 0.5, 0]}
          center
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <span className="rounded-full bg-blue-700 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white shadow">
            Go to {label}
          </span>
        </Html>
      )}
    </group>
  )
}

/** Wraps an object the player can use: highlights it and shows its name on hover. */
function Interactive({
  id,
  labelPosition,
  onInteract,
  children,
}: {
  id: InteractionId
  labelPosition: Vector
  onInteract: (id: InteractionId) => void
  children: ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const interaction = getInteraction(id)
  return (
    <group
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        onInteract(id)
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      {children}
      {hovered && (
        <Html
          position={labelPosition}
          center
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <span className="rounded-md bg-slate-900/90 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white shadow-lg">
            {fill(interaction.label)}
          </span>
        </Html>
      )}
    </group>
  )
}

// ---------------------------------------------------------------------------
// The workplace's own wing, beyond the right-hand wall (wingShell.ts)
function WingFor() {
  const kind = activeBay()?.kind
  if (kind === 'ward') return <WardWing />
  if (kind === 'workshop') return <FabWing />
  if (kind === 'courtroom') return <LawWing />
  return null
}

// The building
// ---------------------------------------------------------------------------

const WALL_HEIGHT = 2.9

function Building({ playerName }: { playerName: string }) {
  return (
    <group>
      {/* Floors: wooden planks, with carpet tiles in the workspace */}
      {PALETTE[activeTheme()].floor ? (
        // Sheet vinyl on a ward, polished concrete in an engineering office.
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.004, 0.5]}
          material={surface(
            activeTheme() === 'hospital' ? 'vinyl' : 'concrete',
            PALETTE[activeTheme()].floor!,
            tiling(24, 17, activeTheme() === 'hospital' ? 4 : 3),
          )}
          userData={{ floor: true }}
        >
          <planeGeometry args={[24, 17]} />
        </mesh>
      ) : (
        <Floor kind="wood" position={[0, 0, 0.5]} size={[24, 17]} />
      )}
      {PALETTE[activeTheme()].workspace ? (
        // The workspace: a vinyl zone on the ward, carpet tiles elsewhere.
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0.8, 0.002, 0.6]}
          material={surface(
            activeTheme() === 'hospital' ? 'vinyl' : 'carpet',
            PALETTE[activeTheme()].workspace!,
            tiling(8.6, 6.4, activeTheme() === 'hospital' ? 4 : 0.6),
          )}
          userData={{ floor: true }}
        >
          <planeGeometry args={[8.6, 6.4]} />
        </mesh>
      ) : (
        <Floor kind="carpet" position={[0.8, 0.005, 0.6]} size={[8.6, 6.4]} />
      )}
      {/* Back wall with large windows and a city skyline */}
      <Box
        size={[24, WALL_HEIGHT, 0.2]}
        position={[0, WALL_HEIGHT / 2, -8]}
        color={COLORS.wall}
      />
      {[-9, -3, 3, 9].map((x) => (
        <group key={x}>
          <Box
            size={[4.6, 1.9, 0.05]}
            position={[x, 1.55, -7.88]}
            color="#dbeafe"
            emissive="#bfdbfe"
          />
          <Box
            size={[0.06, 1.9, 0.08]}
            position={[x, 1.55, -7.86]}
            color={COLORS.metal}
          />
        </group>
      ))}
      <Skyline />
      {/* Side walls */}
      <Box
        size={[0.2, WALL_HEIGHT, 17]}
        position={[-12, WALL_HEIGHT / 2, 0.5]}
        color={COLORS.wall}
      />
      {activeBay()?.wing ? (
        // The ward goes on through a doorway into its wing (wardWing.ts).
        SPLIT_RIGHT_WALL.map((w) => (
          <Box
            key={w.z}
            size={[0.2, WALL_HEIGHT, w.hz * 2]}
            position={[12, WALL_HEIGHT / 2, w.z]}
            color={COLORS.wall}
          />
        ))
      ) : (
        <Box
          size={[0.2, WALL_HEIGHT, 17]}
          position={[12, WALL_HEIGHT / 2, 0.5]}
          color={COLORS.wall}
        />
      )}
      {/* Skirting */}
      <Box size={[24, 0.1, 0.22]} position={[0, 0.05, -7.88]} color="#cbd5e1" />
      <Clock position={[0.8, 2.45, -7.88]} />
      <Html
        transform
        position={[0.8, 1.95, -7.87]}
        distanceFactor={4}
        pointerEvents="none"
        zIndexRange={[10, 0]}
      >
        <span className="text-[10px] font-semibold tracking-[0.3em] text-slate-500 uppercase">
          {activeDepartment().name}
        </span>
      </Html>
      {/* Small personal touch at the player's desk */}
      <Html
        transform
        position={[0.6, 0.79, 1.42]}
        rotation={[-Math.PI / 2, 0, 0]}
        distanceFactor={2.5}
        pointerEvents="none"
        zIndexRange={[10, 0]}
      >
        <span className="pointer-events-none rounded-sm bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-700 shadow">
          {playerName}
        </span>
      </Html>
    </group>
  )
}

function Skyline() {
  const buildings = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const x = -12 + i * 1.15 + ((i * 37) % 7) * 0.08
        const height = 3 + ((i * 53) % 11) * 0.7
        return { x, height, shade: i % 3 }
      }),
    [],
  )
  return (
    <group position={[0, 0, -14]}>
      {buildings.map((b, i) => (
        <Box
          key={i}
          size={[1, b.height, 1]}
          position={[b.x, b.height / 2 - 0.6, (i % 2) * -1.5]}
          color={['#9fb3c8', '#b4c5d6', '#8aa0b6'][b.shade]}
        />
      ))}
    </group>
  )
}

/** A wall clock that shows the real time. */
function Clock({ position }: { position: Vector }) {
  const hours = useRef<Mesh>(null)
  const minutes = useRef<Mesh>(null)
  useFrame(() => {
    const now = new Date()
    const m = now.getMinutes() + now.getSeconds() / 60
    const h = (now.getHours() % 12) + m / 60
    if (minutes.current) minutes.current.rotation.z = -(m / 60) * Math.PI * 2
    if (hours.current) hours.current.rotation.z = -(h / 12) * Math.PI * 2
  })
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.04, 32]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.005]}>
        <torusGeometry args={[0.3, 0.025, 8, 32]} />
        <meshStandardMaterial color={COLORS.metal} />
      </mesh>
      <mesh ref={hours} position={[0, 0, 0.03]}>
        <boxGeometry args={[0.025, 0.16, 0.01]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh ref={minutes} position={[0, 0, 0.035]}>
        <boxGeometry args={[0.018, 0.24, 0.01]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------------------
// Areas
// ---------------------------------------------------------------------------

type Interact = { onInteract: (id: InteractionId) => void }

// Where people use things in the office (see world/anchors.ts), in each thing's own space.
const PRINTER_ANCHORS: AnchorSpec[] = [
  { kind: 'printer', at: [0.22, 0.88, 0.3], carry: { left: 'document' } },
]
const FILING_ANCHORS: AnchorSpec[] = [
  { kind: 'shelf', at: [0, 0.95, 0.32], carry: { left: 'document' } },
]
const LAPTOP_ANCHORS: AnchorSpec[] = [{ kind: 'keyboard', at: [-0.15, 1.125, 0.1] }]
const WHITEBOARD_ANCHORS: AnchorSpec[] = [{ kind: 'whiteboard', at: [0, 1.45, 0.1] }]
const WATER_ANCHORS: AnchorSpec[] = [
  { kind: 'water', at: [0, 0.95, 0.22], carry: { left: 'cup' } },
]
const KITCHEN_ANCHORS: AnchorSpec[] = [
  { kind: 'coffee-machine', at: [-9.6, 1.05, -7.22], carry: { left: 'cup' } },
  { kind: 'counter', at: [-10.4, 0.95, -7.2] },
  { kind: 'counter', at: [-8.4, 0.95, -7.2] },
]
const RECEPTION_ANCHORS: AnchorSpec[] = [{ kind: 'counter', at: [-6.4, 1.1, 3.85] }]
const MANAGER_ANCHORS: AnchorSpec[] = [
  { kind: 'keyboard', at: [8.4, 0.8, -4.62], heading: Math.PI },
]
const BOOKSHELF_ANCHORS: AnchorSpec[] = [
  { kind: 'shelf', at: [0, 1.0, 0.25], carry: { left: 'document' } },
]

const RECEPTION_SIGN: [number, number, number] = [-6.6, 1.95, 2.4]

/** Whether the team's Friday cake is on (or about to be: the cake is put out first). */
function cakeOn(day: number, minute: number): boolean {
  return (
    CELEBRATION.days.includes((((day - 1) % 7) + 7) % 7) &&
    minute >= CELEBRATION.start - 5 &&
    minute < CELEBRATION.start + CELEBRATION.minutes
  )
}

/** The Friday cake on the break room table, with plates round it (game/celebration.ts). */
function FridayCake() {
  return (
    <group position={[-7.4, 0.75, -3.6]}>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.12, 24]} />
        <meshStandardMaterial color="#fbcfe8" />
      </mesh>
      <mesh position={[0, 0.135, 0]}>
        <cylinderGeometry args={[0.175, 0.175, 0.012, 24]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.sin(a) * 0.45, 0.01, Math.cos(a) * 0.45]}>
            <cylinderGeometry args={[0.08, 0.08, 0.01, 16]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
        )
      })}
    </group>
  )
}

/** The promotion letter on the manager's desk, turned to the visitor's chairs. */
function PromotionLetter() {
  return (
    <group position={[8.75, 0.79, -4.12]} rotation={[0, 0.25, 0]}>
      <Box size={[0.22, 0.004, 0.3]} position={[0, 0.002, 0]} color="#f8fafc" />
      {/* The letterhead and the signature */}
      <Box size={[0.16, 0.002, 0.03]} position={[0, 0.005, -0.11]} color="#1d4ed8" />
      <Box size={[0.08, 0.002, 0.012]} position={[0.03, 0.005, 0.1]} color="#334155" />
      {/* The envelope it came in */}
      <Box
        size={[0.24, 0.006, 0.12]}
        position={[-0.2, 0.003, 0.08]}
        rotation={-0.3}
        color="#e7d8b5"
      />
    </group>
  )
}

function Reception() {
  // The name faces the entrance; from behind (the staff side) it is hidden.
  const sign = useRef<HTMLDivElement>(null)
  useFrontOnly(sign, RECEPTION_SIGN, 0)
  return (
    <group>
      {/* Feature wall with the company name: painted in the accent on the entrance
          side; the back (the break room's side) is plain wall, with two framed prints */}
      <Box size={[5.2, 2.7, 0.16]} position={[-6.6, 1.35, 2.3]} color={COLORS.wall} />
      <Box
        size={[5.2, 2.7, 0.02]}
        position={[-6.6, 1.35, 2.39]}
        color={PALETTE[activeTheme()].accent}
      />
      {[-7.8, -5.4].map((x, i) => (
        <group key={x} position={[x, 1.6, 2.205]}>
          <Box size={[0.9, 0.65, 0.03]} position={[0, 0, 0]} color="#1f2937" />
          <Box
            size={[0.78, 0.53, 0.01]}
            position={[0, 0, -0.02]}
            color={i ? '#93c5fd' : '#fcd34d'}
          />
        </group>
      ))}
      <Html
        transform
        position={RECEPTION_SIGN}
        distanceFactor={4}
        pointerEvents="none"
        zIndexRange={[10, 0]}
      >
        <div ref={sign} className="text-center text-white">
          <p className="text-2xl font-bold tracking-wide">{activeEmployer().name}</p>
          <p
            className={`text-[9px] tracking-[0.4em] uppercase ${PALETTE[activeTheme()].accentText}`}
          >
            {activeDepartment().employer
              ? activeDepartment().sign
              : 'Consulting · Finance · Advisory'}
          </p>
        </div>
      </Html>
      {/* Reception desk */}
      <Box
        size={[3.2, 1.05, 0.7]}
        position={[-6.6, 0.53, 4.2]}
        color="#ffffff"
        radius={0.05}
      />
      <Box
        size={[3.4, 0.05, 0.85]}
        position={[-6.6, 1.08, 4.15]}
        color={COLORS.wood}
        radius={0.02}
      />
      <Box
        size={[3.2, 0.12, 0.02]}
        position={[-6.6, 0.35, 4.56]}
        color={PALETTE[activeTheme()].accent}
      />
      <Box size={[0.5, 0.32, 0.03]} position={[-7.3, 1.28, 3.95]} color={COLORS.screen} />
      <Anchors specs={RECEPTION_ANCHORS} />
      {/* Waiting area */}
      <Sofa position={[-10.2, 0, 6.6]} rotation={Math.PI / 2} />
      <Box
        size={[0.8, 0.38, 0.8]}
        position={[-8.9, 0.19, 6.6]}
        color={COLORS.wood}
        radius={0.04}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-9.6, 0.008, 6.6]}>
        <circleGeometry args={[1.6, 40]} />
        <meshStandardMaterial color="#cbd5e1" roughness={1} />
      </mesh>
      <Plant position={[-11.2, 0, 4.0]} scale={1.3} />
      <Plant position={[-3.7, 0, 3.0]} scale={1.1} />
      {/* The entrance: automatic glass doors, parting for anyone who comes up to
          them, and for the player arriving in the morning (world/doors) */}
      <Door
        position={[-11.86, 0, 7.4]}
        rotation={Math.PI / 2}
        kind="automatic"
        width={2.2}
        height={2.3}
        leaf="glass"
        frame="#64748b"
        sense={2.2}
        openAtStart={2}
      />
    </group>
  )
}

/** The items the player has put on their desk (earned through achievements and promotions). */
function DeskDecor({ items }: { items: DeskItem[] }) {
  const of = (slot: DeskItem['slot']) => items.find((i) => i.slot === slot)
  const plant = of('plant')
  const lamp = of('lamp')
  const frame = of('frame')
  const board = of('board')
  const top = 0.765
  return (
    <group>
      {plant && (
        <group position={[1.18, top, 0.92]} scale={plant.id === 'monstera' ? 1.5 : 1}>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.07, 0.055, 0.12, 12]} />
            <meshStandardMaterial color={COLORS.pot} roughness={0.9} />
          </mesh>
          {(plant.id === 'succulent'
            ? [[0, 0.16, 0, 0.07]]
            : [
                [0, 0.2, 0, 0.09],
                [0.05, 0.28, 0.02, 0.07],
                [-0.05, 0.3, -0.02, 0.06],
              ]
          ).map(([x, y, z, r], i) => (
            <mesh key={i} position={[x, y, z]}>
              <icosahedronGeometry args={[r, 1]} />
              <meshStandardMaterial color={plant.color} flatShading roughness={0.9} />
            </mesh>
          ))}
        </group>
      )}
      {lamp && (
        <group position={[0.02, top, 0.9]}>
          <mesh position={[0, 0.01, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.02, 16]} />
            <meshStandardMaterial color={lamp.color} metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.38, 8]} />
            <meshStandardMaterial color={lamp.color} metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0.05, 0.38, 0.03]} rotation={[0.4, 0, -0.5]}>
            <coneGeometry args={[0.07, 0.11, 16, 1, true]} />
            <meshStandardMaterial color={lamp.color} metalness={0.4} roughness={0.5} />
          </mesh>
        </group>
      )}
      {frame && (
        <group position={[0.98, top, 1.0]} rotation={[0, -0.5, 0]}>
          <Box size={[0.16, 0.12, 0.015]} position={[0, 0.07, 0]} color={frame.color} />
          <Box size={[0.13, 0.09, 0.005]} position={[0, 0.07, 0.009]} color="#bae6fd" />
        </group>
      )}
      {board && (
        <group position={[0.6, 1.35, 0.36]}>
          <Box size={[0.8, 0.42, 0.02]} position={[0, 0, 0]} color={board.color} />
          {[
            [-0.25, 0.08, '#fde68a'],
            [-0.05, -0.06, '#bbf7d0'],
            [0.18, 0.07, '#bfdbfe'],
            [0.28, -0.08, '#fecaca'],
          ].map(([x, y, color]) => (
            <Box
              key={String(color)}
              size={[0.12, 0.1, 0.005]}
              position={[Number(x), Number(y), 0.013]}
              color={String(color)}
            />
          ))}
        </group>
      )}
    </group>
  )
}

function Workspace({
  computerAlert,
  desk,
  board,
  onInteract,
}: Interact & { computerAlert: boolean; desk: string; board: string }) {
  const items = desk
    .split(',')
    .flatMap((id) => (getDeskItem(id) ? [getDeskItem(id)!] : []))
  const mug = items.find((i) => i.slot === 'mug')?.color
  const chair = items.find((i) => i.slot === 'chair')?.color ?? '#1d4ed8'
  // Two rows of desks, back to back. The player's desk is front row, middle.
  const front = [-1.2, 0.6, 2.4]
  const back = [-1.2, 0.6, 2.4]
  // Each workplace's own desks (deskStyles.tsx); the player's keeps its computer.
  const theme = activeTheme()
  const mine = deskStyleFor(theme, true)
  const theirs = deskStyleFor(theme, false)
  return (
    <group>
      {front.map((x) =>
        x === 0.6 ? (
          <Interactive
            key={x}
            id="computer"
            labelPosition={[0.6, 1.65, 0.9]}
            onInteract={onInteract}
          >
            <Desk
              position={[0.6, 0, 1.1]}
              glow={computerAlert}
              mug={mug}
              top={deskTop(mine)}
            />
            <DeskDressing style={mine} position={[0.6, 0, 1.1]} />
            <OfficeChair position={[0.75, 0, 1.85]} rotation={-0.35} color={chair} />
            <DeskDecor items={items} />
            {computerAlert && <AlertBubble position={[0.6, 1.55, 0.88]} />}
          </Interactive>
        ) : (
          <group key={x}>
            <Desk
              position={[x, 0, 1.1]}
              top={deskTop(theirs)}
              noComputer={theirs === 'drafting'}
            />
            <DeskDressing style={theirs} position={[x, 0, 1.1]} />
            <OfficeChair position={[x, 0, 1.68]} />
          </group>
        ),
      )}
      {back.map((x) => (
        <group key={x}>
          <Desk
            position={[x, 0, -0.45]}
            rotation={Math.PI}
            top={deskTop(theirs)}
            noComputer={theirs === 'drafting'}
          />
          <DeskDressing style={theirs} position={[x, 0, -0.45]} rotation={Math.PI} />
          <OfficeChair position={[x, 0, -1.03]} rotation={Math.PI} />
        </group>
      ))}
      {/* Low divider between the rows */}
      <Box
        size={[5.6, 0.35, 0.05]}
        position={[0.6, 0.95, 0.33]}
        color="#94a3b8"
        opacity={0.6}
      />
      {/* Team whiteboard */}
      <Interactive
        id="whiteboard"
        labelPosition={[-2.9, 2.25, 2.4]}
        onInteract={onInteract}
      >
        <Place position={[-2.9, 0, 2.4]} rotation={0.5}>
          <Anchors specs={WHITEBOARD_ANCHORS} />
          <Box
            size={[1.5, 0.95, 0.04]}
            position={[0, 1.45, 0]}
            color="#ffffff"
            radius={0.01}
          />
          <Box
            size={[1.56, 1.0, 0.03]}
            position={[0, 1.45, -0.02]}
            color={COLORS.metal}
          />
          {/* Written up from the save: the team's work, done ticked off (TeamBoard.tsx) */}
          <group position={[0, 1.45, 0.022]}>
            <TeamBoard board={board} w={1.46} h={0.91} />
          </group>
          {[-0.5, 0.5].map((x) => (
            <Box
              key={x}
              size={[0.04, 1.0, 0.04]}
              position={[x, 0.5, 0]}
              color={COLORS.metal}
            />
          ))}
        </Place>
      </Interactive>
      {/* The filing cabinet (the office administrator works here) */}
      <Box
        size={[0.5, 1.1, 0.6]}
        position={[4.3, 0.55, -1.5]}
        color="#cbd5e1"
        radius={0.02}
      />
      <Place position={[4.3, 0, -1.5]}>
        <Anchors specs={FILING_ANCHORS} />
      </Place>
      <Plant position={[-2.6, 0, -1.6]} />
      <Plant position={[4.4, 0, 3.6]} scale={1.2} />
      {/* The printer, by the back windows */}
      <Place position={[PRINTER.x, 0, PRINTER.z]}>
        <Anchors specs={PRINTER_ANCHORS} />
        <Box
          size={[0.75, 0.75, 0.6]}
          position={[0, 0.375, 0]}
          color="#e2e8f0"
          radius={0.03}
        />
        <Box
          size={[0.7, 0.2, 0.55]}
          position={[0, 0.85, -0.02]}
          color="#cbd5e1"
          radius={0.02}
        />
        <Box size={[0.4, 0.02, 0.3]} position={[0, 0.96, 0.05]} color="#ffffff" />
        <Box size={[0.16, 0.06, 0.02]} position={[0.22, 0.86, 0.27]} color="#334155" />
        <Box
          size={[0.04, 0.02, 0.01]}
          position={[0.3, 0.88, 0.28]}
          color="#22c55e"
          emissive="#22c55e"
        />
      </Place>
      {/* The coordinator's standing desk, with a laptop and papers */}
      <Place position={[STANDING_DESK.x, 0, STANDING_DESK.z]}>
        <Anchors specs={LAPTOP_ANCHORS} />
        <Box
          size={[1.1, 0.04, 0.6]}
          position={[0, 1.08, 0]}
          color={COLORS.wood}
          radius={0.01}
        />
        <Box size={[0.08, 1.06, 0.08]} position={[-0.45, 0.53, 0]} color={COLORS.metal} />
        <Box size={[0.08, 1.06, 0.08]} position={[0.45, 0.53, 0]} color={COLORS.metal} />
        <Box size={[1.0, 0.04, 0.5]} position={[0, 0.02, 0]} color={COLORS.metal} />
        <Box size={[0.34, 0.02, 0.24]} position={[-0.15, 1.11, 0.05]} color="#1e293b" />
        <Box
          size={[0.34, 0.22, 0.02]}
          position={[-0.15, 1.22, -0.07]}
          rotation={0}
          color={COLORS.screen}
        />
        <Box size={[0.22, 0.01, 0.3]} position={[0.3, 1.105, 0.05]} color="#f8fafc" />
      </Place>
    </group>
  )
}

/** A small floating envelope over the computer when there is unread mail. */
function AlertBubble({ position }: { position: Vector }) {
  const group = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (STILL) return
    if (group.current)
      group.current.position.y = position[1] + Math.sin(clock.elapsedTime * 3) * 0.04
  })
  return (
    <group ref={group} position={position}>
      <Box size={[0.22, 0.15, 0.02]} color="#f59e0b" emissive="#f59e0b" radius={0.01} />
    </group>
  )
}

/**
 * The IT corner: the comms cabinet (its lights show a device in trouble) and
 * the IT workbench, with a marker over any equipment that needs a technician.
 */
/** The workplace's own corner, where the IT team has its IT corner. */
function CornerFor({ itJobs }: { itJobs?: string }) {
  switch (workplaceKind()) {
    case 'ward':
      return <WardBay />
    case 'workshop':
      return <Workshop />
    case 'courtroom':
      return <Courtroom />
    case 'postroom':
      return <PostRoom />
    case 'records':
      return <RecordsRoom />
    case 'studio':
      return <Studio />
    case 'insights':
      return <InsightsWall />
    case 'devteam':
      return <DevTeamArea />
    default:
      return <ItCorner itJobs={itJobs} />
  }
}

function ItCorner({ itJobs }: { itJobs?: string }) {
  const jobs = readJobs(itJobs)
  const cabinetTrouble = jobs.some((j) => j.kind === 'cabinet')
  const marks = [...new Set(jobs.map((j) => j.target))]
    .map((t) => ({ t, at: equipmentAt(t) }))
    .filter((m): m is { t: string; at: { x: number; z: number } } => !!m.at)
  return (
    <group>
      {/* The comms cabinet, its glass door facing the room (itKit.tsx). */}
      <Place position={[IT_CABINET.x, 0, IT_CABINET.z]}>
        <CommsRack trouble={cabinetTrouble} />
      </Place>
      {/* The IT workbench: anti-static mat, a bench monitor, a laptop, a toolbox. */}
      <Place position={[IT_BENCH.x, 0, IT_BENCH.z]}>
        <Box
          size={[0.9, 0.05, 1.9]}
          position={[0, 0.92, 0]}
          color={COLORS.wood}
          radius={0.01}
        />
        {[-0.8, 0.8].map((z) => (
          <Box
            key={z}
            size={[0.7, 0.9, 0.06]}
            position={[0, 0.45, z]}
            color={COLORS.metal}
          />
        ))}
        <Box size={[0.6, 0.01, 1.2]} position={[0, 0.95, 0.1]} color="#1d4ed8" />
        <Box
          size={[0.08, 0.42, 0.7]}
          position={[0.3, 1.2, -0.45]}
          color="#0f172a"
          radius={0.01}
        />
        <Box
          size={[0.01, 0.36, 0.64]}
          position={[0.25, 1.2, -0.45]}
          color="#0ea5e9"
          emissive="#0369a1"
        />
        <Box size={[0.3, 0.02, 0.4]} position={[-0.05, 0.97, 0.35]} color="#94a3b8" />
        <BenchKit />
        <Box
          size={[0.25, 0.14, 0.4]}
          position={[0.2, 1.02, 0.75]}
          color="#dc2626"
          radius={0.02}
        />
      </Place>
      <Html
        transform
        position={[11.88, 2.35, 3.9]}
        rotation={[0, -Math.PI / 2, 0]}
        distanceFactor={4}
        pointerEvents="none"
        zIndexRange={[10, 0]}
      >
        <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold tracking-[0.25em] text-teal-200">
          IT SERVICE DESK
        </span>
      </Html>
      {marks.map((m) => (
        <JobMarker
          key={m.t}
          position={[m.at.x, m.t === 'cabinet' ? 2.35 : 1.75, m.at.z]}
        />
      ))}
    </group>
  )
}

/** A floating amber marker over equipment that needs a technician (it turns slowly). */
function JobMarker({ position }: { position: Vector }) {
  const group = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (STILL || !group.current) return
    group.current.rotation.y = clock.elapsedTime * 1.4
    group.current.position.y = position[1] + Math.sin(clock.elapsedTime * 2.5) * 0.05
  })
  return (
    <group ref={group} position={position}>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.16, 0.16, 0.05]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  )
}

/** Just inside the office's entrance doors, facing in (+x), as the player arrives. */
const ENTRANCE_IN = { x: -11.4, z: 7.4, heading: -Math.PI / 2 }

function ManagerOffice() {
  return (
    <group>
      {/* Glass walls with a door opening */}
      <Box
        size={[0.06, 2.6, 4.4]}
        position={[5, 1.3, -5.8]}
        color={COLORS.glass}
        opacity={0.35}
      />
      <Box
        size={[0.06, 2.6, 1.0]}
        position={[5, 1.3, -1.5]}
        color={COLORS.glass}
        opacity={0.35}
      />
      <Box
        size={[7, 2.6, 0.06]}
        position={[8.5, 1.3, -1]}
        color={COLORS.glass}
        opacity={0.3}
      />
      <Box size={[0.1, 0.08, 7]} position={[5, 2.6, -4.5]} color={COLORS.metal} />
      {/* The door into the office: glass, swinging in for whoever goes through */}
      <Door
        position={[5, 0, -2.8]}
        rotation={-Math.PI / 2}
        width={1.5}
        height={2.3}
        leaf="glass"
        frame="#94a3b8"
        sense={1.5}
      />
      <Box size={[7, 0.08, 0.1]} position={[8.5, 2.6, -1]} color={COLORS.metal} />
      {/* Desk, chairs and the manager */}
      <Box
        size={[2.0, 0.06, 0.95]}
        position={[8.4, 0.75, -4.3]}
        color={COLORS.darkWood}
        radius={0.02}
      />
      <Box
        size={[1.9, 0.72, 0.06]}
        position={[8.4, 0.38, -4.7]}
        color={COLORS.darkWood}
      />
      <Box
        size={[0.6, 0.38, 0.03]}
        position={[7.65, 1.12, -4.55]}
        rotation={0.8}
        color={COLORS.screen}
      />
      {/* Her keyboard, in front of her */}
      <Box size={[0.44, 0.02, 0.14]} position={[8.4, 0.79, -4.62]} color="#1e293b" />
      <Anchors specs={MANAGER_ANCHORS} />
      <OfficeChair position={[8.4, 0, -5.2]} rotation={Math.PI} color="#0f172a" />
      <OfficeChair position={[7.8, 0, -3.3]} color="#64748b" />
      <OfficeChair position={[9.0, 0, -3.3]} color="#64748b" />
      {/* Bookshelf */}
      <Place position={[10.4, 0, -7.6]}>
        <Anchors specs={BOOKSHELF_ANCHORS} />
        <Box size={[2.2, 2.0, 0.05]} position={[0, 1.0, -0.18]} color={COLORS.darkWood} />
        {[-1.08, 1.08].map((x) => (
          <Box
            key={x}
            size={[0.05, 2.0, 0.4]}
            position={[x, 1.0, 0]}
            color={COLORS.darkWood}
          />
        ))}
        {[0.42, 0.97, 1.52, 1.98].map((y) => (
          <Box
            key={y}
            size={[2.2, 0.04, 0.4]}
            position={[0, y, 0]}
            color={COLORS.darkWood}
          />
        ))}
        {[0.45, 1.0, 1.55].map((y, shelf) => (
          <group key={y}>
            {Array.from({ length: 9 }, (_, i) => (
              <Box
                key={i}
                size={[0.12, 0.38, 0.28]}
                position={[-0.9 + i * 0.22, y + 0.2, 0.05]}
                color={
                  ['#1e40af', '#b91c1c', '#0f766e', '#ca8a04', '#475569'][
                    (i + shelf * 2) % 5
                  ]
                }
              />
            ))}
          </group>
        ))}
      </Place>
      <Plant position={[11.3, 0, -2.0]} scale={1.2} />
    </group>
  )
}

function BreakRoom({ onInteract }: Interact) {
  return (
    <group>
      {/* Half-height divider to the workspace */}
      <Box size={[0.12, 1.2, 5.2]} position={[-4, 0.6, -5.4]} color={COLORS.wall} />
      {/* Kitchen counter */}
      <Box size={[4.2, 0.9, 0.65]} position={[-9.2, 0.45, -7.5]} color="#e2e8f0" />
      <Box size={[4.3, 0.05, 0.7]} position={[-9.2, 0.92, -7.48]} color="#334155" />
      {/* Fridge */}
      <Box
        size={[0.8, 1.9, 0.7]}
        position={[-11.4, 0.95, -7.45]}
        color="#e5e7eb"
        radius={0.04}
      />
      <Anchors specs={KITCHEN_ANCHORS} />
      {/* Coffee machine */}
      <Interactive id="coffee" labelPosition={[-9.6, 1.75, -7.3]} onInteract={onInteract}>
        <Box
          size={[0.42, 0.55, 0.4]}
          position={[-9.6, 1.22, -7.5]}
          color="#1f2937"
          radius={0.03}
        />
        <Box size={[0.2, 0.06, 0.12]} position={[-9.6, 1.1, -7.27]} color="#9ca3af" />
        <Box
          size={[0.3, 0.06, 0.02]}
          position={[-9.6, 1.4, -7.29]}
          color="#22c55e"
          emissive="#22c55e"
        />
        <mesh position={[-9.6, 0.99, -7.25]}>
          <cylinderGeometry args={[0.04, 0.035, 0.09, 12]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </Interactive>
      {/* Water cooler */}
      <Place position={[-4.8, 0, -7.4]}>
        <Anchors specs={WATER_ANCHORS} />
        <Box
          size={[0.4, 1.0, 0.4]}
          position={[0, 0.5, 0]}
          color="#f1f5f9"
          radius={0.03}
        />
        <mesh position={[0, 1.22, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.42, 16]} />
          <meshStandardMaterial color="#7dd3fc" transparent opacity={0.7} />
        </mesh>
      </Place>
      {/* Table and chairs */}
      <mesh position={[-7.4, 0.74, -3.6]}>
        <cylinderGeometry args={[0.75, 0.75, 0.05, 32]} />
        <meshStandardMaterial color={COLORS.wood} />
      </mesh>
      <mesh position={[-7.4, 0.36, -3.6]}>
        <cylinderGeometry args={[0.06, 0.06, 0.72, 8]} />
        <meshStandardMaterial color={COLORS.metal} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle) => (
        <OfficeChair
          key={angle}
          position={[-7.4 + Math.sin(angle) * 1.05, 0, -3.6 + Math.cos(angle) * 1.05]}
          rotation={angle}
          color="#f59e0b"
        />
      ))}
      {/* Notice board */}
      <Interactive
        id="noticeboard"
        labelPosition={[-11.7, 2.25, -4.2]}
        onInteract={onInteract}
      >
        <Place position={[-11.85, 0, -4.2]} rotation={Math.PI / 2}>
          <Box size={[1.6, 1.0, 0.04]} position={[0, 1.55, 0]} color="#c2a27a" />
          {[
            [-0.5, 1.75, '#fef08a'],
            [0, 1.7, '#ffffff'],
            [0.5, 1.78, '#bfdbfe'],
            [-0.3, 1.35, '#ffffff'],
            [0.35, 1.35, '#fbcfe8'],
          ].map(([x, y, color], i) => (
            <Box
              key={i}
              size={[0.36, 0.3, 0.01]}
              position={[x as number, y as number, 0.03]}
              color={color as string}
            />
          ))}
        </Place>
      </Interactive>
      <Plant position={[-4.6, 0, -2.4]} />
    </group>
  )
}
