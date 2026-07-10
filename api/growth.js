// Vercel serverless function (also runnable locally via npm run api): POST /api/growth
//
// The Instant "AI Growth-Hack" Engine. It takes the Critic's raw complaints from
// a completed VideoLab / thumbnail review and turns them into three concrete,
// ready-to-ship fixes a creator can act on immediately:
//
//   { curiosityHook, visualDirective, pacingSaver }
//
// Pure TEXT generation — no images — so it runs on any Ollama model (llama3,
// mistral, or a vision model), and does NOT require a vision model like the
// duel/video routes do. Same deterministic, zero-temperature JSON pipeline.
//
// No API key required. If Ollama isn't running, the handler returns 5xx with the
// exact error so the UI can surface it.

import { callOllamaJSON } from './_ollama.js'

// Lightweight niche detector. We do NOT trust the model to guess the niche on
// its own — we pre-classify from every raw signal we have (query + frame notes
// + critic + coach) and inject the winning label with vocabulary hints. This is
// what stops llama3 from defaulting to generic business/marketing filler.
const NICHE_LEXICON = [
  {
    id: 'fortnite',
    label: 'Fortnite gameplay',
    weight: 3,
    keywords: ['fortnite', 'battle royale', 'victory royale', 'zero build', 'storm circle', 'llama loot', 'tilted towers'],
    vocab: 'Victory Royale, 1v1, cranking 90s, no-build, storm surge, W-key, cracked, clutch, endgame, loot pool, mythic, Zero Build, Chapter, POI',
  },
  {
    id: 'gaming',
    label: 'gaming / FPS / esports',
    weight: 2,
    keywords: ['gameplay', 'gamer', 'fps', 'esport', 'kill', 'headshot', 'respawn', 'hud', 'minimap', 'crosshair', 'kd', 'kda', 'ranked', 'lobby', 'wager', 'clutch', 'ace', 'valorant', 'warzone', 'apex', 'cod', 'call of duty', 'minecraft', 'roblox', 'league of legends'],
    vocab: 'clutch, cracked, 1-tap, kill feed, KD, ranked grind, lobby, cheeks, cooking, W-tapping, movement demon, aim duel, W-key, jiggle peek',
  },
  {
    id: 'cooking',
    label: 'cooking / food',
    weight: 2,
    keywords: ['recipe', 'cook', 'chef', 'kitchen', 'ingredient', 'oven', 'skillet', 'sauce', 'dough', 'plate', 'restaurant', 'bake'],
    vocab: 'flavor bomb, one-pan, POV cook, secret sauce, restaurant-quality, midnight snack, weeknight, 20-minute, chef trick',
  },
  {
    id: 'fitness',
    label: 'fitness / workout',
    weight: 2,
    keywords: ['workout', 'gym', 'lifting', 'squat', 'bench', 'reps', 'sets', 'physique', 'shredded', 'bulk', 'cut', 'macro', 'protein', 'fat loss', 'calisthenics'],
    vocab: 'PR, cheat day, natty, mind-muscle, delt shelf, calisthenics flow, home-gym, 30-day, dad-bod, shredded',
  },
  {
    id: 'tech',
    label: 'tech / dev / SaaS demo',
    weight: 2,
    keywords: ['code', 'coding', 'react', 'javascript', 'python', 'ai model', 'llm', 'terminal', 'ide', 'vs code', 'startup', 'saas', 'framework', 'api', 'database'],
    vocab: 'shipped in one weekend, prod bug, terminal-only, one-shot prompt, dev tool, npm i, LLM stack, no-code',
  },
  {
    id: 'finance',
    label: 'finance / money',
    weight: 2,
    keywords: ['stock', 'crypto', 'bitcoin', 'ethereum', 'investing', 'portfolio', 'roi', 'trade', 'options', 'passive income', 'net worth', 'savings'],
    vocab: 'compounding, 10x, passive stream, 6-figure side hustle, tax trick, dividend, small-account, prop firm',
  },
  {
    id: 'beauty',
    label: 'beauty / makeup / skincare',
    weight: 2,
    keywords: ['makeup', 'mascara', 'foundation', 'skincare', 'serum', 'retinol', 'lipstick', 'eyeshadow', 'blush', 'get ready'],
    vocab: 'GRWM, viral hack, drugstore vs high-end, glow, undereye, one-product face, no-makeup makeup',
  },
  {
    id: 'reaction',
    label: 'reaction / commentary',
    weight: 1,
    keywords: ['reaction', 'react to', 'commentary', 'reacting', 'watch with me'],
    vocab: 'chat lost it, unhinged take, POV commentary, no-cut reaction, side-by-side, live callout',
  },
]

// Score each niche against the pooled evidence, return the winner (or null).
// We require a minimum hit weight so weak matches never override "generic".
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

// Phrases we've observed the model default to when it has no context. Listing
// them explicitly in the system prompt is far more effective than a vague
// "don't be generic" — the model treats these as literal banned tokens.
const BANNED_TEMPLATE_PHRASES = [
  'Uncover the secret behind the creator\'s success',
  'The one thing nobody tells you about',
  'You won\'t believe what happens next',
  'Discover the truth',
  'The secret to success',
  'Unlock the power of',
  'This will change everything',
  'What they don\'t want you to know',
  'The ultimate guide to',
  'Level up your',
]

function buildSystemPrompt({ nicheLabel, nicheVocab, contentType }) {
  const surface = contentType === 'thumbnail' ? 'thumbnail A/B critique' : 'short-form video retention critique'
  const nicheBlock = nicheLabel
    ? `\n\nCONFIRMED NICHE: The creator's content is **${nicheLabel}**. Every fix MUST speak this niche's language. Use its native vocabulary — words like: ${nicheVocab}. Reference concrete artifacts the audience recognizes (game modes, weapons, POIs, ingredients, exercises, tickers, products — whatever fits). A generic "creator" or "business" framing here is a failure.`
    : `\n\nNICHE: Not pre-classified. You MUST infer the niche from the raw visual observations below (per-frame notes describe what is literally on screen). Reference concrete objects/terms you find in those notes. If the notes show a gameplay HUD, this is a gamer — write like one. If they show a kitchen, write like a food creator. NEVER default to abstract business/marketing advice.`

  return `You are the AudienceLab "Growth-Hack" engine — a ruthless, world-class short-form retention strategist. A Critic has just torn apart a creator's ${surface}. Your ONLY job is to convert that critique into THREE concrete, ship-today fixes, hyper-tailored to the creator's actual niche.${nicheBlock}

HARD RULES — violating any of these is an automatic failure:
1. NEVER emit template filler that could apply to any video. The following phrases (and any close paraphrase) are BANNED:
${BANNED_TEMPLATE_PHRASES.map((p) => `   - "${p}"`).join('\n')}
2. The curiosityHook MUST be a title a real viewer in this niche would click — it must contain at least one concrete noun from the niche (a game name, mode, weapon, dish, exercise, ticker, product, etc.) OR a concrete number/stat.
3. The visualDirective MUST reference something the model actually observed on screen (from the per-frame notes / critic complaints) — not generic "boost contrast" advice. Name the element (HUD, minimap, kill feed, pan, subject, etc.).
4. The pacingSaver MUST cite the specific first-3-second problem from the critic and prescribe a cut/reorder that fits this niche's format (e.g. gaming = jump to the clutch frag; cooking = jump to the money-shot bite).
5. Ground EVERY fix in the Critic's actual complaints. If the Critic said "the HUD is static", your visualDirective addresses the HUD by name.

STYLE — good vs bad examples for a Fortnite gameplay clip whose critic says "opening frame is a static lobby, no action, viewer swipes":
  BAD  (GENERIC — DO NOT DO THIS):
    curiosityHook: "Uncover the secret behind the creator's success"
    visualDirective: "Increase contrast and enlarge the title text"
    pacingSaver: "Cut to the most exciting moment early"
  GOOD (NICHE-NATIVE — DO THIS):
    curiosityHook: "I hit a 23-kill Victory Royale with ONLY a green pump — Zero Build ranked"
    visualDirective: "Kill the lobby frame entirely — open on the final-circle 1v1 with the kill-feed pinned top-right and the shield bar pulsing red."
    pacingSaver: "Front-load the 23rd elim (the pump headshot) into frame 1, then rewind-cut to the drop — the current 3s of lobby menu is why viewers swipe."

Return ONLY one valid JSON object (no markdown, no prose outside it) with this EXACT shape:
{
  "curiosityHook": "One high-CTR title/headline REWRITE that opens an irresistible curiosity gap. A single line, under 90 characters, no surrounding quotes, no emoji spam. MUST contain a concrete niche noun or number.",
  "visualDirective": "ONE blunt, imperative, single-sentence design instruction naming the specific on-screen element to change (with concrete numbers/colors when useful).",
  "pacingSaver": "A structural recommendation for the FIRST 3 SECONDS — what to cut, front-load, or hard-cut to. 1-2 sentences, concrete, niche-appropriate."
}
All three values are non-empty strings. curiosityHook is ONE headline only (not a list).`
}

function buildUserText({ query, theCritic, theCoach, verdict, frameNotes, nicheLabel }) {
  const lines = [
    `Creator's focus / goal: "${query || 'general short-form retention'}"`,
  ]
  if (nicheLabel) {
    lines.push(`Pre-classified niche: ${nicheLabel} (use its vocabulary, not generic marketing terms).`)
  }
  if (Array.isArray(frameNotes) && frameNotes.length) {
    lines.push('', 'RAW VISUAL OBSERVATIONS (what the vision model literally saw on screen — extract the niche from these):')
    frameNotes.forEach((n, i) => {
      const label = n.label || `Frame ${i + 1}`
      const t = Number.isFinite(n.t) ? ` (~${n.t}s)` : ''
      const note = (n.note || '').toString().trim()
      if (note) lines.push(`- ${label}${t}: ${note}`)
    })
  }
  lines.push('', 'THE CRITIC\'S BRUTAL COMPLAINTS (each fix must directly address one of these):', theCritic || '(none provided)')
  if (theCoach) {
    lines.push('', 'What already works (preserve these strengths — do not fix what is not broken):', theCoach)
  }
  if (verdict) {
    lines.push('', `Current verdict: ${verdict}`)
  }
  lines.push(
    '',
    'Now output the three concrete, niche-native growth-hack blueprints as the specified JSON. Remember: banned template phrases → automatic failure.',
  )
  return lines.join('\n')
}

// Post-hoc guard: even with all the prompt work, a small model can still slip
// out a banned phrase. If it does, replace with a niche-anchored fallback so
// the UI never surfaces the exact filler the user complained about.
function scrubGeneric(value, fallback) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  const lower = trimmed.toLowerCase()
  const hit = BANNED_TEMPLATE_PHRASES.some((p) => lower.includes(p.toLowerCase()))
  return hit ? fallback : trimmed
}

function normalize(raw, { nicheLabel }) {
  const nicheTag = nicheLabel ? ` (${nicheLabel})` : ''
  return {
    curiosityHook: scrubGeneric(
      raw && raw.curiosityHook,
      `Rewrite the title around the single most surprising moment you actually captured on screen${nicheTag} — name the concrete artifact viewers came to see.`,
    ),
    visualDirective: scrubGeneric(
      raw && raw.visualDirective,
      `Replace the weakest opening frame with the highest-action moment from the clip${nicheTag} and pin the audience-relevant on-screen element (HUD, subject, product) top-center.`,
    ),
    pacingSaver: scrubGeneric(
      raw && raw.pacingSaver,
      `Hard-cut to the payoff moment inside second 1${nicheTag}, then rewind to setup — the current opening is why viewers swipe.`,
    ),
    niche: nicheLabel || null,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const context = {
      query: (body.query || body.focus || '').toString().trim(),
      theCritic: (body.theCritic || '').toString().trim(),
      theCoach: (body.theCoach || '').toString().trim(),
      verdict: (body.verdict || '').toString().trim(),
      contentType: (body.contentType || 'video').toString().trim(),
      // Per-frame notes from VideoLab: [{ label, t, note }, ...]
      frameNotes: Array.isArray(body.frameNotes)
        ? body.frameNotes
            .filter((f) => f && typeof f === 'object')
            .slice(0, 8)
            .map((f) => ({
              label: (f.label || '').toString().slice(0, 40),
              t: Number(f.t) || 0,
              note: (f.note || '').toString().slice(0, 500),
            }))
        : [],
      // Optional creator-provided niche override.
      niche: (body.niche || '').toString().trim().slice(0, 80),
    }
    if (!context.theCritic) {
      return res
        .status(400)
        .json({ error: 'Need the Critic\'s complaints to generate growth-hacks' })
    }

    // Build the evidence pool the detector reads from. Frame notes are usually
    // the strongest niche signal (they contain literal on-screen observations).
    const notesText = context.frameNotes.map((f) => f.note).join(' ')
    const pool = [context.query, notesText, context.theCritic, context.theCoach, context.niche]
      .filter(Boolean)
      .join(' \n ')

    // Manual override wins over the detector.
    const detected = context.niche
      ? { id: 'manual', label: context.niche, vocab: 'the creator-provided vocabulary above' }
      : detectNiche(pool)

    const nicheLabel = detected ? detected.label : null
    const nicheVocab = detected ? detected.vocab : null

    console.log(
      `[growth] focus="${context.query || '(none)'}" niche="${nicheLabel || '(unclassified)'}" frames=${context.frameNotes.length} — generating 3 blueprints`,
    )

    const parsed = await callOllamaJSON({
      system: buildSystemPrompt({ nicheLabel, nicheVocab, contentType: context.contentType }),
      userText: buildUserText({ ...context, nicheLabel }),
    })
    return res.status(200).json(normalize(parsed, { nicheLabel }))
  } catch (err) {
    const isTimeout = err.name === 'AbortError'
    const message = isTimeout
      ? 'Ollama request timed out — the model took too long. Raise OLLAMA_TIMEOUT_MS or use a faster model.'
      : (err && err.message) || 'Unknown error'
    console.error(`[growth] ERROR — name=${err.name} message=${err.message}`)
    return res.status(500).json({ error: message })
  }
}
