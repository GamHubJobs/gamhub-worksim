/**
 * Builds the context of a request from what the open apps offer, keeping it
 * to the minimum: a size limit per item and in total, and the player's own
 * name taken out. What a model receives is exactly what the player can see in
 * the "What will be sent" preview (see toModelText).
 */
import type { AiContext, ContextItem } from './types'

/** Longest text kept from one item, and from all items together. */
export const ITEM_LIMIT = 4_000
export const TOTAL_LIMIT = 9_000

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Replaces the player's own name (and each part of it) with "the employee". */
export function redactName(text: string, playerName: string): string {
  const parts = [playerName, ...playerName.split(/\s+/)]
    .map((p) => p.trim())
    .filter((p) => p.length >= 2)
    // Longest first, so the full name goes before its parts.
    .sort((a, b) => b.length - a.length)
  return parts.reduce(
    (out, part) =>
      out.replace(new RegExp(`\\b${escapeRegExp(part)}\\b`, 'gi'), 'the employee'),
    text,
  )
}

function cut(text: string, limit: number): { text: string; removed: number } {
  if (text.length <= limit) return { text, removed: 0 }
  return {
    text: `${text.slice(0, limit).trimEnd()}\n[… ${text.length - limit} more characters not included]`,
    removed: text.length - limit,
  }
}

/**
 * The context for one request: the items in the order given (most important
 * first), each cut to ITEM_LIMIT, stopping at TOTAL_LIMIT.
 */
export function buildContext(items: ContextItem[], playerName: string): AiContext {
  const kept: ContextItem[] = []
  let total = 0
  let trimmed = 0
  for (const item of items) {
    if (!item.text.trim()) continue
    const room = Math.min(ITEM_LIMIT, TOTAL_LIMIT - total)
    const source = redactName(item.text, playerName)
    if (room <= 200) {
      trimmed += source.length
      continue
    }
    const { text, removed } = cut(source, room)
    trimmed += removed
    total += text.length
    kept.push({ ...item, label: redactName(item.label, playerName), text })
  }
  return { items: kept, trimmed }
}

/**
 * The context as plain text, exactly as a model receives it. Structured
 * `data` is never included: only the built-in guide uses it, on this device.
 */
export function toModelText(context: AiContext): string {
  if (context.items.length === 0) return ''
  return context.items.map((item) => `## ${item.label}\n${item.text}`).join('\n\n')
}

/** The item of a kind, if the context has one. */
export function itemOf(
  context: AiContext,
  kind: ContextItem['kind'],
): ContextItem | undefined {
  return context.items.find((item) => item.kind === kind)
}
