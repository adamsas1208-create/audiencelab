import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Compass, ImageIcon, Loader2, Users } from 'lucide-react'
import { fetchFeed } from '../lib/submissions'
import TiltCard from '../design/components/TiltCard'
import { rise } from '../design/tokens/motion'

function OptionThumb({ option }) {
  if (option.image_url) {
    return (
      <div className="aspect-square overflow-hidden rounded-lg bg-black/40">
        <img src={option.image_url} alt={option.label || ''} className="size-full object-cover" />
      </div>
    )
  }
  return (
    <div className="flex aspect-square items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] p-2 text-center">
      <span className="line-clamp-3 text-xs font-medium text-zinc-400">
        {option.label || <ImageIcon className="mx-auto size-4 text-zinc-600" />}
      </span>
    </div>
  )
}

function SubmissionCard({ submission }) {
  const total = submission.options.reduce((s, o) => s + (o.votes || 0), 0)

  return (
    <TiltCard className="h-full">
      <a
        href={`/s/${submission.id}`}
        className="al-glass block h-full rounded-2xl border border-white/10 p-4 transition-transform hover:-translate-y-0.5"
      >
        <p className="line-clamp-2 text-sm font-semibold text-zinc-100">{submission.prompt}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {submission.options.slice(0, 4).map((o) => (
            <OptionThumb key={o.id} option={o} />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
          <span>{submission.options.length} options</span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5 text-turquoise" />
            <span className="font-semibold text-turquoise">{total.toLocaleString()}</span> votes
          </span>
        </div>
      </a>
    </TiltCard>
  )
}

export default function Feed() {
  const [state, setState] = useState({ loading: true, items: null, error: null })

  useEffect(() => {
    let cancelled = false
    fetchFeed()
      .then((items) => {
        if (!cancelled) setState({ loading: false, items, error: null })
      })
      .catch((err) => {
        if (!cancelled)
          setState({ loading: false, items: null, error: err?.message ?? 'Could not load the feed.' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center gap-2">
        <Compass className="size-5 text-turquoise" />
        <h1 className="al-display text-3xl text-zinc-50 sm:text-4xl">The Feed</h1>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        Every idea and thumbnail the community is voting on right now.
      </p>

      {state.loading && (
        <div className="al-glass mt-8 flex items-center justify-center gap-2 rounded-2xl border border-white/10 py-16 text-sm text-zinc-500">
          <Loader2 className="size-4 animate-spin text-turquoise" /> Loading the feed…
        </div>
      )}

      {state.error && (
        <div className="al-glass mt-8 rounded-2xl border border-rose-400/20 p-8 text-center text-sm text-rose-400">
          {state.error}
        </div>
      )}

      {state.items && state.items.length === 0 && (
        <div className="al-glass mt-8 flex flex-col items-center gap-3 rounded-2xl border border-white/10 px-6 py-16 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-turquoise/10 text-turquoise ring-1 ring-turquoise/25">
            <Compass className="size-6" />
          </span>
          <p className="text-base font-semibold text-zinc-100">Nothing here yet</p>
          <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
            Be the first to post an idea or a thumbnail and let the community pick.
          </p>
        </div>
      )}

      {state.items && state.items.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.items.map((s, i) => (
            <motion.div key={s.id} custom={i} initial="hidden" animate="shown" variants={rise}>
              <SubmissionCard submission={s} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
