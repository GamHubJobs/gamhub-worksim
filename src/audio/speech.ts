/**
 * Spoken dialogue: what people say in conversations, read aloud with the
 * browser's own speech voices (free, offline, nothing sent anywhere). Each
 * person keeps the same voice every time (chosen from the voices the browser
 * has, by who they are), with a pitch and pace that suit their personality;
 * stage directions ("*She smiles.*") are not read. It follows the People
 * volume and the mute switch, can be turned off in the sound settings, and
 * stops when the conversation closes. The words are always on screen too.
 */
import type { AudioSettings } from './settings'

export interface Speaker {
  /** Who it is (the same person always gets the same voice). */
  id: string
  personality?: 'warm' | 'quiet' | 'chatty' | 'dry' | 'focused'
}

const PACE: Record<
  NonNullable<Speaker['personality']>,
  { rate: number; pitch: number }
> = {
  warm: { rate: 1.0, pitch: 1.05 },
  quiet: { rate: 0.92, pitch: 0.95 },
  chatty: { rate: 1.1, pitch: 1.1 },
  dry: { rate: 0.95, pitch: 0.9 },
  focused: { rate: 1.02, pitch: 1.0 },
}

/** A small, fixed hash, so a person's voice does not change between visits. */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/** The lines worth saying aloud: spoken words, not "*actions*". */
export function spokenText(lines: string[]): string {
  return lines
    .filter((l) => !(l.trim().startsWith('*') && l.trim().endsWith('*')))
    .map((l) => l.replace(/^[A-Z][a-z]+: /, '').replace(/[“”"]/g, ''))
    .join(' ')
    .trim()
}

/** How loud speech should be (0 to 1), from the sound settings; 0 when off. */
export function speechVolume(settings: AudioSettings): number {
  if (settings.muted || !settings.speech || !settings.categories.voices.on) return 0
  return (settings.master / 100) * (settings.categories.voices.volume / 100)
}

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis
    : null
}

/** The English voices the browser has (in a fixed order). */
function voices(): SpeechSynthesisVoice[] {
  const all = synth()?.getVoices() ?? []
  const english = all.filter((v) => v.lang.toLowerCase().startsWith('en'))
  return (english.length ? english : all).sort((a, b) => a.name.localeCompare(b.name))
}

/** The voice a person speaks with (the same every time), if the browser has any. */
export function voiceFor(id: string, list = voices()): SpeechSynthesisVoice | null {
  return list.length ? list[hash(id) % list.length] : null
}

/** Says what someone says (stopping whatever was being said). Nothing if speech is off. */
export function say(lines: string[], who: Speaker, settings: AudioSettings): boolean {
  const s = synth()
  const volume = speechVolume(settings)
  const text = spokenText(lines)
  if (!s || volume <= 0 || !text) return false
  s.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voice = voiceFor(who.id)
  if (voice) u.voice = voice
  const pace = PACE[who.personality ?? 'focused']
  // Small differences between people with the same personality.
  const h = hash(who.id)
  u.rate = pace.rate + ((h % 7) - 3) * 0.015
  u.pitch = pace.pitch + ((h % 5) - 2) * 0.04
  u.volume = Math.min(1, volume)
  s.speak(u)
  return true
}

/** Stops speaking (a conversation closed, a scene changed). */
export function hush(): void {
  synth()?.cancel()
}
