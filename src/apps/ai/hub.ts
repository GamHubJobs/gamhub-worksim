/**
 * How the apps talk to WorkSim AI: they offer what is relevant right now
 * (the selected cells, the open document's text) with useAiContext, and send
 * a question from a button in their own window ("Explain this formula") with
 * useAskAi. An app can also accept a change WorkSim AI proposes (a formula
 * for a cell, rewritten text), which is applied only when the player presses
 * Apply. The Desktop provides the hub; WorkSim AI reads it when asked.
 */
import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import type { ContextItem, Proposal } from '../../ai/types'

/** A question sent to WorkSim AI from inside another app. */
export interface AiQuestion {
  text: string
  /** A named action the built-in guide understands ("summarise", "explain-formula"…). */
  action?: string
  /** Context for this question only (otherwise the app's offered context is used). */
  items?: ContextItem[]
}

/** Applies a proposed change; returns false if it no longer fits (e.g. read-only). */
export type ApplyProposal = (proposal: Proposal) => boolean

export interface AiHub {
  /**
   * The app (window key) offers its context, read only when WorkSim AI needs
   * it (so typing does not redraw the desktop), or withdraws it (null).
   */
  offer: (app: string, items: (() => ContextItem[]) | null) => void
  /** The app accepts proposed changes of these kinds, or stops (null). */
  accept: (
    app: string,
    apply: { kinds: Proposal['kind'][]; apply: ApplyProposal } | null,
  ) => void
  ask: (from: string, question: AiQuestion) => void
}

export const AiHubContext = createContext<AiHub | null>(null)

/**
 * Offers context to WorkSim AI while this app is open. `items` is called
 * when WorkSim AI needs it, so it always reads the app's latest state; pass
 * null to offer nothing.
 */
export function useAiContext(app: string, items: (() => ContextItem[]) | null) {
  const hub = useContext(AiHubContext)
  const latest = useRef(items)
  useEffect(() => {
    latest.current = items
  })
  const offering = items !== null
  useEffect(() => {
    if (!hub || !offering) return
    hub.offer(app, () => latest.current?.() ?? [])
    return () => hub.offer(app, null)
  }, [hub, app, offering])
}

/**
 * Lets WorkSim AI propose changes of these kinds to this app. The latest
 * `apply` is always used, so it can read the app's current state.
 */
export function useAiApply(
  app: string,
  kinds: Proposal['kind'][] | null,
  apply: ApplyProposal,
) {
  const hub = useContext(AiHubContext)
  const latest = useRef(apply)
  useEffect(() => {
    latest.current = apply
  })
  const key = kinds?.join(',') ?? ''
  useEffect(() => {
    if (!hub || !key) return
    hub.accept(app, {
      kinds: key.split(',') as Proposal['kind'][],
      apply: (proposal) => latest.current(proposal),
    })
    return () => hub.accept(app, null)
  }, [hub, app, key])
}

/** Sends a question to WorkSim AI (opening it), or null outside the desktop. */
export function useAskAi(app: string): ((question: AiQuestion) => void) | null {
  const hub = useContext(AiHubContext)
  return useMemo(
    () => (hub ? (question: AiQuestion) => hub.ask(app, question) : null),
    [hub, app],
  )
}
