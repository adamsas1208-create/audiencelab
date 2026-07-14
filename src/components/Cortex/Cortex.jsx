import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, Brain, Loader2, Sparkles } from 'lucide-react'
import { useCortexTopology } from './useCortexTopology'
import { useCortexInsights } from './useCortexInsights'
import NeuralWebCanvas from './NeuralWebCanvas'
import InsightCard from './InsightCard'
import ToneSlider from './ToneSlider'
import { springs } from '../../design/tokens/motion'

// The Cortex — the creator's cinematic mission-control room.
//
// Layout:
//   ┌────────────── HERO ──────────────┐
//   │ NEURAL WEB CANVAS │ TONE SLIDER  │
//   │                   │ 4 × INSIGHTS │
//   └──────────────────────────────────┘
// On tablet/mobile the two columns stack. The insights column reads the same
// live snapshot the neural web renders — same data, two projections.
export default function Cortex() {
  const [tone, setTone] = useState(45) // starts at "strategy" — a balanced default
  const topology = useCortexTopology()
  const insightsState = useCortexInsights(tone)

  return (
    <div className="mx-auto max-w-6xl">
      {/* Hero */}
      <div className="flex items-start gap-3">
        <span
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-turquoise/10 ring-1 ring-turquoise/25"
          style={{ boxShadow: '0 0 26px -6px var(--al-tq)' }}
        >
          <Brain
            className="size-6 text-turquoise"
            style={{ filter: 'drop-shadow(0 0 6px var(--al-tq))' }}
          />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-turquoise/25 bg-turquoise/10 px-2.5 py-1 text-[11px] font-semibold text-turquoise">
              <Sparkles className="size-3" />
              AI Cortex
            </span>
            {insightsState.niche && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                niche: {insightsState.niche}
              </span>
            )}
          </div>
          <h2 className="al-display mt-2 text-4xl text-zinc-50 sm:text-5xl">
            The Cortex
          </h2>
          <p className="mt-1 max-w-lg text-sm text-zinc-500">
            The living map of your audience — every contact, every poll, every
            hook, wired into one cinematic brain. Slide the tone to hear the
            same data as sober observation or as a coach&apos;s dare.
          </p>
        </div>
      </div>

      {/* Cockpit: canvas on the left, insights column on the right. */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Canvas frame */}
        <div
          className="relative overflow-hidden rounded-3xl border border-white/10 al-glass"
          style={{ aspectRatio: '5 / 4' }}
        >
          <NeuralWebCanvas topology={topology} />

          {/* Center "You" label — DOM so it stays crisp over the WebGL hub. */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
            style={{
              fontFamily: 'var(--al-font-mono, ui-monospace)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(247, 255, 251, 0.8)',
              marginTop: '38px',
              textShadow: '0 0 8px rgba(52, 224, 161, 0.55)',
            }}
          >
            You
          </div>

          {/* Live corner tag */}
          <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-turquoise backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-full bg-turquoise" />
            Neural web · live
          </div>
        </div>

        {/* Insights column */}
        <div className="flex flex-col gap-3">
          <ToneSlider value={tone} onChange={setTone} />
          <InsightsRing state={insightsState} tone={tone} />
        </div>
      </div>
    </div>
  )
}

// The four AI insights (or the appropriate degraded state) rendered as a
// vertical stack next to the neural web. State handling: loading → skeleton,
// hard error → alert card, hosted-demo (Ollama unreachable) → warm "sample-
// mode" card that names the limitation, empty (no data yet) → prompt to
// launch a poll or add a contact.
function InsightsRing({ state, tone }) {
  const { loading, insights, error, degraded, hasData } = state

  if (!hasData) {
    return (
      <div className="al-glass rounded-2xl border border-white/10 p-6 text-center">
        <p className="text-sm font-semibold text-zinc-100">
          The Cortex is watching, waiting
        </p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          Add your first contact or launch a poll — the moment you do, the ring
          pulses and the insights land here.
        </p>
      </div>
    )
  }

  if (loading && !insights) {
    return (
      <div className="al-glass flex items-center justify-center gap-2 rounded-2xl border border-white/10 py-10 text-sm text-zinc-500">
        <Loader2 className="size-4 animate-spin text-turquoise" />
        Reading the room…
      </div>
    )
  }

  if (error && degraded) {
    return (
      <div className="al-glass relative overflow-hidden rounded-2xl border border-amber-300/20 p-4">
        <div
          className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-amber-300/20 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-300" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
            AI narration offline
          </span>
        </div>
        <p className="relative mt-2 text-sm leading-relaxed text-zinc-200">
          The neural web is live — your data is animating in the ring — but the
          local AI that narrates the insights isn&apos;t running.
        </p>
        <p className="relative mt-2 text-xs text-zinc-500">{error}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="al-glass rounded-2xl border border-rose-400/20 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-rose-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
            Cortex error
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">{error}</p>
      </div>
    )
  }

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        // Keyed by tone bucket so the whole stack cross-fades when the slider
        // pushes the AI into a meaningfully different voice.
        key={Math.round(tone / 10)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={springs.soft}
        className="flex flex-col gap-3"
      >
        {(insights || []).map((it, i) => (
          <InsightCard key={it.id || i} insight={it} index={i} />
        ))}
      </motion.div>
    </AnimatePresence>
  )
}
