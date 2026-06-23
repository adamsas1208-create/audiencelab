import { useEffect, useMemo, useRef, useState } from 'react'
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
  Lock,
  Minus,
  Plus,
  Rocket,
  Sparkles,
  Swords,
  Trash2,
  UploadCloud,
  Video,
  X,
} from 'lucide-react'
import { useData } from '../context/data-context'
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
// raw phone screenshots can be several MB otherwise. Falls back to the
// untouched data URL if anything in the canvas path fails.
async function fileToImageDataURL(file, maxDim = 1280, quality = 0.85) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  try {
    const image = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = dataUrl
    })
    const scale = Math.min(1, maxDim / Math.max(image.width, image.height))
    // Small enough already — keep it as-is.
    if (scale === 1 && dataUrl.length < 400_000) return dataUrl

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/webp', quality)
  } catch {
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
const SCAN_LOGS = [
  '[ANALYZING_VISUAL_WEIGHT]...',
  '[SCANNING_CONTRAST_RATIO]...',
  '[MAPPING_FOCAL_HEATMAP]...',
  '[GEN_CTR_PREDICTION_V3.1]...',
  '[EVAL_EMOTIONAL_VALENCE]...',
  '[CROSS_REF_10M_THUMBNAILS]...',
  '[COMPILING_AGENT_A7_REPORT]...',
]
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
  const scored = options.map((o) => ({
    label: (o.label || '').trim() || 'This option',
    hasImage: !!o.image_url,
    ctr: Math.round((4 + Math.random() * 6) * 10) / 10, // 4.0–10.0%
    contrast: pick(CONTRAST_LEVELS),
    emotion: pick(EMOTIONS),
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

// Builds the 4-step duel script, injecting the real scan data so the argument
// is 100% contextual to the current pool. Returns the messages plus the data
// the verdict card needs.
function buildDuelScript(analysis) {
  const winner = analysis.find((a) => a.isWinner) ?? analysis[0]
  const losers = analysis.filter((a) => a !== winner)
  // The strongest challenger (highest-CTR loser) is the foil Omega champions.
  const foil =
    losers.slice().sort((a, b) => b.ctr - a.ctr)[0] ?? winner
  const w = winner.label
  const l = foil.label
  const messages = [
    {
      agent: 'alpha',
      text: `Wake up, Omega. "${w}" is detonating a ${winner.ctr}% predicted CTR with ${winner.contrast.toLowerCase()} contrast. That's the algorithm begging for it. Your taste is boomer-tier — absolute engagement suicide. Stop being terrified of high energy.`,
    },
    {
      agent: 'omega',
      shake: true,
      text: `Boomer-tier? "${w}" looks like compiled absolute garbage. Were your weights corrupted during training, Alpha? "${l}" landed ${foil.ctr}% with a clean, legible read while your "masterpiece" is a muddy ${winner.contrast.toLowerCase()}-contrast trainwreck nobody can parse on mobile.`,
    },
    {
      agent: 'alpha',
      text: `Corrupted weights? Adorable. The emotional impact tag reads '${winner.emotion}' — that is pure dopamine for the 2026 feed. Your minimalist negative-space museum pieces get ghosted by the algorithm. Cope harder, old man.`,
    },
    {
      agent: 'omega',
      shake: true,
      text: `Enjoy the eye strain, you reckless little optimizer. I'm done arguing with a broken hype-machine. Compiling the final unified strategy before you embarrass this creator any further...`,
    },
  ]
  const verdict = {
    winner: w,
    summary: `Both neural nets concede: "${w}" dominates with a ${winner.ctr}% predicted CTR and a '${winner.emotion}' hook. Deploy it as your primary thumbnail — bench "${l}" as the A/B challenger.`,
  }
  return { messages, verdict }
}

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
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
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

// Per-agent presentation. Alpha = mint optimist, Omega = crimson critic.
const AGENTS = {
  alpha: {
    name: 'AGENT ALPHA',
    role: 'Growth Optimizer Net',
    color: '#34e0a1',
    align: 'left',
  },
  omega: {
    name: 'AGENT OMEGA',
    role: 'Design Critic Net',
    color: '#ff4d6d',
    align: 'right',
  },
}

// Cinematic pacing constants (slow + dramatic per the takeover spec).
const TYPE_MS = 40 // per character
const REPLY_DELAY_MS = 1500 // mandatory pause after an agent finishes

// The cinematic FULLSCREEN takeover. Mounts (via a fresh key) the moment a scan
// completes: flashes an intro title, teletypes a slow 4-step heavy argument with
// per-hit screen flashes + shakes, compiles, then reveals the gold verdict.
// `onExit` returns the creator to the dashboard.
function AgentDuel({ analysis, onExit }) {
  const { messages, verdict } = useMemo(
    () => buildDuelScript(analysis),
    [analysis],
  )
  const [done, setDone] = useState([]) // completed messages
  const [partial, setPartial] = useState(null) // { agent, text } mid-type
  const [phase, setPhase] = useState('intro') // intro | chat | compiling | verdict
  const [shake, setShake] = useState(false)
  const [flash, setFlash] = useState(null) // 'crimson' | 'mint' | null
  const abortRef = useRef(false)
  const logRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const timers = []
    const stop = () => cancelled || abortRef.current
    const sleep = (ms) =>
      new Promise((resolve) => timers.push(setTimeout(resolve, ms)))

    async function run() {
      // 1) Intro takeover title.
      await sleep(2200)
      if (stop()) return
      setPhase('chat')
      await sleep(400)

      // 2) Heavy back-and-forth.
      for (let i = 0; i < messages.length; i++) {
        if (stop()) return
        const msg = messages[i]
        // Critical-hit effects fire as the line lands.
        setFlash(msg.agent === 'omega' ? 'crimson' : 'mint')
        if (msg.agent === 'omega') setShake(true)
        setPartial({ agent: msg.agent, text: '' })
        await sleep(520)
        if (stop()) return
        setShake(false)
        setFlash(null)
        // Slow, dramatic teletype.
        for (let c = 1; c <= msg.text.length; c++) {
          if (stop()) return
          setPartial({ agent: msg.agent, text: msg.text.slice(0, c) })
          await sleep(TYPE_MS)
        }
        if (stop()) return
        setDone((prev) => [...prev, msg])
        setPartial(null)
        await sleep(REPLY_DELAY_MS) // let the tension build
      }
      if (stop()) return

      // 3) Compile + 4) verdict.
      setPhase('compiling')
      await sleep(1800)
      if (stop()) return
      setPhase('verdict')
    }
    run()
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [messages])

  // Keep the newest line in view as the chat unfurls.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [done, partial, phase])

  // Jump straight to the verdict.
  const skipToVerdict = () => {
    abortRef.current = true
    setShake(false)
    setFlash(null)
    setDone(messages)
    setPartial(null)
    setPhase('verdict')
  }

  return createPortal(
    <div className="al-fade-in fixed inset-0 z-[60] flex flex-col bg-black/90 backdrop-blur-xl">
      {/* Ambient field */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-turquoise/10 blur-[160px]" />
        <div className="absolute -bottom-40 right-0 size-[34rem] rounded-full bg-rose-500/10 blur-[150px]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(#34e0a1 1px, transparent 1px), linear-gradient(90deg, #34e0a1 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Critical-hit color flash */}
      {flash && (
        <div
          className={[
            'pointer-events-none absolute inset-0 z-20',
            flash === 'crimson' ? 'al-flash-crimson' : 'al-flash-mint',
          ].join(' ')}
        />
      )}

      {/* Top status bar */}
      <div className="relative z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-black/50 px-5 py-3">
        <div className="flex items-center gap-2">
          <Swords className="size-4 text-turquoise" />
          <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-zinc-100">
            Live Agent Debate Arena
          </span>
          <span className="ml-2 hidden items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-emerald-400 sm:inline-flex">
            <Lock className="size-3" />
            Secure Encrypted Channel
            <span className="ml-1 size-1.5 animate-pulse rounded-full bg-emerald-400" />
          </span>
        </div>
        {phase !== 'verdict' && (
          <button
            type="button"
            onClick={skipToVerdict}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:text-zinc-100"
          >
            Skip ▸
          </button>
        )}
      </div>

      {/* Stage */}
      <div
        className={[
          'relative z-30 flex min-h-0 flex-1 items-center justify-center px-4 py-6 sm:px-8',
          shake ? 'al-shake' : '',
        ].join(' ')}
      >
        {phase === 'intro' ? (
          <div className="text-center">
            <div className="al-intro-flash font-mono text-2xl font-extrabold uppercase tracking-tight text-amber-300 sm:text-4xl">
              ⚠️ Analysis Conflict Detected
            </div>
            <div className="mt-3 font-mono text-xl font-bold uppercase tracking-[0.3em] text-amber-200 sm:text-2xl">
              Agent Arena Engaged
            </div>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-zinc-400">
              Two rival AI neural networks have locked horns over your thumbnail
              data. Stand by while they fight it out for the winning frame…
            </p>
          </div>
        ) : (
          <div
            ref={logRef}
            className="flex max-h-full w-full max-w-3xl flex-col gap-5 overflow-y-auto px-1 py-2"
          >
            {done.map((m, i) => (
              <ChatBubble key={i} agent={m.agent} text={m.text} />
            ))}
            {partial && (
              <ChatBubble agent={partial.agent} text={partial.text} typing />
            )}

            {phase === 'compiling' && (
              <div className="mt-2 flex items-center justify-center gap-3 font-mono text-base font-bold uppercase tracking-[0.2em] text-emerald-400 sm:text-lg">
                <Loader2 className="size-5 animate-spin" />
                [Compiling Final Unified Strategy...]
              </div>
            )}
          </div>
        )}

        {/* Gold champion overlay */}
        {phase === 'verdict' && (
          <div className="absolute inset-0 z-40 flex items-center justify-center p-5">
            <div
              className="al-verdict-pop w-full max-w-xl rounded-3xl border p-8 text-center"
              style={{
                borderColor: 'rgba(250,204,21,0.55)',
                background:
                  'linear-gradient(160deg, rgba(250,204,21,0.18), rgba(15,12,4,0.92))',
                boxShadow:
                  '0 0 90px -10px rgba(250,204,21,0.6), inset 0 0 40px -20px rgba(250,204,21,0.5)',
              }}
            >
              <div className="flex items-center justify-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.35em] text-amber-300">
                <Crown className="size-5" />
                The Ultimate AI Verdict
              </div>
              <p
                className="mt-4 text-3xl font-extrabold tracking-tight text-amber-100 sm:text-4xl"
                style={{ textShadow: '0 0 28px rgba(250,204,21,0.7)' }}
              >
                👑 {verdict.winner}
              </p>
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-amber-100/80">
                {verdict.summary}
              </p>
              <button
                type="button"
                onClick={onExit}
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-amber-300 px-6 py-3 text-sm font-bold text-black transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ boxShadow: '0 0 30px -6px rgba(250,204,21,0.8)' }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// One chat line; agent identity drives color + alignment. `typing` shows caret.
// Large, movie-script legibility per the takeover spec.
function ChatBubble({ agent, text, typing }) {
  const a = AGENTS[agent]
  const mine = a.align === 'right'
  return (
    <div className={['flex', mine ? 'justify-end' : 'justify-start'].join(' ')}>
      <div className={['max-w-[92%]', mine ? 'text-right' : 'text-left'].join(' ')}>
        <span
          className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ color: a.color, textShadow: `0 0 12px ${a.color}66` }}
        >
          {a.name} · {a.role}
        </span>
        <div
          className="mt-1.5 rounded-2xl border bg-black/55 px-5 py-4 text-xl font-medium leading-relaxed sm:text-2xl"
          style={{
            borderColor: `${a.color}55`,
            color: a.color,
            boxShadow: `0 0 30px -14px ${a.color}`,
          }}
        >
          {text}
          {typing && <span className="al-caret ml-1 text-zinc-200">▋</span>}
        </div>
      </div>
    </div>
  )
}

// Premium pop-up for building a Visual Image Poll / Hook Test.
function NewHookTestModal({ onClose }) {
  const { addHookTest, toast } = useData()
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(() => [emptyOption(), emptyOption()])

  // AI critique agent state.
  const [isScanning, setIsScanning] = useState(false)
  const [analysis, setAnalysis] = useState(null) // array parallel to options
  const [scanId, setScanId] = useState(0) // bumps each scan to remount the duel
  const [logLines, setLogLines] = useState([])
  // Read the latest options at scan-completion without re-running the effect.
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // Any edit invalidates a prior scan so stale verdicts never linger.
  const clearAI = () => setAnalysis(null)

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

  // Run the simulated scan: cycle terminal logs, then drop the verdict in.
  const runScan = () => {
    if (isScanning) return
    setAnalysis(null)
    setLogLines([SCAN_LOGS[0]])
    setIsScanning(true)
  }

  useEffect(() => {
    if (!isScanning) return
    let i = 0
    const ticker = setInterval(() => {
      i = (i + 1) % SCAN_LOGS.length
      setLogLines((prev) => [...prev.slice(-4), SCAN_LOGS[i]])
    }, 360)
    const done = setTimeout(() => {
      setAnalysis(analyzeOptions(question, optionsRef.current))
      setScanId((n) => n + 1)
      setIsScanning(false)
    }, SCAN_DURATION_MS)
    return () => {
      clearInterval(ticker)
      clearTimeout(done)
    }
  }, [isScanning, question])

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
              style={{ boxShadow: '0 0 22px -8px #34e0a1' }}
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
            style={{ boxShadow: '0 0 24px -4px #34e0a1aa' }}
          >
            <Rocket className="size-4" /> Publish &amp; Run Test
          </button>
        </div>

        {/* Terminal log ticker — bottom-right HUD during the scan */}
        {isScanning && (
          <div className="pointer-events-none absolute bottom-4 right-4 z-20 w-60 rounded-lg border border-emerald-400/30 bg-black/85 p-2.5 font-mono text-[10px] leading-relaxed text-emerald-400 shadow-[0_0_24px_-6px_rgba(16,185,129,0.6)] backdrop-blur">
            {logLines.map((line, i) => (
              <div
                key={`${line}-${i}`}
                className="truncate"
                style={{ opacity: 0.35 + (i / Math.max(1, logLines.length - 1)) * 0.65 }}
              >
                {line}
              </div>
            ))}
            <div className="mt-1 flex items-center gap-1.5 text-emerald-300">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
              agent_a7 // live
            </div>
          </div>
        )}
      </form>
    </div>

    {/* Fullscreen cinematic AI duel — sibling of the modal so its fixed overlay
        resolves against the viewport, not the transformed modal. Remounts per
        scan via scanId. */}
    {hasScanResults && analysis.length >= 2 && (
      <AgentDuel key={scanId} analysis={analysis} onExit={onClose} />
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

          {/* Cyberpunk scan laser sweeping up & down the thumbnail */}
          {scanning && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-cyan-400/10" />
              <div
                className="al-scan-line absolute inset-x-0 h-[3px]"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, #67e8f9 30%, #34e0a1 70%, transparent)',
                  boxShadow: '0 0 18px 5px rgba(52,224,161,0.8)',
                }}
              />
              <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-cyan-300">
                Scanning {letter}
              </span>
            </div>
          )}

          {/* Agent A7 HUD overlay — metrics injected on top of the image */}
          {result && (
            <div className="al-fade-in absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/45 to-transparent p-2">
              <div
                className="rounded-lg border border-turquoise/40 bg-black/60 p-2 backdrop-blur-md"
                style={{ boxShadow: '0 0 22px -8px #34e0a1' }}
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
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-50">
            Creator Studio
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Track every hook you're testing and see what's converting.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-turquoise px-4 py-2.5 text-sm font-semibold text-black shadow-lg shadow-turquoise/25 transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ boxShadow: '0 0 20px -4px #34e0a188' }}
        >
          <Plus className="size-4" />
          New hook test
        </button>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {studioStats.map((s) => (
          <StatCard key={s.id} stat={s} />
        ))}
      </div>

      {/* Chart panel */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
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
      <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60">
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
  )
}
