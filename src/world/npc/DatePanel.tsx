/**
 * A date, played (see game/dates.ts): they greet the player, the two of them
 * sit down (the player does it in 3D: dinner at the café, the bench in the
 * park), then three rounds of what to say or ask, each with its answer, and
 * how the evening went. At the side, so both people stay in view.
 */
import { useEffect, useRef, useState } from 'react'
import type { Adult } from '../../content/adults'
import { dateChoices, dateMoment, type DateMoment } from '../../game/dates'
import type { Who } from '../../game/encounters'
import { ask, type Bond } from '../../game/romance'
import { startMoment } from './moment'

export type DateStep = 'greet' | 'talk'

export function DatePanel({
  who,
  adult,
  bond,
  step,
  place,
  day,
  onSit,
  onFinish,
  onGoodnight,
  onClose,
  className = 'fixed right-4 bottom-4 z-40',
}: {
  who: Who
  adult: Adult
  bond: Bond
  step: DateStep
  place: 'cafe' | 'park'
  day: number
  /** Sit down together (the activity in 3D). */
  onSit: () => void
  /** The date is over: how it went, and the bond after it. */
  onFinish: (score: number, bond: Bond) => string
  /** Saying goodnight: a kiss (if they said yes to one), a hug (if they would like one), or a wave. */
  onGoodnight: (kind: 'kiss' | 'hug' | 'wave') => void
  onClose: () => void
  className?: string
}) {
  const n = who.name.split(' ')[0]
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [now, setNow] = useState<Bond>(bond)
  const [last, setLast] = useState<DateMoment | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [kissed, setKissed] = useState(false)
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })
  const box = useRef<HTMLElement>(null)
  useEffect(() => {
    box.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  function finish(total: number, b: Bond) {
    setSummary(onFinish(total, b))
  }
  return (
    <section
      ref={box}
      tabIndex={-1}
      role="dialog"
      aria-label={`A date with ${who.name}`}
      data-testid="date"
      className={`visible ${className} w-[26rem] max-w-[calc(100%-2rem)] rounded-xl bg-white p-4 shadow-2xl ring-2 ring-pink-200 outline-none`}
    >
      <p className="text-xs font-semibold tracking-wide text-pink-700 uppercase">
        A date · {place === 'park' ? 'the park' : 'Kettle & Crumb'}
      </p>
      <p className="font-semibold text-slate-900">{who.name}</p>
      <div className="mt-2 space-y-1.5 text-sm text-slate-700" aria-live="polite">
        {summary ? (
          <>
            {last?.lines.map((l, i) => (
              <p key={i} className={l.startsWith('*') ? 'text-slate-500 italic' : ''}>
                {l.replace(/^\*|\*$/g, '')}
              </p>
            ))}
            <p data-testid="date-summary" className="font-medium text-slate-900">
              {summary}
            </p>
          </>
        ) : step === 'greet' ? (
          <>
            <p className="text-slate-500 italic">{n} sees you and waves you over.</p>
            <p>
              <span className="font-medium text-slate-900">{n}:</span> “You came! Hi.”
            </p>
          </>
        ) : last ? (
          last.lines.map((l, i) =>
            l.startsWith('*') ? (
              <p key={i} className="text-slate-500 italic">
                {l.replace(/^\*|\*$/g, '')}
              </p>
            ) : (
              <p key={i}>{l}</p>
            ),
          )
        ) : (
          <p className="text-slate-500 italic">
            You sit together. {n} smiles across at you.
          </p>
        )}
      </div>
      <div className="mt-3 space-y-1" role="group" aria-label="What you do">
        {summary ? (
          <button
            type="button"
            onClick={() =>
              onGoodnight(
                kissed
                  ? 'kiss'
                  : ask(adult, now, 'hug', {
                        day,
                        public: place === 'cafe',
                        colleague: false,
                      }).answer === 'yes'
                    ? 'hug'
                    : 'wave',
              )
            }
            className="w-full rounded-md bg-pink-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-pink-800"
          >
            Say goodnight
          </button>
        ) : step === 'greet' ? (
          <>
            <button
              type="button"
              onClick={onSit}
              className="block w-full rounded-md border border-pink-200 px-3 py-1.5 text-left text-sm hover:bg-pink-50"
            >
              {place === 'park'
                ? `Sit on the bench with ${n}`
                : `Sit down with ${n} for dinner`}
            </button>
            <button
              type="button"
              onClick={() => finish(0, now)}
              className="block w-full rounded-md border border-slate-200 px-3 py-1.5 text-left text-sm hover:bg-slate-50"
            >
              Apologise: you cannot stay after all
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-slate-500">
              {round < 3 ? `Round ${round + 1} of 3` : 'The evening is ending'}
            </p>
            {dateChoices(adult, now, round).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  if (c.id === 'end' || round >= 3) {
                    finish(score, now)
                    return
                  }
                  const m = dateMoment(adult, who, now, c.id, {
                    day,
                    public: place === 'cafe',
                  })
                  // Holding hands (only after a yes), for the rest of the date.
                  if (c.id === 'hold-hands' && m.answer?.answer === 'yes')
                    startMoment({ kind: 'hands', with: who.id, place, seconds: 3600 })
                  if (c.id === 'kiss' && m.answer?.answer === 'yes') setKissed(true)
                  setLast(m)
                  setNow(m.bond)
                  setScore(score + m.score)
                  if (round + 1 >= 3) finish(score + m.score, m.bond)
                  else setRound(round + 1)
                }}
                className="block w-full rounded-md border border-slate-200 px-3 py-1.5 text-left text-sm hover:border-pink-300 hover:bg-pink-50"
              >
                {c.label}
              </button>
            ))}
          </>
        )}
      </div>
    </section>
  )
}
