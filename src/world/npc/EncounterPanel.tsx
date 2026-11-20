/**
 * Talking to someone (see game/encounters.ts): what they say, and what the
 * player can say back, in a small box at the side so both people stay in
 * view. Each choice gets its reply, and the conversation can go on (until
 * they need to get back to what they were doing); Esc or "Goodbye" ends it.
 * The same box in every place.
 */
import { useEffect, useRef, useState } from 'react'
import { useSpokenLines } from '../../audio/useSpeech'
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
  className = 'absolute right-4 bottom-20 z-20 max-h-[calc(100%-7rem)] max-w-[calc(100%-2rem)]',
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
  // The conversation so far: what they said, what the player said back, and so on.
  const [log, setLog] = useState<Array<{ you?: string; lines: Line[] }>>(() => [
    { lines: start.opening },
  ])
  // Read aloud, if chosen, in their own voice (each person keeps theirs).
  useSpokenLines(
    lines.filter((l) => l.speaker === who.name).map((l) => l.text),
    { id: who.id, personality: who.personality },
  )
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
      className={`motion-rise visible ${className} w-[26rem] overflow-y-auto rounded-xl bg-white p-4 shadow-lg ring-1 ring-slate-200 outline-none`}
      role="dialog"
      aria-label={`Talking to ${who.name}`}
      data-testid="encounter"
      data-person={who.id}
    >
      <div className="flex items-center gap-3 pr-6">
        <Avatar name={who.name} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{who.name}</p>
          <p className="truncate text-xs text-slate-500">
            {who.role} · {standingWith(relation)}
          </p>
        </div>
      </div>
      <div
        className="mt-2 max-h-64 space-y-1.5 overflow-y-auto text-sm leading-relaxed text-slate-700"
        aria-live="polite"
        data-testid="encounter-history"
      >
        {log.map((turn, t) => (
          <div
            key={t}
            className={`space-y-1.5 ${t < log.length - 1 ? 'opacity-60' : ''}`}
          >
            {turn.you && (
              <p className="rounded-lg bg-blue-50 px-2 py-1 text-right text-blue-900">
                <span className="sr-only">You: </span>
                {turn.you}
              </p>
            )}
            {turn.lines.map((line, i) => (
              <SpokenLine key={i} line={line} />
            ))}
          </div>
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
                setLog((l) => [...l, { you: option.label, lines: outcome.lines }])
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

/** Their initials in a circle of their own colour (the same each time). */
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % 360
  return (
    <span
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-inner"
      style={{ background: `hsl(${hash} 45% 38%)` }}
    >
      {initials}
    </span>
  )
}

/** How the player stands with them, in a few words. */
function standingWith(relation: Relation): string {
  if (relation.talks === 0) return 'First time you have met'
  if (relation.trust >= 70) return 'Gets on well with you'
  if (relation.trust >= 50) return 'Friendly'
  if (relation.trust >= 35) return 'A bit wary of you'
  return 'Cool towards you'
}
