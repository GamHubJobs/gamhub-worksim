/**
 * A story scene (see game/story/): what someone says to the player during a
 * mission, on walking up to them, and the player's choice, with their reply.
 * At the side, like any conversation, so both people stay in view.
 */
import { useEffect, useRef, useState } from 'react'
import type { Scene } from '../../game/story/types'

export function StoryScenePanel({
  scene,
  name,
  mission,
  lines,
  onChoose,
  onClose,
  className = 'absolute right-4 bottom-20 z-20',
}: {
  scene: Scene
  /** The speaker's name. */
  name: string
  /** The mission it is part of. */
  mission: string
  /** What they say (filled in for this player). */
  lines: string[]
  onChoose: (choiceId: string) => void
  onClose: () => void
  className?: string
}) {
  const [chosen, setChosen] = useState<string | null>(null)
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })
  const box = useRef<HTMLElement>(null)
  useEffect(() => {
    const before = document.activeElement
    box.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (before instanceof HTMLElement && before.isConnected) before.focus()
    }
  }, [])
  const choice = scene.choices.find((c) => c.id === chosen)
  const first = name.split(' ')[0]
  const shown = choice ? choice.reply : lines
  return (
    <section
      ref={box}
      tabIndex={-1}
      role="dialog"
      aria-label={`${mission}: ${name}`}
      data-testid="story-scene"
      data-scene={scene.id}
      className={`${className} max-h-[calc(100%-7rem)] w-[28rem] max-w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-white p-4 shadow-2xl ring-2 ring-rose-200 outline-none`}
    >
      <p className="text-xs font-semibold tracking-wide text-rose-700 uppercase">
        {mission}
      </p>
      <p className="font-semibold text-slate-900">{name}</p>
      <div
        className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-700"
        aria-live="polite"
      >
        {choice && <p className="text-slate-500">You: {choice.label}.</p>}
        {shown.map((line, i) =>
          line.startsWith('*') && line.endsWith('*') ? (
            <p key={i} className="text-slate-500 italic">
              {line.slice(1, -1)}
            </p>
          ) : (
            <p key={i}>
              <span className="font-medium text-slate-900">{first}:</span> “{line}”
            </p>
          ),
        )}
      </div>
      {!choice ? (
        <div className="mt-3 space-y-1" role="group" aria-label="What you say">
          {scene.choices.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setChosen(c.id)
                onChoose(c.id)
              }}
              className="block w-full rounded-md border border-slate-200 px-3 py-1.5 text-left text-sm text-slate-800 hover:border-rose-300 hover:bg-rose-50"
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-rose-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-800"
          >
            Carry on
          </button>
        </div>
      )}
    </section>
  )
}
