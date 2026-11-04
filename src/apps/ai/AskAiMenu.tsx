/**
 * The "WorkSim AI" button in an app's toolbar: a short menu of what the
 * assistant can do with what is open there. Choosing one opens WorkSim AI
 * with the question asked. Hidden where WorkSim AI is not available (for
 * example, a file shown in the Portfolio).
 */
import { useEffect, useRef, useState } from 'react'
import type { ContextItem } from '../../ai/types'
import { Icon } from '../../ui/Icon'
import { useAskAi } from './hub'

export interface AskAiAction {
  /** Shown in the menu; also the question asked unless `question` is given. */
  label: string
  question?: string
  action?: string
  /** Context for this question only; read when chosen. */
  items?: () => ContextItem[]
  disabled?: boolean
}

export function AskAiMenu({
  app,
  actions,
  compact = false,
}: {
  app: string
  actions: AskAiAction[]
  /** Icon only, for crowded toolbars. */
  compact?: boolean
}) {
  const ask = useAskAi(app)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  if (!ask) return null
  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="WorkSim AI"
        title="Ask WorkSim AI about this"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm text-slate-700 hover:border-[#3b5bdb] hover:text-[#3b5bdb]"
      >
        <Icon name="ai" className="h-4 w-4 text-[#3b5bdb]" />
        {!compact && <span>WorkSim AI</span>}
        <span aria-hidden className="text-xs">
          ▾
        </span>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="WorkSim AI"
          className="absolute right-0 z-30 mt-1 w-64 border border-slate-200 bg-white py-1 text-sm shadow-lg"
        >
          {actions.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false)
                ask({
                  text: item.question ?? item.label,
                  action: item.action,
                  items: item.items?.(),
                })
              }}
              className="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
            >
              {item.label}
            </button>
          ))}
          <p className="border-t border-slate-100 px-3 pt-1.5 pb-1 text-[11px] text-slate-500">
            Opens WorkSim AI. You see the answer before anything changes.
          </p>
        </div>
      )}
    </div>
  )
}
