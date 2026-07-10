// Vercel serverless function (also runnable locally via npm run api): POST /api/video
//
// VideoLab: analyzes the VISUAL retention of a short-form video from 3 keyframes
// captured client-side at the Hook (0s), Setup (~3s), and Retention check (~10s).
// It runs the frames through a local vision model (Ollama/llava) under a video-
// retention "Coach vs Critic" persona and returns per-frame pacing/hook scores
// plus an overall verdict:
//
//   { frames: [{ label, t, scores:{visualHook,clarity,pacing}, note }],
//     theCoach, theCritic, verdict: { score, summary } }
//
// Requires a VISION model (frames are meaningless to a text model). No API key.

import {
  getConfig,
  callOllamaJSON,
  extractBase64,
  clampScore,
} from './_ollama.js'

function buildSystemPrompt(query, frameMeta) {
  const focus = query
    ? `CONTEXT — THE CREATOR'S FOCUS: "${query}". Anchor every score and comment to this question.`
    : `No specific focus was given — judge general short-form retention.`

  const order = frameMeta
    .map((f, i) => `image ${i + 1} = ${f.label} (~${f.t}s)`)
    .join(', ')

  return `You are the AI video-retention analyst for AudienceLab. You are given ${frameMeta.length} chronological keyframes captured from a short-form video (YouTube Short / TikTok / Reel). Judge how the VISUALS hold a viewer's attention OVER TIME, from the first frame to the last.

${focus}

YOU CAN SEE the frames, attached in chronological order: ${order}. Reference concrete visual elements you actually observe — the subject, on-screen text, colors, composition, clutter, and how much CHANGES between consecutive frames. Never invent a detail you do not see.

THE TWO VOICES (adapted for video retention):
- THE COACH: what visual elements WORK to KEEP a viewer watching across the keyframes — a punchy hook frame, clear subject, visible progression/change, motion, legible text. Strengths only.
- THE CRITIC: exactly WHERE visual boredom, repetition, or clutter would make a viewer SWIPE AWAY — static/near-identical frames, no progression, messy composition, tiny unreadable text, a weak opening frame. Flaws only, brutally honest.

SCORING — integers 1 (terrible) to 10 (excellent), tailored for video:
- For EACH frame: visualHook (raw stopping power of this exact frame), clarity (clean, uncluttered, instantly parseable subject), pacing (sense of change/momentum vs the previous frame; for the first frame, judge its immediate punch).
- One overall verdict score (1-10): how well the video retains attention from 0s through the last frame for the stated focus.
Do not give every frame identical scores — differentiate based on what you actually see.

Return ONLY one valid JSON object (no markdown, no prose outside it) with this EXACT shape:
{
  "frames": [
    { "label": "Hook (0s)", "scores": { "visualHook": 8, "clarity": 7, "pacing": 6 }, "note": "one line: what this frame shows and whether it holds attention" }
  ],
  "theCoach": "2-4 sentences of PURE retention strengths across the keyframes.",
  "theCritic": "2-4 sentences of PURE flaws — where and why viewers swipe away.",
  "verdict": { "score": 7, "summary": "One crisp sentence on overall retention for the focus." }
}
The "frames" array MUST have exactly ${frameMeta.length} entries in the SAME chronological order, each with integer visualHook, clarity and pacing (1-10).`
}

function buildUserText(query, frameMeta) {
  const lines = [
    `Creator's focus / question: "${query || 'general short-form retention'}"`,
    '',
    `${frameMeta.length} chronological keyframes are attached in this order:`,
  ]
  frameMeta.forEach((f, i) => lines.push(`Image ${i + 1} = ${f.label} (~${f.t}s)`))
  lines.push('', 'Analyze how visual attention is held from the first frame to the last.')
  return lines.join('\n')
}

function normalize(raw, frameMeta) {
  const rawFrames = Array.isArray(raw && raw.frames) ? raw.frames : []
  const frames = frameMeta.map((fm, i) => {
    const f = rawFrames[i] || {}
    const s = (f && f.scores) || {}
    return {
      label: fm.label,
      t: fm.t,
      scores: {
        visualHook: clampScore(s.visualHook),
        clarity: clampScore(s.clarity),
        pacing: clampScore(s.pacing),
      },
      note: typeof f.note === 'string' ? f.note : '',
    }
  })

  const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : '')
  const avg = Math.round(
    frames.reduce((sum, f) => sum + f.scores.visualHook, 0) / Math.max(1, frames.length),
  )
  const score = clampScore((raw && raw.verdict && raw.verdict.score) ?? avg)
  const theCoach =
    str(raw && raw.theCoach) ||
    'The opening frame establishes a clear subject and the keyframes show visible change, which helps carry attention forward.'
  const theCritic =
    str(raw && raw.theCritic) ||
    'Watch for stretches where the frames look near-identical — without visible progression, viewers lose the thread and swipe.'
  const summary =
    str(raw && raw.verdict && raw.verdict.summary) ||
    `Overall short-form retention scores ${score}/10 for this focus.`

  return { frames, theCoach, theCritic, verdict: { score, summary } }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const query = (body.query || body.focus || '').toString().trim()
    const rawFrames = Array.isArray(body.frames) ? body.frames.slice(0, 5) : []
    if (rawFrames.length < 1) {
      return res.status(400).json({ error: 'Need at least one keyframe' })
    }

    // Video analysis is meaningless without a vision model.
    const { hasVision } = getConfig()
    if (!hasVision) {
      return res.status(500).json({
        error:
          'Video analysis requires a vision model. Set OLLAMA_MODEL=llava (or another vision model) and restart the API.',
      })
    }

    const images = []
    const frameMeta = rawFrames.map((f, i) => {
      const b64 = extractBase64(f && f.image)
      if (b64) images.push(b64)
      return {
        label: (f && f.label) || `Frame ${i + 1}`,
        t: Number(f && f.t) || 0,
        hasImage: !!b64,
      }
    })
    if (!images.length) {
      return res.status(400).json({ error: 'No decodable keyframe images (expected PNG data URLs)' })
    }

    console.log(`[video] focus="${query || '(none)'}" — ${images.length} keyframes`)

    const parsed = await callOllamaJSON({
      system: buildSystemPrompt(query, frameMeta),
      userText: buildUserText(query, frameMeta),
      images,
    })
    return res.status(200).json(normalize(parsed, frameMeta))
  } catch (err) {
    const isTimeout = err.name === 'AbortError'
    const message = isTimeout
      ? 'Ollama request timed out — the model took too long. Raise OLLAMA_TIMEOUT_MS or use a faster model.'
      : (err && err.message) || 'Unknown error'
    console.error(`[video] ERROR — name=${err.name} message=${err.message}`)
    return res.status(500).json({ error: message })
  }
}
