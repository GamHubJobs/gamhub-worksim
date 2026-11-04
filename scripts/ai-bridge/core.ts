/**
 * The WorkSim AI bridge: a small server that runs on the player's own
 * computer and passes WorkSim AI's requests to a cloud AI provider
 * (Anthropic, OpenAI or Google). It exists so that API keys never reach the
 * browser: they are read from the environment (or a .env.local file, which
 * git ignores) and used only here.
 *
 * Safety: it listens only on this computer, answers only pages served from
 * this computer, caps requests per day and their size, stops slow requests,
 * and never logs what is asked or answered.
 *
 * This file is the logic, without the network server (see serve.ts), so it
 * can be tested with a pretend provider.
 */

export type ProviderId = 'anthropic' | 'openai' | 'google'

export interface BridgeConfig {
  keys: Partial<Record<ProviderId, string>>
  models: Partial<Record<ProviderId, string>>
  dailyLimit: number
  maxTokens: number
  timeoutMs: number
}

/** Settings from environment variables. Only Anthropic has a default model. */
export function configFrom(env: Record<string, string | undefined>): BridgeConfig {
  const number = (value: string | undefined, fallback: number) => {
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
  }
  return {
    keys: {
      anthropic: env.ANTHROPIC_API_KEY || undefined,
      openai: env.OPENAI_API_KEY || undefined,
      google: env.GEMINI_API_KEY || env.GOOGLE_API_KEY || undefined,
    },
    models: {
      anthropic: env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
      openai: env.OPENAI_MODEL || undefined,
      google: env.GEMINI_MODEL || undefined,
    },
    dailyLimit: number(env.AI_BRIDGE_DAILY_LIMIT, 100),
    maxTokens: number(env.AI_BRIDGE_MAX_TOKENS, 800),
    timeoutMs: number(env.AI_BRIDGE_TIMEOUT_MS, 40_000),
  }
}

/** Reads KEY=value lines (as in a .env file). */
export function parseEnvFile(text: string): Record<string, string> {
  const env: Record<string, string> = {}
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!match || line.trim().startsWith('#')) continue
    env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return env
}

/** Pages allowed to use the bridge: WorkSim served from this computer. */
export function allowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false
  try {
    const { protocol, hostname } = new URL(origin)
    return (
      (protocol === 'http:' || protocol === 'https:') &&
      (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]')
    )
  } catch {
    return false
  }
}

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

interface ChatRequest {
  provider: ProviderId
  model?: string
  system: string
  messages: ChatMessage[]
}

const MAX_MESSAGES = 40
const MAX_CHARACTERS = 60_000

function validChat(body: unknown): ChatRequest | string {
  if (!body || typeof body !== 'object') return 'The request was not understood.'
  const b = body as Record<string, unknown>
  if (b.provider !== 'anthropic' && b.provider !== 'openai' && b.provider !== 'google')
    return 'Unknown provider.'
  if (b.model !== undefined && (typeof b.model !== 'string' || b.model.length > 100))
    return 'The model name is not valid.'
  if (typeof b.system !== 'string') return 'The request was not understood.'
  if (
    !Array.isArray(b.messages) ||
    b.messages.length === 0 ||
    b.messages.length > MAX_MESSAGES
  )
    return 'The conversation is empty or too long.'
  const messages: ChatMessage[] = []
  for (const m of b.messages) {
    const message = m as Record<string, unknown>
    if (
      (message.role !== 'user' && message.role !== 'assistant') ||
      typeof message.text !== 'string'
    )
      return 'The request was not understood.'
    messages.push({ role: message.role, text: message.text })
  }
  if (messages[messages.length - 1].role !== 'user')
    return 'The last message must be from the user.'
  const size = b.system.length + messages.reduce((n, m) => n + m.text.length, 0)
  if (size > MAX_CHARACTERS) return 'The request is too large.'
  return { provider: b.provider, model: b.model, system: b.system, messages }
}

type Fetch = typeof fetch

/** The provider's API call and how to read its reply. */
function providerCall(
  chat: ChatRequest,
  model: string,
  key: string,
  maxTokens: number,
): { url: string; init: RequestInit; read: (body: unknown) => string | undefined } {
  switch (chat.provider) {
    case 'anthropic':
      return {
        url: 'https://api.anthropic.com/v1/messages',
        init: {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            system: chat.system,
            messages: chat.messages.map((m) => ({ role: m.role, content: m.text })),
          }),
        },
        read: (body) =>
          (body as { content?: Array<{ type: string; text?: string }> }).content
            ?.filter((part) => part.type === 'text')
            .map((part) => part.text ?? '')
            .join(''),
      }
    case 'openai':
      return {
        url: 'https://api.openai.com/v1/chat/completions',
        init: {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model,
            max_completion_tokens: maxTokens,
            messages: [
              { role: 'system', content: chat.system },
              ...chat.messages.map((m) => ({ role: m.role, content: m.text })),
            ],
          }),
        },
        read: (body) =>
          (body as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]
            ?.message?.content,
      }
    case 'google':
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        init: {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: chat.system }] },
            contents: chat.messages.map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.text }],
            })),
            generationConfig: { maxOutputTokens: maxTokens },
          }),
        },
        read: (body) =>
          (
            body as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
            }
          ).candidates?.[0]?.content?.parts
            ?.map((part) => part.text ?? '')
            .join(''),
      }
  }
}

export interface BridgeRequest {
  method: string
  path: string
  origin?: string
  body?: string
}

export interface BridgeResponse {
  status: number
  headers: Record<string, string>
  body: string
}

export function createBridge(
  config: BridgeConfig,
  fetcher: Fetch = fetch,
  now: () => Date = () => new Date(),
) {
  let day = ''
  let used = 0
  const usedToday = () => {
    const today = now().toISOString().slice(0, 10)
    if (today !== day) {
      day = today
      used = 0
    }
    return used
  }

  const status = () => ({
    providers: Object.fromEntries(
      (['anthropic', 'openai', 'google'] as const).map((id) => [
        id,
        {
          ready: !!config.keys[id] && !!config.models[id],
          model: config.models[id] ?? null,
        },
      ]),
    ),
    limit: config.dailyLimit,
    used: usedToday(),
  })

  return async function handle(request: BridgeRequest): Promise<BridgeResponse> {
    const cors: Record<string, string> = allowedOrigin(request.origin)
      ? {
          'access-control-allow-origin': request.origin!,
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
          vary: 'Origin',
        }
      : {}
    const reply = (code: number, body: unknown): BridgeResponse => ({
      status: code,
      headers: { 'content-type': 'application/json', ...cors },
      body: JSON.stringify(body),
    })

    if (!allowedOrigin(request.origin))
      return reply(403, {
        error: 'Only WorkSim running on this computer can use the bridge.',
      })
    if (request.method === 'OPTIONS') return { status: 204, headers: cors, body: '' }
    if (request.method === 'GET' && request.path === '/v1/status')
      return reply(200, status())
    if (request.method !== 'POST' || request.path !== '/v1/chat')
      return reply(404, { error: 'Not found.' })

    let parsed: unknown
    try {
      parsed = JSON.parse(request.body ?? '')
    } catch {
      return reply(400, { error: 'The request was not understood.' })
    }
    const chat = validChat(parsed)
    if (typeof chat === 'string') return reply(400, { error: chat })

    const key = config.keys[chat.provider]
    const model = chat.model || config.models[chat.provider]
    if (!key)
      return reply(503, {
        error: `No API key is set up for ${chat.provider} in the bridge.`,
      })
    if (!model)
      return reply(503, {
        error: `No model is set up for ${chat.provider} in the bridge.`,
      })
    if (usedToday() >= config.dailyLimit)
      return reply(429, {
        error: `The bridge's daily limit of ${config.dailyLimit} requests has been reached.`,
      })

    used += 1
    const call = providerCall(chat, model, key, config.maxTokens)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), config.timeoutMs)
    try {
      const response = await fetcher(call.url, {
        ...call.init,
        signal: controller.signal,
      })
      let body: unknown = null
      try {
        body = await response.json()
      } catch {
        // Read below as an empty reply.
      }
      if (!response.ok) {
        const reason =
          response.status === 401 || response.status === 403
            ? 'The provider refused the API key.'
            : response.status === 429
              ? 'The provider is limiting requests (or the account has no credit).'
              : `The provider answered with an error (${response.status}).`
        return reply(502, { error: reason })
      }
      const text = call.read(body)?.trim()
      if (!text) return reply(502, { error: 'The provider sent an empty reply.' })
      return reply(200, { text, model })
    } catch {
      return reply(504, {
        error: controller.signal.aborted
          ? 'The provider took too long to answer.'
          : 'The provider could not be reached (is this computer online?).',
      })
    } finally {
      clearTimeout(timer)
    }
  }
}
