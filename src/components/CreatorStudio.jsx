import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  Crown,
  Gamepad2,
  Image as ImageIcon,
  Loader2,
  Minus,
  Plus,
  Rocket,
  Smartphone,
  Sparkles,
  Swords,
  Trash2,
  UploadCloud,
  Video,
  X,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useData } from '../context/data-context'
import { fetchDuelScript } from '../lib/duel'
import { AmbientGlowField } from '../design/components/AmbientOrb'
import TiltCard from '../design/components/TiltCard'
import { rise } from '../design/tokens/motion'
import AIBrainLoader from './AIBrainLoader'
import {
  myHooks,
  platforms,
  scoreHistory,
  studioStats,
} from '../data'

const statusStyles = {
  live: 'border-turquoise/30 bg-turquoise/10 text-turquoise',
  testing: 'border-periwinkle/40 bg-periwinkle/10 text-periwinkle',
  draft: 'border-zinc-600/40 bg-white/5 text-zinc-400',
}

// Dynamic poll options range from 2 (default) up to 4.
const MIN_OPTIONS = 2
const MAX_OPTIONS = 4
const OPTION_LETTERS = ['A', 'B', 'C', 'D']
const emptyOption = () => ({ label: '', image_url: '' })
const img = (id) =>
  `https://images.unsplash.com/${id}?w=640&q=80&auto=format&fit=crop`

const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/webp'

// Turn a dropped/pasted/selected image File (or Blob) into a self-contained
// base64 data URL. We downscale large images through a canvas first so the
// resulting string stays small enough to live comfortably in localStorage —
// raw phone screenshots can be several MB otherwise. Output is always PNG:
// the local vision model (Ollama/llava) decodes PNG/JPEG reliably but cannot
// decode WebP, so WebP would silently break image analysis. Falls back to the
// untouched data URL only when it's already a decodable format.
async function fileToImageDataURL(file, maxDim = 1280) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  // WebP sources must be re-encoded (the model can't read them); other formats
  // can short-circuit when already small.
  const isWebp = /^data:image\/webp/i.test(dataUrl)

  try {
    const image = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = dataUrl
    })
    const scale = Math.min(1, maxDim / Math.max(image.width, image.height))
    // Small enough and already a decodable format — keep it as-is.
    if (scale === 1 && !isWebp && dataUrl.length < 400_000) return dataUrl

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } catch {
    // Only safe to return the original if it isn't WebP; otherwise re-raise so
    // the caller doesn't store an undecodable image.
    if (isWebp) throw new Error('Could not re-encode WebP image to PNG')
    return dataUrl
  }
}

// Pull the first image File out of a clipboard/drag DataTransfer, if any.
function firstImageFile(dataTransfer) {
  const items = dataTransfer?.items ? Array.from(dataTransfer.items) : []
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) return file
    }
  }
  const files = dataTransfer?.files ? Array.from(dataTransfer.files) : []
  return files.find((f) => f.type.startsWith('image/')) || null
}

/* ----------------------------- AI Critique Agent ----------------------------
 * "Agent A7" is a simulated visual-critique model. It produces randomized but
 * plausible CTR / contrast / emotion metrics plus a written breakdown, themed
 * to the poll's content (gaming vs vlog vs general) so it reads as contextual.
 * --------------------------------------------------------------------------- */
const SCAN_DURATION_MS = 2500
const CONTRAST_LEVELS = ['High', 'Balanced', 'Low']
const EMOTIONS = ['Excitement', 'Curiosity', 'Muted']

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

function detectTheme(question, options) {
  const text = `${question} ${options.map((o) => o.label).join(' ')}`.toLowerCase()
  if (/gam|cyberpunk|anime|retro|controller|arcade|neon|esport/.test(text)) return 'gaming'
  if (/vlog|caf|stroll|beach|morning|lifestyle|travel|coffee|rain|cozy/.test(text)) return 'vlog'
  return 'general'
}

const WINNER_INSIGHTS = {
  gaming: (l) =>
    `${l} nails high-energy neon contrast with a centered focal subject — the eye locks on within 200ms, maximizing the click impulse for a gaming audience.`,
  vlog: (l) =>
    `${l} leads with warm, aspirational tones and clean subject separation. It reads as authentic and relatable, which is the strongest psychological hook for lifestyle viewers.`,
  general: (l) =>
    `${l} uses complementary color theory and strong facial/focal placement for maximum psychological hook, giving it the highest predicted pull.`,
}
const LOSER_INSIGHTS = {
  gaming: (l) =>
    `${l} runs muddy in the mid-tones and the action gets lost against a busy background. Recommendation: boost saturation and add a rim light to separate the subject.`,
  vlog: (l) =>
    `${l} feels flat and slightly under-exposed; the subject blends into the scene. Recommendation: lift contrast ~20% and tighten the crop for a clearer focal point.`,
  general: (l) =>
    `${l} lacks saturation and the text overlay risks getting lost in background noise. Recommendation: increase contrast by ~20% and simplify the composition.`,
}

// Produces one analysis record per option, with exactly one winner (top CTR).
function analyzeOptions(question, options) {
  const theme = detectTheme(question, options)
  const rndScore = () => 4 + Math.floor(Math.random() * 6) // 4–9
  const scored = options.map((o, i) => ({
    label: (o.label || '').trim() || `Option ${OPTION_LETTERS[i] ?? i + 1}`,
    hasImage: !!o.image_url,
    ctr: Math.round((4 + Math.random() * 6) * 10) / 10, // 4.0–10.0%
    contrast: pick(CONTRAST_LEVELS),
    emotion: pick(EMOTIONS),
    scores: {
      readability: rndScore(),
      contrast: rndScore(),
      thumbStop: rndScore(),
    },
  }))
  let winner = 0
  scored.forEach((s, i) => {
    if (s.ctr > scored[winner].ctr) winner = i
  })
  // Bias the winner toward favorable tags so the agent duel's bragging stays
  // coherent — still real, generated data; just constrained to its strengths.
  scored[winner].contrast = pick(['High', 'Balanced'])
  scored[winner].emotion = pick(['Excitement', 'Curiosity'])

  return scored.map((s, i) => ({
    ...s,
    isWinner: i === winner,
    insight: (i === winner ? WINNER_INSIGHTS : LOSER_INSIGHTS)[theme](s.label),
  }))
}

// Builds the clean Coach / Critic / Verdict review from the scan data, so the
// local fallback is 100% contextual to the current pool — CTR, contrast,
// emotion and whether a frame was uploaded all surface in the copy.
function buildCoachCritic(analysis) {
  const winner = analysis.find((a) => a.isWinner) ?? analysis[0]
  const ranked = analysis.slice().sort((a, b) => b.ctr - a.ctr)
  const foil = ranked.find((a) => a !== winner) ?? winner
  const noFrame = analysis.filter((a) => !a.hasImage)

  const theCoach =
    `"${winner.label}" is your strongest play — a ${winner.ctr}% predicted CTR riding ${winner.contrast.toLowerCase()} contrast and a '${winner.emotion}' hook that stops the scroll. ` +
    (winner.hasImage
      ? 'The thumbnail gives the eye a clear focal point to lock onto. '
      : 'Even without a frame the hook wording does real work. ') +
    (foil !== winner
      ? `"${foil.label}" still has a usable angle worth running as the A/B challenger.`
      : 'Keep leaning into that hook.')

  const theCritic =
    (foil !== winner
      ? `Be honest about "${foil.label}": at ${foil.ctr}% it trails, and its ${foil.contrast.toLowerCase()} contrast with a ${foil.emotion.toLowerCase()} read makes it easy to swipe past on a phone. `
      : 'The field is thin, so the winning margin is fragile. ') +
    (noFrame.length
      ? `${noFrame.map((a) => `"${a.label}"`).join(' and ')} ${noFrame.length > 1 ? 'have' : 'has'} no real thumbnail — naked text gets skipped, so ship a frame.`
      : 'Tighten the crop and push the focal subject so it still reads at thumbnail size on mobile.')

  const verdict = {
    winner: winner.label,
    ctr: winner.ctr,
    summary: `Deploy "${winner.label}" as your primary thumbnail (${winner.ctr}% predicted CTR, '${winner.emotion}' hook)${
      foil !== winner ? ` and bench "${foil.label}" as the A/B challenger.` : '.'
    }`,
  }
  return { theCoach, theCritic, verdict }
}

// Local mock review, shaped exactly like the /api/duel response. Used as a
// fallback when the real critique API is unavailable (Ollama down, dev, or a
// network error) so the review always renders.
function localDuelFallback(question, options) {
  const analysis = analyzeOptions(question, options)
  const { theCoach, theCritic, verdict } = buildCoachCritic(analysis)
  return { analysis, theCoach, theCritic, verdict }
}

// HARD BYPASS: when false, a failed AI request surfaces the REAL error in the
// arena instead of silently masking it with the local mock above. Flip to true
// to restore the offline mock (e.g. demos without Ollama running).
const ALLOW_MOCK_FALLBACK = false

// One-click test fixtures: each fills the option texts and appends matching
// high-quality Unsplash images so a creator can publish a visual test instantly.
// Presets ship with a varying option count to show off multi-option polls.
const POLL_PRESETS = {
  gaming: {
    icon: Gamepad2,
    label: 'Load Gaming Preset',
    question: 'Which thumbnail style should I run?',
    options: [
      { label: 'Cyberpunk style', image_url: img('photo-1538481199705-c710c4e965fc') },
      { label: 'Anime style', image_url: img('photo-1542751371-adc38448a05e') },
      { label: 'Retro style', image_url: img('photo-1550745165-9bc0b252726f') },
    ],
  },
  vlog: {
    icon: Video,
    label: 'Load Vlog Preset',
    question: 'Which vlog vibe gets the click?',
    options: [
      { label: 'Golden-hour city stroll', image_url: img('photo-1492619375914-88005aa9e8fb') },
      { label: 'Cozy café morning', image_url: img('photo-1495474472287-4d71bcdd2085') },
      { label: 'Beach sunset escape', image_url: img('photo-1507525428034-b723cf961d3e') },
      { label: 'Rainy window mood', image_url: img('photo-1428592953211-077101b2021b') },
    ],
  },
}

function StatCard({ stat }) {
  return (
    <div className="rounded-2xl border border-white/10 al-glass p-5">
      <p className="text-sm text-zinc-500">{stat.label}</p>
      <div className="mt-2 flex items-end justify-between">
        <span className="text-3xl font-bold tracking-tight text-zinc-50">
          {stat.value}
        </span>
        <span
          className={[
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
            stat.positive
              ? 'bg-turquoise/10 text-turquoise'
              : 'bg-rose-500/10 text-rose-400',
          ].join(' ')}
        >
          {stat.positive ? (
            <ArrowUpRight className="size-3" />
          ) : (
            <ArrowDownRight className="size-3" />
          )}
          {stat.delta}
        </span>
      </div>
    </div>
  )
}

function Sparkline({ data }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 100
  const h = 36
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return [x, y]
  })
  const line = points.map(([x, y]) => `${x},${y}`).join(' ')
  const area = `0,${h} ${line} ${w},${h}`

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-16 w-full"
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34e0a1" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#34e0a1" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sparkStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#34e0a1" />
          <stop offset="100%" stopColor="#6260ff" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sparkFill)" />
      <polyline
        points={line}
        fill="none"
        stroke="url(#sparkStroke)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{ filter: 'drop-shadow(0 0 6px #34e0a166)' }}
      />
    </svg>
  )
}

function ScoreRing({ score }) {
  const r = 16
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  const color =
    score >= 80 ? '#34e0a1' : score >= 60 ? '#6260ff' : score === 0 ? '#52525b' : '#fb7185'
  return (
    <div className="relative size-11 shrink-0">
      <svg viewBox="0 0 40 40" className="size-full -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#27272a" strokeWidth="4" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-zinc-200">
        {score}
      </span>
    </div>
  )
}

function TrendIcon({ trend }) {
  if (trend === 'up')
    return <ArrowUpRight className="size-4 text-turquoise" />
  if (trend === 'down')
    return <ArrowDownRight className="size-4 text-rose-400" />
  return <Minus className="size-4 text-zinc-600" />
}

// Small option thumbnail for a visual test row. Collapses if the URL is broken.
function HookThumb({ src, alt }) {
  const [ok, setOk] = useState(true)
  if (!src || !ok) return null
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="size-9 shrink-0 rounded-lg border border-white/10 object-cover"
      onError={() => setOk(false)}
    />
  )
}

// The two review voices: Coach = mint (strengths), Critic = crimson (flaws).
const COACH_COLOR = '#34e0a1'
const CRITIC_COLOR = '#ff4d6d'

// Clean fullscreen review takeover. Mounts (via a fresh key) when a scan
// completes, with the already-fetched Coach / Critic text + verdict passed in as
// props. A brief intro flash, then a clean two-panel "Coach vs Critic" reveal
// with the gold verdict beneath. `onExit` returns the creator to the poll editor.
function AgentDuel({ error, analysis, theCoach, theCritic, verdict, onExit }) {
  // On error, skip the intro flash and show the failure immediately.
  const [phase, setPhase] = useState(error ? 'result' : 'intro')

  useEffect(() => {
    if (error) return
    const t = setTimeout(() => setPhase('result'), 1400)
    return () => clearTimeout(t)
  }, [error])

  const result = phase === 'result'

  return createPortal(
    <div className="al-fade-in fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-xl">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/3 size-[40rem] -translate-x-1/2 rounded-full bg-turquoise/10 blur-[160px]" />
        <div className="absolute -bottom-40 right-1/4 size-[34rem] rounded-full bg-rose-500/10 blur-[150px]" />
      </div>

      {/* Top bar */}
      <div className="relative z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-black/50 px-5 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className={error ? 'size-4 text-rose-400' : 'size-4 text-turquoise'} />
          <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-zinc-100">
            {error ? 'AI Critique — Error' : 'AI Coach vs Critic'}
          </span>
        </div>
        <button
          type="button"
          onClick={result ? onExit : () => setPhase('result')}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:text-zinc-100"
        >
          {result ? '✕ Close' : 'Skip ▸'}
        </button>
      </div>

      {/* Stage */}
      <div className="relative z-30 flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-6 sm:px-8">
        {error ? (
          <div
            className="w-full max-w-2xl rounded-2xl border border-rose-500/50 bg-black/70 p-7 text-center"
            style={{ boxShadow: '0 0 60px -22px #ff4d6d' }}
          >
            <div className="font-mono text-sm font-bold uppercase tracking-[0.25em] text-rose-400">
              ⚠️ AI Critique Failed
            </div>
            <p className="mt-2 text-[11px] uppercase tracking-wider text-zinc-500">
              The local Ollama request failed — the mock was NOT used
            </p>
            <pre className="mt-5 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-zinc-950 p-4 text-left text-sm leading-relaxed text-rose-200">
              {error}
            </pre>
            <p className="mt-4 text-xs leading-relaxed text-zinc-400">
              Make sure Ollama is running (
              <span className="font-mono text-zinc-300">ollama serve</span>) and the
              model is pulled (
              <span className="font-mono text-zinc-300">ollama pull llava</span>).
              The full trace is in the{' '}
              <span className="font-mono text-zinc-300">npm run api</span> terminal.
            </p>
            <button
              type="button"
              onClick={onExit}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-rose-400/50 bg-rose-500/10 px-6 py-3 text-sm font-bold text-rose-200 transition-all hover:bg-rose-500/20 active:scale-[0.98]"
            >
              Close
            </button>
          </div>
        ) : result ? (
          <div className="al-fade-in flex w-full max-w-5xl flex-col gap-6">
            {/* Score cards — per-option readability / contrast / thumb-stop */}
            {analysis && analysis.length > 0 && (
              <div>
                <p className="mb-3 text-center font-mono text-[11px] font-bold uppercase tracking-[0.35em] text-zinc-500">
                  Score Cards
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {analysis.map((r, i) => (
                    <OptionScoreCard key={i} result={r} />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <CritiquePanel
                icon={Sparkles}
                title="The Coach"
                subtitle="What's working"
                color={COACH_COLOR}
                text={theCoach}
              />
              <CritiquePanel
                icon={Swords}
                title="The Critic"
                subtitle="Why people swipe away"
                color={CRITIC_COLOR}
                text={theCritic}
              />
            </div>

            {/* Gold verdict */}
            <div
              className="al-verdict-pop rounded-3xl border p-7 text-center"
              style={{
                borderColor: 'rgba(250,204,21,0.55)',
                background:
                  'linear-gradient(160deg, rgba(250,204,21,0.16), rgba(15,12,4,0.92))',
                boxShadow:
                  '0 0 80px -16px rgba(250,204,21,0.55), inset 0 0 40px -22px rgba(250,204,21,0.5)',
              }}
            >
              <div className="flex items-center justify-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.35em] text-amber-300">
                <Crown className="size-5" />
                The Verdict
              </div>
              <p
                className="mt-3 text-3xl font-extrabold tracking-tight text-amber-100 sm:text-4xl"
                style={{ textShadow: '0 0 28px rgba(250,204,21,0.7)' }}
              >
                👑 {verdict.winner}
                {verdict.ctr ? (
                  <span className="ml-3 align-middle text-xl font-bold text-amber-300/90 sm:text-2xl">
                    {verdict.ctr}% CTR
                  </span>
                ) : null}
              </p>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-amber-100/80">
                {verdict.summary}
              </p>
              <button
                type="button"
                onClick={onExit}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-300 px-6 py-3 text-sm font-bold text-black transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ boxShadow: '0 0 30px -6px rgba(250,204,21,0.8)' }}
              >
                🎯 Return to Poll Editor
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="al-intro-flash font-mono text-2xl font-extrabold uppercase tracking-tight text-amber-300 sm:text-4xl">
              ⚖️ Verdict Incoming
            </div>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-zinc-400">
              Your AI Coach and Critic have reviewed every option. Stand by for
              the clean breakdown…
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// One review panel — Coach (mint, strengths) or Critic (crimson, flaws).
function CritiquePanel({ icon: Icon, title, subtitle, color, text }) {
  return (
    <div
      className="rounded-2xl border bg-black/60 p-5"
      style={{ borderColor: `${color}55`, boxShadow: `0 0 44px -24px ${color}` }}
    >
      <div className="flex items-center gap-2.5">
        <Icon className="size-5 shrink-0" style={{ color }} />
        <div>
          <p
            className="font-mono text-sm font-bold uppercase tracking-[0.2em]"
            style={{ color, textShadow: `0 0 12px ${color}55` }}
          >
            {title}
          </p>
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">
            {subtitle}
          </p>
        </div>
      </div>
      <p
        className="mt-4 text-base leading-relaxed text-zinc-100 sm:text-lg"
        style={{ textShadow: '0 1px 8px rgba(0,0,0,0.7)' }}
      >
        {text}
      </p>
    </div>
  )
}

// The 3 score-card metrics, in display order, with their palette accents.
const SCORE_METRICS = [
  { key: 'readability', label: 'Readability', color: '#34e0a1' }, // mint
  { key: 'contrast', label: 'Contrast', color: '#facc15' }, // gold
  { key: 'thumbStop', label: 'Thumb-Stop', color: '#ff4d6d' }, // crimson
]

// One glowing /10 metric bar.
function ScoreBar({ label, value, color }) {
  const v = Math.max(0, Math.min(10, Number(value) || 0))
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        <span>{label}</span>
        <span className="font-mono text-sm" style={{ color }}>
          {v}
          <span className="text-zinc-600">/10</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${v * 10}%`,
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            boxShadow: `0 0 12px -1px ${color}`,
          }}
        />
      </div>
    </div>
  )
}

// A premium per-option score card: label + winner badge + the 3 metric bars.
function OptionScoreCard({ result }) {
  const scores = result.scores || {}
  return (
    <div
      className="rounded-2xl border bg-black/50 p-4"
      style={{
        borderColor: result.isWinner ? 'rgba(250,204,21,0.5)' : 'rgba(255,255,255,0.1)',
        boxShadow: result.isWinner ? '0 0 44px -20px rgba(250,204,21,0.8)' : 'none',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-bold text-zinc-100" title={result.label}>
          {result.label}
        </p>
        {result.isWinner ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
            <Crown className="size-3" /> Winner
          </span>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            {result.ctr}% CTR
          </span>
        )}
      </div>
      <div className="mt-3.5 space-y-2.5">
        {SCORE_METRICS.map((m) => (
          <ScoreBar key={m.key} label={m.label} value={scores[m.key]} color={m.color} />
        ))}
      </div>
    </div>
  )
}

// One card in the simulated mobile feed: thumbnail + duration badge + a
// channel row, sized exactly as it would appear scrolling a real phone.
function FeedCard({ option }) {
  const [ok, setOk] = useState(true)
  const title = (option.label || '').trim() || 'Untitled hook'
  const avatar = title[0]?.toUpperCase() || 'Y'
  if (!option.image_url || !ok) return null
  return (
    <div>
      <div className="relative overflow-hidden rounded-lg">
        <img
          src={option.image_url}
          alt={title}
          className="aspect-video w-full object-cover"
          onError={() => setOk(false)}
        />
        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[8px] font-bold text-white">
          10:24
        </span>
      </div>
      <div className="mt-1.5 flex gap-2">
        <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-turquoise/50 to-periwinkle/50 text-[10px] font-bold text-white">
          {avatar}
        </span>
        <div className="min-w-0">
          <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-white">
            {title}
          </p>
          <p className="mt-0.5 text-[9px] text-zinc-500">
            Your Channel · 12K views · 2h ago
          </p>
        </div>
      </div>
    </div>
  )
}

// Miniature, realistic smartphone feed so a creator can instantly gauge how each
// thumbnail reads at true mobile size — the #1 place a click is won or lost.
function MobileFeedPreview({ options }) {
  const cards = options.filter((o) => o.image_url)
  return (
    <div className="al-fade-in mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
      {/* Phone shell */}
      <div
        className="mx-auto w-[268px] rounded-[2.3rem] border border-white/15 bg-zinc-900 p-2.5"
        style={{
          boxShadow:
            '0 0 50px -18px rgba(98,96,255,0.55), 0 20px 50px -20px rgba(0,0,0,0.9)',
        }}
      >
        <div className="overflow-hidden rounded-[1.7rem] bg-black">
          {/* Status bar + notch */}
          <div className="relative flex items-center justify-between px-4 pb-1 pt-2 text-[9px] font-semibold text-zinc-300">
            <span>9:41</span>
            <span className="absolute left-1/2 top-1.5 h-3.5 w-14 -translate-x-1/2 rounded-full bg-black ring-1 ring-white/10" />
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-[2px] border border-zinc-400/80" />
            </span>
          </div>
          {/* App header */}
          <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5">
            <span className="text-[11px] font-extrabold tracking-tight text-white">
              <span className="text-rose-500">▶</span> YouShort
            </span>
            <ImageIcon className="size-3 text-zinc-600" />
          </div>
          {/* Feed */}
          {cards.length ? (
            <div className="sidebar-scroll max-h-[340px] space-y-3 overflow-y-auto p-2.5">
              {cards.map((o, i) => (
                <FeedCard key={i} option={o} />
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-[11px] text-zinc-600">
              Upload a thumbnail to preview it in the feed.
            </div>
          )}
        </div>
      </div>
      <p className="mx-auto mt-3 max-w-xs text-center text-[11px] leading-relaxed text-zinc-500">
        This is how your thumbnails read in a real mobile feed — if the text is
        unreadable here, it's unreadable in the wild.
      </p>
    </div>
  )
}

// Premium pop-up for building a Visual Image Poll / Hook Test.
function NewHookTestModal({ onClose }) {
  const { addHookTest, recordDuelResult, toast } = useData()
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(() => [emptyOption(), emptyOption()])

  // AI critique agent state.
  const [isScanning, setIsScanning] = useState(false)
  const [analysis, setAnalysis] = useState(null) // array parallel to options
  const [duelData, setDuelData] = useState(null) // { analysis, theCoach, theCritic, verdict }
  const [duelError, setDuelError] = useState(null) // real AI failure message (no mock mask)
  const [scanId, setScanId] = useState(0) // bumps each scan to remount the duel
  const [showDuel, setShowDuel] = useState(false) // cinematic arena visibility
  const [showFeed, setShowFeed] = useState(false) // mobile feed simulation pane
  // Read the latest options at scan-completion without re-running the effect.
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // Any edit invalidates a prior scan so stale verdicts never linger.
  const clearAI = () => {
    setAnalysis(null)
    setDuelData(null)
    setDuelError(null)
    setShowDuel(false)
  }

  const loadPreset = (key) => {
    if (isScanning) return
    const preset = POLL_PRESETS[key]
    setQuestion(preset.question)
    // Clone so editing one published test never mutates the preset fixture.
    setOptions(preset.options.slice(0, MAX_OPTIONS).map((o) => ({ ...o })))
    clearAI()
  }

  const setOption = (i, next) => {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? next : o)))
    clearAI()
  }

  const addOption = () => {
    setOptions((prev) =>
      prev.length >= MAX_OPTIONS ? prev : [...prev, emptyOption()],
    )
    clearAI()
  }

  const removeOption = (i) => {
    setOptions((prev) =>
      prev.length <= MIN_OPTIONS ? prev : prev.filter((_, idx) => idx !== i),
    )
    clearAI()
  }

  // Run the scan: the cinematic AI-Brain loader plays while the real critique
  // is fetched, then the duel reveals.
  const runScan = () => {
    if (isScanning) return
    setAnalysis(null)
    setDuelData(null)
    setDuelError(null)
    setShowDuel(false)
    setIsScanning(true)
  }

  // Drive the scan: fetch the real critique while the AI-Brain loader plays, then
  // reveal the duel. The fight is 100% the model's output; on any failure (no API
  // key, network, malformed response) we fall back to the local mock so the
  // cinematic always runs. A minimum display time keeps the scan dramatic even
  // when the API answers instantly.
  useEffect(() => {
    if (!isScanning) return
    let cancelled = false

    const q = question
    const opts = optionsRef.current
    const minDelay = new Promise((resolve) => setTimeout(resolve, SCAN_DURATION_MS))

    Promise.all([fetchDuelScript(q, opts), minDelay])
      .then(([data]) => {
        if (cancelled) return
        setDuelData(data)
        setAnalysis(data.analysis)
        setDuelError(null)
        setScanId((n) => n + 1)
        setShowDuel(true)
        setIsScanning(false)
        // Real critique, real result — Critique Room reads this instead of
        // its old hardcoded mock.
        recordDuelResult({
          question: q,
          options: opts,
          analysis: data.analysis,
          theCoach: data.theCoach,
          theCritic: data.theCritic,
          verdict: data.verdict,
        })
      })
      .catch((err) => {
        if (cancelled) return
        console.error('AI critique request failed:', err)
        if (ALLOW_MOCK_FALLBACK) {
          const data = localDuelFallback(q, opts)
          setDuelData(data)
          setAnalysis(data.analysis)
          setDuelError(null)
        } else {
          // Surface the real failure — do NOT mask it with the mock.
          setDuelData(null)
          setAnalysis(null)
          setDuelError(err && err.message ? err.message : 'AI critique failed')
        }
        setScanId((n) => n + 1)
        setShowDuel(true)
        setIsScanning(false)
      })

    return () => {
      cancelled = true
    }
  }, [isScanning, question, recordDuelResult])

  // Only options with a title count; need at least the minimum to publish.
  const filledOptions = options.filter((o) => o.label.trim())
  const canPublish = question.trim() && filledOptions.length >= MIN_OPTIONS
  const canRemove = options.length > MIN_OPTIONS && !isScanning
  const canAdd = options.length < MAX_OPTIONS && !isScanning
  const hasAnyImage = options.some((o) => o.image_url)
  const hasScanResults = !isScanning && Array.isArray(analysis)

  const publish = (e) => {
    e.preventDefault()
    if (!canPublish) return
    addHookTest({
      question,
      status: 'testing',
      options: filledOptions,
    })
    toast(`Your ${filledOptions.length}-option test is now collecting votes.`, {
      title: 'Test published & running',
    })
    onClose()
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="al-modal-backdrop absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <form
        onSubmit={publish}
        className="al-modal-in al-modal-aura relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-turquoise/20 bg-zinc-950 p-6"
      >
        {/* ambient mint glow */}
        <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-turquoise/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-turquoise/10 ring-1 ring-turquoise/25"
              style={{ boxShadow: '0 0 22px -8px var(--al-tq)' }}
            >
              <ImageIcon className="size-4 text-turquoise" />
            </span>
            <h3
              className="text-lg font-bold tracking-tight text-turquoise"
              style={{ textShadow: '0 0 18px rgba(52,224,161,0.55)' }}
            >
              Create New Visual Poll / Hook Test
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Preset row */}
        <div className="relative mt-5 flex flex-wrap gap-2">
          {Object.entries(POLL_PRESETS).map(([key, preset]) => {
            const Icon = preset.icon
            return (
              <button
                key={key}
                type="button"
                onClick={() => loadPreset(key)}
                disabled={isScanning}
                className="inline-flex items-center gap-1.5 rounded-xl border border-turquoise/30 bg-turquoise/10 px-3 py-1.5 text-xs font-semibold text-turquoise transition-colors hover:bg-turquoise/15 disabled:opacity-40"
              >
                <Icon className="size-3.5" />
                {preset.label}
              </button>
            )
          })}
        </div>

        <div className="relative mt-5 space-y-4">
          <ModalField label="Poll Question / Hook Idea">
            <input
              type="text"
              required
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value)
                clearAI()
              }}
              disabled={isScanning}
              placeholder="Which thumbnail should I run?"
              className={`${modalInputCls} disabled:opacity-60`}
            />
          </ModalField>

          <div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {options.map((option, i) => (
                <OptionEditor
                  key={i}
                  letter={OPTION_LETTERS[i] ?? i + 1}
                  value={option}
                  onChange={(next) => setOption(i, next)}
                  onRemove={canRemove ? () => removeOption(i) : null}
                  scanning={isScanning}
                  result={hasScanResults ? analysis[i] : null}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addOption}
              disabled={!canAdd}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-turquoise/40 bg-turquoise/[0.06] px-4 py-2.5 text-sm font-semibold text-turquoise transition-colors hover:bg-turquoise/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="size-4" />
              {canAdd ? 'Add Option' : 'Maximum of 4 options'}
            </button>
          </div>
        </div>

        {/* Mobile Feed Simulation — see thumbnails at true mobile size */}
        {hasAnyImage && (
          <div className="relative mt-4">
            <button
              type="button"
              onClick={() => setShowFeed((v) => !v)}
              disabled={isScanning}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-periwinkle/40 bg-periwinkle/10 px-4 py-2.5 text-sm font-semibold text-periwinkle transition-colors hover:bg-periwinkle/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Smartphone className="size-4" />
              {showFeed ? 'Hide Mobile Feed Simulation' : 'Preview in Mobile Feed Simulation'}
            </button>
            {showFeed && <MobileFeedPreview options={options} />}
          </div>
        )}

        {/* Cyberpunk AI critique trigger */}
        <button
          type="button"
          onClick={runScan}
          disabled={isScanning || !hasAnyImage}
          title={
            hasAnyImage
              ? 'Run the Agent A7 visual critique'
              : 'Add at least one image to analyze'
          }
          className={[
            'relative mt-5 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-turquoise/50 bg-gradient-to-r from-turquoise/15 via-cyan-400/10 to-turquoise/15 px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-turquoise transition-all hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50',
            isScanning ? '' : 'al-ai-pulse',
          ].join(' ')}
          style={{ textShadow: '0 0 12px rgba(52,224,161,0.55)' }}
        >
          {isScanning ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Scanning visuals…
            </>
          ) : (
            <>🤖 Ask AI for Early Feedback</>
          )}
        </button>

        <div className="relative mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isScanning}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:text-zinc-100 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canPublish || isScanning}
            className="inline-flex items-center gap-2 rounded-xl bg-turquoise px-5 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ boxShadow: '0 0 24px -4px color-mix(in oklab, var(--al-tq) 67%, transparent)' }}
          >
            <Rocket className="size-4" /> Publish &amp; Run Test
          </button>
        </div>

      </form>
    </div>

    {/* Cinematic "AI Brain" takeover while the real critique is fetched. It
        portals over everything (including the modal) and hands off to the
        AgentDuel the instant results land. */}
    {isScanning && (
      <AIBrainLoader fullscreen title="AI Coach vs Critic · Deep Scan" frameCount={filledOptions.length || 2} />
    )}

    {/* Fullscreen AI review — sibling of the modal so its fixed overlay resolves
        against the viewport, not the transformed modal. Remounts per scan via
        scanId. Exiting only dismisses the arena; the modal and all of its
        inputs/scores stay intact underneath. */}
    {showDuel && (duelError || (duelData && analysis && analysis.length >= 2)) && (
      <AgentDuel
        key={scanId}
        error={duelError}
        analysis={duelData?.analysis}
        theCoach={duelData?.theCoach}
        theCritic={duelData?.theCritic}
        verdict={duelData?.verdict}
        onExit={() => setShowDuel(false)}
      />
    )}
    </>
  )
}

const modalInputCls =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-turquoise/40 focus:outline-none'

function ModalField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  )
}

// A single option: title + a premium image zone that accepts file upload,
// drag-and-drop, and clipboard paste (Ctrl+V). The image is stored as a base64
// data URL so it persists in localStorage and renders just like a remote URL.
// onRemove is null when removing would drop below the minimum option count.
// `scanning` shows the AI laser sweep; `result` is the Agent A7 verdict for
// this option once a scan completes.
function OptionEditor({ letter, value, onChange, onRemove, scanning, result }) {
  const [broken, setBroken] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const fileRef = useRef(null)
  const url = value.image_url || ''
  const showPreview = url && !broken

  const setImage = (next) => {
    setBroken(false)
    onChange({ ...value, image_url: next })
  }

  const ingest = async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setProcessing(true)
    try {
      setImage(await fileToImageDataURL(file))
    } catch (err) {
      console.error('Image processing failed:', err)
    } finally {
      setProcessing(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    ingest(firstImageFile(e.dataTransfer))
  }

  // Ctrl+V anywhere in the focused image zone grabs a copied screenshot/image.
  const onPaste = (e) => {
    const file = firstImageFile(e.clipboardData)
    if (file) {
      e.preventDefault()
      ingest(file)
    }
  }

  const openPicker = () => fileRef.current?.click()

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-turquoise/15 text-xs font-bold text-turquoise">
            {letter}
          </span>
          <span className="text-xs font-semibold text-zinc-300">Option {letter}</span>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex size-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-rose-400/10 hover:text-rose-400"
            title={`Remove option ${letter}`}
            aria-label={`Remove option ${letter}`}
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      {/* Hidden native file input, opened by the dropzone. */}
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="hidden"
        onChange={(e) => {
          ingest(e.target.files?.[0])
          e.target.value = '' // allow re-selecting the same file
        }}
      />

      {showPreview ? (
        // Loaded image — preview with a clear badge to swap it out.
        <div
          className="group relative aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black/40"
          tabIndex={0}
          onPaste={scanning ? undefined : onPaste}
        >
          <img
            src={url}
            alt={value.label || `Option ${letter}`}
            className="size-full object-cover"
            onError={() => setBroken(true)}
          />

          {/* Agent A7 HUD overlay — metrics injected on top of the image */}
          {result && (
            <div className="al-fade-in absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/45 to-transparent p-2">
              <div
                className="rounded-lg border border-turquoise/40 bg-black/60 p-2 backdrop-blur-md"
                style={{ boxShadow: '0 0 22px -8px var(--al-tq)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-turquoise/70">
                    Predicted CTR
                  </span>
                  {result.isWinner && (
                    <span className="rounded bg-turquoise/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-turquoise">
                      ★ Winner
                    </span>
                  )}
                </div>
                <div
                  className="text-xl font-extrabold tabular-nums text-turquoise"
                  style={{ textShadow: '0 0 14px rgba(52,224,161,0.6)' }}
                >
                  {result.ctr}%
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-[9px] text-zinc-300">
                  <span>
                    Contrast: <b className="text-zinc-100">{result.contrast}</b>
                  </span>
                  <span>
                    Impact: <b className="text-zinc-100">{result.emotion}</b>
                  </span>
                </div>
              </div>
            </div>
          )}

          {!scanning && !result && (
            <button
              type="button"
              onClick={() => setImage('')}
              className="absolute right-1.5 top-1.5 inline-flex size-7 items-center justify-center rounded-lg bg-black/70 text-zinc-200 backdrop-blur transition-colors hover:bg-rose-500/80 hover:text-white"
              title="Remove image"
              aria-label={`Remove image from option ${letter}`}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      ) : (
        // Empty — sleek dashed dropzone (click / drop / paste).
        <div
          role="button"
          tabIndex={0}
          onClick={scanning ? undefined : openPicker}
          onKeyDown={(e) => {
            if (!scanning && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              openPicker()
            }
          }}
          onPaste={scanning ? undefined : onPaste}
          onDragOver={(e) => {
            if (scanning) return
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={scanning ? undefined : onDrop}
          className={[
            'flex aspect-video w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-center transition-colors focus:outline-none',
            scanning ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            dragging
              ? 'border-turquoise bg-turquoise/10'
              : 'border-white/15 bg-black/40 hover:border-turquoise/50 hover:bg-turquoise/[0.04]',
          ].join(' ')}
        >
          {processing ? (
            <>
              <Loader2 className="size-5 animate-spin text-turquoise" />
              <span className="text-[11px] text-zinc-400">Processing…</span>
            </>
          ) : broken ? (
            <>
              <ImageIcon className="size-5 text-rose-400/80" />
              <span className="px-2 text-[11px] text-zinc-400">
                Image failed to load — click to upload
              </span>
            </>
          ) : (
            <>
              <UploadCloud className="size-5 text-turquoise" />
              <span className="text-[11px] font-medium text-zinc-300">
                Click to upload or Drag &amp; Drop
              </span>
              <span className="text-[10px] text-zinc-500">
                or paste (Ctrl+V) · PNG, JPG, WEBP
              </span>
            </>
          )}
        </div>
      )}

      <input
        type="text"
        value={value.label}
        onChange={(e) => onChange({ ...value, label: e.target.value })}
        disabled={scanning}
        placeholder="Option Title / Hook"
        className={`${modalInputCls} mt-2.5 disabled:opacity-60`}
      />

      {/* Agent A7 written critique, revealed after a scan */}
      {result && (
        <div
          className={[
            'al-fade-in mt-2 rounded-lg border p-2.5',
            result.isWinner
              ? 'border-turquoise/40 bg-turquoise/[0.07]'
              : 'border-white/10 bg-white/[0.03]',
          ].join(' ')}
        >
          <div className="flex items-center gap-1.5">
            <Bot
              className={result.isWinner ? 'size-3.5 text-turquoise' : 'size-3.5 text-zinc-400'}
            />
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-turquoise">
              AI Insight · Agent A7
            </span>
            <span
              className={[
                'ml-auto rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide',
                result.isWinner
                  ? 'bg-turquoise/15 text-turquoise'
                  : 'bg-amber-400/10 text-amber-300',
              ].join(' ')}
            >
              {result.isWinner ? 'Top pick' : 'Needs work'}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-300">
            {result.insight}
          </p>
        </div>
      )}
    </div>
  )
}

export default function CreatorStudio() {
  const { hookTests } = useData()
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)

  // Created tests live at the top of the list so a freshly published test is
  // visible immediately; the static demo hooks follow.
  const allHooks = [...hookTests, ...myHooks]
  const filtered =
    filter === 'all' ? allHooks : allHooks.filter((h) => h.status === filter)

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'live', label: 'Live' },
    { id: 'testing', label: 'Testing' },
    { id: 'draft', label: 'Drafts' },
  ]

  return (
    <div className="w-full">
      {/* Full-bleed cinematic hero */}
      <div className="relative -mx-5 -mt-8 overflow-hidden px-5 pb-10 pt-16 sm:-mx-8 sm:px-8 sm:pt-20">
        <AmbientGlowField />
        <div className="relative mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="al-display al-breathe text-6xl text-zinc-50 sm:text-7xl">
              Creator Studio
            </h2>
            <p className="mt-3 text-sm text-zinc-500">
              Track every hook you're testing and see what's converting.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-turquoise px-4 py-2.5 text-sm font-semibold text-black shadow-lg shadow-turquoise/25 transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ boxShadow: '0 0 20px -4px color-mix(in oklab, var(--al-tq) 53%, transparent)' }}
          >
            <Plus className="size-4" />
            New hook test
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl">
      {/* Stat cards — staggered arrival */}
      <div className="mt-2 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {studioStats.map((s, i) => (
          <motion.div key={s.id} custom={i} initial="hidden" animate="shown" variants={rise}>
            <TiltCard className="h-full">
              <StatCard stat={s} />
            </TiltCard>
          </motion.div>
        ))}
      </div>

      {/* Chart panel */}
      <div className="mt-4 rounded-2xl border border-white/10 al-glass p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-turquoise" />
            <h3 className="text-sm font-semibold text-zinc-200">
              Hook score · last 14 days
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-turquoise/10 px-2.5 py-1 text-xs font-semibold text-turquoise">
            <Sparkles className="size-3" /> Trending up
          </span>
        </div>
        <Sparkline data={scoreHistory} />
      </div>

      {/* Filters */}
      <div className="mt-6 flex items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={[
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              filter === f.id
                ? 'bg-white/10 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Hook table */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 al-glass">
        <div className="hidden grid-cols-12 gap-4 border-b border-white/10 px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500 md:grid">
          <div className="col-span-6">Hook</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Score</div>
          <div className="col-span-1 text-right">Win</div>
          <div className="col-span-2 text-right">Impressions</div>
        </div>

        <div className="divide-y divide-white/5">
          {filtered.map((hook) => {
            const p = platforms[hook.platform]
            return (
              <div
                key={hook.id}
                className="grid grid-cols-1 items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02] md:grid-cols-12"
              >
                <div className="col-span-6 flex items-center gap-3">
                  <ScoreRing score={hook.score} />
                  {hook.options?.some((o) => o.image_url) && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      {hook.options.map((o) => (
                        <HookThumb key={o.id} src={o.image_url} alt={o.label} />
                      ))}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-100">
                      {hook.text}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                      <span
                        className="inline-flex items-center gap-1"
                        style={{ color: p.color }}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.label}
                      </span>
                      <span>·</span>
                      <span>{hook.votes.toLocaleString()} votes</span>
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <span
                    className={[
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize',
                      statusStyles[hook.status],
                    ].join(' ')}
                  >
                    {hook.status}
                  </span>
                </div>

                <div className="col-span-1 flex items-center justify-end gap-1 text-sm font-semibold text-zinc-200">
                  <TrendIcon trend={hook.trend} />
                  {hook.score}
                </div>

                <div className="col-span-1 text-right text-sm text-zinc-400">
                  {hook.winRate ? `${Math.round(hook.winRate * 100)}%` : '—'}
                </div>

                <div className="col-span-2 text-right text-sm text-zinc-400">
                  {hook.impressions ? hook.impressions.toLocaleString() : '—'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showModal && <NewHookTestModal onClose={() => setShowModal(false)} />}
      </div>
    </div>
  )
}
