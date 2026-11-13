/** The extensions marketplace: simulated, nothing is downloaded. */
import { useState } from 'react'
import { EXTENSIONS } from '../../../game/code/ide'

export function Extensions({
  installed,
  canEdit,
  onToggle,
}: {
  installed: string[]
  canEdit: boolean
  onToggle: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const shown = EXTENSIONS.filter((e) =>
    `${e.name} ${e.description}`.toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <div className="flex h-full flex-col text-sm text-slate-200" data-testid="extensions">
      <h2 className="px-3 py-2 text-[11px] font-semibold tracking-wide text-slate-300 uppercase">
        Extensions
      </h2>
      <div className="px-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search extensions"
          aria-label="Search extensions"
          className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-[13px] text-white"
        />
        <p className="mt-1 text-[11px] text-slate-300">
          A simulated marketplace: installing switches on a feature of this editor.
          Nothing is downloaded.
        </p>
      </div>
      <ul className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
        {shown.map((e) => {
          const on = installed.includes(e.id)
          return (
            <li key={e.id} className="rounded border border-slate-700 p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{e.name}</p>
                  <p className="text-[11px] text-slate-300">{e.publisher}</p>
                </div>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => onToggle(e.id)}
                  aria-label={`${on ? 'Uninstall' : 'Install'} ${e.name}`}
                  className={`shrink-0 rounded px-2 py-0.5 text-xs text-white disabled:opacity-40 ${
                    on ? 'bg-slate-600 hover:bg-slate-500' : 'bg-sky-700 hover:bg-sky-600'
                  }`}
                >
                  {on ? 'Uninstall' : 'Install'}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-200">{e.description}</p>
              <p className="mt-0.5 text-[11px] text-slate-300">{e.effect}</p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
