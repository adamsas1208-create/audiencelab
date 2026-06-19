import { useMemo, useRef, useState } from 'react'
import { useData } from '../../context/data-context'
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  Copy,
  FileText,
  Gift,
  Link2,
  ListChecks,
  Loader2,
  Megaphone,
  Sparkles,
  Target,
  Wand2,
} from 'lucide-react'

// Lead Magnet types the wizard can generate. Each carries the icon + a builder
// that tailors mock AI output to the creator's chosen niche.
const MAGNET_TYPES = [
  {
    id: 'viral-hooks',
    label: 'Top 10 Viral Hooks PDF',
    icon: FileText,
    blurb: '10 scroll-stopping hooks engineered for your niche.',
  },
  {
    id: 'content-calendar',
    label: '7-Day Content Calendar Blueprint',
    icon: Calendar,
    blurb: 'A full week of post angles, ready to publish.',
  },
  {
    id: 'growth-checklist',
    label: 'Free Growth Checklist',
    icon: ListChecks,
    blurb: 'A high-converting checklist your leads will love.',
  },
]

// --- Mock "AI" generators -------------------------------------------------
// These stand in for a real model call. They interpolate the niche so the
// preview feels tailored without any backend dependency.

function buildViralHooks(niche) {
  const n = niche || 'your niche'
  return {
    kind: 'list',
    title: `Top 10 Viral Hooks for ${n}`,
    subtitle: 'Swipe-worthy openers proven to stop the scroll.',
    items: [
      `The #1 mistake ${n} make that quietly kills their growth`,
      `I grew a ${n} account to 100k — here's the exact first move`,
      `Stop posting like everyone else in ${n}. Do this instead.`,
      `3 things every ${n} brand needs before going viral`,
      `Why your ${n} content gets ignored (and the 5-second fix)`,
      `The hook formula top ${n} creators won't share`,
      `Steal my ${n} content system — it took 2 years to build`,
      `What nobody tells you about scaling in ${n}`,
      `If you run a ${n} page, watch this before you post again`,
      `The ${n} trend that's printing followers right now`,
    ],
  }
}

function buildCalendar(niche) {
  const n = niche || 'your niche'
  return {
    kind: 'calendar',
    title: `7-Day Content Blueprint for ${n}`,
    subtitle: 'One high-intent angle per day — built to convert lurkers.',
    items: [
      { day: 'Mon', angle: `Authority post: a bold opinion about ${n}` },
      { day: 'Tue', angle: `How-to: solve the top pain point in ${n}` },
      { day: 'Wed', angle: `Behind-the-scenes of your ${n} workflow` },
      { day: 'Thu', angle: `Myth-bust a common ${n} belief` },
      { day: 'Fri', angle: `Case study / before-and-after for ${n}` },
      { day: 'Sat', angle: `Engagement prompt: ask your ${n} audience` },
      { day: 'Sun', angle: `Soft CTA: invite leads to your free resource` },
    ],
  }
}

function buildChecklist(niche) {
  const n = niche || 'your niche'
  return {
    kind: 'checklist',
    title: `The ${n} Growth Checklist`,
    subtitle: 'The fundamentals that separate growth from guesswork.',
    items: [
      `Define your single ideal ${n} customer`,
      'Lock a repeatable hook formula',
      'Batch one week of content in advance',
      'Add a clear call-to-action to every post',
      'Capture leads with a free, valuable offer',
      'Review your top 3 posts weekly and double down',
    ],
  }
}

function generateMagnet(typeId, niche) {
  switch (typeId) {
    case 'content-calendar':
      return buildCalendar(niche)
    case 'growth-checklist':
      return buildChecklist(niche)
    case 'viral-hooks':
    default:
      return buildViralHooks(niche)
  }
}

// Build a believable share slug from the niche.
function slugify(niche) {
  const base = (niche || 'gift')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'gift'
}

export default function LeadMagnetStudio() {
  const { leadsCaptured } = useData()
  const [niche, setNiche] = useState('')
  const [typeId, setTypeId] = useState(MAGNET_TYPES[0].id)
  const [status, setStatus] = useState('idle') // idle | generating | done
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  const activeType = useMemo(
    () => MAGNET_TYPES.find((t) => t.id === typeId) ?? MAGNET_TYPES[0],
    [typeId],
  )

  const shareUrl = `audiencelab.ai/p/share/${slugify(niche)}`

  const generate = () => {
    if (status === 'generating') return
    setStatus('generating')
    setResult(null)
    setCopied(false)
    // Simulate a high-fidelity AI generation pass.
    timerRef.current = window.setTimeout(() => {
      setResult(generateMagnet(typeId, niche.trim()))
      setStatus('done')
    }, 2200)
  }

  const reset = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    setStatus('idle')
    setResult(null)
    setCopied(false)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://${shareUrl}`)
    } catch {
      // Clipboard may be blocked (e.g. insecure context) — still flash success
      // since the link is visible and selectable.
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div>
      {/* Intro */}
      <div className="flex items-start gap-3">
        <span
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-turquoise/10 ring-1 ring-turquoise/25"
          style={{ boxShadow: '0 0 22px -8px #34e0a1' }}
        >
          <Sparkles
            className="size-5 text-turquoise"
            style={{ filter: 'drop-shadow(0 0 6px #34e0a1)' }}
          />
        </span>
        <div>
          <h3 className="text-lg font-bold tracking-tight text-zinc-50">
            AI Lead Magnet Studio
          </h3>
          <p className="mt-0.5 text-sm text-zinc-500">
            Instantly generate a high-value resource to attract premium leads.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* ---- Left: Setup wizard ---- */}
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            <Wand2 className="size-3.5 text-turquoise" />
            Setup wizard
          </div>

          {/* Step 1 — Niche */}
          <div className="mt-4">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zinc-200">
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-turquoise/15 text-[11px] font-bold text-turquoise">
                  1
                </span>
                Target Niche
              </span>
              <div className="relative">
                <Target className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g. Fitness Studios, E-commerce Brands, Local Cafes"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-turquoise/40 focus:outline-none"
                />
              </div>
            </label>
          </div>

          {/* Step 2 — Magnet type */}
          <div className="mt-5">
            <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zinc-200">
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-turquoise/15 text-[11px] font-bold text-turquoise">
                2
              </span>
              Lead Magnet Type
            </span>
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-200 focus:border-turquoise/40 focus:outline-none"
            >
              {MAGNET_TYPES.map((t) => (
                <option key={t.id} value={t.id} className="bg-zinc-900">
                  {t.label}
                </option>
              ))}
            </select>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
              <activeType.icon className="size-3.5 text-turquoise" />
              {activeType.blurb}
            </p>
          </div>

          {/* Generate */}
          <button
            type="button"
            onClick={generate}
            disabled={status === 'generating'}
            className="group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-turquoise px-4 py-3 text-sm font-bold text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            style={{ boxShadow: '0 0 24px -4px #34e0a1aa' }}
          >
            {status === 'generating' ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Crafting…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Generate Lead Magnet with AI
              </>
            )}
          </button>
          {status === 'done' && (
            <button
              type="button"
              onClick={reset}
              className="mt-2 w-full text-center text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Start over
            </button>
          )}
        </div>

        {/* ---- Right: Output ---- */}
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          {status === 'idle' && (
            <div className="flex h-full min-h-56 flex-col items-center justify-center text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/5">
                <Gift className="size-6 text-zinc-500" />
              </span>
              <p className="mt-4 text-sm font-medium text-zinc-300">
                Your lead magnet preview appears here
              </p>
              <p className="mt-1 max-w-xs text-xs text-zinc-500">
                Pick a niche and a type, then let the AI craft a tailored,
                share-ready resource.
              </p>
            </div>
          )}

          {status === 'generating' && (
            <div className="flex h-full min-h-56 flex-col items-center justify-center text-center">
              <span className="relative inline-flex size-16 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-turquoise/20" />
                <span
                  className="absolute inset-0 animate-pulse rounded-full bg-turquoise/10"
                  style={{ boxShadow: '0 0 40px -6px #34e0a1' }}
                />
                <Sparkles
                  className="relative size-7 animate-pulse text-turquoise"
                  style={{ filter: 'drop-shadow(0 0 8px #34e0a1)' }}
                />
              </span>
              <p className="mt-5 text-sm font-semibold text-zinc-100">
                AI is crafting your ultimate lead magnet…
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Analyzing {niche.trim() || 'your niche'} and writing tailored
                content.
              </p>
              <div className="mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-turquoise" />
              </div>
            </div>
          )}

          {status === 'done' && result && (
            <GeneratedContent result={result} />
          )}
        </div>
      </div>

      {/* ---- Publish & Share ---- */}
      {status === 'done' && result && (
        <div className="mt-5">
          <PublishPanel
            shareUrl={shareUrl}
            copied={copied}
            onCopy={copyLink}
            leadsCaptured={leadsCaptured}
          />
        </div>
      )}
    </div>
  )
}

function GeneratedContent({ result }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-turquoise">
        <Sparkles className="size-3.5" />
        Generated preview
      </div>
      <h4 className="mt-2 text-base font-bold tracking-tight text-zinc-50">
        {result.title}
      </h4>
      <p className="mt-0.5 text-xs text-zinc-500">{result.subtitle}</p>

      <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
        {result.kind === 'list' &&
          result.items.map((hook, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5"
            >
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-turquoise/15 text-[11px] font-bold text-turquoise">
                {i + 1}
              </span>
              <p className="text-sm leading-snug text-zinc-200">“{hook}”</p>
            </div>
          ))}

        {result.kind === 'calendar' &&
          result.items.map((d) => (
            <div
              key={d.day}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5"
            >
              <span className="inline-flex w-10 shrink-0 justify-center rounded-md bg-turquoise/15 py-1 text-[11px] font-bold uppercase text-turquoise">
                {d.day}
              </span>
              <p className="text-sm leading-snug text-zinc-200">{d.angle}</p>
            </div>
          ))}

        {result.kind === 'checklist' &&
          result.items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5"
            >
              <Check className="mt-0.5 size-4 shrink-0 text-turquoise" />
              <p className="text-sm leading-snug text-zinc-200">{item}</p>
            </div>
          ))}
      </div>
    </div>
  )
}

function PublishPanel({ shareUrl, copied, onCopy, leadsCaptured = 0 }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-turquoise/20 bg-gradient-to-br from-turquoise/[0.08] to-transparent p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-turquoise/10 blur-2xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-turquoise">
            <Megaphone className="size-3.5" />
            Your Lead Capture Link
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Share this link anywhere — every signup lands in your Audience.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
              <Link2 className="size-4 shrink-0 text-turquoise" />
              <span className="truncate text-sm text-zinc-200">{shareUrl}</span>
            </div>
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-turquoise px-4 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110"
              style={{ boxShadow: '0 0 22px -4px #34e0a1' }}
            >
              {copied ? (
                <>
                  <Check className="size-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-4" /> Copy Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Analytics tracker */}
        <div className="shrink-0 rounded-xl border border-white/10 bg-black/40 px-5 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            <BarChart3 className="size-3.5 text-turquoise" />
            Leads Captured
          </div>
          <p className="mt-1 text-3xl font-bold tracking-tight text-zinc-50">
            {leadsCaptured}
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-zinc-500">
            Live tracking <ArrowRight className="size-3" />{' '}
            {leadsCaptured > 0 ? 'and counting' : 'waiting for clicks'}
          </p>
        </div>
      </div>
    </div>
  )
}
