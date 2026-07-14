// Dev-only API server. Mounts the Vercel serverless function in api/duel.js on a
// plain Node HTTP server so you can test the real /api/duel endpoint locally
// without a Vercel account or `vercel dev`. The Vite dev server proxies /api to
// this port (see vite.config.js), so the frontend's relative fetch just works.
//
//   npm run api      # this server   (terminal 1)
//   npm run dev      # the Vite app  (terminal 2)
//
// The endpoint talks to a local, free Ollama instance — no API key needed. If
// Ollama isn't running, the handler returns 5xx and the app falls back to its
// local mock.

import http from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Minimal .env loader (KEY=VALUE, strips surrounding quotes). Doesn't overwrite
// anything already present in the real environment.
function loadEnv() {
  try {
    const raw = readFileSync(join(__dirname, '..', '.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line)
      if (!m) continue
      let val = m[2]
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = val
    }
  } catch {
    /* no .env file — rely on the real environment */
  }
}
loadEnv()

// Import handlers AFTER .env is loaded so the route modules read the current
// OLLAMA_MODEL / OLLAMA_URL (a static top-of-file import would run first).
const { default: duelHandler } = await import('../api/duel.js')
const { default: videoHandler } = await import('../api/video.js')
const { default: growthHandler } = await import('../api/growth.js')
const { default: autopsyHandler } = await import('../api/autopsy.js')

// Path → handler. Matches the /api/* routes Vercel exposes from the api/ dir.
const routes = {
  '/api/duel': duelHandler,
  '/api/video': videoHandler,
  '/api/growth': growthHandler,
  '/api/autopsy': autopsyHandler,
}

const PORT = process.env.API_PORT || 3001

const safeJson = (s) => {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}

const server = http.createServer((req, res) => {
  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', async () => {
    const rawBody = Buffer.concat(chunks).toString('utf8')
    req.body = rawBody ? safeJson(rawBody) : {}

    // Vercel-style helpers the handler expects.
    res.status = (code) => {
      res.statusCode = code
      return res
    }
    res.json = (obj) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(obj))
      return res
    }

    const path = (req.url || '').split('?')[0].replace(/\/+$/, '') || '/'
    const handler = routes[path]
    if (!handler) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: `No route for ${path}` }))
      return
    }

    try {
      await handler(req, res)
    } catch (err) {
      console.error('[dev-api] handler crashed:', err)
      if (!res.headersSent) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: 'dev server error' }))
      }
    }
  })
})

server.listen(PORT, async () => {
  console.log(
    `[dev-api] listening on http://localhost:${PORT}  (POST ${Object.keys(routes).join(', ')})`,
  )

  // Probe the local Ollama instance so its status is obvious at boot.
  const chatUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/chat'
  const model = process.env.OLLAMA_MODEL || 'llama3'
  const base = chatUrl.replace(/\/api\/chat\/?$/, '')
  try {
    const r = await fetch(`${base}/api/tags`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const j = await r.json()
    const names = (j.models || []).map((m) => m.name)
    const hasModel = names.some((n) => n === model || n.startsWith(`${model}:`))
    console.log(
      `[dev-api] Ollama reachable at ${base} — installed models: ${names.join(', ') || '(none)'}`,
    )
    if (!hasModel) {
      console.log(`[dev-api] model "${model}" not pulled yet — run: ollama pull ${model}`)
    } else {
      console.log(`[dev-api] using model "${model}" — real local critique is live`)
    }
  } catch {
    console.log(
      `[dev-api] Ollama NOT reachable at ${base} — start it (\`ollama serve\`) and pull a model (\`ollama pull ${model}\`). Until then the app falls back to the mock.`,
    )
  }
})
