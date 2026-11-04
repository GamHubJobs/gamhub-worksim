/**
 * A professional tool's start page: what it is for, its sections (and which
 * unlock later), the player's task files, a practice file, and the guide.
 */
import { useState } from 'react'
import { getAssignment } from '../../content/assignments'
import { bestScore } from '../../game/career'
import { formatDateTime } from '../../lib/time'
import type { Profile } from '../../persistence/schemas'
import type { ToolAccess } from '../../tools/registry'
import { Icon } from '../../ui/Icon'
import { GuideContent } from './ToolGuide'

export function ToolHome({
  profile,
  access,
  onOpen,
  onOpenPractice,
}: {
  profile: Profile
  access: ToolAccess
  onOpen: (documentId: string) => void
  onOpenPractice: () => Promise<void>
}) {
  const { tool, lockedSections } = access
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const files = Object.values(profile.assignments)
    .filter((p) => getAssignment(p.assignmentId)?.tool?.id === tool.id)
    .sort((a, b) => b.startedAt - a.startedAt)

  return (
    <div
      className="h-full overflow-y-auto bg-slate-50"
      data-testid={`tool-home-${tool.id}`}
    >
      <div className="mx-auto max-w-4xl space-y-5 p-6">
        <header className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-800">
            <Icon name={tool.icon} className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{tool.name}</h1>
            <p className="text-sm text-slate-600">{tool.category}</p>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2">
          {tool.sections.map((section) => {
            const locked = lockedSections[section.id]
            return (
              <div
                key={section.id}
                className={`rounded-lg border p-3 ${
                  locked
                    ? 'border-dashed border-slate-300 bg-slate-100'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <p className="flex items-center gap-1.5 font-medium text-slate-900">
                  {locked && <Icon name="lock" className="h-4 w-4 text-slate-500" />}
                  {section.name}
                </p>
                <p className="mt-0.5 text-sm text-slate-600">{section.description}</p>
                {locked && (
                  <p className="mt-1 text-xs text-slate-500">
                    Unlocks when you become {locked}.
                  </p>
                )}
              </div>
            )
          })}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Your files</h2>
          {files.length === 0 ? (
            <p className="mt-1 text-sm text-slate-600">
              Tasks that use {tool.name} create their file here when you start them in
              Tasks.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {files.map((progress) => {
                const assignment = getAssignment(progress.assignmentId)
                const best = bestScore(progress)
                return (
                  <li key={progress.documentId}>
                    <button
                      type="button"
                      onClick={() => onOpen(progress.documentId)}
                      className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-slate-50"
                    >
                      <Icon name={tool.icon} className="h-5 w-5 text-indigo-700" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-900">
                          {assignment?.tool?.title ?? assignment?.title}
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
          <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              disabled={opening}
              onClick={async () => {
                setOpening(true)
                setError(null)
                try {
                  await onOpenPractice()
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e))
                } finally {
                  setOpening(false)
                }
              }}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60"
            >
              Open the practice file
            </button>
            <span className="text-xs text-slate-500">
              Sample data to explore freely. It never affects your tasks.
            </span>
          </div>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Icon name="guide" className="h-4 w-4" /> How to use {tool.name}
          </h2>
          <GuideContent tool={tool} />
        </section>
      </div>
    </div>
  )
}
