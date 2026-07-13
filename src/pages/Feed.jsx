import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  ArrowRight,
  BarChart3,
  Compass,
  ImageIcon,
  Loader2,
  MousePointerClick,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react'
import { fetchFeed } from '../lib/submissions'
import TiltCard from '../design/components/TiltCard'
import AmbientOrb, { AmbientGlowField } from '../design/components/AmbientOrb'
import { rise } from '../design/tokens/motion'

const HOW_IT_WORKS = [
  {
    icon: Upload,
    title: 'Post it',
    body: 'Drop an idea, a name, or two thumbnails you can’t choose between.',
  },
  {
    icon: MousePointerClick,
    title: 'The crowd votes',
    body: 'Anyone can weigh in — no account needed. One tap, real opinions.',
  },
  {
    icon: BarChart3,
    title: 'See the winner',
    body: 'Watch the results land live and go with what actually resonates.',
  },
]

// The hero that crowns the feed — the product's whole pitch in one glance.
// Always present (it's the identity of the page), and it single-handedly
// carries the page on a cold start when there's nothing to show yet.
function Hero() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 al-glass px-6 py-10 sm:px-10 sm:py-14">
      <AmbientGlowField />
      <div className="relative flex flex-col items-center text-center">
        <AmbientOrb icon={Sparkles} size="hero" />
        <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-turquoise/25 bg-turquoise/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-turquoise">
          Community picks
        </span>
        <h1 className="al-display mt-3 text-4xl leading-[1.05] text-zinc-50 sm:text-6xl">
          Can’t decide?
          <br />
          Let the crowd pick.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
          Post two options — a thumbnail, a name, an idea — and real people vote
          on which one wins. Honest opinions, in minutes, from anyone.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/new"
            className="inline-flex items-center gap-2 rounded-xl bg-turquoise px-5 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110"
            style={{ boxShadow: '0 0 26px -4px color-mix(in oklab, var(--al-tq) 67%, transparent)' }}
          >
            <Upload className="size-4" /> Post an idea
          </a>
          <a
            href="#feed"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:text-zinc-100"
          >
            Browse the feed <ArrowRight className="size-4" />
          </a>
        </div>
      </div>

      {/* How it works — three steps, so a first-time visitor gets it instantly. */}
      <div className="relative mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {HOW_IT_WORKS.map((step, i) => {
          const Icon = step.icon
          return (
            <motion.div
              key={step.title}
              custom={i}
              initial="hidden"
              animate="shown"
              variants={rise}
              className="al-glass-thin rounded-2xl border border-white/10 p-4 text-left"
            >
              <div className="flex items-center gap-2.5">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-turquoise/10 text-turquoise ring-1 ring-turquoise/20">
                  <Icon className="size-4" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Step {i + 1}
                </span>
              </div>
              <p className="mt-2.5 text-sm font-semibold text-zinc-100">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{step.body}</p>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

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
      <Hero />

      <div id="feed" className="mt-12 flex items-center gap-2">
        <Compass className="size-5 text-turquoise" />
        <h2 className="al-display text-2xl text-zinc-50 sm:text-3xl">The Feed</h2>
        {state.items && state.items.length > 0 && (
          <span className="ml-1 text-xs text-zinc-500">{state.items.length} live</span>
        )}
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        Every idea and thumbnail the community is voting on right now.
      </p>

      {state.loading && (
        <div className="al-glass mt-6 flex items-center justify-center gap-2 rounded-2xl border border-white/10 py-16 text-sm text-zinc-500">
          <Loader2 className="size-4 animate-spin text-turquoise" /> Loading the feed…
        </div>
      )}

      {state.error && (
        <div className="al-glass mt-6 rounded-2xl border border-rose-400/20 p-8 text-center text-sm text-rose-400">
          {state.error}
        </div>
      )}

      {state.items && state.items.length === 0 && (
        <div className="al-glass mt-6 flex flex-col items-center gap-3 rounded-2xl border border-white/10 px-6 py-14 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-turquoise/10 text-turquoise ring-1 ring-turquoise/25">
            <Compass className="size-6" />
          </span>
          <p className="text-base font-semibold text-zinc-100">Be the first</p>
          <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
            No one’s posted yet — so the very first idea the community sees could
            be yours. Takes about thirty seconds.
          </p>
          <a
            href="/new"
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-turquoise px-4 py-2 text-sm font-semibold text-black transition-all hover:brightness-110"
          >
            <Upload className="size-4" /> Post the first idea
          </a>
        </div>
      )}

      {state.items && state.items.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
