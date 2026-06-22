import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Crown,
  Flame,
  Medal,
  Radio,
  Rocket,
  Trophy,
  Users,
} from 'lucide-react'
import { useData } from '../../context/data-context'

// Shared brand mint used across the app.
const MINT = '#34e0a1'

const PLATFORM_COLOR = {
  TikTok: '#34e0a1',
  YouTube: '#ef4444',
  Instagram: '#e879f9',
  X: '#94a3b8',
  LinkedIn: '#3b82f6',
  Web: '#34e0a1',
  Other: '#a1a1aa',
}

// lucide-react (v1.18) ships no brand glyphs, so platforms are shown as small
// colored monogram chips that stay on-brand with the rest of the workspace.
const PLATFORM_GLYPH = {
  TikTok: '♪',
  YouTube: '▶',
  Instagram: '◎',
  X: '𝕏',
  LinkedIn: 'in',
  Web: '🌐',
  Other: '•',
}

function PlatformIcon({ platform }) {
  const key = platform || 'Other'
  const color = PLATFORM_COLOR[key] ?? PLATFORM_COLOR.Other
  const glyph = PLATFORM_GLYPH[key] ?? PLATFORM_GLYPH.Other
  return (
    <span
      className="inline-flex size-7 items-center justify-center rounded-lg border border-white/10 text-[11px] font-bold"
      style={{ color, backgroundColor: `${color}1a`, boxShadow: `inset 0 0 0 1px ${color}33` }}
      title={key}
    >
      {glyph}
    </span>
  )
}

// Initials avatar — contacts don't carry a photo, so we derive a clean monogram.
function initials(name) {
  const src = (name || '?').trim()
  const parts = src.split(/[\s_-]+/).filter(Boolean)
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : src.slice(0, 2)
  return letters.toUpperCase()
}

// Mint badge whose glow intensifies with the score, so top fans visibly pop.
function EngagementBadge({ score }) {
  const pct = Math.max(0, Math.min(100, Number(score) || 0))
  const strong = pct >= 90
  const mid = pct >= 70
  const glow = strong ? 0.55 : mid ? 0.32 : 0.14
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums"
      style={{
        color: MINT,
        borderColor: `${MINT}55`,
        backgroundColor: `${MINT}14`,
        boxShadow: `0 0 16px -4px rgba(52,224,161,${glow})`,
      }}
    >
      <Flame className="size-3" />
      {pct}
      <span className="text-turquoise/50">/100</span>
    </span>
  )
}

const RANK_ICON = [Crown, Trophy, Medal]

function RankBadge({ rank }) {
  const Icon = RANK_ICON[rank - 1]
  if (Icon) {
    return (
      <span
        className="inline-flex size-7 items-center justify-center rounded-lg bg-turquoise/10 text-turquoise ring-1 ring-turquoise/25"
        style={{ boxShadow: '0 0 14px -5px #34e0a1' }}
      >
        <Icon className="size-3.5" />
      </span>
    )
  }
  return (
    <span className="inline-flex size-7 items-center justify-center rounded-lg bg-white/5 text-xs font-bold text-zinc-400">
      {rank}
    </span>
  )
}

// Small option thumbnail for visual polls so the creator can see at a glance
// which image is winning. Hidden if there's no image or the URL is broken.
function OptionThumb({ src, alt }) {
  const [ok, setOk] = useState(true)
  if (!src || !ok) return null
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="size-10 shrink-0 rounded-lg border border-white/10 object-cover"
      onError={() => setOk(false)}
    />
  )
}

// A single poll card: question, premium per-option progress bars, total counter.
function PollCard({ poll }) {
  const total = useMemo(
    () => poll.options.reduce((s, o) => s + (o.votes || 0), 0),
    [poll.options],
  )
  const leadVotes = Math.max(...poll.options.map((o) => o.votes || 0), 0)

  // Start the bars at 0% on first paint, then release them to their target so
  // they sweep up like a dashboard gauge whenever the card mounts.
  const [primed, setPrimed] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setPrimed(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
      <div className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-turquoise/10 blur-2xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-turquoise/10 ring-1 ring-turquoise/25">
            <BarChart3 className="size-4 text-turquoise" />
          </span>
          <h4 className="text-sm font-bold text-zinc-50">{poll.question}</h4>
        </div>
        {poll.active && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-turquoise/30 bg-turquoise/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-turquoise">
            <span className="size-1.5 animate-pulse rounded-full bg-turquoise" />
            Live
          </span>
        )}
      </div>

      <div className="relative mt-4 space-y-3">
        {poll.options.map((o) => {
          const pct = total ? Math.round(((o.votes || 0) / total) * 100) : 0
          const isLead = (o.votes || 0) === leadVotes && leadVotes > 0
          return (
            <div key={o.id} className="flex items-center gap-3">
              <OptionThumb src={o.image_url} alt={o.label} />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                  <span className={isLead ? 'font-semibold text-zinc-100' : 'text-zinc-400'}>
                    {o.label}
                  </span>
                  <span
                    className="shrink-0 font-bold tabular-nums"
                    style={{ color: isLead ? MINT : '#a1a1aa' }}
                  >
                    {pct}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="al-speedo h-full rounded-full"
                    style={{
                      width: primed ? `${pct}%` : '0%',
                      background: isLead
                        ? `linear-gradient(90deg, ${MINT}, #6ef0c2)`
                        : 'rgba(255,255,255,0.18)',
                      boxShadow: isLead ? `0 0 14px -2px ${MINT}` : 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="relative mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs">
        <span className="text-zinc-500">
          {poll.options.length} option{poll.options.length === 1 ? '' : 's'}
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-300">
          <Users className="size-3.5 text-turquoise" />
          <span className="tabular-nums text-turquoise">{total.toLocaleString()}</span> total
          votes
        </span>
      </div>
    </div>
  )
}

export default function PollDashboard({ onLaunchPoll }) {
  const { polls, contacts, analytics } = useData()

  // Superfans = most engaged followers, ranked by their engagement score.
  const superfans = useMemo(() => {
    return contacts
      .filter((c) => Number.isFinite(Number(c.engagement_score)))
      .sort((a, b) => Number(b.engagement_score) - Number(a.engagement_score))
      .slice(0, 8)
  }, [contacts])

  const sortedPolls = useMemo(
    () => [...polls].sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0)),
    [polls],
  )

  return (
    <div>
      {/* Section header + live action trigger */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-turquoise/10 ring-1 ring-turquoise/25"
            style={{ boxShadow: '0 0 22px -8px #34e0a1' }}
          >
            <Radio
              className="size-5 text-turquoise"
              style={{ filter: 'drop-shadow(0 0 6px #34e0a1)' }}
            />
          </span>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-zinc-50">
              Live Poll Analytics
            </h3>
            <p className="mt-0.5 text-sm text-zinc-500">
              Watch your followers vote in real time and spotlight your superfans.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLaunchPoll}
          className="inline-flex items-center gap-2 rounded-xl bg-turquoise px-4 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ boxShadow: '0 0 22px -4px #34e0a1' }}
        >
          <Rocket className="size-4" /> Launch New Live Poll
        </button>
      </div>

      {/* Poll Performance Breakdown */}
      <div className="mt-7 flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Poll performance
        </h4>
        <span className="text-xs text-zinc-500">
          {(analytics.totalVotes ?? 0).toLocaleString()} votes from your public page
        </span>
      </div>

      {sortedPolls.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-8 text-center text-sm text-zinc-500">
          No polls yet — launch one to start collecting votes.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sortedPolls.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      )}

      {/* Superfans Leaderboard */}
      <div className="mt-9 flex items-center gap-2">
        <Trophy className="size-4 text-turquoise" />
        <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Superfans leaderboard
        </h4>
      </div>

      {superfans.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-8 text-center text-sm text-zinc-500">
          No engagement scores yet. As followers join and vote, your top fans
          will rise to the top here.
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3 font-semibold">Rank</th>
                <th className="px-5 py-3 font-semibold">Follower</th>
                <th className="hidden px-5 py-3 font-semibold sm:table-cell">Email</th>
                <th className="px-5 py-3 font-semibold">Platform</th>
                <th className="px-5 py-3 text-right font-semibold">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {superfans.map((c, i) => (
                <tr
                  key={c.id}
                  className="border-b border-white/[0.06] transition-colors last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-3.5">
                    <RankBadge rank={i + 1} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-turquoise/30 to-zinc-800 text-xs font-bold text-turquoise ring-1 ring-turquoise/30"
                      >
                        {initials(c.full_name)}
                      </span>
                      <span className="font-medium text-zinc-100">
                        {c.full_name || '—'}
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-5 py-3.5 text-zinc-400 sm:table-cell">
                    {c.email || '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <PlatformIcon platform={c.platform} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <EngagementBadge score={c.engagement_score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
