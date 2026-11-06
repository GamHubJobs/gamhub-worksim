/**
 * WorkSim's sound, made in the browser with Web Audio: tones, filtered noise
 * and envelopes, so there are no recordings to licence, download or cache.
 * Loaded only after the player's first click or key press (see manager.ts).
 *
 * The graph: each kind of sound has its own bus (music, surroundings,
 * effects, character, people) into a gentle compressor, so nothing is ever
 * suddenly loud. A scene's surroundings and music live under their own gain
 * and fade out (and are disconnected) when the player moves on.
 */
import type { AudioEngine, EffectId, Levels, Surface } from './manager'
import { layersFor, moodFor, sceneKey, type Layer, type Mood, type Scene } from './scenes'
import type { CategoryId } from './settings'

/** Each bus's share of the volume: background sounds sit well under the rest. */
const TRIM: Record<CategoryId, number> = {
  music: 0.32,
  ambience: 0.55,
  effects: 0.5,
  character: 0.45,
  voices: 0.35,
}

/** The most background sounds at once. */
const MAX_VOICES = 14

type Ctx = AudioContext

interface Bus {
  gain: GainNode
}

type Color = 'white' | 'pink' | 'brown'

function noiseBuffer(ctx: Ctx, color: Color): AudioBuffer {
  const length = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    last = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    if (color === 'white') data[i] = white * 0.5
    else if (color === 'pink') {
      b0 = 0.99765 * b0 + white * 0.099046
      b1 = 0.963 * b1 + white * 0.2965164
      b2 = 0.57 * b2 + white * 1.0526913
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.12
    } else {
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.2
    }
  }
  return buffer
}

const rand = (low: number, high: number) => low + Math.random() * (high - low)
const pick = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]
const midi = (note: number) => 440 * Math.pow(2, (note - 69) / 12)

export function createEngine(): AudioEngine | null {
  const Context =
    typeof window === 'undefined'
      ? undefined
      : (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext)
  if (!Context) return null
  let ctx: Ctx
  try {
    ctx = new Context()
  } catch {
    return null
  }
  void ctx.resume().catch(() => {})

  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -18
  limiter.knee.value = 12
  limiter.ratio.value = 4
  limiter.attack.value = 0.005
  limiter.release.value = 0.25
  const master = ctx.createGain()
  master.gain.value = 0.9
  limiter.connect(master).connect(ctx.destination)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  master.connect(analyser)
  const samples = new Float32Array(analyser.fftSize)

  const buses = {} as Record<CategoryId, Bus>
  for (const id of Object.keys(TRIM) as CategoryId[]) {
    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.connect(limiter)
    buses[id] = { gain }
  }

  const noise: Partial<Record<Color, AudioBuffer>> = {}
  const noiseOf = (color: Color) => (noise[color] ??= noiseBuffer(ctx, color))

  let calm = false

  function applyLevels(next: Levels, isCalm: boolean) {
    calm = isCalm
    for (const id of Object.keys(buses) as CategoryId[]) {
      const value = next[id] * TRIM[id] * (isCalm && id !== 'effects' ? 0.7 : 1)
      buses[id].gain.gain.setTargetAtTime(value, ctx.currentTime, 0.15)
    }
  }

  // -------------------------------------------------------------------------
  // Building blocks
  // -------------------------------------------------------------------------

  interface ToneOptions {
    type?: OscillatorType
    gain?: number
    attack?: number
    release?: number
    glideTo?: number
    pan?: number
    filter?: number
    detune?: number
  }

  /** A note with an envelope, into `to`. */
  function tone(
    to: AudioNode,
    freq: number,
    at: number,
    dur: number,
    o: ToneOptions = {},
  ) {
    const osc = ctx.createOscillator()
    osc.type = o.type ?? 'sine'
    osc.frequency.setValueAtTime(freq, at)
    if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, at + dur)
    if (o.detune) osc.detune.value = o.detune
    const env = ctx.createGain()
    const peak = o.gain ?? 0.3
    const attack = o.attack ?? 0.005
    env.gain.setValueAtTime(0.0001, at)
    env.gain.exponentialRampToValueAtTime(peak, at + attack)
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur + (o.release ?? 0.05))
    let node: AudioNode = osc
    if (o.filter) {
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = o.filter
      node.connect(lp)
      node = lp
    }
    node.connect(env)
    connectPanned(env, to, o.pan)
    osc.start(at)
    osc.stop(at + dur + (o.release ?? 0.05) + 0.05)
    osc.onended = () => env.disconnect()
  }

  interface NoiseOptions {
    color?: Color
    type?: BiquadFilterType
    freq?: number
    freqTo?: number
    q?: number
    gain?: number
    attack?: number
    pan?: number
    panTo?: number
  }

  /** A burst of filtered noise with an envelope. */
  function hiss(to: AudioNode, at: number, dur: number, o: NoiseOptions = {}) {
    const src = ctx.createBufferSource()
    src.buffer = noiseOf(o.color ?? 'white')
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = o.type ?? 'bandpass'
    filter.frequency.setValueAtTime(o.freq ?? 1000, at)
    if (o.freqTo) filter.frequency.exponentialRampToValueAtTime(o.freqTo, at + dur)
    filter.Q.value = o.q ?? 1
    const env = ctx.createGain()
    const peak = o.gain ?? 0.3
    const attack = o.attack ?? 0.003
    env.gain.setValueAtTime(0.0001, at)
    env.gain.exponentialRampToValueAtTime(peak, at + attack)
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    src.connect(filter).connect(env)
    if (o.panTo !== undefined && ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner()
      pan.pan.setValueAtTime(o.pan ?? 0, at)
      pan.pan.linearRampToValueAtTime(o.panTo, at + dur)
      env.connect(pan).connect(to)
    } else connectPanned(env, to, o.pan)
    src.start(at, Math.random())
    src.stop(at + dur + 0.05)
    src.onended = () => env.disconnect()
  }

  function connectPanned(from: AudioNode, to: AudioNode, pan?: number) {
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner()
      p.pan.value = Math.max(-1, Math.min(1, pan))
      from.connect(p).connect(to)
    } else from.connect(to)
  }

  /** A struck bell: a fundamental with inharmonic partials. */
  function bell(to: AudioNode, freq: number, at: number, gain = 0.2, dur = 0.8) {
    tone(to, freq, at, dur, { gain, release: 0.3 })
    tone(to, freq * 2.76, at, dur * 0.4, { gain: gain * 0.25 })
    tone(to, freq * 5.4, at, dur * 0.2, { gain: gain * 0.1 })
  }

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  function step(to: AudioNode, at: number, surface: Surface, gain: number) {
    const g = gain * rand(0.8, 1.1)
    switch (surface) {
      case 'grass':
        hiss(to, at, 0.13, {
          color: 'white',
          type: 'highpass',
          freq: 2200,
          gain: g * 0.18,
        })
        break
      case 'carpet':
        hiss(to, at, 0.08, { color: 'pink', type: 'lowpass', freq: 380, gain: g * 0.4 })
        break
      case 'wood':
        hiss(to, at, 0.07, { color: 'pink', freq: 320, q: 2, gain: g * 0.55 })
        tone(to, rand(120, 150), at, 0.06, { gain: g * 0.18, type: 'triangle' })
        break
      case 'tile':
        hiss(to, at, 0.05, { color: 'white', freq: 2600, q: 3, gain: g * 0.3 })
        break
      case 'road':
        hiss(to, at, 0.07, { color: 'pink', type: 'lowpass', freq: 650, gain: g * 0.5 })
        break
      default:
        hiss(to, at, 0.06, { color: 'pink', type: 'lowpass', freq: 950, gain: g * 0.45 })
        hiss(to, at, 0.02, { color: 'white', freq: 3000, q: 2, gain: g * 0.08 })
    }
  }

  function effect(id: EffectId, surface: Surface = 'pavement', variant = 0) {
    const t = ctx.currentTime + 0.01
    const to = buses[effectsBus(id)].gain
    // Each sound's own loudness; the bus applies the player's volume.
    const v = 1
    switch (id) {
      case 'click':
        tone(to, 1700, t, 0.025, { gain: 0.06 * v, type: 'sine' })
        break
      case 'open':
        tone(to, 520, t, 0.06, { gain: 0.12 * v, type: 'triangle' })
        tone(to, 780, t + 0.05, 0.08, { gain: 0.12 * v, type: 'triangle' })
        break
      case 'close':
        tone(to, 700, t, 0.06, { gain: 0.1 * v, type: 'triangle' })
        tone(to, 470, t + 0.05, 0.08, { gain: 0.1 * v, type: 'triangle' })
        break
      case 'mail':
        bell(to, 1046.5, t, 0.16 * v, 0.5)
        bell(to, 1568, t + 0.12, 0.13 * v, 0.6)
        break
      case 'notify':
        bell(to, 1318.5, t, 0.13 * v, 0.5)
        break
      case 'task':
      case 'success':
        ;[72, 76, 79].forEach((n, i) =>
          tone(to, midi(n), t + i * 0.08, 0.18, { gain: 0.14 * v, type: 'triangle' }),
        )
        bell(to, midi(84), t + 0.24, 0.1 * v, 0.7)
        break
      case 'fail':
        tone(to, 440, t, 0.16, { gain: 0.12 * v, type: 'triangle' })
        tone(to, 370, t + 0.15, 0.25, { gain: 0.12 * v, type: 'triangle' })
        break
      case 'achievement':
        ;[72, 76, 79, 84, 88].forEach((n, i) =>
          bell(to, midi(n), t + i * 0.07, 0.11 * v, 0.6),
        )
        break
      case 'promotion':
        ;[
          [60, 64, 67],
          [65, 69, 72],
          [67, 71, 74],
          [72, 76, 79, 84],
        ].forEach((chord, i) =>
          chord.forEach((n) =>
            tone(to, midi(n), t + i * 0.22, i === 3 ? 0.9 : 0.2, {
              gain: 0.07 * v,
              type: 'sawtooth',
              filter: 2200,
              attack: 0.02,
              release: 0.3,
            }),
          ),
        )
        break
      case 'pay':
        bell(to, 1975.5, t, 0.12 * v, 0.25)
        bell(to, 2637, t + 0.09, 0.12 * v, 0.5)
        hiss(to, t, 0.12, { color: 'white', freq: 5000, q: 1, gain: 0.04 * v })
        break
      case 'unlock':
        tone(to, 400, t, 0.35, { gain: 0.1 * v, glideTo: 1200, type: 'sine' })
        bell(to, 1568, t + 0.3, 0.1 * v, 0.6)
        break
      case 'offer':
        ;[67, 71, 74].forEach((n) =>
          tone(to, midi(n), t, 0.3, { gain: 0.08 * v, type: 'triangle' }),
        )
        ;[72, 76, 79].forEach((n) =>
          tone(to, midi(n), t + 0.28, 0.6, {
            gain: 0.08 * v,
            type: 'triangle',
            release: 0.3,
          }),
        )
        break
      case 'decline':
        tone(to, 392, t, 0.3, { gain: 0.1 * v, type: 'triangle', release: 0.2 })
        break
      case 'warn':
        tone(to, 660, t, 0.1, { gain: 0.12 * v, type: 'triangle' })
        tone(to, 660, t + 0.18, 0.1, { gain: 0.12 * v, type: 'triangle' })
        break
      case 'error':
        tone(to, 220, t, 0.12, { gain: 0.09 * v, type: 'square', filter: 900 })
        tone(to, 196, t + 0.15, 0.16, { gain: 0.09 * v, type: 'square', filter: 900 })
        break
      case 'phone':
        for (let i = 0; i < 3; i++)
          tone(to, 160, t + i * 0.18, 0.1, {
            gain: 0.12 * v,
            type: 'square',
            filter: 300,
          })
        bell(to, 1760, t + 0.6, 0.08 * v, 0.4)
        break
      case 'door':
        hiss(to, t, 0.2, { color: 'brown', type: 'lowpass', freq: 220, gain: 0.5 * v })
        tone(to, 90, t, 0.12, { gain: 0.15 * v, type: 'sine' })
        hiss(to, t + 0.02, 0.03, { color: 'white', freq: 2500, q: 4, gain: 0.08 * v })
        break
      case 'sit':
        hiss(to, t, 0.25, { color: 'pink', freq: 1200, q: 0.8, gain: 0.12 * v })
        tone(to, 130, t + 0.1, 0.18, {
          gain: 0.05 * v,
          type: 'sawtooth',
          glideTo: 95,
          filter: 600,
        })
        break
      case 'stand':
        tone(to, 100, t, 0.15, {
          gain: 0.05 * v,
          type: 'sawtooth',
          glideTo: 135,
          filter: 600,
        })
        hiss(to, t + 0.05, 0.25, { color: 'pink', freq: 1300, q: 0.8, gain: 0.12 * v })
        break
      case 'type':
        hiss(to, t, 0.025, {
          color: 'white',
          freq: rand(2500, 4200),
          q: 3,
          gain: 0.12 * v,
        })
        break
      case 'step':
        step(to, t, surface, 0.9 * v)
        break
      case 'clank':
        // Metal on metal: a bar meeting its rack, plates knocking.
        ;[310, 790, 1260].forEach((f) =>
          tone(to, f * rand(0.97, 1.03), t, 0.35, { gain: 0.05 * v }),
        )
        hiss(to, t, 0.06, { color: 'white', freq: 2600, q: 2, gain: 0.12 * v })
        break
      case 'breath':
        // A hard breath out.
        hiss(to, t, 0.55, {
          color: 'pink',
          freq: 900,
          freqTo: 500,
          q: 0.7,
          gain: 0.12 * v,
          attack: 0.08,
        })
        break
      case 'water':
        // Running water: overlapping bursts make a steady stream.
        hiss(to, t, 1.25, {
          color: 'white',
          freq: 2400,
          q: 0.5,
          gain: 0.08 * v,
          attack: 0.15,
        })
        hiss(to, t, 1.25, {
          color: 'pink',
          freq: 700,
          q: 0.8,
          gain: 0.06 * v,
          attack: 0.15,
        })
        break
      case 'pour':
        hiss(to, t, 1.4, {
          color: 'pink',
          freq: 1300,
          freqTo: 900,
          q: 2,
          gain: 0.08 * v,
          attack: 0.1,
        })
        break
      case 'sip':
        hiss(to, t, 0.25, {
          color: 'pink',
          freq: 1600,
          q: 3,
          gain: 0.06 * v,
          attack: 0.05,
        })
        tone(to, 320, t + 0.22, 0.06, { gain: 0.03 * v, glideTo: 260 })
        break
      case 'bite':
        hiss(to, t, 0.08, { color: 'white', freq: 1800, q: 2, gain: 0.08 * v })
        hiss(to, t + 0.18, 0.06, { color: 'white', freq: 1500, q: 2, gain: 0.06 * v })
        break
      case 'rustle':
        hiss(to, t, 0.35, {
          color: 'white',
          freq: 3200,
          q: 0.8,
          gain: 0.06 * v,
          attack: 0.03,
        })
        break
      case 'chair':
        tone(to, rand(110, 150), t, 0.25, {
          type: 'sawtooth',
          gain: 0.03 * v,
          glideTo: rand(80, 100),
          filter: 600,
        })
        hiss(to, t, 0.2, { color: 'brown', type: 'lowpass', freq: 300, gain: 0.2 * v })
        break
      case 'engine':
        // A small car's engine: a low, slightly rough hum (overlapping repeats).
        tone(to, 48, t, 0.95, {
          type: 'sawtooth',
          gain: 0.03 * v,
          attack: 0.15,
          filter: 240,
        })
        tone(to, 96, t, 0.95, { type: 'triangle', gain: 0.015 * v, attack: 0.15 })
        break
      case 'beep':
        tone(to, 1900, t, 0.08, { gain: 0.07 * v })
        break
      case 'doorbell':
        // Ding-dong: two soft chimes, a third apart, each ringing on.
        tone(to, 659, t, 0.9, { gain: 0.16 * v })
        tone(to, 1318, t, 0.5, { gain: 0.03 * v })
        tone(to, 523, t + 0.55, 1.1, { gain: 0.16 * v })
        tone(to, 1046, t + 0.55, 0.6, { gain: 0.03 * v })
        break
      case 'ring':
        // A phone ringing: two short warbling bursts.
        // Three ringtones: classic, bright (higher, quicker), soft (lower, gentler).
        for (const at of [0, 0.4, 1.2, 1.6])
          for (let k = 0; k < 6; k++)
            tone(
              to,
              (k % 2 ? 1240 : 990) * [1, 1.33, 0.66][variant % 3],
              t + at * [1, 0.8, 1.2][variant % 3] + k * 0.05,
              0.05,
              { gain: [0.07, 0.06, 0.05][variant % 3] * v },
            )
        break
      case 'call':
        // Connected, or ended: a soft double beep.
        tone(to, 880, t, 0.12, { gain: 0.08 * v })
        tone(to, 660, t + 0.16, 0.14, { gain: 0.08 * v })
        break
      case 'greet':
        // A short, friendly "mm-hm": a voice-like hum, not words.
        murmur(to, t, 0.35, 0.12 * v, 1)
        break
    }
  }

  function effectsBus(id: EffectId): CategoryId {
    if (id === 'greet') return 'voices'
    if (
      [
        'door',
        'sit',
        'stand',
        'type',
        'step',
        'clank',
        'breath',
        'water',
        'pour',
        'sip',
        'bite',
        'rustle',
        'chair',
      ].includes(id)
    )
      return 'character'
    return 'effects'
  }

  /** Voice-like sound without words: a hum through moving vowel formants. */
  function murmur(to: AudioNode, at: number, dur: number, gain: number, syllables = 4) {
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    const pitch = rand(110, 230)
    osc.frequency.setValueAtTime(pitch, at)
    const f1 = ctx.createBiquadFilter()
    f1.type = 'bandpass'
    f1.Q.value = 6
    const f2 = ctx.createBiquadFilter()
    f2.type = 'bandpass'
    f2.Q.value = 8
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, at)
    const each = dur / syllables
    for (let i = 0; i < syllables; i++) {
      const s = at + i * each
      const [a, b] = pick([
        [700, 1200],
        [400, 2000],
        [300, 900],
        [550, 1700],
      ])
      f1.frequency.setValueAtTime(a, s)
      f2.frequency.setValueAtTime(b, s)
      osc.frequency.linearRampToValueAtTime(pitch * rand(0.9, 1.12), s + each)
      env.gain.linearRampToValueAtTime(gain, s + each * 0.3)
      env.gain.linearRampToValueAtTime(gain * 0.15, s + each * 0.95)
    }
    env.gain.linearRampToValueAtTime(0.0001, at + dur + 0.05)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1800
    osc.connect(f1).connect(lp)
    osc.connect(f2).connect(lp)
    lp.connect(env)
    connectPanned(env, to, rand(-0.7, 0.7))
    osc.start(at)
    osc.stop(at + dur + 0.1)
    osc.onended = () => env.disconnect()
  }

  // -------------------------------------------------------------------------
  // Surroundings
  // -------------------------------------------------------------------------

  interface Running {
    key: string
    ambience: GainNode
    voices: GainNode
    sources: AudioScheduledSourceNode[]
    timers: number[]
    music: MusicPlayer | null
  }

  let current: Running | null = null
  let active = 0

  /** A steady bed of filtered noise, looping, optionally slowly moving. */
  function bed(
    run: Running,
    color: Color,
    type: BiquadFilterType,
    freq: number,
    gain: number,
    sway = 0,
  ) {
    const src = ctx.createBufferSource()
    src.buffer = noiseOf(color)
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = freq
    filter.Q.value = 0.7
    const g = ctx.createGain()
    g.gain.value = gain
    src.connect(filter).connect(g).connect(run.ambience)
    if (sway) {
      const lfo = ctx.createOscillator()
      lfo.frequency.value = rand(0.04, 0.09)
      const depth = ctx.createGain()
      depth.gain.value = gain * sway
      lfo.connect(depth).connect(g.gain)
      lfo.start()
      run.sources.push(lfo)
    }
    src.start(0, Math.random())
    run.sources.push(src)
  }

  function hum(run: Running, freq: number, gain: number) {
    const osc = ctx.createOscillator()
    osc.frequency.value = freq
    const g = ctx.createGain()
    g.gain.value = gain
    osc.connect(g).connect(run.ambience)
    osc.start()
    run.sources.push(osc)
  }

  /** One occasional sound of a layer. */
  function event(layer: Layer, run: Running) {
    if (active >= MAX_VOICES) return
    const to = run.ambience
    const t = ctx.currentTime + 0.05
    const pan = rand(-0.9, 0.9)
    let length = 1
    switch (layer) {
      case 'cars': {
        length = rand(2.5, 4.5)
        const left = Math.random() < 0.5
        hiss(to, t, length, {
          color: 'brown',
          type: 'lowpass',
          freq: rand(350, 600),
          freqTo: rand(250, 400),
          gain: rand(0.25, 0.5),
          attack: length * 0.45,
          pan: left ? -0.9 : 0.9,
          panTo: left ? 0.9 : -0.9,
        })
        break
      }
      case 'horns':
        tone(to, 415, t, 0.25, { type: 'square', gain: 0.03, filter: 1500, pan })
        tone(to, 520, t, 0.25, { type: 'square', gain: 0.025, filter: 1500, pan })
        break
      case 'chatter':
        length = rand(1.2, 2.8)
        murmur(run.voices, t, length, rand(0.05, 0.1), Math.round(length * 4))
        break
      case 'birds': {
        const base = rand(2500, 4500)
        const n = Math.floor(rand(3, 7))
        for (let i = 0; i < n; i++)
          tone(to, base * rand(0.9, 1.15), t + i * rand(0.08, 0.16), 0.06, {
            glideTo: base * rand(1.1, 1.4),
            gain: 0.025,
            pan,
          })
        length = n * 0.15
        break
      }
      case 'crickets':
        for (let i = 0; i < 6; i++)
          tone(to, 4600, t + i * 0.05, 0.02, { gain: 0.01, pan })
        break
      case 'typing': {
        const n = Math.floor(rand(6, 22))
        for (let i = 0, at = t; i < n; i++, at += rand(0.07, 0.16))
          hiss(to, at, 0.02, {
            color: 'white',
            freq: rand(2800, 4200),
            q: 3,
            gain: 0.05,
            pan,
          })
        length = n * 0.12
        break
      }
      case 'phones':
        for (let r = 0; r < 2; r++) {
          tone(to, 440, t + r * 0.5, 0.35, { gain: 0.012, pan, filter: 1200 })
          tone(to, 480, t + r * 0.5, 0.35, { gain: 0.012, pan, filter: 1200 })
        }
        length = 1
        break
      case 'printer':
        length = 2.5
        for (let i = 0; i < 10; i++)
          hiss(to, t + i * 0.24, 0.2, {
            color: 'pink',
            freq: 1400,
            q: 2,
            gain: 0.05,
            pan,
          })
        break
      case 'chairs':
        tone(to, rand(110, 160), t, 0.22, {
          type: 'sawtooth',
          gain: 0.015,
          glideTo: rand(80, 120),
          filter: 500,
          pan,
        })
        break
      case 'doors':
        hiss(to, t, 0.25, { color: 'brown', type: 'lowpass', freq: 180, gain: 0.3, pan })
        break
      case 'cups':
        bell(to, rand(2400, 3200), t, 0.025, 0.15)
        bell(to, rand(2400, 3200), t + rand(0.08, 0.2), 0.02, 0.15)
        break
      case 'coffee':
        length = 3
        hiss(to, t, 1.4, {
          color: 'pink',
          freq: 700,
          q: 1.5,
          gain: 0.08,
          attack: 0.1,
          pan,
        })
        hiss(to, t + 1.5, 1.6, {
          color: 'white',
          type: 'highpass',
          freq: 3000,
          gain: 0.03,
          attack: 0.2,
          pan,
        })
        break
      case 'microwave':
        length = 3
        tone(to, 120, t, 2.4, { gain: 0.02, attack: 0.1, pan })
        for (let i = 0; i < 3; i++)
          tone(to, 1000, t + 2.6 + i * 0.25, 0.12, { gain: 0.03, pan })
        break
      case 'till':
        tone(to, 2100, t, 0.1, { gain: 0.025, pan })
        hiss(to, t + 0.2, 0.3, { color: 'pink', freq: 900, gain: 0.05, pan })
        break
      case 'weights':
        ;[310, 770, 1230].forEach((f) =>
          tone(to, f * rand(0.97, 1.03), t, 0.3, { gain: 0.03, pan }),
        )
        hiss(to, t, 0.08, { color: 'white', freq: 2000, gain: 0.08, pan })
        break
      case 'tools': {
        const n = Math.floor(rand(4, 10))
        for (let i = 0; i < n; i++)
          hiss(to, t + i * 0.07, 0.03, {
            color: 'white',
            freq: 3500,
            q: 4,
            gain: 0.06,
            pan,
          })
        length = n * 0.07
        break
      }
      case 'construction':
        for (let i = 0; i < 4; i++)
          hiss(to, t + i * 0.55, 0.2, {
            color: 'brown',
            type: 'lowpass',
            freq: 140,
            gain: 0.25,
            pan: 0.6,
          })
        length = 2.2
        break
      case 'ducks': {
        // A soft quack or two: a nasal tone through a narrow filter.
        const n = Math.floor(rand(1, 3))
        for (let i = 0; i < n; i++)
          tone(to, rand(380, 460), t + i * 0.22, 0.12, {
            type: 'sawtooth',
            gain: 0.025,
            glideTo: rand(300, 340),
            filter: 1400,
            pan,
          })
        length = n * 0.25
        break
      }
      case 'trolleys':
        length = rand(1.5, 3)
        hiss(to, t, length, {
          color: 'white',
          freq: 2200,
          q: 2,
          gain: 0.025,
          attack: 0.3,
          pan,
          panTo: -pan,
        })
        break
      case 'engines':
        // A car starting in the yard: a crank, then an idle that fades.
        length = 3
        tone(to, 45, t, 0.6, { type: 'sawtooth', gain: 0.03, filter: 300, pan: 0.6 })
        tone(to, 55, t + 0.6, 2.2, {
          type: 'sawtooth',
          gain: 0.025,
          glideTo: 48,
          filter: 260,
          pan: 0.6,
        })
        break
      case 'thunder':
        // Distant thunder: a long, low rumble rolling across.
        length = 4
        hiss(to, t, 3.8, {
          color: 'brown',
          type: 'lowpass',
          freq: 160,
          freqTo: 70,
          gain: 0.35,
          attack: 0.6,
          pan: rand(-0.6, 0.6),
        })
        break
      case 'footsteps': {
        const n = Math.floor(rand(4, 9))
        const g = rand(0.12, 0.25)
        for (let i = 0; i < n; i++) step(to, t + i * 0.5, 'pavement', g)
        length = n * 0.5
        break
      }
      default:
        return
    }
    active++
    const timer = window.setTimeout(() => {
      active = Math.max(0, active - 1)
    }, length * 1000)
    run.timers.push(timer)
  }

  function startScene(scene: Scene): Running {
    const ambience = ctx.createGain()
    ambience.gain.value = 0.0001
    ambience.connect(buses.ambience.gain)
    ambience.gain.setTargetAtTime(1, ctx.currentTime, 0.8)
    const voices = ctx.createGain()
    voices.gain.value = 0.0001
    voices.connect(buses.voices.gain)
    voices.gain.setTargetAtTime(1, ctx.currentTime, 0.8)
    const run: Running = {
      key: sceneKey(scene),
      ambience,
      voices,
      sources: [],
      timers: [],
      music: null,
    }
    const layers = layersFor(scene)
    const quiet = calm ? 0.5 : 1
    // Steady beds.
    if (layers.traffic) bed(run, 'brown', 'lowpass', 320, 0.45 * layers.traffic, 0.3)
    if (layers.wind) bed(run, 'pink', 'bandpass', 480, 0.12 * layers.wind, 0.6)
    if (layers.aircon) {
      bed(run, 'pink', 'lowpass', 850, 0.08)
      hum(run, 100, 0.006)
    }
    if (layers.fridge) hum(run, 55, 0.012)
    if (layers.water) bed(run, 'pink', 'bandpass', 900, 0.05, 0.8)
    if (layers.rain) {
      // Rain: a hiss of drops and a softer patter beneath it.
      bed(run, 'white', 'highpass', 2200, 0.09 * layers.rain, 0.15)
      bed(run, 'pink', 'bandpass', 1100, 0.07 * layers.rain, 0.25)
    }
    if (layers.treadmills) {
      hum(run, 70, 0.01)
      bed(run, 'brown', 'lowpass', 260, 0.12, 0.2)
    }
    // Occasional events, each checked a few times a second.
    const events = (Object.entries(layers) as Array<[Layer, number]>).filter(
      ([layer, rate]) =>
        rate > 0 &&
        ![
          'traffic',
          'wind',
          'aircon',
          'fridge',
          'clock',
          'water',
          'treadmills',
          'rain',
        ].includes(layer),
    )
    const tickMs = 250
    run.timers.push(
      window.setInterval(() => {
        for (const [layer, rate] of events)
          if (Math.random() < (rate * quiet * tickMs) / 60_000) event(layer, run)
      }, tickMs),
    )
    if (layers.clock)
      run.timers.push(
        window.setInterval(
          () =>
            hiss(run.ambience, ctx.currentTime + 0.02, 0.015, {
              color: 'white',
              freq: 3200,
              q: 5,
              gain: 0.02,
            }),
          1000,
        ),
      )
    run.music = musicFor(moodFor(scene), run)
    return run
  }

  function endScene(run: Running) {
    const t = ctx.currentTime
    run.ambience.gain.setTargetAtTime(0.0001, t, 0.4)
    run.voices.gain.setTargetAtTime(0.0001, t, 0.4)
    run.music?.stop()
    for (const timer of run.timers) {
      window.clearInterval(timer)
      window.clearTimeout(timer)
    }
    window.setTimeout(() => {
      for (const source of run.sources) {
        try {
          source.stop()
        } catch {
          // Already stopped.
        }
      }
      run.ambience.disconnect()
      run.voices.disconnect()
    }, 2000)
  }

  // -------------------------------------------------------------------------
  // Music: short generated pieces with rests between, never continuous
  // -------------------------------------------------------------------------

  interface MoodStyle {
    bpm: number
    root: number
    /** Chords as scale-relative semitones from the root, one per bar. */
    chords: number[][]
    voice: 'pad' | 'pluck' | 'keys'
    bass: boolean
    /** Notes of melody a bar, roughly. */
    melody: number
    scale: number[]
  }

  const MAJOR = [0, 2, 4, 7, 9]
  const MINOR = [0, 3, 5, 7, 10]
  const STYLES: Record<Exclude<Mood, null>, MoodStyle> = {
    city: {
      bpm: 92,
      root: 57,
      chords: [
        [0, 4, 7, 11],
        [5, 9, 12, 16],
        [2, 5, 9, 12],
        [7, 11, 14, 17],
      ],
      voice: 'keys',
      bass: true,
      melody: 3,
      scale: MAJOR,
    },
    focus: {
      bpm: 70,
      root: 52,
      chords: [
        [0, 7, 11, 16],
        [5, 9, 12, 16],
        [-3, 4, 7, 12],
        [5, 12, 14, 19],
      ],
      voice: 'pad',
      bass: false,
      melody: 1,
      scale: MAJOR,
    },
    tech: {
      bpm: 104,
      root: 50,
      chords: [
        [0, 3, 7, 10],
        [-4, 3, 8, 12],
        [-2, 5, 10, 14],
        [-5, 2, 7, 10],
      ],
      voice: 'pluck',
      bass: true,
      melody: 4,
      scale: MINOR,
    },
    home: {
      bpm: 76,
      root: 55,
      chords: [
        [0, 4, 7, 14],
        [-3, 4, 9, 12],
        [5, 9, 12, 16],
        [7, 11, 14, 17],
      ],
      voice: 'keys',
      bass: true,
      melody: 2,
      scale: MAJOR,
    },
    cafe: {
      bpm: 96,
      root: 53,
      chords: [
        [0, 4, 7, 11],
        [2, 5, 9, 12],
        [7, 11, 14, 17],
        [0, 4, 9, 14],
      ],
      voice: 'pluck',
      bass: true,
      melody: 3,
      scale: MAJOR,
    },
    interview: {
      bpm: 64,
      root: 50,
      chords: [
        [0, 3, 7, 14],
        [-4, 3, 8, 12],
        [-7, 0, 5, 8],
        [-5, 2, 7, 11],
      ],
      voice: 'pad',
      bass: false,
      melody: 1,
      scale: MINOR,
    },
  }

  interface MusicPlayer {
    stop(): void
  }

  function instrument(
    to: AudioNode,
    style: MoodStyle,
    freq: number,
    at: number,
    dur: number,
    gain: number,
  ) {
    if (style.voice === 'pad') {
      tone(to, freq, at, dur, {
        type: 'triangle',
        gain,
        attack: dur * 0.35,
        release: 1,
        filter: 1400,
      })
      tone(to, freq, at, dur, {
        type: 'triangle',
        gain: gain * 0.6,
        attack: dur * 0.4,
        release: 1,
        filter: 1400,
        detune: 8,
      })
    } else if (style.voice === 'pluck') {
      tone(to, freq, at, 0.25, { type: 'triangle', gain, release: 0.25, filter: 2200 })
    } else {
      tone(to, freq, at, dur * 0.6, { type: 'sine', gain, release: 0.5 })
      tone(to, freq * 2, at, dur * 0.3, { type: 'sine', gain: gain * 0.25, release: 0.3 })
    }
  }

  function musicFor(mood: Mood, run: Running): MusicPlayer | null {
    if (!mood) return null
    const style = STYLES[mood]
    const out = ctx.createGain()
    out.gain.value = 0.0001
    out.connect(buses.music.gain)
    const beat = 60 / style.bpm
    const bar = beat * 4
    let stopped = false
    let timer = 0

    function piece(at: number) {
      // Two times round the chords, fading in and out.
      const bars = style.chords.length * 2
      out.gain.cancelScheduledValues(at)
      out.gain.setValueAtTime(0.0001, at)
      out.gain.linearRampToValueAtTime(1, at + bar)
      out.gain.setValueAtTime(1, at + bar * (bars - 1))
      out.gain.linearRampToValueAtTime(0.0001, at + bar * bars)
      for (let b = 0; b < bars; b++) {
        const start = at + b * bar
        const chord = style.chords[b % style.chords.length]
        if (style.voice === 'pad')
          chord.forEach((n) =>
            instrument(out, style, midi(style.root + n), start, bar, 0.05),
          )
        else
          for (let k = 0; k < 4; k++)
            chord.forEach((n, i) => {
              // Plucks arpeggiate the chord; keys play it on beats one and three.
              const plays = style.voice === 'pluck' ? i === k % chord.length : k % 2 === 0
              if (plays)
                instrument(
                  out,
                  style,
                  midi(style.root + n + 12),
                  start + k * beat,
                  beat,
                  0.05,
                )
            })
        if (style.bass)
          tone(out, midi(style.root + chord[0] - 12), start, bar * 0.9, {
            type: 'triangle',
            gain: 0.07,
            release: 0.3,
            filter: 500,
          })
        for (let m = 0; m < style.melody; m++)
          if (Math.random() < 0.7) {
            const n = style.root + 12 + pick(style.scale) + (Math.random() < 0.3 ? 12 : 0)
            tone(out, midi(n), start + Math.floor(rand(0, 8)) * (beat / 2), beat * 0.9, {
              type: 'sine',
              gain: 0.04,
              release: 0.4,
            })
          }
      }
      return bars * bar
    }

    function next(delay: number) {
      timer = window.setTimeout(() => {
        if (stopped) return
        const length = piece(ctx.currentTime + 0.1)
        // A rest after each piece: music now and then, not all the time.
        const rest = rand(40, 90) * (calm ? 1.6 : 1)
        next((length + rest) * 1000)
      }, delay)
    }
    next(rand(3000, 8000))
    run.timers.push(timer)
    return {
      stop() {
        stopped = true
        window.clearTimeout(timer)
        out.gain.cancelScheduledValues(ctx.currentTime)
        out.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.5)
        window.setTimeout(() => out.disconnect(), 3000)
      },
    }
  }

  function sting(kind: 'promotion' | 'achievement', level: number) {
    if (level <= 0) return
    const to = buses.music.gain
    const t = ctx.currentTime + 0.05
    const chords =
      kind === 'promotion'
        ? [
            [60, 64, 67, 72],
            [65, 69, 72, 77],
            [67, 71, 74, 79],
            [72, 76, 79, 84],
          ]
        : [
            [67, 71, 74, 79],
            [72, 76, 79, 84],
          ]
    chords.forEach((chord, i) =>
      chord.forEach((n) =>
        tone(to, midi(n), t + i * 0.5, 0.6, {
          type: 'triangle',
          gain: 0.06,
          attack: 0.08,
          release: 0.8,
          filter: 2500,
        }),
      ),
    )
  }

  return {
    play(id, { surface, level, variant }) {
      if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
      try {
        if (level > 0) effect(id, surface, variant)
      } catch {
        // A sound that cannot play is skipped.
      }
    },
    setScene(scene, next, isCalm) {
      applyLevels(next, isCalm)
      if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
      const key = sceneKey(scene)
      if (current?.key === key) return
      if (current) endScene(current)
      current = scene ? startScene(scene) : null
    },
    setLevels(next, isCalm) {
      applyLevels(next, isCalm)
    },
    sting,
    meter() {
      analyser.getFloatTimeDomainData(samples)
      let peak = 0
      for (const v of samples) peak = Math.max(peak, Math.abs(v))
      return peak
    },
    stop() {
      if (current) endScene(current)
      current = null
    },
  }
}
