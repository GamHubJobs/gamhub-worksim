import { useEffect, useState } from 'react'
import { useSheetDocument } from '../apps/sheets/useSheetDocument'
import { Grid } from '../apps/sheets/ui/Grid'
import { VersionHistoryPanel } from '../apps/sheets/ui/VersionHistoryPanel'
import { formatDateTime } from '../lib/time'
import { getDeviceId } from '../persistence/db'
import type { DocumentVersion } from '../persistence/schemas'
import type { SessionStart } from '../persistence/session'
import { openWorkbenchDocument } from '../persistence/workbench'
import { RecoveryBanner } from '../ui/RecoveryBanner'
import { SaveIndicator } from '../ui/SaveIndicator'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function App({ session }: { session: SessionStart }) {
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [fatalError, setFatalError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [preview, setPreview] = useState<DocumentVersion | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  useEffect(() => {
    openWorkbenchDocument()
      .then(setDocumentId)
      .catch((error: unknown) => setFatalError(errorMessage(error)))
    getDeviceId()
      .then(setDeviceId)
      .catch(() => setDeviceId(null))
  }, [])

  const sheet = useSheetDocument(documentId)
  const { state } = sheet

  async function runAction(action: () => Promise<void>) {
    setActionError(null)
    try {
      await action()
    } catch (error) {
      setActionError(errorMessage(error))
    }
  }

  const loadError = fatalError ?? (state.status === 'error' ? state.message : null)

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-bold tracking-tight text-blue-900">
            GamHub WorkSim
          </span>
          {state.status === 'ready' && (
            <span className="text-slate-600">{state.document.title}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <SaveIndicator status={sheet.saveStatus} />
          <button
            type="button"
            onClick={() => {
              setHistoryOpen((open) => !open)
              setPreview(null)
            }}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
            aria-pressed={historyOpen}
          >
            Version history
          </button>
        </div>
      </header>

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
        <main className="min-w-0 flex-1 p-4">
          {loadError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800"
            >
              <p className="font-semibold">Your workbook could not be opened.</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{loadError}</p>
            </div>
          )}
          {!loadError && state.status === 'loading' && (
            <p className="text-slate-500">Opening your workbook…</p>
          )}
          {!loadError && state.status === 'ready' && (
            <Grid
              // Remount when switching between preview and live content, to reset editing.
              key={preview ? `preview-${preview.id}` : 'live'}
              sheet={(preview?.snapshot ?? state).content.sheets[0]}
              readOnly={preview !== null}
              onCellChange={(address, input) =>
                sheet.setCell(state.content.sheets[0].id, address, input)
              }
            />
          )}
        </main>

        {historyOpen && documentId && (
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
              setHistoryOpen(false)
              setPreview(null)
            }}
          />
        )}
      </div>

      <footer className="flex justify-between border-t border-slate-200 bg-white px-4 py-1 text-xs text-slate-400">
        <span>Development Build · Phase 0: Foundations</span>
        <span>Device {deviceId ?? '…'}</span>
      </footer>
    </div>
  )
}
