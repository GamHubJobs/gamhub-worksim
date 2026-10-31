/** Code: the projects of the player's tasks. */
import { getAssignment } from '../../content/assignments'
import { bestScore } from '../../game/career'
import { formatDateTime } from '../../lib/time'
import type { Profile } from '../../persistence/schemas'
import { Icon } from '../../ui/Icon'

export function CodeApp({
  profile,
  onOpen,
}: {
  profile: Profile
  onOpen: (documentId: string) => void
}) {
  const projects = Object.values(profile.assignments)
    .filter((p) => getAssignment(p.assignmentId)?.kind === 'code')
    .sort((a, b) => b.startedAt - a.startedAt)

  return (
    <div className="h-full overflow-y-auto bg-slate-50" data-testid="code-files">
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-semibold text-slate-900">Code</h1>
        <p className="text-sm text-slate-600">
          Code projects for your tasks. Start a task in Tasks to get its project.
        </p>
        {projects.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
            No projects yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {projects.map((progress) => {
              const assignment = getAssignment(progress.assignmentId)
              const best = bestScore(progress)
              return (
                <li key={progress.documentId}>
                  <button
                    type="button"
                    onClick={() => onOpen(progress.documentId)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-100 text-emerald-800">
                      <Icon name="code" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900">
                        {assignment?.project?.title ?? 'Code project'}
                      </span>
                      <span className="block text-xs text-slate-500">
                        Task: {assignment?.title} · started{' '}
                        {formatDateTime(progress.startedAt)}
                        {best !== null && ` · best score ${best}%`}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
