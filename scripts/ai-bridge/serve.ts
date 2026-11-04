/**
 * Starts the WorkSim AI bridge on this computer: `npm run ai-bridge`.
 *
 * Put the API key(s) in a file called .env.local next to package.json (git
 * ignores it), for example:
 *
 *   ANTHROPIC_API_KEY=...
 *   ANTHROPIC_MODEL=claude-haiku-5-5   (optional; this is the default)
 *   OPENAI_API_KEY=...       and  OPENAI_MODEL=<a model your account can use>
 *   GEMINI_API_KEY=...       and  GEMINI_MODEL=<a model your account can use>
 *   AI_BRIDGE_DAILY_LIMIT=100   AI_BRIDGE_PORT=8787
 *
 * Requests to a cloud provider are paid for by the account the key belongs
 * to. The bridge never logs what is asked or answered.
 */
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { configFrom, createBridge, parseEnvFile } from './core.ts'

let fileEnv: Record<string, string> = {}
try {
  fileEnv = parseEnvFile(
    readFileSync(new URL('../../.env.local', import.meta.url), 'utf8'),
  )
} catch {
  // No .env.local: only the process environment is used.
}
const env = { ...fileEnv, ...process.env }
const config = configFrom(env)
const port = Number(env.AI_BRIDGE_PORT) || 8787
const handle = createBridge(config)

const server = createServer((req, res) => {
  const chunks: Buffer[] = []
  let size = 0
  req.on('data', (chunk: Buffer) => {
    size += chunk.length
    // Far more than any WorkSim request: stop reading anything larger.
    if (size > 200_000) req.destroy()
    else chunks.push(chunk)
  })
  req.on('end', async () => {
    const response = await handle({
      method: req.method ?? 'GET',
      path: (req.url ?? '/').split('?')[0],
      origin: req.headers.origin,
      body: Buffer.concat(chunks).toString('utf8'),
    })
    res.writeHead(response.status, response.headers)
    res.end(response.body)
    if (req.url?.startsWith('/v1/chat'))
      console.log(
        `${new Date().toLocaleTimeString()}  request answered with ${response.status}`,
      )
  })
})

// Only this computer can connect.
server.listen(port, '127.0.0.1', () => {
  const ready = (['anthropic', 'openai', 'google'] as const).filter(
    (id) => config.keys[id] && config.models[id],
  )
  console.log(`WorkSim AI bridge running at http://127.0.0.1:${port}`)
  console.log(
    ready.length
      ? `Ready: ${ready.join(', ')}. Daily limit: ${config.dailyLimit} requests.`
      : 'No provider is set up yet: add an API key (and model) to .env.local and restart.',
  )
})
