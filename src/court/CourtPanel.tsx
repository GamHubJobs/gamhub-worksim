/**
 * At court: where the player is, what to do next (security, signing in with
 * the usher, the cause list, the hearing, the way back to the office), as
 * buttons that do the same as walking up to each thing and pressing E.
 */
import type { Scenario } from '../content/scenarios/types'
import { COURT_NAME, COURT_TRAVEL } from '../game/court'

/** The visit so far: through security, signed in, and what was last said or read. */
export interface CourtVisit {
  security: boolean
  signedIn: boolean
  note: string | null
}

export function CourtPanel({
  visit,
  room,
  hearings,
  records,
  live,
  blocked,
  onDo,
}: {
  visit: CourtVisit
  room: string | null
  hearings: Scenario[]
  /** Best score so far for each hearing, if played. */
  records: Record<string, number | null>
  /** A hearing is being played. */
  live: boolean
  blocked: (action: string) => string | null
  onDo: (action: string) => void
}) {
  const next = !visit.security
    ? 'Go through security: put your bag through the scanner and walk through the arch.'
    : !visit.signedIn
      ? 'Sign in with the usher at the desk, so the court knows you are here.'
      : 'Go into Court 2 and take your place at the claimant’s table.'
  const things: Array<{ action: string; label: string; done?: boolean }> = [
    { action: 'court:security', label: 'Go through security', done: visit.security },
    { action: 'court:usher', label: 'Sign in with the usher', done: visit.signedIn },
    { action: 'court:list', label: 'Read the cause list' },
    ...hearings.map((sc) => ({
      action: `scenario:${sc.id}`,
      label: `Take your place: ${sc.title.replace(/^At court: /, '')}`,
    })),
  ]
  return (
    <section
      className="max-h-full w-full overflow-y-auto rounded-xl bg-white/90 p-4 shadow-lg ring-1 ring-slate-200 backdrop-blur"
      aria-label="At court"
      data-testid="court-panel"
    >
      <p className="text-xs font-medium tracking-wide text-blue-700 uppercase">
        You are at
      </p>
      <h1 className="text-lg font-semibold text-slate-900">{COURT_NAME}</h1>
      {room && (
        <p className="text-sm font-medium text-slate-700" data-testid="court-room">
          Now in: {room}
        </p>
      )}
      <p className="mt-1 text-sm text-slate-600">
        {live ? 'Your hearing is under way.' : next}
      </p>
      {visit.note && (
        <p
          className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-950"
          data-testid="court-note"
        >
          {visit.note}
        </p>
      )}
      {!live && (
        <ul className="mt-3 space-y-1.5">
          {things.map((th) => {
            const why = blocked(th.action)
            const best = th.action.startsWith('scenario:')
              ? records[th.action.slice('scenario:'.length)]
              : null
            return (
              <li key={th.action}>
                <button
                  type="button"
                  onClick={() => onDo(th.action)}
                  disabled={!!why}
                  title={why ?? undefined}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-left text-sm text-slate-800 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
                >
                  {th.done ? '✓ ' : ''}
                  {th.label}
                  {best != null ? ` (best so far: ${best}%)` : ''}
                </button>
                {why && <p className="mt-0.5 text-[11px] text-slate-500">{why}</p>}
              </li>
            )
          })}
          <li>
            <button
              type="button"
              onClick={() => onDo('court:leave')}
              className="w-full rounded-md bg-slate-800 px-3 py-1.5 text-left text-sm font-medium text-white hover:bg-slate-700"
            >
              Leave and go back to the office ({COURT_TRAVEL} min)
            </button>
          </li>
        </ul>
      )}
    </section>
  )
}
