/**
 * The wedding, played (see game/family.ts and city/scene/interiors/Wedding.tsx):
 * the player walks up to their partner under the arch, says their vows (their
 * own words, chosen), the "I do", the kiss (after a yes, as always), the first
 * dance, and then celebrating with everyone.
 */
import { useEffect, useRef, useState } from 'react'
import type { Who } from '../../game/encounters'

type Step = 'arrive' | 'vows' | 'married' | 'danced'

const VOWS = [
  'Promise to always talk things through, even the hard things',
  'Promise to make them laugh, every single day',
  'Promise to be there, whatever happens',
]

export function WeddingPanel({
  who,
  onVows,
  onKiss,
  onDance,
  onClose,
}: {
  who: Who
  /** Married: the vows said, "I do". */
  onVows: () => void
  /** The kiss (asked; their answer, true for yes). */
  onKiss: () => boolean
  onDance: () => void
  onClose: () => void
}) {
  const n = who.name.split(' ')[0]
  const [step, setStep] = useState<Step>('arrive')
  const [vow, setVow] = useState<string | null>(null)
  const box = useRef<HTMLElement>(null)
  useEffect(() => {
    box.current?.focus()
  }, [])
  const button =
    'block w-full rounded-md border border-pink-200 px-3 py-1.5 text-left text-sm hover:bg-pink-50'
  return (
    <section
      ref={box}
      tabIndex={-1}
      role="dialog"
      aria-label={`Your wedding with ${who.name}`}
      data-testid="wedding"
      className="visible fixed right-4 bottom-4 z-40 w-[26rem] max-w-[calc(100%-2rem)] rounded-xl bg-white p-4 shadow-2xl ring-2 ring-pink-200 outline-none"
    >
      <p className="text-xs font-semibold tracking-wide text-pink-700 uppercase">
        Your wedding · the park
      </p>
      <p className="font-semibold text-slate-900">{who.name}</p>
      <div className="mt-2 space-y-1.5 text-sm text-slate-700" aria-live="polite">
        {step === 'arrive' && (
          <p className="text-slate-500 italic">
            Everyone turns as you walk up the aisle. {n} is waiting under the arch,
            smiling.
          </p>
        )}
        {step === 'vows' && (
          <p className="text-slate-500 italic">Your turn. What do you promise?</p>
        )}
        {(step === 'married' || step === 'danced') && vow && (
          <>
            <p>You: “I {vow.toLowerCase()}.”</p>
            <p>
              <span className="font-medium text-slate-900">{n}:</span> “I do. I really,
              really do.”
            </p>
            <p className="font-medium text-slate-900" data-testid="married">
              You are married.
            </p>
          </>
        )}
        {step === 'danced' && (
          <p className="text-slate-500 italic">
            The first dance; everyone joins in after.
          </p>
        )}
      </div>
      <div className="mt-3 space-y-1" role="group" aria-label="What you do">
        {step === 'arrive' && (
          <button type="button" className={button} onClick={() => setStep('vows')}>
            Say your vows
          </button>
        )}
        {step === 'vows' &&
          VOWS.map((v) => (
            <button
              key={v}
              type="button"
              className={button}
              onClick={() => {
                setVow(v)
                setStep('married')
                onVows()
              }}
            >
              {v}
            </button>
          ))}
        {step === 'married' && (
          <>
            <button type="button" className={button} onClick={() => onKiss()}>
              Ask if you can kiss {n}
            </button>
            <button
              type="button"
              className={button}
              onClick={() => {
                setStep('danced')
                onDance()
              }}
            >
              The first dance
            </button>
          </>
        )}
        {step === 'danced' && (
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md bg-pink-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-pink-800"
          >
            Celebrate with everyone
          </button>
        )}
      </div>
    </section>
  )
}
