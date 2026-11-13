/** PC Shelf: every built computer in the stockroom, with its name and build. */
import { BUTTON, CARD, Pill, PRIMARY, type SectionProps } from './kit'
import { BUILD_NAMES } from './deployment'
import { shelfUnits, STATUS_NAMES } from './model'
import type { Asset } from './schema'

function UnitArt({ type }: { type: Asset['type'] }) {
  if (type === 'laptop')
    return (
      <svg viewBox="0 0 64 44" className="h-14 w-20" aria-hidden>
        <rect x="10" y="4" width="44" height="28" rx="2" className="fill-slate-700" />
        <rect x="13" y="7" width="38" height="22" className="fill-sky-200" />
        <path d="M4 34h56l-4 6H8z" className="fill-slate-500" />
      </svg>
    )
  return (
    <svg viewBox="0 0 64 44" className="h-14 w-20" aria-hidden>
      <rect x="22" y="2" width="20" height="40" rx="2" className="fill-slate-700" />
      <circle cx="32" cy="10" r="2" className="fill-teal-300" />
      <rect x="26" y="16" width="12" height="2" className="fill-slate-500" />
      <rect x="26" y="21" width="12" height="2" className="fill-slate-500" />
    </svg>
  )
}

export default function Shelf(p: SectionProps) {
  const units = shelfUnits(p.state)
  const shippable = units.filter((u) => u.status !== 'needs-image')
  return (
    <div className="space-y-4 p-4" data-testid="pc-shelf">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">PC Shelf</h2>
        <p className="text-sm text-slate-600">
          Built computers in the stockroom. The build under each one decides who it can go
          to. Returned machines come back here and must be re-imaged before they go out
          again.
        </p>
      </header>
      {units.length === 0 ? (
        <div className={`${CARD} text-sm text-slate-700`}>
          <p>The shelf is empty. Build a machine before a ticket needs one.</p>
          <button
            type="button"
            className={`${PRIMARY} mt-3`}
            onClick={() => p.open('deployment')}
          >
            Open Computer Deployment
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 rounded-xl border-b-8 border-amber-800 bg-amber-50/60 p-4 sm:grid-cols-3 xl:grid-cols-5">
          {units.map((u) => (
            <li
              key={u.tag}
              className="flex flex-col items-center rounded-lg bg-white p-3 text-center shadow-sm"
              data-testid="shelf-unit"
              data-tag={u.tag}
            >
              <p className="font-mono text-sm font-semibold text-slate-900">
                {u.hostname ?? u.tag}
              </p>
              <UnitArt type={u.type} />
              <p className="text-xs text-slate-700">
                {u.build ? BUILD_NAMES[u.build] : 'No build'}
              </p>
              <p className="text-[11px] text-slate-500">
                {u.tag} · {u.type}
              </p>
              <span className="mt-1">
                <Pill
                  tone={
                    u.status === 'ready'
                      ? 'green'
                      : u.status === 'needs-image'
                        ? 'red'
                        : 'amber'
                  }
                >
                  {STATUS_NAMES[u.status]}
                </Pill>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-700">
          {units.length} on the shelf · {shippable.length} can be sent ·{' '}
          {units.filter((u) => u.status === 'ready').length} registered and ready to check
          out
        </span>
        <button type="button" className={BUTTON} onClick={() => p.open('assets')}>
          Open Asset Management
        </button>
        <button type="button" className={BUTTON} onClick={() => p.open('ship')}>
          Open Ship Manager
        </button>
        <button type="button" className={BUTTON} onClick={() => p.open('deployment')}>
          Open Computer Deployment
        </button>
      </div>
    </div>
  )
}
