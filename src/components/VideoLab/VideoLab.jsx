import { useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Clapperboard,
  Copy,
  Crown,
  Film,
  Ghost,
  Loader2,
  Sparkles,
  Swords,
  UploadCloud,
  Wand2,
  Zap,
} from 'lucide-react'
import { motion } from 'motion/react'
import { analyzeVideo, captureKeyframes } from '../../lib/video'
import { fetchGrowthHacks } from '../../lib/growth'
import { streamAutopsy } from '../../lib/autopsy'
import { springs, rise } from '../../design/tokens/motion'
import Glass from '../../design/components/Glass'
import TiltCard from '../../design/components/TiltCard'
import AmbientOrb, { AmbientGlowField } from '../../design/components/AmbientOrb'
import AIBrainLoader from '../AIBrainLoader'

// Per-frame metric accents, matching the app's mint / gold / crimson palette.
const FRAME_METRICS = [
  { key: 'visualHook', label: 'Hook', color: '#ff4d6d' },
  { key: 'clarity', label: 'Clarity', color: '#34e0a1' },
  { key: 'pacing', label: 'Pacing', color: '#facc15' },
]

const COACH_COLOR = '#34e0a1'
const CRITIC_COLOR = '#ff4d6d'

// A single retention "interest" score for a keyframe, weighted toward the
// metrics that actually keep a viewer watching (raw hook + momentum), lightly
// tempered by clarity. Returns a 0–10 number.
function frameInterest(frame) {
  const s = frame.scores || {}
  const v =
    0.5 * (Number(s.visualHook) || 0) +
    0.3 * (Number(s.pacing) || 0) +
    0.2 * (Number(s.clarity) || 0)
  return Math.round(v * 10) / 10
}

// Map an interest score to the heatmap palette: mint (holding) → gold (cooling)
// → crimson (drop-off risk).
function heatColor(v) {
  if (v >= 7) return '#34e0a1'
  if (v >= 4.5) return '#facc15'
  return '#ff4d6d'
}
function heatLabel(v) {
  if (v >= 7) return 'High interest'
  if (v >= 4.5) return 'Cooling'
  return 'Drop-off risk'
}

// The Retention Heatmap: a glowing timeline that connects the chronological
// keyframes and gradient-shifts from mint → gold → crimson so a creator sees, at
// a glance, exactly where the viewer's interest peaks and where they get bored.
function RetentionHeatmap({ frames }) {
  const nodes = frames.map((f, i) => {
    const v = frameInterest(f)
    return {
      pct: ((i + 0.5) / frames.length) * 100,
      v,
      color: heatColor(v),
      label: f.label,
    }
  })

  // Positional gradient: each node's color pinned at its point on the line, with
  // the end colors carried out to the edges so the bar never fades to nothing.
  const stops = nodes.map((n) => `${n.color} ${n.pct.toFixed(1)}%`).join(', ')
  const gradient = `linear-gradient(90deg, ${nodes[0].color} 0%, ${stops}, ${
    nodes[nodes.length - 1].color
  } 100%)`

  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-black/40 px-5 pb-5 pt-4">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-turquoise" />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-400">
            Retention Heatmap
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-[#34e0a1]" /> Holding
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-[#facc15]" /> Cooling
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-[#ff4d6d]" /> Drop-off
          </span>
        </div>
      </div>

      {/* The glowing timeline bar + interest nodes. */}
      <div className="relative mx-1">
        {/* Floating interest chips above each node. */}
        {nodes.map((n, i) => (
          <div
            key={`chip-${i}`}
            className="absolute -translate-x-1/2"
            style={{ left: `${n.pct}%`, bottom: 'calc(100% + 10px)' }}
          >
            <div
              className="whitespace-nowrap rounded-lg border bg-black/70 px-2 py-1 text-center backdrop-blur"
              style={{ borderColor: `${n.color}66`, boxShadow: `0 0 20px -8px ${n.color}` }}
            >
              <div
                className="font-mono text-sm font-extrabold tabular-nums"
                style={{ color: n.color, textShadow: `0 0 12px ${n.color}88` }}
              >
                {n.v.toFixed(1)}
              </div>
              <div className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">
                {heatLabel(n.v)}
              </div>
            </div>
          </div>
        ))}

        <div
          className="relative h-2.5 w-full rounded-full"
          style={{ background: gradient, boxShadow: '0 0 24px -6px rgba(52,224,161,0.5)' }}
        >
          {/* Drifting sheen so the line feels alive without lying about color. */}
          <div
            className="al-heat-flow absolute inset-0 rounded-full opacity-70 mix-blend-overlay"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)',
            }}
          />
          {/* Node dots pinned to each keyframe. */}
          {nodes.map((n, i) => (
            <span
              key={`node-${i}`}
              className="al-node-pulse absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black"
              style={{
                left: `${n.pct}%`,
                background: n.color,
                boxShadow: `0 0 14px 2px ${n.color}`,
              }}
            />
          ))}
        </div>

        {/* Timestamp labels under each node. */}
        <div className="relative mt-3 h-4">
          {nodes.map((n, i) => (
            <span
              key={`lab-${i}`}
              className="absolute -translate-x-1/2 whitespace-nowrap font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
              style={{ left: `${n.pct}%` }}
            >
              {n.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// One glowing /10 metric bar.
function ScoreBar({ label, value, color }) {
  const v = Math.max(0, Math.min(10, Number(value) || 0))
  return (
    <div>
      <div className="flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        <span>{label}</span>
        <span className="font-mono text-xs" style={{ color }}>
          {v}
          <span className="text-zinc-600">/10</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${v * 10}%`,
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            boxShadow: `0 0 10px -1px ${color}`,
          }}
        />
      </div>
    </div>
  )
}

// One chronological keyframe: snapshot + label + per-frame scores + note.
function FrameCard({ frame, index }) {
  const scores = frame.scores || {}
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-black/50 p-3">
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
        {frame.image ? (
          <img
            src={frame.image}
            alt={frame.label}
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center text-zinc-700">
            <Film className="size-8" />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-turquoise backdrop-blur-sm">
          {index + 1} · {frame.label}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {FRAME_METRICS.map((m) => (
          <ScoreBar key={m.key} label={m.label} value={scores[m.key]} color={m.color} />
        ))}
      </div>

      {frame.note && (
        <p className="mt-3 text-xs leading-relaxed text-zinc-400">{frame.note}</p>
      )}
    </div>
  )
}

// Coach (mint) / Critic (crimson) text panel.
function CritiquePanel({ icon: Icon, title, subtitle, color, text }) {
  return (
    <div
      className="rounded-2xl border bg-black/50 p-5"
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
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">{subtitle}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-zinc-100 sm:text-base">{text}</p>
    </div>
  )
}

// The status engine copy for the Growth-Hack generator (a lighter, text-only
// pass than the full visual analysis).
const GROWTH_PHASES = [
  "🧪 Isolating the Critic's core objections...",
  '🔮 Engineering an irresistible curiosity gap...',
  '🎨 Drafting the blunt visual directive...',
  '🎬 Rewriting your first 3 seconds for retention...',
]

// The three blueprint slots, in display order, with their palette accents.
const BLUEPRINTS = [
  {
    key: 'curiosityHook',
    emoji: '🔮',
    title: 'The Curiosity Gap Hook',
    subtitle: 'High-CTR headline re-write',
    color: '#34e0a1',
  },
  {
    key: 'visualDirective',
    emoji: '🎨',
    title: 'Visual Directive',
    subtitle: 'One blunt design instruction',
    color: '#facc15',
  },
  {
    key: 'pacingSaver',
    emoji: '🎬',
    title: 'The Pacing Saver',
    subtitle: 'Save the first 3 seconds',
    color: '#ff4d6d',
  },
]

// Copy-to-clipboard button with a transient "Copied" confirmation.
function CopyButton({ text, color }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked — no-op */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95"
      style={{
        borderColor: `${color}55`,
        color,
        background: `${color}12`,
      }}
    >
      {copied ? (
        <>
          <Check className="size-3.5" /> Copied
        </>
      ) : (
        <>
          <Copy className="size-3.5" /> Copy
        </>
      )}
    </button>
  )
}

// The Instant "AI Growth-Hack" Laboratory — sits below the verdict and turns the
// Critic's complaints into three concrete, copyable blueprints on demand.
function GrowthHackLab({ result }) {
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const run = async () => {
    if (status === 'loading') return
    setStatus('loading')
    setError(null)
    try {
      const hacks = await fetchGrowthHacks({
        query: result.query,
        theCritic: result.theCritic,
        theCoach: result.theCoach,
        verdict: result.verdict?.summary,
        contentType: 'video',
        // The per-frame notes carry the literal on-screen observations (HUD,
        // gameplay elements, kitchen shots, product close-ups, …) — the text
        // model uses these to lock the correct niche instead of defaulting to
        // generic business/marketing template phrasing.
        frameNotes: Array.isArray(result.frames)
          ? result.frames.map((f) => ({ label: f.label, t: f.t, note: f.note }))
          : [],
      })
      setData(hacks)
      setStatus('done')
    } catch (err) {
      console.error('Growth-hack generation failed:', err)
      setError(err?.message || 'Growth-hack generation failed')
      setStatus('error')
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-turquoise/25 bg-gradient-to-b from-turquoise/[0.06] to-black/40 p-6 sm:p-7"
      style={{ boxShadow: '0 0 70px -30px rgba(52,224,161,0.7)' }}
    >
      {/* ambient corner glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-turquoise/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-periwinkle/15 blur-3xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="size-5 text-turquoise" style={{ filter: 'drop-shadow(0 0 10px var(--al-tq))' }} />
            <h3
              className="text-lg font-extrabold tracking-tight text-turquoise sm:text-xl"
              style={{ textShadow: '0 0 20px rgba(52,224,161,0.5)' }}
            >
              ⚡ Instant AI Growth-Hack Laboratory
            </h3>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Turn the Critic's complaints into three ready-to-ship fixes.
          </p>
        </div>

        {status !== 'loading' && (
          <button
            type="button"
            onClick={run}
            className="al-ai-pulse inline-flex items-center gap-2 rounded-xl border border-turquoise/50 bg-turquoise/15 px-5 py-3 text-sm font-bold uppercase tracking-wide text-turquoise transition-all hover:brightness-125 active:scale-[0.98]"
            style={{ textShadow: '0 0 12px rgba(52,224,161,0.55)' }}
          >
            <Wand2 className="size-4" />
            {status === 'done' ? 'Regenerate Fixes' : 'Fix Weaknesses Automatically'}
          </button>
        )}
      </div>

      {status === 'loading' && (
        <div className="relative mt-8">
          <AIBrainLoader compact title="Growth-Hack Engine · Synthesizing" phases={GROWTH_PHASES} />
        </div>
      )}

      {status === 'error' && (
        <div
          className="relative mt-6 rounded-2xl border border-rose-500/50 bg-black/60 p-5"
          style={{ boxShadow: '0 0 50px -24px #ff4d6d' }}
        >
          <div className="flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-[0.2em] text-rose-400">
            <AlertTriangle className="size-4" /> Growth-hack failed
          </div>
          <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-zinc-950 p-3 text-left text-sm text-rose-200">
            {error}
          </pre>
        </div>
      )}

      {status === 'done' && data && (
        <div className="relative mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
          {BLUEPRINTS.map((b, i) => (
            <TiltCard key={b.key} className="h-full">
            <motion.div
              custom={i}
              initial="hidden"
              animate="shown"
              variants={rise}
              className="flex h-full flex-col rounded-2xl border bg-black/50 p-4"
              style={{ borderColor: `${b.color}44`, boxShadow: `0 0 44px -26px ${b.color}` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{b.emoji}</span>
                  <div>
                    <p
                      className="font-mono text-xs font-bold uppercase tracking-wider"
                      style={{ color: b.color }}
                    >
                      {b.title}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                      {b.subtitle}
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-100">
                {data[b.key]}
              </p>
              <div className="mt-4 flex justify-end">
                <CopyButton text={data[b.key]} color={b.color} />
              </div>
            </motion.div>
            </TiltCard>
          ))}
        </div>
      )}
    </div>
  )
}

const AUTOPSY_COLOR = '#8b7cff'

// The "Video Autopsy" — a cinematic, streamed narration of a viewer's
// attention moving through the clip, powered by the local Ollama pipeline.
// Sits below the Growth-Hack lab and reveals text live as it streams.
function AutopsyPanel({ result }) {
  const [status, setStatus] = useState('idle') // idle | streaming | done | error
  const [text, setText] = useState('')
  const [error, setError] = useState(null)

  const run = async () => {
    if (status === 'streaming') return
    setStatus('streaming')
    setError(null)
    setText('')
    try {
      await streamAutopsy(
        {
          query: result.query,
          theCoach: result.theCoach,
          theCritic: result.theCritic,
          verdict: result.verdict?.summary,
          frames: result.frames,
        },
        (_chunk, full) => setText(full),
      )
      setStatus('done')
    } catch (err) {
      console.error('Video Autopsy failed:', err)
      setError(err?.message || 'Video Autopsy failed')
      setStatus('error')
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl border p-6 sm:p-7"
      style={{
        borderColor: `${AUTOPSY_COLOR}40`,
        background: `linear-gradient(160deg, ${AUTOPSY_COLOR}14, rgba(8,6,20,0.92))`,
        boxShadow: `0 0 70px -30px ${AUTOPSY_COLOR}aa`,
      }}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full blur-3xl" style={{ background: `${AUTOPSY_COLOR}22` }} />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Ghost className="size-6" style={{ color: AUTOPSY_COLOR }} />
          <div>
            <p
              className="font-mono text-sm font-bold uppercase tracking-[0.25em]"
              style={{ color: AUTOPSY_COLOR, textShadow: `0 0 14px ${AUTOPSY_COLOR}66` }}
            >
              Video Autopsy
            </p>
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">
              A cinematic narration of this clip's retention · Local AI
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={run}
          disabled={status === 'streaming'}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: AUTOPSY_COLOR, boxShadow: `0 0 30px -8px ${AUTOPSY_COLOR}` }}
        >
          {status === 'streaming' ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Narrating…
            </>
          ) : (
            <>
              <Ghost className="size-4" /> {status === 'done' ? 'Narrate Again' : 'Run Autopsy'}
            </>
          )}
        </button>
      </div>

      {status === 'error' && (
        <div
          className="relative mt-6 rounded-2xl border border-rose-500/50 bg-black/60 p-5"
          style={{ boxShadow: '0 0 50px -24px #ff4d6d' }}
        >
          <div className="flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-[0.2em] text-rose-400">
            <AlertTriangle className="size-4" /> Autopsy failed
          </div>
          <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-zinc-950 p-3 text-left text-sm text-rose-200">
            {error}
          </pre>
        </div>
      )}

      {text && (
        <div
          className="al-fade-in relative mt-6 rounded-2xl border border-white/10 bg-black/40 p-5 sm:p-6"
        >
          <p className="whitespace-pre-wrap font-serif text-base italic leading-relaxed text-zinc-100 sm:text-lg">
            {text}
            {status === 'streaming' && (
              <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse align-middle" style={{ background: AUTOPSY_COLOR }} />
            )}
          </p>
          {status === 'done' && (
            <div className="mt-4 flex justify-end">
              <CopyButton text={text} color={AUTOPSY_COLOR} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function VideoLab() {
  const [query, setQuery] = useState('')
  const [file, setFile] = useState(null)
  const [frames, setFrames] = useState(null) // captured keyframes (preview)
  const [result, setResult] = useState(null) // analysis response
  const [phase, setPhase] = useState('idle') // idle | extracting | analyzing | done | error
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  const busy = phase === 'extracting' || phase === 'analyzing'

  const pickFile = (f) => {
    if (!f || !f.type.startsWith('video/')) {
      setError('Please choose a video file (.mp4, .mov, .webm …)')
      setPhase('error')
      return
    }
    setFile(f)
    setError(null)
    setResult(null)
    setFrames(null)
    setPhase('idle')
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    pickFile(e.dataTransfer.files?.[0])
  }

  const run = async () => {
    if (!file || busy) return
    setError(null)
    setResult(null)
    try {
      setPhase('extracting')
      const captured = await captureKeyframes(file)
      setFrames(captured) // ready the snapshots for the reveal
      setPhase('analyzing')
      const analysis = await analyzeVideo(query, captured)
      // Merge the captured images into the analyzed frames for display.
      const merged = analysis.frames.map((f, i) => ({
        ...f,
        image: captured[i]?.image ?? null,
      }))
      // Keep the focus query on the result so the Growth-Hack lab can reuse it.
      setResult({ ...analysis, frames: merged, query })
      setPhase('done')
    } catch (err) {
      console.error('Video analysis failed:', err)
      setError(err?.message || 'Video analysis failed')
      setPhase('error')
    }
  }

  const verdictScore = result?.verdict?.score ?? 0
  const previewFrames = result?.frames || frames

  return (
    <div className="w-full">
      {/* Full-bleed editorial hero — oversized breathing Fraunces display
          against the open sky, edge to edge. */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.gentle}
        className="relative -mx-5 -mt-8 overflow-hidden px-5 pb-10 pt-16 sm:-mx-8 sm:px-8 sm:pt-20"
      >
        <AmbientGlowField />
        <div className="relative mx-auto flex max-w-5xl items-end gap-5">
          <AmbientOrb icon={Clapperboard} className="mb-3" />
          <div>
            <h1 className="al-display al-breathe text-6xl text-white sm:text-7xl">
              VideoLab
            </h1>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-500">
              Hook · Setup · Retention — frame by frame
            </p>
          </div>
        </div>
      </motion.div>

      <div className="mx-auto max-w-5xl">

      {/* Input card */}
      <Glass className="mt-6 rounded-3xl p-5 sm:p-6">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Focus / question
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={busy}
            placeholder="e.g. Is the pacing engaging enough to hold a viewer past 10 seconds?"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-turquoise/40 focus:outline-none disabled:opacity-60"
          />
        </label>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !busy && fileRef.current?.click()}
          className={[
            'mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
            dragging
              ? 'border-turquoise/60 bg-turquoise/5'
              : 'border-white/15 bg-white/[0.02] hover:border-turquoise/40',
            busy ? 'pointer-events-none opacity-60' : '',
          ].join(' ')}
        >
          <UploadCloud className="size-7 text-turquoise" />
          <p className="text-sm font-medium text-zinc-200">
            {file ? file.name : 'Drop a short video here, or click to browse'}
          </p>
          <p className="text-xs text-zinc-500">.mp4 / .mov / .webm — we snapshot 0s, 3s &amp; 10s</p>
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>

        <button
          type="button"
          onClick={run}
          disabled={!file || busy}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-turquoise px-5 py-3 text-sm font-bold text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ boxShadow: '0 0 24px -4px color-mix(in oklab, var(--al-tq) 67%, transparent)' }}
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {phase === 'extracting' ? 'Capturing keyframes…' : 'Analyzing retention…'}
            </>
          ) : (
            <>
              <Film className="size-4" /> Analyze Retention
            </>
          )}
        </button>
      </Glass>

      {/* Cinematic "AI Brain" takeover while extracting/analyzing. */}
      {busy && (
        <AIBrainLoader fullscreen title="VideoLab · Retention Engine" />
      )}

      {/* Error */}
      {phase === 'error' && error && (
        <div
          className="mt-6 rounded-2xl border border-rose-500/50 bg-black/60 p-5"
          style={{ boxShadow: '0 0 50px -24px #ff4d6d' }}
        >
          <div className="flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-[0.2em] text-rose-400">
            <AlertTriangle className="size-4" /> Analysis failed
          </div>
          <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-zinc-950 p-3 text-left text-sm text-rose-200">
            {error}
          </pre>
          <p className="mt-3 text-xs leading-relaxed text-zinc-400">
            Video analysis needs a vision model. Make sure Ollama is running and{' '}
            <span className="font-mono text-zinc-300">OLLAMA_MODEL=llava</span> is set, then
            restart the API.
          </p>
        </div>
      )}

      {/* Keyframes — retention heatmap timeline + the chronological snapshots. */}
      {previewFrames && (
        <div className="mt-8">
          <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.35em] text-zinc-500">
            Chronological Keyframes
          </p>
          {result && <RetentionHeatmap frames={result.frames} />}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {previewFrames.map((f, i) => (
              <motion.div
                key={i}
                custom={i}
                initial="hidden"
                animate="shown"
                variants={rise}
              >
                <TiltCard className="h-full">
                  <FrameCard frame={f} index={i} />
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Coach / Critic + verdict + Growth-Hack lab */}
      {result && (
        <div className="al-fade-in mt-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <CritiquePanel
              icon={Sparkles}
              title="The Coach"
              subtitle="What holds retention"
              color={COACH_COLOR}
              text={result.theCoach}
            />
            <CritiquePanel
              icon={Swords}
              title="The Critic"
              subtitle="Where they swipe away"
              color={CRITIC_COLOR}
              text={result.theCritic}
            />
          </div>

          {/* Verdict */}
          <div
            className="rounded-3xl border p-7 text-center"
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
              Retention Verdict
            </div>
            <p
              className="mt-3 font-mono text-4xl font-bold tracking-tight text-amber-100 tabular-nums sm:text-5xl"
              style={{ textShadow: '0 0 28px rgba(250,204,21,0.7)' }}
            >
              {verdictScore}
              <span className="text-2xl text-amber-300/80">/10</span>
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-amber-100/80">
              {result.verdict.summary}
            </p>
          </div>

          {/* Instant AI Growth-Hack Laboratory */}
          <GrowthHackLab result={result} />

          {/* Video Autopsy — cinematic narrated retention report */}
          <AutopsyPanel result={result} />
        </div>
      )}
      </div>
    </div>
  )
}
