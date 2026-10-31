interface RecoveryBannerProps {
  recoveredUnsavedChanges: boolean
  previousSessionCrashed: boolean
  onDismiss: () => void
}

/** Tells the player what happened after an unexpected shutdown. */
export function RecoveryBanner({
  recoveredUnsavedChanges,
  previousSessionCrashed,
  onDismiss,
}: RecoveryBannerProps) {
  if (!recoveredUnsavedChanges && !previousSessionCrashed) return null

  const message = recoveredUnsavedChanges
    ? 'We recovered your unsaved changes from your last session.'
    : "WorkSim didn't close normally last time. Your work had already been saved automatically, so nothing was lost."

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-4 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900"
      data-testid="recovery-banner"
    >
      <span>✓ {message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded px-2 py-0.5 font-medium hover:bg-emerald-100"
      >
        Dismiss
      </button>
    </div>
  )
}
