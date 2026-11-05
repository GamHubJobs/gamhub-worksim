/**
 * Sound settings: master volume, each kind of sound on its own, mute, fewer
 * sounds, captions, and a test sound. Saved on this device.
 */
import { useEffect, useRef } from 'react'
import { audio, type EffectId } from './manager'
import { CATEGORIES, type AudioSettings, type CategoryId } from './settings'
import { useAudioSettings } from './useAudio'
import { setGraphicsQuality, useGraphicsQuality, type Quality } from '../ui/graphics'

const QUALITIES: Array<[Quality, string, string]> = [
  ['auto', 'Auto', 'Less detail on computers that draw 3D without a graphics card.'],
  ['high', 'High', 'Full detail: lights, every person and prop.'],
  [
    'low',
    'Low',
    'Fewer lights and people, lower resolution: smoother on slower computers.',
  ],
]

const SAMPLE: Record<CategoryId, EffectId> = {
  music: 'achievement',
  ambience: 'notify',
  effects: 'mail',
  character: 'step',
  voices: 'greet',
}

export function AudioSettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useAudioSettings()
  const quality = useGraphicsQuality()
  const dialog = useRef<HTMLDivElement>(null)
  const change = (next: Partial<AudioSettings>) => audio.update({ ...settings, ...next })
  const changeCategory = (
    id: CategoryId,
    next: Partial<AudioSettings['categories'][CategoryId]>,
  ) =>
    change({
      categories: {
        ...settings.categories,
        [id]: { ...settings.categories[id], ...next },
      },
    })

  useEffect(() => {
    const before = document.activeElement
    dialog.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (before instanceof HTMLElement && before.isConnected) before.focus()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sound-title"
        tabIndex={-1}
        className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl outline-none"
        data-testid="sound-panel"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id="sound-title" className="text-lg font-bold text-slate-900">
            Sound and graphics
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
          >
            Close
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          Every sound in WorkSim is made on your computer as you play: no recordings and
          nothing downloaded. The game works fully without sound. Settings are kept on
          this device.
        </p>

        <label className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-800">
          <input
            type="checkbox"
            checked={settings.muted}
            onChange={(e) => change({ muted: e.target.checked })}
          />
          Mute all sound
        </label>

        <Slider
          id="sound-master"
          label="Master volume"
          value={settings.master}
          disabled={settings.muted}
          onChange={(master) => change({ master })}
        />

        <fieldset className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          <legend className="sr-only">Kinds of sound</legend>
          {CATEGORIES.map((c) => {
            const value = settings.categories[c.id]
            return (
              <div key={c.id} data-testid={`sound-${c.id}`}>
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={value.on}
                      onChange={(e) => changeCategory(c.id, { on: e.target.checked })}
                    />
                    {c.name}
                  </label>
                  <button
                    type="button"
                    onClick={() => audio.play(SAMPLE[c.id])}
                    disabled={settings.muted || !value.on}
                    className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50 disabled:opacity-50"
                  >
                    Test<span className="sr-only"> {c.name.toLowerCase()}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500">{c.description}</p>
                <Slider
                  id={`sound-${c.id}-volume`}
                  label={`${c.name} volume`}
                  value={value.volume}
                  disabled={settings.muted || !value.on}
                  onChange={(volume) => changeCategory(c.id, { volume })}
                  compact
                />
              </div>
            )
          })}
        </fieldset>

        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <label className="flex items-start gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              className="mt-1"
              checked={settings.calm}
              onChange={(e) => change({ calm: e.target.checked })}
            />
            <span>
              <span className="font-medium">Fewer sounds</span>
              <span className="block text-xs text-slate-500">
                Quieter, sparser surroundings, longer rests between music and no button
                clicks.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              className="mt-1"
              checked={settings.captions}
              onChange={(e) => change({ captions: e.target.checked })}
            />
            <span>
              <span className="font-medium">Sound captions</span>
              <span className="block text-xs text-slate-500">
                A short note on screen for important sounds (a new email, pay day, a
                promotion), with or without sound.
              </span>
            </span>
          </label>
        </div>

        <fieldset className="mt-3 border-t border-slate-100 pt-3" data-testid="graphics">
          <legend className="text-sm font-semibold text-slate-900">Graphics</legend>
          <p className="text-xs text-slate-500">
            For the 3D office, home, street and places. Everything also works from the
            lists beside them.
          </p>
          <div className="mt-2 space-y-1">
            {QUALITIES.map(([id, name, about]) => (
              <label key={id} className="flex items-start gap-2 text-sm text-slate-800">
                <input
                  type="radio"
                  name="graphics-quality"
                  className="mt-1"
                  checked={quality === id}
                  onChange={() => setGraphicsQuality(id)}
                />
                <span>
                  <span className="font-medium">{name}</span>
                  <span className="block text-xs text-slate-500">{about}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  )
}

function Slider({
  id,
  label,
  value,
  disabled,
  onChange,
  compact = false,
}: {
  id: string
  label: string
  value: number
  disabled: boolean
  onChange: (value: number) => void
  compact?: boolean
}) {
  return (
    <div className={`flex items-center gap-3 ${compact ? 'mt-1' : 'mt-3'}`}>
      <label
        htmlFor={id}
        className={compact ? 'sr-only' : 'w-32 shrink-0 text-sm text-slate-800'}
      >
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1 accent-blue-700"
      />
      <output htmlFor={id} className="w-9 text-right text-xs text-slate-600">
        {value}%
      </output>
    </div>
  )
}

/** Captions for important sounds, when turned on (also announced to screen readers). */
export function SoundCaptions() {
  const settings = useAudioSettings()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!settings.captions) return
    const timers: number[] = []
    const off = audio.onCaption((text) => {
      const box = ref.current
      if (!box) return
      const item = document.createElement('p')
      item.textContent = `♪ ${text}`
      item.className = 'rounded-md bg-slate-900/85 px-3 py-1 text-sm text-white shadow'
      box.append(item)
      while (box.childElementCount > 3) box.firstElementChild?.remove()
      timers.push(window.setTimeout(() => item.remove(), 3500))
    })
    return () => {
      off()
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [settings.captions])
  if (!settings.captions) return null
  return (
    <div
      ref={ref}
      aria-live="polite"
      data-testid="sound-captions"
      className="pointer-events-none fixed bottom-14 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-1"
    />
  )
}
