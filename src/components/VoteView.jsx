import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  Flame,
  Radio,
  Sparkles,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react'
import { matchups, platforms } from '../data'
import useRoomHooks from '../hooks/useRoomHooks'
import { castVote } from '../lib/rooms'

const LETTERS = ['A', 'B', 'C', 'D']

function PlatformBadge({ platform }) {
  const p = platforms[platform]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300"
      style={{ boxShadow: `inset 0 0 0 1px ${p.color}33` }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: p.color }}
      />
      {p.label}
    </span>
  )
}

function OptionCard({ letter, option, totalVotes, isWinner, voted, picked, onVote }) {
  const pct = totalVotes === 0 ? 0 : Math.round((option.votes / totalVotes) * 100)
  const isPicked = picked === option.id

  return (
    <button
      type="button"
      onClick={() => !voted && onVote(option.id)}
      disabled={voted}
      className={[
        'group relative flex flex-col overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300',
        voted ? 'cursor-default' : 'cursor-pointer hover:-translate-y-1',
        isPicked
          ? 'border-turquoise/70 bg-turquoise/[0.07]'
          : voted && isWinner
            ? 'border-turquoise/40 bg-turquoise/[0.05]'
            : 'border-white/10 bg-zinc-950/60 hover:border-white/25 hover:bg-zinc-900/70',
      ].join(' ')}
      style={
        isPicked
          ? { boxShadow: '0 0 0 1px #34e0a155, 0 12px 40px -12px #34e0a166' }
          : undefined
      }
    >
      {/* hover glow: turquoise -> periwinkle */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-turquoise/10 via-transparent to-periwinkle/15" />
      </div>

      <div className="relative flex items-center justify-between">
        <span
          className={[
            'inline-flex size-8 items-center justify-center rounded-lg text-sm font-bold transition-colors',
            isPicked || (voted && isWinner)
              ? 'bg-turquoise/15 text-turquoise'
              : 'border border-white/10 bg-white/5 text-zinc-400',
          ].join(' ')}
        >
          {letter}
        </span>
        {voted && isWinner && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-turquoise/15 px-2.5 py-1 text-xs font-semibold text-turquoise"
            style={{ textShadow: '0 0 12px #34e0a188' }}
          >
            <Trophy className="size-3.5" /> Winner
          </span>
        )}
      </div>

      <p className="relative mt-4 flex-1 text-base font-semibold leading-snug text-zinc-50">
        “{option.text}”
      </p>

      {voted ? (
        <div className="relative mt-5">
          <div className="flex items-center justify-between text-sm">
            <span
              className={[
                'font-semibold',
                isWinner ? 'text-turquoise' : 'text-zinc-300',
              ].join(' ')}
            >
              {pct}%
            </span>
            <span className="text-zinc-500">
              {option.votes.toLocaleString()} votes
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className={[
                'h-full rounded-full transition-all duration-700',
                isWinner
                  ? 'bg-gradient-to-r from-turquoise to-periwinkle'
                  : 'bg-gradient-to-r from-zinc-700 to-zinc-600',
              ].join(' ')}
              style={{
                width: `${pct}%`,
                boxShadow: isWinner ? '0 0 16px #34e0a166' : undefined,
              }}
            />
          </div>
        </div>
      ) : (
        <div className="relative mt-5 flex items-center gap-2 text-sm font-medium text-turquoise opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <Zap className="size-4" /> Tap to pick this hook
        </div>
      )}
    </button>
  )
}

/**
 * Live, DB-backed voting for a single room. Reads hooks via useRoomHooks
 * (realtime) and writes through castVote(); other users' votes stream in
 * live because the DB trigger updates hooks.votes on every insert.
 */
function LiveVote({ roomId, roomName, hooks }) {
  // A key={roomId} on this component (see VoteView) remounts it per room,
  // so this local selection state resets naturally on room change.
  const [picked, setPicked] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [voteError, setVoteError] = useState(null)

  const options = useMemo(() => hooks.slice(0, 4), [hooks])
  const voted = picked !== null

  const totalVotes = useMemo(
    () => options.reduce((sum, o) => sum + o.votes, 0),
    [options],
  )
  const winnerId = useMemo(
    () =>
      options.length
        ? options.reduce((best, o) => (o.votes > best.votes ? o : best)).id
        : null,
    [options],
  )

  const handleVote = async (hookId) => {
    if (voted || submitting) return
    setSubmitting(true)
    setVoteError(null)
    setPicked(hookId) // optimistic: reveal results immediately
    try {
      await castVote({ roomId, hookId })
      // The realtime hooks UPDATE reconciles the live counts shortly after.
    } catch (e) {
      setVoteError(e?.message ?? 'Vote failed — please try again.')
      setPicked(null) // let the user retry
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {roomName && (
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-turquoise/25 bg-turquoise/10 px-2.5 py-1 text-[11px] font-semibold text-turquoise">
              <span className="size-1.5 rounded-full bg-turquoise" />
              {roomName}
            </span>
          )}
          <h2 className="text-2xl font-bold tracking-tight text-zinc-50">
            Which hook wins?
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Pick the opener you'd actually stop scrolling for.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-turquoise/20 bg-turquoise/10 px-3.5 py-2 text-sm font-semibold text-turquoise">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-turquoise opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-turquoise" />
          </span>
          Live
        </div>
      </div>

      {/* Meta */}
      <div className="mt-6 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-400">
          <Radio className="size-3" /> {options.length} hooks in play
        </span>
        <span className="text-xs font-medium text-zinc-500">
          {totalVotes.toLocaleString()} total votes
        </span>
      </div>

      {/* Options grid (up to 4) */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {options.map((option, i) => (
          <OptionCard
            key={option.id}
            letter={LETTERS[i]}
            option={option}
            totalVotes={totalVotes}
            isWinner={voted && option.id === winnerId}
            voted={voted}
            picked={picked}
            onVote={handleVote}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          {voteError ? (
            <span className="text-rose-400">{voteError}</span>
          ) : voted ? (
            <>
              <Check className="size-4 text-turquoise" />
              Vote counted — results update live as others vote.
            </>
          ) : (
            <>
              <TrendingUp className="size-4" />
              {totalVotes.toLocaleString()} votes cast in this room.
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Offline / demo fallback: the original mock-data matchup carousel. Used when
 * the DB isn't reachable or a room has no live hooks yet.
 */
function DemoVote({ roomName }) {
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState(null)
  const [streak, setStreak] = useState(7)

  const matchup = matchups[index % matchups.length]
  const voted = picked !== null

  const totalVotes = useMemo(
    () => matchup.options.reduce((sum, o) => sum + o.votes, 0),
    [matchup],
  )
  const winnerId = useMemo(
    () => matchup.options.reduce((best, o) => (o.votes > best.votes ? o : best)).id,
    [matchup],
  )

  const handleVote = (optionId) => {
    setPicked(optionId)
    setStreak((s) => s + 1)
  }

  const next = () => {
    setPicked(null)
    setIndex((i) => i + 1)
  }

  const progress = Math.round(
    (((index % matchups.length) + 1) / matchups.length) * 100,
  )

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {roomName && (
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-turquoise/25 bg-turquoise/10 px-2.5 py-1 text-[11px] font-semibold text-turquoise">
              <span className="size-1.5 rounded-full bg-turquoise" />
              {roomName}
            </span>
          )}
          <h2 className="text-2xl font-bold tracking-tight text-zinc-50">
            Which hook wins?
          </h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
            Pick the opener you'd actually stop scrolling for.
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Demo data
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-turquoise/20 bg-turquoise/10 px-3.5 py-2 text-sm font-semibold text-turquoise">
          <Flame className="size-4" />
          {streak} day streak
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlatformBadge platform={matchup.platform} />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-400">
            <Sparkles className="size-3" /> {matchup.category}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-400">
            @{matchup.creator}
          </span>
        </div>
        <span className="text-xs font-medium text-zinc-500">
          Matchup {(index % matchups.length) + 1} of {matchups.length}
        </span>
      </div>

      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-turquoise to-periwinkle transition-all duration-500"
          style={{ width: `${progress}%`, boxShadow: '0 0 12px #34e0a155' }}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {matchup.options.map((option, i) => (
          <OptionCard
            key={option.id}
            letter={LETTERS[i]}
            option={option}
            totalVotes={totalVotes}
            isWinner={voted && option.id === winnerId}
            voted={voted}
            picked={picked}
            onVote={handleVote}
          />
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          {voted ? (
            <>
              <Check className="size-4 text-turquoise" />
              Vote counted — nice eye.
            </>
          ) : (
            <>
              <TrendingUp className="size-4" />
              {totalVotes.toLocaleString()} creators have voted on this matchup.
            </>
          )}
        </div>
        <button
          type="button"
          onClick={next}
          disabled={!voted}
          className={[
            'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all',
            voted
              ? 'bg-turquoise text-black shadow-lg shadow-turquoise/25 hover:brightness-110'
              : 'cursor-not-allowed bg-white/5 text-zinc-600',
          ].join(' ')}
        >
          Next matchup
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

/**
 * Vote View dispatcher: shows the live, DB-backed room vote when hooks are
 * available, and gracefully falls back to the demo matchup carousel otherwise.
 * Defaults to the flagship Hook Lab room when no specific room is selected.
 */
export default function VoteView({ roomId, roomName }) {
  const effectiveRoomId = roomId ?? 'hook-lab'
  const effectiveRoomName = roomName ?? (roomId ? undefined : 'Hook Lab')
  const { hooks, status } = useRoomHooks(effectiveRoomId)

  if (status === 'live' && hooks.length > 0) {
    return (
      <LiveVote
        key={effectiveRoomId}
        roomId={effectiveRoomId}
        roomName={effectiveRoomName}
        hooks={hooks}
      />
    )
  }

  // 'loading' shows the demo immediately so there's never a blank flash;
  // it swaps to live the moment hooks arrive.
  return <DemoVote roomName={roomName} />
}
