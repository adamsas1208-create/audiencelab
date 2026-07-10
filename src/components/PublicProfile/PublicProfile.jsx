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
import { isSupabaseConfigured } from '../../lib/supabaseClient'
import { captureLead, fetchPublicProfile } from '../../lib/profiles'
import { castPublicPollVote, fetchPublicActivePoll } from '../../lib/polls'

// Initials fallback when there's no avatar (or it fails to load).
function initials(name, handle) {
  const src = (name || handle || '?').trim()
  const parts = src.split(/[\s_-]+/).filter(Boolean)
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : src.slice(0, 2)
  return letters.toUpperCase()
}

// Real, cross-device lookup by handle via the get_public_profile RPC — any
// visitor on any device sees the creator's actual published profile.
function useRemoteProfile(handle) {
  // Keyed by handle so a stale in-flight fetch for a previous handle never
  // clobbers state for the current one, without needing a synchronous
  // "reset to loading" setState at the top of the effect.
  const [result, setResult] = useState(null)
  useEffect(() => {
    let cancelled = false
    fetchPublicProfile(handle)
      .then((row) => {
        if (!cancelled) setResult({ handle, profile: row })
      })
      .catch(() => {
        if (!cancelled) setResult({ handle, profile: null })
      })
    return () => {
      cancelled = true
    }
  }, [handle])
  const loading = !result || result.handle !== handle
  return { loading, profile: loading ? null : result.profile }
}

export default function PublicProfile({ handle }) {
  const { profile: localProfile } = useData()
  const remote = useRemoteProfile(isSupabaseConfigured ? handle : null)

  // Demo/local-dev fallback (no Supabase configured): match against this
  // browser's own locally-stored profile, same as before.
  const localMatch =
    localProfile.is_public &&
    localProfile.handle &&
    localProfile.handle.toLowerCase() === (handle || '').toLowerCase()

  const loading = isSupabaseConfigured && remote.loading
  const profile = isSupabaseConfigured ? remote.profile : localProfile
  const match = isSupabaseConfigured ? !!remote.profile : localMatch

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <Loader2 className="size-6 animate-spin text-turquoise" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-zinc-100">
      {/* Ambient field over the living sky — glow orbs + a faint brand grid.
          Kept translucent so the SkyCanvas (stars/moon/sunset) shows through. */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-32 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-turquoise/15 blur-[150px]" />
        <div className="absolute bottom-0 right-0 size-[28rem] rounded-full bg-turquoise/10 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(var(--al-tq) 1px, transparent 1px), linear-gradient(90deg, var(--al-tq) 1px, transparent 1px)',
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
            <LeadMagnetForm handle={handle} />
            <VoteSneakPeek handle={handle} />
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

      <h1 className="al-display mt-5 flex items-center gap-2 text-4xl italic text-zinc-50">
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
      <div className="relative flex items-center gap-4 rounded-2xl al-glass-thick px-5 py-4">
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

function LeadMagnetForm({ handle }) {
  const { addLead, toast } = useData()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle') // idle | submitting | done

  const submit = async (e) => {
    e.preventDefault()
    setState('submitting')
    try {
      // Add the follower to the creator's audience (platform tagged 'Web').
      if (isSupabaseConfigured) {
        await captureLead({ handle, full_name: name, email })
      } else {
        addLead({ full_name: name, email, platform: 'Web' })
      }
      toast('Your exclusive bonuses are unlocked. 🎉', {
        title: 'Welcome to the inner circle!',
      })
      setState('done')
    } catch (err) {
      toast(err?.message ?? 'Could not submit right now.', { title: 'Something went wrong' })
      setState('idle')
    }
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

// Per-option image with graceful fallback — a broken URL collapses to nothing
// rather than showing a busted image icon on a follower's phone.
function OptionImage({ src, alt }) {
  const [ok, setOk] = useState(true)
  if (!src || !ok) return null
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-black/40">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        onError={() => setOk(false)}
      />
    </div>
  )
}

function VoteSneakPeek({ handle }) {
  // Local/demo fallback (no Supabase configured): read the creator's live
  // poll straight from the shared store.
  const { polls, recordPollVote } = useData()
  const localPoll = useMemo(() => polls.find((p) => p.active) ?? polls[0] ?? null, [polls])

  // Real, cross-device: fetch the creator's actual live poll by handle.
  const [remotePoll, setRemotePoll] = useState(null)
  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false
    fetchPublicActivePoll(handle)
      .then((p) => {
        if (!cancelled) setRemotePoll(p)
      })
      .catch(() => {
        if (!cancelled) setRemotePoll(null)
      })
    return () => {
      cancelled = true
    }
  }, [handle])

  const [votedId, setVotedId] = useState(null)
  const poll = isSupabaseConfigured ? remotePoll : localPoll

  const total = useMemo(
    () => (poll ? poll.options.reduce((s, o) => s + (o.votes || 0), 0) : 0) || 1,
    [poll],
  )

  // Visual poll? Lay the options out as a responsive image-card grid.
  const hasImages = useMemo(
    () => (poll ? poll.options.some((o) => o.image_url) : false),
    [poll],
  )

  if (!poll) return null

  const vote = async (optionId) => {
    if (votedId) return
    setVotedId(optionId)
    if (isSupabaseConfigured) {
      // Optimistic bump so the follower sees their vote land immediately.
      setRemotePoll((p) =>
        p
          ? {
              ...p,
              options: p.options.map((o) =>
                o.id === optionId ? { ...o, votes: (o.votes || 0) + 1 } : o,
              ),
            }
          : p,
      )
      try {
        await castPublicPollVote({ handle, pollId: poll.id, optionId })
      } catch {
        /* the optimistic tally already gave the follower feedback */
      }
    } else {
      recordPollVote({ pollId: poll.id, optionId }) // flows to the creator's dashboard
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-white/10 al-glass p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-turquoise">
          <TrendingUp className="size-4" />
          <span className="text-[11px] font-bold uppercase tracking-wide">
            {poll.question}
          </span>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-zinc-500">
          <span className="size-1.5 animate-pulse rounded-full bg-turquoise" />
          Live
        </span>
      </div>

      <div
        className={
          hasImages
            ? 'al-poll-grid mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'
            : 'mt-3 space-y-2'
        }
      >
        {poll.options.map((o) => {
          const pct = Math.round(((o.votes || 0) / total) * 100)
          const isVoted = votedId === o.id
          const withImage = hasImages && !!o.image_url
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => vote(o.id)}
              disabled={!!votedId}
              className={[
                'group relative overflow-hidden text-left',
                hasImages
                  ? 'al-poll-card flex flex-col rounded-2xl border'
                  : 'w-full rounded-xl border px-3.5 py-2.5 transition-all duration-300',
                isVoted
                  ? 'border-turquoise bg-turquoise/10 shadow-[0_0_26px_-4px_#34e0a1]'
                  : 'border-white/10 bg-white/[0.03] hover:border-turquoise/60',
                votedId && !isVoted ? 'opacity-70' : '',
              ].join(' ')}
            >
              {withImage && (
                <div className="relative">
                  <OptionImage src={o.image_url} alt={o.label} />
                  {votedId && (
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-bold text-turquoise backdrop-blur">
                      {pct}%
                    </span>
                  )}
                </div>
              )}
              <span
                className={['relative block', hasImages ? 'p-3' : ''].join(' ')}
              >
                <span
                  className="al-speedo absolute inset-y-0 left-0 bg-turquoise/10"
                  style={{ width: votedId ? `${pct}%` : '0%' }}
                  aria-hidden="true"
                />
                <span className="relative flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-100">
                    {o.label}
                  </span>
                  {votedId && !withImage && (
                    <span className="shrink-0 text-xs font-bold text-turquoise">
                      {pct}%
                    </span>
                  )}
                </span>
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
