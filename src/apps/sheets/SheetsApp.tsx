/** Sheets: the player's workbooks. Opening one shows it in a workbook window. */
import { getAssignment } from '../../content/assignments'
import { bestScore } from '../../game/career'
import { formatDateTime } from '../../lib/time'
import type { Profile } from '../../persistence/schemas'
import { Icon } from '../../ui/Icon'

interface SheetsAppProps {
  profile: Profile
  onOpen: (document: string) => void
}

export function SheetsApp({ profile, onOpen }: SheetsAppProps) {
  // Workbooks of tasks done in Sheets (Help Desk tasks have a ticket queue instead).
  const started = Object.values(profile.assignments)
    .filter((p) => getAssignment(p.assignmentId)?.kind !== 'tickets')
    .sort((a, b) => b.startedAt - a.startedAt)

  return (
    <div className="h-full overflow-y-auto bg-slate-50" data-testid="sheets-files">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="text-xl font-semibold text-slate-900">Sheets</h1>

        <section>
          <h2 className="mb-2 text-sm font-medium tracking-wide text-slate-500 uppercase">
            Work files
          </h2>
          {started.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
              Workbooks for your tasks appear here once you start a task in Tasks.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
              {started.map((progress) => {
                const assignment = getAssignment(progress.assignmentId)
                const best = bestScore(progress)
                return (
                  <li key={progress.documentId}>
                    <button
                      type="button"
                      onClick={() => onOpen(progress.documentId)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                        <Icon name="sheets" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-900">
                          {assignment?.workbook?.title ?? 'Workbook'}
                        </span>
                        <span className="block text-xs text-slate-500">
                          Task: {assignment?.title ?? progress.assignmentId} · started{' '}
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
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium tracking-wide text-slate-500 uppercase">
            Practice
          </h2>
          <button
            type="button"
            onClick={() => onOpen('practice')}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600">
              <Icon name="file" />
            </span>
            <span>
              <span className="block font-medium text-slate-900">Practice Workbook</span>
              <span className="block text-xs text-slate-500">
                A free workbook to try things out. It is never graded.
              </span>
            </span>
          </button>
        </section>
      </div>
    </div>
  )
}
