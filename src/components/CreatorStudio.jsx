import { useRef, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Gamepad2,
  Image as ImageIcon,
  Loader2,
  Minus,
  Plus,
  Rocket,
  Sparkles,
  Trash2,
  UploadCloud,
  Video,
  X,
} from 'lucide-react'
import { useData } from '../context/data-context'
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

// Dynamic poll options range from 2 (default) up to 4.
const MIN_OPTIONS = 2
const MAX_OPTIONS = 4
const OPTION_LETTERS = ['A', 'B', 'C', 'D']
const emptyOption = () => ({ label: '', image_url: '' })
const img = (id) =>
  `https://images.unsplash.com/${id}?w=640&q=80&auto=format&fit=crop`

const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/webp'

// Turn a dropped/pasted/selected image File (or Blob) into a self-contained
// base64 data URL. We downscale large images through a canvas first so the
// resulting string stays small enough to live comfortably in localStorage —
// raw phone screenshots can be several MB otherwise. Falls back to the
// untouched data URL if anything in the canvas path fails.
async function fileToImageDataURL(file, maxDim = 1280, quality = 0.85) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  try {
    const image = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = dataUrl
    })
    const scale = Math.min(1, maxDim / Math.max(image.width, image.height))
    // Small enough already — keep it as-is.
    if (scale === 1 && dataUrl.length < 400_000) return dataUrl

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/webp', quality)
  } catch {
    return dataUrl
  }
}

// Pull the first image File out of a clipboard/drag DataTransfer, if any.
function firstImageFile(dataTransfer) {
  const items = dataTransfer?.items ? Array.from(dataTransfer.items) : []
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) return file
    }
  }
  const files = dataTransfer?.files ? Array.from(dataTransfer.files) : []
  return files.find((f) => f.type.startsWith('image/')) || null
}

// One-click test fixtures: each fills the option texts and appends matching
// high-quality Unsplash images so a creator can publish a visual test instantly.
// Presets ship with a varying option count to show off multi-option polls.
const POLL_PRESETS = {
  gaming: {
    icon: Gamepad2,
    label: 'Load Gaming Preset',
    question: 'Which thumbnail style should I run?',
    options: [
      { label: 'Cyberpunk style', image_url: img('photo-1538481199705-c710c4e965fc') },
      { label: 'Anime style', image_url: img('photo-1542751371-adc38448a05e') },
      { label: 'Retro style', image_url: img('photo-1550745165-9bc0b252726f') },
    ],
  },
  vlog: {
    icon: Video,
    label: 'Load Vlog Preset',
    question: 'Which vlog vibe gets the click?',
    options: [
      { label: 'Golden-hour city stroll', image_url: img('photo-1492619375914-88005aa9e8fb') },
      { label: 'Cozy café morning', image_url: img('photo-1495474472287-4d71bcdd2085') },
      { label: 'Beach sunset escape', image_url: img('photo-1507525428034-b723cf961d3e') },
      { label: 'Rainy window mood', image_url: img('photo-1428592953211-077101b2021b') },
    ],
  },
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

// Small option thumbnail for a visual test row. Collapses if the URL is broken.
function HookThumb({ src, alt }) {
  const [ok, setOk] = useState(true)
  if (!src || !ok) return null
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="size-9 shrink-0 rounded-lg border border-white/10 object-cover"
      onError={() => setOk(false)}
    />
  )
}

// Premium pop-up for building a Visual Image Poll / Hook Test.
function NewHookTestModal({ onClose }) {
  const { addHookTest, toast } = useData()
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(() => [emptyOption(), emptyOption()])

  const loadPreset = (key) => {
    const preset = POLL_PRESETS[key]
    setQuestion(preset.question)
    // Clone so editing one published test never mutates the preset fixture.
    setOptions(preset.options.slice(0, MAX_OPTIONS).map((o) => ({ ...o })))
  }

  const setOption = (i, next) =>
    setOptions((prev) => prev.map((o, idx) => (idx === i ? next : o)))

  const addOption = () =>
    setOptions((prev) =>
      prev.length >= MAX_OPTIONS ? prev : [...prev, emptyOption()],
    )

  const removeOption = (i) =>
    setOptions((prev) =>
      prev.length <= MIN_OPTIONS ? prev : prev.filter((_, idx) => idx !== i),
    )

  // Only options with a title count; need at least the minimum to publish.
  const filledOptions = options.filter((o) => o.label.trim())
  const canPublish = question.trim() && filledOptions.length >= MIN_OPTIONS
  const canRemove = options.length > MIN_OPTIONS
  const canAdd = options.length < MAX_OPTIONS

  const publish = (e) => {
    e.preventDefault()
    if (!canPublish) return
    addHookTest({
      question,
      status: 'testing',
      options: filledOptions,
    })
    toast(`Your ${filledOptions.length}-option test is now collecting votes.`, {
      title: 'Test published & running',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="al-modal-backdrop absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <form
        onSubmit={publish}
        className="al-modal-in al-modal-aura relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-turquoise/20 bg-zinc-950 p-6"
      >
        {/* ambient mint glow */}
        <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-turquoise/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-turquoise/10 ring-1 ring-turquoise/25"
              style={{ boxShadow: '0 0 22px -8px #34e0a1' }}
            >
              <ImageIcon className="size-4 text-turquoise" />
            </span>
            <h3
              className="text-lg font-bold tracking-tight text-turquoise"
              style={{ textShadow: '0 0 18px rgba(52,224,161,0.55)' }}
            >
              Create New Visual Poll / Hook Test
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Preset row */}
        <div className="relative mt-5 flex flex-wrap gap-2">
          {Object.entries(POLL_PRESETS).map(([key, preset]) => {
            const Icon = preset.icon
            return (
              <button
                key={key}
                type="button"
                onClick={() => loadPreset(key)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-turquoise/30 bg-turquoise/10 px-3 py-1.5 text-xs font-semibold text-turquoise transition-colors hover:bg-turquoise/15"
              >
                <Icon className="size-3.5" />
                {preset.label}
              </button>
            )
          })}
        </div>

        <div className="relative mt-5 space-y-4">
          <ModalField label="Poll Question / Hook Idea">
            <input
              type="text"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Which thumbnail should I run?"
              className={modalInputCls}
            />
          </ModalField>

          <div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {options.map((option, i) => (
                <OptionEditor
                  key={i}
                  letter={OPTION_LETTERS[i] ?? i + 1}
                  value={option}
                  onChange={(next) => setOption(i, next)}
                  onRemove={canRemove ? () => removeOption(i) : null}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addOption}
              disabled={!canAdd}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-turquoise/40 bg-turquoise/[0.06] px-4 py-2.5 text-sm font-semibold text-turquoise transition-colors hover:bg-turquoise/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="size-4" />
              {canAdd ? 'Add Option' : 'Maximum of 4 options'}
            </button>
          </div>
        </div>

        <div className="relative mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:text-zinc-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canPublish}
            className="inline-flex items-center gap-2 rounded-xl bg-turquoise px-5 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ boxShadow: '0 0 24px -4px #34e0a1aa' }}
          >
            <Rocket className="size-4" /> Publish &amp; Run Test
          </button>
        </div>
      </form>
    </div>
  )
}

const modalInputCls =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-turquoise/40 focus:outline-none'

function ModalField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  )
}

// A single option: title + a premium image zone that accepts file upload,
// drag-and-drop, and clipboard paste (Ctrl+V). The image is stored as a base64
// data URL so it persists in localStorage and renders just like a remote URL.
// onRemove is null when removing would drop below the minimum option count.
function OptionEditor({ letter, value, onChange, onRemove }) {
  const [broken, setBroken] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const fileRef = useRef(null)
  const url = value.image_url || ''
  const showPreview = url && !broken

  const setImage = (next) => {
    setBroken(false)
    onChange({ ...value, image_url: next })
  }

  const ingest = async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setProcessing(true)
    try {
      setImage(await fileToImageDataURL(file))
    } finally {
      setProcessing(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    ingest(firstImageFile(e.dataTransfer))
  }

  // Ctrl+V anywhere in the focused image zone grabs a copied screenshot/image.
  const onPaste = (e) => {
    const file = firstImageFile(e.clipboardData)
    if (file) {
      e.preventDefault()
      ingest(file)
    }
  }

  const openPicker = () => fileRef.current?.click()

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-turquoise/15 text-xs font-bold text-turquoise">
            {letter}
          </span>
          <span className="text-xs font-semibold text-zinc-300">Option {letter}</span>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex size-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-rose-400/10 hover:text-rose-400"
            title={`Remove option ${letter}`}
            aria-label={`Remove option ${letter}`}
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      {/* Hidden native file input, opened by the dropzone. */}
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="hidden"
        onChange={(e) => {
          ingest(e.target.files?.[0])
          e.target.value = '' // allow re-selecting the same file
        }}
      />

      {showPreview ? (
        // Loaded image — preview with a clear badge to swap it out.
        <div
          className="group relative aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black/40"
          tabIndex={0}
          onPaste={onPaste}
        >
          <img
            src={url}
            alt={value.label || `Option ${letter}`}
            className="size-full object-cover"
            onError={() => setBroken(true)}
          />
          <button
            type="button"
            onClick={() => setImage('')}
            className="absolute right-1.5 top-1.5 inline-flex size-7 items-center justify-center rounded-lg bg-black/70 text-zinc-200 backdrop-blur transition-colors hover:bg-rose-500/80 hover:text-white"
            title="Remove image"
            aria-label={`Remove image from option ${letter}`}
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        // Empty — sleek dashed dropzone (click / drop / paste).
        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              openPicker()
            }
          }}
          onPaste={onPaste}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={[
            'flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-center transition-colors focus:outline-none',
            dragging
              ? 'border-turquoise bg-turquoise/10'
              : 'border-white/15 bg-black/40 hover:border-turquoise/50 hover:bg-turquoise/[0.04]',
          ].join(' ')}
        >
          {processing ? (
            <>
              <Loader2 className="size-5 animate-spin text-turquoise" />
              <span className="text-[11px] text-zinc-400">Processing…</span>
            </>
          ) : broken ? (
            <>
              <ImageIcon className="size-5 text-rose-400/80" />
              <span className="px-2 text-[11px] text-zinc-400">
                Image failed to load — click to upload
              </span>
            </>
          ) : (
            <>
              <UploadCloud className="size-5 text-turquoise" />
              <span className="text-[11px] font-medium text-zinc-300">
                Click to upload or Drag &amp; Drop
              </span>
              <span className="text-[10px] text-zinc-500">
                or paste (Ctrl+V) · PNG, JPG, WEBP
              </span>
            </>
          )}
        </div>
      )}

      <input
        type="text"
        value={value.label}
        onChange={(e) => onChange({ ...value, label: e.target.value })}
        placeholder="Option Title / Hook"
        className={`${modalInputCls} mt-2.5`}
      />
    </div>
  )
}

export default function CreatorStudio() {
  const { hookTests } = useData()
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)

  // Created tests live at the top of the list so a freshly published test is
  // visible immediately; the static demo hooks follow.
  const allHooks = [...hookTests, ...myHooks]
  const filtered =
    filter === 'all' ? allHooks : allHooks.filter((h) => h.status === filter)

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
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-turquoise px-4 py-2.5 text-sm font-semibold text-black shadow-lg shadow-turquoise/25 transition-all hover:brightness-110 active:scale-[0.98]"
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
                  {hook.options?.some((o) => o.image_url) && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      {hook.options.map((o) => (
                        <HookThumb key={o.id} src={o.image_url} alt={o.label} />
                      ))}
                    </div>
                  )}
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

      {showModal && <NewHookTestModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
