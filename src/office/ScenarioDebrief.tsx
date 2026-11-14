/**
 * After a scenario: talk to the people who were in it (ai/castTalk.ts). Pick
 * someone, then ask one of three questions with set answers from how it went,
 * or, with the player's own AI model on, anything at all, answered in
 * character. Nothing is sent to a model until the player asks; the score is
 * already settled and never changes.
 */
import { useEffect, useRef, useState } from 'react'
import { askAi } from '../ai/service'
import { builtinReply, castRequest, TOPICS } from '../ai/castTalk'
import { effectiveEngine, readAiSettings } from '../ai/settings'
import type { AiMessage } from '../ai/types'
import type { Scenario } from '../content/scenarios/types'
import type { Run } from '../game/scenarios'

interface Said {
  from: 'you' | 'them'
  text: string
  /** Where an answer came from, when a model wrote it (or was asked and could not). */
  source?: string
}

export function ScenarioDebrief({
  scenario,
  run,
  name,
}: {
  scenario: Scenario
  run: Run
  name: string
}) {
  const settings = readAiSettings()
  const usingModel = effectiveEngine(settings) !== 'builtin'
  const [whoId, setWhoId] = useState(scenario.cast[0].id)
  const [talks, setTalks] = useState<Record<string, Said[]>>({})
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const member = scenario.cast.find((c) => c.id === whoId)!
  const said = talks[whoId] ?? []
  const end = useRef<HTMLLIElement>(null)
  // The newest line in view (the panel scrolls).
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' })
  }, [said.length])
  const fill = (s: string) => s.replaceAll('{name}', name)
  const add = (...lines: Said[]) =>
    setTalks((t) => ({ ...t, [whoId]: [...(t[whoId] ?? []), ...lines] }))

  async function ask(question: string) {
    const history: AiMessage[] = [
      ...said.map(
        (s) =>
          ({ role: s.from === 'you' ? 'user' : 'assistant', text: s.text }) as AiMessage,
      ),
      { role: 'user', text: question },
    ]
    const request = castRequest(scenario, run, member, history)
    add({ from: 'you', text: question })
    setText('')
    setBusy(true)
    try {
      const answer = await askAi(
        {
          messages: request.messages,
          context: { items: [{ kind: 'learning', ...request.context }], trimmed: 0 },
          mode: settings.mode,
          action: 'scenario-talk',
        },
        settings,
      )
      add(
        answer.fallback
          ? {
              from: 'them',
              text: `(Your AI model could not answer: ${answer.fallback} Try one of the questions above.)`,
            }
          : { from: 'them', text: answer.text, source: answer.source.label },
      )
    } catch {
      add({ from: 'them', text: '(Stopped before an answer arrived.)' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className="mt-3" data-testid="scenario-debrief">
      <summary className="cursor-pointer text-sm font-medium text-slate-800">
        Talk to the people who were there
      </summary>
      <div className="mt-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Who to talk to">
          {scenario.cast.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={c.id === whoId}
              onClick={() => setWhoId(c.id)}
              className={`rounded-full px-2 py-0.5 text-[11px] ${c.id === whoId ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-slate-500">{member.role}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {TOPICS.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={busy}
              onClick={() =>
                add(
                  { from: 'you', text: t.question },
                  { from: 'them', text: builtinReply(scenario, run, member, t.id) },
                )
              }
              className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50"
            >
              {t.question}
            </button>
          ))}
        </div>
        {said.length > 0 && (
          <ol
            className="mt-2 max-h-48 space-y-1.5 overflow-y-auto"
            aria-label="Conversation"
          >
            {said.map((s, i) => (
              <li
                key={i}
                ref={i === said.length - 1 ? end : undefined}
                data-testid="debrief-line"
                className={`rounded p-1.5 text-xs ${s.from === 'you' ? 'bg-blue-50 text-blue-950' : 'bg-slate-50 text-slate-900'}`}
              >
                <span className="font-semibold">
                  {s.from === 'you' ? 'You' : member.name}:
                </span>{' '}
                {fill(s.text)}
                {s.source && (
                  <span className="block text-[10px] text-slate-500">
                    From {s.source}
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
        {usingModel ? (
          <form
            className="mt-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (text.trim() && !busy) void ask(text.trim())
            }}
          >
            <label className="sr-only" htmlFor="debrief-question">
              Ask {member.name} anything
            </label>
            <div className="flex gap-1">
              <input
                id="debrief-question"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Ask ${member.name} anything…`}
                className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-xs"
              />
              <button
                type="submit"
                disabled={busy || !text.trim()}
                className="rounded bg-violet-700 px-2 py-1 text-xs font-medium text-white hover:bg-violet-800 disabled:opacity-50"
              >
                {busy ? 'Asking…' : 'Ask'}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              Answered in character by the AI model you turned on in WorkSim AI. It sees
              what was said and the outcome, not your name, and does not change your
              score.
            </p>
          </form>
        ) : (
          <p className="mt-2 text-[10px] text-slate-500">
            Turn on an AI model of your own in WorkSim AI to ask them anything.
          </p>
        )}
      </div>
    </details>
  )
}
