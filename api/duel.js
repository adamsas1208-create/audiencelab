// Vercel serverless function (also runnable locally via npm run api): POST /api/duel
//
// Runs the "Agent A7" critique against a LOCAL, free Ollama instance instead of
// a paid cloud API. It takes the creator's poll question plus each option's text
// hook (and thumbnail), asks a local model for a deep analysis + a 6-step
// brutal Alpha-vs-Omega debate, and returns a deterministic, normalized report:
//
//   { analysis: [...parallel to options], duelSteps: [6 messages], finalVerdict }
//
// The model does the judging; this handler validates/normalizes the output so
// the UI always receives a coherent shape (exactly one winner, clean CTR
// numbers, known contrast/emotion enums, lowercase agent ids).
//
// Config (env, all optional):
//   OLLAMA_URL    default http://127.0.0.1:11434/api/chat
//   OLLAMA_MODEL  default llama3   (use "llava" for real local vision)
//
// No API key required. If Ollama isn't running, the handler returns 5xx and the
// frontend falls back to its local mock so the cinematic always plays.

// Vision-capable Ollama models accept the per-message `images` array. Sending
// images to a TEXT-only model (llama3, mistral, …) makes Ollama 400, so we gate
// image attachment on this. Extend the pattern if you pull other vision models.
const VISION_RE = /llava|bakllava|moondream|minicpm-?v|vision|qwen2?-?vl/i

// Read config from the environment at REQUEST time, not module-load time, so it
// always reflects the current .env. (The dev API server loads .env into
// process.env before requests arrive; reading at load time risked capturing a
// stale default before .env was applied. Vercel injects env vars at runtime.)
function getConfig() {
  const url = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/chat'
  const model = process.env.OLLAMA_MODEL || 'llama3'
  // Generous default — local vision models (llava) on CPU can take minutes on
  // full-size photos. Too-short a timeout is the #1 cause of silent mock fallback.
  const timeout = Number(process.env.OLLAMA_TIMEOUT_MS) || 300000
  return { url, model, timeout, hasVision: VISION_RE.test(model) }
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D']
const CONTRAST_LEVELS = ['High', 'Balanced', 'Low']
const EMOTIONS = ['Excitement', 'Curiosity', 'Muted']

// Strict instructions. Built per-request so the sight/grounding rules match the
// active model (a text model must NOT be told to describe visuals it can't see)
// and the whole review is anchored to the creator's specific poll question.
function buildSystemPrompt(hasVision, pollTitle) {
  const goal = pollTitle
    ? `CONTEXT — THE CREATOR'S GOAL: You are analyzing these thumbnails under the context of this specific user question: "${pollTitle}". Your scores, coach feedback, critic flaws, and final verdict MUST directly answer which option achieves the goal of this question best. Judge every option by how well it serves THAT exact goal — never in the abstract, and never ignore the question.`
    : `No specific poll question was provided — judge each option on general thumbnail click-through performance.`

  const sight = hasVision
    ? `YOU CAN SEE each option's thumbnail. You MUST read and quote the ACTUAL text written *on* the images (Thumbnail A, Thumbnail B, …) and reference concrete visual elements you actually observe — a color, object, facial expression, lighting, or the size/placement of on-image text. Never lazily refer to an option as just "A" or "B" unless that is the literal text printed on the image. Never invent a detail you do not actually see.`
    : `YOU CANNOT see the images — only the text hooks/labels are available. Judge from the EXACT wording of each hook and quote it. Do NOT fabricate visual details (colors, faces, on-image text) you cannot verify.`

  return `You are the AI critique engine for AudienceLab, helping a creator pick the best YouTube/short-form thumbnail. You deliver a clean, two-voice review — a Coach and a Critic — plus a final verdict. NO step-by-step debate.

${goal}

THE TWO VOICES:
- THE COACH: an encouraging growth strategist. Speaks ONLY to STRENGTHS — what works and why it will earn the click. Constructive, specific, confident.
- THE CRITIC: a brutally honest art director. Speaks ONLY to FLAWS — exactly why viewers will skip or swipe away (text too small to read on mobile, weak contrast, cluttered layout, generic hook, etc.). No sugar-coating, but no pointless cruelty either.

GROUNDING — THE #1 RULE: quote or directly attack the creator's ACTUAL hook wording and on-image text in quotation marks, and name options by their exact label. If a hook is about "coding", talk about coding; if it says "I quit my 9-5", react to that exact claim. ${sight} Never use generic filler that could be pasted onto any other thumbnail.

TASK (every part must answer the creator's goal above):
1. For every option estimate: a realistic predicted CTR percentage (typically 3.0-10.0), a contrast rating (one of: High, Balanced, Low), the dominant emotional impact (one of: Excitement, Curiosity, Muted), a one-line insight that names the real hook, AND a "scores" object of three INTEGER scores from 1 (terrible) to 10 (excellent) — each scored for how well the option serves the creator's goal:
   - readability: how easy it is to read any on-image text and instantly parse the focal subject on a small mobile screen.
   - contrast: structural lighting, saturation, and subject-to-background separation.
   - thumbStop: the emotional / psychological pull to STOP scrolling on this thumbnail.
   Exactly ONE option is the winner (the one that best achieves the creator's goal, generally the highest CTR). Ground every score in the actual hook (and the real thumbnail when you can see it) — do not give every option the same scores.
2. theCoach: 2-4 sentences of PURE strengths across the options, quoting their real hooks/on-image text and tying each to the creator's goal. No criticism here.
3. theCritic: 2-4 sentences of PURE, brutally honest flaws across the options, quoting their real hooks/on-image text and saying exactly why each fails the creator's goal / why people will skip/swipe. No praise here.
4. verdict: the winning option's exact label and a crisp one-sentence reason that explains how it best answers the creator's question and includes its predicted CTR.

Return ONLY one valid JSON object (no markdown, no prose outside the JSON) with this EXACT shape:
{
  "analysis": [
    { "label": "<exact option label>", "ctr": 8.4, "contrast": "High|Balanced|Low", "emotion": "Excitement|Curiosity|Muted", "isWinner": true, "insight": "<1-line critique naming the real hook>", "scores": { "readability": 8, "contrast": 5, "thumbStop": 9 } }
  ],
  "theCoach": "Pure strengths, 2-4 sentences, quoting the real hooks.",
  "theCritic": "Pure brutal flaws, 2-4 sentences, quoting the real hooks.",
  "verdict": { "winner": "<winning option label>", "summary": "One crisp sentence with the predicted CTR." }
}
The "analysis" array must have exactly one entry per option, in the SAME ORDER as given, with exactly one "isWinner": true. Every analysis item MUST include a "scores" object with integer readability, contrast and thumbStop (1-10). "theCoach" and "theCritic" are single strings (NOT arrays, NOT a debate).`
}

// Pull the pure base64 payload out of a data URL of ANY image media type,
// stripping the `data:image/...;base64,` prefix and any stray whitespace.
// Ollama's `images` array wants bare base64, not the full data URL. Returns
// null for remote URLs (http/https) — those can't be inlined as base64.
function extractBase64(url) {
  if (typeof url !== 'string' || !url.startsWith('data:')) return null
  const marker = url.indexOf('base64,')
  if (marker < 0) return null
  const b64 = url.slice(marker + 'base64,'.length).replace(/\s+/g, '')
  return b64 || null
}

// Build the user turn: the question and every option's exact hook, plus any
// base64 thumbnails attached via Ollama's `images` array — but ONLY for a
// vision model (attaching images to a text model makes Ollama 400). Images go
// in option order and the prompt maps image N -> Option N so llava binds each
// picture to the right option instead of thinking one is missing.
function buildUserMessage(question, options, hasVision, model) {
  const images = []
  const lines = [
    `Creator's poll question: "${question || '(none provided)'}"`,
    '',
    `The ${options.length} options to judge (keep this exact order). DEBATE THESE EXACT HOOKS, word for word:`,
  ]

  options.forEach((o, i) => {
    const letter = OPTION_LETTERS[i] ?? String(i + 1)
    const label = (o.label || '').trim() || `Option ${letter}`
    const base64 = extractBase64(o.image_url)
    const isRemote = !base64 && /^https?:\/\//.test(o.image_url || '')

    let note
    if (base64 && hasVision) {
      images.push(base64)
      note = `its thumbnail is attached image #${images.length} — describe what you actually see in it`
      console.log(
        `[Ollama Request] Sending 1 image for Option ${letter} (${Math.round(base64.length / 1024)} KB base64)`,
      )
    } else if (base64) {
      note = 'an image was uploaded but is not visible to this text model'
      console.log(`[Ollama Request] Sending 0 images for Option ${letter} (text-only model)`)
    } else if (isRemote) {
      note = `thumbnail at a URL you cannot open: ${o.image_url}`
      console.log(`[Ollama Request] Sending 0 images for Option ${letter} (remote URL, not inlinable)`)
    } else {
      note = 'no thumbnail uploaded'
      console.log(`[Ollama Request] Sending 0 images for Option ${letter} (no thumbnail)`)
    }
    lines.push(`Option ${letter} — hook text: "${label}" (${note})`)
  })

  if (hasVision && images.length) {
    lines.push('')
    lines.push(
      `${images.length} image(s) are attached to this message in option order: image 1 = Option A, image 2 = Option B, and so on. Each option above has its own image — none of them are missing. Look at every image.`,
    )
  }

  const message = { role: 'user', content: lines.join('\n') }
  if (hasVision && images.length) message.images = images
  console.log(
    `[Ollama Request] model="${model}" vision=${hasVision} — total images attached to payload: ${images.length}`,
  )
  return message
}

const clampCtr = (n) => {
  const v = Number(n)
  if (!Number.isFinite(v)) return 5
  return Math.min(99, Math.max(1, Math.round(v * 10) / 10))
}

// Score-card metric: clamp to an integer in [1, 10], default 5 when missing.
const clampScore = (n) => {
  const v = Math.round(Number(n))
  return Number.isFinite(v) ? Math.min(10, Math.max(1, v)) : 5
}
const oneOf = (value, allowed, fallback) =>
  allowed.includes(value) ? value : fallback

// Parse JSON tolerantly: try as-is, then fall back to the first {...} block in
// case the model wrapped it in prose (vision models sometimes do despite
// format:"json").
function parseJsonLoose(text) {
  let t = String(text).trim()
  // Strip a ```json … ``` / ``` … ``` markdown code fence if the model wrapped
  // its JSON in one (llava does this even with format:"json").
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t)
  if (fenced) t = fenced[1].trim()
  try {
    return JSON.parse(t)
  } catch (e) {
    // Last resort: grab the outermost {...} block (handles stray prose/fences).
    const start = t.indexOf('{')
    const end = t.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1))
    throw new Error('Ollama did not return JSON', { cause: e })
  }
}

// Coerce the model output into the exact contract the UI depends on. Tolerant by
// design: we build one analysis entry per option (synthesizing neutral defaults
// for anything the model omitted or misnumbered) instead of throwing, so a good
// debate isn't discarded just because the analysis array length was off.
function normalize(raw, options) {
  const rawAnalysis = Array.isArray(raw && raw.analysis) ? raw.analysis : []

  const analysis = options.map((opt, i) => {
    const a = rawAnalysis[i] || {}
    const s = (a && a.scores) || {}
    const letter = OPTION_LETTERS[i] ?? String(i + 1)
    return {
      label: (opt.label || '').trim() || `Option ${letter}`,
      hasImage: !!opt.image_url,
      ctr: clampCtr(a.ctr),
      contrast: oneOf(a.contrast, CONTRAST_LEVELS, 'Balanced'),
      emotion: oneOf(a.emotion, EMOTIONS, 'Curiosity'),
      isWinner: false,
      insight: typeof a.insight === 'string' ? a.insight : '',
      scores: {
        readability: clampScore(s.readability),
        contrast: clampScore(s.contrast),
        thumbStop: clampScore(s.thumbStop),
      },
    }
  })

  // Enforce exactly one winner: highest CTR.
  let winnerIdx = 0
  analysis.forEach((a, i) => {
    if (a.ctr > analysis[winnerIdx].ctr) winnerIdx = i
  })
  analysis[winnerIdx].isWinner = true
  const winner = analysis[winnerIdx]

  const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : '')
  const theCoach =
    str(raw && raw.theCoach) ||
    `"${winner.label}" is your strongest play — a ${winner.ctr}% predicted CTR on ${winner.contrast.toLowerCase()} contrast with a '${winner.emotion}' hook that stops the scroll.`
  const theCritic =
    str(raw && raw.theCritic) ||
    `Tighten the weaker options: low contrast and small, hard-to-read elements get swiped past on a phone before the hook ever lands.`
  const summary =
    str(raw && raw.verdict && raw.verdict.summary) ||
    `Deploy "${winner.label}" as your primary thumbnail (${winner.ctr}% predicted CTR).`

  return {
    analysis,
    theCoach,
    theCritic,
    verdict: { winner: winner.label, ctr: winner.ctr, summary },
  }
}

// Preflight: confirm Ollama is actually up and the target model is pulled, so a
// failure surfaces a precise, actionable message instead of a vague 500.
async function verifyOllama(chatUrl, model) {
  const base = chatUrl.replace(/\/api\/chat\/?$/, '')
  let resp
  try {
    resp = await fetch(`${base}/api/tags`)
  } catch (e) {
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
  console.log(`[Ollama Preflight] OK — "${model}" available at ${base}`)
}

// Call the local Ollama chat endpoint and return the parsed JSON object.
async function runOllama(question, options) {
  const { url, model, timeout, hasVision } = getConfig()
  await verifyOllama(url, model)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const startedAt = Date.now()
  console.log(`[Ollama Request] POST ${url} model="${model}" timeout=${timeout}ms`)
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        format: 'json', // force valid JSON, no conversational fluff
        // temperature 0 => greedy/deterministic decoding, so the same images +
        // hooks always produce the SAME analysis and winner on repeat scans.
        options: { temperature: 0, seed: 0, num_predict: 4096 },
        messages: [
          { role: 'system', content: buildSystemPrompt(hasVision, question) },
          buildUserMessage(question, options, hasVision, model),
        ],
      }),
    })
    if (!resp.ok) {
      // Surface Ollama's own error body (model-not-found, image-not-supported…).
      const body = await resp.text().catch(() => '')
      throw new Error(`Ollama responded ${resp.status} — ${body.slice(0, 300)}`)
    }
    const data = await resp.json()
    const content = data && data.message && data.message.content
    if (!content) throw new Error('Empty Ollama response (no message.content)')
    console.log(
      `[Ollama Response] ${content.length} chars from "${model}" in ${Date.now() - startedAt}ms`,
    )
    try {
      return parseJsonLoose(content)
    } catch (e) {
      console.error('[Ollama Response] unparseable JSON — snippet:', content.slice(0, 600))
      throw e
    }
  } finally {
    clearTimeout(timer)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    // Accept either `question` or `title` for the poll's core goal.
    const question = (body.question || body.title || '').toString().trim()
    const options = Array.isArray(body.options) ? body.options.slice(0, 4) : []
    console.log(`[duel] poll question: "${question || '(none)'}" — ${options.length} options`)
    if (options.length < 2) {
      return res.status(400).json({ error: 'Need at least two options' })
    }

    const parsed = await runOllama(question, options)
    return res.status(200).json(normalize(parsed, options))
  } catch (err) {
    // HARD SURFACE: no silent mock here. Return 500 with the EXACT message so
    // the frontend shows the real failure instead of masking it.
    const isTimeout = err.name === 'AbortError'
    const message = isTimeout
      ? `Ollama request timed out — the model took too long. Raise OLLAMA_TIMEOUT_MS or use a faster model.`
      : (err && err.message) || 'Unknown error'
    console.error(`[duel] ERROR (no mock) — name=${err.name} message=${err.message}`)
    if (err && err.stack) console.error(err.stack)
    return res.status(500).json({ error: message })
  }
}
