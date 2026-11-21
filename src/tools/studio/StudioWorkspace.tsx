/**
 * Space Studio on the work computer: the toolbar, the tools, the library, the
 * plan (2D) or the model (3D and walkthrough), the properties and checks, and
 * the status bar. One saved file (the building model) drives all of it.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { analyse } from '../../studio/analysis'
import { catalogEntry, openingPreset } from '../../studio/catalog'
import {
  StudioStateSchema,
  type Point,
  type Ref,
  type RoomUse,
  type StudioState,
} from '../../studio/model'
import {
  addFloor,
  allParts,
  clipboardIsEmpty,
  copyParts,
  deleteFloor,
  deleteParts,
  pasteParts,
  rotateParts,
  translateParts,
  WALL_PRESETS,
  type Clipboard,
  type WallStyle,
} from '../../studio/ops'
import {
  formatArea,
  formatLength,
  formatMoney,
  lengthValue,
  parseLength,
} from '../../studio/units'
import type { ToolWorkspaceProps } from '../ui'
import { SIcon, type StudioIconName } from './icons'
import { ChecksPanel, LibraryPanel, ProjectTree } from './Panels'
import { PlanCanvas, type CanvasApi, type Tool } from './PlanCanvas'
import { Properties } from './Properties'
import { DEFAULT_LAYERS, roomUseName, type Layers } from './shared'

const Model3D = lazy(() => import('./Studio3D'))

/** Copies survive switching files, so they can be pasted into another project. */
let clipboard: Clipboard | null = null

type Mode = 'plan' | 'model' | 'walk'

const TOOLS: Array<{
  group: string
  items: Array<{
    id: Tool
    name: string
    icon: StudioIconName
    key: string
    hint: string
  }>
}> = [
  {
    group: 'Structure',
    items: [
      {
        id: 'wall',
        name: 'Wall',
        icon: 'wall',
        key: 'W',
        hint: 'Click corner by corner; type a length and Enter; Esc to finish.',
      },
      {
        id: 'room',
        name: 'Room',
        icon: 'room',
        key: 'R',
        hint: 'Drag a rectangle, or type its size (4200x3600) and Enter.',
      },
      {
        id: 'column',
        name: 'Column',
        icon: 'column',
        key: 'C',
        hint: 'Click to place a column.',
      },
      {
        id: 'balcony',
        name: 'Balcony / terrace',
        icon: 'balcony',
        key: 'S',
        hint: 'Drag the outline of a balcony or terrace.',
      },
      {
        id: 'roof',
        name: 'Roof',
        icon: 'roof',
        key: '⇧R',
        hint: 'Click to roof this floor; choose flat, gable or hip.',
      },
    ],
  },
  {
    group: 'Openings',
    items: [
      {
        id: 'door',
        name: 'Door',
        icon: 'door',
        key: 'D',
        hint: 'Click a wall: green where it fits, red where it does not.',
      },
      {
        id: 'window',
        name: 'Window',
        icon: 'window',
        key: 'N',
        hint: 'Click a wall to place a window.',
      },
      {
        id: 'pass',
        name: 'Pass-through',
        icon: 'pass',
        key: 'P',
        hint: 'An open gap in a wall.',
      },
      {
        id: 'stairs',
        name: 'Stairs',
        icon: 'stairs',
        key: 'U',
        hint: 'Click to place a stair up to the floor above.',
      },
    ],
  },
  {
    group: 'Measure & label',
    items: [
      {
        id: 'measure',
        name: 'Measure',
        icon: 'measure',
        key: 'M',
        hint: 'Drag to measure a distance (not saved).',
      },
      {
        id: 'dimension',
        name: 'Dimension',
        icon: 'dimension',
        key: 'I',
        hint: 'Click two points for a dimension on the plan.',
      },
      {
        id: 'label',
        name: 'Label',
        icon: 'label',
        key: 'T',
        hint: 'Click to add a note to the plan.',
      },
    ],
  },
]

const KEYS: Record<string, Tool> = {
  v: 'select',
  h: 'pan',
  w: 'wall',
  r: 'room',
  d: 'door',
  n: 'window',
  p: 'pass',
  u: 'stairs',
  c: 'column',
  s: 'balcony',
  m: 'measure',
  i: 'dimension',
  t: 'label',
}

export default function StudioWorkspace({
  state: saved,
  readOnly,
  onUpdate,
  history,
  onSave,
  title,
}: ToolWorkspaceProps<StudioState>) {
  // Old or partial files get their defaults (the schema parses on load too).
  const base = useMemo(() => StudioStateSchema.parse(saved), [saved])
  const [draft, setDraft] = useState<StudioState | null>(null)
  const state = draft ?? base
  const [floorChoice, setFloor] = useState(
    () => [...base.floors].sort((a, b) => a.elevation - b.elevation)[0].id,
  )
  const [chosen, setSelection] = useState<Ref[]>([])
  const [tool, setTool] = useState<Tool>('select')
  const [placing, setPlacing] = useState<
    | { kind: 'item'; id: string; rotation: number }
    | { kind: 'opening'; id: string }
    | null
  >(null)
  const [mode, setMode] = useState<Mode>('plan')
  const [library, setLibrary] = useState(false)
  const [panel, setPanel] = useState<'properties' | 'project' | 'checks'>('properties')
  const [wallStyle, setWallStyle] = useState<WallStyle>(WALL_PRESETS.interior)
  const [roomUse, setRoomUse] = useState<RoomUse>('other')
  const [layers, setLayers] = useState<Layers>(DEFAULT_LAYERS)
  const [cursor, setCursor] = useState<{ p: Point | null; snapped: string }>({
    p: null,
    snapped: 'none',
  })
  const [toast, setToast] = useState<{
    text: string
    tone: 'info' | 'error'
    at: number
  } | null>(null)
  const [confirm, setConfirm] = useState<{
    title: string
    body: string
    action: () => void
  } | null>(null)
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const [exporting, setExporting] = useState(false)
  const [layersOpen, setLayersOpen] = useState(false)
  const canvas = useRef<CanvasApi>(null)
  const root = useRef<HTMLDivElement>(null)
  const analysis = useMemo(() => analyse(state), [state])

  // The floor shown must exist (after an undo, a restore, a deleted floor),
  // and the selection holds only what still exists.
  const floor = state.floors.some((f) => f.id === floorChoice)
    ? floorChoice
    : [...state.floors].sort((a, b) => a.elevation - b.elevation)[0].id
  const selection = useMemo(() => {
    const kept = chosen.filter((r) =>
      (state[r.kind] as Array<{ id: string }>).some((x) => x.id === r.id),
    )
    return kept.length === chosen.length ? chosen : kept
  }, [chosen, state])

  const notify = useCallback(
    (text: string, tone: 'info' | 'error' = 'info') =>
      setToast({ text, tone, at: Date.now() }),
    [],
  )
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(
      () => setToast(null),
      toast.tone === 'error' ? 5000 : 3000,
    )
    return () => window.clearTimeout(t)
  }, [toast])

  const apply = useCallback(
    (next: StudioState) => {
      if (readOnly || !onUpdate) return
      setDraft(null)
      onUpdate(() => next)
    },
    [readOnly, onUpdate],
  )

  const sortedFloors = useMemo(
    () => [...state.floors].sort((a, b) => a.elevation - b.elevation),
    [state.floors],
  )
  const floorObj = state.floors.find((f) => f.id === floor) ?? sortedFloors[0]

  // ------------------------------------------------------------- actions

  const del = () => {
    if (!selection.length) return
    apply(deleteParts(state, selection))
    notify(
      `Deleted ${selection.length === 1 ? 'one item' : `${selection.length} items`}.`,
    )
    setSelection([])
  }
  const copy = () => {
    if (!selection.length) return false
    clipboard = copyParts(state, selection)
    notify('Copied. Ctrl+V pastes, here or in another project.')
    return true
  }
  const paste = (dx = 500, dy = 500) => {
    if (!clipboard || clipboardIsEmpty(clipboard))
      return notify('Nothing has been copied yet.', 'error')
    const r = pasteParts(state, clipboard, floor, dx, dy)
    apply(r.state)
    setSelection(r.refs.filter((x) => x.kind !== 'openings'))
  }
  const duplicate = () => {
    if (!selection.length) return
    const clip = copyParts(state, selection)
    const r = pasteParts(state, clip, floor, 500, 500)
    apply(r.state)
    setSelection(r.refs.filter((x) => x.kind !== 'openings'))
  }
  const rotate = (deg: number) =>
    selection.length && apply(rotateParts(state, selection, deg))
  const nudge = (dx: number, dy: number) =>
    selection.length && apply(translateParts(state, selection, dx, dy))
  const goFloor = (dir: 1 | -1) => {
    const i = sortedFloors.findIndex((f) => f.id === floor)
    const next = sortedFloors[i + dir]
    if (next) {
      setFloor(next.id)
      setSelection([])
      notify(`${next.name}`)
    }
  }
  const save = async () => {
    if (!onSave) return
    setSaving('saving')
    setSaving((await onSave()) ? 'saved' : 'failed')
    window.setTimeout(() => setSaving('idle'), 2000)
  }
  const pickTool = (t: Tool) => {
    setPlacing(null)
    setTool(t)
    if (t !== 'select') setSelection([])
    if (mode !== 'plan') setMode('plan')
  }

  // ------------------------------------------------------------- keys

  const onKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('input, textarea, select, [contenteditable=true]')) return
    if (mode === 'walk') return // the walkthrough has its own keys
    const native = e.nativeEvent
    if (mode === 'plan' && canvas.current?.key(native)) {
      e.preventDefault()
      return
    }
    const ctrl = e.ctrlKey || e.metaKey
    const k = e.key.toLowerCase()
    const done = () => e.preventDefault()
    if (ctrl && k === 'z' && !e.shiftKey) return (done(), history?.undo())
    if ((ctrl && k === 'z' && e.shiftKey) || (ctrl && k === 'y'))
      return (done(), history?.redo())
    if (ctrl && k === 's') return (done(), void save())
    if (readOnly) return
    if (ctrl && k === 'c') return (done(), copy())
    if (ctrl && k === 'x') return (done(), copy() && del())
    if (ctrl && k === 'v') return (done(), paste())
    if (ctrl && k === 'd') return (done(), duplicate())
    if (ctrl && k === 'a') return (done(), setSelection(allParts(state, floor)))
    if (e.key === 'Delete' || e.key === 'Backspace') return (done(), del())
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown'))
      return (done(), goFloor(e.key === 'ArrowUp' ? 1 : -1))
    if (e.key.startsWith('Arrow') && selection.length) {
      done()
      const step = ctrl ? 10 : e.shiftKey ? state.project.grid * 10 : state.project.grid
      const [dx, dy] =
        e.key === 'ArrowLeft'
          ? [-step, 0]
          : e.key === 'ArrowRight'
            ? [step, 0]
            : e.key === 'ArrowUp'
              ? [0, -step]
              : [0, step]
      return nudge(dx, dy)
    }
    if (e.key === '[' || e.key === ']')
      return (done(), rotate((e.key === ']' ? 1 : -1) * (e.shiftKey ? 90 : 15)))
    if (e.key === 'Escape') {
      done()
      if (placing) return setPlacing(null)
      if (selection.length) return setSelection([])
      return setTool('select')
    }
    if (ctrl || e.altKey) return
    if (placing?.kind === 'item' && k === 'r')
      return (done(), setPlacing({ ...placing, rotation: (placing.rotation + 90) % 360 }))
    if (k === 'b') return (done(), setLibrary((v) => !v))
    if (k === 'f' && mode === 'plan') return (done(), canvas.current?.fit())
    if (e.shiftKey && k === 'r') return (done(), pickTool('roof'))
    if (KEYS[k] && !e.shiftKey) return (done(), pickTool(KEYS[k]))
  }

  // ------------------------------------------------------------- floors

  const newFloor = (copyWalls: boolean) => {
    const r = addFloor(state, { copyWalls })
    apply(r.state)
    setFloor(r.id)
    setSelection([])
    notify(
      copyWalls
        ? 'Floor added, with the outside walls of the floor below.'
        : 'Floor added.',
    )
  }
  const removeFloor = () => {
    setConfirm({
      title: `Delete the ${floorObj.name}?`,
      body: 'Everything on it (walls, rooms, furniture) is deleted too. You can undo this, or restore it from Version history.',
      action: () => {
        const r = deleteFloor(state, floor)
        if (r.error) return notify(r.error, 'error')
        apply(r.state)
        setSelection([])
      },
    })
  }

  // ------------------------------------------------------------- exports

  const runExport = async (kind: 'pdf' | 'svg' | 'png' | 'dxf' | 'json' | 'report') => {
    setExporting(false)
    try {
      const m = await import('./exports')
      const name = title ?? state.project.name
      await m.exportProject(kind, state, name)
      notify(`Exported the ${kind === 'report' ? 'project report' : kind.toUpperCase()}.`)
    } catch (err) {
      notify(
        `The export failed: ${err instanceof Error ? err.message : String(err)}`,
        'error',
      )
    }
  }

  const activeHint = placing
    ? placing.kind === 'item'
      ? `Placing ${catalogEntry(placing.id)?.name}: click the plan. R turns it, Esc cancels.`
      : `Placing ${openingPreset(placing.id)?.name}: click a wall.`
    : (TOOLS.flatMap((g) => g.items).find((t) => t.id === tool)?.hint ??
      (tool === 'pan'
        ? 'Drag to move around the plan.'
        : 'Click to select; drag to move; Shift adds to the selection.'))
  const units = state.project.units

  return (
    <div
      ref={root}
      className="flex h-full min-h-[520px] flex-col bg-slate-100 text-slate-900"
      onKeyDown={onKeyDown}
      onKeyUp={(e) => canvas.current?.key(e.nativeEvent)}
      data-testid="studio"
    >
      {/* Top toolbar */}
      <div
        className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-2 py-1.5"
        role="toolbar"
        aria-label="Space Studio"
      >
        <div className="mr-1 min-w-0">
          <p
            className="truncate text-sm font-semibold text-slate-900"
            data-testid="studio-project-name"
          >
            {state.project.name}
          </p>
          <p className="truncate text-[11px] text-slate-500">
            {state.project.client ? `${state.project.client} · ` : ''}
            {analysis.rooms.length} rooms · {analysis.totalArea.toFixed(1)} m²
          </p>
        </div>
        <label className="flex items-center gap-1 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-sm">
          <SIcon name="floors" className="h-4 w-4 text-slate-500" />
          <span className="sr-only">Floor</span>
          <select
            value={floor}
            onChange={(e) => (setFloor(e.target.value), setSelection([]))}
            className="bg-transparent text-sm outline-none"
            data-testid="floor-select"
            onKeyDown={(e) => e.stopPropagation()}
          >
            {[...sortedFloors].reverse().map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        {!readOnly && (
          <div className="flex items-center">
            <ToolbarButton
              icon="plus"
              label="Add a floor above (copies the outside walls)"
              onClick={() => newFloor(true)}
              testId="add-floor"
            />
            <ToolbarButton
              icon="bin"
              label={`Delete the ${floorObj.name}`}
              onClick={removeFloor}
              disabled={state.floors.length <= 1}
              testId="delete-floor"
            />
          </div>
        )}
        <div
          className="mx-1 flex rounded-md border border-slate-300 bg-slate-50 p-0.5"
          role="group"
          aria-label="Workspace"
        >
          {(['plan', 'model', 'walk'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => (setMode(m), setPlacing(null))}
              data-testid={`mode-${m}`}
              className={`flex items-center gap-1 rounded px-2.5 py-1 text-sm ${mode === m ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <SIcon name={m === 'plan' ? 'plan' : m === 'model' ? 'cube' : 'walk'} />
              {m === 'plan' ? '2D' : m === 'model' ? '3D' : 'Walk'}
            </button>
          ))}
        </div>
        <div className="flex items-center">
          <ToolbarButton
            icon="undo"
            label="Undo (Ctrl+Z)"
            onClick={() => history?.undo()}
            disabled={!history?.canUndo}
            testId="studio-undo"
          />
          <ToolbarButton
            icon="redo"
            label="Redo (Ctrl+Shift+Z)"
            onClick={() => history?.redo()}
            disabled={!history?.canRedo}
            testId="studio-redo"
          />
        </div>
        {mode === 'plan' && (
          <div className="flex items-center">
            <ToolbarButton
              icon="zoomOut"
              label="Zoom out"
              onClick={() => canvas.current?.zoom(1 / 1.25)}
            />
            <ToolbarButton
              icon="zoomIn"
              label="Zoom in"
              onClick={() => canvas.current?.zoom(1.25)}
            />
            <ToolbarButton
              icon="fit"
              label="Fit the plan (F)"
              onClick={() => canvas.current?.fit()}
              testId="fit"
            />
            <div className="relative">
              <ToolbarButton
                icon="layers"
                label="Layers"
                onClick={() => setLayersOpen((v) => !v)}
                pressed={layersOpen}
              />
              {layersOpen && (
                <div
                  className="absolute top-full left-0 z-20 mt-1 w-56 rounded-md border border-slate-200 bg-white p-2 text-sm shadow-lg"
                  data-testid="layers-menu"
                >
                  {(
                    [
                      ['furniture', 'Furniture'],
                      ['labels', 'Room names and areas'],
                      ['dimensions', 'Wall lengths'],
                      ['below', 'Floor below (faint)'],
                      ['roof', 'Roof outline'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 py-0.5">
                      <input
                        type="checkbox"
                        checked={layers[key]}
                        onChange={(e) =>
                          setLayers({ ...layers, [key]: e.target.checked })
                        }
                      />{' '}
                      {label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1">
          <ToolbarButton
            icon="library"
            label="Library (B)"
            onClick={() => setLibrary((v) => !v)}
            pressed={library}
            disabled={readOnly}
            testId="toggle-library"
            text="Library"
          />
          {onSave && (
            <button
              type="button"
              onClick={() => void save()}
              title="Save now (Ctrl+S). Work also saves by itself."
              className="flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
              data-testid="studio-save"
            >
              <SIcon name="save" />
              {saving === 'saving'
                ? 'Saving…'
                : saving === 'saved'
                  ? 'Saved'
                  : saving === 'failed'
                    ? 'Not saved'
                    : 'Save'}
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExporting((v) => !v)}
              aria-expanded={exporting}
              className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-sm text-white hover:bg-slate-900"
              data-testid="studio-export"
            >
              <SIcon name="export" /> Export
            </button>
            {exporting && (
              <div
                className="absolute top-full right-0 z-30 mt-1 w-64 rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg"
                role="menu"
                data-testid="export-menu"
              >
                {(
                  [
                    ['pdf', 'Plans to scale, with report (PDF)'],
                    ['svg', 'Floor plan (SVG, vector)'],
                    ['png', 'Floor plan (PNG image)'],
                    ['dxf', 'Plan for CAD (DXF)'],
                    ['report', 'Project report (HTML)'],
                    ['json', 'Project backup (JSON)'],
                  ] as const
                ).map(([kind, label]) => (
                  <button
                    key={kind}
                    type="button"
                    role="menuitem"
                    onClick={() => void runExport(kind)}
                    className="block w-full px-3 py-1.5 text-left hover:bg-slate-100"
                    data-testid={`export-${kind}`}
                  >
                    {label}
                  </button>
                ))}
                <p className="border-t border-slate-100 px-3 pt-1.5 text-[11px] text-slate-500">
                  3D screenshots: switch to 3D and use the camera button.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Tools */}
        {mode === 'plan' && (
          <nav
            className="flex w-44 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white py-2"
            aria-label="Drawing tools"
          >
            <div className="flex gap-1 px-2 pb-2">
              <PaletteButton
                icon="select"
                name="Select"
                shortcut="V"
                active={tool === 'select' && !placing}
                onClick={() => pickTool('select')}
                compact
                testId="tool-select"
              />
              <PaletteButton
                icon="pan"
                name="Pan"
                shortcut="H"
                active={tool === 'pan'}
                onClick={() => pickTool('pan')}
                compact
                testId="tool-pan"
              />
            </div>
            {TOOLS.map((g) => (
              <div key={g.group} className="border-t border-slate-100 px-2 pt-2 pb-1">
                <p className="px-1 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  {g.group}
                </p>
                {g.items.map((t) => (
                  <PaletteButton
                    key={t.id}
                    icon={t.icon}
                    name={t.name}
                    shortcut={t.key}
                    active={tool === t.id && !placing}
                    disabled={readOnly}
                    onClick={() => pickTool(t.id)}
                    hint={t.hint}
                    testId={`tool-${t.id}`}
                  />
                ))}
              </div>
            ))}
            {(tool === 'wall' || tool === 'room') && !readOnly && (
              <div
                className="mx-2 mt-1 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs"
                data-testid="wall-style"
              >
                <p className="font-semibold text-slate-700">New walls</p>
                <div className="flex flex-wrap gap-1">
                  {(['exterior', 'interior', 'partition'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={wallStyle.type === t}
                      onClick={() => setWallStyle(WALL_PRESETS[t])}
                      className={`rounded border px-1.5 py-0.5 ${wallStyle.type === t ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 bg-white'}`}
                    >
                      {t === 'exterior'
                        ? 'Outside'
                        : t === 'interior'
                          ? 'Inside'
                          : 'Partition'}
                    </button>
                  ))}
                </div>
                <InlineLength
                  label="Thickness"
                  value={wallStyle.thickness}
                  units={units}
                  onChange={(v) => setWallStyle({ ...wallStyle, thickness: v })}
                />
                <InlineLength
                  label="Height"
                  value={wallStyle.height}
                  units={units}
                  onChange={(v) => setWallStyle({ ...wallStyle, height: v })}
                />
                {tool === 'room' && (
                  <label className="block">
                    <span className="text-slate-600">Room use</span>
                    <select
                      value={roomUse}
                      onChange={(e) => setRoomUse(e.target.value as RoomUse)}
                      className="mt-0.5 w-full rounded border border-slate-300 bg-white px-1 py-0.5"
                      onKeyDown={(e) => e.stopPropagation()}
                      data-testid="new-room-use"
                    >
                      {(
                        [
                          'other',
                          'living',
                          'bedroom',
                          'kitchen',
                          'dining',
                          'bathroom',
                          'wc',
                          'hall',
                          'storage',
                          'office',
                          'meeting',
                          'reception',
                          'open-plan',
                          'utility',
                          'retail',
                          'plant',
                        ] as RoomUse[]
                      ).map((u) => (
                        <option key={u} value={u}>
                          {roomUseName(u)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
          </nav>
        )}
        {library && mode === 'plan' && (
          <LibraryPanel
            placing={placing?.id ?? null}
            disabled={readOnly}
            onClose={() => (setLibrary(false), setPlacing(null))}
            onPick={(kind) => {
              setTool('select')
              setPlacing({ kind: 'item', id: kind, rotation: 0 })
              setSelection([])
              root.current
                ?.querySelector<SVGElement>('[data-testid=studio-canvas]')
                ?.focus()
            }}
            onPickOpening={(id) => {
              setTool('select')
              setPlacing({ kind: 'opening', id })
              setSelection([])
            }}
          />
        )}

        {/* The design */}
        <main className="relative min-w-0 flex-1">
          {mode === 'plan' ? (
            <PlanCanvas
              ref={canvas}
              state={state}
              floor={floor}
              selection={selection}
              onSelect={(refs) => {
                setSelection(refs)
                if (refs.length) setPanel('properties')
              }}
              tool={tool}
              onTool={setTool}
              placing={placing}
              onPlaced={() => setPlacing(null)}
              apply={apply}
              setDraft={setDraft}
              wallStyle={wallStyle}
              roomUse={roomUse}
              readOnly={readOnly}
              layers={layers}
              notify={notify}
              onCursor={(p, snapped) => setCursor({ p, snapped })}
            />
          ) : (
            <Suspense
              fallback={<p className="p-6 text-sm text-slate-600">Building the model…</p>}
            >
              <Model3D
                state={state}
                floor={floor}
                walk={mode === 'walk'}
                selection={selection}
                onSelect={(refs) => (
                  setSelection(refs),
                  refs.length && setPanel('properties')
                )}
                apply={apply}
                readOnly={readOnly}
                onExitWalk={() => setMode('model')}
                onFloor={setFloor}
                notify={notify}
                fileName={title ?? state.project.name}
              />
            </Suspense>
          )}
          {toast && (
            <div
              role="status"
              aria-live="polite"
              className={`pointer-events-none absolute right-3 bottom-3 max-w-sm rounded-md px-3 py-2 text-sm shadow-lg ${toast.tone === 'error' ? 'bg-red-700 text-white' : 'bg-slate-800 text-white'}`}
              data-testid="studio-toast"
            >
              {toast.text}
            </div>
          )}
        </main>

        {/* Properties, project, checks */}
        {mode !== 'walk' && (
          <aside
            className="flex w-72 shrink-0 flex-col border-l border-slate-200 bg-white"
            aria-label="Details"
          >
            <div className="flex border-b border-slate-200 text-sm" role="tablist">
              {(
                [
                  ['properties', 'Properties'],
                  ['project', 'Project'],
                  [
                    'checks',
                    `Checks${analysis.issues.filter((i) => i.severity !== 'info').length ? ` (${analysis.issues.filter((i) => i.severity !== 'info').length})` : ''}`,
                  ],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={panel === id}
                  onClick={() => setPanel(id)}
                  data-testid={`panel-${id}`}
                  className={`flex-1 px-2 py-2 ${panel === id ? 'border-b-2 border-blue-600 font-medium text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {panel === 'properties' && (
                <Properties
                  state={state}
                  floor={floor}
                  selection={selection}
                  readOnly={readOnly}
                  apply={apply}
                  onDelete={del}
                  onDuplicate={duplicate}
                  onRotate={rotate}
                  notify={notify}
                />
              )}
              {panel === 'project' && (
                <ProjectTree
                  state={state}
                  floor={floor}
                  selection={selection}
                  onSelect={(refs) => (setSelection(refs), setPanel('properties'))}
                  onFloor={setFloor}
                />
              )}
              {panel === 'checks' && (
                <ChecksPanel
                  analysis={analysis}
                  state={state}
                  onSelect={(refs) => (setSelection(refs), setPanel('properties'))}
                />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Status bar */}
      <div
        className="flex items-center gap-4 border-t border-slate-200 bg-white px-3 py-1 font-mono text-[11px] text-slate-600"
        data-testid="studio-status"
      >
        <span className="w-44 truncate">
          {cursor.p
            ? `X ${formatLength(cursor.p.x, units)}  Y ${formatLength(cursor.p.y, units)}`
            : 'X –  Y –'}
        </span>
        <span>
          {cursor.snapped !== 'none' && cursor.p
            ? `snap: ${cursor.snapped}`
            : state.project.snap
              ? 'snap on'
              : 'snap off'}
        </span>
        <span>grid {formatLength(state.project.grid, units)}</span>
        <span>{floorObj.name}</span>
        <span>
          {selection.length ? `${selection.length} selected` : 'nothing selected'}
        </span>
        <span className="hidden min-w-0 flex-1 truncate font-sans text-slate-500 lg:block">
          {readOnly ? 'Viewing an earlier version (read only).' : activeHint}
        </span>
        <span className="ml-auto">
          {formatArea(analysis.totalArea * 1_000_000, units)}
        </span>
        <span data-testid="status-cost">
          {formatMoney(analysis.costs.total)}
          {state.project.budget !== undefined
            ? ` / ${formatMoney(state.project.budget)}`
            : ''}
        </span>
      </div>

      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="studio-confirm-title"
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl">
            <h2 id="studio-confirm-title" className="font-semibold text-slate-900">
              {confirm.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{confirm.body}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="rounded px-3 py-1.5 text-sm hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => (confirm.action(), setConfirm(null))}
                className="rounded bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-800"
                data-testid="confirm-delete"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ToolbarButton({
  icon,
  label,
  onClick,
  disabled,
  pressed,
  testId,
  text,
}: {
  icon: StudioIconName
  label: string
  onClick: () => void
  disabled?: boolean
  pressed?: boolean
  testId?: string
  text?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={text ? undefined : label}
      aria-pressed={pressed}
      data-testid={testId}
      className={`flex items-center gap-1 rounded p-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-35 ${pressed ? 'bg-blue-50 text-blue-800' : ''}`}
    >
      <SIcon name={icon} />
      {text && <span className="px-0.5">{text}</span>}
    </button>
  )
}

function PaletteButton({
  icon,
  name,
  shortcut,
  active,
  onClick,
  disabled,
  hint,
  compact,
  testId,
}: {
  icon: StudioIconName
  name: string
  shortcut: string
  active: boolean
  onClick: () => void
  disabled?: boolean
  hint?: string
  compact?: boolean
  testId?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={`${name} (${shortcut})${hint ? `: ${hint}` : ''}`}
      data-testid={testId}
      className={`flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm disabled:opacity-40 ${compact ? 'flex-1 justify-center' : 'w-full'} ${active ? 'bg-slate-800 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
    >
      <SIcon name={icon} />
      <span className="flex-1">{name}</span>
      {!compact && (
        <kbd
          className={`rounded border px-1 font-mono text-[10px] ${active ? 'border-slate-500 text-slate-200' : 'border-slate-300 text-slate-500'}`}
        >
          {shortcut}
        </kbd>
      )}
    </button>
  )
}

function InlineLength({
  label,
  value,
  units,
  onChange,
}: {
  label: string
  value: number
  units: StudioState['project']['units']
  onChange: (v: number) => void
}) {
  const [text, setText] = useState(lengthValue(value, units))
  const shown = `${value}|${units}`
  const [was, setWas] = useState(shown)
  if (was !== shown) {
    setWas(shown)
    setText(lengthValue(value, units))
  }
  const commit = () => {
    const v = parseLength(text, units)
    if (v && v > 0) onChange(v)
    else setText(lengthValue(value, units))
  }
  return (
    <label className="flex items-center justify-between gap-1">
      <span className="text-slate-600">{label}</span>
      <input
        className="w-20 rounded border border-slate-300 bg-white px-1 py-0.5 text-right"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          e.stopPropagation()
        }}
      />
    </label>
  )
}
