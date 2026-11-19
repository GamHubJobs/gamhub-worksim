/**
 * A live scenario as it is played (content/scenarios, game/scenarios): who is
 * speaking and what they say, then the player's part (a choice, an exhibit to
 * present, or words of their own), the cast's reaction, and at the end the
 * outcome with every answer reviewed. Beside the 3D view, like a conversation,
 * so the people in the room stay in sight.
 */
import { useState } from 'react'
import { useSpokenLines } from '../audio/useSpeech'
import type { Line, Scenario } from '../content/scenarios/types'
import { describeEffects } from '../game/scenes'
import { bandFor, beatOf, percentOf, type Run } from '../game/scenarios'
import { ScenarioAiFeedback } from './ScenarioAiFeedback'
import { ScenarioDebrief } from './ScenarioDebrief'
import { reactionRequest } from '../ai/castTalk'
import { askAi } from '../ai/service'
import { effectiveEngine, readAiSettings } from '../ai/settings'

const BAND_NAME = { excellent: 'Excellent', good: 'Good', pass: 'Pass', poor: 'Not yet' }

/** The player's choice to let the cast respond to their own words (kept on this computer). */
const REACT_KEY = 'gamhub-worksim:scenario-react'
function readReact(): boolean {
  try {
    return localStorage.getItem(REACT_KEY) === '1'
  } catch {
    return false
  }
}
function writeReact(on: boolean) {
  try {
    localStorage.setItem(REACT_KEY, on ? '1' : '0')
  } catch {
    // Storage blocked: the choice lasts until the page closes.
  }
}

/** A response in the person's own words, from the player's AI model. */
interface Reaction {
  beat: string
  who: string
  text: string | null
  source?: string
  failed?: string
}

export interface LiveState {
  id: string
  run: Run
  /** The cast's reaction to the last answer, shown line by line. */
  reply: Line[]
  step: number
}

export function ScenarioPanel({
  scenario,
  live,
  name,
  firstTime,
  onContinue,
  onChoose,
  onPresent,
  onSpeak,
  onFinish,
  onLeave,
  className = '',
}: {
  scenario: Scenario
  live: LiveState
  /** The player's first name (for {name}). */
  name: string
  /** Not played before: XP is earned this time. */
  firstTime: boolean
  onContinue: () => void
  onChoose: (optionId: string) => void
  onPresent: (exhibitId: string) => void
  onSpeak: (text: string) => void
  onFinish: () => void
  onLeave: () => void
  className?: string
}) {
  const [text, setText] = useState('')
  const settings = readAiSettings()
  const usingModel = effectiveEngine(settings) !== 'builtin'
  const [react, setReact] = useState(readReact)
  const [reaction, setReaction] = useState<Reaction | null>(null)
  /** Asks the person to respond to what was said, in character (the score is the rubric's). */
  function askReaction(beatId: string, whoId: string, prompt: string, said: string) {
    const member = scenario.cast.find((c) => c.id === whoId)
    if (!member) return
    setReaction({ beat: beatId, who: whoId, text: null })
    const request = reactionRequest(scenario, live.run, member, prompt, said)
    askAi(
      {
        messages: request.messages,
        context: { items: [{ kind: 'learning', ...request.context }], trimmed: 0 },
        mode: settings.mode,
        action: 'scenario-react',
      },
      settings,
    )
      .then((answer) =>
        setReaction((r) =>
          r?.beat !== beatId
            ? r
            : answer.fallback
              ? { ...r, failed: answer.fallback }
              : { ...r, text: answer.text, source: answer.source.label },
        ),
      )
      .catch(() =>
        setReaction((r) =>
          r?.beat === beatId ? { ...r, failed: 'Stopped before an answer arrived.' } : r,
        ),
      )
  }
  const fill = (s: string) => s.replaceAll('{name}', name)
  const cast = (id: string | undefined) => scenario.cast.find((c) => c.id === id)
  const beat = beatOf(scenario, live.run)
  const replying = live.step < live.reply.length
  // What is being said now, by whom (a reply, a line, or the question asked): read
  // aloud, if chosen in the sound settings, each of the cast in their own voice.
  const speaking: { who?: string; text: string } | null = replying
    ? live.reply[live.step]
    : beat.kind === 'say'
      ? beat
      : 'who' in beat && beat.who && 'prompt' in beat
        ? { who: beat.who, text: beat.prompt }
        : null
  useSpokenLines(
    speaking?.who ? [fill(speaking.text)] : null,
    speaking?.who ? { id: `${scenario.id}:${speaking.who}` } : null,
  )

  function said(line: Line) {
    const who = cast(line.who)
    return (
      <div data-testid="scenario-line">
        {who ? (
          <p className="text-xs font-semibold text-slate-500">
            {who.name} · <span className="font-normal">{who.role}</span>
          </p>
        ) : null}
        <p className={`mt-1 text-sm ${who ? 'text-slate-900' : 'text-slate-600 italic'}`}>
          {who ? `“${fill(line.text)}”` : fill(line.text)}
        </p>
      </div>
    )
  }

  const asker = 'who' in beat ? cast(beat.who) : undefined
  const continueButton = (
    <button
      type="button"
      onClick={onContinue}
      className="mt-3 rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
      autoFocus
    >
      Continue
    </button>
  )

  // With the player's own model on: the person asking may respond in their own words.
  const reactWho = 'who' in beat && beat.kind !== 'say' ? beat.who : undefined
  const reactToggle =
    usingModel && reactWho ? (
      <label className="mt-2 flex items-start gap-1.5 text-[11px] text-violet-900">
        <input
          type="checkbox"
          checked={react}
          onChange={(e) => {
            setReact(e.target.checked)
            writeReact(e.target.checked)
          }}
          className="mt-0.5"
        />
        <span>
          Let {asker?.name ?? 'them'} respond to what you actually say or do (sends your
          answer, without your name, to the AI model you turned on; your score is still
          set by the marking rules)
        </span>
      </label>
    ) : null
  /** Asks for a response to this answer, if the player wants one. */
  const reactTo = (answer: string) => {
    if (usingModel && react && reactWho && beat.kind !== 'end' && beat.kind !== 'say')
      askReaction(beat.id, reactWho, fill(beat.prompt), answer)
  }
  let body: React.ReactNode
  // Just said something in their own words: coaching from their own AI model, if on.
  const last = live.run.answers.at(-1)
  const lastBeat = last && scenario.beats.find((b) => b.id === last.beat)
  const spoken =
    replying && live.step === 0 && lastBeat?.kind === 'speak' && last
      ? {
          prompt: fill(lastBeat.prompt),
          answer: last.answer,
          mentions: lastBeat.mentions,
          model: fill(lastBeat.model),
          scenario: scenario.title,
        }
      : null
  if (replying) {
    body = (
      <>
        {live.step === 0 && last && reaction?.beat === last.beat && (
          <AiReaction reaction={reaction} name={cast(reaction.who)?.name ?? ''} />
        )}
        {said(live.reply[live.step])}
        {spoken && <ScenarioAiFeedback key={last!.beat} spoken={spoken} />}
        {continueButton}
      </>
    )
  } else if (beat.kind === 'say') {
    body = (
      <>
        {said(beat)}
        {continueButton}
      </>
    )
  } else if (beat.kind === 'choose') {
    body = (
      <>
        {asker && (
          <p className="text-xs font-semibold text-slate-500">
            {asker.name} · <span className="font-normal">{asker.role}</span>
          </p>
        )}
        <p className="mt-1 text-sm font-medium text-slate-900">{fill(beat.prompt)}</p>
        <div className="mt-3 space-y-2" role="group" aria-label="Your answer">
          {beat.options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                reactTo(fill(o.label))
                onChoose(o.id)
              }}
              className="block w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-800 hover:border-blue-400 hover:bg-blue-50"
            >
              {fill(o.label)}
            </button>
          ))}
        </div>
        {reactToggle}
      </>
    )
  } else if (beat.kind === 'exhibit') {
    const items = beat.items.map((id) => scenario.exhibits!.find((e) => e.id === id)!)
    body = (
      <>
        <p className="text-sm font-medium text-slate-900">{fill(beat.prompt)}</p>
        <ul className="mt-3 space-y-2" aria-label="Exhibits">
          {items.map((e) => (
            <li key={e.id} className="rounded-md border border-amber-200 bg-amber-50 p-2">
              <p className="text-xs font-semibold text-amber-950">{e.title}</p>
              <p className="mt-0.5 text-xs text-amber-900">{e.text}</p>
              <button
                type="button"
                onClick={() => {
                  reactTo(`(presents ${e.title}: ${e.text})`)
                  onPresent(e.id)
                }}
                className="mt-1.5 rounded bg-amber-700 px-2 py-1 text-xs font-medium text-white hover:bg-amber-800"
              >
                Present {e.title.split(':')[0]}
              </button>
            </li>
          ))}
        </ul>
        {reactToggle}
      </>
    )
  } else if (beat.kind === 'speak') {
    body = (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          reactTo(text)
          onSpeak(text)
          setText('')
        }}
      >
        <label
          className="block text-sm font-medium text-slate-900"
          htmlFor="scenario-speech"
        >
          {fill(beat.prompt)}
        </label>
        <textarea
          id="scenario-speech"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm"
          placeholder="Say it in your own words…"
        />
        <p className="text-[11px] text-slate-500">
          At least {beat.minWords} words.{' '}
          {text.trim().split(/\s+/).filter(Boolean).length} so far.
        </p>
        {reactToggle}
        <button
          type="submit"
          disabled={!text.trim()}
          className="mt-2 rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-40"
        >
          Say it
        </button>
      </form>
    )
  } else {
    const percent = percentOf(live.run)
    const band = bandFor(percent)
    const outcome = scenario.outcomes[band]
    body = (
      <div data-testid="scenario-result" data-band={band}>
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Outcome
        </p>
        <p className="mt-1 text-base font-semibold text-slate-900">{outcome.verdict}</p>
        <p className="mt-1 text-sm text-slate-700">“{fill(outcome.feedback)}”</p>
        <p className="mt-2 text-sm font-medium" data-testid="scenario-score">
          {percent}% · {BAND_NAME[band]}
          {firstTime
            ? ` · +${Math.round((scenario.xp * percent) / 100)} XP`
            : ' · practice (XP is earned the first time)'}
        </p>
        <ul className="mt-2 flex flex-wrap gap-1">
          {describeEffects(outcome.effects).map((n) => (
            <li
              key={n.text}
              className={`rounded px-1.5 py-0.5 text-[11px] ${n.tone === 'good' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'}`}
            >
              {n.text}
            </li>
          ))}
        </ul>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-800">
            Review your answers
          </summary>
          <ol className="mt-2 space-y-2">
            {live.run.answers.map((a) => (
              <li key={a.beat} className="rounded border border-slate-200 p-2 text-xs">
                <p className="font-medium text-slate-900">{fill(a.prompt)}</p>
                <p className="mt-0.5 text-slate-700">You: {fill(a.answer)}</p>
                <p className="mt-0.5 text-slate-500">
                  {a.earned}/{a.points}. {a.lesson}
                </p>
              </li>
            ))}
          </ol>
        </details>
        <ScenarioDebrief scenario={scenario} run={live.run} name={name} />
        <button
          type="button"
          onClick={onFinish}
          className="mt-3 rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
          autoFocus
        >
          Finish
        </button>
      </div>
    )
  }

  return (
    <section
      role="dialog"
      aria-label={scenario.title}
      data-testid="scenario"
      data-beat={beat.id}
      className={`motion-rise rounded-xl bg-white p-4 shadow-lg ring-2 ring-indigo-200 ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">
            {scenario.room}
          </p>
          <h2 className="text-base font-semibold text-slate-900">{scenario.title}</h2>
        </div>
        {beat.kind !== 'end' && (
          <button
            type="button"
            onClick={onLeave}
            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
            title="Leave: nothing is counted part way"
          >
            Leave
          </button>
        )}
      </div>
      <div className="mt-3">{body}</div>
    </section>
  )
}

function AiReaction({ reaction, name }: { reaction: Reaction; name: string }) {
  return (
    <div
      className="mb-2 rounded-md border border-violet-200 bg-violet-50 p-2"
      data-testid="scenario-ai-reaction"
    >
      <p className="text-xs font-semibold text-violet-900">{name}, in their own words</p>
      {reaction.failed ? (
        <p className="mt-1 text-xs text-violet-900/80">
          (Your AI model could not answer: {reaction.failed})
        </p>
      ) : reaction.text === null ? (
        <p className="mt-1 text-xs text-violet-900/80 italic">
          Thinking about what you said…
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-violet-950">“{reaction.text}”</p>
          <p className="mt-0.5 text-[10px] text-violet-900/70">From {reaction.source}</p>
        </>
      )}
    </div>
  )
}
