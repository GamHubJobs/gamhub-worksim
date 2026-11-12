/**
 * An open ticket queue: the Help Desk inside the shared document window, with
 * the task pane and submitting the work for a task.
 */
import { Suspense, useEffect, useRef, useState } from 'react'
import type { Career, SubmissionResult } from '../../app/useCareer'
import { getAssignment } from '../../content/assignments'
import { getPerson } from '../../content/departments'
import { TicketsContentSchema } from '../../persistence/schemas'
import { DocumentFrame } from '../shared/DocumentFrame'
import { useSavedDocument } from '../shared/useSavedDocument'
import { AssignmentPane } from '../sheets/ui/AssignmentPane'
import { SubmissionResults } from '../tasks/SubmissionResults'
import { TicketsEditor } from './TicketsEditor'
import { formatTime, weekdayName } from '../../game/clock'
import {
  applyEnvironmentChange,
  disruptionsOf,
  SYSTEM_NAMES,
  type Moment,
  type SystemId,
} from '../../game/incidents'
import type {
  Disruption,
  TicketActivity,
  TicketsContent,
} from '../../persistence/schemas'
import { getWorkspace } from '../../tools/ui'

interface HelpDeskWindowProps {
  documentId: string
  /** The task the queue belongs to. */
  assignmentId: string | null
  career: Career
  /** Per tool ID: its sections still locked for the player. */
  lockedSections?: Record<string, Record<string, string>>
  onBack: () => void
  onOpenTask: (assignmentId: string) => void
}

type Tab = 'queue' | SystemId

/** Now, for ticket histories: the real time and the office clock. */
function officeMoment(work?: { day: number; minute: number }): Moment {
  return {
    at: Date.now(),
    time: work
      ? `${weekdayName(work.day)} (day ${work.day}), ${formatTime(work.minute)}`
      : '',
  }
}

/** The newest automatic updates to tickets (resolved, reopened), for the bar above. */
function latestUpdates(
  content: TicketsContent,
): Array<TicketActivity & { ticket: string }> {
  return content.tickets
    .flatMap((t) => t.activity.map((entry) => ({ ...entry, ticket: t.id })))
    .filter((entry) => entry.kind === 'resolved' || entry.kind === 'reopened')
    .sort((a, b) => a.at - b.at)
}

export function HelpDeskWindow({
  documentId,
  assignmentId,
  career,
  lockedSections = {},
  onBack,
  onOpenTask,
}: HelpDeskWindowProps) {
  const queue = useSavedDocument(documentId, 'tickets', TicketsContentSchema)
  const { state } = queue
  const assignment = assignmentId ? getAssignment(assignmentId) : undefined
  const profile = career.state.status === 'ready' ? career.state.profile : null
  const progress = assignment ? profile?.assignments[assignment.id] : undefined
  const [paneOpen, setPaneOpen] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SubmissionResult | null>(null)
  const manager = assignment ? getPerson(assignment.from) : null
  const [tab, setTab] = useState<Tab>('queue')
  const environment = state.status === 'ready' ? state.content.environment : undefined
  const systems = (['network', 'directory'] as const).filter((id) => environment?.[id])

  const moment = () => officeMoment(profile?.work)

  // Tickets that changed by themselves since the queue was opened (fixed, or broken again).
  const seen = useRef<number | null>(null)
  const [update, setUpdate] = useState<(TicketActivity & { ticket: string }) | null>(null)
  const content = state.status === 'ready' ? state.content : null
  useEffect(() => {
    if (!content) return
    const updates = latestUpdates(content)
    const newest = updates.at(-1)
    if (seen.current === null) seen.current = newest?.at ?? 0
    else if (newest && newest.at > seen.current) {
      seen.current = newest.at
      setUpdate(newest)
    }
  }, [content])

  // The colleagues held up by the tickets follow the systems (see game/incidents.ts).
  const { syncDisruptions } = career
  const assignmentKey = assignment?.id ?? null
  const hasSystems = !!content?.environment
  const held =
    content && assignmentKey
      ? JSON.stringify(disruptionsOf(content, assignmentKey))
      : null
  useEffect(() => {
    if (held && assignmentKey && hasSystems)
      void syncDisruptions(assignmentKey, JSON.parse(held) as Disruption[])
  }, [held, assignmentKey, hasSystems, syncDisruptions])

  async function submit() {
    if (!assignment) return
    setConfirming(false)
    setSubmitting(true)
    setError(null)
    try {
      if (!(await queue.flush())) {
        throw new Error(
          'Your latest changes could not be saved, so nothing was submitted.',
        )
      }
      setResult(await career.submitAssignment(assignment.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setSubmitting(false)
  }

  return (
    <>
      <DocumentFrame
        documentId={documentId}
        title={state.status === 'ready' ? state.document.title : null}
        controls={queue}
        loadError={state.status === 'error' ? state.message : (error ?? null)}
        loadingText="Opening the ticket queue…"
        onBack={onBack}
        actions={
          assignment && (
            <button
              type="button"
              onClick={() => setPaneOpen((open) => !open)}
              aria-pressed={paneOpen}
              className={`rounded-md border px-3 py-1 text-sm ${
                paneOpen
                  ? 'border-blue-300 bg-blue-50 text-blue-900'
                  : 'border-slate-300 hover:bg-slate-50'
              }`}
            >
              Task
            </button>
          )
        }
        sidePanel={
          assignment && paneOpen ? (
            <AssignmentPane
              assignment={assignment}
              playerName={profile?.name ?? ''}
              progress={progress}
              submitting={submitting}
              onToggleStep={(stepId) => void career.toggleStep(assignment.id, stepId)}
              onSubmit={() => setConfirming(true)}
              onShowResults={() => onOpenTask(assignment.id)}
              onClose={() => setPaneOpen(false)}
            />
          ) : undefined
        }
      >
        {(preview) => {
          const shown =
            preview?.kind === 'tickets'
              ? {
                  content: preview.content,
                  live: false,
                  key: `preview-${preview.id}-${preview.rev}`,
                }
              : state.status === 'ready'
                ? {
                    content: state.content,
                    live: true,
                    key: `live-${queue.contentEpoch}`,
                  }
                : null
          if (!shown) return null
          const Workspace = tab === 'queue' ? null : getWorkspace(tab)
          return (
            <div className="flex min-h-0 flex-1 flex-col">
              {systems.length > 0 && (
                <div
                  className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-3 py-1.5"
                  role="tablist"
                  aria-label="Help Desk and the company’s systems"
                >
                  {(['queue', ...systems] as Tab[]).map((id) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={tab === id}
                      onClick={() => setTab(id)}
                      className={`rounded-md px-3 py-1 text-sm ${
                        tab === id
                          ? 'bg-blue-50 font-medium text-blue-900'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {id === 'queue' ? 'Ticket queue' : SYSTEM_NAMES[id]}
                    </button>
                  ))}
                  {update && (
                    <p
                      role="status"
                      className={`ml-3 min-w-0 flex-1 truncate text-sm ${
                        update.kind === 'resolved' ? 'text-emerald-800' : 'text-red-800'
                      }`}
                      title={`${update.ticket}: ${update.text}`}
                      data-testid="ticket-update"
                    >
                      {update.kind === 'resolved' ? '✓' : '!'} {update.ticket}:{' '}
                      {update.text}
                    </p>
                  )}
                </div>
              )}
              {tab === 'queue' || !Workspace || !shown.content.environment?.[tab] ? (
                <TicketsEditor
                  key={shown.key}
                  content={shown.content}
                  readOnly={!shown.live}
                  onUpdate={shown.live ? queue.update : undefined}
                  moment={moment}
                />
              ) : (
                <Suspense
                  fallback={
                    <p className="p-6 text-sm text-slate-600">
                      Opening {SYSTEM_NAMES[tab]}…
                    </p>
                  }
                >
                  <Workspace
                    key={`${shown.key}-${tab}`}
                    state={shown.content.environment[tab]}
                    readOnly={!shown.live}
                    lockedSections={lockedSections[tab] ?? {}}
                    now={() => moment().at}
                    onUpdate={
                      shown.live
                        ? (change) => {
                            const when = moment()
                            queue.update((latest) =>
                              applyEnvironmentChange(
                                latest,
                                tab,
                                // The tool changes its own state; the tickets react to it.
                                change,
                                when,
                              ),
                            )
                          }
                        : undefined
                    }
                  />
                </Suspense>
              )}
            </div>
          )
        }}
      </DocumentFrame>

      {confirming && assignment && manager && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-tickets-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2
              id="submit-tickets-title"
              className="text-lg font-semibold text-slate-900"
            >
              Submit your work to {manager.name.split(' ')[0]}?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              The queue is checked straight away and you get feedback. A copy is kept in
              Version history, and you can improve your work and submit again.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-md px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                Not yet
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => void submit()}
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {result && assignment && (
        <SubmissionResults
          assignment={assignment}
          result={result}
          closeLabel="Back to the queue"
          onClose={() => setResult(null)}
          onOpenTask={(id) => {
            setResult(null)
            onOpenTask(id)
          }}
        />
      )}
    </>
  )
}
