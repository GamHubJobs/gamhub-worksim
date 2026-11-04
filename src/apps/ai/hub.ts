/**
 * How the apps talk to WorkSim AI: they offer what is relevant right now
 * (the selected cells, the open document's text) with useAiContext, and send
 * a question from a button in their own window ("Explain this formula") with
 * useAskAi. The Desktop provides the hub; WorkSim AI reads it when asked.
 */
import { createContext, useContext, useEffect, useMemo } from 'react'
import type { ContextItem } from '../../ai/types'

/** A question sent to WorkSim AI from inside another app. */
export interface AiQuestion {
  text: string
  /** A named action the built-in guide understands ("summarise", "explain-formula"…). */
  action?: string
  /** Context for this question only (otherwise the app's offered context is used). */
  items?: ContextItem[]
}

export interface AiHub {
  /** The app (window key) offers this context, or withdraws it (null). */
  offer: (app: string, items: ContextItem[] | null) => void
  ask: (from: string, question: AiQuestion) => void
}

export const AiHubContext = createContext<AiHub | null>(null)

/** Offers context to WorkSim AI while this app is open; items should be memoised. */
export function useAiContext(app: string, items: ContextItem[] | null) {
  const hub = useContext(AiHubContext)
  useEffect(() => {
    if (!hub) return
    hub.offer(app, items)
    return () => hub.offer(app, null)
  }, [hub, app, items])
}

/** Sends a question to WorkSim AI (opening it), or null outside the desktop. */
export function useAskAi(app: string): ((question: AiQuestion) => void) | null {
  const hub = useContext(AiHubContext)
  return useMemo(
    () => (hub ? (question: AiQuestion) => hub.ask(app, question) : null),
    [hub, app],
  )
}
