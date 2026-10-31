/**
 * An open ticket queue: the Help Desk inside the shared document window, with
 * the task pane and submitting the work for a task.
 */
import { useState } from 'react'
import type { Career, SubmissionResult } from '../../app/useCareer'
import { getAssignment } from '../../content/assignments'
import { getPerson } from '../../content/departments'
import { TicketsContentSchema } from '../../persistence/schemas'
import { DocumentFrame } from '../shared/DocumentFrame'
import { useSavedDocument } from '../shared/useSavedDocument'
import { AssignmentPane } from '../sheets/ui/AssignmentPane'
import { SubmissionResults } from '../tasks/SubmissionResults'
import { TicketsEditor } from './TicketsEditor'

interface HelpDeskWindowProps {
  documentId: string
  /** The task the queue belongs to. */
  assignmentId: string | null
  career: Career
  onBack: () => void
  onOpenTask: (assignmentId: string) => void
}

export function HelpDeskWindow({
  documentId,
  assignmentId,
  career,
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
        {(preview) =>
          preview?.kind === 'tickets' ? (
            <TicketsEditor
              key={`preview-${preview.id}-${preview.rev}`}
              content={preview.content}
              readOnly
            />
          ) : state.status === 'ready' ? (
            <TicketsEditor
              key={`live-${queue.contentEpoch}`}
              content={state.content}
              onUpdate={queue.update}
            />
          ) : null
        }
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
