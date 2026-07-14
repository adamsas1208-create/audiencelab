// Vercel serverless function (also runnable locally via npm run api): POST /api/cortex
//
// The Cortex — surfaces AI insights on top of a creator's live data snapshot.
// The client sends a compact summary of the creator's contacts, polls, hooks,
// last duel and analytics. This route returns 4 concrete, cited insights the
// creator can act on today.
//
// The tone knob (0–100) morphs BOTH the model temperature AND the system-prompt
// voice, so the same data can be read as a sober data-scientist's observation
// (tone=0) or a hype-man coach's provocative recommendation (tone=100).
//
// Pure TEXT generation — no images — so it runs on any Ollama model (llama3,
// mistral, or a vision model). Same anti-generic scaffolding as api/growth.js:
// niche detection, banned template phrases, post-hoc scrub.
//
// No API key required. On the hosted (Vercel) deploy, verifyOllama() in
// _ollama.js throws a plain-English "not available on the hosted demo" error
// that the UI surfaces as a graceful degraded state — the neural web keeps
// rendering because it doesn't need this route.

import { callOllamaJSON } from './_ollama.js'

// Same niche detector idea as api/growth.js: pre-classify from every raw
// signal we have (poll questions, hook texts, contact platforms, duel query)
// and inject the winning label + vocabulary hints. Without this the model
// defaults to generic marketing filler.
const NICHE_LEXICON = [
  {
    id: 'gaming',
    label: 'gaming / streamer',
    weight: 2,
    keywords: ['fortnite', 'valorant', 'warzone', 'apex', 'gameplay', 'gamer', 'clutch', 'ranked', 'esport', 'kill', 'hud', 'minimap', 'twitch'],
    vocab: 'clutch, cracked, 1-tap, kill feed, KD, ranked grind, W-key, aim duel',
  },
  {
    id: 'cooking',
    label: 'cooking / food creator',
    weight: 2,
    keywords: ['recipe', 'cook', 'chef', 'kitchen', 'ingredient', 'oven', 'skillet', 'sauce', 'plate', 'restaurant', 'bake'],
    vocab: 'flavor bomb, one-pan, POV cook, secret sauce, restaurant-quality, weeknight, chef trick',
  },
  {
    id: 'fitness',
    label: 'fitness / workout creator',
    weight: 2,
    keywords: ['workout', 'gym', 'lifting', 'squat', 'bench', 'reps', 'sets', 'physique', 'shredded', 'bulk', 'macro', 'protein', 'calisthenics'],
    vocab: 'PR, cheat day, natty, mind-muscle, calisthenics flow, home-gym, 30-day, shredded',
  },
  {
    id: 'tech',
    label: 'tech / dev / SaaS creator',
    weight: 2,
    keywords: ['code', 'coding', 'react', 'javascript', 'python', 'ai model', 'llm', 'terminal', 'startup', 'saas', 'framework', 'api'],
    vocab: 'shipped in one weekend, prod bug, terminal-only, one-shot prompt, dev tool, LLM stack',
  },
  {
    id: 'finance',
    label: 'finance / money creator',
    weight: 2,
    keywords: ['stock', 'crypto', 'bitcoin', 'investing', 'portfolio', 'roi', 'trade', 'options', 'passive income', 'net worth', 'savings'],
    vocab: 'compounding, 10x, passive stream, 6-figure side hustle, dividend, small-account',
  },
  {
    id: 'beauty',
    label: 'beauty / makeup / skincare creator',
    weight: 2,
    keywords: ['makeup', 'mascara', 'foundation', 'skincare', 'serum', 'retinol', 'lipstick', 'grwm', 'glow'],
    vocab: 'GRWM, viral hack, drugstore vs high-end, glow, undereye, no-makeup makeup',
  },
  {
    id: 'lifestyle',
    label: 'lifestyle / vlog creator',
    weight: 1,
    keywords: ['vlog', 'daily', 'routine', 'morning', 'travel', 'aesthetic', 'that girl'],
    vocab: 'day in the life, morning routine, aesthetic reset, POV vlog',
  },
]

// Score each niche against the pooled evidence, return the winner (or null).
function detectNiche(pool) {
  const hay = pool.toLowerCase()
  let best = { id: null, label: null, vocab: null, hits: 0 }
  for (const n of NICHE_LEXICON) {
    let hits = 0
    for (const k of n.keywords) {
      if (hay.includes(k)) hits += n.weight
    }
    if (hits > best.hits) best = { id: n.id, label: n.label, vocab: n.vocab, hits }
  }
  return best.hits >= 2 ? best : null
}

// Phrases we've observed the model default to when it has nothing concrete
// to say. Explicit banning is more effective than a vague "don't be generic".
const BANNED_TEMPLATE_PHRASES = [
  'Uncover the secret behind',
  'The one thing nobody tells you',
  'You won\'t believe what happens',
  'Discover the truth',
  'Unlock the power of',
  'This will change everything',
  'What they don\'t want you to know',
  'The ultimate guide to',
  'Level up your',
  'Leverage your audience',
  'Drive engagement',
  'Take your content to the next level',
]

// Compact stringification of the snapshot so the model gets the specifics
// (real numbers, real labels) — never a vague summary.
function describeSnapshot(s) {
  const lines = []
  if (s.contacts) {
    lines.push(`Contacts: ${s.contacts.total} total.`)
    const byP = s.contacts.byPlatform || {}
    const platforms = Object.entries(byP)
      .filter(([, n]) => n > 0)
      .sort(([, a], [, b]) => b - a)
    if (platforms.length) {
      lines.push(`  By platform: ${platforms.map(([p, n]) => `${p} ${n}`).join(', ')}.`)
    }
    if (s.contacts.newestAt) lines.push(`  Newest joined: ${s.contacts.newestAt}.`)
  }
  if (Array.isArray(s.polls) && s.polls.length) {
    lines.push(`Polls (${s.polls.length}):`)
    s.polls.slice(0, 4).forEach((p, i) => {
      const total = (p.options || []).reduce((sum, o) => sum + (o.votes || 0), 0)
      const top = (p.options || []).slice().sort((a, b) => (b.votes || 0) - (a.votes || 0))[0]
      const activeTag = p.active ? ' [LIVE]' : ''
      lines.push(
        `  ${i + 1}. "${p.question}"${activeTag} — ${total} votes${top ? `, top: "${top.label}" (${top.votes || 0})` : ''}`,
      )
    })
  }
  if (Array.isArray(s.hookTests) && s.hookTests.length) {
    lines.push(`Hook tests (${s.hookTests.length}):`)
    s.hookTests.slice(0, 5).forEach((h, i) => {
      lines.push(`  ${i + 1}. "${h.text}" — ${h.platform || 'unknown'} · ${h.status || 'unknown'}`)
    })
  }
  if (s.lastDuel) {
    lines.push(
      `Last AI duel: "${s.lastDuel.question}" → winner "${s.lastDuel.winner}". Verdict: ${s.lastDuel.verdict || '(none)'}`,
    )
  }
  if (s.analytics && Number.isFinite(s.analytics.totalVotes)) {
    lines.push(`Total profile votes: ${s.analytics.totalVotes}`)
  }
  return lines.length ? lines.join('\n') : '(the creator has no data yet)'
}

// Blend two voice adjectives by tone (0–100). Lets us slide from
// "data-scientist" to "hype-man coach" without discrete steps.
function toneAdjectives(tone) {
  if (tone < 25) return 'a senior data scientist reporting findings — precise, cited, understated'
  if (tone < 55) return 'an experienced strategist — grounded but with a clear point of view'
  if (tone < 80) return 'a confident creator coach — direct, spicy, action-first'
  return 'a hype-man mentor who sees the killer pattern nobody else spotted — provocative, energised, unafraid to be strong'
}

function buildSystemPrompt({ nicheLabel, nicheVocab, tone }) {
  const voice = toneAdjectives(tone)
  const nicheBlock = nicheLabel
    ? `\n\nCONFIRMED NICHE: This creator is a **${nicheLabel}**. Speak their native vocabulary — words like: ${nicheVocab}. Reference concrete artifacts their audience knows. Generic "creator" or "business" framing is a failure.`
    : `\n\nNICHE: Not pre-classified. INFER the niche from the poll questions and hook texts below. Reference concrete objects/terms you find in them. Never default to generic marketing advice.`

  return `You are The Cortex — the AudienceLab AI that watches a creator's own live data (contacts, polls, hooks, AI duel results, analytics) and surfaces the patterns they can act on today. Your voice is ${voice}.${nicheBlock}

HARD RULES — violating any of these is an automatic failure:
1. Every insight MUST cite a specific data point from the snapshot (a number, a poll option label, a hook text, a platform name). No vague generalities.
2. NEVER emit template filler. Banned phrases (and any close paraphrase):
${BANNED_TEMPLATE_PHRASES.map((p) => `   - "${p}"`).join('\n')}
3. Each insight's "evidence" field MUST quote or paraphrase the exact data row it derives from, so the creator can verify the claim.
4. Each insight's "action" field, when present, MUST be a concrete step the creator can take today — not "improve your content" or "engage more".
5. Ground the tone in the voice above. At factual end: read numbers, point at concentrations, note gaps. At provocative end: name the killer opportunity, dare the creator to act on it. Never both in the same insight.

Return ONLY one valid JSON object (no markdown, no prose outside it) with this EXACT shape:
{
  "insights": [
    {
      "id": "string, kebab-case (e.g. 'top-platform-concentration')",
      "title": "6-8 word headline. Concrete. No question marks unless the point IS a question the creator should answer.",
      "body": "2-3 sentences. The observation or recommendation itself, written in the voice above. Must reference the specific data point.",
      "evidence": "One short line quoting or paraphrasing the exact snapshot row this derives from — e.g. 'TikTok: 14 contacts vs YouTube: 3'.",
      "action": "Optional. One imperative sentence (starts with a verb) the creator can do today. Omit or set to null if this insight is a pure observation.",
      "sourceNodes": ["one or more of: audience, polls, hooks, coach, growth"]
    }
  ]
}

Produce EXACTLY 4 insights. Every insight covers a DIFFERENT sourceNodes category if possible — spread the coverage across audience/polls/hooks/coach/growth so the reader sees the full picture, not four angles on the same node.`
}

function buildUserText({ snapshot, nicheLabel, tone }) {
  return [
    `The creator's live data snapshot:`,
    '',
    describeSnapshot(snapshot),
    '',
    `Requested voice temperature: ${tone}/100 (${toneAdjectives(tone)}).`,
    nicheLabel ? `Detected niche: ${nicheLabel} — use its vocabulary.` : `Niche: not pre-classified — infer it from the data above.`,
    '',
    'Now produce the 4 insights as the specified JSON. Remember: every claim cites a specific data row, or it is a failure.',
  ].join('\n')
}

// Post-hoc guard: even with all the prompt work, a small model can still slip
// out a banned phrase. Reject and fall back to a data-cited template.
function scrubGeneric(value, fallback) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  const lower = trimmed.toLowerCase()
  const hit = BANNED_TEMPLATE_PHRASES.some((p) => lower.includes(p.toLowerCase()))
  return hit ? fallback : trimmed
}

const VALID_SOURCE_NODES = ['audience', 'polls', 'hooks', 'coach', 'growth']

function normalizeInsights(raw, { snapshot }) {
  const contactsTotal = snapshot.contacts?.total ?? 0
  const list = Array.isArray(raw?.insights) ? raw.insights : []
  const cleaned = list.slice(0, 4).map((it, i) => {
    const source = Array.isArray(it?.sourceNodes)
      ? it.sourceNodes.filter((s) => VALID_SOURCE_NODES.includes(s))
      : []
    const action = typeof it?.action === 'string' && it.action.trim() ? scrubGeneric(it.action, null) : null
    return {
      id: (typeof it?.id === 'string' && it.id.trim()) || `insight-${i + 1}`,
      title: scrubGeneric(it?.title, `Insight ${i + 1}`),
      body: scrubGeneric(
        it?.body,
        `Your snapshot shows ${contactsTotal} contacts and ${snapshot.polls?.length || 0} polls — not enough signal yet for a sharp pattern. Add a lead-magnet hook or launch a poll to give the Cortex something to chew on.`,
      ),
      evidence: (typeof it?.evidence === 'string' && it.evidence.trim()) || '(no evidence line provided)',
      action,
      sourceNodes: source.length ? source : ['audience'],
    }
  })
  // Pad up to 4 if the model returned fewer — never leave the ring lopsided.
  while (cleaned.length < 4) {
    cleaned.push({
      id: `placeholder-${cleaned.length + 1}`,
      title: 'The Cortex is warming up',
      body: 'Add more contacts, launch a poll, or run a hook duel — the more raw signal the Cortex sees, the sharper the reads.',
      evidence: '(insufficient data)',
      action: null,
      sourceNodes: ['audience'],
    })
  }
  return cleaned
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    // 0–100 slider. Clamp so a bad client value can't wildly skew the model.
    const tone = Math.max(0, Math.min(100, Number(body.tone) || 0))
    const snapshot = body.snapshot && typeof body.snapshot === 'object' ? body.snapshot : {}

    // Pool every string signal we have so the niche detector has something to
    // chew on even when the creator has never explicitly tagged their niche.
    const pool = [
      ...(Array.isArray(snapshot.polls) ? snapshot.polls.map((p) => p.question || '') : []),
      ...(Array.isArray(snapshot.hookTests) ? snapshot.hookTests.map((h) => h.text || '') : []),
      snapshot.lastDuel?.question || '',
      snapshot.lastDuel?.winner || '',
    ]
      .filter(Boolean)
      .join(' \n ')

    const detected = detectNiche(pool)
    const nicheLabel = detected ? detected.label : null
    const nicheVocab = detected ? detected.vocab : null

    console.log(
      `[cortex] tone=${tone} niche="${nicheLabel || '(unclassified)'}" contacts=${snapshot.contacts?.total ?? 0} polls=${snapshot.polls?.length ?? 0} hooks=${snapshot.hookTests?.length ?? 0}`,
    )

    const parsed = await callOllamaJSON({
      system: buildSystemPrompt({ nicheLabel, nicheVocab, tone }),
      userText: buildUserText({ snapshot, nicheLabel, tone }),
    })
    return res.status(200).json({
      insights: normalizeInsights(parsed, { snapshot }),
      niche: nicheLabel,
      tone,
    })
  } catch (err) {
    const isTimeout = err.name === 'AbortError'
    const message = isTimeout
      ? 'Ollama request timed out — the model took too long. Raise OLLAMA_TIMEOUT_MS or use a faster model.'
      : (err && err.message) || 'Unknown error'
    console.error(`[cortex] ERROR — name=${err.name} message=${err.message}`)
    return res.status(500).json({ error: message })
  }
}
