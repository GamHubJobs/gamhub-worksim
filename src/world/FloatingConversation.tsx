/**
 * Conversations float over the 3D world, on their own (not in a place's
 * drawer): at the lower left, beside the drawer when it is open and in the
 * corner when it is folded away, clear of the minimap, the needs and the
 * buttons at the bottom right. Folding the drawer away, or opening the phone
 * or the map, leaves a conversation where it is. Each one can be minimised to
 * a small button and brought back.
 *
 * GameScreen.tsx holds the layer (`ConversationLayer`); a conversation is put
 * in it with `FloatingConversation`. Without 3D (the drawer is the page), a
 * conversation simply sits in the page.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useHud } from '../ui/hud/hudContext'

const LayerContext = createContext<HTMLElement | null>(null)

/** Where the conversations go: put by GameScreen over the world. */
export function ConversationLayer({
  drawerOpen,
  children,
}: {
  drawerOpen: boolean
  children: ReactNode
}) {
  const [layer, setLayer] = useState<HTMLElement | null>(null)
  return (
    <LayerContext.Provider value={layer}>
      {children}
      <div
        ref={setLayer}
        data-testid="conversation-layer"
        data-drawer={drawerOpen ? 'open' : 'closed'}
        className="pointer-events-none absolute bottom-4 z-40 flex max-h-[calc(100%-6rem)] w-[min(26rem,calc(100%-2rem))] flex-col justify-end gap-2 transition-[left] duration-200 ease-out"
        // Beside the drawer (or over it, on a narrow screen), or in the corner.
        style={{
          left: drawerOpen ? 'max(1rem, min(25.75rem, calc(100% - 27rem)))' : '1rem',
        }}
      />
    </LayerContext.Provider>
  )
}

/** A conversation (or a moment like it), floating over the world. */
export function FloatingConversation({
  label,
  children,
}: {
  /** Who it is with, for the minimised button ("Marco Bianchi"). */
  label: string
  children: ReactNode
}) {
  const layer = useContext(LayerContext)
  const [minimised, setMinimised] = useState(false)
  // In a conversation, the "Press E" prompts and the controls help step aside.
  const hud = useHud()?.setMode
  useEffect(() => {
    hud?.('dialogue')
    return () => hud?.('explore')
  }, [hud])
  if (!layer) return <>{children}</>
  return createPortal(
    <div
      className="pointer-events-auto relative min-h-0"
      data-testid="floating-conversation"
    >
      {minimised ? (
        <button
          type="button"
          onClick={() => setMinimised(false)}
          className="motion-pop flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-lg ring-1 ring-slate-200 hover:bg-slate-50"
          aria-label={`Back to the conversation with ${label}`}
        >
          <span aria-hidden className="h-2 w-2 rounded-full bg-emerald-500" />
          {label}
        </button>
      ) : null}
      {/* (Kept while minimised, hidden: where it had got to is not lost.) */}
      <div className={minimised ? 'hidden' : 'relative flex max-h-full min-h-0 flex-col'}>
        <button
          type="button"
          onClick={() => setMinimised(true)}
          aria-label={`Minimise the conversation with ${label}`}
          title="Minimise"
          className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <span aria-hidden className="block h-0.5 w-3 bg-current" />
        </button>
        {children}
      </div>
    </div>,
    layer,
  )
}
