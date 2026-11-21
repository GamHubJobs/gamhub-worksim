/**
 * The design in 3D, from the same model as the plan: orbit, pan and zoom,
 * preset and saved views, the light, floors and walls shown, a screenshot,
 * and a first-person walkthrough with collision, doorways and stairs.
 * Loaded only when 3D is opened.
 */
import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Vector3, type Object3D } from 'three'
import { catalogEntry } from '../../studio/catalog'
import {
  centroid,
  collide,
  itemCorners,
  pointInPolygon,
  polygonArea,
} from '../../studio/geometry'
import { LIGHTING } from '../../studio/materials'
import type { Point, Ref, StudioState } from '../../studio/model'
import { newId, roomAt, stairCorners } from '../../studio/ops'
import { downloadFile, safeFileName } from '../../lib/download'
import { isLow, useGraphicsQuality } from '../../ui/graphics'
import { prefersReducedMotion } from '../../ui/motion'
import { SIcon } from './icons'
import { buildBuilding, buildingFrame, type BuildOptions } from './three/building'

interface Props {
  state: StudioState
  floor: string
  walk: boolean
  selection: Ref[]
  onSelect: (refs: Ref[]) => void
  apply: (next: StudioState) => void
  readOnly: boolean
  onExitWalk: () => void
  onFloor: (id: string) => void
  notify: (message: string, tone?: 'info' | 'error') => void
  fileName: string
}

const M = 0.001
const EYE = 1600
const RADIUS = 250

/** Where the walker is, for the browser tests (plan millimetres). */
declare global {
  interface Window {
    __studioWalker?: {
      x: number
      y: number
      floor: string
      room: string | null
      height: number
    }
    __studioScene?: import('three').Group
  }
}

function softwareRenderer(): boolean {
  try {
    const c = document.createElement('canvas').getContext('webgl')
    if (!c) return true
    const info = c.getExtension('WEBGL_debug_renderer_info')
    const r = String(
      info ? c.getParameter(info.UNMASKED_RENDERER_WEBGL) : c.getParameter(c.RENDERER),
    )
    return /swiftshader|llvmpipe|software|basic render/i.test(r)
  } catch {
    return true
  }
}

function Building({
  state,
  options,
  onPick,
}: {
  state: StudioState
  options: BuildOptions
  onPick: (ref: Ref | null) => void
}) {
  const built = useMemo(() => buildBuilding(state, options), [state, options])
  useEffect(() => {
    // For the browser tests (development builds only): what was built.
    if (import.meta.env.DEV) window.__studioScene = built.group
    return () => built.dispose()
  }, [built])
  return (
    <primitive
      object={built.group}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 4) return // a drag to orbit, not a click
        e.stopPropagation()
        let o: Object3D | null = e.object
        while (o && !o.userData.ref) o = o.parent
        onPick((o?.userData.ref as Ref | undefined) ?? null)
      }}
    />
  )
}

function Sky({
  lighting,
  shadows,
  centre,
  size,
}: {
  lighting: StudioState['lighting']
  shadows: boolean
  centre: { x: number; z: number }
  size: number
}) {
  const sun =
    lighting === 'day'
      ? { colour: '#fff7e8', intensity: 2.4, pos: [12, 18, 9] }
      : lighting === 'evening'
        ? { colour: '#ffb26b', intensity: 1.5, pos: [-16, 5, 6] }
        : { colour: '#7d8fb8', intensity: 0.25, pos: [6, 14, -8] }
  const hemi = lighting === 'day' ? 1.1 : lighting === 'evening' ? 0.55 : 0.12
  const d = Math.max(12, size)
  return (
    <>
      <color
        attach="background"
        args={[
          lighting === 'day' ? '#dfe9f2' : lighting === 'evening' ? '#e9b98f' : '#111827',
        ]}
      />
      <hemisphereLight
        args={[lighting === 'night' ? '#1e2a44' : '#eaf2ff', '#8b8070', hemi]}
      />
      <directionalLight
        position={[centre.x + sun.pos[0], sun.pos[1], centre.z + sun.pos[2]]}
        color={sun.colour}
        intensity={sun.intensity}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-d}
        shadow-camera-right={d}
        shadow-camera-top={d}
        shadow-camera-bottom={-d}
        shadow-camera-far={80}
        shadow-bias={-0.0004}
      >
        <object3D attach="target" position={[centre.x, 0, centre.z]} />
      </directionalLight>
      {/* The ground round the building. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centre.x, -0.21, centre.z]}
        receiveShadow={shadows}
      >
        <planeGeometry args={[d * 8, d * 8]} />
        <meshStandardMaterial
          color={lighting === 'night' ? '#1f2a1f' : '#9fb48a'}
          roughness={1}
        />
      </mesh>
    </>
  )
}

type Preset = '3d' | 'top' | 'front' | 'side'

function CameraRig({
  preset,
  centre,
  size,
  controls,
  base,
}: {
  preset:
    | { kind: Preset; at: number }
    | {
        kind: 'view'
        at: number
        position: [number, number, number]
        target: [number, number, number]
      }
  centre: { x: number; z: number }
  size: number
  controls: React.RefObject<OrbitControlsImpl | null>
  base: number
}) {
  const { camera } = useThree()
  useEffect(() => {
    const c = controls.current
    const target = new Vector3(centre.x, base + 1, centre.z)
    let position: Vector3
    if (preset.kind === 'view') {
      position = new Vector3(...preset.position)
      target.set(...preset.target)
    } else {
      const r = size * 1.25 + 4
      position =
        preset.kind === 'top'
          ? new Vector3(centre.x, base + r * 1.3, centre.z + 0.01)
          : preset.kind === 'front'
            ? new Vector3(centre.x, base + 1.6, centre.z + r)
            : preset.kind === 'side'
              ? new Vector3(centre.x + r, base + 1.6, centre.z)
              : new Vector3(centre.x + r * 0.7, base + r * 0.75, centre.z + r * 0.8)
    }
    camera.position.copy(position)
    if (c) {
      c.target.copy(target)
      c.update()
    } else camera.lookAt(target)
    // Only when a preset is chosen (`at` changes), not on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset.at])
  return null
}

function Shooter({
  request,
  onShot,
}: {
  request: number
  onShot: (dataUrl: string) => void
}) {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    if (!request) return
    gl.render(scene, camera)
    onShot(gl.domElement.toDataURL('image/png'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request])
  return null
}

/** The first-person walker: moves in plan millimetres, collides with walls (and furniture if asked), climbs stairs. */
function Walker({
  state,
  start,
  solidFurniture,
  onMove,
  keys,
}: {
  state: StudioState
  start: { x: number; y: number; floor: string; yaw: number }
  solidFurniture: boolean
  onMove: (info: { room: string | null; floor: string }) => void
  keys: React.RefObject<Set<string>>
}) {
  const { camera, gl } = useThree()
  const pos = useRef({ ...start, pitch: -0.05, height: 0 })
  const look = useRef<{ x: number; y: number } | null>(null)
  const last = useRef({ room: '', floor: '' })
  useEffect(() => {
    pos.current = {
      ...start,
      pitch: -0.05,
      height: state.floors.find((f) => f.id === start.floor)?.elevation ?? 0,
    }
    // A new start (another room) resets the walker; edits do not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start])
  useEffect(() => {
    const el = gl.domElement
    const down = (e: PointerEvent) => {
      look.current = { x: e.clientX, y: e.clientY }
      el.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (document.pointerLockElement === el) {
        pos.current.yaw -= e.movementX * 0.0025
        pos.current.pitch = Math.max(
          -1.2,
          Math.min(1.2, pos.current.pitch - e.movementY * 0.0025),
        )
        return
      }
      if (!look.current) return
      pos.current.yaw -= (e.clientX - look.current.x) * 0.004
      pos.current.pitch = Math.max(
        -1.2,
        Math.min(1.2, pos.current.pitch - (e.clientY - look.current.y) * 0.004),
      )
      look.current = { x: e.clientX, y: e.clientY }
    }
    const up = () => (look.current = null)
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
    }
  }, [gl])
  const furniture = useMemo(
    () =>
      solidFurniture
        ? state.items
            .filter((i) => {
              const e = catalogEntry(i.kind)
              return !e?.walkable && i.elevation < 300 && (e?.height ?? 0) > 350
            })
            .map((i) => ({ floor: i.floor, poly: itemCorners(i) }))
        : [],
    [state.items, solidFurniture],
  )
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const p = pos.current
    const k = keys.current
    const run = k.has('shift') ? 2.6 : 1.4
    let f = 0
    let s = 0
    if (k.has('w') || k.has('arrowup')) f += 1
    if (k.has('s') || k.has('arrowdown')) f -= 1
    if (k.has('a')) s -= 1
    if (k.has('d')) s += 1
    if (k.has('arrowleft') || k.has('q')) p.yaw += dt * 1.8
    if (k.has('arrowright') || k.has('e')) p.yaw -= dt * 1.8
    if (f || s) {
      const len = Math.hypot(f, s)
      const step = (run * dt * 1000) / len
      // Facing: yaw 0 looks towards −y on the plan (−z in 3D).
      const fx = -Math.sin(p.yaw)
      const fy = -Math.cos(p.yaw)
      const next: Point = {
        x: p.x + (fx * f + -fy * s) * step,
        y: p.y + (fy * f + fx * s) * step,
      }
      const solid = furniture.filter((x) => x.floor === p.floor).map((x) => x.poly)
      const fixed = collide(next, RADIUS, state, p.floor, solid)
      p.x = fixed.x
      p.y = fixed.y
    }
    // Stairs: the height follows the flight, and the floor changes at the top or bottom.
    const floorOf = (id: string) => state.floors.find((x) => x.id === id)
    let height = floorOf(p.floor)?.elevation ?? 0
    for (const st of state.stairs) {
      if (st.floor !== p.floor && st.to !== p.floor) continue
      const c = stairCorners(st)
      if (!pointInPolygon(p, c)) continue
      const low = floorOf(st.floor)?.elevation ?? 0
      const high = floorOf(st.to)?.elevation ?? low
      const r = (st.rotation * Math.PI) / 180
      const along = (p.x - st.x) * Math.sin(r) + (p.y - st.y) * -Math.cos(r)
      const t = Math.max(0, Math.min(1, along / st.run))
      height = low + (high - low) * t
      if (t > 0.97 && p.floor !== st.to) p.floor = st.to
      if (t < 0.03 && p.floor !== st.floor) p.floor = st.floor
      break
    }
    p.height += (height - p.height) * Math.min(1, dt * 10)
    camera.position.set(p.x * M, (p.height + EYE) * M, p.y * M)
    camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ')
    const room = roomAt(state, p.floor, p)
    window.__studioWalker = {
      x: Math.round(p.x),
      y: Math.round(p.y),
      floor: p.floor,
      room: room?.name ?? null,
      height: Math.round(p.height),
    }
    if (room?.name !== last.current.room || p.floor !== last.current.floor) {
      last.current = { room: room?.name ?? '', floor: p.floor }
      onMove({ room: room?.name ?? null, floor: p.floor })
    }
  })
  return null
}

export default function Studio3D({
  state,
  floor,
  walk,
  selection,
  onSelect,
  apply,
  readOnly,
  onExitWalk,
  onFloor,
  notify,
  fileName,
}: Props) {
  const quality = useGraphicsQuality()
  const [software] = useState(softwareRenderer)
  const low = isLow(quality, software)
  const [floorsShown, setFloorsShown] = useState<'all' | 'up-to-current'>('up-to-current')
  const [walls, setWalls] = useState<'full' | 'low'>('full')
  const [roof, setRoof] = useState(false)
  const [furniture, setFurniture] = useState(true)
  const [solid, setSolid] = useState(true)
  const [preset, setPreset] = useState<Parameters<typeof CameraRig>[0]['preset']>({
    kind: '3d',
    at: 1,
  })
  const [shot, setShot] = useState(0)
  const [walkInfo, setWalkInfo] = useState<{ room: string | null; floor: string }>({
    room: null,
    floor,
  })
  const [viewsOpen, setViewsOpen] = useState(false)
  const controls = useRef<OrbitControlsImpl | null>(null)
  const keys = useRef<Set<string>>(new Set())
  const host = useRef<HTMLDivElement>(null)
  const frame = useMemo(() => buildingFrame(state, floor), [state, floor])
  const base = (state.floors.find((f) => f.id === floor)?.elevation ?? 0) * M

  const options: BuildOptions = useMemo(
    () => ({
      floors: walk ? 'all' : floorsShown,
      current: floor,
      walls: walk ? 'full' : walls,
      ceilings: walk,
      roof: walk ? false : roof,
      furniture,
      lighting: state.lighting,
      shadows: !low,
    }),
    [walk, floorsShown, floor, walls, roof, furniture, state.lighting, low],
  )

  // Where the walk starts: the selected room, else the largest room on this floor.
  const [startRequest, setStartRequest] = useState<{ room: string | null; at: number }>({
    room: null,
    at: 0,
  })
  const start = useMemo(() => {
    const selectedRoom = selection.find((r) => r.kind === 'rooms')?.id
    const rooms = state.rooms.filter((r) => r.floor === floor)
    const room =
      state.rooms.find((r) => r.id === startRequest.room) ??
      state.rooms.find((r) => r.id === selectedRoom) ??
      [...rooms].sort((a, b) => polygonArea(b.outline) - polygonArea(a.outline))[0]
    const c = room
      ? centroid(room.outline)
      : { x: frame.centre.x / M, y: frame.centre.z / M }
    return { x: c.x, y: c.y, floor: room?.floor ?? floor, yaw: 0 }
    // Re-start only when asked (walk opened, a room chosen), not on each edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walk, startRequest])

  // Keys while walking.
  useEffect(() => {
    if (!walk) return
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return
      const k = e.key.toLowerCase()
      if (k === 'escape') {
        if (document.pointerLockElement) return
        e.preventDefault()
        onExitWalk()
        return
      }
      if (k === 'p') {
        setShot((n) => n + 1)
        return
      }
      if (k === 'g') {
        setSolid((v) => !v)
        return
      }
      if (
        [
          'w',
          'a',
          's',
          'd',
          'q',
          'e',
          'shift',
          'arrowup',
          'arrowdown',
          'arrowleft',
          'arrowright',
        ].includes(k)
      ) {
        e.preventDefault()
        keys.current.add(k)
      }
    }
    const held = keys.current
    const up = (e: KeyboardEvent) => held.delete(e.key.toLowerCase())
    const blur = () => held.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      held.clear()
      delete window.__studioWalker
    }
  }, [walk, onExitWalk])

  useEffect(() => {
    if (walk && walkInfo.floor !== floor) onFloor(walkInfo.floor)
  }, [walk, walkInfo.floor, floor, onFloor])

  const saveView = () => {
    if (readOnly) return
    const c = controls.current
    if (!c) return
    const cam = c.object
    const n = state.views.length + 1
    apply({
      ...state,
      views: [
        ...state.views,
        {
          id: newId('v'),
          name: `View ${n}`,
          position: [cam.position.x, cam.position.y, cam.position.z] as [
            number,
            number,
            number,
          ],
          target: [c.target.x, c.target.y, c.target.z] as [number, number, number],
        },
      ].slice(-20),
    })
    notify(`Saved as View ${n}.`)
  }

  const setLighting = (l: StudioState['lighting']) =>
    !readOnly && apply({ ...state, lighting: l })

  return (
    <div
      ref={host}
      className="relative h-full w-full"
      data-testid="studio-3d"
      tabIndex={-1}
    >
      <Canvas
        shadows={low ? false : 'percentage'}
        dpr={low ? [0.5, 1] : [1, 1.75]}
        gl={{ preserveDrawingBuffer: true, antialias: !low }}
        camera={{
          fov: walk ? 70 : 45,
          near: walk ? 0.05 : 0.2,
          far: 400,
          position: [frame.centre.x + 12, 14, frame.centre.z + 14],
        }}
        frameloop={walk ? 'always' : 'demand'}
        onPointerMissed={() => !walk && onSelect([])}
        data-testid="studio-3d-canvas"
      >
        <Sky
          lighting={state.lighting}
          shadows={!low}
          centre={frame.centre}
          size={frame.size}
        />
        <Building
          state={state}
          options={options}
          onPick={(ref) => !walk && onSelect(ref ? [ref] : [])}
        />
        {!walk && (
          <OrbitControls
            ref={controls}
            makeDefault
            enableDamping={!prefersReducedMotion()}
            maxPolarAngle={Math.PI / 2 - 0.02}
            minDistance={1}
            maxDistance={200}
          />
        )}
        {!walk && (
          <CameraRig
            preset={preset}
            centre={frame.centre}
            size={frame.size}
            controls={controls}
            base={base}
          />
        )}
        {walk && (
          <Walker
            state={state}
            start={start}
            solidFurniture={solid}
            keys={keys}
            onMove={setWalkInfo}
          />
        )}
        <Shooter
          request={shot}
          onShot={(url) => {
            const bytes = Uint8Array.from(atob(url.split(',')[1]), (c) => c.charCodeAt(0))
            downloadFile(`${safeFileName(fileName)} 3D.png`, bytes, 'image/png')
            notify('Screenshot saved.')
          }}
        />
      </Canvas>

      {walk ? (
        <>
          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onExitWalk}
              className="rounded-md bg-slate-900/85 px-3 py-1.5 text-sm text-white hover:bg-slate-900"
              data-testid="exit-walk"
            >
              Exit walk (Esc)
            </button>
            <span
              className="rounded-md bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-900 shadow"
              data-testid="walk-room"
              aria-live="polite"
            >
              {walkInfo.room ?? 'Outside the rooms'} ·{' '}
              {state.floors.find((f) => f.id === walkInfo.floor)?.name}
            </span>
          </div>
          <div className="absolute top-14 left-3 flex max-w-[60%] flex-wrap gap-1">
            {state.rooms.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setStartRequest({ room: r.id, at: Date.now() })}
                className="rounded-full bg-white/85 px-2 py-0.5 text-xs text-slate-800 shadow hover:bg-white"
              >
                {r.name}
              </button>
            ))}
          </div>
          <div className="absolute right-3 bottom-3 max-w-xs rounded-md bg-slate-900/80 p-3 text-xs text-white">
            <p className="font-semibold">Walking</p>
            <p>
              W A S D or arrows to move, Q / E to turn, drag to look, Shift to walk
              faster.
            </p>
            <p>
              G: {solid ? 'stopping at furniture' : 'walking through furniture'} (walls
              always stop you). P: photo.
            </p>
          </div>
          <div className="pointer-events-none absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 ring-1 ring-slate-900/40" />
        </>
      ) : (
        <>
          <div
            className="absolute top-3 left-3 flex flex-wrap gap-1"
            role="toolbar"
            aria-label="3D view"
          >
            {(['3d', 'top', 'front', 'side'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPreset({ kind: p, at: Date.now() })}
                className="rounded-md bg-white/90 px-2.5 py-1 text-sm text-slate-800 shadow hover:bg-white"
                data-testid={`view-${p}`}
              >
                {p === '3d' ? '3D' : p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
            <div className="relative">
              <button
                type="button"
                onClick={() => setViewsOpen((v) => !v)}
                className="rounded-md bg-white/90 px-2.5 py-1 text-sm text-slate-800 shadow hover:bg-white"
                data-testid="saved-views"
              >
                Saved views ({state.views.length})
              </button>
              {viewsOpen && (
                <div className="absolute top-full left-0 z-10 mt-1 w-52 rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg">
                  {state.views.length === 0 && (
                    <p className="px-3 py-1 text-slate-500">None yet.</p>
                  )}
                  {state.views.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between px-2 hover:bg-slate-50"
                    >
                      <button
                        type="button"
                        className="flex-1 py-1 text-left"
                        onClick={() => (
                          setPreset({
                            kind: 'view',
                            at: Date.now(),
                            position: v.position,
                            target: v.target,
                          }),
                          setViewsOpen(false)
                        )}
                      >
                        {v.name}
                      </button>
                      {!readOnly && (
                        <button
                          type="button"
                          aria-label={`Delete ${v.name}`}
                          className="p-1 text-slate-400 hover:text-red-700"
                          onClick={() =>
                            apply({
                              ...state,
                              views: state.views.filter((x) => x.id !== v.id),
                            })
                          }
                        >
                          <SIcon name="bin" className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 flex-wrap items-center gap-1 rounded-lg bg-white/95 p-1 text-sm shadow-lg"
            role="toolbar"
            aria-label="Light and display"
          >
            {(Object.keys(LIGHTING) as Array<keyof typeof LIGHTING>).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={state.lighting === l}
                disabled={readOnly}
                onClick={() => setLighting(l)}
                title={LIGHTING[l].description}
                className={`flex items-center gap-1 rounded px-2 py-1 ${state.lighting === l ? 'bg-slate-800 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                data-testid={`light-${l}`}
              >
                <SIcon name={l === 'night' ? 'moon' : 'sun'} className="h-3.5 w-3.5" />{' '}
                {LIGHTING[l].name}
              </button>
            ))}
            <span className="mx-1 h-5 w-px bg-slate-200" />
            <button
              type="button"
              aria-pressed={walls === 'low'}
              onClick={() => setWalls(walls === 'full' ? 'low' : 'full')}
              className={`rounded px-2 py-1 ${walls === 'low' ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'}`}
              title="Cut the walls down to 1.2 m to see into the rooms"
            >
              Low walls
            </button>
            <button
              type="button"
              aria-pressed={floorsShown === 'all'}
              onClick={() =>
                setFloorsShown(floorsShown === 'all' ? 'up-to-current' : 'all')
              }
              className={`rounded px-2 py-1 ${floorsShown === 'all' ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'}`}
              title="Show the floors above this one"
              data-testid="all-floors"
            >
              All floors
            </button>
            <button
              type="button"
              aria-pressed={roof}
              onClick={() => setRoof(!roof)}
              className={`rounded px-2 py-1 ${roof ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'}`}
              data-testid="show-roof"
            >
              Roof
            </button>
            <button
              type="button"
              aria-pressed={furniture}
              onClick={() => setFurniture(!furniture)}
              className={`rounded px-2 py-1 ${furniture ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'}`}
            >
              Furniture
            </button>
            <span className="mx-1 h-5 w-px bg-slate-200" />
            <button
              type="button"
              onClick={saveView}
              disabled={readOnly}
              className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
              data-testid="save-view"
            >
              Save view
            </button>
            <button
              type="button"
              onClick={() => setShot((n) => n + 1)}
              className="flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-100"
              data-testid="screenshot"
            >
              <SIcon name="camera" className="h-3.5 w-3.5" /> Screenshot
            </button>
          </div>
          <p className="pointer-events-none absolute top-3 right-3 rounded bg-white/80 px-2 py-1 text-[11px] text-slate-600">
            Drag to orbit · right-drag to pan · scroll to zoom · click to select
          </p>
        </>
      )}
    </div>
  )
}
