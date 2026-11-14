/**
 * A live scenario as it is played (content/scenarios, game/scenarios): who is
 * speaking and what they say, then the player's part (a choice, an exhibit to
 * present, or words of their own), the cast's reaction, and at the end the
 * outcome with every answer reviewed. Beside the 3D view, like a conversation,
 * so the people in the room stay in sight.
 */
import { useState } from 'react'
import type { Line, Scenario } from '../content/scenarios/types'
import { describeEffects } from '../game/scenes'
import { bandFor, beatOf, percentOf, type Run } from '../game/scenarios'

const BAND_NAME = { excellent: 'Excellent', good: 'Good', pass: 'Pass', poor: 'Not yet' }

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
  const fill = (s: string) => s.replaceAll('{name}', name)
  const cast = (id: string | undefined) => scenario.cast.find((c) => c.id === id)
  const beat = beatOf(scenario, live.run)
  const replying = live.step < live.reply.length

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

  let body: React.ReactNode
  if (replying) {
    body = (
      <>
        {said(live.reply[live.step])}
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
              onClick={() => onChoose(o.id)}
              className="block w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-800 hover:border-blue-400 hover:bg-blue-50"
            >
              {fill(o.label)}
            </button>
          ))}
        </div>
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
                onClick={() => onPresent(e.id)}
                className="mt-1.5 rounded bg-amber-700 px-2 py-1 text-xs font-medium text-white hover:bg-amber-800"
              >
                Present {e.title.split(':')[0]}
              </button>
            </li>
          ))}
        </ul>
      </>
    )
  } else if (beat.kind === 'speak') {
    body = (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
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
      className={`rounded-xl bg-white p-4 shadow-lg ring-2 ring-indigo-200 ${className}`}
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
