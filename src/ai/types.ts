/**
 * The shared language of WorkSim AI: what a request carries, what an answer
 * says about where it came from, and what every engine must provide.
 */

/** How much the assistant explains (not how much work it does for the player). */
export type AiMode = 'learning' | 'professional' | 'expert'

export const AI_MODES: Array<{ id: AiMode; name: string; summary: string }> = [
  {
    id: 'learning',
    name: 'Learning',
    summary:
      'Explains concepts, gives hints and small steps, and leaves the work to you.',
  },
  {
    id: 'professional',
    name: 'Professional',
    summary:
      'Practical workplace guidance, efficient approaches, and reviews of your work.',
  },
  {
    id: 'expert',
    name: 'Expert',
    summary: 'Advanced explanations and trade-offs, so you can make the decision.',
  },
]

/** Which engine answers. */
export type EngineId = 'builtin' | 'local' | 'bridge'

export interface AiMessage {
  role: 'user' | 'assistant'
  text: string
}

/**
 * One piece of context an app offers for a request: what the player is
 * working on. Kept small; see context.ts for the limits.
 */
export interface ContextItem {
  /** What kind of thing it is, for the built-in guide and the prompt. */
  kind:
    | 'career'
    | 'app'
    | 'assignment'
    | 'email'
    | 'cells'
    | 'formula'
    | 'document'
    | 'selection'
    | 'slides'
    | 'code'
    | 'tests'
    | 'ticket'
    | 'case'
  /** A short label shown to the player, e.g. "Email: Your first task". */
  label: string
  /** The content itself (plain text). */
  text: string
  /** Structured details the built-in guide can use (never sent to a model). */
  data?: Record<string, unknown>
}

/** Everything one request carries, after trimming (see context.ts). */
export interface AiContext {
  items: ContextItem[]
  /** Characters removed to stay within the limit. */
  trimmed: number
}

export interface AiRequest {
  /** The conversation so far, ending with the player's message. */
  messages: AiMessage[]
  context: AiContext
  mode: AiMode
  /** A named action from an app ("summarise", "explain-formula"…), if any. */
  action?: string
}

/** Where an answer came from: shown with every answer. */
export interface AnswerSource {
  engine: EngineId
  /** e.g. "Built-in guide", "Ollama · llama3.2", "Anthropic · claude-haiku-5-5". */
  label: string
  /** True only when a real AI model wrote the answer. */
  model: boolean
}

export interface AiAnswer {
  text: string
  source: AnswerSource
  /**
   * When another engine was asked for but could not answer, why (shown to the
   * player). The answer then comes from the built-in guide.
   */
  fallback?: string
  /**
   * A change the player can review and apply (e.g. a formula for a cell, a
   * rewritten paragraph). Never applied automatically.
   */
  proposal?: Proposal
}

export type Proposal =
  { kind: 'formula'; cell: string; formula: string } | { kind: 'text'; text: string }

export interface Availability {
  ready: boolean
  /** Shown when not ready, in plain words. */
  reason?: string
}

/** What every engine provides. */
export interface Engine {
  id: EngineId
  answer(request: AiRequest, signal: AbortSignal): Promise<AiAnswer>
  check(signal: AbortSignal): Promise<Availability>
}

/** Raised by engines; the message is shown to the player. */
export class EngineError extends Error {
  readonly code: 'offline' | 'unavailable' | 'timeout' | 'limit' | 'refused' | 'bad-reply'

  constructor(message: string, code: EngineError['code']) {
    super(message)
    this.name = 'EngineError'
    this.code = code
  }
}
