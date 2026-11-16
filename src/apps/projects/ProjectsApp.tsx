/**
 * Projects: the Engineer career's project hub on the work computer.
 *
 *   Overview   the projects offered, the one under way, its measures and diary
 *   Design     the plan editor, specification, checks and revisions
 *   CAD Craft  the drafting workstation (the real CAD Craft) on the drawing
 *   FreeCAD    the macro for the player's own FreeCAD, and importing from it
 *   Documents  drawings, calculations, quantities, programme, reports
 *   Site       issue for construction, the stages, decisions, inspections, handover
 *
 * Every change is a game action (src/engineering/engine.ts) on the career save.
 */
import { lazy, Suspense, useCallback, type ReactNode } from 'react'
import { BRIEFS, getBrief, unmetRequirements } from '../../engineering/briefs'
import { describe } from '../../engineering/design'
import {
  activeProject,
  addModel,
  approved,
  decideIssue,
  engineeringOf,
  forecastCost,
  handOver,
  handoverBlockers,
  judgeItem,
  latest,
  projectAvailability,
  recordDocument,
  saveDesign,
  setDrawing,
  signInspection,
  siteBlock,
  siteProgress,
  startConstruction,
  startProject,
  submitDesign,
} from '../../engineering/engine'
import { money, programmeDays } from '../../engineering/quantities'
import type { ProjectState } from '../../engineering/state'
import { canGoToSite, travelTo } from '../../engineering/visit'
import type { ProfileData } from '../../game/career'
import type { Profile } from '../../persistence/schemas'
import { BUTTON, Card, Measure, PRIMARY, RevisionBadge } from './parts'
import { PROJECT_TABS, type ProjectTab } from './tabs'
import { DecisionLog, InspectionCard, IssueCard, StageList } from './SiteWork'
import { dueInspection } from './helpers'

const DesignTab = lazy(() =>
  import('./DesignTab').then((m) => ({ default: m.DesignTab })),
)
const CadCraftTab = lazy(() =>
  import('./CadCraftTab').then((m) => ({ default: m.CadCraftTab })),
)
const FreeCadTab = lazy(() =>
  import('./FreeCadTab').then((m) => ({ default: m.FreeCadTab })),
)
const DocumentsTab = lazy(() =>
  import('./DocumentsTab').then((m) => ({ default: m.DocumentsTab })),
)

const TAB_NAMES: Record<ProjectTab, string> = {
  overview: 'Overview',
  design: 'Design',
  cadcraft: 'CAD Craft',
  freecad: 'FreeCAD',
  documents: 'Documents',
  site: 'Site',
}

interface Props {
  profile: Profile
  act: (change: (p: ProfileData) => ProfileData) => Promise<unknown>
  tab: ProjectTab
  onTab: (tab: ProjectTab) => void
  onOpenDocument: (app: 'doc' | 'sheet', document: string) => void
  onGoToSite: (project: string) => void
}

export function ProjectsApp({
  profile,
  act,
  tab,
  onTab,
  onOpenDocument,
  onGoToSite,
}: Props) {
  const project = activeProject(profile)
  const e = engineeringOf(profile)
  const done = BRIEFS.filter((b) => e.projects[b.id]?.status === 'complete')
  const id = project?.id

  const onDesign = useCallback(
    (
      design: ProjectState['revisions'][number]['design'],
      source: ProjectState['revisions'][number]['source'],
      note = '',
    ) => {
      if (id) void act((p) => saveDesign(p, id, design, source, note))
    },
    [act, id],
  )

  const tabs = project ? PROJECT_TABS : (['overview'] as const)
  const shown: ProjectTab = project ? tab : 'overview'

  let body: ReactNode
  if (shown === 'overview' || !project)
    body = (
      <Overview
        profile={profile}
        project={project}
        done={done.map((b) => e.projects[b.id]!)}
        onStart={(briefId) => {
          void act((p) => startProject(p, briefId))
          onTab('design')
        }}
        onTab={onTab}
      />
    )
  else if (shown === 'design')
    body = (
      <DesignTab
        project={project}
        onDesign={(d, source) => onDesign(d, source)}
        onSubmit={() => void act((p) => submitDesign(p, project.id))}
      />
    )
  else if (shown === 'cadcraft')
    body = (
      <CadCraftTab
        project={project}
        owner={profile.id}
        author={profile.name}
        onDesign={(d, note) => onDesign(d, 'cadcraft', note)}
        onDrawing={(doc) => void act((p) => setDrawing(p, project.id, doc))}
        onUsePlanEditor={() => onTab('design')}
      />
    )
  else if (shown === 'freecad')
    body = (
      <FreeCadTab
        project={project}
        owner={profile.id}
        onDesign={(d, note) => onDesign(d, 'freecad', note)}
        onModel={(m) =>
          void act((p) => addModel(p, project.id, { ...m, at: p.work.minute }))
        }
      />
    )
  else if (shown === 'documents')
    body = (
      <DocumentsTab
        project={project}
        owner={profile.id}
        day={profile.work.day}
        onRecord={(kind, doc, rev) =>
          void act((p) => recordDocument(p, project.id, kind, doc, rev))
        }
        onOpen={onOpenDocument}
      />
    )
  else
    body = (
      <SiteTab
        profile={profile}
        project={project}
        act={act}
        onTab={onTab}
        onGoToSite={() => onGoToSite(project.id)}
      />
    )

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50" data-testid="projects-app">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <div>
          <p className="text-xs font-medium tracking-wide text-blue-700 uppercase">
            Northbank projects
          </p>
          <h2 className="text-base font-semibold text-slate-900">
            {project ? getBrief(project.id)!.title : 'Choose a project'}
          </h2>
        </div>
        {project && <RevisionBadge revision={latest(project)} />}
        <nav className="ml-auto flex flex-wrap gap-1" aria-label="Project sections">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTab(t)}
              aria-current={shown === t ? 'page' : undefined}
              className={`rounded-md px-3 py-1 text-sm ${shown === t ? 'bg-blue-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
              data-testid={`projects-tab-${t}`}
            >
              {TAB_NAMES[t]}
            </button>
          ))}
        </nav>
      </header>
      <div
        className={`min-h-0 flex-1 ${shown === 'cadcraft' ? '' : 'overflow-y-auto p-4'}`}
      >
        <Suspense fallback={<p className="p-4 text-sm text-slate-500">Opening…</p>}>
          {body}
        </Suspense>
      </div>
    </div>
  )
}

function Overview({
  profile,
  project,
  done,
  onStart,
  onTab,
}: {
  profile: Profile
  project: ProjectState | null
  done: ProjectState[]
  onStart: (id: string) => void
  onTab: (tab: ProjectTab) => void
}) {
  return (
    <div className="space-y-4" data-testid="projects-overview">
      {project ? (
        <ProjectSummary project={project} onTab={onTab} />
      ) : (
        <p className="text-sm text-slate-700">
          Northbank designs and builds for its clients. Take on a project: check and
          correct the concept, get it approved, issue it for construction and see it
          built.
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-3">
        {BRIEFS.map((brief) => {
          const a = projectAvailability(profile, brief)
          const result = done.find((d) => d.id === brief.id)?.result
          return (
            <Card key={brief.id} title={brief.title} testId={`brief-${brief.id}`}>
              <p className="text-xs text-slate-500">
                {brief.client.organisation} · {brief.location}
              </p>
              <p className="mt-1 text-sm text-slate-700">{brief.summary}</p>
              <p className="mt-1 text-xs text-slate-600">
                Budget {money(brief.budget)} · {brief.targetDays} working days
              </p>
              <div className="mt-2">
                {a.state === 'available' && (
                  <button
                    type="button"
                    className={PRIMARY}
                    onClick={() => onStart(brief.id)}
                    data-testid={`start-${brief.id}`}
                  >
                    Take on this project
                  </button>
                )}
                {a.state === 'active' && (
                  <span className="text-xs font-medium text-blue-800">Under way</span>
                )}
                {a.state === 'complete' && result && (
                  <span className="text-xs font-medium text-emerald-800">
                    Handed over: {result.score}/100 ({result.rating})
                  </span>
                )}
                {a.state === 'locked' && (
                  <span className="text-xs text-slate-500">{a.reason}</span>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function ProjectSummary({
  project,
  onTab,
}: {
  project: ProjectState
  onTab: (tab: ProjectTab) => void
}) {
  const brief = getBrief(project.id)!
  const last = latest(project)
  const ok = approved(project)
  const unmet = unmetRequirements(brief, last.design)
  const steps = [
    { label: 'Design', done: !!ok },
    { label: 'Checked and approved', done: !!ok },
    { label: 'On site', done: project.status !== 'design' },
    { label: 'Final inspection', done: project.inspections.final?.status === 'passed' },
    { label: 'Handed over', done: project.status === 'complete' },
  ]
  return (
    <Card
      title={`${brief.title} for ${brief.client.name}, ${brief.client.organisation}`}
      testId="project-summary"
    >
      <ol className="mb-3 flex flex-wrap gap-2 text-xs" aria-label="Project stages">
        {steps.map((s) => (
          <li
            key={s.label}
            className={`rounded-full px-2.5 py-0.5 ring-1 ${s.done ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-50 text-slate-500 ring-slate-200'}`}
          >
            {s.done ? '✓ ' : ''}
            {s.label}
          </li>
        ))}
      </ol>
      <div className="grid gap-4 md:grid-cols-[1fr_220px]">
        <div className="space-y-1 text-sm text-slate-700">
          <p>{describe(last.design)}</p>
          <p>
            Cost forecast{' '}
            <span className="font-medium">{money(forecastCost(project))}</span> of{' '}
            {money(brief.budget)} · programme {programmeDays(last.design)} of{' '}
            {brief.targetDays} days
            {project.metrics.delay > 0
              ? ` (+${project.metrics.delay.toFixed(1)} lost)`
              : ''}
          </p>
          {project.status === 'construction' && (
            <p>
              On site: {Math.round(siteProgress(project) * 100)}% ·{' '}
              {siteBlock(project) ?? 'working'}
            </p>
          )}
          {unmet.length > 0 && (
            <p className="text-red-800">
              The design does not yet meet {unmet.length} of the brief’s requirements.
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" className={BUTTON} onClick={() => onTab('design')}>
              Open the design
            </button>
            <button type="button" className={BUTTON} onClick={() => onTab('site')}>
              The site
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Measure label="Quality" value={project.metrics.quality} />
          <Measure label="Safety" value={project.metrics.safety} />
          <Measure label="Client satisfaction" value={project.metrics.client} />
        </div>
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-slate-600">
          Project diary ({project.log.length})
        </summary>
        <ul className="mt-1 space-y-0.5 text-slate-700">
          {[...project.log]
            .reverse()
            .slice(0, 20)
            .map((l, i) => (
              <li
                key={i}
                className={
                  l.tone === 'bad'
                    ? 'text-red-800'
                    : l.tone === 'good'
                      ? 'text-emerald-800'
                      : ''
                }
              >
                {l.text}
              </li>
            ))}
        </ul>
      </details>
    </Card>
  )
}

function SiteTab({
  profile,
  project,
  act,
  onTab,
  onGoToSite,
}: {
  profile: Profile
  project: ProjectState
  act: Props['act']
  onTab: (tab: ProjectTab) => void
  onGoToSite: () => void
}) {
  const brief = getBrief(project.id)!
  const ok = approved(project)
  if (project.status === 'design') {
    const needs = [
      { label: 'An approved revision of the design', done: !!ok },
      {
        label: 'The drawing issued from it (Documents)',
        done: !!ok && project.documents.drawings?.revision === ok.n,
      },
      {
        label: 'The bill of quantities made from it (Documents)',
        done: !!ok && project.documents.quantities?.revision === ok.n,
      },
    ]
    return (
      <Card title="Issue for construction" testId="issue-for-construction">
        <p className="text-sm text-slate-700">
          The site builds only an approved design, from issued drawings and a bill of
          quantities.
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          {needs.map((n) => (
            <li key={n.label} className={n.done ? 'text-emerald-800' : 'text-slate-600'}>
              {n.done ? '✓' : '○'} {n.label}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className={PRIMARY}
            disabled={!needs.every((n) => n.done)}
            onClick={() => void act((p) => startConstruction(p, project.id))}
            data-testid="start-construction"
          >
            Issue for construction: start on site
          </button>
          {!needs[1].done && ok && (
            <button type="button" className={BUTTON} onClick={() => onTab('documents')}>
              Go to Documents
            </button>
          )}
        </div>
      </Card>
    )
  }
  if (project.status === 'complete')
    return (
      <Card title="Handed over" testId="project-complete">
        <p className="text-sm text-slate-700">
          Score {project.result?.score}/100 ({project.result?.rating}).
        </p>
      </Card>
    )
  const block = siteBlock(project)
  const inspection = dueInspection(project)
  const blockers = handoverBlockers(project)
  const why = canGoToSite(profile, project.id)
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]" data-testid="site-tab">
      <div className="space-y-3">
        <Card
          title={`On site: ${Math.round(siteProgress(project) * 100)}%`}
          actions={
            <button
              type="button"
              className={PRIMARY}
              disabled={!!why}
              title={why ?? undefined}
              onClick={onGoToSite}
              data-testid="go-to-site"
            >
              Go to the site ({travelTo(project.id)} min)
            </button>
          }
        >
          <p className="mb-2 text-sm text-slate-700" data-testid="site-status">
            {block ?? 'The crew is working.'}
          </p>
          {why && <p className="mb-2 text-xs text-slate-500">{why}</p>}
          <StageList project={project} />
        </Card>
        <IssueCard
          project={project}
          onDecide={(issue, choice) =>
            void act((p) => decideIssue(p, project.id, issue, choice))
          }
        />
        {inspection && (
          <InspectionCard
            project={project}
            inspection={inspection}
            canMeasure={false}
            onMeasure={() => {}}
            onJudge={(item, v) =>
              void act((p) => judgeItem(p, project.id, inspection, item, v))
            }
            onSign={() => void act((p) => signInspection(p, project.id, inspection))}
          />
        )}
        {block?.startsWith('Ready to hand over') && (
          <Card title="Handover" testId="handover">
            {blockers.length ? (
              <ul className="list-disc pl-5 text-sm text-slate-700">
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-700">
                Everything is ready for {brief.client.name}.
              </p>
            )}
            <button
              type="button"
              className={`${PRIMARY} mt-2`}
              disabled={blockers.length > 0}
              onClick={() => void act((p) => handOver(p, project.id))}
              data-testid="hand-over"
            >
              Hand over to {brief.client.organisation}
            </button>
          </Card>
        )}
      </div>
      <div className="space-y-3">
        <Card title="Measures">
          <div className="space-y-2">
            <Measure label="Quality" value={project.metrics.quality} />
            <Measure label="Safety" value={project.metrics.safety} />
            <Measure label="Client satisfaction" value={project.metrics.client} />
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Forecast {money(forecastCost(project))} of {money(brief.budget)}.
          </p>
        </Card>
        <Card title="Decisions">
          <DecisionLog project={project} />
        </Card>
      </div>
    </div>
  )
}
