/**
 * Coaching on what the player said in a scenario, from the AI model they
 * turned on themselves in WorkSim AI (a local model, or their own key through
 * the bridge). Offered only when a model is on: the built-in guide does not
 * pretend to judge free text. It never changes the score, which the rubric
 * sets, so outcomes stay fair and repeatable. Nothing is sent until the
 * player asks, and they see what is sent.
 */
import { useState } from 'react'
import { askAi } from '../ai/service'
import { effectiveEngine, readAiSettings } from '../ai/settings'
import type { AiAnswer } from '../ai/types'
import { feedbackRequest, type SpokenAnswer } from '../ai/scenarioFeedback'

export function ScenarioAiFeedback({ spoken }: { spoken: SpokenAnswer }) {
  const settings = readAiSettings()
  const usingModel = effectiveEngine(settings) !== 'builtin'
  const [answer, setAnswer] = useState<AiAnswer | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  if (!usingModel) return null
  const request = feedbackRequest(spoken)

  async function ask() {
    setBusy(true)
    setFailed(false)
    try {
      setAnswer(
        await askAi(
          {
            messages: [{ role: 'user', text: request.text }],
            context: { items: [{ kind: 'learning', ...request.context }], trimmed: 0 },
            mode: settings.mode,
            action: 'scenario-feedback',
          },
          settings,
        ),
      )
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="mt-3 rounded-md border border-violet-200 bg-violet-50 p-2"
      data-testid="scenario-ai"
    >
      {!answer ? (
        <>
          <button
            type="button"
            onClick={() => void ask()}
            disabled={busy}
            className="rounded bg-violet-700 px-2 py-1 text-xs font-medium text-white hover:bg-violet-800 disabled:opacity-50"
          >
            {busy
              ? 'Asking your AI model…'
              : 'Ask your AI model for coaching on what you said'}
          </button>
          <p className="mt-1 text-[11px] text-violet-900/80">
            Sends your answer, the question and the points a strong answer covers to the
            model you turned on in WorkSim AI. It does not change your score.
          </p>
          {failed && (
            <p className="mt-1 text-xs text-rose-700">
              Stopped before an answer arrived.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-xs whitespace-pre-line text-violet-950">{answer.text}</p>
          <p className="mt-1 text-[10px] text-violet-900/70">
            From {answer.source.label}
            {answer.fallback ? ` (${answer.fallback})` : ''}
          </p>
        </>
      )}
    </div>
  )
}
