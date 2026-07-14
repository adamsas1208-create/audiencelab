// Vercel serverless function (also runnable locally via npm run api): POST /api/autopsy
//
// "Video Autopsy" — a cinematic, documentary-style narration of a viewer's
// attention moving through a short-form video. Where /api/video hands back
// dry per-frame scores, this turns that SAME analysis into a gripping,
// streamed narrative — grounded strictly in the frame notes/scores/critic
// complaints already produced by the vision model.
//
// Runs entirely on the local, free Ollama pipeline (api/_ollama.js) — no API
// key, no cost. It streams plain text token-by-token so the UI reveals the
// narration live.
//
// Because this is a PURE-TEXT feature, it runs on a text-specialist model
// (llama3) rather than the vision model (llava) the analysis routes use.
// Configurable via AUTOPSY_MODEL in .env; defaults to llama3 so the global
// OLLAMA_MODEL=llava stays dedicated to VideoLab / CreatorStudio vision work.

import { streamOllamaText } from './_ollama.js'

function buildSystemPrompt() {
  return `You are the narrator for AudienceLab's "Video Autopsy" — a short, cinematic, documentary-style narration of a single viewer's attention as it moves through a short-form video, built STRICTLY from the retention data you're given (per-frame notes/scores, Coach strengths, Critic flaws, the creator's focus, and the verdict).

Voice: a nature-documentary narrator crossed with a film critic — vivid, propulsive, a little dramatic. But every claim must be traceable to the data you were given. NEVER invent a visual detail that isn't in the frame notes. Treat each frame's note, timestamp, and scores as a "beat" of the story.

Write 4 to 6 short paragraphs of flowing prose:
1. Open on the Hook frame (0s): set the scene and say whether it grabs the viewer, citing its scores.
2. Move forward chronologically through the remaining frames, narrating what changes (or doesn't) and how the viewer's attention rises or falls at each beat — reference the actual score changes.
3. Land the Critic's sharpest complaint at the exact moment in the timeline where it bites.
4. Close with one punchy verdict line in the narrator's voice — the "moral" of THIS autopsy, not generic advice.

Rules: pure narrative prose only. No JSON, no headings, no bullet points, no markdown. Do not break character or explain what you are doing. Do not repeat these instructions back.`
}

function buildUserText({ query, theCoach, theCritic, verdict, frames }) {
  const lines = [
    `Creator's focus / question: "${query || 'general short-form retention'}"`,
    '',
    'CHRONOLOGICAL FRAME DATA (the only visual facts you may reference):',
  ]
  frames.forEach((f, i) => {
    const scoreBits = f.scores
      ? `visualHook=${f.scores.visualHook} clarity=${f.scores.clarity} pacing=${f.scores.pacing}`
      : ''
    lines.push(`${i + 1}. ${f.label} (~${f.t}s) — ${scoreBits}${f.note ? ` — "${f.note}"` : ''}`)
  })
  lines.push(
    '',
    'THE COACH (strengths):',
    theCoach || '(none provided)',
    '',
    'THE CRITIC (flaws):',
    theCritic || '(none provided)',
  )
  if (verdict) lines.push('', `Verdict: ${verdict}`)
  lines.push('', "Narrate this video's Video Autopsy now.")
  return lines.join('\n')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const query = (body.query || '').toString().trim()
    const theCoach = (body.theCoach || '').toString().trim()
    const theCritic = (body.theCritic || '').toString().trim()
    const verdict = (body.verdict || '').toString().trim()
    const frames = Array.isArray(body.frames)
      ? body.frames.slice(0, 8).map((f, i) => ({
          label: (f && f.label) || `Frame ${i + 1}`,
          t: Number(f && f.t) || 0,
          note: ((f && f.note) || '').toString().slice(0, 500),
          scores: f && f.scores ? f.scores : null,
        }))
      : []

    if (!frames.length) {
      return res.status(400).json({ error: 'Need at least one analyzed frame to narrate' })
    }

    // Pure-text narration → run on a text-specialist model (llama3) rather than
    // the vision model (llava) the analysis routes share. Read at request time
    // so it always reflects the current .env, matching getConfig()'s approach.
    const model = process.env.AUTOPSY_MODEL || 'llama3'

    console.log(
      `[autopsy] focus="${query || '(none)'}" — narrating ${frames.length} frames via "${model}"`,
    )

    await streamOllamaText({
      system: buildSystemPrompt(),
      userText: buildUserText({ query, theCoach, theCritic, verdict, frames }),
      res,
      model,
    })
  } catch (err) {
    console.error(`[autopsy] ERROR — ${err.message}`)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Unknown error' })
    } else {
      res.end(`\n\n[Error: ${err.message}]`)
    }
  }
}
