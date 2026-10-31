/** Help Desk: the ticket queues of the player's tasks. */
import { getAssignment } from '../../content/assignments'
import { bestScore } from '../../game/career'
import { formatDateTime } from '../../lib/time'
import type { Profile } from '../../persistence/schemas'
import { Icon } from '../../ui/Icon'

export function HelpDeskApp({
  profile,
  onOpen,
}: {
  profile: Profile
  onOpen: (documentId: string) => void
}) {
  const queues = Object.values(profile.assignments)
    .filter((p) => getAssignment(p.assignmentId)?.kind === 'tickets')
    .sort((a, b) => b.startedAt - a.startedAt)

  return (
    <div className="h-full overflow-y-auto bg-slate-50" data-testid="helpdesk-files">
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-semibold text-slate-900">Help Desk</h1>
        <p className="text-sm text-slate-600">
          Ticket queues for your tasks. Start a task in Tasks to get its queue.
        </p>
        {queues.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
            No queues yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {queues.map((progress) => {
              const assignment = getAssignment(progress.assignmentId)
              const best = bestScore(progress)
              return (
                <li key={progress.documentId}>
                  <button
                    type="button"
                    onClick={() => onOpen(progress.documentId)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-100 text-cyan-800">
                      <Icon name="helpdesk" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900">
                        {assignment?.queue?.title ?? 'Ticket queue'}
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
