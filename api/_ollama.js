// Shared local-Ollama helpers used by the AudienceLab API routes (duel, video).
// Underscore-prefixed so Vercel treats it as a lib, not a routable endpoint.

// Vision-capable models accept a per-message `images` array; sending images to a
// text-only model makes Ollama 400. Gate image attachment on this.
const VISION_RE = /llava|bakllava|moondream|minicpm-?v|vision|qwen2?-?vl/i

// Read config from the environment at REQUEST time (never module-load), so it
// always reflects the current .env / runtime values.
export function getConfig() {
  const url = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/chat'
  const model = process.env.OLLAMA_MODEL || 'llama3'
  const timeout = Number(process.env.OLLAMA_TIMEOUT_MS) || 300000
  return { url, model, timeout, hasVision: VISION_RE.test(model) }
}

// Confirm Ollama is up and the target model is pulled, with an actionable error.
export async function verifyOllama(chatUrl, model) {
  const base = chatUrl.replace(/\/api\/chat\/?$/, '')
  let resp
  try {
    resp = await fetch(`${base}/api/tags`)
  } catch (e) {
    // Vercel sets this automatically on every hosted deployment. Ollama only
    // ever runs on someone's own machine (OLLAMA_URL defaults to
    // 127.0.0.1), so "start ollama serve" is meaningless advice on a hosted
    // deploy — tell the visitor plainly instead of surfacing a raw network
    // error. Local dev keeps the original actionable message.
    if (process.env.VERCEL) {
      throw new Error(
        'This AI feature runs on a local AI model and is not available on the hosted demo — clone the repo and run it locally to try it.',
        { cause: e },
      )
    }
    throw new Error(
      `Ollama is not reachable at ${base} — is it running? Start it with \`ollama serve\`. (${e.message})`,
      { cause: e },
    )
  }
  if (!resp.ok) throw new Error(`Ollama ${base}/api/tags returned HTTP ${resp.status}`)
  const data = await resp.json().catch(() => ({}))
  const names = Array.isArray(data.models) ? data.models.map((m) => m.name) : []
  const hasModel = names.some((n) => n === model || n.startsWith(`${model}:`))
  if (!hasModel) {
    throw new Error(
      `Model "${model}" is not loaded in Ollama. Installed: ${names.join(', ') || '(none)'}. Run: ollama pull ${model}`,
    )
  }
}

// Tolerant JSON parse: strips a ```json fence, then falls back to the outermost
// {...} block (vision models wrap their JSON even with format:"json").
export function parseJsonLoose(text) {
  let t = String(text).trim()
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t)
  if (fenced) t = fenced[1].trim()
  try {
    return JSON.parse(t)
  } catch (e) {
    const start = t.indexOf('{')
    const end = t.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1))
    throw new Error('Ollama did not return JSON', { cause: e })
  }
}

// Clamp a metric to an integer in [1, 10]; default 5 when missing/garbage.
export const clampScore = (n) => {
  const v = Math.round(Number(n))
  return Number.isFinite(v) ? Math.min(10, Math.max(1, v)) : 5
}

// Pull bare base64 out of a data URL (any image media type); null for non-data.
export function extractBase64(url) {
  if (typeof url !== 'string' || !url.startsWith('data:')) return null
  const marker = url.indexOf('base64,')
  if (marker < 0) return null
  const b64 = url.slice(marker + 'base64,'.length).replace(/\s+/g, '')
  return b64 || null
}

// Deterministic JSON chat call to the local model. `images` (base64, no prefix)
// are attached only when the active model is vision-capable. Returns the parsed
// JSON object (throws on unreachable/timeout/unparseable — caller maps to 500).
export async function callOllamaJSON({ system, userText, images = [] }) {
  const { url, model, timeout, hasVision } = getConfig()
  await verifyOllama(url, model)

  const message = { role: 'user', content: userText }
  if (hasVision && images.length) message.images = images

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const startedAt = Date.now()
  console.log(
    `[Ollama Request] POST ${url} model="${model}" vision=${hasVision} images=${
      hasVision ? images.length : 0
    } timeout=${timeout}ms`,
  )
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        format: 'json',
        // temperature 0 => deterministic: the same frames + query repeat.
        options: { temperature: 0, seed: 0, num_predict: 4096 },
        messages: [{ role: 'system', content: system }, message],
      }),
    })
    if (!resp.ok) {
      const body = await resp.text().catch(() => '')
      throw new Error(`Ollama responded ${resp.status} — ${body.slice(0, 300)}`)
    }
    const data = await resp.json()
    const content = data && data.message && data.message.content
    if (!content) throw new Error('Empty Ollama response (no message.content)')
    console.log(
      `[Ollama Response] ${content.length} chars from "${model}" in ${Date.now() - startedAt}ms`,
    )
    return parseJsonLoose(content)
  } finally {
    clearTimeout(timer)
  }
}

// Streaming PLAIN-TEXT chat call — for narrative/prose output (the Video
// Autopsy). Unlike callOllamaJSON this does NOT force `format: 'json'` and runs
// at a creative temperature. It pipes the model's token deltas straight onto
// the HTTP ServerResponse `res` as UTF-8 text (Ollama returns newline-delimited
// JSON when stream:true — we unwrap each line's `message.content`). Vision
// models also accept `images`; text-only models (llama3) ignore them.
//
// `model` overrides the globally configured OLLAMA_MODEL for this call only —
// used so pure-text features (the Autopsy) can run on a text-specialist model
// (llama3) while the vision routes keep using the shared llava.
export async function streamOllamaText({
  system,
  userText,
  res,
  images = [],
  temperature = 0.85,
  model: modelOverride,
}) {
  const cfg = getConfig()
  const model = modelOverride || cfg.model
  const { url, timeout } = cfg
  const hasVision = VISION_RE.test(model)
  await verifyOllama(url, model)

  const message = { role: 'user', content: userText }
  if (hasVision && images.length) message.images = images

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const startedAt = Date.now()
  console.log(
    `[Ollama Stream] POST ${url} model="${model}" vision=${hasVision} temp=${temperature} timeout=${timeout}ms`,
  )
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: true,
        // Creative, not deterministic — this is prose, not strict JSON.
        options: { temperature, num_predict: 1200 },
        messages: [{ role: 'system', content: system }, message],
      }),
    })
    if (!resp.ok) {
      const body = await resp.text().catch(() => '')
      throw new Error(`Ollama responded ${resp.status} — ${body.slice(0, 300)}`)
    }

    // Only now commit response headers — a pre-stream failure above still lets
    // the caller send a JSON 500 instead of a half-written body.
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let chars = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let nl
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim()
        buffer = buffer.slice(nl + 1)
        if (!line) continue
        let obj
        try {
          obj = JSON.parse(line)
        } catch {
          continue // partial/garbled line — skip
        }
        if (obj.error) throw new Error(obj.error)
        const piece = obj.message && obj.message.content
        if (piece) {
          res.write(piece)
          chars += piece.length
        }
      }
    }
    console.log(`[Ollama Stream] ${chars} chars from "${model}" in ${Date.now() - startedAt}ms`)
    res.end()
  } finally {
    clearTimeout(timer)
  }
}
