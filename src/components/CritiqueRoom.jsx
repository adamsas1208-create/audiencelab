import {
  Lightbulb,
  MessagesSquare,
  Quote,
  Sparkles,
  Target,
  TriangleAlert,
  Trophy,
} from 'lucide-react'

// Mock AI critique — this is the shape the AUDIENCE_LAB_PROMPT brain will
// return once the backend is wired up. For now it lets us design the room.
const analysis = {
  matchup: 'Fitness · TikTok hook test',
  winner: 'Option B',
  winnerText: 'Stop doing cardio. Do this instead and watch what happens.',
  winPct: 41,
  sections: [
    {
      id: 'bottom-line',
      title: 'The Bottom Line',
      icon: Trophy,
      accent: '#34e0a1',
      body: 'Option B won with 41% of the vote, edging out Option A (27%). Voters consistently called it the most “scroll-stopping” opener of the four.',
    },
    {
      id: 'red-flag',
      title: 'The Red Flag',
      icon: TriangleAlert,
      accent: '#fb7185',
      body: 'The losing options shared one fatal flaw: a slow, throat-clearing intro. Voters described Option C as “boring before it got going” and flagged the on-screen text as low-contrast and hard to read on a phone.',
    },
    {
      id: 'actionable-fix',
      title: 'The Actionable Fix',
      icon: Lightbulb,
      accent: '#6260ff',
      body: 'Keep Option B’s punchy command-style first line, but borrow Option A’s tighter cold-open: cut the first 1.5s of dead air, drop the “watch what happens” payoff onto bold high-contrast on-screen text, and hard-cut to the demo within 2 seconds.',
    },
  ],
}

const voterReasons = [
  { id: 'v1', option: 'B', text: 'The first line hits instantly — I wanted to know what “this” was.', vote: 'up' },
  { id: 'v2', option: 'B', text: 'Felt like a real person talking, not an ad read.', vote: 'up' },
  { id: 'v3', option: 'A', text: 'Good hook but the font was hard to read on my phone.', vote: 'down' },
  { id: 'v4', option: 'C', text: 'Boring intro. I scrolled before it got to the point.', vote: 'down' },
  { id: 'v5', option: 'D', text: 'The hook kind of gave away the ending, so no reason to watch.', vote: 'down' },
  { id: 'v6', option: 'B', text: 'Curiosity gap is strong. Classic but it works.', vote: 'up' },
]

function SectionCard({ section }) {
  const Icon = section.icon
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60 p-5"
      style={{ boxShadow: `inset 0 0 0 1px ${section.accent}1a` }}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full blur-3xl"
        style={{ backgroundColor: `${section.accent}22` }}
      />
      <div className="relative flex items-center gap-2.5">
        <span
          className="inline-flex size-8 items-center justify-center rounded-lg"
          style={{
            backgroundColor: `${section.accent}1f`,
            color: section.accent,
            boxShadow: `0 0 16px -6px ${section.accent}`,
          }}
        >
          <Icon className="size-4" />
        </span>
        <h3
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: section.accent }}
        >
          {section.title}
        </h3>
      </div>
      <p className="relative mt-3 text-sm leading-relaxed text-zinc-300">
        {section.body}
      </p>
    </div>
  )
}

export default function CritiqueRoom() {
  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MessagesSquare className="size-5 text-turquoise" />
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Critique Room
            </h2>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            The AI deep-dive on why your winning hook won — and how to make the
            next one sharper.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-turquoise/20 bg-turquoise/10 px-3 py-1.5 text-xs font-semibold text-turquoise">
          <Sparkles className="size-3.5" /> AI analysis ready
        </span>
      </div>

      {/* Winner banner */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-turquoise/25 bg-gradient-to-br from-turquoise/10 via-periwinkle/[0.04] to-transparent p-5">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
          <Target className="size-3.5 text-turquoise" />
          {analysis.matchup}
        </div>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-turquoise">
              Winner · {analysis.winner}
            </p>
            <p className="mt-1 truncate text-lg font-semibold text-white">
              “{analysis.winnerText}”
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className="text-3xl font-bold text-turquoise"
              style={{ textShadow: '0 0 20px #34e0a155' }}
            >
              {analysis.winPct}%
            </p>
            <p className="text-[11px] text-zinc-500">of the vote</p>
          </div>
        </div>
      </div>

      {/* The 3 AI sections */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {analysis.sections.map((s) => (
          <SectionCard key={s.id} section={s} />
        ))}
      </div>

      {/* Raw voter reasons */}
      <div className="mt-6">
        <div className="flex items-center gap-2">
          <Quote className="size-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-200">
            What voters actually said
          </h3>
          <span className="text-xs text-zinc-600">
            {voterReasons.length} reasons
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {voterReasons.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-3 transition-colors hover:border-white/20"
            >
              <span
                className={[
                  'mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold',
                  r.vote === 'up'
                    ? 'bg-turquoise/15 text-turquoise'
                    : 'bg-white/5 text-zinc-500',
                ].join(' ')}
              >
                {r.option}
              </span>
              <p className="text-sm leading-relaxed text-zinc-300">{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
