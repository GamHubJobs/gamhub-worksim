import { offlineSupported, repairAppFiles } from '../app/pwa'
import {
  listSafetyCopies,
  restoreSafetyCopy,
  restoreWithSafetyCopy,
} from '../persistence/safety'
import type { SafetyCopy } from '../persistence/db'

/** The largest file accepted as a backup (backups are normally a few MB). */
export const MAX_BACKUP_BYTES = 250 * 1024 * 1024
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { downloadTextFile } from '../lib/download'
import { formatDateTime, formatTimeAgo } from '../lib/time'
import {
  BackupError,
  exportBackup,
  readBackupFile,
  type BackupPreview,
  type BackupStatus,
} from '../persistence/backup'
import { backfillPortfolio } from '../persistence/portfolioBackfill'
import { formatBytes, type StorageHealth } from '../persistence/storageHealth'

interface StoragePanelProps {
  health: StorageHealth | null
  backupStatus: BackupStatus | null
  /** Saves pending changes before a backup is made. */
  beforeBackup: () => Promise<boolean>
  onBackupDone: () => void
  onClose: () => void
}

function errorMessage(error: unknown): string {
  if (error instanceof BackupError) return error.message
  return `Something went wrong: ${error instanceof Error ? error.message : String(error)}`
}

/** Shows how safe the player's data is, and lets them download or restore a backup. */
export function StoragePanel({
  health,
  backupStatus,
  beforeBackup,
  onBackupDone,
  onClose,
}: StoragePanelProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<BackupPreview | null>(null)
  const [rebuilt, setRebuilt] = useState<number | null>(null)
  const [copies, setCopies] = useState<Array<Omit<SafetyCopy, 'data'>>>([])
  const [puttingBack, setPuttingBack] = useState<string | null>(null)
  useEffect(() => {
    listSafetyCopies()
      .then(setCopies)
      .catch(() => setCopies([]))
  }, [])
  const fileInput = useRef<HTMLInputElement>(null)
  const dialog = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dialog.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  async function downloadBackup() {
    if (!(await beforeBackup())) {
      throw new Error(
        'Your latest changes could not be saved yet. Please try again shortly.',
      )
    }
    const { fileName, text } = await exportBackup()
    downloadTextFile(fileName, text)
    onBackupDone()
  }

  async function rebuildPortfolio() {
    setRebuilt(await backfillPortfolio())
  }

  async function chooseFile(file: File) {
    // A real backup is a few megabytes; a huge file is not one, and reading it
    // could make the browser run out of memory.
    if (file.size > MAX_BACKUP_BYTES)
      throw new Error(
        `This file is too large to be a GamHub WorkSim backup (${formatBytes(file.size)}).`,
      )
    setPreview(await readBackupFile(await file.text()))
  }

  async function confirmImport(chosen: BackupPreview) {
    // Safety first: download a backup of the current data before replacing it.
    await beforeBackup()
    const safety = await exportBackup()
    downloadTextFile(
      safety.fileName.replace('backup-', 'backup-before-restore-'),
      safety.text,
    )
    // …and keep a safety copy on this device, so the restore can be undone here.
    await restoreWithSafetyCopy(chosen)
    window.location.reload()
  }

  async function putBack(id: string) {
    await restoreSafetyCopy(id)
    window.location.reload()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="storage-panel-title"
        tabIndex={-1}
        className="w-full max-w-lg rounded-xl bg-white shadow-xl outline-none"
        data-testid="storage-panel"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="storage-panel-title" className="text-lg font-semibold">
            Storage &amp; backup
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <section className="space-y-3 px-5 py-4">
          <h3 className="font-medium">How your work is stored</h3>
          <p className="text-sm text-slate-600">
            WorkSim saves your work automatically in this browser on this computer. It
            does not leave your device.
          </p>
          <ul className="space-y-2 text-sm">
            <ProtectionLine health={health} />
            {health?.usageBytes != null && health.quotaBytes != null && (
              <StatusLine tone="neutral">
                Using {formatBytes(health.usageBytes)} of {formatBytes(health.quotaBytes)}{' '}
                available.
              </StatusLine>
            )}
            {health?.lowSpace && (
              <StatusLine tone="warning">
                Your device is almost out of space for WorkSim. Free up disk space and
                download a backup.
              </StatusLine>
            )}
            {health?.restrictedQuota && (
              <StatusLine tone="warning">
                Very little storage is available. If this is a private or incognito
                window, your work will be deleted when you close it.
              </StatusLine>
            )}
            <StatusLine tone="warning">
              Clearing this browser&apos;s data for this site, or using a different
              browser or computer, means your progress is not there. Keep a backup.
            </StatusLine>
          </ul>
        </section>

        <section className="space-y-3 border-t border-slate-200 px-5 py-4">
          <h3 className="font-medium">Backup</h3>
          <p className="text-sm text-slate-600" data-testid="last-backup">
            {backupStatus?.lastBackupAt
              ? `Last backup: ${formatDateTime(backupStatus.lastBackupAt)} (${formatTimeAgo(
                  backupStatus.lastBackupAt,
                )})`
              : 'You have not downloaded a backup on this device yet.'}
          </p>

          {!preview && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => run(downloadBackup)}
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
              >
                Download backup
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
              >
                Restore from backup…
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".json,application/json"
                className="hidden"
                data-testid="backup-file-input"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (file) void run(() => chooseFile(file))
                }}
              />
            </div>
          )}

          {preview && (
            <div
              className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm"
              data-testid="backup-preview"
            >
              <p className="font-medium text-amber-900">Restore this backup?</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900">
                <li>Saved on {formatDateTime(preview.exportedAt)}</li>
                <li>
                  {preview.documentTitles.length} workbook
                  {preview.documentTitles.length === 1 ? '' : 's'}
                  {preview.documentTitles.length > 0 &&
                    `: ${preview.documentTitles.join(', ')}`}
                </li>
                <li>{preview.counts.documentVersions ?? 0} saved versions</li>
                <li>{preview.counts.portfolioItems ?? 0} portfolio items</li>
                {preview.skippedCount > 0 && (
                  <li>{preview.skippedCount} damaged items will be skipped</li>
                )}
              </ul>
              <p className="mt-3 text-amber-900">
                This <strong>replaces everything</strong> currently in WorkSim on this
                device. A backup of your current data will be downloaded first, just in
                case.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => confirmImport(preview))}
                  className="rounded-md bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  Replace my data with this backup
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPreview(null)}
                  className="rounded-md px-4 py-2 hover:bg-amber-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2 border-t border-slate-200 pt-3">
            <h3 className="font-medium">Portfolio</h3>
            <p className="text-sm text-slate-600">
              Your portfolio is made from the work you passed. If something you passed is
              missing, this adds it from your saved submissions. It never changes or
              removes what is already there.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(rebuildPortfolio)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
            >
              Rebuild portfolio
            </button>
            {rebuilt !== null && (
              <p className="text-sm text-slate-700" role="status" data-testid="rebuilt">
                {rebuilt === 0
                  ? 'Your portfolio was already complete.'
                  : `Added ${rebuilt} item${rebuilt === 1 ? '' : 's'} to your portfolio.`}
              </p>
            )}
          </div>

          <div
            className="space-y-2 border-t border-slate-200 pt-3"
            data-testid="safety-copies"
          >
            <h3 className="font-medium">Safety copies</h3>
            <p className="text-sm text-slate-600">
              Before a backup is restored, or saves are upgraded to a new format, WorkSim
              keeps a copy of all your data as it was, on this device. They are kept in
              the same browser storage, so download backups too.
            </p>
            {copies.length === 0 ? (
              <p className="text-sm text-slate-600">There are no safety copies yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {copies.map((copy) => (
                  <li key={copy.id} className="flex flex-wrap items-center gap-3">
                    <span>
                      {copy.reason} · {formatDateTime(copy.createdAt)}
                    </span>
                    {puttingBack === copy.id ? (
                      <>
                        <span className="text-amber-900">
                          Replace all current data with this copy?
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void run(() => putBack(copy.id))}
                          className="rounded-md bg-amber-600 px-3 py-1 font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                        >
                          Put it back
                        </button>
                        <button
                          type="button"
                          onClick={() => setPuttingBack(null)}
                          className="rounded-md px-3 py-1 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setPuttingBack(copy.id)}
                        className="rounded-md border border-slate-300 px-3 py-1 font-medium hover:bg-slate-50 disabled:opacity-60"
                      >
                        Put back…
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-3">
            <h3 className="font-medium">App files</h3>
            <p className="text-sm text-slate-600">
              {offlineSupported()
                ? 'WorkSim keeps a copy of its own files so it can start offline. If it behaves strangely after an update, repairing downloads them again. Your saved work is not affected.'
                : 'This browser cannot keep WorkSim’s files for offline use, so WorkSim needs an internet connection to start. Your saved work is still kept on this device.'}
            </p>
            {offlineSupported() && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(repairAppFiles)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
              >
                Repair app files
              </button>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

function ProtectionLine({ health }: { health: StorageHealth | null }) {
  if (!health) return <StatusLine tone="neutral">Checking storage…</StatusLine>
  if (health.persisted === true) {
    return (
      <StatusLine tone="good">
        Protected: your browser has agreed not to delete WorkSim&apos;s data to free up
        space.
      </StatusLine>
    )
  }
  if (health.persisted === false) {
    return (
      <StatusLine tone="neutral">
        Not yet protected: if your disk gets very full, the browser may delete
        WorkSim&apos;s data. Browsers usually protect sites you use regularly or install.
      </StatusLine>
    )
  }
  return (
    <StatusLine tone="neutral">
      This browser does not say whether it protects WorkSim&apos;s data.
    </StatusLine>
  )
}

function StatusLine({
  tone,
  children,
}: {
  tone: 'good' | 'neutral' | 'warning'
  children: ReactNode
}) {
  const icon = { good: '✓', neutral: '•', warning: '!' }[tone]
  const color = {
    good: 'text-emerald-800',
    neutral: 'text-slate-700',
    warning: 'text-amber-800',
  }[tone]
  return (
    <li className={`flex gap-2 ${color}`}>
      <span aria-hidden="true" className="w-4 shrink-0 text-center font-bold">
        {icon}
      </span>
      <span>{children}</span>
    </li>
  )
}
