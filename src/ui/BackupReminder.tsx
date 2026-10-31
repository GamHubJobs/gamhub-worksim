interface BackupReminderProps {
  onOpenBackup: () => void
  onSnooze: () => void
}

/** A gentle reminder when there is work that is not in any backup yet. */
export function BackupReminder({ onOpenBackup, onSnooze }: BackupReminderProps) {
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
      data-testid="backup-reminder"
    >
      <span>
        It&apos;s been a while since your last backup. A backup protects your progress if
        browser data is cleared.
      </span>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onOpenBackup}
          className="rounded-md bg-amber-600 px-3 py-1 font-medium text-white hover:bg-amber-700"
        >
          Back up now
        </button>
        <button
          type="button"
          onClick={onSnooze}
          className="rounded-md px-3 py-1 hover:bg-amber-100"
        >
          Remind me later
        </button>
      </div>
    </div>
  )
}
