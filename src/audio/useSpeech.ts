/**
 * Speaks a conversation's lines aloud as they appear (see speech.ts), for the
 * conversation panels: what a colleague says, a story scene, a scenario's
 * beat. Each new set of lines is said once; closing the panel stops it.
 */
import { useEffect } from 'react'
import { hush, say, type Speaker } from './speech'
import { useAudioSettings } from './useAudio'

export function useSpokenLines(
  lines: string[] | null | undefined,
  who: Speaker | null,
): void {
  const settings = useAudioSettings()
  const text = lines?.join('\n') ?? ''
  const id = who?.id ?? ''
  const personality = who?.personality
  useEffect(() => {
    if (!text || !id) return
    say(text.split('\n'), { id, personality }, settings)
    // Settings are read when a line starts; changing them mid-line does not repeat it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, id, personality])
  useEffect(() => () => hush(), [])
}
