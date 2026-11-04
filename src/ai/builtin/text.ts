/**
 * Plain-text tools for the built-in guide: sentences, a short extractive
 * summary, the action items in a message, and writing feedback. Simple and
 * deterministic, and honest about being so.
 */

export function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"‘'(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

const GREETING = /^(hi|hello|dear|good (morning|afternoon|evening)|hey)\b/i
const SIGN_OFF = /^(thanks|thank you|kind regards|best|regards|cheers|many thanks)\b/i

/** The opening sentence of each paragraph, skipping greetings and sign-offs. */
export function summarise(text: string, limit = 3): string[] {
  const picked: string[] = []
  for (const paragraph of paragraphs(text)) {
    const first = sentences(paragraph).find(
      (s) => !GREETING.test(s) && !SIGN_OFF.test(s) && s.split(' ').length > 3,
    )
    if (first) picked.push(first)
    if (picked.length >= limit) break
  }
  return picked
}

const REQUEST =
  /\b(please|could you|can you|would you|i need you to|you need to|make sure|remember to|don[’']t forget|let me know|send|reply|check|prepare|update)\b/i
const WHEN =
  /\b(today|tomorrow|by (monday|tuesday|wednesday|thursday|friday|the end of|end of|[0-9])|this (morning|afternoon|week)|asap|deadline|before)\b/i

/** Sentences and list items that ask for something, with any timing spotted. */
export function actionItems(text: string): Array<{ text: string; when: string | null }> {
  const lines = text.split('\n').map((l) => l.trim())
  const listed = lines
    .filter((l) => /^([-*•]|\d+[.)])\s+/.test(l))
    .map((l) => l.replace(/^([-*•]|\d+[.)])\s+/, ''))
  const asked = sentences(text.replace(/^([-*•]|\d+[.)])\s+.*$/gm, '')).filter(
    (s) => REQUEST.test(s) && !SIGN_OFF.test(s),
  )
  const items = [...asked, ...listed]
  const seen = new Set<string>()
  return items
    .filter((item) => {
      const key = item.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 8)
    .map((item) => ({ text: item, when: item.match(WHEN)?.[0] ?? null }))
}

const INFORMAL = /\b(gonna|wanna|stuff|kinda|sorta|hey|yeah|ok|lol|asap)\b|!{2,}/i
const PASSIVE = /\b(was|were|is|are|been|being)\s+\w+ed\b/i

export interface WritingReview {
  words: number
  sentences: number
  longSentences: string[]
  passive: number
  informal: string[]
}

export function reviewWriting(text: string): WritingReview {
  const all = sentences(text)
  return {
    words: text.split(/\s+/).filter(Boolean).length,
    sentences: all.length,
    longSentences: all.filter((s) => s.split(' ').length > 30),
    passive: all.filter((s) => PASSIVE.test(s)).length,
    informal: all.filter((s) => INFORMAL.test(s)),
  }
}
