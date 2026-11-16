/**
 * The Design tab: the CAD workstation's own editor. The plan (or the
 * bridge's form), the specification, the checks and calculations updating
 * as the design changes, the brief's requirements, and the revisions: the
 * draft is submitted to the design office, which approves it or returns it
 * with comments. An approved or submitted revision never changes; editing
 * after it starts a new draft.
 */
import { useMemo, useState } from 'react'
import { getBrief, unmetRequirements } from '../../engineering/briefs'
import { CATALOGUE, checkDesign } from '../../engineering/checks'
import {
  FOUNDATION_TYPES,
  ROOF_TYPES,
  WALL_MATERIALS,
  type BridgeDesign,
  type BuildingDesign,
  type Design,
} from '../../engineering/design'
import { latest, reviewDesign, submitted } from '../../engineering/engine'
import { billOfQuantities, money, programmeDays } from '../../engineering/quantities'
import { diffDesigns } from '../../engineering/revisions'
import type { ProjectState, Revision } from '../../engineering/state'
import { Card, PRIMARY, BUTTON, RevisionBadge, SimulationNote } from './parts'
import { PlanEditor } from './PlanEditor'
import { sourceName } from './helpers'

interface Props {
  project: ProjectState
  onDesign: (design: Design, source: Revision['source']) => void
  onSubmit: () => void
}

const input = 'w-28 rounded border border-slate-300 px-2 py-1 text-sm'

function NumberField({
  label,
  value,
  step = 10,
  min,
  max,
  onChange,
  disabled,
}: {
  label: string
  value: number
  step?: number
  min?: number
  max?: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs text-slate-700">
      {label}
      <input
        type="number"
        className={input}
        value={value}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (Number.isFinite(v)) onChange(v)
        }}
      />
    </label>
  )
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: T
  options: readonly T[]
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs text-slate-700">
      {label}
      <select
        className={input}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

const SECTIONS = CATALOGUE.map((s) => s.id)

function BuildingSpec({
  design,
  onChange,
  disabled,
}: {
  design: BuildingDesign
  onChange: (d: BuildingDesign) => void
  disabled: boolean
}) {
  const set = (change: Partial<BuildingDesign>) => onChange({ ...design, ...change })
  return (
    <div className="grid gap-1.5" data-testid="spec-form">
      <p className="text-xs font-semibold text-slate-500 uppercase">Walls</p>
      <NumberField
        label="Thickness (mm)"
        value={design.wall.thickness}
        disabled={disabled}
        onChange={(v) => set({ wall: { ...design.wall, thickness: Math.round(v) } })}
      />
      <NumberField
        label="Storey height (mm)"
        value={design.wall.height}
        step={100}
        disabled={disabled}
        onChange={(v) => set({ wall: { ...design.wall, height: Math.round(v) } })}
      />
      <Select
        label="Material"
        value={design.wall.material}
        options={WALL_MATERIALS}
        disabled={disabled}
        onChange={(v) => set({ wall: { ...design.wall, material: v } })}
      />
      <NumberField
        label="Storeys"
        value={design.storeys}
        step={1}
        min={1}
        max={4}
        disabled={disabled}
        onChange={(v) => set({ storeys: Math.max(1, Math.min(4, Math.round(v))) })}
      />
      <p className="mt-1 text-xs font-semibold text-slate-500 uppercase">Structure</p>
      <Select
        label="Beams"
        value={design.beam.section}
        options={SECTIONS}
        disabled={disabled}
        onChange={(v) => set({ beam: { section: v } })}
      />
      <Select
        label="Foundation"
        value={design.foundation.type}
        options={FOUNDATION_TYPES}
        disabled={disabled}
        onChange={(v) => set({ foundation: { ...design.foundation, type: v } })}
      />
      <NumberField
        label="Footing width (mm)"
        value={design.foundation.width}
        step={50}
        disabled={disabled}
        onChange={(v) =>
          set({ foundation: { ...design.foundation, width: Math.round(v) } })
        }
      />
      <NumberField
        label="Footing depth (mm)"
        value={design.foundation.depth}
        step={50}
        disabled={disabled}
        onChange={(v) =>
          set({ foundation: { ...design.foundation, depth: Math.round(v) } })
        }
      />
      <NumberField
        label="Slab (mm)"
        value={design.slab.thickness}
        step={25}
        disabled={disabled}
        onChange={(v) => set({ slab: { thickness: Math.round(v) } })}
      />
      <Select
        label="Roof"
        value={design.roof.type}
        options={ROOF_TYPES}
        disabled={disabled}
        onChange={(v) =>
          set({ roof: { type: v, pitch: v === 'flat' ? 0 : design.roof.pitch || 15 } })
        }
      />
      {design.roof.type === 'pitched' && (
        <NumberField
          label="Pitch (degrees)"
          value={design.roof.pitch}
          step={1}
          disabled={disabled}
          onChange={(v) =>
            set({ roof: { ...design.roof, pitch: Math.max(5, Math.min(45, v)) } })
          }
        />
      )}
      <p className="mt-1 text-xs font-semibold text-slate-500 uppercase">Services</p>
      <NumberField
        label="Electrical circuits"
        value={design.services.circuits}
        step={1}
        disabled={disabled}
        onChange={(v) =>
          set({ services: { ...design.services, circuits: Math.max(0, Math.round(v)) } })
        }
      />
      <NumberField
        label="WCs and basins"
        value={design.services.sanitary}
        step={1}
        disabled={disabled}
        onChange={(v) =>
          set({ services: { ...design.services, sanitary: Math.max(0, Math.round(v)) } })
        }
      />
      <NumberField
        label="Heating / ventilation units"
        value={design.services.hvac}
        step={1}
        disabled={disabled}
        onChange={(v) =>
          set({ services: { ...design.services, hvac: Math.max(0, Math.round(v)) } })
        }
      />
    </div>
  )
}

function BridgeSpec({
  design,
  onChange,
  disabled,
}: {
  design: BridgeDesign
  onChange: (d: BridgeDesign) => void
  disabled: boolean
}) {
  const set = (change: Partial<BridgeDesign>) => onChange({ ...design, ...change })
  return (
    <div className="grid gap-1.5" data-testid="spec-form">
      <NumberField
        label="Span (mm)"
        value={design.span}
        step={100}
        disabled={disabled}
        onChange={(v) => set({ span: Math.round(v) })}
      />
      <NumberField
        label="Deck width (mm)"
        value={design.width}
        step={100}
        disabled={disabled}
        onChange={(v) => set({ width: Math.round(v) })}
      />
      <NumberField
        label="Girders"
        value={design.girders.count}
        step={1}
        min={2}
        max={8}
        disabled={disabled}
        onChange={(v) =>
          set({
            girders: {
              ...design.girders,
              count: Math.max(2, Math.min(8, Math.round(v))),
            },
          })
        }
      />
      <Select
        label="Girder section"
        value={design.girders.section}
        options={SECTIONS}
        disabled={disabled}
        onChange={(v) => set({ girders: { ...design.girders, section: v } })}
      />
      <NumberField
        label="Deck thickness (mm)"
        value={design.deck.thickness}
        step={10}
        disabled={disabled}
        onChange={(v) => set({ deck: { thickness: Math.round(v) } })}
      />
      <NumberField
        label="Abutment height (mm)"
        value={design.abutment.height}
        step={100}
        disabled={disabled}
        onChange={(v) => set({ abutment: { ...design.abutment, height: Math.round(v) } })}
      />
      <NumberField
        label="Abutment base (mm)"
        value={design.abutment.base}
        step={100}
        disabled={disabled}
        onChange={(v) => set({ abutment: { ...design.abutment, base: Math.round(v) } })}
      />
      <NumberField
        label="Parapet height (mm)"
        value={design.parapet.height}
        step={50}
        disabled={disabled}
        onChange={(v) => set({ parapet: { height: Math.round(v) } })}
      />
    </div>
  )
}

/** The bridge drawn in elevation, to scale, from its design. */
function BridgeElevation({ design }: { design: BridgeDesign }) {
  const half = design.span / 2
  const depth = Number(design.girders.section.split('-')[1]) || 300
  const left = -half - design.abutment.base - 1000
  const w = design.span + 2 * design.abutment.base + 2000
  const top = design.parapet.height + 1500
  const h = top + design.abutment.height + depth + 1500
  return (
    <svg
      viewBox={`${left} ${-top} ${w} ${h}`}
      className="h-64 w-full rounded-md border border-slate-300 bg-[#0f1b2b]"
      role="img"
      aria-label="The footbridge in elevation"
      data-testid="bridge-elevation"
    >
      <rect
        x={-half}
        y={depth}
        width={design.span}
        height={design.abutment.height + 800}
        fill="#1d4ed8"
        opacity={0.35}
      />
      {[-1, 1].map((side) => (
        <rect
          key={side}
          x={side < 0 ? -half - design.abutment.base : half}
          y={depth}
          width={design.abutment.base}
          height={design.abutment.height}
          fill="#94a3b8"
        />
      ))}
      <rect
        x={-half - 500}
        y={0}
        width={design.span + 1000}
        height={depth}
        fill="#3b82f6"
      />
      <rect
        x={-half - 500}
        y={-design.deck.thickness}
        width={design.span + 1000}
        height={design.deck.thickness}
        fill="#e2e8f0"
      />
      <line
        x1={-half - 500}
        x2={half + 500}
        y1={-design.deck.thickness - design.parapet.height}
        y2={-design.deck.thickness - design.parapet.height}
        stroke="#cbd5e1"
        strokeWidth={60}
      />
      <text
        x={0}
        y={-design.deck.thickness - design.parapet.height - 300}
        fill="#93c5fd"
        fontSize={420}
        textAnchor="middle"
      >
        Span {design.span} mm · parapet {design.parapet.height} mm ·{' '}
        {design.girders.count} × {design.girders.section}
      </text>
    </svg>
  )
}

export function DesignTab({ project, onDesign, onSubmit }: Props) {
  const brief = getBrief(project.id)!
  const last = latest(project)
  const design = last.design
  const report = useMemo(() => checkDesign(design, brief.site), [design, brief.site])
  const unmet = unmetRequirements(brief, design)
  const estimate = useMemo(() => billOfQuantities(design), [design])
  const days = programmeDays(design)
  const checking = submitted(project)
  const preview = useMemo(() => reviewDesign(project, design), [project, design])
  const errors = report.findings.filter((f) => f.severity === 'error')
  const warnings = report.findings.filter((f) => f.severity === 'warning')
  const [showCalcs, setShowCalcs] = useState(true)
  const approvedRev = [...project.revisions]
    .reverse()
    .find((r) => r.status === 'approved')
  const changes =
    approvedRev && last.status === 'draft' ? diffDesigns(approvedRev.design, design) : []
  const locked = !!checking

  return (
    <div
      className="grid h-full min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_330px]"
      data-testid="design-tab"
    >
      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <RevisionBadge revision={last} />
          <span className="text-xs text-slate-500">
            {last.source === 'concept'
              ? 'Concept from the bid'
              : `Last changed in ${sourceName(last.source)}`}
          </span>
          <span className="ml-auto text-xs text-slate-600" data-testid="design-estimate">
            Estimate {money(estimate.total)} of {money(brief.budget)} · {days} of{' '}
            {brief.targetDays} days
          </span>
        </div>
        {checking && (
          <p
            className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900"
            role="status"
          >
            Revision {checking.n} is with the design office for checking (about 30 minutes
            of office time). You can change the design again once it comes back.
          </p>
        )}
        {last.status === 'rejected' && last.review && (
          <Card
            title={`Revision ${last.n} came back from ${last.review.by}`}
            testId="review-comments"
          >
            <ul className="list-disc space-y-1 pl-5 text-sm text-red-800">
              {last.review.comments.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-600">
              Change the design: your next change starts revision {last.n + 1}.
            </p>
          </Card>
        )}
        <div className="min-h-[320px] flex-1">
          {design.kind === 'building' ? (
            <PlanEditor
              design={design}
              findings={report.findings}
              readOnly={locked}
              onChange={(d) => onDesign(d, 'plan-editor')}
            />
          ) : (
            <BridgeElevation design={design} />
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
        <Card title="Specification">
          {design.kind === 'building' ? (
            <BuildingSpec
              design={design}
              onChange={(d) => onDesign(d, 'specification')}
              disabled={locked}
            />
          ) : (
            <BridgeSpec
              design={design}
              onChange={(d) => onDesign(d, 'specification')}
              disabled={locked}
            />
          )}
        </Card>

        <Card title="The brief" testId="brief-requirements">
          <ul className="space-y-1 text-sm">
            {brief.requirements.map((r) => {
              const met = !unmet.includes(r)
              return (
                <li key={r.id} className={met ? 'text-emerald-800' : 'text-red-800'}>
                  {met ? '✓' : '✗'} {r.text}
                </li>
              )
            })}
          </ul>
        </Card>

        <Card
          title={`Checks: ${errors.length ? `${errors.length} to put right` : 'all pass'}`}
          actions={
            <button
              type="button"
              className="text-xs text-blue-700 underline"
              onClick={() => setShowCalcs((v) => !v)}
            >
              {showCalcs ? 'Hide working' : 'Show working'}
            </button>
          }
          testId="design-checks"
        >
          <SimulationNote />
          {errors.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800">
              {errors.map((f) => (
                <li key={f.id}>{f.message}</li>
              ))}
            </ul>
          )}
          {warnings.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
              {warnings.map((f) => (
                <li key={f.id}>{f.message}</li>
              ))}
            </ul>
          )}
          {showCalcs && (
            <div className="mt-2 space-y-2">
              {report.calcs.map((c) => (
                <div
                  key={c.id}
                  className={`rounded border px-2 py-1.5 text-xs ${c.passes ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/60'}`}
                >
                  <p className="font-medium text-slate-900">{c.title}</p>
                  {c.working.map((w, i) => (
                    <p key={i} className="font-mono text-[11px] text-slate-700">
                      {w}
                    </p>
                  ))}
                  <p className={c.passes ? 'text-emerald-800' : 'text-red-800'}>
                    {c.result}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Revisions" testId="revisions">
          {changes.length > 0 && (
            <div className="mb-2 text-xs text-slate-700">
              <p className="font-medium">
                Changes from revision {approvedRev!.n} (approved):
              </p>
              <ul className="list-disc pl-4">
                {changes.map((c, i) => (
                  <li key={i}>
                    {c.text} <span className="text-slate-500">({c.kind})</span>
                  </li>
                ))}
              </ul>
              {project.status === 'construction' && (
                <p className="mt-1 text-amber-800">
                  The site keeps building revision {project.site?.built} until this is
                  approved.
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            className={PRIMARY}
            disabled={last.status !== 'draft' || !!checking}
            onClick={onSubmit}
            data-testid="submit-design"
          >
            Submit revision {last.n} for checking
          </button>
          {last.status === 'draft' && !preview.approve && (
            <p className="mt-1 text-xs text-slate-600">
              As it stands the checker would return it: {preview.comments.length}{' '}
              {preview.comments.length === 1 ? 'comment' : 'comments'}.
            </p>
          )}
          <ol className="mt-3 space-y-1 text-xs" aria-label="Revision history">
            {[...project.revisions].reverse().map((r: Revision) => (
              <li key={r.n} className="flex items-center justify-between gap-2">
                <span>
                  Rev {r.n} · {sourceName(r.source)}
                  {r.note ? ` · ${r.note}` : ''}
                </span>
                <span className="text-slate-500">{r.status}</span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            className={`${BUTTON} mt-2 text-xs`}
            disabled={!approvedRev || locked || last.status !== 'draft'}
            onClick={() => approvedRev && onDesign(approvedRev.design, 'plan-editor')}
          >
            Back to the approved design
          </button>
        </Card>
      </div>
    </div>
  )
}
