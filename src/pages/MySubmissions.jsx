import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { AlertTriangle, ImageIcon, LayoutList, Loader2, Users } from 'lucide-react'
import { useAuth } from '../context/auth-context'
import AuthPanel from '../components/Auth/AuthPanel'
import { fetchMySubmissions } from '../lib/submissions'
import TiltCard from '../design/components/TiltCard'
import { rise } from '../design/tokens/motion'

function OptionResultRow({ option, total, isLead }) {
  const pct = total ? Math.round(((option.votes || 0) / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      {option.image_url ? (
        <img
          src={option.image_url}
          alt={option.label || ''}
          className="size-10 shrink-0 rounded-lg border border-white/10 object-cover"
        />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-600">
          <ImageIcon className="size-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-3 text-xs">
          <span className={isLead ? 'font-semibold text-zinc-100' : 'text-zinc-400'}>
            {option.label || 'Untitled option'}
          </span>
          <span
            className="shrink-0 font-bold tabular-nums"
            style={{ color: isLead ? '#34e0a1' : '#a1a1aa' }}
          >
            {pct}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="al-speedo h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: isLead ? 'linear-gradient(90deg, #34e0a1, #6ef0c2)' : 'rgba(255,255,255,0.18)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

function SubmissionResultCard({ submission }) {
  const total = submission.options.reduce((s, o) => s + (o.votes || 0), 0)
  const leadVotes = Math.max(...submission.options.map((o) => o.votes || 0), 0)

  return (
    <TiltCard className="h-full">
      <div className="al-glass h-full rounded-2xl border border-white/10 p-5">
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-sm font-bold text-zinc-50">{submission.prompt}</h4>
          <a
            href={`/s/${submission.id}`}
            className="shrink-0 text-xs font-medium text-turquoise hover:underline"
          >
            View
          </a>
        </div>
        <div className="mt-4 space-y-3">
          {submission.options.map((o) => (
            <OptionResultRow
              key={o.id}
              option={o}
              total={total}
              isLead={(o.votes || 0) === leadVotes && leadVotes > 0}
            />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs">
          <span className="text-zinc-500">
            {submission.options.length} option{submission.options.length === 1 ? '' : 's'}
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-300">
            <Users className="size-3.5 text-turquoise" />
            <span className="tabular-nums text-turquoise">{total.toLocaleString()}</span> votes
          </span>
        </div>
      </div>
    </TiltCard>
  )
}

export default function MySubmissions() {
  const { user, loading } = useAuth()
  const [state, setState] = useState({ loading: true, items: null, error: null })

  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetchMySubmissions()
      .then((items) => {
        if (!cancelled) setState({ loading: false, items, error: null })
      })
      .catch((err) => {
        if (!cancelled)
          setState({ loading: false, items: null, error: err?.message ?? 'Could not load your submissions.' })
      })
    return () => {
      cancelled = true
    }
  }, [user])

  if (!loading && !user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center pt-10 text-center">
        <span
          className="inline-flex size-12 items-center justify-center rounded-2xl bg-turquoise/10 ring-1 ring-turquoise/25"
          style={{ boxShadow: '0 0 22px -8px var(--al-tq)' }}
        >
          <LayoutList className="size-6 text-turquoise" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-zinc-50">My Submissions</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Sign in to see what you've posted and how the votes are landing.
        </p>
        <div className="mt-6 w-full">
          <AuthPanel />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center gap-2">
        <LayoutList className="size-5 text-turquoise" />
        <h1 className="al-display text-3xl text-zinc-50 sm:text-4xl">My Submissions</h1>
      </div>
      <p className="mt-1 text-sm text-zinc-500">Live results for everything you've posted.</p>

      {state.loading && (
        <div className="al-glass mt-8 flex items-center justify-center gap-2 rounded-2xl border border-white/10 py-16 text-sm text-zinc-500">
          <Loader2 className="size-4 animate-spin text-turquoise" /> Loading…
        </div>
      )}

      {state.error && (
        <div className="al-glass mt-8 flex items-center justify-center gap-2 rounded-2xl border border-rose-400/20 p-8 text-center text-sm text-rose-400">
          <AlertTriangle className="size-4" /> {state.error}
        </div>
      )}

      {state.items && state.items.length === 0 && (
        <div className="al-glass mt-8 flex flex-col items-center gap-3 rounded-2xl border border-white/10 px-6 py-16 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-turquoise/10 text-turquoise ring-1 ring-turquoise/25">
            <LayoutList className="size-6" />
          </span>
          <p className="text-base font-semibold text-zinc-100">Nothing posted yet</p>
          <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
            Post an idea or a thumbnail and watch the votes come in here.
          </p>
          <a
            href="/new"
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-turquoise px-4 py-2 text-sm font-semibold text-black transition-all hover:brightness-110"
          >
            Post an idea
          </a>
        </div>
      )}

      {state.items && state.items.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {state.items.map((s, i) => (
            <motion.div key={s.id} custom={i} initial="hidden" animate="shown" variants={rise}>
              <SubmissionResultCard submission={s} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
