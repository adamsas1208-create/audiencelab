import { useState } from 'react'
import { ImageIcon, Loader2, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../context/auth-context'
import AuthPanel from '../components/Auth/AuthPanel'
import { createSubmission } from '../lib/submissions'
import { navigate } from '../lib/router'

const MAX_OPTIONS = 4
const MIN_OPTIONS = 2
const OPTION_LETTERS = 'ABCD'

function emptyOption() {
  return { label: '', imageFile: null, previewUrl: '' }
}

const inputCls =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-turquoise/40 focus:outline-none'

function OptionRow({ letter, option, onChange, onRemove, canRemove }) {
  const pickImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    onChange({ ...option, imageFile: file, previewUrl: URL.createObjectURL(file) })
  }
  const clearImage = () => onChange({ ...option, imageFile: null, previewUrl: '' })

  return (
    <div className="al-glass rounded-2xl border border-white/10 p-4">
      <div className="flex items-center justify-between">
        <span className="inline-flex size-6 items-center justify-center rounded-md bg-turquoise/15 text-xs font-bold text-turquoise">
          {letter}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex size-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-rose-400"
            aria-label={`Remove option ${letter}`}
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      <input
        type="text"
        value={option.label}
        onChange={(e) => onChange({ ...option, label: e.target.value })}
        placeholder="Option text (optional if you add an image)"
        className={`${inputCls} mt-3`}
      />

      {option.previewUrl ? (
        <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black/40">
          <img src={option.previewUrl} alt="" className="size-full object-cover" />
          <button
            type="button"
            onClick={clearImage}
            className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-lg bg-black/70 text-zinc-300 backdrop-blur transition-colors hover:text-rose-400"
            aria-label="Remove image"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ) : (
        <label className="mt-3 flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 bg-white/[0.02] text-zinc-600 transition-colors hover:border-turquoise/30 hover:text-zinc-400">
          <ImageIcon className="size-5" />
          <span className="text-xs">Add an image</span>
          <input type="file" accept="image/*" onChange={pickImage} className="hidden" />
        </label>
      )}
    </div>
  )
}

export default function NewSubmission() {
  const { user, loading } = useAuth()
  const [prompt, setPrompt] = useState('')
  const [options, setOptions] = useState([emptyOption(), emptyOption()])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (!loading && !user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center pt-10 text-center">
        <span
          className="inline-flex size-12 items-center justify-center rounded-2xl bg-turquoise/10 ring-1 ring-turquoise/25"
          style={{ boxShadow: '0 0 22px -8px var(--al-tq)' }}
        >
          <Plus className="size-6 text-turquoise" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-zinc-50">Post an idea</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Sign in so you can see the results of what you post.
        </p>
        <div className="mt-6 w-full">
          <AuthPanel />
        </div>
      </div>
    )
  }

  const setOption = (i, next) => {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? next : o)))
  }
  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return
    setOptions((prev) => [...prev, emptyOption()])
  }
  const removeOption = (i) => {
    if (options.length <= MIN_OPTIONS) return
    setOptions((prev) => prev.filter((_, idx) => idx !== i))
  }

  const filledCount = options.filter((o) => o.label.trim() || o.imageFile).length
  const canPublish = prompt.trim() && filledCount >= MIN_OPTIONS && !busy

  const submit = async (e) => {
    e.preventDefault()
    if (!canPublish) return
    setBusy(true)
    setError(null)
    try {
      const created = await createSubmission({ prompt, options })
      navigate(`/s/${created.id}`)
    } catch (err) {
      setError(err?.message ?? 'Could not publish — try again.')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-2">
        <Plus className="size-5 text-turquoise" />
        <h1 className="al-display text-3xl text-zinc-50 sm:text-4xl">Post an idea</h1>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        Two or more options — text, an image, or both. The community votes.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Your question
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            placeholder="Which thumbnail should I use? Which name is better?"
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {options.map((o, i) => (
            <OptionRow
              key={i}
              letter={OPTION_LETTERS[i]}
              option={o}
              onChange={(next) => setOption(i, next)}
              onRemove={() => removeOption(i)}
              canRemove={options.length > MIN_OPTIONS}
            />
          ))}
        </div>

        {options.length < MAX_OPTIONS && (
          <button
            type="button"
            onClick={addOption}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-100"
          >
            <Plus className="size-3.5" /> Add option
          </button>
        )}

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={!canPublish}
          className="inline-flex items-center gap-2 rounded-xl bg-turquoise px-5 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ boxShadow: '0 0 22px -4px color-mix(in oklab, var(--al-tq) 67%, transparent)' }}
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Publishing…
            </>
          ) : (
            'Publish'
          )}
        </button>
      </form>
    </div>
  )
}
