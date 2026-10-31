import { useEffect, useState } from 'react'
import { formatDateTime } from '../../../lib/time'
import type { DocumentVersion, VersionReason } from '../../../persistence/schemas'
import { listVersions } from '../../../persistence/versions'
import { countFilledCells } from '../model'

const REASON_LABELS: Record<VersionReason, string> = {
  auto: 'Automatic',
  close: 'When you left',
  'before-restore': 'Before a restore',
  manual: 'Saved by you',
}

interface VersionHistoryPanelProps {
  documentId: string
  /** Changes whenever versions were added or changed, to reload the list. */
  revision: number
  previewVersionId: string | null
  onPreview: (version: DocumentVersion) => void
  onToggleKeep: (version: DocumentVersion) => void
  onKeepCurrent: () => void
  onClose: () => void
}

export function VersionHistoryPanel({
  documentId,
  revision,
  previewVersionId,
  onPreview,
  onToggleKeep,
  onKeepCurrent,
  onClose,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<DocumentVersion[] | null>(null)

  useEffect(() => {
    let active = true
    listVersions(documentId).then((list) => {
      if (active) setVersions(list)
    })
    return () => {
      active = false
    }
  }, [documentId, revision])

  return (
    <aside
      className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-white"
      aria-label="Version history"
      data-testid="version-history"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold">Version history</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-0.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          Close
        </button>
      </div>

      <div className="border-b border-slate-200 p-4">
        <button
          type="button"
          onClick={onKeepCurrent}
          className="w-full rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
        >
          ★ Keep a copy of the current version
        </button>
        <p className="mt-2 text-xs text-slate-500">
          Versions are also saved automatically while you work. The newest 20 automatic
          versions are kept; starred versions are kept forever.
        </p>
      </div>

      <ol className="min-h-0 flex-1 overflow-y-auto">
        {versions === null && <li className="p-4 text-sm text-slate-500">Loading…</li>}
        {versions?.length === 0 && (
          <li className="p-4 text-sm text-slate-500">
            No versions yet. One will be saved automatically after a few minutes of work.
          </li>
        )}
        {versions?.map((version) => {
          const isPreviewed = version.id === previewVersionId
          return (
            <li
              key={version.id}
              className={`flex items-start gap-2 border-b border-slate-100 px-4 py-3 ${
                isPreviewed ? 'bg-amber-50' : ''
              }`}
              data-testid="version-item"
            >
              <button
                type="button"
                onClick={() => onPreview(version)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="text-sm font-medium">
                  {formatDateTime(version.createdAt)}
                </div>
                <div className="text-xs text-slate-500">
                  {REASON_LABELS[version.reason]} ·{' '}
                  {countFilledCells(version.snapshot.content)} filled cells
                </div>
              </button>
              <button
                type="button"
                onClick={() => onToggleKeep(version)}
                aria-label={
                  version.keep ? 'Stop keeping this version' : 'Keep this version'
                }
                title={version.keep ? 'Kept forever (click to unstar)' : 'Keep forever'}
                className={`rounded px-1.5 text-lg leading-none ${
                  version.keep ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'
                }`}
              >
                ★
              </button>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
