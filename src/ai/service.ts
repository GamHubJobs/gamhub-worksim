/**
 * Asks WorkSim AI. Chooses the engine from the settings (the built-in guide
 * unless the player has turned a model on and agreed to send requests to
 * it), applies the daily limit and a time limit, and when a model cannot
 * answer, says why and answers with the built-in guide instead. A built-in
 * answer is always labelled as such.
 */
import { builtinAnswer, builtinEngine } from './builtin/guide'
import { bridgeEngine, localEngine } from './engines'
import { countRequest, effectiveEngine, usedToday, type AiSettings } from './settings'
import { EngineError, type AiAnswer, type AiRequest, type Engine } from './types'

/** Longest a model may take to answer. */
export const TIMEOUT_MS = 45_000

export function engineFor(settings: AiSettings, fetcher: typeof fetch = fetch): Engine {
  switch (effectiveEngine(settings)) {
    case 'local':
      return localEngine(settings.local, fetcher)
    case 'bridge':
      return bridgeEngine(settings.bridge, fetcher)
    default:
      return builtinEngine
  }
}

export interface AskOptions {
  signal?: AbortSignal
  fetcher?: typeof fetch
  now?: Date
  storage?: Storage | null
  timeoutMs?: number
}

export async function askAi(
  request: AiRequest,
  settings: AiSettings,
  options: AskOptions = {},
): Promise<AiAnswer> {
  const engine = engineFor(settings, options.fetcher)
  if (engine.id === 'builtin') return builtinAnswer(request)

  const fallback = (reason: string): AiAnswer => ({
    ...builtinAnswer(request),
    fallback: reason,
  })

  if (usedToday(options.now, options.storage) >= settings.dailyLimit)
    return fallback(
      `Today's limit of ${settings.dailyLimit} AI requests on this computer has been reached (you can change it in WorkSim AI settings).`,
    )

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? TIMEOUT_MS)
  const stop = () => controller.abort()
  options.signal?.addEventListener('abort', stop)
  try {
    countRequest(options.now, options.storage)
    return await engine.answer(request, controller.signal)
  } catch (error) {
    if (options.signal?.aborted) throw new EngineError('Stopped.', 'timeout')
    const reason =
      error instanceof EngineError ? error.message : 'The AI engine could not answer.'
    return fallback(reason)
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', stop)
  }
}
