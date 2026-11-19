/**
 * The jobs proxy: lets the game search Adzuna without its key ever reaching
 * the browser. A Cloudflare Worker (free tier is enough); see README.md. NOT
 * deployed by default: the game works without it, with remote jobs and the
 * German feed, and says Adzuna is not set up.
 *
 *   GET /adzuna/{country}?what=&where=&distance=&results_per_page=&max_days_old=
 *   → { country, results } from https://api.adzuna.com/v1/api/jobs/{country}/search/1
 *
 * Settings (Worker secrets and variables, never in the game's code):
 *   ADZUNA_APP_ID, ADZUNA_APP_KEY   from developer.adzuna.com (free)
 *   ALLOWED_ORIGINS                 the game's address(es), comma-separated
 */

const COUNTRIES = new Set([
  'gb',
  'us',
  'at',
  'au',
  'be',
  'br',
  'ca',
  'ch',
  'de',
  'es',
  'fr',
  'in',
  'it',
  'mx',
  'nl',
  'nz',
  'pl',
  'sg',
  'za',
])
/** Only these are passed on, each within limits. */
const PARAMS = {
  what: (v) => v.slice(0, 100),
  where: (v) => v.slice(0, 80),
  distance: (v) => String(Math.min(200, Math.max(1, parseInt(v, 10) || 25))),
  results_per_page: (v) => String(Math.min(50, Math.max(1, parseInt(v, 10) || 50))),
  max_days_old: (v) => String(Math.min(90, Math.max(1, parseInt(v, 10) || 30))),
}
const CACHE_SECONDS = 3600
/** Requests per address per minute, before "busy". */
const PER_MINUTE = 30
const recent = new Map()

function cors(origin, allowed) {
  const ok = allowed.includes(origin)
  return {
    ...(ok ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  })
}

export default {
  async fetch(request, env, ctx) {
    const allowed = String(env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const origin = request.headers.get('Origin') ?? ''
    const headers = cors(origin, allowed)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'GET') return json({ error: 'GET only' }, 405, headers)
    if (!allowed.includes(origin))
      return json({ error: 'Not allowed from here' }, 403, headers)

    const url = new URL(request.url)
    const match = /^\/adzuna\/([a-z]{2})\/?$/.exec(url.pathname)
    if (!match || !COUNTRIES.has(match[1]))
      return json({ error: 'Unknown country' }, 404, headers)
    const country = match[1]

    // A simple limit per address (per Worker instance).
    const who = request.headers.get('CF-Connecting-IP') ?? 'unknown'
    const now = Date.now()
    const times = (recent.get(who) ?? []).filter((t) => now - t < 60_000)
    if (times.length >= PER_MINUTE)
      return json({ error: 'Busy: try again in a minute' }, 429, {
        ...headers,
        'Retry-After': '60',
      })
    recent.set(who, [...times, now])

    const upstream = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`)
    upstream.searchParams.set('app_id', env.ADZUNA_APP_ID ?? '')
    upstream.searchParams.set('app_key', env.ADZUNA_APP_KEY ?? '')
    upstream.searchParams.set('content-type', 'application/json')
    for (const [name, clean] of Object.entries(PARAMS)) {
      const v = url.searchParams.get(name)
      if (v) upstream.searchParams.set(name, clean(v))
    }

    // Answers are kept an hour (by the search, not the key).
    const cacheKey = new Request(
      `https://jobs-proxy.cache/${country}?${new URLSearchParams([...url.searchParams].sort())}`,
    )
    const cache = caches.default
    const hit = await cache.match(cacheKey)
    if (hit)
      return new Response(hit.body, {
        status: hit.status,
        headers: { ...Object.fromEntries(hit.headers), ...headers },
      })

    let res
    try {
      res = await fetch(upstream, { headers: { Accept: 'application/json' } })
    } catch {
      return json({ error: 'Adzuna could not be reached' }, 502, headers)
    }
    if (!res.ok)
      return json(
        { error: `Adzuna answered ${res.status}` },
        res.status === 429 ? 429 : 502,
        headers,
      )
    const data = await res.json()
    const out = json(
      { country, results: Array.isArray(data.results) ? data.results : [] },
      200,
      {
        ...headers,
        'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
      },
    )
    ctx.waitUntil(cache.put(cacheKey, out.clone()))
    return out
  },
}
