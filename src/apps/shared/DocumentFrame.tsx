/**
 * The window around an open document or presentation: a title the player can
 * rename, the save indicator, version history (preview, restore, keep), the
 * crash-recovery banner and error messages. The editor goes inside.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { useAppServices } from '../../app/services'
import { formatDateTime } from '../../lib/time'
import type { AutosaveStatus } from '../../persistence/autosave'
import type { AnyDocument, DocumentVersion } from '../../persistence/schemas'
import { Icon } from '../../ui/Icon'
import { RecoveryBanner } from '../../ui/RecoveryBanner'
import { SaveIndicator } from '../../ui/SaveIndicator'
import { VersionHistoryPanel } from '../../ui/VersionHistoryPanel'

/** The parts of `useSavedDocument` the frame needs. */
export interface SavedDocumentControls {
  saveStatus: AutosaveStatus
  recoveredUnsavedChanges: boolean
  versionsRevision: number
  flush: () => Promise<boolean>
  restore: (versionId: string) => Promise<void>
  keepCurrentVersion: () => Promise<void>
  setKept: (versionId: string, keep: boolean) => Promise<void>
  rename: (title: string) => Promise<void>
}

interface DocumentFrameProps {
  documentId: string
  title: string | null
  controls: SavedDocumentControls
  loadError: string | null
  /** e.g. "Opening your document…" */
  loadingText: string
  onBack: () => void
  /** Extra buttons in the title bar (e.g. Present, Print). */
  actions?: ReactNode
  /** A panel shown on the right instead of version history (e.g. the task). */
  sidePanel?: ReactNode
  /** The editor, or a read-only view of `preview` when one is selected. */
  children: (preview: AnyDocument | null) => ReactNode
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function DocumentFrame({
  documentId,
  title,
  controls,
  loadError,
  loadingText,
  onBack,
  actions,
  sidePanel,
  children,
}: DocumentFrameProps) {
  const { session, registerFlush, onSaved } = useAppServices()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [preview, setPreview] = useState<DocumentVersion | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const { flush, saveStatus } = controls

  useEffect(() => registerFlush(flush), [registerFlush, flush])
  useEffect(() => {
    if (saveStatus.state === 'saved') onSaved()
  }, [saveStatus.state, onSaved])

  async function run(action: () => Promise<void>) {
    setActionError(null)
    try {
      await action()
    } catch (error) {
      setActionError(errorMessage(error))
    }
  }

  function finishRename() {
    const next = editingTitle
    setEditingTitle(null)
    if (next !== null && next.trim() && next.trim() !== title) {
      void run(() => controls.rename(next))
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="document-window">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            <Icon name="back" className="h-4 w-4" /> Files
          </button>
          {editingTitle !== null ? (
            <input
              autoFocus
              aria-label="Title"
              value={editingTitle}
              maxLength={200}
              onChange={(event) => setEditingTitle(event.target.value)}
              onBlur={finishRename}
              onKeyDown={(event) => {
                if (event.key === 'Enter') finishRename()
                if (event.key === 'Escape') setEditingTitle(null)
              }}
              className="min-w-0 rounded border border-blue-400 px-2 py-0.5 font-semibold text-slate-800 outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => title && setEditingTitle(title)}
              title="Rename"
              className="truncate rounded px-1 font-semibold text-slate-800 hover:bg-slate-100"
              data-testid="document-title"
            >
              {title ?? 'Opening…'}
            </button>
          )}
          <SaveIndicator status={saveStatus} />
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={() => {
              setHistoryOpen((open) => !open)
              setPreview(null)
            }}
            aria-pressed={historyOpen}
            className={`rounded-md border px-3 py-1 text-sm ${
              historyOpen
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
          recoveredUnsavedChanges={controls.recoveredUnsavedChanges}
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
                run(async () => {
                  await controls.restore(preview.id)
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
        <div className="flex min-w-0 flex-1 flex-col">
          {loadError ? (
            <div
              role="alert"
              className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800"
            >
              <p className="font-medium">This file could not be opened.</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{loadError}</p>
            </div>
          ) : title === null ? (
            <p className="p-6 text-slate-500">{loadingText}</p>
          ) : (
            children(preview?.snapshot ?? null)
          )}
        </div>

        {historyOpen ? (
          <VersionHistoryPanel
            documentId={documentId}
            revision={controls.versionsRevision}
            previewVersionId={preview?.id ?? null}
            onPreview={setPreview}
            onToggleKeep={(version) =>
              run(() => controls.setKept(version.id, !version.keep))
            }
            onKeepCurrent={() => run(controls.keepCurrentVersion)}
            onClose={() => {
              setHistoryOpen(false)
              setPreview(null)
            }}
          />
        ) : (
          sidePanel
        )}
      </div>
    </div>
  )
}
