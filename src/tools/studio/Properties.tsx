/**
 * The properties panel: exact values for whatever is selected (in the
 * player's units), its finishes, and the project's settings when nothing is.
 */
import { useState, type ReactNode } from 'react'
import { itemPrice, openingPrice } from '../../studio/analysis'
import { catalogEntry } from '../../studio/catalog'
import {
  isRectangle,
  itemSize,
  polygonArea,
  roomSize,
  wallAngle,
  wallLength,
} from '../../studio/geometry'
import { materialOrDefault, materialsFor, type Material } from '../../studio/materials'
import {
  ROOM_USES,
  UNITS,
  WALL_TYPES,
  type Ref,
  type StudioState,
} from '../../studio/model'
import { setRoomSize, setWallLength, updateOpening, updatePart } from '../../studio/ops'
import {
  formatArea,
  formatLength,
  formatMoney,
  lengthValue,
  parseLength,
  UNIT_NAMES,
  unitSuffix,
} from '../../studio/units'
import { SIcon } from './icons'
import { roomUseName, swatch } from './shared'

const input =
  'w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-blue-500 focus:outline-none disabled:bg-slate-100'

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  )
}

/** A length typed in any unit; shown in the project's. Invalid entries are refused and shown in red. */
export function LengthField({
  label,
  value,
  units,
  onChange,
  disabled,
  min = 1,
  testId,
}: {
  label: string
  value: number
  units: StudioState['project']['units']
  onChange: (mm: number) => string | void
  disabled?: boolean
  min?: number
  testId?: string
}) {
  const [text, setText] = useState(lengthValue(value, units))
  const [error, setError] = useState<string | null>(null)
  // When the value changes outside the field, the field shows it.
  const shown = `${value}|${units}`
  const [was, setWas] = useState(shown)
  if (was !== shown) {
    setWas(shown)
    setText(lengthValue(value, units))
    setError(null)
  }
  const commit = () => {
    const mm = parseLength(text, units)
    if (mm === null || mm < min) {
      setError(mm === null ? 'Not a length' : `At least ${formatLength(min, units)}`)
      return
    }
    if (Math.abs(mm - value) < 0.05) return
    const problem = onChange(mm)
    if (problem) setError(problem)
  }
  return (
    <Field label={label}>
      <div className="flex items-center gap-1">
        <input
          className={`${input} ${error ? 'border-red-500 text-red-700' : ''}`}
          value={text}
          disabled={disabled}
          data-testid={testId}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setText(lengthValue(value, units))
            e.stopPropagation()
          }}
          aria-invalid={!!error}
        />
        <span className="w-9 shrink-0 text-xs text-slate-500">{unitSuffix(units)}</span>
      </div>
      {error && <span className="mt-0.5 block text-[11px] text-red-700">{error}</span>}
    </Field>
  )
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix,
  disabled,
  testId,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  suffix?: string
  disabled?: boolean
  testId?: string
}) {
  const [text, setText] = useState(String(value))
  const [was, setWas] = useState(value)
  if (was !== value) {
    setWas(value)
    setText(String(value))
  }
  const commit = () => {
    const n = Number(text)
    if (!Number.isFinite(n)) return setText(String(value))
    const v = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, n))
    if (v !== value) onChange(v)
    setText(String(v))
  }
  return (
    <Field label={label}>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          className={input}
          value={text}
          disabled={disabled}
          data-testid={testId}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            e.stopPropagation()
          }}
        />
        {suffix && <span className="w-9 shrink-0 text-xs text-slate-500">{suffix}</span>}
      </div>
    </Field>
  )
}

function TextField({
  label,
  value,
  onChange,
  disabled,
  testId,
  multiline,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  testId?: string
  multiline?: boolean
}) {
  const [text, setText] = useState(value)
  const [was, setWas] = useState(value)
  if (was !== value) {
    setWas(value)
    setText(value)
  }
  const commit = () => text !== value && onChange(text)
  return (
    <Field label={label}>
      {multiline ? (
        <textarea
          className={`${input} min-h-24`}
          value={text}
          disabled={disabled}
          data-testid={testId}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.stopPropagation()}
        />
      ) : (
        <input
          className={input}
          value={text}
          disabled={disabled}
          data-testid={testId}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            e.stopPropagation()
          }}
        />
      )}
    </Field>
  )
}

/** Swatches of the materials for a use; the chosen one is named. */
export function MaterialPicker({
  label,
  value,
  use,
  onChange,
  disabled,
  testId,
}: {
  label: string
  value: string | undefined
  use: Material['uses'][number]
  onChange: (id: string) => void
  disabled?: boolean
  testId?: string
}) {
  const current = materialOrDefault(value)
  return (
    <div data-testid={testId}>
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}: <span className="font-normal text-slate-800">{current.name}</span>
      </span>
      <div className="grid grid-cols-8 gap-1" role="radiogroup" aria-label={label}>
        {materialsFor(use).map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={m.id === current.id}
            aria-label={`${m.name}, ${formatMoney(m.price)} per m²`}
            title={`${m.name} · ${formatMoney(m.price)}/m²`}
            disabled={disabled}
            onClick={() => onChange(m.id)}
            className={`h-6 w-full rounded border ${m.id === current.id ? 'ring-2 ring-blue-600 ring-offset-1' : 'border-slate-300'}`}
            style={{ background: swatch(m) }}
          />
        ))}
      </div>
    </div>
  )
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  testId,
}: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
  disabled?: boolean
  testId?: string
}) {
  return (
    <Field label={label}>
      <select
        className={input}
        value={value}
        disabled={disabled}
        data-testid={testId}
        onChange={(e) => onChange(e.target.value as T)}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

function Section({
  title,
  children,
  actions,
}: {
  title: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="space-y-3 border-b border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {title}
        </h3>
        {actions}
      </div>
      {children}
    </section>
  )
}

const Row = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-2 gap-2">{children}</div>
)

interface Props {
  state: StudioState
  floor: string
  selection: Ref[]
  readOnly: boolean
  apply: (next: StudioState) => void
  onDelete: () => void
  onDuplicate: () => void
  onRotate: (deg: number) => void
  notify: (message: string, tone?: 'info' | 'error') => void
}

export function Properties({
  state,
  floor,
  selection,
  readOnly,
  apply,
  onDelete,
  onDuplicate,
  onRotate,
  notify,
}: Props) {
  const units = state.project.units
  const disabled = readOnly
  const tools = (
    <div className="flex gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={onDuplicate}
        title="Duplicate (Ctrl+D)"
        aria-label="Duplicate"
        className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
      >
        <SIcon name="copy" />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        title="Delete (Del)"
        aria-label="Delete"
        data-testid="delete-selection"
        className="rounded p-1 text-red-700 hover:bg-red-50 disabled:opacity-40"
      >
        <SIcon name="bin" />
      </button>
    </div>
  )

  if (selection.length > 1) {
    const walls = selection
      .filter((r) => r.kind === 'walls')
      .map((r) => state.walls.find((w) => w.id === r.id)!)
      .filter(Boolean)
    const allWalls = walls.length === selection.length
    const same = <T,>(xs: T[]) => (xs.every((x) => x === xs[0]) ? xs[0] : undefined)
    return (
      <div data-testid="properties">
        <Section title={`${selection.length} selected`} actions={tools}>
          <p className="text-sm text-slate-600">
            Drag to move them together, or use the arrow keys. [ and ] turn them.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRotate(-90)}
              className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
            >
              Turn left 90°
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRotate(90)}
              className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
            >
              Turn right 90°
            </button>
          </div>
        </Section>
        {allWalls && (
          <Section title="All selected walls">
            <Row>
              <LengthField
                label="Thickness"
                value={same(walls.map((w) => w.thickness)) ?? walls[0].thickness}
                units={units}
                disabled={disabled}
                onChange={(v) =>
                  apply(
                    walls.reduce(
                      (s, w) => updatePart(s, 'walls', w.id, { thickness: v }),
                      state,
                    ),
                  )
                }
              />
              <LengthField
                label="Height"
                value={same(walls.map((w) => w.height)) ?? walls[0].height}
                units={units}
                disabled={disabled}
                onChange={(v) =>
                  apply(
                    walls.reduce(
                      (s, w) => updatePart(s, 'walls', w.id, { height: v }),
                      state,
                    ),
                  )
                }
              />
            </Row>
          </Section>
        )}
      </div>
    )
  }

  const ref = selection[0]
  if (!ref)
    return <ProjectPanel state={state} floor={floor} apply={apply} disabled={disabled} />

  switch (ref.kind) {
    case 'walls': {
      const w = state.walls.find((x) => x.id === ref.id)
      if (!w) return null
      const set = (patch: Partial<typeof w>) =>
        apply(updatePart(state, 'walls', w.id, patch))
      return (
        <div data-testid="properties">
          <Section title="Wall" actions={tools}>
            <Row>
              <LengthField
                label="Length"
                value={wallLength(w)}
                units={units}
                disabled={disabled}
                testId="wall-length-input"
                onChange={(v) => apply(setWallLength(state, w.id, v))}
              />
              <Field label="Angle">
                <input
                  className={input}
                  disabled
                  value={`${Math.round(((wallAngle(w) % 360) + 360) % 360)}°`}
                />
              </Field>
              <LengthField
                label="Thickness"
                value={w.thickness}
                units={units}
                disabled={disabled}
                min={50}
                testId="wall-thickness-input"
                onChange={(v) => set({ thickness: v })}
              />
              <LengthField
                label="Height"
                value={w.height}
                units={units}
                disabled={disabled}
                min={300}
                testId="wall-height-input"
                onChange={(v) => {
                  const tooTall = state.openings.find(
                    (o) => o.wall === w.id && o.sill + o.height > v,
                  )
                  if (tooTall) return 'A door or window on it is taller'
                  set({ height: v })
                }}
              />
            </Row>
            <Select
              label="Type"
              value={w.type}
              disabled={disabled}
              options={WALL_TYPES.map((t) => ({
                value: t,
                label:
                  t === 'exterior'
                    ? 'Exterior wall'
                    : t === 'interior'
                      ? 'Interior wall'
                      : 'Partition',
              }))}
              onChange={(t) => set({ type: t })}
            />
          </Section>
          <Section title="Finishes">
            <MaterialPicker
              label="Left face"
              value={w.finishLeft}
              use="wall"
              disabled={disabled}
              onChange={(m) => set({ finishLeft: m })}
              testId="wall-finish-left"
            />
            <MaterialPicker
              label="Right face"
              value={w.finishRight}
              use="wall"
              disabled={disabled}
              onChange={(m) => set({ finishRight: m })}
            />
          </Section>
        </div>
      )
    }
    case 'openings': {
      const o = state.openings.find((x) => x.id === ref.id)
      const w = state.walls.find((x) => x.id === o?.wall)
      if (!o || !w) return null
      const set = (patch: Partial<typeof o>) => {
        const r = updateOpening(state, o.id, patch)
        if (r.error) {
          notify(r.error, 'error')
          return r.error
        }
        apply(r.state)
      }
      const styles =
        o.kind === 'door'
          ? ['single', 'double', 'sliding']
          : o.kind === 'window'
            ? ['casement', 'fixed', 'sash']
            : ['single']
      return (
        <div data-testid="properties">
          <Section
            title={
              o.kind === 'door' ? 'Door' : o.kind === 'window' ? 'Window' : 'Pass-through'
            }
            actions={tools}
          >
            <Row>
              <LengthField
                label="Width"
                value={o.width}
                units={units}
                disabled={disabled}
                min={300}
                testId="opening-width-input"
                onChange={(v) => set({ width: v })}
              />
              <LengthField
                label="Height"
                value={o.height}
                units={units}
                disabled={disabled}
                min={300}
                testId="opening-height-input"
                onChange={(v) => set({ height: v })}
              />
              {o.kind === 'window' && (
                <LengthField
                  label="Sill height"
                  value={o.sill}
                  units={units}
                  disabled={disabled}
                  min={0}
                  testId="opening-sill-input"
                  onChange={(v) => set({ sill: v })}
                />
              )}
              <LengthField
                label="From wall start"
                value={o.offset}
                units={units}
                disabled={disabled}
                testId="opening-offset-input"
                onChange={(v) => set({ offset: v })}
              />
            </Row>
            {o.kind !== 'pass' && (
              <Select
                label="Style"
                value={o.style}
                disabled={disabled}
                options={styles.map((s) => ({
                  value: s,
                  label: s[0].toUpperCase() + s.slice(1),
                }))}
                onChange={(s) => set({ style: s })}
              />
            )}
            {o.kind === 'door' && (
              <>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
                    onClick={() => set({ hinge: o.hinge === 'start' ? 'end' : 'start' })}
                  >
                    Flip hinge
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
                    onClick={() => set({ side: o.side === 'left' ? 'right' : 'left' })}
                  >
                    Flip swing
                  </button>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={o.entrance}
                    onChange={(e) => set({ entrance: e.target.checked })}
                    data-testid="opening-entrance"
                  />
                  The building's entrance
                </label>
              </>
            )}
            <p className="text-xs text-slate-500">
              Clear width {o.kind === 'pass' ? o.width : o.width - 80} mm ·{' '}
              {formatMoney(openingPrice(o))}
            </p>
          </Section>
        </div>
      )
    }
    case 'rooms': {
      const r = state.rooms.find((x) => x.id === ref.id)
      if (!r) return null
      const set = (patch: Partial<typeof r>) =>
        apply(updatePart(state, 'rooms', r.id, patch))
      const size = roomSize(r)
      const rect = isRectangle(r.outline)
      const resize = (width: number, depth: number) => {
        const res = setRoomSize(state, r.id, width, depth)
        if (res.error) return (notify(res.error, 'error'), res.error)
        apply(res.state)
      }
      return (
        <div data-testid="properties">
          <Section title="Room" actions={tools}>
            <TextField
              label="Name"
              value={r.name}
              disabled={disabled}
              testId="room-name-input"
              onChange={(v) => set({ name: v.trim() || r.name })}
            />
            <Select
              label="Use"
              value={r.use}
              disabled={disabled}
              testId="room-use-input"
              options={ROOM_USES.map((u) => ({ value: u, label: roomUseName(u) }))}
              onChange={(u) => set({ use: u })}
            />
            <Row>
              <LengthField
                label="Width"
                value={size.width}
                units={units}
                disabled={disabled}
                testId="room-width-input"
                onChange={(v) => resize(v, size.depth)}
              />
              <LengthField
                label="Depth"
                value={size.depth}
                units={units}
                disabled={disabled}
                testId="room-depth-input"
                onChange={(v) => resize(size.width, v)}
              />
            </Row>
            <p className="text-sm text-slate-700" data-testid="room-area-value">
              Area {formatArea(polygonArea(r.outline), units)}
              {!rect && (
                <span className="block text-xs text-slate-500">
                  Typed sizes stretch the whole shape; drag a corner to move just that
                  corner.
                </span>
              )}
            </p>
          </Section>
          <Section title="Finishes">
            <MaterialPicker
              label="Floor"
              value={r.floorFinish}
              use="floor"
              disabled={disabled}
              onChange={(m) => set({ floorFinish: m })}
              testId="room-floor-finish"
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                disabled={disabled}
                checked={r.ceiling}
                onChange={(e) => set({ ceiling: e.target.checked })}
              />
              Ceiling
            </label>
            {r.ceiling && (
              <MaterialPicker
                label="Ceiling"
                value={r.ceilingFinish}
                use="ceiling"
                disabled={disabled}
                onChange={(m) => set({ ceilingFinish: m })}
              />
            )}
          </Section>
        </div>
      )
    }
    case 'items': {
      const i = state.items.find((x) => x.id === ref.id)
      if (!i) return null
      const entry = catalogEntry(i.kind)
      const size = itemSize(i)
      const set = (patch: Partial<typeof i>) =>
        apply(updatePart(state, 'items', i.id, patch))
      return (
        <div data-testid="properties">
          <Section title={entry?.name ?? 'Item'} actions={tools}>
            <Row>
              <LengthField
                label="Width"
                value={size.width}
                units={units}
                disabled={disabled}
                min={50}
                testId="item-width-input"
                onChange={(v) => set({ width: v })}
              />
              <LengthField
                label="Depth"
                value={size.depth}
                units={units}
                disabled={disabled}
                min={10}
                testId="item-depth-input"
                onChange={(v) => set({ depth: v })}
              />
              <LengthField
                label="Height"
                value={size.height}
                units={units}
                disabled={disabled}
                min={5}
                onChange={(v) => set({ height: v })}
              />
              <LengthField
                label="Above floor"
                value={i.elevation}
                units={units}
                disabled={disabled}
                min={0}
                onChange={(v) => set({ elevation: v })}
              />
            </Row>
            <NumberField
              label="Rotation"
              value={i.rotation}
              step={15}
              suffix="°"
              disabled={disabled}
              testId="item-rotation-input"
              onChange={(v) => set({ rotation: ((Math.round(v) % 360) + 360) % 360 })}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRotate(-90)}
                className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
              >
                Turn left
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRotate(90)}
                className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
              >
                Turn right
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  set({ width: undefined, depth: undefined, height: undefined })
                }
                className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
              >
                Standard size
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {formatMoney(itemPrice(i))} · {formatLength(size.width, units)} ×{' '}
              {formatLength(size.depth, units)}
            </p>
          </Section>
          <Section title="Colour and material">
            <Field label="Colour">
              <input
                type="color"
                className="h-8 w-16 cursor-pointer rounded border border-slate-300"
                disabled={disabled}
                value={i.colour ?? entry?.colour ?? '#888888'}
                onChange={(e) => set({ colour: e.target.value, material: undefined })}
                data-testid="item-colour-input"
              />
            </Field>
            <MaterialPicker
              label="Material"
              value={i.material}
              use="furniture"
              disabled={disabled}
              onChange={(m) => set({ material: m })}
              testId="item-material"
            />
          </Section>
        </div>
      )
    }
    case 'stairs': {
      const s = state.stairs.find((x) => x.id === ref.id)
      if (!s) return null
      const set = (patch: Partial<typeof s>) =>
        apply(updatePart(state, 'stairs', s.id, patch))
      return (
        <div data-testid="properties">
          <Section title="Stair" actions={tools}>
            <p className="text-sm text-slate-700">
              Up to the {state.floors.find((f) => f.id === s.to)?.name ?? 'floor above'}.
            </p>
            <Row>
              <LengthField
                label="Width"
                value={s.width}
                units={units}
                disabled={disabled}
                min={600}
                onChange={(v) => set({ width: v })}
              />
              <LengthField
                label="Length (going)"
                value={s.run}
                units={units}
                disabled={disabled}
                min={1000}
                onChange={(v) => set({ run: v })}
              />
            </Row>
            <NumberField
              label="Direction"
              value={s.rotation}
              step={90}
              suffix="°"
              disabled={disabled}
              onChange={(v) => set({ rotation: ((Math.round(v) % 360) + 360) % 360 })}
            />
          </Section>
        </div>
      )
    }
    case 'columns': {
      const c = state.columns.find((x) => x.id === ref.id)
      if (!c) return null
      const set = (patch: Partial<typeof c>) =>
        apply(updatePart(state, 'columns', c.id, patch))
      return (
        <div data-testid="properties">
          <Section title="Column" actions={tools}>
            <LengthField
              label="Size"
              value={c.size}
              units={units}
              disabled={disabled}
              min={100}
              onChange={(v) => set({ size: v })}
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                disabled={disabled}
                checked={c.round}
                onChange={(e) => set({ round: e.target.checked })}
              />{' '}
              Round
            </label>
          </Section>
        </div>
      )
    }
    case 'slabs': {
      const s = state.slabs.find((x) => x.id === ref.id)
      if (!s) return null
      const set = (patch: Partial<typeof s>) =>
        apply(updatePart(state, 'slabs', s.id, patch))
      return (
        <div data-testid="properties">
          <Section title={s.kind === 'balcony' ? 'Balcony' : 'Terrace'} actions={tools}>
            <Select
              label="Kind"
              value={s.kind}
              disabled={disabled}
              options={[
                { value: 'balcony', label: 'Balcony' },
                { value: 'terrace', label: 'Terrace' },
              ]}
              onChange={(k) => set({ kind: k })}
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                disabled={disabled}
                checked={s.railing}
                onChange={(e) => set({ railing: e.target.checked })}
              />{' '}
              Railing
            </label>
            <p className="text-sm text-slate-700">
              Area {formatArea(polygonArea(s.outline), units)}
            </p>
            <MaterialPicker
              label="Surface"
              value={s.finish}
              use="outdoor"
              disabled={disabled}
              onChange={(m) => set({ finish: m })}
            />
          </Section>
        </div>
      )
    }
    case 'roofs': {
      const r = state.roofs.find((x) => x.id === ref.id)
      if (!r) return null
      const set = (patch: Partial<typeof r>) =>
        apply(updatePart(state, 'roofs', r.id, patch))
      return (
        <div data-testid="properties">
          <Section title="Roof" actions={tools}>
            <Select
              label="Type"
              value={r.kind}
              disabled={disabled}
              testId="roof-kind-input"
              options={[
                { value: 'flat', label: 'Flat' },
                { value: 'gable', label: 'Gable (pitched, two slopes)' },
                { value: 'hip', label: 'Hip (pitched, four slopes)' },
              ]}
              onChange={(k) =>
                set({
                  kind: k,
                  pitch: k === 'flat' ? 0 : r.pitch || 35,
                  finish:
                    k === 'flat'
                      ? 'roof-membrane'
                      : r.finish === 'roof-membrane'
                        ? 'roof-tiles'
                        : r.finish,
                })
              }
            />
            {r.kind !== 'flat' && (
              <NumberField
                label="Pitch"
                value={r.pitch}
                min={5}
                max={60}
                suffix="°"
                disabled={disabled}
                onChange={(v) => set({ pitch: v })}
              />
            )}
            <LengthField
              label="Overhang"
              value={r.overhang}
              units={units}
              disabled={disabled}
              min={0}
              onChange={(v) => set({ overhang: v })}
            />
            <MaterialPicker
              label="Covering"
              value={r.finish}
              use="roof"
              disabled={disabled}
              onChange={(m) => set({ finish: m })}
            />
          </Section>
        </div>
      )
    }
    case 'labels': {
      const l = state.labels.find((x) => x.id === ref.id)
      if (!l) return null
      return (
        <div data-testid="properties">
          <Section title="Label" actions={tools}>
            <TextField
              label="Text"
              value={l.text}
              disabled={disabled}
              testId="label-text-input"
              onChange={(v) => apply(updatePart(state, 'labels', l.id, { text: v }))}
            />
          </Section>
        </div>
      )
    }
    case 'dimensions': {
      const d = state.dimensions.find((x) => x.id === ref.id)
      if (!d) return null
      return (
        <div data-testid="properties">
          <Section title="Dimension" actions={tools}>
            <p className="text-sm text-slate-700">
              {formatLength(Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y), units)}
            </p>
            <LengthField
              label="Offset"
              value={d.offset}
              units={units}
              disabled={disabled}
              min={-5000}
              onChange={(v) =>
                apply(updatePart(state, 'dimensions', d.id, { offset: v }))
              }
            />
          </Section>
        </div>
      )
    }
  }
}

function ProjectPanel({
  state,
  floor,
  apply,
  disabled,
}: {
  state: StudioState
  floor: string
  apply: (s: StudioState) => void
  disabled: boolean
}) {
  const p = state.project
  const set = (patch: Partial<typeof p>) =>
    apply({ ...state, project: { ...p, ...patch } })
  const f = state.floors.find((x) => x.id === floor)
  return (
    <div data-testid="properties">
      <Section title="Project">
        <TextField
          label="Project name"
          value={p.name}
          disabled={disabled}
          testId="project-name-input"
          onChange={(v) => set({ name: v.trim() || p.name })}
        />
        <TextField
          label="Client"
          value={p.client}
          disabled={disabled}
          onChange={(v) => set({ client: v })}
        />
        <Row>
          <Select
            label="Units"
            value={p.units}
            disabled={disabled}
            testId="units-input"
            options={UNITS.map((u) => ({ value: u, label: UNIT_NAMES[u] }))}
            onChange={(u) => set({ units: u })}
          />
          <Select
            label="Grid"
            value={String(p.grid)}
            disabled={disabled}
            options={['50', '100', '250', '500', '1000'].map((g) => ({
              value: g,
              label: `${g} mm`,
            }))}
            onChange={(g) => set({ grid: Number(g) })}
          />
        </Row>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            disabled={disabled}
            checked={p.snap}
            onChange={(e) => set({ snap: e.target.checked })}
          />{' '}
          Snap to grid and corners (hold Alt to place freely)
        </label>
        {p.budget !== undefined && (
          <p className="text-sm text-slate-700">Budget: {formatMoney(p.budget)}</p>
        )}
        <TextField
          label="Design statement (read by the reviewers)"
          value={p.notes}
          disabled={disabled}
          multiline
          testId="project-notes-input"
          onChange={(v) => set({ notes: v })}
        />
      </Section>
      {f && (
        <Section title="This floor">
          <TextField
            label="Name"
            value={f.name}
            disabled={disabled}
            testId="floor-name-input"
            onChange={(v) =>
              apply({
                ...state,
                floors: state.floors.map((x) =>
                  x.id === f.id ? { ...x, name: v.trim() || x.name } : x,
                ),
              })
            }
          />
          <LengthField
            label="Floor to floor height"
            value={f.height}
            units={p.units}
            disabled={disabled}
            min={2200}
            onChange={(v) => {
              // Floors above move up or down with it.
              const delta = v - f.height
              apply({
                ...state,
                floors: state.floors.map((x) =>
                  x.id === f.id
                    ? { ...x, height: v }
                    : x.elevation > f.elevation
                      ? { ...x, elevation: x.elevation + delta }
                      : x,
                ),
              })
            }}
          />
          <p className="text-xs text-slate-500">
            Level {formatLength(f.elevation, p.units)} above ground.
          </p>
        </Section>
      )}
      <Section title="Tips">
        <ul className="list-disc space-y-1 pl-4 text-xs text-slate-600">
          <li>R and drag draws a room; type 4200x3600 and Enter for an exact size.</li>
          <li>W draws walls corner by corner; type a length and Enter.</li>
          <li>D and N add doors and windows; B opens the library.</li>
          <li>Ctrl+Z undoes, Ctrl+C / Ctrl+V copy, Delete removes.</li>
        </ul>
      </Section>
    </div>
  )
}
