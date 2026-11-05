/**
 * WorkSim AI on the laptop at home: help with the week's money, the evening
 * or morning ahead, and what to learn next. It uses the same engines and
 * settings as WorkSim AI at work: the built-in guide (WorkSim's own rules,
 * not an AI model) unless the player has turned a model on there. Every
 * answer says what wrote it, and the player sees what would be shared.
 */
import { useState } from 'react'
import { buildContext, toModelText } from '../ai/context'
import { askAi } from '../ai/service'
import { effectiveEngine, readAiSettings } from '../ai/settings'
import type { AiAnswer } from '../ai/types'
import { RichText } from '../apps/ai/RichText'
import type { ProfileData } from '../game/career'
import { sensitiveIn } from '../game/aiUse'
import { lifeContext } from '../game/lifeAdvice'

const QUICK: Array<{ action: string; label: string; question: string }> = [
  { action: 'budget', label: 'Check my budget', question: 'How is my money this week?' },
  {
    action: 'plan-day',
    label: 'Plan my evening',
    question: 'What should I do with the rest of my time today?',
  },
  {
    action: 'learn-next',
    label: 'What should I learn next?',
    question: 'What should I learn or practise next for my career?',
  },
]

interface Turn {
  question: string
  answer?: AiAnswer
  error?: string
}

export function LifeAssistant({ profile }: { profile: ProfileData }) {
  const [settings] = useState(readAiSettings)
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [warning, setWarning] = useState<string[] | null>(null)
  const [showShared, setShowShared] = useState(false)
  const usingModel = effectiveEngine(settings) !== 'builtin'
  const context = buildContext(lifeContext(profile), profile.name)

  async function ask(question: string, action?: string, confirmed = false) {
    const text = question.trim()
    if (!text || busy) return
    const sensitive = sensitiveIn(text)
    if (sensitive.length && !confirmed && usingModel) {
      setWarning(sensitive)
      return
    }
    setWarning(null)
    setDraft('')
    setBusy(true)
    setTurns((t) => [...t, { question: text }])
    try {
      const answer = await askAi(
        { messages: [{ role: 'user', text }], context, mode: settings.mode, action },
        settings,
      )
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, answer } : x)))
    } catch {
      setTurns((t) =>
        t.map((x, i) =>
          i === t.length - 1 ? { ...x, error: 'Stopped before an answer arrived.' } : x,
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div data-testid="life-ai">
      <p className="text-sm text-slate-600">
        {usingModel
          ? 'WorkSim AI is using the AI model you turned on at work. Only what is listed below is sent with each question.'
          : 'WorkSim AI is using the built-in guide: WorkSim’s own rules, working from your save. It is not an AI model, works offline and costs nothing. You can turn a model on in WorkSim AI on your work computer.'}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q.action}
            type="button"
            disabled={busy}
            onClick={() => void ask(q.question, q.action)}
            className="rounded-full border border-indigo-300 px-3 py-1 text-sm text-indigo-900 hover:bg-indigo-50 disabled:opacity-55"
          >
            {q.label}
          </button>
        ))}
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void ask(draft)
        }}
      >
        <label className="sr-only" htmlFor="life-ai-question">
          Ask WorkSim AI
        </label>
        <input
          id="life-ai-question"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about your money, your evening or your career"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="rounded-md bg-indigo-700 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-55"
        >
          Ask
        </button>
      </form>
      {warning && (
        <div
          className="mt-2 rounded-md bg-amber-50 p-2 text-sm text-amber-900"
          role="alert"
        >
          Your question seems to include {warning.join(', ')}. AI models should not be
          given personal or secret details: take them out and ask again.
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => void ask(draft, undefined, true)}
          >
            Send it anyway
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setShowShared((v) => !v)}
        aria-expanded={showShared}
        className="mt-2 text-xs text-indigo-800 underline"
      >
        {showShared ? 'Hide' : 'Show'} what WorkSim AI is given
      </button>
      {showShared && (
        <pre
          className="mt-1 max-h-40 overflow-auto rounded-md bg-slate-50 p-2 text-[11px] whitespace-pre-wrap text-slate-700"
          data-testid="life-ai-shared"
        >
          {toModelText(context)}
        </pre>
      )}
      <ol className="mt-3 space-y-3">
        {turns.map((turn, i) => (
          <li key={i} className="text-sm">
            <p className="font-medium text-slate-800">{turn.question}</p>
            {turn.answer ? (
              <article
                className="mt-1 rounded-lg bg-indigo-50/60 p-3"
                data-testid="life-ai-answer"
              >
                {turn.answer.fallback && (
                  <p className="mb-1 text-xs text-amber-800">
                    {turn.answer.fallback} The built-in guide answered instead.
                  </p>
                )}
                <RichText text={turn.answer.text} />
                <p
                  className="mt-2 text-[11px] text-slate-500"
                  data-testid="life-ai-source"
                >
                  {turn.answer.source.model
                    ? `Written by an AI model (${turn.answer.source.label}). Check the figures against your statement before you rely on it.`
                    : 'Built-in guide: WorkSim’s own rules, not an AI model.'}
                </p>
              </article>
            ) : turn.error ? (
              <p className="text-xs text-slate-500">{turn.error}</p>
            ) : (
              <p className="text-xs text-slate-500">Thinking…</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
