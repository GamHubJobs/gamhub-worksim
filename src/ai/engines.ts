/**
 * The optional engines: a model running on this computer (any server with an
 * OpenAI-compatible API, such as Ollama or LM Studio), and the WorkSim AI
 * bridge (scripts/ai-bridge.mjs), a small server on this computer that holds
 * the API keys for cloud providers. Neither is used without the player's
 * consent; both are only ever reached at addresses on this computer.
 */
import { systemPrompt } from './prompt'
import { isLocalAddress, type AiSettings } from './settings'
import {
  EngineError,
  type AiAnswer,
  type AiRequest,
  type Availability,
  type Engine,
} from './types'

type Fetch = typeof fetch

/** Turns network failures into messages a player can act on. */
async function call(
  fetcher: Fetch,
  url: string,
  init: RequestInit,
  unreachable: string,
): Promise<Response> {
  if (!isLocalAddress(url))
    throw new EngineError('Only addresses on this computer can be used.', 'refused')
  try {
    return await fetcher(url, init)
  } catch {
    if (init.signal?.aborted)
      throw new EngineError('The request took too long and was stopped.', 'timeout')
    throw new EngineError(unreachable, 'unavailable')
  }
}

async function json(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new EngineError('The engine sent a reply WorkSim could not read.', 'bad-reply')
  }
}

function chatMessages(request: AiRequest) {
  return [
    { role: 'system' as const, content: systemPrompt(request) },
    ...request.messages.map((m) => ({ role: m.role, content: m.text })),
  ]
}

// ---------------------------------------------------------------------------
// A model on this computer
// ---------------------------------------------------------------------------

export function localEngine(
  settings: AiSettings['local'],
  fetcher: Fetch = fetch,
): Engine {
  const base = settings.url.replace(/\/+$/, '')
  const unreachable = `No local model is answering at ${base}. Start it (for example, Ollama) and try again.`
  return {
    id: 'local',
    async check(signal): Promise<Availability> {
      if (!settings.model.trim())
        return {
          ready: false,
          reason: 'Choose which local model to use in WorkSim AI settings.',
        }
      try {
        const response = await call(fetcher, `${base}/v1/models`, { signal }, unreachable)
        return response.ok
          ? { ready: true }
          : {
              ready: false,
              reason: `The local model server answered with an error (${response.status}).`,
            }
      } catch (error) {
        return { ready: false, reason: (error as Error).message }
      }
    },
    async answer(request, signal): Promise<AiAnswer> {
      const response = await call(
        fetcher,
        `${base}/v1/chat/completions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: settings.model,
            messages: chatMessages(request),
            stream: false,
          }),
          signal,
        },
        unreachable,
      )
      if (!response.ok)
        throw new EngineError(
          `The local model answered with an error (${response.status}).`,
          'unavailable',
        )
      const body = (await json(response)) as {
        choices?: Array<{ message?: { content?: string } }>
      }
      const text = body.choices?.[0]?.message?.content?.trim()
      if (!text)
        throw new EngineError('The local model sent an empty reply.', 'bad-reply')
      return {
        text,
        source: {
          engine: 'local',
          label: `Local model · ${settings.model}`,
          model: true,
        },
      }
    },
  }
}

// ---------------------------------------------------------------------------
// The WorkSim AI bridge (cloud providers, keys held by the bridge)
// ---------------------------------------------------------------------------

export const PROVIDER_NAMES = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
} as const

export interface BridgeStatus {
  providers: Partial<
    Record<keyof typeof PROVIDER_NAMES, { ready: boolean; model: string | null }>
  >
  limit: number
  used: number
}

export function bridgeEngine(
  settings: AiSettings['bridge'],
  fetcher: Fetch = fetch,
): Engine & {
  status(signal: AbortSignal): Promise<BridgeStatus>
} {
  const base = settings.url.replace(/\/+$/, '')
  const provider = PROVIDER_NAMES[settings.provider]
  const unreachable = `The WorkSim AI bridge is not running at ${base}. Start it with "npm run ai-bridge" (see the handbook).`

  async function status(signal: AbortSignal): Promise<BridgeStatus> {
    const response = await call(fetcher, `${base}/v1/status`, { signal }, unreachable)
    if (!response.ok)
      throw new EngineError(
        `The bridge answered with an error (${response.status}).`,
        'unavailable',
      )
    return (await json(response)) as BridgeStatus
  }

  return {
    id: 'bridge',
    status,
    async check(signal): Promise<Availability> {
      try {
        const s = await status(signal)
        const p = s.providers[settings.provider]
        if (!p?.ready)
          return {
            ready: false,
            reason: `The bridge has no ${provider} key or model set up.`,
          }
        if (s.used >= s.limit)
          return {
            ready: false,
            reason: `The bridge's daily limit (${s.limit} requests) has been reached.`,
          }
        return { ready: true }
      } catch (error) {
        return { ready: false, reason: (error as Error).message }
      }
    },
    async answer(request, signal): Promise<AiAnswer> {
      const response = await call(
        fetcher,
        `${base}/v1/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: settings.provider,
            model: settings.model || undefined,
            system: systemPrompt(request),
            messages: request.messages.map((m) => ({ role: m.role, text: m.text })),
          }),
          signal,
        },
        unreachable,
      )
      const body = (await json(response)) as {
        text?: string
        model?: string
        error?: string
      }
      if (response.status === 429)
        throw new EngineError(body.error ?? 'The daily limit has been reached.', 'limit')
      if (!response.ok)
        throw new EngineError(
          body.error ?? `The bridge answered with an error (${response.status}).`,
          'unavailable',
        )
      const text = body.text?.trim()
      if (!text) throw new EngineError(`${provider} sent an empty reply.`, 'bad-reply')
      return {
        text,
        source: {
          engine: 'bridge',
          label: `${provider} · ${body.model ?? 'model'}`,
          model: true,
        },
      }
    },
  }
}
