/**
 * Works Desk's screens: the section tabs, circuits, beams and gear trains.
 * Planning, maintenance, inspection and environment are in EngineeringSections.tsx.
 */
import { useState } from 'react'
import type { ToolWorkspaceProps } from '../ui'
import { ALLOWABLE_STRESS, POWER_RATINGS, RESISTOR_VALUES, SECTIONS } from './data'
import {
  AuditView,
  EnvironmentView,
  InspectionView,
  MaintenanceView,
  PlanningView,
} from './EngineeringSections'
import {
  analyseCircuit,
  beamCheck,
  chooseSection,
  gearRatio,
  outputRpm,
  setComponent,
  setStages,
} from './model'
import type { EngineeringState } from './schema'
import { card, field, primary, secondary, type Run } from './styles'

const SECTIONS_TABS = [
  ['circuits', 'Circuits'],
  ['beams', 'Beams'],
  ['gears', 'Gear trains'],
  ['planning', 'Project planning'],
  ['maintenance', 'Maintenance'],
  ['inspection', 'Inspection'],
  ['environment', 'Environment'],
  ['audit', 'Audit log'],
] as const
type SectionId = (typeof SECTIONS_TABS)[number][0]

export default function EngineeringWorkspace({
  state,
  readOnly,
  onUpdate,
  lockedSections,
  initialSection,
}: ToolWorkspaceProps<EngineeringState>) {
  const [section, setSection] = useState<SectionId>(
    (SECTIONS_TABS.find(([id]) => id === initialSection)?.[0] ?? 'circuits') as SectionId,
  )
  const [problems, setProblems] = useState<string[]>([])
  const [done, setDone] = useState<string | null>(null)
  const canEdit = !readOnly && !!onUpdate
  const run: Run = (fn) => {
    if (!canEdit) return false
    const result = fn(state)
    setProblems(result.problems)
    if (result.problems.length) {
      setDone(null)
      return false
    }
    onUpdate?.(() => result.state)
    setDone(result.state.audit.at(-1)?.action ?? 'Done')
    return true
  }
  const props = { state, canEdit, run }

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-slate-50 text-slate-900"
      data-testid="works-desk"
    >
      <div className="flex items-center justify-between gap-2 bg-orange-800 px-3 py-1.5 text-white">
        <p className="text-sm font-semibold">{state.firm} · Works Desk</p>
        <p className="text-xs">
          {state.user.name} ({state.user.role})
        </p>
      </div>
      <p className="bg-amber-100 px-3 py-1 text-xs text-amber-950" role="note">
        Simulation for learning: standard formulas with simplified, fictional catalogues
        and limits. Real engineering needs the applicable codes and a qualified engineer.
      </p>
      <div
        role="tablist"
        aria-label="Works Desk sections"
        className="flex flex-wrap gap-1 border-b border-slate-200 bg-white px-2 pt-1"
      >
        {SECTIONS_TABS.map(([id, name]) => {
          const locked = lockedSections[id]
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={section === id}
              disabled={!!locked}
              title={locked ? `Unlocks at ${locked}` : undefined}
              onClick={() => {
                setSection(id)
                setProblems([])
                setDone(null)
              }}
              className={`rounded-t px-3 py-1.5 text-sm ${
                section === id
                  ? 'border-b-2 border-orange-700 font-semibold text-orange-950'
                  : 'text-slate-600 hover:text-slate-900'
              } disabled:opacity-40`}
            >
              {name}
              {locked && ' 🔒'}
            </button>
          )
        })}
      </div>
      {(problems.length > 0 || done) && (
        <div
          role={problems.length ? 'alert' : 'status'}
          className={`px-3 py-1.5 text-sm ${problems.length ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-900'}`}
          data-testid="works-message"
        >
          {problems.length ? problems.join(' ') : `Done: ${done}.`}
        </div>
      )}
      <div
        className="min-h-0 flex-1 overflow-auto"
        tabIndex={0}
        role="region"
        aria-label="Work area"
      >
        {section === 'circuits' && <CircuitsView {...props} />}
        {section === 'beams' && <BeamsView {...props} />}
        {section === 'gears' && <GearsView {...props} />}
        {section === 'planning' && <PlanningView {...props} />}
        {section === 'maintenance' && <MaintenanceView {...props} />}
        {section === 'inspection' && <InspectionView {...props} />}
        {section === 'environment' && <EnvironmentView {...props} />}
        {section === 'audit' && <AuditView state={state} />}
      </div>
    </div>
  )
}

interface ViewProps {
  state: EngineeringState
  canEdit: boolean
  run: Run
}

function CircuitsView({ state, canEdit, run }: ViewProps) {
  return (
    <div className="space-y-3 p-3">
      {state.circuits.map((c) => {
        const a = analyseCircuit(c)
        const mA = Number.isFinite(a.current)
          ? Math.round(a.current * 10000) / 10
          : Infinity
        return (
          <section
            key={c.id}
            className={card}
            aria-label={c.title}
            data-testid={`circuit-${c.id}`}
          >
            <h3 className="font-semibold">
              {c.id}: {c.title}
            </h3>
            <p className="mt-1 text-slate-700">{c.brief}</p>
            <div className="mt-2 flex flex-wrap items-start gap-4">
              {/* A simple schematic: supply, then the parts in series. */}
              <svg
                viewBox="0 0 260 120"
                className="h-32 w-64 rounded bg-slate-50"
                role="img"
                aria-label={`Schematic: ${c.supply} V supply in series with ${c.components.length} parts`}
              >
                <rect
                  x="20"
                  y="20"
                  width="220"
                  height="80"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="2"
                />
                <line x1="14" y1="52" x2="26" y2="52" stroke="#334155" strokeWidth="3" />
                <line x1="10" y1="64" x2="30" y2="64" stroke="#334155" strokeWidth="2" />
                <text x="34" y="62" fontSize="11" fill="#0f172a">
                  {c.supply} V
                </text>
                {c.components.map((p, i) => {
                  const x = 70 + i * 80
                  return p.kind === 'resistor' ? (
                    <g key={p.id}>
                      <rect
                        x={x}
                        y="12"
                        width="40"
                        height="16"
                        fill="#fde68a"
                        stroke="#334155"
                      />
                      <text x={x} y="44" fontSize="10" fill="#0f172a">
                        {p.id} {p.value} Ω
                      </text>
                    </g>
                  ) : (
                    <g key={p.id}>
                      <polygon
                        points={`${x},10 ${x},30 ${x + 18},20`}
                        fill={a.problems.length ? '#fca5a5' : '#86efac'}
                        stroke="#334155"
                      />
                      <line
                        x1={x + 18}
                        y1="10"
                        x2={x + 18}
                        y2="30"
                        stroke="#334155"
                        strokeWidth="2"
                      />
                      <text x={x} y="44" fontSize="10" fill="#0f172a">
                        {p.id} {p.value} V
                      </text>
                    </g>
                  )
                })}
              </svg>
              <dl
                className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-sm"
                data-testid="circuit-analysis"
              >
                <dt>Total resistance</dt>
                <dd>{a.resistance} Ω</dd>
                <dt>Current</dt>
                <dd>{mA === Infinity ? 'unlimited' : `${mA} mA`}</dd>
                {a.parts.map((p) => (
                  <div key={p.id} className="contents">
                    <dt>{p.id}</dt>
                    <dd className={p.ok ? '' : 'font-semibold text-red-700'}>
                      {p.drop} V, {p.power} W
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            {a.problems.map((p) => (
              <p key={p} className="mt-1 font-semibold text-red-700">
                {p}
              </p>
            ))}
            {canEdit && (
              <div className="mt-2 space-y-1">
                {c.components
                  .filter((p) => p.kind === 'resistor')
                  .map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center gap-2">
                      <span className="w-10 font-medium">{p.id}</span>
                      <label className="text-xs">
                        Resistance{' '}
                        <select
                          value={p.value}
                          onChange={(e) =>
                            run((s) =>
                              setComponent(
                                s,
                                c.id,
                                p.id,
                                Number(e.target.value),
                                p.rating,
                              ),
                            )
                          }
                          className={field}
                          aria-label={`Resistance of ${p.id}`}
                        >
                          {RESISTOR_VALUES.map((v) => (
                            <option key={v} value={v}>
                              {v} Ω
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs">
                        Power rating{' '}
                        <select
                          value={p.rating}
                          onChange={(e) =>
                            run((s) =>
                              setComponent(
                                s,
                                c.id,
                                p.id,
                                p.value,
                                Number(e.target.value),
                              ),
                            )
                          }
                          className={field}
                          aria-label={`Power rating of ${p.id}`}
                        >
                          {POWER_RATINGS.map((v) => (
                            <option key={v} value={v}>
                              {v} W
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function BeamsView({ state, canEdit, run }: ViewProps) {
  return (
    <div className="space-y-3 p-3">
      {state.beams.map((b) => {
        const chosen = beamCheck(b)
        return (
          <section
            key={b.id}
            className={card}
            aria-label={b.title}
            data-testid={`beam-${b.id}`}
          >
            <h3 className="font-semibold">
              {b.id}: {b.title}
            </h3>
            <svg
              viewBox="0 0 300 90"
              className="mt-2 h-24 w-80"
              role="img"
              aria-label={`Beam of ${b.span} m with ${b.load} kN at mid-span`}
            >
              <rect
                x="20"
                y="40"
                width="260"
                height="12"
                fill={b.section ? (chosen.passes ? '#93c5fd' : '#fca5a5') : '#cbd5e1'}
                stroke="#334155"
              />
              <polygon points="20,52 10,70 30,70" fill="#64748b" />
              <circle cx="280" cy="60" r="8" fill="#64748b" />
              <line x1="150" y1="5" x2="150" y2="36" stroke="#b91c1c" strokeWidth="3" />
              <polygon points="144,30 156,30 150,40" fill="#b91c1c" />
              <text x="158" y="16" fontSize="11" fill="#0f172a">
                {b.load} kN
              </text>
              <text x="120" y="86" fontSize="11" fill="#0f172a">
                span {b.span} m
              </text>
            </svg>
            <p className="mt-1">
              Largest bending moment M = P × L ÷ 4 = {b.load} × {b.span} ÷ 4 ={' '}
              <strong>{chosen.moment} kN·m</strong>. Allowable stress {ALLOWABLE_STRESS}{' '}
              N/mm².
            </p>
            <table className="mt-2 w-full text-sm" data-testid="sections">
              <thead className="bg-slate-100 text-left text-xs">
                <tr>
                  {['Section', 'Z (cm³)', 'Mass (kg/m)', 'Stress σ = M ÷ Z', ''].map(
                    (h) => (
                      <th key={h} className="px-2 py-1">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {SECTIONS.map((x) => {
                  const r = beamCheck(b, x.id)
                  return (
                    <tr
                      key={x.id}
                      className={`border-t border-slate-100 ${b.section === x.id ? 'bg-orange-50' : ''}`}
                    >
                      <td className="px-2 py-1 font-medium">{x.id}</td>
                      <td className="px-2 py-1">{x.z}</td>
                      <td className="px-2 py-1">{x.mass}</td>
                      <td className={`px-2 py-1 ${r.passes ? '' : 'text-red-700'}`}>
                        {r.stress} N/mm² ({Math.round((r.utilisation ?? 0) * 100)}%)
                      </td>
                      <td className="px-2 py-1">
                        {canEdit && (
                          <button
                            type="button"
                            className={secondary}
                            onClick={() => run((s) => chooseSection(s, b.id, x.id))}
                            aria-label={`Use ${x.id}`}
                          >
                            {b.section === x.id ? 'Chosen' : 'Use'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )
      })}
    </div>
  )
}

function GearsView({ state, canEdit, run }: ViewProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  return (
    <div className="space-y-3 p-3">
      {state.gears.map((g) => {
        const draft = drafts[g.id] ?? g.stages.map(([a, b]) => `${a}:${b}`).join(', ')
        const rpm = outputRpm(g)
        return (
          <section
            key={g.id}
            className={card}
            aria-label={g.title}
            data-testid={`gears-${g.id}`}
          >
            <h3 className="font-semibold">
              {g.id}: {g.title}
            </h3>
            <p className="mt-1">
              Motor {g.inputRpm} rpm. Needed: <strong>{g.targetRpm} rpm</strong>.
            </p>
            <p className="mt-1" data-testid="gear-output">
              Stages {g.stages.map(([a, b]) => `${a}→${b}`).join(' then ')}: ratio{' '}
              {gearRatio(g)} : 1, output{' '}
              <strong
                className={
                  Math.abs(rpm - g.targetRpm) <= 1 ? 'text-emerald-800' : 'text-red-700'
                }
              >
                {rpm} rpm
              </strong>
            </p>
            {canEdit && (
              <form
                className="mt-2 flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  const stages = draft
                    .split(',')
                    .map((pair) => pair.split(':').map((n) => Number(n.trim())))
                    .filter((p) => p.length === 2 && p.every(Number.isInteger)) as Array<
                    [number, number]
                  >
                  run((s) => setStages(s, g.id, stages))
                }}
              >
                <label className="text-xs">
                  Gear pairs (driver:driven, comma between stages)
                  <input
                    value={draft}
                    onChange={(e) => setDrafts((d) => ({ ...d, [g.id]: e.target.value }))}
                    className={`${field} block min-w-64`}
                    aria-label={`Gear pairs for ${g.id}`}
                  />
                </label>
                <button type="submit" className={primary}>
                  Apply
                </button>
              </form>
            )}
          </section>
        )
      })}
    </div>
  )
}
