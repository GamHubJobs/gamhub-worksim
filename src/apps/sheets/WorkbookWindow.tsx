/**
 * An open workbook: the spreadsheet editor with saving, crash recovery and
 * version history. For an assignment workbook, the task pane shows the
 * instructions and the Submit button.
 */
import { useEffect, useState } from 'react'
import { useAppServices } from '../../app/services'
import type { Career, SubmissionResult } from '../../app/useCareer'
import { getAssignment } from '../../content/assignments'
import { getPerson } from '../../content/departments'
import { formatDateTime } from '../../lib/time'
import type { DocumentVersion } from '../../persistence/schemas'
import { Icon } from '../../ui/Icon'
import { RecoveryBanner } from '../../ui/RecoveryBanner'
import { SaveIndicator } from '../../ui/SaveIndicator'
import { SubmissionResults } from '../tasks/SubmissionResults'
import { AssignmentPane } from './ui/AssignmentPane'
import { SheetEditor } from './ui/SheetEditor'
import { VersionHistoryPanel } from '../../ui/VersionHistoryPanel'
import { useSheetDocument } from './useSheetDocument'

interface WorkbookWindowProps {
  documentId: string
  /** Set when this workbook belongs to an assignment. */
  assignmentId: string | null
  career: Career
  onBack: () => void
  onOpenTask: (assignmentId: string) => void
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function WorkbookWindow({
  documentId,
  assignmentId,
  career,
  onBack,
  onOpenTask,
}: WorkbookWindowProps) {
  const { session, registerFlush, onSaved } = useAppServices()
  const sheet = useSheetDocument(documentId)
  const { state, flush } = sheet
  const [panel, setPanel] = useState<'task' | 'history' | null>(
    assignmentId ? 'task' : null,
  )
  const [preview, setPreview] = useState<DocumentVersion | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmingSubmit, setConfirmingSubmit] = useState(false)
  const [result, setResult] = useState<SubmissionResult | null>(null)

  const assignment = assignmentId ? getAssignment(assignmentId) : undefined
  const profile = career.state.status === 'ready' ? career.state.profile : null
  const progress = assignment ? profile?.assignments[assignment.id] : undefined

  useEffect(() => registerFlush(flush), [registerFlush, flush])

  useEffect(() => {
    if (sheet.saveStatus.state === 'saved') onSaved()
  }, [sheet.saveStatus.state, onSaved])

  async function runAction(action: () => Promise<void>) {
    setActionError(null)
    try {
      await action()
    } catch (error) {
      setActionError(errorMessage(error))
    }
  }

  async function submit() {
    if (!assignment) return
    setConfirmingSubmit(false)
    setSubmitting(true)
    await runAction(async () => {
      if (!(await flush())) {
        throw new Error(
          'Your latest changes could not be saved, so the work was not submitted. Please try again in a moment.',
        )
      }
      setResult(await career.submitAssignment(assignment.id))
    })
    setSubmitting(false)
  }

  const manager = assignment ? getPerson(assignment.from) : null
  const loadError = state.status === 'error' ? state.message : null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            <Icon name="back" className="h-4 w-4" /> Files
          </button>
          <h1
            className="truncate font-semibold text-slate-800"
            data-testid="workbook-title"
          >
            {state.status === 'ready' ? state.document.title : 'Opening…'}
          </h1>
          <SaveIndicator status={sheet.saveStatus} />
        </div>
        <div className="flex items-center gap-2">
          {assignment && (
            <button
              type="button"
              onClick={() => {
                setPanel((open) => (open === 'task' ? null : 'task'))
                setPreview(null)
              }}
              aria-pressed={panel === 'task'}
              className={`rounded-md border px-3 py-1 text-sm ${
                panel === 'task'
                  ? 'border-blue-300 bg-blue-50 text-blue-900'
                  : 'border-slate-300 hover:bg-slate-50'
              }`}
            >
              Task
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setPanel((open) => (open === 'history' ? null : 'history'))
              setPreview(null)
            }}
            aria-pressed={panel === 'history'}
            className={`rounded-md border px-3 py-1 text-sm ${
              panel === 'history'
                ? 'border-blue-300 bg-blue-50 text-blue-900'
                : 'border-slate-300 hover:bg-slate-50'
            }`}
          >
            Version history
          </button>
        </div>
      </div>

      {!bannerDismissed && (
        <RecoveryBanner
          recoveredUnsavedChanges={sheet.recoveredUnsavedChanges}
          previousSessionCrashed={session.previousSessionCrashed}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      {actionError && (
        <div
          role="alert"
          className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800"
        >
          {actionError}
        </div>
      )}

      {preview && (
        <div
          className="flex items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
          data-testid="preview-bar"
        >
          <span>
            Previewing the version from{' '}
            <strong>{formatDateTime(preview.createdAt)}</strong>. This is read-only.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                runAction(async () => {
                  await sheet.restore(preview.id)
                  setPreview(null)
                })
              }
              className="rounded-md bg-amber-600 px-3 py-1 font-medium text-white hover:bg-amber-700"
            >
              Restore this version
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="rounded-md px-3 py-1 hover:bg-amber-100"
            >
              Back to current
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 p-3">
          {loadError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800"
            >
              <p className="font-semibold">This workbook could not be opened.</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{loadError}</p>
            </div>
          )}
          {state.status === 'loading' && (
            <p className="text-slate-500">Opening your workbook…</p>
          )}
          {state.status === 'ready' && (
            <SheetEditor
              // Remount when switching between preview and live content, to reset editing.
              key={preview ? `preview-${preview.id}` : 'live'}
              content={
                preview?.snapshot.kind === 'sheet'
                  ? preview.snapshot.content
                  : state.content
              }
              readOnly={preview !== null}
              onUpdate={sheet.update}
              onUndo={sheet.undo}
              onRedo={sheet.redo}
              canUndo={sheet.canUndo}
              canRedo={sheet.canRedo}
            />
          )}
        </main>

        {panel === 'history' && (
          <VersionHistoryPanel
            documentId={documentId}
            revision={sheet.versionsRevision}
            previewVersionId={preview?.id ?? null}
            onPreview={setPreview}
            onToggleKeep={(version) =>
              runAction(() => sheet.setKept(version.id, !version.keep))
            }
            onKeepCurrent={() => runAction(sheet.keepCurrentVersion)}
            onClose={() => {
              setPanel(null)
              setPreview(null)
            }}
          />
        )}

        {panel === 'task' && assignment && (
          <AssignmentPane
            assignment={assignment}
            playerName={profile?.name ?? ''}
            progress={progress}
            submitting={submitting}
            onToggleStep={(stepId) =>
              runAction(() => career.toggleStep(assignment.id, stepId))
            }
            onSubmit={() => setConfirmingSubmit(true)}
            onShowResults={() => onOpenTask(assignment.id)}
            onClose={() => setPanel(null)}
          />
        )}
      </div>

      {confirmingSubmit && assignment && manager && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 id="submit-title" className="text-lg font-semibold text-slate-900">
              Submit your work to {manager.name.split(' ')[0]}?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Your workbook will be checked straight away and you will get feedback. A
              copy of what you submitted is kept in Version history. You can keep
              improving your work and submit again at any time.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingSubmit(false)}
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
          onClose={() => setResult(null)}
          onOpenTask={(id) => {
            setResult(null)
            onOpenTask(id)
          }}
        />
      )}
    </div>
  )
}
