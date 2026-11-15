import { describe, expect, it } from 'vitest'
import { acousticsFor } from './scenes'
import { defaultAudioSettings } from './settings'
import { speechVolume, spokenText, voiceFor } from './speech'

describe('conversations read aloud', () => {
  it('says the spoken words, not the stage directions or quotation marks', () => {
    expect(
      spokenText(['“Morning! Coffee?”', '*She holds up the pot.*', 'Nina: “Milk?”']),
    ).toBe('Morning! Coffee? Milk?')
    expect(spokenText(['*He nods.*'])).toBe('')
  })

  it('is off unless chosen, and follows the People volume and mute', () => {
    const s = defaultAudioSettings()
    expect(speechVolume(s)).toBe(0)
    const on = { ...s, speech: true }
    expect(speechVolume(on)).toBeCloseTo(
      (s.master / 100) * (s.categories.voices.volume / 100),
    )
    expect(speechVolume({ ...on, muted: true })).toBe(0)
    expect(
      speechVolume({
        ...on,
        categories: { ...on.categories, voices: { volume: 45, on: false } },
      }),
    ).toBe(0)
  })

  it('each person keeps the same voice, and different people can sound different', () => {
    const voices = ['Amy', 'Ben', 'Cara', 'Dev'].map(
      (name) => ({ name, lang: 'en-GB' }) as SpeechSynthesisVoice,
    )
    expect(voiceFor('reception', voices)).toBe(voiceFor('reception', voices))
    const picked = new Set(
      ['reception', 'manager', 'senior', 'facilities', 'backM', 'backR'].map(
        (id) => voiceFor(id, voices)?.name,
      ),
    )
    expect(picked.size).toBeGreaterThan(1)
    expect(voiceFor('anyone', [])).toBeNull()
  })
})

describe('rooms sound like rooms', () => {
  it('the courthouse rings, a carpeted office barely does, outdoors not at all', () => {
    const court = acousticsFor({ place: 'courthouse', time: 'day' })!
    const office = acousticsFor({ place: 'office', time: 'day' })!
    const workshop = acousticsFor({
      place: 'office',
      time: 'day',
      workplace: 'workshop',
    })!
    expect(court.decay).toBeGreaterThan(workshop.decay)
    expect(workshop.decay).toBeGreaterThan(office.decay)
    expect(acousticsFor({ place: 'street', time: 'day' })).toBeNull()
    expect(acousticsFor({ place: 'home', time: 'evening' })!.wet).toBeLessThan(office.wet)
  })
})
