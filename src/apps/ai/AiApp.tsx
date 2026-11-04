/**
 * WorkSim AI: the assistant on the work computer. A conversation, with the
 * player's work as context (shown on the right, each item can be left out),
 * three assistance modes, and an honest label on every answer saying what
 * wrote it: the built-in guide (not an AI model) or a named model.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { buildContext, redactName, toModelText } from '../../ai/context'
import { PROVIDER_NAMES } from '../../ai/engines'
import { askAi } from '../../ai/service'
import {
  effectiveEngine,
  readAiSettings,
  writeAiSettings,
  type AiSettings,
} from '../../ai/settings'
import {
  AI_MODES,
  type AiAnswer,
  type AiMessage,
  type ContextItem,
  type Proposal,
} from '../../ai/types'
import { Icon } from '../../ui/Icon'
import { AiSettingsPanel } from './AiSettingsPanel'
import { reviewPrompt, sensitiveIn, type AiEvent } from '../../game/aiUse'
import type { AiQuestion } from './hub'
import { RichText } from './RichText'

interface Turn {
  id: number
  question: string
  answer?: AiAnswer
  error?: string
  /** What was shared with this question (labels only, for the record). */
  shared: string[]
  /** The app the question was about, which may accept a proposed change. */
  from: string | null
  /** What became of a proposed change. */
  outcome?: 'applied' | 'dismissed' | 'failed'
  /** Prompt tips for the player's own question (Learning mode). */
  tips?: string[]
  /** The player marked the AI-model answer as checked. */
  checked?: boolean
}

/** Conversations last while WorkSim is open (they are not saved). */
const conversations = new Map<string, Turn[]>()

function engineName(settings: AiSettings): string {
  switch (effectiveEngine(settings)) {
    case 'local':
      return `Local model${settings.local.model ? ` · ${settings.local.model}` : ''}`
    case 'bridge':
      return `${PROVIDER_NAMES[settings.bridge.provider]} via the bridge`
    default:
      return 'Built-in guide'
  }
}

function suggestions(items: ContextItem[]): Array<{ text: string; action?: string }> {
  const kinds = new Set(items.map((i) => i.kind))
  return [
    ...(kinds.has('assignment') || kinds.has('case')
      ? [{ text: 'How should I approach this task?', action: 'approach' }]
      : []),
    ...(kinds.has('email')
      ? [
          { text: 'Summarise this email', action: 'summarise' },
          { text: 'What does this email ask me to do?', action: 'action-items' },
          { text: 'Help me reply to this email', action: 'reply' },
        ]
      : []),
    ...(kinds.has('formula')
      ? [{ text: 'Explain this formula', action: 'explain-formula' }]
      : []),
    ...(kinds.has('document') || kinds.has('selection')
      ? [{ text: 'Review my writing', action: 'review' }]
      : []),
    { text: 'How do I write a good prompt?', action: 'prompting' },
  ].slice(0, 5)
}

export function AiApp({
  profileId,
  playerName,
  readContext,
  question,
  onQuestionTaken,
  workApp,
  canApply,
  onApply,
  onRecord,
}: {
  profileId: string
  playerName: string
  /** What the player is working on, most relevant first (read when drawn). */
  readContext: () => ContextItem[]
  /** A question sent from another app, to ask straight away. */
  question: (AiQuestion & { id: number; from: string }) | null
  onQuestionTaken: (id: number) => void
  /** The window the player was working in (where proposed changes go). */
  workApp: string | null
  canApply: (app: string, kind: Proposal['kind']) => boolean
  onApply: (app: string, proposal: Proposal) => boolean
  /** Records evidence of how the player uses AI (see game/aiUse.ts). */
  onRecord: (event: AiEvent) => void
}) {
  const context = readContext()
  const [settings, setSettings] = useState<AiSettings>(readAiSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [turns, setTurns] = useState<Turn[]>(() => conversations.get(profileId) ?? [])
  const [draft, setDraft] = useState('')
  const [left, setLeft] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<AbortController | null>(null)
  const [preview, setPreview] = useState(false)
  const [warning, setWarning] = useState<{
    text: string
    kinds: string[]
    action?: string
    items: ContextItem[]
    from: string | null
  } | null>(null)
  const end = useRef<HTMLDivElement>(null)
  const nextId = useRef(turns.length + 1)

  useEffect(() => {
    conversations.set(profileId, turns)
    end.current?.scrollIntoView({ block: 'end' })
  }, [profileId, turns])

  const usingModel = effectiveEngine(settings) !== 'builtin'
  const shared = useMemo(
    () => context.filter((item) => !left.has(item.label)),
    [context, left],
  )

  function updateSettings(next: AiSettings) {
    setSettings(next)
    writeAiSettings(next)
  }

  async function ask(
    text: string,
    action?: string,
    items: ContextItem[] = shared,
    from: string | null = workApp,
    confirmed = false,
  ) {
    const question = text.trim()
    if (!question || busy) return
    // Personal or secret information: a pause to take it out first.
    const sensitive = sensitiveIn(question)
    if (sensitive.length && !confirmed) {
      setWarning({ text: question, kinds: sensitive, action, items, from })
      return
    }
    const id = nextId.current++
    const built = buildContext(items, playerName)
    // Only the player's own words are scored (menu questions are WorkSim's).
    const typed = action === undefined
    const review = reviewPrompt(question, built.items.length)
    onRecord({
      kind: 'question',
      score: review.score,
      model: usingModel,
      learning: settings.mode === 'learning',
      typed,
    })
    setTurns((t) => [
      ...t,
      {
        id,
        question,
        shared: built.items.map((i) => i.label),
        from,
        tips:
          typed && settings.mode === 'learning' && review.score <= 2
            ? review.tips.slice(0, 2)
            : undefined,
      },
    ])
    setDraft('')
    const history: AiMessage[] = turns
      .filter((t) => t.answer)
      .slice(-6)
      .flatMap((t) => [
        { role: 'user' as const, text: t.question },
        { role: 'assistant' as const, text: t.answer!.text },
      ])
    const controller = new AbortController()
    setBusy(controller)
    try {
      const answer = await askAi(
        {
          messages: [...history, { role: 'user', text: question }],
          context: built,
          mode: settings.mode,
          action,
        },
        settings,
        { signal: controller.signal },
      )
      setTurns((t) => t.map((turn) => (turn.id === id ? { ...turn, answer } : turn)))
    } catch {
      setTurns((t) =>
        t.map((turn) =>
          turn.id === id ? { ...turn, error: 'Stopped before an answer arrived.' } : turn,
        ),
      )
    } finally {
      setBusy(null)
    }
  }

  // A question sent from another app's "Ask WorkSim AI" button.
  const askRef = useRef(ask)
  useEffect(() => {
    askRef.current = ask
  })
  // Each question is asked once, even if this runs twice (as React does in development).
  const taken = useRef(new Set<number>())
  useEffect(() => {
    if (!question || busy || taken.current.has(question.id)) return
    taken.current.add(question.id)
    onQuestionTaken(question.id)
    void askRef.current(
      question.text,
      question.action,
      question.items ?? shared,
      question.from,
    )
  }, [question, busy, onQuestionTaken, shared])

  if (showSettings)
    return (
      <AiSettingsPanel
        settings={settings}
        onChange={updateSettings}
        onClose={() => setShowSettings(false)}
      />
    )

  return (
    <div className="flex h-full min-h-0 bg-[#f7f8fa]" data-testid="ai-app">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header: mode and engine */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
          <div
            role="radiogroup"
            aria-label="Assistance mode"
            className="flex border border-slate-300"
          >
            {AI_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                role="radio"
                aria-checked={settings.mode === mode.id}
                title={mode.summary}
                onClick={() => updateSettings({ ...settings, mode: mode.id })}
                className={`px-3 py-1 text-xs ${
                  settings.mode === mode.id
                    ? 'bg-[#1f6fbf] text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {mode.name}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">
            {AI_MODES.find((m) => m.id === settings.mode)?.summary}
          </span>
          <span
            className="ml-auto flex items-center gap-2 text-xs text-slate-600"
            data-testid="ai-engine"
          >
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${usingModel ? 'bg-emerald-500' : 'bg-slate-400'}`}
            />
            {engineName(settings)}
            {!usingModel && <span className="text-slate-400">(not an AI model)</span>}
          </span>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="border border-slate-300 bg-white px-2.5 py-1 text-xs hover:bg-slate-50"
          >
            Settings
          </button>
          {turns.length > 0 && (
            <button
              type="button"
              onClick={() => setTurns([])}
              className="border border-slate-300 bg-white px-2.5 py-1 text-xs hover:bg-slate-50"
            >
              New conversation
            </button>
          )}
        </div>

        {/* Conversation */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
          {turns.length === 0 ? (
            <div className="mx-auto mt-6 max-w-xl text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-[#3b5bdb] text-white">
                <Icon name="ai" className="h-6 w-6" />
              </span>
              <h2 className="mt-3 text-lg font-semibold text-slate-900">
                How can I help with your work?
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                I can see what you are working on (listed on the right). Ask in your own
                words, or start with one of these:
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {suggestions(shared).map((s) => (
                  <button
                    key={s.text}
                    type="button"
                    onClick={() => void ask(s.text, s.action)}
                    className="border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-[#1f6fbf] hover:text-[#1f6fbf]"
                  >
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ol className="mx-auto max-w-3xl space-y-4" aria-label="Conversation">
              {turns.map((turn) => (
                <li key={turn.id} className="space-y-2" data-testid="ai-turn">
                  <div className="ml-auto w-fit max-w-[85%] rounded-lg bg-[#dbeafe] px-3 py-2 text-sm text-slate-900">
                    {turn.question}
                  </div>
                  {turn.tips && (
                    <aside
                      className="ml-auto w-fit max-w-[85%] border-l-2 border-[#3b5bdb] bg-white px-3 py-1.5 text-xs text-slate-600"
                      aria-label="Prompt tip"
                      data-testid="ai-prompt-tip"
                    >
                      <span className="font-semibold text-slate-700">Prompt tip: </span>
                      {turn.tips.join(' ')}
                    </aside>
                  )}
                  {turn.answer ? (
                    <article
                      className="max-w-[92%] rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
                      data-testid="ai-answer"
                    >
                      {turn.answer.fallback && (
                        <p className="mb-2 border-l-2 border-amber-400 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                          {turn.answer.fallback} The built-in guide answered instead.
                        </p>
                      )}
                      <RichText text={turn.answer.text} />
                      {turn.answer.proposal &&
                        turn.from &&
                        canApply(turn.from, turn.answer.proposal.kind) && (
                          <ProposalCard
                            proposal={turn.answer.proposal}
                            outcome={turn.outcome}
                            onApply={() => {
                              const ok = onApply(turn.from!, turn.answer!.proposal!)
                              if (ok) onRecord({ kind: 'proposal', outcome: 'applied' })
                              setTurns((t) =>
                                t.map((x) =>
                                  x.id === turn.id
                                    ? { ...x, outcome: ok ? 'applied' : 'failed' }
                                    : x,
                                ),
                              )
                            }}
                            onDismiss={() => {
                              onRecord({ kind: 'proposal', outcome: 'dismissed' })
                              setTurns((t) =>
                                t.map((x) =>
                                  x.id === turn.id ? { ...x, outcome: 'dismissed' } : x,
                                ),
                              )
                            }}
                          />
                        )}
                      <p
                        className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-500"
                        data-testid="ai-source"
                      >
                        {turn.answer.source.model
                          ? `Written by an AI model (${turn.answer.source.label}). Check facts and figures before you use it.`
                          : 'Built-in guide: WorkSim’s own rules, not an AI model.'}
                        {turn.shared.length > 0 && ` Shared: ${turn.shared.join(', ')}.`}
                      </p>
                      {turn.answer.source.model &&
                        (turn.checked ? (
                          <p className="mt-1 text-[11px] font-medium text-emerald-700">
                            You checked this answer.
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onRecord({ kind: 'verified' })
                              setTurns((t) =>
                                t.map((x) =>
                                  x.id === turn.id ? { ...x, checked: true } : x,
                                ),
                              )
                            }}
                            className="mt-1 text-[11px] text-[#1f6fbf] underline"
                          >
                            I have checked this answer against the facts
                          </button>
                        ))}
                    </article>
                  ) : turn.error ? (
                    <p className="text-xs text-slate-500">{turn.error}</p>
                  ) : (
                    <p
                      role="status"
                      className="flex items-center gap-2 text-xs text-slate-500"
                    >
                      <span
                        className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1f6fbf]"
                        aria-hidden
                      />
                      {usingModel
                        ? `Waiting for ${engineName(settings)}…`
                        : 'Working it out…'}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
          <div ref={end} />
        </div>

        {warning && (
          <div
            role="alertdialog"
            aria-label="Personal or secret information"
            className="border-t border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            data-testid="ai-privacy-warning"
          >
            <p>
              Your question seems to include{' '}
              <strong>{warning.kinds.join(' and ')}</strong>. Leave personal and secret
              information out of AI tools unless it is really needed, even approved ones
              {usingModel ? ': this question would be sent to the AI model.' : '.'}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onRecord({ kind: 'privacy', heeded: true })
                  setDraft(warning.text)
                  setWarning(null)
                }}
                className="bg-[#1f6fbf] px-3 py-1 text-xs font-medium text-white hover:bg-[#185a9d]"
              >
                Edit my question
              </button>
              <button
                type="button"
                onClick={() => {
                  onRecord({ kind: 'privacy', heeded: false })
                  const w = warning
                  setWarning(null)
                  void ask(w.text, w.action, w.items, w.from, true)
                }}
                className="border border-amber-400 bg-white px-3 py-1 text-xs hover:bg-amber-100"
              >
                Send anyway
              </button>
            </div>
          </div>
        )}

        {/* Composer */}
        <form
          className="border-t border-slate-200 bg-white p-3"
          onSubmit={(event) => {
            event.preventDefault()
            void ask(draft)
          }}
        >
          <div className="flex items-end gap-2">
            <label className="sr-only" htmlFor="ai-question">
              Your question
            </label>
            <textarea
              id="ai-question"
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void ask(draft)
                }
              }}
              placeholder="Ask about your work… (Enter to send, Shift+Enter for a new line)"
              className="min-h-[2.5rem] flex-1 resize-none border border-slate-300 px-3 py-2 text-sm focus:border-[#1f6fbf] focus:outline-none"
            />
            {busy ? (
              <button
                type="button"
                onClick={() => busy.abort()}
                className="border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!draft.trim()}
                className="bg-[#1f6fbf] px-4 py-2 text-sm font-medium text-white hover:bg-[#185a9d] disabled:opacity-50"
              >
                Send
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            {usingModel
              ? 'Your question and the ticked context are sent to the model; your name is taken out.'
              : 'Nothing leaves this computer. Turn on an AI model in Settings for open questions.'}
            {usingModel && (
              <>
                {' '}
                <button
                  type="button"
                  className="text-[#1f6fbf] underline"
                  onClick={() => setPreview((p) => !p)}
                  aria-expanded={preview}
                >
                  {preview ? 'Hide' : 'Show'} what will be sent
                </button>
              </>
            )}
          </p>
          {preview && usingModel && (
            <pre
              className="mt-2 max-h-40 overflow-auto border border-slate-200 bg-slate-50 p-2 text-[11px] whitespace-pre-wrap text-slate-700"
              data-testid="ai-preview"
            >
              {toModelText(buildContext(shared, playerName)) ||
                '(no context: only your question)'}
            </pre>
          )}
        </form>
      </div>

      {/* Context */}
      <aside
        className="hidden w-64 shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-3 md:block"
        aria-label="Context"
        data-testid="ai-context"
      >
        <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Context
        </h3>
        <p className="mt-1 text-[11px] text-slate-500">
          What WorkSim AI knows about your work for the next question. Untick anything you
          do not want to share.
        </p>
        <ul className="mt-3 space-y-2">
          {context.map((item) => (
            <li key={item.label} className="border border-slate-200 p-2">
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={!left.has(item.label)}
                  onChange={(e) =>
                    setLeft((l) => {
                      const next = new Set(l)
                      if (e.target.checked) next.delete(item.label)
                      else next.add(item.label)
                      return next
                    })
                  }
                />
                <span className="min-w-0">
                  <span className="block font-medium text-slate-800">
                    {redactName(item.label, playerName)}
                  </span>
                  <span className="line-clamp-3 text-slate-500">
                    {redactName(item.text, playerName)}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}

/** A change WorkSim AI proposes: shown in full, applied only when the player says so. */
function ProposalCard({
  proposal,
  outcome,
  onApply,
  onDismiss,
}: {
  proposal: Proposal
  outcome: Turn['outcome']
  onApply: () => void
  onDismiss: () => void
}) {
  return (
    <section
      className="mt-3 border border-[#3b5bdb]/40 bg-[#f5f7ff] p-3"
      aria-label="Proposed change"
      data-testid="ai-proposal"
    >
      <p className="text-xs font-semibold text-slate-700">
        {proposal.kind === 'formula'
          ? `Proposed formula for cell ${proposal.cell}`
          : 'Proposed text, to replace the original'}
      </p>
      <pre className="mt-1.5 max-h-48 overflow-auto bg-white p-2 font-mono text-xs whitespace-pre-wrap text-slate-800">
        {proposal.kind === 'formula' ? proposal.formula : proposal.text}
      </pre>
      {outcome ? (
        <p role="status" className="mt-2 text-xs text-slate-600">
          {outcome === 'applied'
            ? 'Applied. Check the result, and undo it there if it is not right.'
            : outcome === 'dismissed'
              ? 'Not applied.'
              : 'It could not be applied (the app may have moved on or be read-only).'}
        </p>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onApply}
            className="bg-[#1f6fbf] px-3 py-1 text-xs font-medium text-white hover:bg-[#185a9d]"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="border border-slate-300 bg-white px-3 py-1 text-xs hover:bg-slate-50"
          >
            Dismiss
          </button>
          <span className="text-[11px] text-slate-500">
            Review it first: you are responsible for it.
          </span>
        </div>
      )}
    </section>
  )
}
