import { useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Minus,
  Plus,
  Sparkles,
} from 'lucide-react'
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

export default function CreatorStudio() {
  const [filter, setFilter] = useState('all')

  const filtered =
    filter === 'all' ? myHooks : myHooks.filter((h) => h.status === filter)

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
          className="inline-flex items-center gap-2 rounded-xl bg-turquoise px-4 py-2.5 text-sm font-semibold text-black shadow-lg shadow-turquoise/25 transition-all hover:brightness-110"
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
    </div>
  )
}
