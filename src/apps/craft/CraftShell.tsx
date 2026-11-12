/**
 * The frame of an office app's window: the bar above it (the app's name, its
 * downloads, Import a file…, the WorkSim AI menu, the credit and licence) and
 * the app itself, covered while it starts and opens the file.
 */
import { useRef, type ReactNode } from 'react'
import { CraftFrame, type CraftApi } from './CraftFrame'
import { craftBase, CRAFTS, type CraftId, type Installed } from './crafts'
import type { CraftPhase } from './useCraftSession'

export interface CraftAction {
  label: string
  run: () => void
}

export function CraftShell({
  app,
  installed,
  author,
  phase,
  hidden,
  testId,
  opening,
  actions,
  importTypes,
  importLabel,
  onImport,
  ai,
  notice,
  onReady,
  onSave,
  onDirty,
  onFailed,
}: {
  app: CraftId
  installed: Installed
  author: string
  phase: CraftPhase
  hidden: boolean
  testId: string
  /** Shown while the file opens ("Opening your workbook…"). */
  opening: string
  actions: CraftAction[]
  importTypes: string
  importLabel: string
  onImport: (file: File) => void
  /** The WorkSim AI menu, when ready. */
  ai: ReactNode
  notice: string | null
  onReady: (api: CraftApi) => void
  onSave: (name: string, bytes: Uint8Array) => void
  onDirty: (dirty: boolean) => void
  onFailed: (reason: string) => void
}) {
  const importInput = useRef<HTMLInputElement>(null)
  const info = CRAFTS[app]
  return (
    <div
      className={`relative flex h-full min-h-0 flex-col ${hidden ? 'hidden' : ''}`}
      data-testid={testId}
      data-phase={phase}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
        <span className="font-medium text-slate-800">{info.title}</span>
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className="rounded px-2 py-0.5 hover:bg-slate-200"
            onClick={action.run}
            disabled={phase !== 'ready'}
          >
            {action.label}
          </button>
        ))}
        <button
          type="button"
          className="rounded px-2 py-0.5 hover:bg-slate-200"
          onClick={() => importInput.current?.click()}
          disabled={phase !== 'ready'}
        >
          Import a file…
        </button>
        <input
          ref={importInput}
          type="file"
          accept={importTypes}
          className="hidden"
          aria-label={importLabel}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) onImport(file)
          }}
        />
        {phase === 'ready' && ai}
        {notice && (
          <span role="status" className="text-slate-700">
            {notice}
          </span>
        )}
        <span className="ml-auto text-slate-400">
          {info.title} {installed.version}, based on {info.basedOn} ·{' '}
          <a
            className="underline hover:text-slate-600"
            href={`${craftBase(app)}NOTICE`}
            target="_blank"
            rel="noreferrer"
          >
            licence
          </a>
        </span>
      </div>
      <div className="relative min-h-0 flex-1">
        <CraftFrame
          app={app}
          author={author}
          onReady={onReady}
          onSave={onSave}
          onDirty={onDirty}
          onFailed={onFailed}
        />
        {phase !== 'ready' && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-white/90 text-sm text-slate-600"
            role="status"
          >
            {phase === 'starting' ? `Starting ${info.title}…` : opening}
          </div>
        )}
      </div>
    </div>
  )
}
