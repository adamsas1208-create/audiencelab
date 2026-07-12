import { motion } from 'motion/react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { springs } from '../../design/tokens/motion'

// Same accent palette the neural web uses — so a card themed 'polls' matches
// the visual anchor of the Polls node in the ring. Copied deliberately (no
// shared import) to keep this component self-contained.
const NODE_ACCENT = {
  audience: '#34e0a1',
  polls: '#6ae0ff',
  hooks: '#ffb476',
  coach: '#6260ff',
  growth: '#ff9cd8',
}

function accentFor(sourceNodes) {
  const first = (sourceNodes && sourceNodes[0]) || 'audience'
  return NODE_ACCENT[first] || '#34e0a1'
}

// One AI-surfaced insight card, springy fade-in with a small stagger so the
// four cards land as a wave rather than at once. The evidence line quotes the
// exact snapshot row the model derived the claim from — never a paraphrase we
// invented downstream.
export default function InsightCard({ insight, index }) {
  const accent = accentFor(insight.sourceNodes)
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ ...springs.soft, delay: index * 0.09 }}
      className="al-glass relative overflow-hidden rounded-2xl border border-white/10 p-4"
      style={{ boxShadow: `inset 0 0 0 1px ${accent}22` }}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full blur-2xl"
        style={{ background: `${accent}33` }}
      />
      <div className="relative flex items-center gap-2">
        <span
          className="inline-flex size-6 items-center justify-center rounded-md"
          style={{
            backgroundColor: `${accent}22`,
            color: accent,
            boxShadow: `0 0 12px -3px ${accent}`,
          }}
        >
          <Sparkles className="size-3.5" />
        </span>
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: accent, opacity: 0.9 }}
        >
          {(insight.sourceNodes || []).join(' · ')}
        </span>
      </div>
      <h4 className="relative mt-2 text-sm font-bold leading-snug text-zinc-50">
        {insight.title}
      </h4>
      <p className="relative mt-1.5 text-xs leading-relaxed text-zinc-400">
        {insight.body}
      </p>
      <p
        className="relative mt-2.5 rounded-md border border-white/5 bg-black/25 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-zinc-500"
        title="Evidence — the exact data point this reads from"
      >
        {insight.evidence}
      </p>
      {insight.action && (
        <p
          className="relative mt-2.5 flex items-start gap-1.5 text-[11px] font-semibold"
          style={{ color: accent }}
        >
          <ArrowRight className="mt-0.5 size-3 shrink-0" />
          <span>{insight.action}</span>
        </p>
      )}
    </motion.div>
  )
}
