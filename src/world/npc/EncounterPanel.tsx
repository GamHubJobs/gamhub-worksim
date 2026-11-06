/**
 * Talking to someone (see game/encounters.ts): what they say, and what the
 * player can say back, in a small box at the side so both people stay in
 * view. Each choice gets its reply, and the conversation can go on (until
 * they need to get back to what they were doing); Esc or "Goodbye" ends it.
 * The same box in every place.
 */
import { useEffect, useRef, useState } from 'react'
import {
  meet,
  respond,
  type Line,
  type Outcome,
  type Relation,
  type Situation,
  type Who,
} from '../../game/encounters'

export function EncounterPanel({
  who,
  situation,
  relation,
  onSay,
  onClose,
  className = 'absolute right-4 bottom-20 z-20',
}: {
  who: Who
  situation: Situation
  /** How the player stands with them now (from the save, so it follows each choice). */
  relation: Relation
  onSay: (outcome: Outcome, optionId: string) => void
  onClose: () => void
  className?: string
}) {
  const [said, setSaid] = useState<{ outcome: Outcome; ids: string[] } | null>(null)
  // The situation as it was when the player came up (they have stopped for the player).
  const [start] = useState(() => meet(who, situation, relation))
  const now = said ? meet(who, { ...situation, availability: 'free' }, relation) : start
  const options = now.options.filter(
    (o) => !said?.ids.includes(o.id) && !(said && (o.id === 'rude' || o.id === 'leave')),
  )
  const box = useRef<HTMLElement>(null)
  // Esc ends the conversation, wherever the focus is (a chosen reply's button goes away).
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => {
    const before = document.activeElement
    box.current?.focus()
    return () => {
      if (before instanceof HTMLElement && before.isConnected) before.focus()
    }
  }, [])
  const lines = said ? said.outcome.lines : start.opening
  // Busy, or the conversation is over (they turned away), or nothing more to say.
  const over =
    !!said &&
    (said.outcome.memory === 'rude' ||
      said.outcome.memory === 'later' ||
      said.outcome.memory === 'leave' ||
      !!said.outcome.action)
  return (
    <section
      ref={box}
      tabIndex={-1}
      className={`${className} max-h-[calc(100%-7rem)] w-[26rem] max-w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-white p-4 shadow-2xl ring-1 ring-slate-200 outline-none`}
      role="dialog"
      aria-label={`Talking to ${who.name}`}
      data-testid="encounter"
      data-person={who.id}
    >
      <p className="font-semibold text-slate-900">{who.name}</p>
      <p className="text-xs text-slate-500">{who.role}</p>
      <div
        className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-700"
        aria-live="polite"
      >
        {lines.map((line, i) => (
          <SpokenLine key={`${said ? 'r' : 'o'}${i}`} line={line} />
        ))}
      </div>
      {said && said.outcome.notes.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="What changed">
          {said.outcome.notes.map((note) => (
            <li
              key={note}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                said.outcome.trust < 0
                  ? 'bg-amber-50 text-amber-800'
                  : 'bg-emerald-50 text-emerald-800'
              }`}
            >
              {note}
            </li>
          ))}
        </ul>
      )}
      {!over && options.length > 0 && (
        <div className="mt-3 space-y-1" role="group" aria-label="What you say">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                const outcome = respond(who, situation, relation, option.id)
                setSaid({ outcome, ids: [...(said?.ids ?? []), option.id] })
                onSay(outcome, option.id)
              }}
              className={`block w-full rounded-md border px-3 py-1.5 text-left text-sm hover:bg-blue-50 ${
                option.tone === 'rude'
                  ? 'border-amber-200 text-amber-900 hover:border-amber-300'
                  : 'border-slate-200 text-slate-800 hover:border-blue-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          {over ? 'Close' : 'Goodbye'}
        </button>
      </div>
    </section>
  )
}

function SpokenLine({ line }: { line: Line }) {
  if (!line.speaker)
    return <p className="text-slate-500 italic">{line.text.replace(/^\*|\*$/g, '')}</p>
  return (
    <p>
      <span className="font-medium text-slate-900">{line.speaker.split(' ')[0]}:</span> “
      {line.text}”
    </p>
  )
}
