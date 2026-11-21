/**
 * The 2D plan editor: an SVG canvas in millimetres with zoom and pan, the grid,
 * and every drawing tool. Drags show a draft; the edit is saved once, when the
 * mouse is released (one undo step). All edits go through src/studio/ops.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { catalogEntry, openingPreset } from '../../studio/catalog'
import {
  bounds,
  convexOverlap,
  dist,
  itemCorners,
  itemSize,
  openingFits,
  projectOnSegment,
  wallNormal,
  wallRect,
} from '../../studio/geometry'
import type { Item, Opening, Point, Ref, RoomUse, StudioState } from '../../studio/model'
import {
  addColumn,
  addDimension,
  addItem,
  addLabel,
  addOpening,
  addRectRoom,
  addRoof,
  addRoom,
  addSlab,
  addStair,
  addWall,
  hitTest,
  lockAngle,
  moveVertex,
  partsInBox,
  refPoints,
  snapPoint,
  snapValue,
  translateParts,
  updateOpening,
  updatePart,
  type WallStyle,
} from '../../studio/ops'
import { formatLength, parseLength } from '../../studio/units'
import { PlanDefs, PlanDrawing } from './PlanDrawing'
import { clampScale, DEFAULT_LAYERS, initialView, type Layers, type View } from './shared'

export type Tool =
  | 'select'
  | 'pan'
  | 'wall'
  | 'room'
  | 'door'
  | 'window'
  | 'pass'
  | 'stairs'
  | 'column'
  | 'balcony'
  | 'roof'
  | 'measure'
  | 'dimension'
  | 'label'

export interface CanvasApi {
  /** Handles a key for the active tool (typed sizes, Enter, Esc). True if used. */
  key: (e: KeyboardEvent) => boolean
  fit: () => void
  zoom: (factor: number) => void
}

interface Props {
  state: StudioState
  floor: string
  selection: Ref[]
  onSelect: (refs: Ref[]) => void
  tool: Tool
  onTool: (tool: Tool) => void
  /** A library item or opening preset waiting to be placed. */
  placing:
    | { kind: 'item'; id: string; rotation: number }
    | { kind: 'opening'; id: string }
    | null
  onPlaced: () => void
  /** Saves an edit (one undo step). */
  apply: (next: StudioState) => void
  /** Shows a draft while dragging (null to clear). */
  setDraft: (draft: StudioState | null) => void
  wallStyle: WallStyle
  roomUse: RoomUse
  readOnly: boolean
  layers?: Layers
  notify: (message: string, tone?: 'info' | 'error') => void
  onCursor: (p: Point | null, snapped: string) => void
  onView?: (view: View) => void
}

type Drag =
  | { mode: 'pan'; sx: number; sy: number; view: View }
  | { mode: 'move'; base: StudioState; refs: Ref[]; start: Point; moved: boolean }
  | { mode: 'vertex'; base: StudioState; from: Point }
  | { mode: 'rotate'; base: StudioState; id: string }
  | { mode: 'resize'; base: StudioState; id: string }
  | { mode: 'opening'; base: StudioState; id: string }
  | { mode: 'box'; start: Point; end: Point; add: boolean }
  | { mode: 'rect'; start: Point; end: Point }
  | { mode: 'measure'; start: Point; end: Point }

const HIT_PX = 8

export const PlanCanvas = forwardRef<CanvasApi, Props>(function PlanCanvas(props, ref) {
  const { state, floor, selection, tool, placing, readOnly } = props
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [view, setView] = useState<View>(() => initialView(state, floor, 800, 600))
  const [drag, setDrag] = useState<Drag | null>(null)
  const [hover, setHover] = useState<Point | null>(null)
  const [snapped, setSnapped] = useState<string>('none')
  const [chain, setChain] = useState<Point[]>([])
  const [dimStart, setDimStart] = useState<Point | null>(null)
  const [typed, setTyped] = useState('')
  const [shift, setShift] = useState(false)
  const [alt, setAlt] = useState(false)
  const [measure, setMeasure] = useState<{ a: Point; b: Point } | null>(null)
  const fitted = useRef(false)
  // The draft last shown while dragging: saved when the mouse is released.
  const draftRef = useRef<StudioState | null>(null)
  const showDraft = (draft: StudioState | null) => {
    draftRef.current = draft
    props.setDraft(draft)
  }

  // Size of the canvas on screen.
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.max(100, entry.contentRect.width)
      const h = Math.max(100, entry.contentRect.height)
      setSize({ w, h })
      if (!fitted.current) {
        fitted.current = true
        setView(initialView(state, floor, w, h))
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
    // Only on mount: later the player's own zoom is kept.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => props.onView?.(view), [view, props])

  // Leaving a tool clears what it was doing.
  useEffect(() => {
    setChain([])
    setDimStart(null)
    setTyped('')
    setMeasure(null)
  }, [tool, floor])

  const toWorld = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = svgRef.current!.getBoundingClientRect()
      return {
        x: view.cx + (clientX - rect.left - rect.width / 2) * view.scale,
        y: view.cy + (clientY - rect.top - rect.height / 2) * view.scale,
      }
    },
    [view],
  )

  const grid = state.project.grid
  /** Where a point snaps to (pure: used while drawing too), and to what. */
  const snapInfo = useCallback(
    (p: Point, from?: Point): { point: Point; to: string } => {
      let q = p
      if (from && shift) q = lockAngle(from, p)
      if (alt) return { point: q, to: 'none' }
      const r = snapPoint(state, floor, q, {
        grid,
        radius: HIT_PX * 1.6 * view.scale,
        useGrid: state.project.snap,
      })
      if (from && shift) {
        // Keep the locked angle: snap only the length to the grid.
        const len = state.project.snap ? snapValue(dist(from, q), grid) : dist(from, q)
        const a = Math.atan2(q.y - from.y, q.x - from.x)
        return {
          point: {
            x: Math.round(from.x + Math.cos(a) * len),
            y: Math.round(from.y + Math.sin(a) * len),
          },
          to: 'grid',
        }
      }
      return r
    },
    [state, floor, grid, view.scale, shift, alt],
  )
  const snap = useCallback(
    (p: Point, from?: Point) => snapInfo(p, from).point,
    [snapInfo],
  )

  const fit = useCallback(
    () => setView(initialView(state, floor, size.w, size.h)),
    [state, floor, size],
  )
  const zoom = useCallback(
    (factor: number) => setView((v) => ({ ...v, scale: clampScale(v.scale / factor) })),
    [],
  )

  // ------------------------------------------------------------- placing previews

  const wallStyle = props.wallStyle
  const openingGhost = useMemo(() => {
    if (!hover || readOnly) return null
    const presetId =
      placing?.kind === 'opening'
        ? placing.id
        : tool === 'door'
          ? 'door-single'
          : tool === 'window'
            ? 'window-casement'
            : tool === 'pass'
              ? 'pass-arch'
              : null
    if (!presetId) return null
    const preset = openingPreset(presetId)!
    const near = state.walls
      .filter((w) => w.floor === floor)
      .map((w) => ({ w, proj: projectOnSegment(hover, w.a, w.b) }))
      .filter((c) => c.proj.distance < c.w.thickness / 2 + HIT_PX * 3 * view.scale)
      .sort((a, b) => a.proj.distance - b.proj.distance)[0]
    if (!near) return null
    const offset =
      state.project.snap && !alt
        ? snapValue(near.proj.along, 50)
        : Math.round(near.proj.along)
    // Doors open towards the side of the wall the pointer is on.
    const n = wallNormal(near.w)
    const side =
      (hover.x - near.proj.point.x) * n.x + (hover.y - near.proj.point.y) * n.y >= 0
        ? 'left'
        : 'right'
    const opening: Opening = {
      id: '__ghost',
      wall: near.w.id,
      kind: preset.kind,
      offset,
      width: preset.width,
      height: Math.min(preset.height, near.w.height - preset.sill),
      sill: preset.sill,
      hinge: 'start',
      side,
      style: preset.style,
      entrance: false,
    }
    const fitResult = openingFits(opening, near.w, state.openings)
    return {
      opening,
      wall: near.w,
      ok: fitResult.ok,
      reason: fitResult.ok ? '' : fitResult.reason,
      presetId,
    }
  }, [hover, placing, tool, state, floor, view.scale, alt, readOnly])

  const itemGhost = useMemo(() => {
    if (!hover || placing?.kind !== 'item') return null
    const p =
      alt || !state.project.snap
        ? hover
        : { x: snapValue(hover.x, 50), y: snapValue(hover.y, 50) }
    const item: Item = {
      id: '__ghost',
      floor,
      kind: placing.id,
      x: p.x,
      y: p.y,
      rotation: placing.rotation,
      elevation: catalogEntry(placing.id)?.elevation ?? 0,
    }
    const entry = catalogEntry(placing.id)
    const blocked =
      !entry?.walkable &&
      item.elevation < 300 &&
      state.walls.some(
        (w) => w.floor === floor && convexOverlap(itemCorners(item), wallRect(w), 15),
      )
    return { item, ok: !blocked }
  }, [hover, placing, floor, state, alt])

  // ------------------------------------------------------------- keys

  useImperativeHandle(
    ref,
    () => ({
      fit,
      zoom,
      key: (e: KeyboardEvent) => {
        if (e.type === 'keyup') {
          setShift(e.shiftKey)
          setAlt(e.altKey)
          return false
        }
        setShift(e.shiftKey)
        setAlt(e.altKey)
        const typing = (tool === 'wall' && chain.length > 0) || tool === 'room'
        if (typing && /^[0-9.,'" xXmcfti-]$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
          setTyped((t) => (t + e.key).slice(0, 24))
          return true
        }
        if (typing && e.key === 'Backspace' && typed) {
          setTyped((t) => t.slice(0, -1))
          return true
        }
        if (e.key === 'Enter') {
          if (tool === 'wall' && chain.length > 0 && typed) {
            const len = parseLength(typed, state.project.units)
            setTyped('')
            if (!len || len <= 0)
              return (props.notify(`"${typed}" is not a length.`, 'error'), true)
            const from = chain[chain.length - 1]
            const towards = hover ?? { x: from.x + 1, y: from.y }
            const a = Math.atan2(towards.y - from.y, towards.x - from.x)
            const step = shift ? Math.round(a / (Math.PI / 4)) * (Math.PI / 4) : a
            const to = {
              x: Math.round(from.x + Math.cos(step) * len),
              y: Math.round(from.y + Math.sin(step) * len),
            }
            placeWallPoint(to)
            return true
          }
          if (tool === 'room' && typed) {
            const m = typed.toLowerCase().split('x')
            setTyped('')
            const w = m[0] ? parseLength(m[0], state.project.units) : null
            const d = m[1] ? parseLength(m[1], state.project.units) : null
            if (!w || !d)
              return (
                props.notify(
                  'Type the room size as width x depth, e.g. 4200x3600.',
                  'error',
                ),
                true
              )
            const corner =
              drag?.mode === 'rect' ? drag.start : hover ? snap(hover) : { x: 0, y: 0 }
            setDrag(null)
            makeRoom(corner, { x: corner.x + w, y: corner.y + d })
            return true
          }
          if (tool === 'wall' && chain.length > 1) {
            setChain([])
            return true
          }
          return false
        }
        if (e.key === 'Escape') {
          if (typed) return (setTyped(''), true)
          if (chain.length || dimStart || drag || measure) {
            setChain([])
            setDimStart(null)
            setMeasure(null)
            if (drag && 'base' in drag) showDraft(null)
            setDrag(null)
            return true
          }
          return false
        }
        return false
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fit, zoom, tool, chain, typed, hover, state, drag, dimStart, measure, shift, snap],
  )

  // ------------------------------------------------------------- edits

  function makeRoom(p: Point, q: Point) {
    if (Math.abs(q.x - p.x) < 300 || Math.abs(q.y - p.y) < 300) {
      props.notify('A room needs to be at least 300 mm each way.', 'error')
      return
    }
    const count = state.rooms.filter((r) => r.floor === floor).length + 1
    const r = addRectRoom(state, floor, p, q, {
      name: `Room ${count}`,
      use: props.roomUse,
      walls: wallStyle,
    })
    props.apply(r.state)
    props.onSelect([{ kind: 'rooms', id: r.id }])
    props.notify(
      `Room ${formatLength(Math.abs(q.x - p.x), state.project.units)} × ${formatLength(Math.abs(q.y - p.y), state.project.units)} added.`,
    )
  }

  function placeWallPoint(p: Point) {
    if (chain.length === 0) {
      setChain([p])
      return
    }
    const first = chain[0]
    const last = chain[chain.length - 1]
    if (dist(p, last) < 10) return
    // Back on the first corner: close the shape, and make it a room.
    if (chain.length >= 3 && dist(p, first) < HIT_PX * 1.6 * view.scale) {
      let next = addWall(state, floor, last, first, wallStyle).state
      const count = next.rooms.filter((r) => r.floor === floor).length + 1
      const room = addRoom(next, floor, chain, {
        name: `Room ${count}`,
        use: props.roomUse,
        walls: null,
      })
      next = room.state
      props.apply(next)
      props.onSelect([{ kind: 'rooms', id: room.id }])
      setChain([])
      props.notify('Outline closed: a room was made.')
      return
    }
    const r = addWall(state, floor, last, p, wallStyle)
    props.apply(r.state)
    setChain([...chain, p])
  }

  function placeAt(world: Point) {
    if (readOnly) return
    if (placing?.kind === 'item' && itemGhost) {
      const r = addItem(
        state,
        floor,
        placing.id,
        itemGhost.item.x,
        itemGhost.item.y,
        placing.rotation,
      )
      props.apply(r.state)
      props.onSelect([{ kind: 'items', id: r.id }])
      props.onPlaced()
      if (!itemGhost.ok)
        props.notify(
          `${catalogEntry(placing.id)?.name} runs into a wall: move it clear.`,
          'error',
        )
      return true
    }
    if (
      openingGhost &&
      (placing?.kind === 'opening' ||
        tool === 'door' ||
        tool === 'window' ||
        tool === 'pass')
    ) {
      if (!openingGhost.ok) {
        props.notify(openingGhost.reason, 'error')
        return true
      }
      const r = addOpening(
        state,
        openingGhost.wall.id,
        openingGhost.opening.offset,
        openingPreset(openingGhost.presetId)!,
      )
      if (r.error || !r.id) props.notify(r.error ?? 'It does not fit.', 'error')
      else {
        props.apply(
          updateOpening(r.state, r.id, { side: openingGhost.opening.side }).state,
        )
        props.onSelect([{ kind: 'openings', id: r.id }])
        props.onPlaced()
        props.onTool('select')
      }
      return true
    }
    if (tool === 'door' || tool === 'window' || tool === 'pass') {
      props.notify('Click on a wall to place it.', 'error')
      return true
    }
    const p = snap(world)
    switch (tool) {
      case 'stairs': {
        const r = addStair(state, floor, p.x, p.y, 0)
        if (r.error || !r.id) props.notify(r.error ?? 'No stair.', 'error')
        else {
          props.apply(r.state)
          props.onSelect([{ kind: 'stairs', id: r.id }])
          props.onTool('select')
        }
        return true
      }
      case 'column': {
        const r = addColumn(state, floor, p.x, p.y)
        props.apply(r.state)
        props.onSelect([{ kind: 'columns', id: r.id }])
        return true
      }
      case 'label': {
        const r = addLabel(state, floor, p.x, p.y, 'Note')
        props.apply(r.state)
        props.onSelect([{ kind: 'labels', id: r.id }])
        props.onTool('select')
        props.notify('Label added: type its text in the panel on the right.')
        return true
      }
      case 'roof': {
        const r = addRoof(state, floor, 'gable')
        if (r.error || !r.id) props.notify(r.error ?? 'No roof.', 'error')
        else {
          props.apply(r.state)
          props.onSelect([{ kind: 'roofs', id: r.id }])
          props.onTool('select')
          props.notify(
            'Roof added over this floor. Choose its type in the panel; it shows in 3D.',
          )
        }
        return true
      }
      case 'dimension': {
        if (!dimStart) setDimStart(p)
        else {
          const r = addDimension(state, floor, dimStart, p)
          props.apply(r.state)
          props.onSelect([{ kind: 'dimensions', id: r.id }])
          setDimStart(null)
        }
        return true
      }
      case 'wall':
        placeWallPoint(chain.length ? snap(world, chain[chain.length - 1]) : p)
        return true
    }
    return false
  }

  // ------------------------------------------------------------- pointer

  const handleSize = HIT_PX * view.scale
  const single = selection.length === 1 ? selection[0] : null
  const selectedItem =
    single?.kind === 'items' ? state.items.find((i) => i.id === single.id) : undefined
  const selectedWall =
    single?.kind === 'walls' ? state.walls.find((w) => w.id === single.id) : undefined
  const selectedRoom =
    single?.kind === 'rooms' ? state.rooms.find((r) => r.id === single.id) : undefined
  const rotateHandle = selectedItem ? rotateHandleAt(selectedItem, handleSize) : null
  const resizeHandle = selectedItem ? resizeHandleAt(selectedItem) : null
  const vertexHandles: Point[] = selectedWall
    ? [selectedWall.a, selectedWall.b]
    : selectedRoom
      ? selectedRoom.outline
      : []

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    svgRef.current?.focus({ preventScroll: true })
    const world = toWorld(e.clientX, e.clientY)
    if (
      e.button === 1 ||
      e.button === 2 ||
      tool === 'pan' ||
      (e.button === 0 && e.nativeEvent.getModifierState?.(' '))
    ) {
      e.currentTarget.setPointerCapture(e.pointerId)
      setDrag({ mode: 'pan', sx: e.clientX, sy: e.clientY, view })
      return
    }
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    if (readOnly) {
      const hit = hitTest(state, floor, world, HIT_PX * view.scale)
      props.onSelect(hit ? [hit] : [])
      return
    }
    if (
      placing ||
      [
        'door',
        'window',
        'pass',
        'stairs',
        'column',
        'label',
        'roof',
        'dimension',
        'wall',
      ].includes(tool)
    ) {
      placeAt(world)
      return
    }
    if (tool === 'room' || tool === 'balcony') {
      const p = snap(world)
      setDrag({ mode: 'rect', start: p, end: p })
      return
    }
    if (tool === 'measure') {
      const p = snap(world)
      setDrag({ mode: 'measure', start: p, end: p })
      return
    }
    // Select: handles first, then parts.
    if (rotateHandle && dist(world, rotateHandle) < handleSize * 1.5 && selectedItem) {
      setDrag({ mode: 'rotate', base: state, id: selectedItem.id })
      return
    }
    if (resizeHandle && dist(world, resizeHandle) < handleSize * 1.5 && selectedItem) {
      setDrag({ mode: 'resize', base: state, id: selectedItem.id })
      return
    }
    const vertex = vertexHandles.find((v) => dist(world, v) < handleSize * 1.5)
    if (vertex) {
      setDrag({ mode: 'vertex', base: state, from: vertex })
      return
    }
    const hit = hitTest(state, floor, world, HIT_PX * view.scale)
    if (!hit) {
      setDrag({ mode: 'box', start: world, end: world, add: e.shiftKey })
      if (!e.shiftKey) props.onSelect([])
      return
    }
    const already = selection.some((r) => r.kind === hit.kind && r.id === hit.id)
    let refs = selection
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      refs = already
        ? selection.filter((r) => !(r.kind === hit.kind && r.id === hit.id))
        : [...selection, hit]
      props.onSelect(refs)
      if (already) return
    } else if (!already) {
      refs = [hit]
      props.onSelect(refs)
    }
    if (hit.kind === 'openings' && refs.length === 1)
      setDrag({ mode: 'opening', base: state, id: hit.id })
    else setDrag({ mode: 'move', base: state, refs, start: world, moved: false })
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const world = toWorld(e.clientX, e.clientY)
    setHover(world)
    setShift(e.shiftKey)
    setAlt(e.altKey)
    const info =
      tool === 'wall' && chain.length
        ? snapInfo(world, chain[chain.length - 1])
        : [
              'wall',
              'room',
              'balcony',
              'measure',
              'dimension',
              'stairs',
              'column',
              'label',
            ].includes(tool)
          ? snapInfo(world)
          : { point: world, to: 'none' }
    setSnapped(info.to)
    props.onCursor(info.point, info.to)
    if (!drag) return
    switch (drag.mode) {
      case 'pan':
        setView({
          ...drag.view,
          cx: drag.view.cx - (e.clientX - drag.sx) * drag.view.scale,
          cy: drag.view.cy - (e.clientY - drag.sy) * drag.view.scale,
        })
        return
      case 'move': {
        let dx = world.x - drag.start.x
        let dy = world.y - drag.start.y
        if (!drag.moved && Math.hypot(dx, dy) < handleSize * 0.6) return
        if (state.project.snap && !e.altKey) {
          dx = snapValue(dx, grid)
          dy = snapValue(dy, grid)
        }
        if (e.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) dy = 0
          else dx = 0
        }
        setDrag({ ...drag, moved: true })
        showDraft(translateParts(drag.base, drag.refs, dx, dy))
        return
      }
      case 'vertex':
        showDraft(moveVertex(drag.base, floor, drag.from, snapWith(drag.base, world)))
        return
      case 'rotate': {
        const item = drag.base.items.find((i) => i.id === drag.id)
        if (!item) return
        let angle = (Math.atan2(world.y - item.y, world.x - item.x) * 180) / Math.PI + 90
        if (!e.altKey) angle = Math.round(angle / 15) * 15
        showDraft(
          updatePart(drag.base, 'items', drag.id, {
            rotation: ((Math.round(angle) % 360) + 360) % 360,
          }),
        )
        return
      }
      case 'resize': {
        const item = drag.base.items.find((i) => i.id === drag.id)
        if (!item) return
        const r = (-item.rotation * Math.PI) / 180
        const lx = (world.x - item.x) * Math.cos(r) - (world.y - item.y) * Math.sin(r)
        const ly = (world.x - item.x) * Math.sin(r) + (world.y - item.y) * Math.cos(r)
        const round = (v: number) => (e.altKey ? Math.round(v) : snapValue(v, 10))
        showDraft(
          updatePart(drag.base, 'items', drag.id, {
            width: Math.max(100, round(Math.abs(lx) * 2)),
            depth: Math.max(100, round(Math.abs(ly) * 2)),
          }),
        )
        return
      }
      case 'opening': {
        const o = drag.base.openings.find((x) => x.id === drag.id)
        const w = drag.base.walls.find((x) => x.id === o?.wall)
        if (!o || !w) return
        const along = projectOnSegment(world, w.a, w.b).along
        const r = updateOpening(drag.base, o.id, {
          offset: e.altKey ? Math.round(along) : snapValue(along, 50),
        })
        if (!r.error) showDraft(r.state)
        return
      }
      case 'box':
        setDrag({ ...drag, end: world })
        return
      case 'rect':
        setDrag({ ...drag, end: snap(world) })
        return
      case 'measure':
        setDrag({ ...drag, end: snap(world, drag.start) })
        return
    }
  }

  function snapWith(base: StudioState, p: Point) {
    if (alt || !base.project.snap) return { x: Math.round(p.x), y: Math.round(p.y) }
    return snapToGridOnly(p, grid)
  }

  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (svgRef.current?.hasPointerCapture(e.pointerId))
      svgRef.current.releasePointerCapture(e.pointerId)
    if (!drag) return
    const world = toWorld(e.clientX, e.clientY)
    switch (drag.mode) {
      case 'move':
        if (drag.moved)
          commitDraft(drag.base, (base) => {
            let dx = world.x - drag.start.x
            let dy = world.y - drag.start.y
            if (state.project.snap && !e.altKey) {
              dx = snapValue(dx, grid)
              dy = snapValue(dy, grid)
            }
            if (e.shiftKey) {
              if (Math.abs(dx) > Math.abs(dy)) dy = 0
              else dx = 0
            }
            return translateParts(base, drag.refs, dx, dy)
          })
        break
      case 'vertex':
      case 'rotate':
      case 'resize':
      case 'opening':
        // The draft already holds the result.
        commitCurrentDraft()
        break
      case 'box': {
        const refs = partsInBox(state, floor, drag.start, drag.end)
        props.onSelect(
          drag.add
            ? [
                ...selection,
                ...refs.filter(
                  (r) => !selection.some((s) => s.kind === r.kind && s.id === r.id),
                ),
              ]
            : refs,
        )
        break
      }
      case 'rect':
        if (tool === 'balcony') {
          if (
            Math.abs(drag.end.x - drag.start.x) >= 500 &&
            Math.abs(drag.end.y - drag.start.y) >= 500
          ) {
            const r = addSlab(
              state,
              floor,
              floorIsGround(state, floor) ? 'terrace' : 'balcony',
              drag.start,
              drag.end,
            )
            props.apply(r.state)
            props.onSelect([{ kind: 'slabs', id: r.id }])
          }
        } else if (dist(drag.start, drag.end) > 10) makeRoom(drag.start, drag.end)
        break
      case 'measure':
        setMeasure({ a: drag.start, b: drag.end })
        break
    }
    setDrag(null)
  }

  function commitDraft(base: StudioState, make: (base: StudioState) => StudioState) {
    const next = make(base)
    showDraft(null)
    props.apply(next)
  }
  /** Saves the draft last shown (one undo step), if the drag changed anything. */
  function commitCurrentDraft() {
    const next = draftRef.current
    showDraft(null)
    if (next) props.apply(next)
  }

  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    const world = toWorld(e.clientX, e.clientY)
    const factor = Math.exp(-e.deltaY * 0.0015)
    setView((v) => {
      const scale = clampScale(v.scale / factor)
      // Zoom about the pointer.
      return {
        scale,
        cx: world.x - (world.x - v.cx) * (scale / v.scale),
        cy: world.y - (world.y - v.cy) * (scale / v.scale),
      }
    })
  }

  // ------------------------------------------------------------- drawing

  const vb = {
    x: view.cx - (size.w / 2) * view.scale,
    y: view.cy - (size.h / 2) * view.scale,
    w: size.w * view.scale,
    h: size.h * view.scale,
  }
  const minor = grid / view.scale >= 7
  const major = 1000
  const cursor =
    drag?.mode === 'pan'
      ? 'grabbing'
      : tool === 'pan'
        ? 'grab'
        : tool === 'select' && !placing
          ? 'default'
          : 'crosshair'
  const units = state.project.units
  const lastChain = chain[chain.length - 1]
  const chainNext = lastChain && hover ? snap(hover, lastChain) : null
  const text = 13 * view.scale
  const selectionBox =
    selection.length > 1 ? bounds(selection.flatMap((r) => refPoints(state, r))) : null

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f6f4ef]">
      <svg
        ref={svgRef}
        data-testid="studio-canvas"
        tabIndex={0}
        role="application"
        aria-label="Floor plan. Use the tools on the left to draw; arrow keys move the selection."
        className="h-full w-full touch-none outline-none select-none"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          setHover(null)
          props.onCursor(null, 'none')
        }}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
        onDoubleClick={() => {
          if (tool === 'wall' && chain.length) setChain([])
        }}
      >
        <PlanDefs />
        <defs>
          <pattern
            id="studio-grid-minor"
            width={grid}
            height={grid}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${grid} 0 L 0 0 0 ${grid}`}
              fill="none"
              stroke="#e7e2d8"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </pattern>
          <pattern
            id="studio-grid-major"
            width={major}
            height={major}
            patternUnits="userSpaceOnUse"
          >
            {minor && (
              <rect width={major} height={major} fill="url(#studio-grid-minor)" />
            )}
            <path
              d={`M ${major} 0 L 0 0 0 ${major}`}
              fill="none"
              stroke="#d6cfc1"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </pattern>
        </defs>
        <rect
          x={vb.x}
          y={vb.y}
          width={vb.w}
          height={vb.h}
          fill="url(#studio-grid-major)"
        />
        {/* The origin. */}
        <path
          d={`M ${-text} 0 H ${text} M 0 ${-text} V ${text}`}
          stroke="#b9ae9a"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <PlanDrawing
          state={state}
          floor={floor}
          selection={selection}
          layers={props.layers ?? DEFAULT_LAYERS}
          ghostOpening={
            openingGhost
              ? {
                  opening: openingGhost.opening,
                  wall: openingGhost.wall,
                  ok: openingGhost.ok,
                }
              : null
          }
          ghostItem={itemGhost}
          pixel={view.scale}
        />
        {/* Handles. */}
        {!readOnly &&
          vertexHandles.map((v, i) => (
            <rect
              key={i}
              x={v.x - handleSize * 0.6}
              y={v.y - handleSize * 0.6}
              width={handleSize * 1.2}
              height={handleSize * 1.2}
              fill="#ffffff"
              stroke="#2563eb"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              data-testid="vertex-handle"
            />
          ))}
        {!readOnly && selectedItem && rotateHandle && resizeHandle && (
          <g>
            <line
              x1={selectedItem.x}
              y1={selectedItem.y}
              x2={rotateHandle.x}
              y2={rotateHandle.y}
              stroke="#2563eb"
              strokeWidth={1}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={rotateHandle.x}
              cy={rotateHandle.y}
              r={handleSize * 0.7}
              fill="#ffffff"
              stroke="#2563eb"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              data-testid="rotate-handle"
            />
            <rect
              x={resizeHandle.x - handleSize * 0.55}
              y={resizeHandle.y - handleSize * 0.55}
              width={handleSize * 1.1}
              height={handleSize * 1.1}
              fill="#2563eb"
              data-testid="resize-handle"
            />
          </g>
        )}
        {selectionBox && (
          <rect
            x={selectionBox.minX - 100}
            y={selectionBox.minY - 100}
            width={selectionBox.width + 200}
            height={selectionBox.height + 200}
            fill="none"
            stroke="#2563eb"
            strokeDasharray="6 4"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {/* Tool previews. */}
        {drag?.mode === 'box' && (
          <rect
            x={Math.min(drag.start.x, drag.end.x)}
            y={Math.min(drag.start.y, drag.end.y)}
            width={Math.abs(drag.end.x - drag.start.x)}
            height={Math.abs(drag.end.y - drag.start.y)}
            fill="#2563eb14"
            stroke="#2563eb"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {drag?.mode === 'rect' && (
          <g data-testid="room-preview">
            <rect
              x={Math.min(drag.start.x, drag.end.x)}
              y={Math.min(drag.start.y, drag.end.y)}
              width={Math.abs(drag.end.x - drag.start.x)}
              height={Math.abs(drag.end.y - drag.start.y)}
              fill="#2563eb10"
              stroke="#1d4ed8"
              strokeWidth={wallStyle.thickness / view.scale}
              strokeOpacity={0.5}
            />
            <Tag
              x={(drag.start.x + drag.end.x) / 2}
              y={Math.min(drag.start.y, drag.end.y) - text * 1.6}
              size={text}
              text={formatLength(Math.abs(drag.end.x - drag.start.x), units)}
            />
            <Tag
              x={Math.max(drag.start.x, drag.end.x) + text * 4}
              y={(drag.start.y + drag.end.y) / 2}
              size={text}
              text={formatLength(Math.abs(drag.end.y - drag.start.y), units)}
            />
          </g>
        )}
        {tool === 'wall' && chain.length > 0 && (
          <g data-testid="wall-preview">
            <polyline
              points={chain.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#1d4ed8"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
            {chainNext && (
              <>
                <line
                  x1={lastChain.x}
                  y1={lastChain.y}
                  x2={chainNext.x}
                  y2={chainNext.y}
                  stroke="#1d4ed8"
                  strokeOpacity={0.45}
                  strokeWidth={wallStyle.thickness / view.scale}
                />
                <Tag
                  x={(lastChain.x + chainNext.x) / 2}
                  y={(lastChain.y + chainNext.y) / 2 - text * 1.4}
                  size={text}
                  text={formatLength(dist(lastChain, chainNext), units)}
                />
              </>
            )}
            {chain.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={handleSize * 0.45}
                fill={i === 0 ? '#1d4ed8' : '#ffffff'}
                stroke="#1d4ed8"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        )}
        {dimStart && hover && (
          <line
            x1={dimStart.x}
            y1={dimStart.y}
            x2={snap(hover).x}
            y2={snap(hover).y}
            stroke="#0f766e"
            strokeDasharray="6 4"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {(drag?.mode === 'measure' ? { a: drag.start, b: drag.end } : measure) &&
          (() => {
            const m = drag?.mode === 'measure' ? { a: drag.start, b: drag.end } : measure!
            return (
              <g data-testid="measure">
                <line
                  x1={m.a.x}
                  y1={m.a.y}
                  x2={m.b.x}
                  y2={m.b.y}
                  stroke="#c2410c"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  markerStart="url(#studio-tick)"
                  markerEnd="url(#studio-tick)"
                />
                <Tag
                  x={(m.a.x + m.b.x) / 2}
                  y={(m.a.y + m.b.y) / 2 - text * 1.4}
                  size={text}
                  text={formatLength(dist(m.a, m.b), units)}
                  tone="#c2410c"
                />
              </g>
            )
          })()}
        {hover &&
          [
            'wall',
            'room',
            'balcony',
            'measure',
            'dimension',
            'stairs',
            'column',
          ].includes(tool) &&
          (() => {
            const p = tool === 'wall' && lastChain ? snap(hover, lastChain) : snap(hover)
            return (
              <circle
                cx={p.x}
                cy={p.y}
                r={handleSize * 0.35}
                fill={
                  snapped === 'corner'
                    ? '#f97316'
                    : snapped === 'wall'
                      ? '#16a34a'
                      : '#1d4ed8'
                }
                pointerEvents="none"
              />
            )
          })()}
      </svg>
      {typed && (
        <div
          className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md border border-blue-300 bg-white px-3 py-1.5 font-mono text-sm text-blue-900 shadow"
          data-testid="typed-size"
        >
          {tool === 'room' ? 'Room size: ' : 'Length: '}
          {typed}
          <span className="ml-2 text-xs text-slate-500">Enter to apply</span>
        </div>
      )}
      {openingGhost && !openingGhost.ok && (
        <div
          className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-md bg-red-700 px-3 py-1 text-sm text-white shadow"
          role="status"
        >
          {openingGhost.reason}
        </div>
      )}
    </div>
  )
})

function Tag({
  x,
  y,
  size,
  text,
  tone = '#1d4ed8',
}: {
  x: number
  y: number
  size: number
  text: string
  tone?: string
}) {
  const w = text.length * size * 0.62 + size
  return (
    <g pointerEvents="none">
      <rect
        x={x - w / 2}
        y={y - size * 0.9}
        width={w}
        height={size * 1.6}
        rx={size * 0.3}
        fill="#ffffff"
        stroke={tone}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={x}
        y={y + size * 0.15}
        fontSize={size}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={tone}
        fontFamily="ui-monospace, monospace"
      >
        {text}
      </text>
    </g>
  )
}

function snapToGridOnly(p: Point, grid: number): Point {
  return { x: snapValue(p.x, grid), y: snapValue(p.y, grid) }
}

function floorIsGround(state: StudioState, floor: string) {
  return [...state.floors].sort((a, b) => a.elevation - b.elevation)[0]?.id === floor
}

function rotateHandleAt(item: Item, handle: number): Point {
  const { depth } = itemSize(item)
  const r = (item.rotation * Math.PI) / 180
  const off = depth / 2 + handle * 4
  // "Up" in the item's frame is −y.
  return { x: item.x + Math.sin(r) * off, y: item.y - Math.cos(r) * off }
}

function resizeHandleAt(item: Item): Point {
  return itemCorners(item)[2]
}
