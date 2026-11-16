/**
 * The panel on site (over the 3D site, or on its own without 3D): where the
 * work is, what is holding it up, the supervisor's issue to decide, the
 * inspection to measure and judge (readings are taken by walking to each
 * item and measuring it), watching the work, the handover, and leaving.
 */
import { getBrief } from '../../engineering/briefs'
import {
  approved,
  builtDesign,
  currentStage,
  handoverBlockers,
  siteBlock,
  siteProgress,
} from '../../engineering/engine'
import { stageInfo } from '../../engineering/quantities'
import type { ProjectState } from '../../engineering/state'
import { dueInspection } from './helpers'
import { BUTTON, PRIMARY } from './parts'
import { DecisionLog, InspectionCard, IssueCard, StageList } from './SiteWork'

interface Props {
  project: ProjectState
  area: string | null
  onDecide: (issue: string, choice: string) => void
  onMeasure: (inspection: string, item: string) => void
  onJudge: (inspection: string, item: string, verdict: 'ok' | 'defect') => void
  onSign: (inspection: string) => void
  onWatch: () => void
  onHandOver: () => void
  onLeave: () => void
  overview: boolean
  onOverview: (on: boolean) => void
}

export function SitePanel({
  project,
  area,
  onDecide,
  onMeasure,
  onJudge,
  onSign,
  onWatch,
  onHandOver,
  onLeave,
  overview,
  onOverview,
}: Props) {
  const brief = getBrief(project.id)!
  const design = builtDesign(project)
  const stage = currentStage(project)
  const block = siteBlock(project)
  const inspection = dueInspection(project)
  const blockers = handoverBlockers(project)
  return (
    <section
      className="onsite-hide max-h-full w-full space-y-3 overflow-y-auto rounded-xl bg-white/95 p-4 shadow-lg ring-1 ring-slate-200 backdrop-blur"
      aria-label="On site"
      data-testid="site-panel"
    >
      <div>
        <p className="text-xs font-medium tracking-wide text-amber-700 uppercase">
          On site{area && area !== 'On site' ? ` · ${area}` : ''}
        </p>
        <h2 className="text-base font-semibold text-slate-900">{brief.title}</h2>
        <p className="text-xs text-slate-600">
          Building revision {project.site?.built ?? approved(project)?.n} ·{' '}
          {Math.round(siteProgress(project) * 100)}% ·{' '}
          {stage && design
            ? `${stageInfo(stage.id, design).name} (${Math.round(stage.fraction * 100)}%)`
            : ''}
        </p>
        <p
          className={`mt-1 text-sm ${block ? 'font-medium text-amber-900' : 'text-emerald-800'}`}
          data-testid="site-panel-status"
        >
          {block ?? 'The crew is working.'}
        </p>
      </div>
      <IssueCard project={project} onDecide={onDecide} />
      {inspection && (
        <InspectionCard
          project={project}
          inspection={inspection}
          canMeasure
          onMeasure={(item) => onMeasure(inspection, item)}
          onJudge={(item, v) => onJudge(inspection, item, v)}
          onSign={() => onSign(inspection)}
        />
      )}
      {block?.startsWith('Ready to hand over') && (
        <div className="space-y-1 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-semibold text-emerald-900">
            Handover to {brief.client.name}
          </p>
          {blockers.map((b) => (
            <p key={b} className="text-xs text-slate-700">
              ○ {b}
            </p>
          ))}
          <button
            type="button"
            className={PRIMARY}
            disabled={blockers.length > 0}
            onClick={onHandOver}
            data-testid="site-hand-over"
          >
            Hand over
          </button>
        </div>
      )}
      <details>
        <summary className="cursor-pointer text-xs text-slate-600">Stages</summary>
        <div className="mt-1">
          <StageList project={project} compact />
        </div>
      </details>
      <DecisionLog project={project} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={BUTTON}
          aria-pressed={overview}
          onClick={() => onOverview(!overview)}
          data-testid="site-overview"
        >
          {overview ? 'Back to walking' : 'See the whole site'}
        </button>
        <button
          type="button"
          className={BUTTON}
          onClick={onWatch}
          data-testid="site-watch"
        >
          Watch the work (30 min)
        </button>
        <button
          type="button"
          className={BUTTON}
          onClick={onLeave}
          data-testid="site-leave"
        >
          Back to the office
        </button>
      </div>
    </section>
  )
}
