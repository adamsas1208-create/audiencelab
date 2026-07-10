import {
  Lightbulb,
  MessagesSquare,
  Sparkles,
  Target,
  TriangleAlert,
  Trophy,
  Wand2,
} from 'lucide-react'
import { useData } from '../context/data-context'

// The three real report sections, mapped straight onto /api/duel's response
// shape (verdict / theCritic / theCoach) — see api/duel.js.
const SECTIONS = [
  {
    id: 'verdict',
    title: 'The Verdict',
    icon: Trophy,
    accent: '#34e0a1',
    pick: (duel) => duel.verdict?.summary || '',
  },
  {
    id: 'critic',
    title: 'The Critic',
    icon: TriangleAlert,
    accent: '#fb7185',
    pick: (duel) => duel.theCritic,
  },
  {
    id: 'coach',
    title: 'The Coach',
    icon: Lightbulb,
    accent: '#6260ff',
    pick: (duel) => duel.theCoach,
  },
]

function SectionCard({ title, icon: Icon, accent, body }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 al-glass p-5"
      style={{ boxShadow: `inset 0 0 0 1px ${accent}1a` }}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full blur-3xl"
        style={{ backgroundColor: `${accent}22` }}
      />
      <div className="relative flex items-center gap-2.5">
        <span
          className="inline-flex size-8 items-center justify-center rounded-lg"
          style={{
            backgroundColor: `${accent}1f`,
            color: accent,
            boxShadow: `0 0 16px -6px ${accent}`,
          }}
        >
          <Icon className="size-4" />
        </span>
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: accent }}>
          {title}
        </h3>
      </div>
      <p className="relative mt-3 text-sm leading-relaxed text-zinc-300">{body}</p>
    </div>
  )
}

// One option's real per-option scores (readability / contrast / thumb-stop),
// replacing the old hardcoded "voter reasons" with actual model output.
function OptionScoreRow({ option, isWinner }) {
  const scores = option.scores || {}
  return (
    <div
      className={[
        'flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors',
        isWinner ? 'border-turquoise/30 al-glass' : 'border-white/10 al-glass-thin',
      ].join(' ')}
    >
      <span
        className={[
          'mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold',
          isWinner ? 'bg-turquoise/15 text-turquoise' : 'bg-white/5 text-zinc-500',
        ].join(' ')}
      >
        {isWinner ? <Trophy className="size-3.5" /> : '·'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-200">{option.label}</p>
        {option.insight && (
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{option.insight}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3 font-mono text-[11px] text-zinc-400">
        <span title="Readability">R {scores.readability ?? '—'}</span>
        <span title="Contrast">C {scores.contrast ?? '—'}</span>
        <span title="Thumb-stop">T {scores.thumbStop ?? '—'}</span>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-2">
        <MessagesSquare className="size-5 text-turquoise" />
        <h2 className="text-2xl font-bold tracking-tight text-white">Critique Room</h2>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        The AI deep-dive on why your winning hook won — and how to make the next one sharper.
      </p>

      <div className="al-glass mt-8 flex flex-col items-center gap-3 rounded-2xl border border-white/10 px-6 py-16 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-turquoise/10 text-turquoise ring-1 ring-turquoise/25">
          <Wand2 className="size-6" />
        </span>
        <p className="text-base font-semibold text-zinc-100">No critique yet</p>
        <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
          Run a hook test in Creator Studio — the AI Coach/Critic review appears here the
          moment it lands.
        </p>
      </div>
    </div>
  )
}

export default function CritiqueRoom() {
  const { lastDuel } = useData()

  if (!lastDuel) return <EmptyState />

  const options = lastDuel.analysis || []
  const winner = options.find((o) => o.isWinner) || options[0]

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MessagesSquare className="size-5 text-turquoise" />
            <h2 className="text-2xl font-bold tracking-tight text-white">Critique Room</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            The AI deep-dive on why your winning hook won — and how to make the next one
            sharper.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-turquoise/20 bg-turquoise/10 px-3 py-1.5 text-xs font-semibold text-turquoise">
          <Sparkles className="size-3.5" /> AI analysis ready
        </span>
      </div>

      {/* Winner banner */}
      {winner && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-turquoise/25 bg-gradient-to-br from-turquoise/10 via-periwinkle/[0.04] to-transparent p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
            <Target className="size-3.5 text-turquoise" />
            {lastDuel.question || 'Hook test'}
          </div>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-turquoise">
                Winner · {lastDuel.verdict?.winner || winner.label}
              </p>
              <p className="mt-1 truncate text-lg font-semibold text-white">
                “{winner.label}”
              </p>
            </div>
            {lastDuel.verdict?.ctr != null && (
              <div className="shrink-0 text-right">
                <p
                  className="text-3xl font-bold text-turquoise"
                  style={{ textShadow: '0 0 20px #34e0a155' }}
                >
                  {lastDuel.verdict.ctr}%
                </p>
                <p className="text-[11px] text-zinc-500">predicted CTR</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* The 3 AI sections — real Verdict / Critic / Coach text */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {SECTIONS.map((s) => {
          const body = s.pick(lastDuel)
          if (!body) return null
          return <SectionCard key={s.id} title={s.title} icon={s.icon} accent={s.accent} body={body} />
        })}
      </div>

      {/* Real per-option scores */}
      {options.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-zinc-500" />
            <h3 className="text-sm font-semibold text-zinc-200">Per-option breakdown</h3>
            <span className="text-xs text-zinc-600">{options.length} options</span>
          </div>
          <div className="mt-3 space-y-2">
            {options.map((o, i) => (
              <OptionScoreRow key={o.label || i} option={o} isWinner={o.isWinner} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
