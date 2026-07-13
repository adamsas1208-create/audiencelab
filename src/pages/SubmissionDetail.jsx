import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2, Vote } from 'lucide-react'
import { castVote, fetchMyVote, fetchSubmission } from '../lib/submissions'

// Per-option image with graceful fallback — a broken URL collapses to
// nothing rather than showing a busted image icon.
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

export default function SubmissionDetail({ id }) {
  const [state, setState] = useState({ loading: true, submission: null, error: null })
  const [votedId, setVotedId] = useState(null)
  // Tracks a vote this browser just cast but the server hasn't confirmed back
  // into `submission.options[].votes` yet. Kept as a single id (never math
  // done ON the base tally) so the displayed percentage is a pure function of
  // (server votes, this flag) — safe no matter how many times React
  // re-invokes a render or a state updater (React 19 StrictMode double-
  // invokes setState updater functions in dev; a relative "+1 on prior
  // state" updater would double-apply here, which is exactly the bug this
  // design avoids).
  const [optimisticVoteId, setOptimisticVoteId] = useState(null)
  const [voting, setVoting] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchSubmission(id), fetchMyVote(id)])
      .then(([submission, myVote]) => {
        if (cancelled) return
        setState({ loading: false, submission, error: null })
        setVotedId(myVote)
      })
      .catch((err) => {
        if (!cancelled)
          setState({ loading: false, submission: null, error: err?.message ?? 'Could not load this.' })
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // Displayed tallies = server votes + at most one pending optimistic vote.
  // Pure derivation, recomputed fresh every render — nothing here mutates
  // the base `state.submission` data, so it's safe under double-invocation.
  const displayOptions = useMemo(() => {
    const options = state.submission?.options || []
    return options.map((o) =>
      o.id === optimisticVoteId ? { ...o, votes: (o.votes || 0) + 1 } : o,
    )
  }, [state.submission, optimisticVoteId])

  const total = useMemo(
    () => displayOptions.reduce((s, o) => s + (o.votes || 0), 0),
    [displayOptions],
  )

  const hasImages = useMemo(() => displayOptions.some((o) => o.image_url), [displayOptions])

  const vote = async (optionId) => {
    if (votedId || voting) return
    setVoting(true)
    setOptimisticVoteId(optionId)
    setVotedId(optionId)
    try {
      await castVote({ submissionId: id, optionId })
    } catch (err) {
      // Roll back — the optimistic derivation above just stops applying.
      setOptimisticVoteId(null)
      setVotedId(null)
      setState((s) => ({ ...s, error: err?.message ?? 'Could not cast that vote.' }))
    } finally {
      setVoting(false)
    }
  }

  if (state.loading) {
    return (
      <div className="al-glass mx-auto flex max-w-2xl items-center justify-center gap-2 rounded-2xl border border-white/10 py-16 text-sm text-zinc-500">
        <Loader2 className="size-4 animate-spin text-turquoise" /> Loading…
      </div>
    )
  }

  if (!state.submission) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center pt-10 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/5">
          <AlertTriangle className="size-6 text-zinc-500" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-zinc-50">Not found</h2>
        <p className="mt-1 text-sm text-zinc-500">
          This submission doesn&apos;t exist, or it&apos;s been removed.
        </p>
      </div>
    )
  }

  const { submission } = state

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-2 text-turquoise">
        <Vote className="size-4" />
        <span className="text-[11px] font-bold uppercase tracking-wide">Cast your vote</span>
      </div>
      <h1 className="al-display mt-2 text-2xl text-zinc-50 sm:text-3xl">{submission.prompt}</h1>

      {state.error && <p className="mt-3 text-sm text-rose-400">{state.error}</p>}

      <div
        className={
          hasImages
            ? 'al-poll-grid mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2'
            : 'mt-6 space-y-2.5'
        }
      >
        {displayOptions.map((o) => {
          const pct = total ? Math.round(((o.votes || 0) / total) * 100) : 0
          const isVoted = votedId === o.id
          const withImage = hasImages && !!o.image_url
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => vote(o.id)}
              disabled={!!votedId}
              className={[
                'group relative w-full overflow-hidden text-left transition-all duration-300',
                hasImages
                  ? 'al-poll-card flex flex-col rounded-2xl border'
                  : 'rounded-xl border px-4 py-3',
                isVoted
                  ? 'border-turquoise bg-turquoise/10 shadow-[0_0_26px_-4px_#34e0a1]'
                  : 'border-white/10 bg-white/[0.03] hover:border-turquoise/40',
                votedId && !isVoted ? 'opacity-60' : '',
              ].join(' ')}
            >
              {withImage && (
                <div className="relative">
                  <OptionImage src={o.image_url} alt={o.label || ''} />
                  {votedId && (
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-bold text-turquoise backdrop-blur">
                      {pct}%
                    </span>
                  )}
                </div>
              )}
              <span className={['relative block', hasImages ? 'p-3.5' : ''].join(' ')}>
                <span
                  className="al-speedo absolute inset-y-0 left-0 bg-turquoise/10"
                  style={{ width: votedId ? `${pct}%` : '0%' }}
                  aria-hidden="true"
                />
                <span className="relative flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-100">
                    {o.label || (withImage ? '' : 'Untitled option')}
                  </span>
                  {votedId && !withImage && (
                    <span className="shrink-0 text-xs font-bold text-turquoise">{pct}%</span>
                  )}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-5 text-center text-xs text-zinc-500">
        {votedId
          ? `Thanks for voting! ${total.toLocaleString()} vote${total === 1 ? '' : 's'} so far.`
          : 'Tap an option to cast your vote — no signup needed.'}
      </p>
    </div>
  )
}
