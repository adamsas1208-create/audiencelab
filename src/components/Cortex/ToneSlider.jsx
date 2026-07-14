import { Zap } from 'lucide-react'

// Label morphs along the slider so the creator sees exactly what voice they're
// asking for. Values are inclusive lower bounds.
const TONE_LABELS = [
  { at: 0, label: 'observation', hint: 'sober, cited, understated' },
  { at: 30, label: 'strategy', hint: 'grounded with a point of view' },
  { at: 65, label: 'coaching', hint: 'direct, action-first' },
  { at: 85, label: 'provocation', hint: 'sharp, unafraid, dares you to move' },
]

function labelFor(value) {
  let best = TONE_LABELS[0]
  for (const t of TONE_LABELS) if (value >= t.at) best = t
  return best
}

// A single continuous slider that drives BOTH the model temperature AND the
// system-prompt voice on the /api/cortex side (see api/cortex.js#toneAdjectives).
// Debouncing lives in useCortexInsights so the model isn't hit on every tick.
export default function ToneSlider({ value, onChange }) {
  const currentLabel = labelFor(value)
  return (
    <div className="al-glass rounded-2xl border border-white/10 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex size-6 items-center justify-center rounded-md bg-turquoise/15 text-turquoise"
            style={{ boxShadow: '0 0 10px -3px var(--al-tq)' }}
          >
            <Zap className="size-3.5" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            AI voice
          </span>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold uppercase tracking-widest text-turquoise">
            {currentLabel.label}
          </div>
          <div className="text-[10px] text-zinc-500">{currentLabel.hint}</div>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="AI insight tone"
        className="al-cortex-tone-slider mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-turquoise"
        style={{
          background: `linear-gradient(90deg,
            var(--al-tq) 0%,
            var(--al-tq) ${value}%,
            rgba(255,255,255,0.10) ${value}%,
            rgba(255,255,255,0.10) 100%)`,
        }}
      />

      <div className="mt-1.5 flex justify-between text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
        <span>Observation</span>
        <span>Strategy</span>
        <span>Provocation</span>
      </div>
    </div>
  )
}
