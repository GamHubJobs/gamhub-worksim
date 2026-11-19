/**
 * The construction site in 3D: the project's approved design being built,
 * as far as the site has got (BuildModel), with the plant working the
 * current stage, the crew at their trades, the stores running down, and the
 * engineer walking it in hard hat and hi-vis: measuring for inspections,
 * talking to the supervisor, watching the work. Its own small scene: the
 * office is not drawn while the player is on site.
 */
import { Canvas, useFrame, type RootState } from '@react-three/fiber'
import { dressed, usePlayerWear, withSiteKit } from '../../world/character/playerWear'
import { memo, useMemo, useRef, useState, type RefObject } from 'react'
import { Path, Shape, Vector2 } from 'three'
import { offsetOutline } from '../cad/dxf'
import { plotPoint } from '../inspections'
import { Ticker } from '../../city/scene/interiors/common'
import { PLAYER } from '../../city/scene/interiors/kit'
import { PeopleDetail } from '../../office/scene/people'
import { playerWorkwear } from '../../office/scene/workwear'
import { isLow, useGraphicsQuality } from '../../ui/graphics'
import { prefersReducedMotion } from '../../ui/motion'
import { World } from '../../world/context'
import { lowDpr } from '../../world/lowDpr'
import { surface, tiling } from '../../world/look/surfaces'
import { SceneLook } from '../../world/look/SceneLook'
import {
  PlayerRig,
  type ActivityNow,
  type Controls,
  type Hands,
  type Prompt,
} from '../../world/PlayerRig'
import { getBrief } from '../briefs'
import { bounds, signedArea, type Design } from '../design'
import type { InspectionItem } from '../inspections'
import type { StageId } from '../quantities'
import { buildState } from './build'
import { BuildModel } from './BuildModel'
import { crewFor } from './crew'
import { SiteWorker } from './SiteCrew'
import {
  BeamLoad,
  Dumper,
  Excavator,
  Hoarding,
  MixerTruck,
  MobileCrane,
  SiteCabin,
  Skip,
  Stores,
  Van,
  Welfare,
  Bulldozer,
  Generator,
  Lorry,
} from './SiteKit'
import { SoundSource } from '../../audio/SoundSource'
import {
  siteActivities,
  siteAreaAt,
  siteBoxes,
  siteLayout,
  type SiteLayout,
} from './siteLayout'

const STILL = prefersReducedMotion()

export interface ConstructionSiteSceneProps {
  project: string
  design: Design
  stages: StageId[]
  cursor: number
  fraction: number
  /** The site is held up (an issue, a hold point): the crew stands by. */
  blocked: boolean
  /** Inspection items still to measure here. */
  measure: Array<{ inspection: string; item: InspectionItem }>
  /** An issue is waiting: the supervisor wants a word. */
  issue: boolean
  controls: RefObject<Controls>
  request: { id: string; nonce: number } | null
  onPrompt: (prompt: Prompt | null) => void
  onProgress: (progress: { label: string; progress: number } | null) => void
  onDone: (action: string | null, completed: boolean) => void
  onReady?: () => void
  blockedAction: (action: string | null) => string | null
  onArea?: (area: string) => void
  /** The whole site seen from above its south-west corner, instead of following the player. */
  overview?: boolean
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

function AreaWatch({
  now,
  layout,
  onArea,
}: {
  now: RefObject<ActivityNow>
  layout: SiteLayout
  onArea?: (a: string) => void
}) {
  const area = useRef<string | null>(null)
  useFrame(() => {
    const here = siteAreaAt(layout, now.current.x, now.current.z)
    if (here !== area.current) {
      area.current = here
      onArea?.(here)
    }
  })
  return null
}

function Ground(props: { layout: SiteLayout; design: Design; excavating: boolean }) {
  return props.layout.river ? <RiverGround {...props} /> : <PlotGround {...props} />
}

/** The footbridge's site: two banks, the mill race between them, and the temporary walkway. */
function RiverGround({ layout, design }: { layout: SiteLayout; design: Design }) {
  const grass = useMemo(() => surface('grass', '#6f8f4e', tiling(120, 120, 4)), [])
  const gravel = useMemo(
    () =>
      surface(
        'asphalt',
        '#9a948a',
        tiling(layout.x1 - layout.x0, layout.z1 - layout.z0, 2),
      ),
    [layout],
  )
  const d = layout.z1 - layout.z0
  {
    const { x0, x1, walkway } = layout.river!
    const banks: Array<[number, number]> = [
      [layout.x0 - 30, x0],
      [x1, layout.x1 + 30],
    ]
    const width = design.kind === 'bridge' ? design.width / 1000 : 2
    return (
      <group>
        {banks.map(([a, b]) => (
          <group key={a}>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[(a + b) / 2, -0.01, 0]}
              receiveShadow
              material={grass}
            >
              <planeGeometry args={[b - a, 100]} />
            </mesh>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[(Math.max(a, layout.x0) + Math.min(b, layout.x1)) / 2, 0.002, 0]}
              receiveShadow
              material={gravel}
            >
              <planeGeometry
                args={[Math.min(b, layout.x1) - Math.max(a, layout.x0), d]}
              />
            </mesh>
          </group>
        ))}
        {/* The mill race: its banks, and the water below. */}
        {[x0, x1].map((x) => (
          <mesh key={x} position={[x, -0.9, 0]} receiveShadow>
            <boxGeometry args={[0.4, 1.8, 100]} />
            <meshStandardMaterial color="#5b4a3a" roughness={1} />
          </mesh>
        ))}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, -1.5, 0]}>
          <planeGeometry args={[x1 - x0, 100]} />
          <meshStandardMaterial color="#3b6b86" roughness={0.15} metalness={0.2} />
        </mesh>
        {/* The temporary access walkway: scaffold boards and handrails. */}
        <group position={[(x0 + x1) / 2, 0, walkway]}>
          <mesh position={[0, -0.05, 0]} receiveShadow castShadow>
            <boxGeometry args={[x1 - x0 + 1.2, 0.1, 1.2]} />
            <meshStandardMaterial color="#a16207" roughness={0.9} />
          </mesh>
          {[-0.6, 0.6].map((s) => (
            <mesh key={s} position={[0, 1.0, s]}>
              <boxGeometry args={[x1 - x0 + 1.2, 0.05, 0.05]} />
              <meshStandardMaterial color="#facc15" />
            </mesh>
          ))}
        </group>
        {/* Where the deck will sit, marked on the banks. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
          <planeGeometry args={[0.01, width]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      </group>
    )
  }
}

/** The building's site. */
function PlotGround({
  layout,
  design,
  excavating,
}: {
  layout: SiteLayout
  design: Design
  excavating: boolean
}) {
  // The building's site: grass round the hoarding, gravel inside it, and
  // (once digging starts) the trench ring cut out of the gravel along the
  // foundations, with the plot inside it left as an island.
  const shapes = useMemo(() => {
    const toV = (x: number, z: number) => new Vector2(x, -z)
    const rect = (x0: number, z0: number, x1: number, z1: number) => [
      toV(x0, z0),
      toV(x1, z0),
      toV(x1, z1),
      toV(x0, z1),
    ]
    const site = rect(layout.x0, layout.z0, layout.x1, layout.z1)
    const grassShape = new Shape(rect(-80, -80, 80, 80))
    grassShape.holes.push(new Path(site))
    const siteShape = new Shape(site)
    let island: Shape | null = null
    if (design.kind === 'building' && excavating) {
      const half = design.foundation.width / 2
      const outline = design.outline.map(([x, y]) => [x, y] as [number, number])
      const one = offsetOutline(outline, half)
      const two = offsetOutline(outline, -half)
      const big = Math.abs(signedArea(one)) > Math.abs(signedArea(two))
      const plan = (pts: Array<[number, number]>) =>
        pts.map(([x, y]) => {
          const q = plotPoint(design, x, y)
          return toV(q.x, q.z)
        })
      siteShape.holes.push(new Path(plan(big ? one : two)))
      island = new Shape(plan(big ? two : one))
    }
    return { grassShape, siteShape, island }
  }, [layout, design, excavating])
  const grassFlat = useMemo(() => surface('grass', '#6f8f4e', [0.25, 0.25]), [])
  const gravelFlat = useMemo(() => surface('asphalt', '#9a948a', [0.5, 0.5]), [])
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
        material={grassFlat}
      >
        <shapeGeometry args={[shapes.grassShape]} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.001, 0]}
        receiveShadow
        material={gravelFlat}
      >
        <shapeGeometry args={[shapes.siteShape]} />
      </mesh>
      {shapes.island && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.001, 0]}
          receiveShadow
          material={gravelFlat}
        >
          <shapeGeometry args={[shapes.island]} />
        </mesh>
      )}
      {/* The access road from the gate. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[layout.gate.x, 0.0015, layout.z1 + 6]}
        receiveShadow
      >
        <planeGeometry args={[3.4, 12]} />
        <meshStandardMaterial color="#57534e" roughness={0.95} />
      </mesh>
    </group>
  )
}

function ConstructionSiteScene(props: ConstructionSiteSceneProps) {
  const [software, setSoftware] = useState(false)
  const quality = useGraphicsQuality()
  const low = isLow(quality, software)
  const { design, stages, cursor, fraction, blocked } = props
  const layout = useMemo(() => siteLayout(design), [design])
  const state = useMemo(
    () => buildState(stages, cursor, fraction),
    [stages, cursor, fraction],
  )
  const stage = stages[cursor] ?? null
  const now = useRef<ActivityNow>({
    id: null,
    t: 0,
    x: layout.start.x,
    z: layout.start.z,
  })
  const hands = useRef<Hands>({ left: null, right: null })
  const world = useMemo(() => ({ now, hands, low }), [low])
  const brief = getBrief(props.project)!
  const boxes = useMemo(() => siteBoxes(design, layout, state), [design, layout, state])
  const crew = useMemo(
    () => crewFor(design, layout, stage, blocked),
    [design, layout, stage, blocked],
  )
  const supervisor = crew.find((c) => c.id === 'supervisor')
  const supervisorAt =
    props.issue && supervisor ? supervisor.path[supervisor.path.length - 1] : null
  const activities = useMemo(
    () => siteActivities(layout, props.measure, supervisorAt),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout, props.measure, supervisorAt?.x, supervisorAt?.z],
  )
  // The player's own safety kit, and the site's lent for whatever they lack
  // (playerWear.ts, game/accessories.ts: the check at the gate).
  const worn = usePlayerWear()
  const look = useMemo(
    () => dressed(playerWorkwear('workshop', PLAYER), withSiteKit(worn)),
    [worn],
  )
  const active = (s: StageId) => stage === s && !blocked
  // Where the plant works.
  const b = design.kind === 'building' ? bounds(design.outline) : null
  const hw = b ? (b.x1 - b.x0) / 2000 : design.kind === 'bridge' ? design.span / 2000 : 6
  const hd = b ? (b.y1 - b.y0) / 2000 : 2
  const height =
    design.kind === 'building' ? (design.wall.height * design.storeys) / 1000 : 0.5
  const craneOn = stage === 'structure' || stage === 'roofing' || stage === 'hvac'
  const excavatorOn =
    !!stage && ['survey', 'excavation', 'reinforcement', 'foundations'].includes(stage)
  const mixerOn = stage === 'foundations' || stage === 'slab'
  const vanOn = !!stage && ['electrical', 'plumbing', 'hvac', 'finishing'].includes(stage)
  const progress = (s: StageId) => state[s] ?? 0
  // Materials arrive just before their stage (the stage before it well on),
  // sit in the stores, and run down as they are used.
  const before = (s: StageId) => {
    const i = stages.indexOf(s)
    return i > 0 ? progress(stages[i - 1]) : 1
  }
  const stock = (s: StageId) =>
    !stages.includes(s) ? 0 : progress(s) > 0 ? 1 - progress(s) : before(s) > 0.6 ? 1 : 0
  /** What the lorry is bringing now, if anything: a stage about to start, or just started. */
  const delivery: { load: 'blocks' | 'rebar' | 'steel' | 'roof' } | null = (() => {
    const loads: Array<[StageId, 'blocks' | 'rebar' | 'steel' | 'roof']> = [
      ['reinforcement', 'rebar'],
      ['structure', 'steel'],
      ['walls', 'blocks'],
      ['roofing', 'roof'],
    ]
    for (const [s, load] of loads) {
      if (!stages.includes(s)) continue
      const p = progress(s)
      if ((p === 0 && before(s) > 0.6) || (p > 0 && p < 0.15)) return { load }
    }
    return null
  })()
  const working = !!stage && !blocked
  const crewAt = crew.find((m) => m.id !== 'supervisor' && m.id !== 'manager-site')
    ?.path[0]
  const extent = Math.max(layout.x1 - layout.x0, layout.z1 - layout.z0) / 2 + 4

  return (
    <Canvas
      dpr={low ? lowDpr(0.6) : [1, 1.5]}
      frameloop="demand"
      camera={{
        position: [layout.start.x, 2.4, layout.start.z + 3],
        fov: 52,
        near: 0.05,
        far: 220,
      }}
      gl={{ antialias: !low, powerPreference: 'default', preserveDrawingBuffer: true }}
      shadows={!low}
      onCreated={({ gl }: RootState) => setSoftware(isSoftware(gl))}
      data-testid="site-canvas"
    >
      <Ticker fps={STILL ? 1 / 30 : low ? 2 : 30} />
      <color attach="background" args={['#cfe3f2']} />
      <fog attach="fog" args={['#cfe3f2', 60, 160]} />
      <SceneLook look="street-day" low={low} extent={extent} />
      <World.Provider value={world}>
        <PeopleDetail low={low}>
          <Ground
            layout={layout}
            design={design}
            excavating={(state.excavation ?? 0) > 0}
          />
          <Hoarding
            x0={layout.x0}
            x1={layout.x1}
            z0={layout.z0}
            z1={layout.z1}
            gateX={layout.gate.x}
          />
          <SiteCabin
            x={layout.cabin.x}
            z={layout.cabin.z}
            title={brief.title}
            client={brief.client.organisation}
          />
          <Welfare x={layout.cabin.x + 4} z={layout.cabin.z} />
          <Stores
            x={layout.stores.x}
            z={layout.stores.z}
            stock={{
              blocks: stock('walls'),
              rebar: stock('reinforcement'),
              steel: stock('structure'),
            }}
          />
          <Skip x={layout.stores.x} z={layout.stores.z + 4.2} />
          {/* The generator by the cabin powers the site while the crew works. */}
          <Generator
            x={layout.cabin.x + 4.2}
            z={layout.cabin.z + 3.2}
            running={working}
          />
          <SoundSource
            x={layout.cabin.x + 4.2}
            z={layout.cabin.z + 3.2}
            id="engine"
            every={2.6}
            range={10}
            active={working}
          />
          {delivery && (
            <Lorry
              x={layout.gate.x + 3.5}
              z={layout.z1 - 3.2}
              heading={Math.PI}
              load={delivery.load}
            />
          )}
          {delivery && (
            <SoundSource
              x={layout.gate.x + 3.5}
              z={layout.z1 - 3.2}
              id="engine"
              every={1.4}
              range={18}
            />
          )}
          {/* Site clearance at the start: the bulldozer strips the plot. */}
          {active('survey') && (
            <>
              <Bulldozer
                from={{ x: -hw - 1, z: hd + 3.5 }}
                to={{ x: hw + 1, z: hd + 3.5 }}
                working
              />
              <SoundSource x={0} z={hd + 3.5} id="engine" every={1.1} range={20} />
            </>
          )}
          {/* The crew's tools, from where they are working. */}
          {crewAt && (
            <SoundSource
              x={crewAt.x}
              z={crewAt.z}
              id="clank"
              every={2.4}
              range={14}
              active={
                working &&
                stage !== 'survey' &&
                stage !== 'inspection' &&
                stage !== 'handover'
              }
            />
          )}
          <BuildModel design={design} state={state} />
          {excavatorOn && (
            <Excavator
              x={design.kind === 'bridge' ? -hw - 4 : hw + 3.2}
              z={design.kind === 'bridge' ? 2.8 : hd + 2.6}
              heading={design.kind === 'bridge' ? Math.PI : Math.PI * 0.75}
              working={active('excavation')}
            />
          )}
          {active('excavation') && (
            <>
              <SoundSource
                x={design.kind === 'bridge' ? -hw - 4 : hw + 3.2}
                z={design.kind === 'bridge' ? 2.8 : hd + 2.6}
                id="engine"
                every={0.9}
                range={22}
              />
              <SoundSource
                x={design.kind === 'bridge' ? -hw - 4 : hw + 3.2}
                z={design.kind === 'bridge' ? 2.8 : hd + 2.6}
                id="clank"
                every={3.2}
                range={18}
              />
            </>
          )}
          {active('excavation') && design.kind === 'building' && (
            <Dumper
              from={{ x: hw + 1.5, z: -hd - 1.5 }}
              to={{ x: hw + 6, z: 0 }}
              working
            />
          )}
          {mixerOn && (
            <MixerTruck
              x={design.kind === 'bridge' ? -hw - 6 : -hw - 4.5}
              z={design.kind === 'bridge' ? -2.5 : hd + 3.5}
              heading={design.kind === 'bridge' ? Math.PI / 2 : 0}
              pouring={!blocked}
            />
          )}
          {mixerOn && (
            <SoundSource
              x={design.kind === 'bridge' ? -hw - 6 : -hw - 4.5}
              z={design.kind === 'bridge' ? -2.5 : hd + 3.5}
              id="engine"
              every={1.3}
              range={20}
              active={!blocked}
            />
          )}
          {craneOn && (
            <>
              <SoundSource
                x={layout.crane.x}
                z={layout.crane.z}
                id="engine"
                every={1.6}
                range={22}
                active={!blocked}
              />
              <SoundSource
                x={layout.crane.x}
                z={layout.crane.z}
                id="clank"
                every={4.5}
                range={16}
                active={!blocked}
              />
            </>
          )}
          {craneOn && (
            <MobileCrane
              x={layout.crane.x}
              z={layout.crane.z}
              lifting={!blocked}
              target={{ x: 0, z: 0, y: height }}
              load={
                stage === 'structure' ? (
                  <BeamLoad length={design.kind === 'bridge' ? 6 : 4} />
                ) : (
                  <BeamLoad length={1.4} />
                )
              }
            />
          )}
          {vanOn && (
            <Van x={layout.cabin.x + 2} z={layout.cabin.z + 5.5} heading={Math.PI / 2} />
          )}
          {crew.map((m) => (
            <SiteWorker key={`${m.id}-${stage}-${blocked}`} member={m} />
          ))}
          <PlayerRig
            start={layout.start}
            boxes={boxes}
            activities={activities}
            blocked={(a) => props.blockedAction(a.action)}
            controls={props.controls}
            request={props.request}
            onPrompt={props.onPrompt}
            onProgress={props.onProgress}
            onDone={(a, completed) => props.onDone(a.action, completed)}
            onReady={props.onReady}
            look={look}
            surface="pavement"
            low={low}
            now={now}
            hands={hands}
            // The camera starts behind the player, looking where they face (into the site).
            startOrbit={{ yaw: layout.start.heading, pitch: 0.45, distance: 4.2 }}
            stage={
              props.overview
                ? {
                    from: [
                      layout.x0 * 0.7,
                      Math.max(12, extent * 0.75),
                      layout.z1 * 1.05,
                    ],
                    looks: [0, height / 3, 0],
                  }
                : null
            }
          />
          <AreaWatch now={now} layout={layout} onArea={props.onArea} />
        </PeopleDetail>
      </World.Provider>
    </Canvas>
  )
}

export default memo(ConstructionSiteScene)
