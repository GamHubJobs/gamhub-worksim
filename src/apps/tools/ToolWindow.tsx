/**
 * An open file of a professional tool: the tool's workspace inside the shared
 * document window (save status, rename, version history), with undo and redo,
 * the tool's guide, and the task pane for submitting a task's work.
 */
import { Suspense, useMemo, useState } from 'react'
import { z } from 'zod'
import type { Career, SubmissionResult } from '../../app/useCareer'
import { getAssignment } from '../../content/assignments'
import { getPerson } from '../../content/departments'
import { getTool } from '../../tools/registry'
import { getWorkspace } from '../../tools/ui'
import { DocumentFrame } from '../shared/DocumentFrame'
import { useSavedDocument } from '../shared/useSavedDocument'
import { AssignmentPane } from '../sheets/ui/AssignmentPane'
import { SubmissionResults } from '../tasks/SubmissionResults'
import { ToolGuide } from './ToolGuide'

interface ToolWindowProps {
  documentId: string
  toolId: string
  /** The task the file belongs to (none for a practice file). */
  assignmentId: string | null
  career: Career
  lockedSections: Record<string, string>
  onBack: () => void
  onOpenTask: (assignmentId: string) => void
}

const PANEL_BUTTON = (active: boolean) =>
  `rounded-md border px-3 py-1 text-sm ${
    active
      ? 'border-blue-300 bg-blue-50 text-blue-900'
      : 'border-slate-300 hover:bg-slate-50'
  }`

export function ToolWindow({
  documentId,
  toolId,
  assignmentId,
  career,
  lockedSections,
  onBack,
  onOpenTask,
}: ToolWindowProps) {
  const tool = getTool(toolId)
  const schema = useMemo(
    () =>
      z.object({
        tool: z.literal(toolId),
        state: tool ? tool.state : z.never(),
      }),
    [tool, toolId],
  )
  const file = useSavedDocument(documentId, 'tool', schema)
  const { state } = file
  const Workspace = getWorkspace(toolId)
  const assignment = assignmentId ? getAssignment(assignmentId) : undefined
  const profile = career.state.status === 'ready' ? career.state.profile : null
  const progress = assignment ? profile?.assignments[assignment.id] : undefined
  const [panel, setPanel] = useState<'task' | 'guide' | null>(assignment ? 'task' : null)
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
      if (!(await file.flush())) {
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

  if (!tool || !Workspace) {
    return <p className="p-6 text-sm text-red-700">This tool is not available.</p>
  }

  const workspace = (content: { state: unknown }, readOnly: boolean) => (
    <Suspense
      fallback={<p className="p-6 text-sm text-slate-600">Opening {tool.name}…</p>}
    >
      <Workspace
        state={content.state}
        readOnly={readOnly}
        lockedSections={lockedSections}
        onUpdate={
          readOnly
            ? undefined
            : (change) =>
                file.update((latest) => ({ ...latest, state: change(latest.state) }))
        }
      />
    </Suspense>
  )

  return (
    <>
      <DocumentFrame
        documentId={documentId}
        title={state.status === 'ready' ? state.document.title : null}
        controls={file}
        loadError={state.status === 'error' ? state.message : (error ?? null)}
        loadingText={`Opening ${tool.name}…`}
        onBack={onBack}
        actions={
          <>
            <button
              type="button"
              onClick={file.undo}
              disabled={!file.canUndo}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-40"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={file.redo}
              disabled={!file.canRedo}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-40"
            >
              Redo
            </button>
            <button
              type="button"
              onClick={() => setPanel((p) => (p === 'guide' ? null : 'guide'))}
              aria-pressed={panel === 'guide'}
              className={PANEL_BUTTON(panel === 'guide')}
            >
              Guide
            </button>
            {assignment && (
              <button
                type="button"
                onClick={() => setPanel((p) => (p === 'task' ? null : 'task'))}
                aria-pressed={panel === 'task'}
                className={PANEL_BUTTON(panel === 'task')}
              >
                Task
              </button>
            )}
          </>
        }
        sidePanel={
          panel === 'guide' ? (
            <ToolGuide tool={tool} onClose={() => setPanel(null)} />
          ) : assignment && panel === 'task' ? (
            <AssignmentPane
              assignment={assignment}
              playerName={profile?.name ?? ''}
              progress={progress}
              submitting={submitting}
              onToggleStep={(stepId) => void career.toggleStep(assignment.id, stepId)}
              onSubmit={() => setConfirming(true)}
              onShowResults={() => onOpenTask(assignment.id)}
              onClose={() => setPanel(null)}
            />
          ) : undefined
        }
      >
        {(preview) =>
          preview?.kind === 'tool' && preview.content.tool === toolId
            ? workspace(preview.content, true)
            : state.status === 'ready'
              ? workspace(state.content, false)
              : null
        }
      </DocumentFrame>

      {confirming && assignment && manager && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-tool-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 id="submit-tool-title" className="text-lg font-semibold text-slate-900">
              Submit your work to {manager.name.split(' ')[0]}?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Your {tool.name} file is checked straight away and you get feedback. A copy
              is kept in Version history, and you can improve your work and submit again.
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
          closeLabel={`Back to ${tool.name}`}
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
