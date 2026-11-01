/** Tasks: the assignments of the player's career, their status and results. */
import { useState } from 'react'
import { getTool } from '../../tools/registry'
import { getSkill } from '../../content/careers'
import { getPerson } from '../../content/departments'
import { getProject } from '../../content/projects'
import type { Assignment } from '../../content/schemas'
import {
  assignmentStatus,
  bestScore,
  careerAssignments,
  type AssignmentStatus,
} from '../../game/career'
import { formatDateTime } from '../../lib/time'
import type { Profile } from '../../persistence/schemas'
import { Icon, type IconName } from '../../ui/Icon'
import { CheckResultsList } from './CheckResultsList'

const STATUS_BADGES: Record<AssignmentStatus, { label: string; className: string }> = {
  locked: { label: 'Locked', className: 'bg-slate-100 text-slate-500' },
  available: { label: 'New', className: 'bg-blue-100 text-blue-800' },
  'in-progress': { label: 'In progress', className: 'bg-amber-100 text-amber-800' },
  'needs-revision': { label: 'Needs revision', className: 'bg-red-100 text-red-800' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800' },
}

interface TasksAppProps {
  profile: Profile
  selectedId: string | undefined
  onSelect: (assignmentId: string) => void
  /** Opens the assignment's workbook, starting the assignment if needed. */
  onOpenWorkbook: (assignmentId: string) => Promise<void>
  /** Opens a task's report or presentation. */
  onOpenFile: (kind: 'doc' | 'slides', documentId: string) => void
  /** Opens a reply to the task's email, to hand the work in. */
  onHandIn: (mailId: string) => void
}

export function TasksApp({
  profile,
  selectedId,
  onSelect,
  onOpenWorkbook,
  onOpenFile,
  onHandIn,
}: TasksAppProps) {
  const assignments = careerAssignments(profile.careerId)
  const selected =
    assignments.find((a) => a.id === selectedId) ??
    assignments.find((a) => {
      const status = assignmentStatus(profile, a)
      return status !== 'completed' && status !== 'locked'
    }) ??
    assignments[0]

  return (
    <div className="flex h-full min-h-0">
      <div className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white">
        <h1 className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-900">
          Tasks
        </h1>
        <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="Tasks">
          {assignments.map((assignment) => {
            const status = assignmentStatus(profile, assignment)
            const badge = STATUS_BADGES[status]
            const best = bestScore(profile.assignments[assignment.id])
            return (
              <li key={assignment.id}>
                <button
                  type="button"
                  onClick={() => onSelect(assignment.id)}
                  aria-current={selected?.id === assignment.id}
                  className={`w-full border-b border-slate-100 px-4 py-3 text-left ${
                    selected?.id === assignment.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-medium ${status === 'locked' ? 'text-slate-400' : 'text-slate-900'}`}
                    >
                      {assignment.order}. {assignment.title}
                    </span>
                  </div>
                  {assignment.projectId && (
                    <p className="mt-0.5 text-xs font-medium text-violet-700">
                      Project · stage {assignment.stage} of{' '}
                      {getProject(assignment.projectId)?.stages.length}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    {best !== null && (
                      <span className="text-slate-500">Best: {best}%</span>
                    )}
                  </div>
                </button>
              </li>
            )
          })}
          <li className="px-4 py-4 text-sm text-slate-500">
            More tasks will arrive as your career progresses.
          </li>
        </ul>
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto bg-slate-50">
        {selected && (
          <TaskDetail
            key={selected.id}
            assignment={selected}
            profile={profile}
            onOpenWorkbook={onOpenWorkbook}
            onOpenFile={onOpenFile}
            onHandIn={onHandIn}
          />
        )}
      </div>
    </div>
  )
}

function TaskDetail({
  assignment,
  profile,
  onOpenWorkbook,
  onOpenFile,
  onHandIn,
}: {
  assignment: Assignment
  profile: Profile
  onOpenWorkbook: (assignmentId: string) => Promise<void>
  onOpenFile: (kind: 'doc' | 'slides', documentId: string) => void
  onHandIn: (mailId: string) => void
}) {
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const status = assignmentStatus(profile, assignment)
  const progress = profile.assignments[assignment.id]
  const attempts = progress?.attempts ?? []
  const latest = attempts.at(-1)
  const manager = getPerson(assignment.from)
  const briefing = profile.inbox.find(
    (mail) => mail.kind === 'briefing' && mail.assignmentId === assignment.id,
  )
  const previous = careerAssignments(assignment.careerId).find(
    (a) => a.order === assignment.order - 1,
  )
  const project = getProject(assignment.projectId)

  const actionLabel = {
    locked: '',
    available: 'Start task',
    'in-progress': 'Continue working',
    'needs-revision': 'Improve my work',
    completed: 'Open workbook',
  }[status]

  async function open() {
    setOpening(true)
    setError(null)
    try {
      await onOpenWorkbook(assignment.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setOpening(false)
    }
  }

  return (
    <article className="mx-auto max-w-3xl space-y-5 p-6" data-testid="task-detail">
      <header className="space-y-2">
        <p className="text-sm text-slate-500">
          Task {assignment.order} · from {manager.name}, {manager.role}
        </p>
        <h2 className="text-2xl font-bold text-slate-900">{assignment.title}</h2>
        <p className="text-slate-700">{assignment.summary}</p>
        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
          <span className="flex items-center gap-1">
            <Icon name="clock" className="h-4 w-4" /> About {assignment.estimatedMinutes}{' '}
            minutes
          </span>
          <span>Up to {assignment.xp} XP</span>
          <span>Pass mark {assignment.passScore}%</span>
        </div>
      </header>

      {project && (
        <section
          className="space-y-2 rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm"
          data-testid="project-brief"
        >
          <p className="font-semibold text-violet-900">
            Project: {project.title} · stage {assignment.stage} of {project.stages.length}
          </p>
          <p className="text-slate-700">{project.brief}</p>
          <ol className="list-decimal pl-5 text-slate-700">
            {project.stages.map((id) => {
              const stage = careerAssignments(assignment.careerId).find(
                (a) => a.id === id,
              )
              const done = stage && assignmentStatus(profile, stage) === 'completed'
              return (
                <li key={id} className={id === assignment.id ? 'font-medium' : undefined}>
                  {stage?.title.replace(/^.*?: /, '')}
                  {done && ' ✓'}
                </li>
              )
            })}
          </ol>
          <p className="text-slate-600">
            The project is complete when every stage has passed. It then joins your
            portfolio as one piece of work that links to each stage.
          </p>
        </section>
      )}

      {status === 'locked' ? (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-slate-600">
          <Icon name="lock" className="h-5 w-5" />
          Complete “{previous?.title}” first to unlock this task.
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void open()}
            disabled={opening}
            className="rounded-md bg-blue-700 px-5 py-2.5 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {opening ? 'Opening…' : actionLabel}
          </button>
          {error && (
            <span role="alert" className="text-sm text-red-700">
              {error}
            </span>
          )}
        </div>
      )}

      {assignment.deliverables.length > 0 && progress && (
        <section
          className="rounded-lg border border-blue-200 bg-white p-5"
          data-testid="task-files"
        >
          <h3 className="font-semibold text-slate-900">Your files for this task</h3>
          <p className="mt-1 text-sm text-slate-600">
            This task uses several apps. When everything is ready, reply to{' '}
            {manager.name.split(' ')[0]}’s email with the files attached.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            <li>
              <FileButton
                icon={
                  assignment.tool
                    ? (getTool(assignment.tool.id)?.icon ?? 'file')
                    : assignment.kind === 'tickets'
                      ? 'helpdesk'
                      : assignment.kind === 'code'
                        ? 'code'
                        : 'sheets'
                }
                title={
                  assignment.workbook?.title ??
                  assignment.queue?.title ??
                  assignment.project?.title ??
                  assignment.tool?.title ??
                  assignment.title
                }
                kind={
                  assignment.tool
                    ? (getTool(assignment.tool.id)?.name ?? 'Tool file')
                    : assignment.kind === 'tickets'
                      ? 'Ticket queue (Help Desk)'
                      : assignment.kind === 'code'
                        ? 'Project (Code)'
                        : 'Workbook (Sheets)'
                }
                onClick={() => void open()}
              />
            </li>
            {assignment.deliverables.map((deliverable) => {
              const id = progress.files?.[deliverable.kind]
              return id ? (
                <li key={deliverable.kind}>
                  <FileButton
                    icon={deliverable.kind === 'doc' ? 'docs' : 'slides'}
                    title={deliverable.title}
                    kind={
                      deliverable.kind === 'doc'
                        ? 'Report (Docs)'
                        : 'Presentation (Slides)'
                    }
                    onClick={() => onOpenFile(deliverable.kind, id)}
                  />
                </li>
              ) : null
            })}
          </ul>
          {briefing && (
            <button
              type="button"
              onClick={() => onHandIn(briefing.id)}
              className="mt-4 flex items-center gap-1.5 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
            >
              <Icon name="send" className="h-4 w-4" /> Reply to{' '}
              {manager.name.split(' ')[0]} with your work
            </button>
          )}
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Why this matters at work</h3>
        <p className="mt-1 text-slate-700">{assignment.whyItMatters}</p>
        <h3 className="mt-4 font-semibold text-slate-900">What you will learn</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
          {assignment.objectives.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
        <h3 className="mt-4 font-semibold text-slate-900">Skills you will build</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.keys(assignment.skills).map((skillId) => (
            <span
              key={skillId}
              className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
            >
              {getSkill(skillId)?.name ?? skillId}
            </span>
          ))}
        </div>
      </section>

      {latest && (
        <section className="space-y-3" data-testid="task-feedback">
          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold text-slate-900">
              Feedback on your latest submission
            </h3>
            <span className="text-sm text-slate-500">
              {formatDateTime(latest.submittedAt)}
            </span>
          </div>
          <p className="text-slate-700">
            Score <strong>{latest.score}%</strong>
            {latest.score >= assignment.passScore
              ? ' (passed)'
              : ` (pass mark ${assignment.passScore}%)`}
          </p>
          <CheckResultsList assignment={assignment} checks={latest.checks} />
          {attempts.length > 1 && (
            <details className="text-sm text-slate-600">
              <summary className="cursor-pointer">
                All {attempts.length} submissions
              </summary>
              <ul className="mt-2 space-y-1">
                {attempts.map((attempt, i) => (
                  <li key={attempt.submittedAt}>
                    {i + 1}. {formatDateTime(attempt.submittedAt)}: {attempt.score}%
                    {attempt.xpEarned > 0 && ` (+${attempt.xpEarned} XP)`}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
    </article>
  )
}

function FileButton({
  icon,
  title,
  kind,
  onClick,
}: {
  icon: IconName
  title: string
  kind: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md border border-slate-200 p-3 text-left hover:border-blue-300 hover:bg-blue-50"
    >
      <Icon name={icon} className="h-6 w-6 shrink-0 text-slate-600" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-slate-900">{title}</span>
        <span className="block text-xs text-slate-500">{kind}</span>
      </span>
    </button>
  )
}
