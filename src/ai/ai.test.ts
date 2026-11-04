import { describe, expect, it, vi } from 'vitest'
import {
  allowedOrigin,
  configFrom,
  createBridge,
  parseEnvFile,
} from '../../scripts/ai-bridge/core.ts'
import { explainFormula } from './builtin/formula'
import { builtinAnswer, intentOf } from './builtin/guide'
import { actionItems, reviewWriting, summarise } from './builtin/text'
import { buildContext, ITEM_LIMIT, redactName, TOTAL_LIMIT, toModelText } from './context'
import { bridgeEngine, localEngine } from './engines'
import { systemPrompt } from './prompt'
import { askAi } from './service'
import {
  countRequest,
  DEFAULT_AI_SETTINGS,
  effectiveEngine,
  isLocalAddress,
  readAiSettings,
  usedToday,
  writeAiSettings,
  type AiSettings,
} from './settings'
import type { AiRequest, ContextItem } from './types'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (n) => [...data.keys()][n] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  }
}

const EMAIL = `Hi Sam,

Welcome to the team! Let's start you off with something we do every month.

Tom has collected everyone's requests for office supplies in a spreadsheet. Could you please work out the line totals and the order total by Friday? Make sure the prices are formatted as money.

Thanks,
Priya`

function request(
  text: string,
  items: ContextItem[] = [],
  extra: Partial<AiRequest> = {},
): AiRequest {
  return {
    messages: [{ role: 'user', text }],
    context: buildContext(items, 'Sam Taylor'),
    mode: 'learning',
    ...extra,
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

describe('context', () => {
  it("takes the player's name out, in full and in parts", () => {
    expect(
      redactName('Thanks Sam Taylor, and Sam again; Samantha stays', 'Sam Taylor'),
    ).toBe('Thanks the employee, and the employee again; Samantha stays')
  })

  it('keeps each item and the whole request within the limits', () => {
    const big = 'x'.repeat(ITEM_LIMIT * 2)
    const context = buildContext(
      [
        { kind: 'document', label: 'A', text: big },
        { kind: 'document', label: 'B', text: big },
        { kind: 'document', label: 'C', text: big },
      ],
      'Sam',
    )
    const total = context.items.reduce((n, i) => n + i.text.length, 0)
    expect(total).toBeLessThanOrEqual(TOTAL_LIMIT + 200)
    expect(context.items[0].text.length).toBeLessThanOrEqual(ITEM_LIMIT + 80)
    expect(context.trimmed).toBeGreaterThan(0)
    expect(context.items[0].text).toContain('more characters not included')
  })

  it('never sends the structured data the built-in guide uses', () => {
    const context = buildContext(
      [
        {
          kind: 'assignment',
          label: 'Task',
          text: 'Brief',
          data: { secretSteps: ['hidden'] },
        },
      ],
      'Sam',
    )
    expect(toModelText(context)).toBe('## Task\nBrief')
    expect(systemPrompt({ messages: [], context, mode: 'learning' })).not.toContain(
      'hidden',
    )
  })

  it('tells the model the mode and that only what is shown was shared', () => {
    const prompt = systemPrompt(
      request('Help', [{ kind: 'email', label: 'Email', text: EMAIL }]),
    )
    expect(prompt).toContain('Mode: Learning')
    expect(prompt).toContain('only this has been shared')
    expect(prompt).not.toContain('Sam')
  })
})

describe('settings and usage', () => {
  it('only allows addresses on this computer', () => {
    expect(isLocalAddress('http://localhost:11434')).toBe(true)
    expect(isLocalAddress('http://127.0.0.1:8787')).toBe(true)
    expect(isLocalAddress('https://api.example.com')).toBe(false)
    expect(isLocalAddress('not a url')).toBe(false)
  })

  it('defaults to the built-in guide, and needs consent for anything else', () => {
    expect(DEFAULT_AI_SETTINGS.engine).toBe('builtin')
    expect(DEFAULT_AI_SETTINGS.consent).toBe(false)
    expect(effectiveEngine({ ...DEFAULT_AI_SETTINGS, engine: 'bridge' })).toBe('builtin')
    expect(
      effectiveEngine({ ...DEFAULT_AI_SETTINGS, engine: 'bridge', consent: true }),
    ).toBe('bridge')
  })

  it('saves settings, and ignores damaged or unsafe ones', () => {
    const store = memoryStorage()
    writeAiSettings({ ...DEFAULT_AI_SETTINGS, mode: 'expert' }, store)
    expect(readAiSettings(store).mode).toBe('expert')
    store.setItem(
      'gamhub-worksim:ai-settings',
      JSON.stringify({ bridge: { url: 'https://evil.example' } }),
    )
    expect(readAiSettings(store)).toEqual(DEFAULT_AI_SETTINGS)
    store.setItem('gamhub-worksim:ai-settings', '{not json')
    expect(readAiSettings(store)).toEqual(DEFAULT_AI_SETTINGS)
  })

  it('counts requests per day', () => {
    const store = memoryStorage()
    const monday = new Date('2026-11-02T10:00:00Z')
    countRequest(monday, store)
    countRequest(monday, store)
    expect(usedToday(monday, store)).toBe(2)
    expect(usedToday(new Date('2026-11-03T10:00:00Z'), store)).toBe(0)
  })
})

describe('built-in guide', () => {
  it('explains formulas with the spreadsheet’s own function descriptions', () => {
    const explanation = explainFormula('=SUM(B2:B10)*$C$1')
    expect(explanation.reading).toBe('SUM(B2:B10) multiplied by $C$1')
    expect(explanation.functions[0]).toMatch(/^SUM: /)
    expect(explanation.notes[0]).toContain('absolute')
    expect(explainFormula('=SUMM(A1)').functions[0]).toContain('not a function')
    expect(explainFormula('=SUM(A1').problem).toContain('cannot be read')
  })

  it('explains the error a cell shows', () => {
    const answer = builtinAnswer(
      request('Why is this formula not working?', [
        {
          kind: 'formula',
          label: 'Cell D2',
          text: '=B2/C2',
          data: { formula: '=B2/C2', value: '#DIV/0!' },
        },
      ]),
    )
    expect(answer.text).toContain('#DIV/0!')
    expect(answer.text).toContain('divides by zero')
    expect(answer.source).toEqual({
      engine: 'builtin',
      label: 'Built-in guide',
      model: false,
    })
  })

  it('summarises and lists action items from an email', () => {
    expect(summarise(EMAIL)[0]).toContain('Welcome to the team')
    const items = actionItems(EMAIL)
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ when: 'by Friday' })
    const answer = builtinAnswer(
      request('What are the action items?', [
        { kind: 'email', label: 'Email', text: EMAIL },
      ]),
    )
    expect(answer.text).toContain('timing: by Friday')
  })

  it('outlines a reply rather than writing it, in Learning mode', () => {
    const answer = builtinAnswer(
      request('Help me respond to this', [
        { kind: 'email', label: 'Email', text: EMAIL },
      ]),
    )
    expect(answer.text).toContain('Write it yourself')
    expect(answer.text).toContain('Your answer to:')
  })

  it('plans a task step by step in Learning mode, and in full otherwise', () => {
    const task: ContextItem = {
      kind: 'assignment',
      label: 'Price the office supplies order',
      text: 'Brief…',
      data: {
        steps: ['Look at the order', 'Work out line totals'],
        hints: ['Read the columns', 'Use ='],
        done: 1,
      },
    }
    const learning = builtinAnswer(request('How should I approach this?', [task]))
    expect(learning.text).toContain('Work out line totals')
    expect(learning.text).not.toContain('1. Look at the order')
    const pro = builtinAnswer(
      request('How should I approach this?', [task], { mode: 'professional' }),
    )
    expect(pro.text).toContain('1. Look at the order')
  })

  it('reviews writing style', () => {
    const review = reviewWriting(
      'The report was prepared by the team. Hey this is gonna be great!! It is fine.',
    )
    expect(review.passive).toBe(1)
    expect(review.informal).toHaveLength(1)
  })

  it('says it is not an AI model when it cannot help', () => {
    const answer = builtinAnswer(request('What is the meaning of life?'))
    expect(intentOf(request('What is the meaning of life?'))).toBe('other')
    expect(answer.text).toContain('not an AI model')
  })
})

describe('engines and the service', () => {
  const consented: AiSettings = {
    ...DEFAULT_AI_SETTINGS,
    consent: true,
    engine: 'local',
    local: { url: 'http://localhost:11434', model: 'llama3.2' },
  }

  it('answers with the built-in guide when no model is turned on, without any network', async () => {
    const fetcher = vi.fn()
    const answer = await askAi(request('Tips for prompts?'), DEFAULT_AI_SETTINGS, {
      fetcher,
      storage: memoryStorage(),
    })
    expect(answer.source.model).toBe(false)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('asks a local model with the system prompt and conversation', async () => {
    const fetcher = vi.fn(async () =>
      json({ choices: [{ message: { content: 'Use SUM.' } }] }),
    ) as unknown as typeof fetch
    const answer = await askAi(request('Help'), consented, {
      fetcher,
      storage: memoryStorage(),
    })
    expect(answer).toMatchObject({
      text: 'Use SUM.',
      source: { engine: 'local', label: 'Local model · llama3.2', model: true },
    })
    const [url, init] = (
      fetcher as unknown as { mock: { calls: [string, RequestInit][] } }
    ).mock.calls[0]
    expect(url).toBe('http://localhost:11434/v1/chat/completions')
    const body = JSON.parse(String(init.body))
    expect(body.model).toBe('llama3.2')
    expect(body.messages[0].role).toBe('system')
  })

  it('falls back to the built-in guide, saying why, when the model cannot answer', async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    const answer = await askAi(request('Tips for prompts?'), consented, {
      fetcher,
      storage: memoryStorage(),
    })
    expect(answer.source.model).toBe(false)
    expect(answer.fallback).toContain('No local model is answering')
  })

  it('stops a model that takes too long', async () => {
    const fetcher = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_, reject) =>
          init.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
        ),
    ) as unknown as typeof fetch
    const answer = await askAi(request('Help'), consented, {
      fetcher,
      storage: memoryStorage(),
      timeoutMs: 20,
    })
    expect(answer.fallback).toContain('took too long')
  })

  it('keeps to the daily limit', async () => {
    const store = memoryStorage()
    const fetcher = vi.fn(async () =>
      json({ choices: [{ message: { content: 'ok' } }] }),
    ) as unknown as typeof fetch
    const limited = { ...consented, dailyLimit: 1 }
    expect(
      (await askAi(request('Help'), limited, { fetcher, storage: store })).source.model,
    ).toBe(true)
    const second = await askAi(request('Help'), limited, { fetcher, storage: store })
    expect(second.source.model).toBe(false)
    expect(second.fallback).toContain('limit')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('refuses addresses that are not on this computer', async () => {
    const engine = localEngine({ url: 'https://example.com', model: 'x' }, vi.fn())
    await expect(
      engine.answer(request('Hi'), new AbortController().signal),
    ).rejects.toThrow('Only addresses on this computer')
  })

  it('reports the bridge’s state in plain words', async () => {
    const engine = bridgeEngine(
      { url: 'http://127.0.0.1:8787', provider: 'openai', model: '' },
      vi.fn(async () =>
        json({ providers: { openai: { ready: false, model: null } }, limit: 5, used: 0 }),
      ) as unknown as typeof fetch,
    )
    expect(await engine.check(new AbortController().signal)).toEqual({
      ready: false,
      reason: 'The bridge has no OpenAI key or model set up.',
    })
  })
})

describe('the AI bridge', () => {
  const ORIGIN = 'http://localhost:5173'
  const config = configFrom({
    ANTHROPIC_API_KEY: 'sk-test-key',
    OPENAI_API_KEY: 'sk-openai',
    OPENAI_MODEL: 'test-openai-model',
    AI_BRIDGE_DAILY_LIMIT: '2',
  })
  const chat = (provider: string, extra = {}) => ({
    method: 'POST',
    path: '/v1/chat',
    origin: ORIGIN,
    body: JSON.stringify({
      provider,
      system: 'You are helpful.',
      messages: [{ role: 'user', text: 'Hello' }],
      ...extra,
    }),
  })

  it('reads settings, with a default model only for Anthropic', () => {
    expect(config.models.anthropic).toBe('claude-haiku-5-5')
    expect(configFrom({}).models.google).toBeUndefined()
    expect(parseEnvFile('# comment\nA=1\nB="two"\n')).toEqual({ A: '1', B: 'two' })
  })

  it('only answers WorkSim pages served from this computer', async () => {
    expect(allowedOrigin('http://localhost:5173')).toBe(true)
    expect(allowedOrigin('https://evil.example')).toBe(false)
    const handle = createBridge(config, vi.fn())
    const refused = await handle({ ...chat('anthropic'), origin: 'https://evil.example' })
    expect(refused.status).toBe(403)
    expect(refused.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('sends Anthropic the right request and returns only the text and model', async () => {
    const fetcher = vi.fn(async () =>
      json({ content: [{ type: 'text', text: 'Hi there' }] }),
    )
    const handle = createBridge(config, fetcher as unknown as typeof fetch)
    const response = await handle(chat('anthropic'))
    expect(response.status).toBe(200)
    expect(JSON.parse(response.body)).toEqual({
      text: 'Hi there',
      model: 'claude-haiku-5-5',
    })
    expect(response.body).not.toContain('sk-test-key')
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('sk-test-key')
    const body = JSON.parse(String(init.body))
    expect(body).toMatchObject({ model: 'claude-haiku-5-5', system: 'You are helpful.' })
    expect(body.messages).toEqual([{ role: 'user', content: 'Hello' }])
  })

  it('sends OpenAI and Google their own formats', async () => {
    const fetcher = vi.fn(async (url: string) =>
      url.includes('openai')
        ? json({ choices: [{ message: { content: 'From OpenAI' } }] })
        : json({ candidates: [{ content: { parts: [{ text: 'From Google' }] } }] }),
    )
    const handle = createBridge(
      configFrom({
        OPENAI_API_KEY: 'a',
        OPENAI_MODEL: 'm1',
        GEMINI_API_KEY: 'b',
        GEMINI_MODEL: 'm2',
      }),
      fetcher as unknown as typeof fetch,
    )
    expect(JSON.parse((await handle(chat('openai'))).body).text).toBe('From OpenAI')
    expect(JSON.parse((await handle(chat('google'))).body).text).toBe('From Google')
    const google = fetcher.mock.calls[1] as unknown as [string, RequestInit]
    expect(google[0]).toContain('/models/m2:generateContent')
    expect(JSON.parse(String(google[1].body)).contents[0]).toEqual({
      role: 'user',
      parts: [{ text: 'Hello' }],
    })
  })

  it('explains missing keys, bad requests, refusals and the daily limit', async () => {
    const fetcher = vi.fn(async () => json({ error: 'nope' }, 401))
    const handle = createBridge(config, fetcher as unknown as typeof fetch)
    expect((await handle(chat('google'))).status).toBe(503)
    expect(
      (await handle({ ...chat('anthropic'), body: '{"provider":"anthropic"}' })).status,
    ).toBe(400)
    const refused = await handle(chat('anthropic'))
    expect(JSON.parse(refused.body).error).toBe('The provider refused the API key.')
    await handle(chat('anthropic'))
    const limited = await handle(chat('anthropic'))
    expect(limited.status).toBe(429)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('reports which providers are ready, without revealing keys', async () => {
    const handle = createBridge(config, vi.fn())
    const response = await handle({ method: 'GET', path: '/v1/status', origin: ORIGIN })
    expect(JSON.parse(response.body)).toEqual({
      providers: {
        anthropic: { ready: true, model: 'claude-haiku-5-5' },
        openai: { ready: true, model: 'test-openai-model' },
        google: { ready: false, model: null },
      },
      limit: 2,
      used: 0,
    })
    expect(response.body).not.toContain('sk-')
  })
})
