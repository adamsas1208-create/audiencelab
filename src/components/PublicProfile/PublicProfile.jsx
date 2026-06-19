import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  Loader2,
  Play,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useData } from '../../context/data-context'
import { fetchRoomStats, castVote } from '../../lib/rooms'
import { supabase } from '../../lib/supabaseClient'

// Fallback poll so the vote widget always works, even with no DB connection.
const LOCAL_POLL = {
  id: null,
  hooks: [
    { id: 'local-1', text: 'A day-in-my-life vlog', votes: 42 },
    { id: 'local-2', text: 'My honest gear review', votes: 31 },
    { id: 'local-3', text: 'Behind the scenes of my process', votes: 18 },
  ],
}

// Initials fallback when there's no avatar (or it fails to load).
function initials(name, handle) {
  const src = (name || handle || '?').trim()
  const parts = src.split(/[\s_-]+/).filter(Boolean)
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : src.slice(0, 2)
  return letters.toUpperCase()
}

export default function PublicProfile({ handle }) {
  const { profile } = useData()

  // The public page renders the locally-stored creator profile when its handle
  // matches the URL and it has been made public.
  const match =
    profile.is_public &&
    profile.handle &&
    profile.handle.toLowerCase() === (handle || '').toLowerCase()

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Cyberpunk gradient field: dark gray → deep obsidian with mint glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black" />
        <div className="absolute -top-32 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-turquoise/15 blur-[150px]" />
        <div className="absolute bottom-0 right-0 size-[28rem] rounded-full bg-turquoise/10 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(#34e0a1 1px, transparent 1px), linear-gradient(90deg, #34e0a1 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 py-10 sm:py-14">
        {!match ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-white/5">
              <Users className="size-7 text-zinc-500" />
            </span>
            <h1 className="mt-4 text-xl font-bold text-zinc-100">
              Profile not found
            </h1>
            <p className="mt-1 max-w-xs text-sm text-zinc-500">
              No public profile is published at
              <span className="text-zinc-300"> /p/{handle}</span> yet.
            </p>
          </div>
        ) : (
          <>
            <Hero profile={profile} />
            {profile.featured_video_url && (
              <VideoLinkButton url={profile.featured_video_url} />
            )}
            <LeadMagnetForm />
            <VoteSneakPeek />
            <footer className="mt-10 text-center text-xs text-zinc-600">
              Powered by{' '}
              <span className="font-semibold text-turquoise">AudienceLab</span>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}

function Hero({ profile }) {
  const [imgOk, setImgOk] = useState(true)
  const name = profile.display_name || profile.handle
  const showImg = profile.avatar_url && imgOk

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative">
        <span
          className="absolute inset-0 animate-pulse rounded-full bg-turquoise/30 blur-xl"
          aria-hidden="true"
        />
        <div
          className="relative size-28 overflow-hidden rounded-full ring-2 ring-turquoise/60"
          style={{ boxShadow: '0 0 40px -6px #34e0a1' }}
        >
          {showImg ? (
            <img
              src={profile.avatar_url}
              alt={name}
              className="size-full object-cover"
              onError={() => setImgOk(false)}
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-turquoise/30 to-zinc-800 text-3xl font-bold text-turquoise">
              {initials(profile.display_name, profile.handle)}
            </div>
          )}
        </div>
      </div>

      <h1 className="mt-5 flex items-center gap-1.5 text-2xl font-bold tracking-tight text-zinc-50">
        {name}
        <BadgeCheck
          className="size-5 text-turquoise"
          style={{ filter: 'drop-shadow(0 0 5px #34e0a1)' }}
        />
      </h1>
      <p className="mt-0.5 text-sm font-medium text-turquoise/80">
        @{profile.handle}
      </p>
      {profile.bio && (
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
          {profile.bio}
        </p>
      )}
    </div>
  )
}

function VideoLinkButton({ url }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group relative mt-8 block overflow-hidden rounded-2xl border border-turquoise/30 bg-gradient-to-r from-turquoise/15 to-turquoise/5 p-px transition-transform active:scale-[0.98]"
    >
      <span
        className="pointer-events-none absolute inset-0 animate-pulse rounded-2xl"
        style={{ boxShadow: 'inset 0 0 24px -6px #34e0a1' }}
        aria-hidden="true"
      />
      <div className="relative flex items-center gap-4 rounded-2xl bg-zinc-950/70 px-5 py-4 backdrop-blur">
        <span className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-turquoise text-black">
          <span className="absolute inset-0 animate-ping rounded-xl bg-turquoise/50" aria-hidden="true" />
          <Play className="relative size-5 fill-black" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-zinc-50">Watch my latest content</p>
          <p className="truncate text-xs text-zinc-500">{url.replace(/^https?:\/\//, '')}</p>
        </div>
        <ArrowUpRight className="size-5 text-turquoise transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </a>
  )
}

function LeadMagnetForm() {
  const { addLead, toast } = useData()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle') // idle | submitting | done

  const submit = (e) => {
    e.preventDefault()
    setState('submitting')
    // Add the follower to the creator's audience (platform tagged 'Web').
    addLead({ full_name: name, email, platform: 'Web' })
    toast('Your exclusive bonuses are unlocked. 🎉', {
      title: 'Welcome to the inner circle!',
    })
    setState('done')
  }

  return (
    <div
      className="relative mt-6 overflow-hidden rounded-2xl border border-white/10 p-6"
      style={{
        background:
          'linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))',
        backdropFilter: 'blur(14px)',
      }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-turquoise/15 blur-2xl" />

      {state === 'done' ? (
        <div className="relative flex flex-col items-center py-4 text-center">
          <span
            className="inline-flex size-12 items-center justify-center rounded-2xl bg-turquoise/15 text-turquoise"
            style={{ boxShadow: '0 0 24px -6px #34e0a1' }}
          >
            <Check className="size-6" />
          </span>
          <p className="mt-3 text-base font-bold text-zinc-50">You’re in! 🎉</p>
          <p className="mt-1 text-sm text-zinc-400">
            Check your inbox — your exclusive bonuses are on the way.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="relative">
          <div className="flex items-center gap-2 text-turquoise">
            <Sparkles className="size-4" />
            <span className="text-[11px] font-bold uppercase tracking-wide">
              Inner circle access
            </span>
          </div>
          <h2 className="mt-2 text-lg font-bold leading-snug text-zinc-50">
            Get my exclusive creator bonuses & join the inner circle
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Drop your details and unlock it instantly.
          </p>

          <div className="mt-4 space-y-2.5">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-turquoise/50 focus:outline-none"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-turquoise/50 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={state === 'submitting'}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-turquoise px-4 py-3.5 text-sm font-bold text-black transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
            style={{ boxShadow: '0 0 26px -4px #34e0a1' }}
          >
            {state === 'submitting' ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Unlocking…
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> Unlock my bonuses
              </>
            )}
          </button>
        </form>
      )}
    </div>
  )
}

function VoteSneakPeek() {
  const { recordVote } = useData()
  const [room, setRoom] = useState(null)
  const [hooks, setHooks] = useState([])
  const [votedId, setVotedId] = useState(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const stats = await fetchRoomStats()
        const pick =
          stats.find((r) => r.flagship) ??
          [...stats].sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0))[0]
        if (!pick) throw new Error('no rooms')
        const { data } = await supabase
          .from('hooks')
          .select('id, text, votes')
          .eq('room_id', pick.id)
          .eq('is_active', true)
          .order('votes', { ascending: false })
          .limit(3)
        if (!active) return
        if (data && data.length) {
          setRoom(pick)
          setHooks(data)
          return
        }
        throw new Error('no hooks')
      } catch {
        // Fall back to a local poll so the widget always renders.
        if (active) {
          setRoom(LOCAL_POLL)
          setHooks(LOCAL_POLL.hooks)
        }
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const total = useMemo(
    () => hooks.reduce((s, h) => s + (h.votes || 0), 0) || 1,
    [hooks],
  )

  if (!hooks.length) return null

  const vote = (hookId) => {
    if (votedId) return
    setVotedId(hookId)
    setHooks((prev) =>
      prev.map((h) => (h.id === hookId ? { ...h, votes: (h.votes || 0) + 1 } : h)),
    )
    recordVote() // bump the creator's global analytics
    // Best-effort real vote when the poll came from a live room.
    if (room?.id) {
      castVote({ roomId: room.id, hookId }).catch(() => {})
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-turquoise">
          <TrendingUp className="size-4" />
          <span className="text-[11px] font-bold uppercase tracking-wide">
            Vote on my next video idea!
          </span>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-zinc-500">
          <span className="size-1.5 animate-pulse rounded-full bg-turquoise" />
          Live
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {hooks.map((h) => {
          const pct = Math.round(((h.votes || 0) / total) * 100)
          const isVoted = votedId === h.id
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => vote(h.id)}
              disabled={!!votedId}
              className={[
                'relative w-full overflow-hidden rounded-xl border px-3.5 py-2.5 text-left transition-colors',
                isVoted
                  ? 'border-turquoise/50 bg-turquoise/10'
                  : 'border-white/10 bg-white/[0.03] hover:border-turquoise/30',
                votedId && !isVoted ? 'opacity-70' : '',
              ].join(' ')}
            >
              {votedId && (
                <span
                  className="absolute inset-y-0 left-0 bg-turquoise/10 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                  aria-hidden="true"
                />
              )}
              <span className="relative flex items-center justify-between gap-3">
                <span className="text-sm text-zinc-200">{h.text}</span>
                {votedId && (
                  <span className="shrink-0 text-xs font-bold text-turquoise">
                    {pct}%
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {votedId ? (
        <p className="mt-3 text-center text-xs text-turquoise">
          Thanks for voting! You’re part of the audience now.
        </p>
      ) : (
        <p className="mt-3 text-center text-xs text-zinc-500">
          Tap to cast your vote — no signup needed.
        </p>
      )}
    </div>
  )
}
