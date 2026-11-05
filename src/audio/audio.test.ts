import { describe, expect, it, vi } from 'vitest'
import { newProfileData } from '../game/career'
import { goHome } from '../game/life'
import { endDay, passTime } from '../game/workday'
import { areaAt, surfaceAt } from '../city/streets'
import { createEngine } from './engine'
import { AudioManager, MIN_GAP, type AudioEngine } from './manager'
import { layersFor, moodFor, sceneKey, timeOfDay } from './scenes'
import {
  AUDIO_SETTINGS_KEY,
  defaultAudioSettings,
  levelOf,
  readAudioSettings,
  writeAudioSettings,
} from './settings'
import { snapshot, soundsFor } from './useAudio'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  }
}

function fakeEngine() {
  const calls: string[] = []
  const engine: AudioEngine = {
    play: (id, o) => calls.push(`play:${id}:${o.surface ?? ''}`),
    setScene: (scene) => calls.push(`scene:${sceneKey(scene)}`),
    setLevels: () => calls.push('levels'),
    sting: (kind) => calls.push(`sting:${kind}`),
    stop: () => calls.push('stop'),
  }
  return { engine, calls }
}

async function ready(manager: AudioManager) {
  manager.unlock()
  await vi.waitFor(() => expect(manager.stats.engine).toBe('ready'))
}

describe('sound settings', () => {
  it('has gentle defaults, saved on this device and read back', () => {
    const store = memoryStorage()
    const settings = readAudioSettings(store)
    expect(settings).toEqual(defaultAudioSettings())
    expect(settings.categories.music.volume).toBeLessThan(
      settings.categories.effects.volume,
    )
    writeAudioSettings({ ...settings, master: 40, captions: true }, store)
    expect(readAudioSettings(store)).toMatchObject({ master: 40, captions: true })
    // Fewer sounds by default when the system asks for less motion.
    expect(readAudioSettings(memoryStorage(), true).calm).toBe(true)
  })

  it('ignores a broken or out-of-range saved value', () => {
    const store = memoryStorage()
    store.setItem(AUDIO_SETTINGS_KEY, '{not json')
    expect(readAudioSettings(store)).toEqual(defaultAudioSettings())
    store.setItem(AUDIO_SETTINGS_KEY, JSON.stringify({ master: 400 }))
    expect(readAudioSettings(store)).toEqual(defaultAudioSettings())
  })

  it('volume levels: master × kind, nothing when muted or switched off', () => {
    const s = defaultAudioSettings()
    expect(levelOf(s, 'effects')).toBeCloseTo(0.7 * 0.6)
    expect(levelOf({ ...s, muted: true }, 'effects')).toBe(0)
    expect(
      levelOf(
        { ...s, categories: { ...s.categories, music: { volume: 80, on: false } } },
        'music',
      ),
    ).toBe(0)
  })
})

describe('scenes', () => {
  it('the time of day, from the clock', () => {
    expect(timeOfDay(7 * 60)).toBe('morning')
    expect(timeOfDay(12 * 60)).toBe('day')
    expect(timeOfDay(20 * 60)).toBe('evening')
    expect(timeOfDay(23 * 60 + 30)).toBe('night')
    expect(timeOfDay(25 * 60)).toBe('night')
  })

  it('every place sounds different, and the street changes through the day', () => {
    const day = layersFor({ place: 'street', time: 'day' })
    const night = layersFor({ place: 'street', time: 'night' })
    expect(day.cars!).toBeGreaterThan(night.cars!)
    expect(night.crickets).toBe(1)
    expect(day.horns).toBeGreaterThan(0)
    expect(night.horns).toBe(0)
    expect(layersFor({ place: 'street', time: 'morning' }).birds).toBeGreaterThan(
      day.birds!,
    )
    expect(layersFor({ place: 'office', time: 'day' }).typing).toBeGreaterThan(0)
    expect(layersFor({ place: 'breakroom', time: 'day' }).coffee).toBeGreaterThan(0)
    expect(layersFor({ place: 'meeting', time: 'day' }).chatter).toBeUndefined()
    expect(layersFor({ place: 'district', time: 'day' }).construction).toBeGreaterThan(0)
    expect(layersFor({ place: 'quiet', time: 'day' })).toEqual({})
    // Inside the places: the pond, trolleys, treadmills, the yard.
    expect(layersFor({ place: 'park', time: 'day' })).toMatchObject({
      water: 1,
      ducks: 3,
    })
    expect(layersFor({ place: 'shop', time: 'day' }).trolleys).toBeGreaterThan(0)
    expect(layersFor({ place: 'gym', time: 'day' }).treadmills).toBe(1)
    expect(layersFor({ place: 'garage', time: 'day' }).engines).toBeGreaterThan(0)
    const keys = (['office', 'cafe', 'gym', 'home', 'park', 'shop'] as const).map(
      (place) => JSON.stringify(layersFor({ place, time: 'day' })),
    )
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('music by mood, with the interview its own', () => {
    expect(moodFor({ place: 'office', time: 'day' })).toBe('focus')
    expect(moodFor({ place: 'district', time: 'day' })).toBe('tech')
    expect(moodFor({ place: 'home', time: 'evening', moment: 'interview' })).toBe(
      'interview',
    )
    expect(moodFor({ place: 'meeting', time: 'day' })).toBeNull()
  })

  it('the street: areas along it, road and pavement underfoot', () => {
    expect(areaAt(-40)).toBe('residential')
    expect(areaAt(0)).toBe('street')
    expect(areaAt(40)).toBe('park')
    expect(areaAt(62)).toBe('district')
    expect(surfaceAt(0)).toBe('road')
    expect(surfaceAt(7.5)).toBe('pavement')
  })
})

describe('the sound manager', () => {
  it('loads the engine only after a click or key press, and only if sound is on', async () => {
    const { engine } = fakeEngine()
    const load = vi.fn(async () => engine)
    const off = { ...defaultAudioSettings(), muted: true }
    const manager = new AudioManager(off, load)
    manager.play('mail')
    expect(load).not.toHaveBeenCalled()
    manager.unlock()
    expect(load).not.toHaveBeenCalled()
    manager.update({ ...off, muted: false })
    await vi.waitFor(() => expect(manager.stats.engine).toBe('ready'))
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('no sound at all where Web Audio is missing or fails: nothing throws', async () => {
    const missing = new AudioManager(defaultAudioSettings(), async () => null)
    missing.unlock()
    await vi.waitFor(() => expect(missing.stats.engine).toBe('failed'))
    expect(() => missing.play('mail')).not.toThrow()
    const broken = new AudioManager(defaultAudioSettings(), async () => {
      throw new Error('no audio')
    })
    broken.unlock()
    await vi.waitFor(() => expect(broken.stats.engine).toBe('failed'))
    // In this test environment there is no AudioContext.
    expect(createEngine()).toBeNull()
  })

  it('the same sound is not repeated too soon', async () => {
    let t = 0
    const { engine, calls } = fakeEngine()
    const manager = new AudioManager(
      defaultAudioSettings(),
      async () => engine,
      () => t,
    )
    await ready(manager)
    expect(manager.play('mail')).toBe(true)
    t += MIN_GAP.mail - 1
    expect(manager.play('mail')).toBe(false)
    t += 2
    expect(manager.play('mail')).toBe(true)
    expect(calls.filter((c) => c.startsWith('play:mail'))).toHaveLength(2)
    expect(manager.stats.skipped).toBe(1)
  })

  it('respects each kind’s switch, and fewer sounds drops button clicks', async () => {
    const { engine, calls } = fakeEngine()
    const s = defaultAudioSettings()
    const manager = new AudioManager(
      { ...s, categories: { ...s.categories, character: { volume: 50, on: false } } },
      async () => engine,
    )
    await ready(manager)
    expect(manager.play('step', { surface: 'wood' })).toBe(false)
    expect(manager.play('click')).toBe(true)
    manager.update({ ...manager.settings, calm: true })
    expect(manager.play('click')).toBe(false)
    expect(calls).toContain('levels')
    expect(calls.filter((c) => c.startsWith('play:'))).toEqual(['play:click:'])
  })

  it('captions for important sounds, even with the sound muted', () => {
    const manager = new AudioManager(
      { ...defaultAudioSettings(), muted: true, captions: true },
      async () => null,
    )
    const seen: string[] = []
    manager.onCaption((text) => seen.push(text))
    manager.play('pay')
    manager.play('click')
    expect(seen).toEqual(['Pay received'])
  })

  it('promotions also get a short piece of music', async () => {
    const { engine, calls } = fakeEngine()
    const manager = new AudioManager(defaultAudioSettings(), async () => engine)
    await ready(manager)
    manager.play('promotion')
    expect(calls).toContain('sting:promotion')
  })

  it('scenes: the latest claim wins and releasing it restores the one before', async () => {
    const { engine, calls } = fakeEngine()
    const manager = new AudioManager(defaultAudioSettings(), async () => engine)
    const home = manager.claim({ place: 'home', time: 'evening' })
    await ready(manager)
    expect(calls).toContain('scene:home:evening:')
    const interview = manager.claim({
      place: 'home',
      time: 'evening',
      moment: 'interview',
    })
    expect(manager.stats.scene).toBe('home:evening:interview')
    manager.release(interview)
    expect(manager.stats.scene).toBe('home:evening:')
    // The same scene again does not restart it.
    const count = calls.length
    manager.change(home, { place: 'home', time: 'evening' })
    expect(calls.length).toBe(count)
    manager.release(home)
    expect(manager.stats.scene).toBe('none')
    expect(calls.at(-1)).toBe('scene:none')
  })
})

describe('the game’s news as sounds', () => {
  const evening = () => {
    const p = newProfileData('Sam', 1)
    return goHome(endDay(passTime(p, 8 * 60 + 40, 'work')))
  }

  it('a promotion, pay day, a new email and a door', () => {
    const p = evening()
    const before = snapshot(p)
    expect(soundsFor(before, { ...before, level: 'next' })).toEqual(['promotion'])
    expect(soundsFor(before, { ...before, pay: before.pay + 1 })).toEqual(['pay'])
    expect(
      soundsFor(before, {
        ...before,
        inbox: before.inbox + 1,
        unread: before.unread + 1,
      }),
    ).toEqual(['mail'])
    expect(soundsFor(before, { ...before, where: 'cafe:true' })).toEqual(['door'])
    // Not for the journey to work, and nothing when nothing changed.
    expect(soundsFor(before, { ...before, where: 'home:true', phase: 'work' })).toEqual(
      [],
    )
    expect(soundsFor(before, before)).toEqual([])
  })

  it('at most two at once, the biggest first', () => {
    const before = snapshot(evening())
    expect(
      soundsFor(before, {
        ...before,
        level: 'next',
        achievements: before.achievements + 1,
        pay: before.pay + 1,
      }),
    ).toEqual(['promotion', 'achievement'])
  })
})
