import type { TabLockState } from '../persistence/tabLock'

interface OtherTabScreenProps {
  state: Exclude<TabLockState, 'owner'>
  onUseHere: () => void
}

/** Shown when another tab is using WorkSim, so two tabs never overwrite each other. */
export function OtherTabScreen({ state, onUseHere }: OtherTabScreenProps) {
  if (state === 'acquiring') {
    return <p className="p-8 text-slate-500">Starting GamHub WorkSim…</p>
  }

  const title =
    state === 'lost'
      ? 'WorkSim is now open in another tab'
      : 'WorkSim is already open in another tab'

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      data-testid="other-tab-screen"
    >
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-3 text-slate-600">
          To keep your work safe, WorkSim can only be used in one tab at a time. Your work
          has been saved.
        </p>
        <button
          type="button"
          onClick={onUseHere}
          disabled={state === 'taking-over'}
          className="mt-6 rounded-md bg-blue-700 px-5 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {state === 'taking-over' ? 'Switching…' : 'Use WorkSim in this tab'}
        </button>
      </div>
    </div>
  )
}
