import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { BrainCircuit } from 'lucide-react'

// The default deep-analysis status engine. Each phase cross-fades in every
// 2.5s to build anticipation and telegraph that a real, multi-stage visual
// model is at work under the hood.
const AI_BRAIN_PHASES = [
  '🧬 Deconstructing media pixels & aspect ratios...',
  '🧠 Activating Coach & Critic visual vision models...',
  '👁️ Simulating user eye-tracking and focal weight...',
  '📈 Calculating predictive CTR and retention curves...',
]

// A shimmering placeholder card — stands in for a keyframe / score card.
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      <div className="al-skeleton aspect-video w-full rounded-xl" />
      <div className="mt-3 space-y-2">
        <div className="al-skeleton h-2 w-full rounded-full" />
        <div className="al-skeleton h-2 w-4/5 rounded-full" />
        <div className="al-skeleton h-2 w-3/5 rounded-full" />
      </div>
    </div>
  )
}

// A shimmering placeholder for a Coach / Critic text panel.
function SkeletonPanel() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2.5">
        <div className="al-skeleton size-9 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <div className="al-skeleton h-2.5 w-1/3 rounded-full" />
          <div className="al-skeleton h-2 w-1/4 rounded-full" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="al-skeleton h-2 w-full rounded-full" />
        <div className="al-skeleton h-2 w-11/12 rounded-full" />
        <div className="al-skeleton h-2 w-4/5 rounded-full" />
      </div>
    </div>
  )
}

// The glowing brain + the cross-fading status-text engine.
function BrainCore({ title, phases }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    // Cycle a fresh phase every 2.5s; loop so the copy stays alive through a
    // long (multi-minute, CPU) model call rather than freezing on the last line.
    const id = setInterval(() => setI((p) => (p + 1) % phases.length), 2500)
    return () => clearInterval(id)
  }, [phases.length])

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative flex size-20 items-center justify-center">
        <span className="al-brain-orb absolute inset-0 rounded-full bg-turquoise/10" />
        <BrainCircuit
          className="relative size-9 text-turquoise"
          style={{ filter: 'drop-shadow(0 0 14px rgba(52,224,161,0.85))' }}
        />
      </div>

      <p className="mt-4 font-mono text-[11px] font-bold uppercase tracking-[0.35em] text-turquoise/70">
        {title}
      </p>

      {/* Fixed-height slot so the swapping status line never shifts layout. */}
      <div className="mt-2 flex h-7 items-center justify-center">
        <p
          key={i}
          className="al-fade-in px-4 text-sm font-semibold text-zinc-100 sm:text-base"
          style={{ textShadow: '0 0 18px rgba(52,224,161,0.4)' }}
        >
          {phases[i]}
        </p>
      </div>

      {/* Indeterminate progress sheen. */}
      <div className="mt-4 h-1 w-64 max-w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="al-heat-flow h-full w-full"
          style={{
            background:
              'linear-gradient(90deg, transparent, #34e0a1, #6260ff, transparent)',
          }}
        />
      </div>

      {/* Phase progress dots. */}
      <div className="mt-3 flex items-center gap-1.5">
        {phases.map((_, d) => (
          <span
            key={d}
            className="size-1.5 rounded-full transition-all duration-500"
            style={{
              background: d === i ? '#34e0a1' : 'rgba(255,255,255,0.15)',
              boxShadow: d === i ? '0 0 8px #34e0a1' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Cinematic "AI Brain" loading experience: a dark, glowing skeleton dashboard
// crowned by a pulsing brain and a cross-fading deep-analysis status engine.
//
// Props:
//   fullscreen — render as a fixed, blurred takeover (via a portal) instead of
//                inline. Used while a whole view is analyzing.
//   compact    — show only the brain core (no skeleton dashboard). Used for
//                lighter, in-place loads like the Growth-Hack generator.
//   frameCount — how many skeleton cards to lay out (default 3).
export default function AIBrainLoader({
  fullscreen = false,
  compact = false,
  title = 'AI Brain · Deep Analysis',
  phases = AI_BRAIN_PHASES,
  frameCount = 3,
}) {
  const body = (
    <div className="al-fade-in flex w-full flex-col gap-7">
      <BrainCore title={title} phases={phases} />

      {!compact && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: frameCount }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <SkeletonPanel />
            <SkeletonPanel />
          </div>
          <div className="al-skeleton h-24 w-full rounded-3xl" />
        </>
      )}
    </div>
  )

  if (!fullscreen) return body

  return createPortal(
    <div className="al-fade-in fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-y-auto bg-black/95 px-4 py-8 backdrop-blur-xl">
      {/* Ambient glow. */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/3 size-[40rem] -translate-x-1/2 rounded-full bg-turquoise/10 blur-[160px]" />
        <div className="absolute -bottom-40 right-1/4 size-[34rem] rounded-full bg-periwinkle/10 blur-[150px]" />
      </div>
      <div className="relative z-10 w-full max-w-4xl">{body}</div>
    </div>,
    document.body,
  )
}
