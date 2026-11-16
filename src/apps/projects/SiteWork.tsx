/**
 * The site's work, as the engineer sees it, shared by the Projects app and
 * the panel on site: the stages and how far each has got, an issue waiting
 * for a decision (with the facts and the choices, then what happened and the
 * lesson), and an inspection: each item measured on site, its reading
 * judged against the approved design, then signed off or rejected.
 */
import { getBrief } from '../../engineering/briefs'
import {
  builtDesign,
  currentStage,
  inspectionItems,
  inspectionOutcome,
  itemReading,
} from '../../engineering/engine'
import {
  INSPECTIONS,
  formatReading,
  requirement,
  type InspectionId,
} from '../../engineering/inspections'
import { getIssue, issueChoices, issueFacts } from '../../engineering/issues'
import { speaker } from '../../engineering/people'
import { programme, stageInfo } from '../../engineering/quantities'
import type { ProjectState } from '../../engineering/state'
import { BUTTON, PRIMARY } from './parts'

export function StageList({
  project,
  compact,
}: {
  project: ProjectState
  compact?: boolean
}) {
  const design = builtDesign(project)
  const site = project.site
  if (!design || !site) return null
  const now = currentStage(project)
  const plan = programme(design)
  return (
    <ol
      className={`space-y-1 ${compact ? 'text-[11px]' : 'text-xs'}`}
      aria-label="Construction stages"
      data-testid="stage-list"
    >
      {site.stages.map((id, i) => {
        const done = i < site.cursor
        const active = i === site.cursor
        const fraction = active && now ? now.fraction : done ? 1 : 0
        return (
          <li key={id} className="flex items-center gap-2">
            <span
              className={`w-4 text-center ${done ? 'text-emerald-700' : active ? 'text-blue-700' : 'text-slate-400'}`}
              aria-hidden
            >
              {done ? '✓' : active ? '▸' : '·'}
            </span>
            <span
              className={`flex-1 ${active ? 'font-medium text-slate-900' : done ? 'text-slate-600' : 'text-slate-500'}`}
            >
              {stageInfo(id, design).name}
              {!compact && (
                <span className="text-slate-400">
                  {' '}
                  · {plan.find((p) => p.id === id)?.days ?? 1} days
                </span>
              )}
            </span>
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
              <span
                className={`block h-full ${done ? 'bg-emerald-600' : 'bg-blue-600'}`}
                style={{ width: `${Math.round(fraction * 100)}%` }}
              />
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** The open issue (or the last decided one, with its outcome). */
export function IssueCard({
  project,
  onDecide,
}: {
  project: ProjectState
  onDecide: (issue: string, choice: string) => void
}) {
  const brief = getBrief(project.id)!
  const design = builtDesign(project)
  const circuits = design?.kind === 'building' ? design.services.circuits : 0
  const entry = Object.entries(project.issues).find(
    ([, s]) => s.status === 'open' || s.status === 'awaiting-revision',
  )
  if (!entry) return null
  const [id, state] = entry
  const def = getIssue(id)
  if (!def) return null
  const who = speaker(def.who, brief.client.name)
  const choices = issueChoices(def, project.seed, circuits)
  const facts = issueFacts(def, project.seed, circuits)
  const last = state.tried.at(-1)
  const lastChoice = choices.find((c) => c.id === last)
  return (
    <div
      className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3"
      data-testid="site-issue"
      role="region"
      aria-label={def.title}
    >
      <p className="text-sm font-semibold text-amber-900">{def.title}</p>
      <p className="text-sm text-slate-800">
        <span className="font-medium">
          {who.name}
          {who.role ? `, ${who.role}` : ''}:
        </span>{' '}
        “{def.text}”
      </p>
      {facts.length > 0 && (
        <ul className="rounded bg-white px-3 py-1.5 font-mono text-xs text-slate-800 ring-1 ring-amber-200">
          {facts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
      {lastChoice?.retry && <p className="text-xs text-red-800">{lastChoice.outcome}</p>}
      {state.status === 'awaiting-revision' ? (
        <p className="text-sm text-amber-900">
          Waiting for the revision: add what the client asked for in the design (plan
          editor or CAD Craft), submit it, and the work carries on once it is approved.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {choices.map((c) => (
            <button
              key={c.id}
              type="button"
              className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-left text-sm text-slate-800 hover:bg-amber-100 disabled:opacity-40"
              disabled={state.tried.includes(c.id)}
              onClick={() => onDecide(id, c.id)}
              data-testid={`choice-${c.id}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** What happened after recent decisions (the outcome and the lesson). */
export function DecisionLog({ project }: { project: ProjectState }) {
  const design = builtDesign(project)
  const circuits = design?.kind === 'building' ? design.services.circuits : 0
  const decided = Object.entries(project.issues).filter(
    ([, s]) => s.status === 'resolved' && s.choice,
  )
  if (!decided.length) return null
  return (
    <ul className="space-y-2 text-xs" data-testid="decision-log">
      {decided
        .slice(-3)
        .reverse()
        .map(([id, s]) => {
          const def = getIssue(id)
          const choice =
            def &&
            issueChoices(def, project.seed, circuits).find((c) => c.id === s.choice)
          if (!def || !choice) return null
          return (
            <li
              key={id}
              className={`rounded border px-2 py-1.5 ${choice.best ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}
            >
              <p className="font-medium text-slate-900">{def.title}</p>
              <p className="text-slate-700">{choice.outcome}</p>
              <p className="mt-0.5 text-slate-500">{def.lesson}</p>
            </li>
          )
        })}
    </ul>
  )
}

export function InspectionCard({
  project,
  inspection,
  canMeasure,
  onMeasure,
  onJudge,
  onSign,
}: {
  project: ProjectState
  inspection: InspectionId
  /** On site: items can be measured (in the office they cannot). */
  canMeasure: boolean
  onMeasure: (item: string) => void
  onJudge: (item: string, verdict: 'ok' | 'defect') => void
  onSign: () => void
}) {
  const state = project.inspections[inspection]
  if (!state) return null
  const def = INSPECTIONS[inspection]
  const items = inspectionItems(project, inspection)
  const outcome = inspectionOutcome(project, inspection)
  const flagged = Object.values(state.judgements).filter((v) => v === 'defect').length
  return (
    <div
      className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/60 p-3"
      data-testid={`inspection-${inspection}`}
    >
      <div>
        <p className="text-sm font-semibold text-blue-950">{def.title}</p>
        <p className="text-xs text-slate-600">
          With {def.with.toLowerCase()}. Measure each item on site, compare it with the
          approved drawings, and judge it.
        </p>
      </div>
      {state.status === 'rework' && (
        <p className="text-xs text-blue-900">
          The defects are being put right; the inspection is due again afterwards.
        </p>
      )}
      <ul className="divide-y divide-blue-100 text-xs" aria-label="Inspection items">
        {items.map((item) => {
          const measured = state.measured.includes(item.id)
          const verdict = state.judgements[item.id]
          return (
            <li key={item.id} className="space-y-1 py-1.5">
              <p className="font-medium text-slate-900">{item.label}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-slate-600">Required {requirement(item)}</span>
                {measured ? (
                  <span
                    className="rounded bg-white px-1.5 py-0.5 font-mono font-semibold text-slate-900 ring-1 ring-slate-200"
                    data-testid={`reading-${item.id}`}
                  >
                    {formatReading(item, itemReading(project, item))}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="rounded border border-blue-300 bg-white px-2 py-0.5 text-blue-800 hover:bg-blue-100 disabled:opacity-40"
                    disabled={!canMeasure || state.status !== 'due'}
                    title={canMeasure ? undefined : 'Readings are taken on site'}
                    onClick={() => onMeasure(item.id)}
                    data-testid={`measure-${item.id}`}
                  >
                    {canMeasure ? 'Measure' : 'Measured on site'}
                  </button>
                )}
              </div>
              <div className="flex gap-1">
                {(['ok', 'defect'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={!measured || state.status !== 'due'}
                    aria-pressed={verdict === v}
                    onClick={() => onJudge(item.id, v)}
                    className={`rounded px-2 py-0.5 ${verdict === v ? (v === 'ok' ? 'bg-emerald-700 text-white' : 'bg-red-700 text-white') : 'border border-slate-300 bg-white text-slate-700'} disabled:opacity-40`}
                    data-testid={`judge-${item.id}-${v}`}
                  >
                    {v === 'ok' ? 'Conforms' : 'Defect'}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
      {state.status === 'due' && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={flagged ? `${BUTTON} border-red-300 text-red-800` : PRIMARY}
            disabled={outcome.kind === 'incomplete'}
            onClick={onSign}
            data-testid={`sign-${inspection}`}
          >
            {flagged
              ? `Reject the work (${flagged} ${flagged === 1 ? 'defect' : 'defects'})`
              : 'Sign it off: the work conforms'}
          </button>
          {outcome.kind === 'incomplete' && (
            <span className="text-xs text-slate-600">
              {outcome.missing.length} {outcome.missing.length === 1 ? 'item' : 'items'}{' '}
              still to measure and judge.
            </span>
          )}
        </div>
      )}
    </div>
  )
}
