import { useState } from 'react'
import { Plus, Radio, Rocket, Trash2, X } from 'lucide-react'
import { useData } from '../../context/data-context'

// Dynamic option count, matching the convention already established in
// CreatorStudio.jsx's NewHookTestModal (2 minimum, 4 maximum).
const MIN_OPTIONS = 2
const MAX_OPTIONS = 4
const OPTION_LETTERS = ['A', 'B', 'C', 'D']
const emptyOption = () => ({ label: '' })

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

// Simple text-only option row — no image upload here. Images are already
// attachable to the *active* poll's options via ProfileSettings' existing
// "Visual poll images" section, so this creation modal stays lightweight
// rather than duplicating that upload flow.
function OptionRow({ letter, value, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-turquoise/15 text-xs font-bold text-turquoise">
        {letter}
      </span>
      <input
        type="text"
        value={value.label}
        onChange={(e) => onChange({ ...value, label: e.target.value })}
        placeholder={`Option ${letter}`}
        className={modalInputCls}
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-rose-400/10 hover:text-rose-400"
          title={`Remove option ${letter}`}
          aria-label={`Remove option ${letter}`}
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  )
}

// Create a new poll (question + 2-4 text options), with an optional
// "make it live now" step. Mirrors the al-modal-in/al-modal-aura chrome
// already used by CreatorStudio.jsx's NewHookTestModal.
export default function NewPollModal({ onClose }) {
  const { createPoll, setActivePoll, toast } = useData()
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(() => [emptyOption(), emptyOption()])
  const [makeLive, setMakeLive] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const setOption = (i, next) => {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? next : o)))
  }
  const addOption = () => {
    setOptions((prev) => (prev.length >= MAX_OPTIONS ? prev : [...prev, emptyOption()]))
  }
  const removeOption = (i) => {
    setOptions((prev) => (prev.length <= MIN_OPTIONS ? prev : prev.filter((_, idx) => idx !== i)))
  }

  const filledOptions = options.filter((o) => o.label.trim())
  const canPublish = question.trim() && filledOptions.length >= MIN_OPTIONS
  const canRemove = options.length > MIN_OPTIONS
  const canAdd = options.length < MAX_OPTIONS

  const submit = async (e) => {
    e.preventDefault()
    if (!canPublish) return
    setBusy(true)
    setError(null)
    try {
      const poll = await createPoll({ question, options: filledOptions })
      if (makeLive) setActivePoll(poll.id)
      toast(
        makeLive
          ? 'Your new poll is live on your public page.'
          : 'Poll created — make it live from Public Profile whenever you’re ready.',
        { title: 'Poll created' },
      )
      onClose()
    } catch (err) {
      setError(err?.message ?? 'Could not create the poll.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="al-modal-backdrop absolute inset-0" onClick={onClose} aria-hidden="true" />
      <form
        onSubmit={submit}
        className="al-modal-in al-modal-aura relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-turquoise/20 bg-zinc-950 p-6"
      >
        <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-turquoise/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-turquoise/10 ring-1 ring-turquoise/25"
              style={{ boxShadow: '0 0 22px -8px var(--al-tq)' }}
            >
              <Radio className="size-4 text-turquoise" />
            </span>
            <h3
              className="text-lg font-bold tracking-tight text-turquoise"
              style={{ textShadow: '0 0 18px rgba(52,224,161,0.55)' }}
            >
              Create New Poll
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

        <div className="relative mt-5 space-y-4">
          <ModalField label="Poll question">
            <input
              type="text"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Which thumbnail is better?"
              className={modalInputCls}
            />
          </ModalField>

          <div>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Options
            </span>
            <div className="space-y-2">
              {options.map((option, i) => (
                <OptionRow
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
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-turquoise/40 bg-turquoise/[0.06] px-4 py-2 text-sm font-semibold text-turquoise transition-colors hover:bg-turquoise/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="size-4" />
              {canAdd ? 'Add option' : 'Maximum of 4 options'}
            </button>
          </div>

          <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={makeLive}
              onChange={(e) => setMakeLive(e.target.checked)}
              className="size-4 rounded border-white/20 bg-white/5 accent-turquoise"
            />
            Make this my live poll (shown on your public page)
          </label>
        </div>

        {error && <p className="relative mt-3 text-xs text-rose-400">{error}</p>}

        <div className="relative mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:text-zinc-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canPublish || busy}
            className="inline-flex items-center gap-2 rounded-xl bg-turquoise px-5 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ boxShadow: '0 0 24px -4px color-mix(in oklab, var(--al-tq) 67%, transparent)' }}
          >
            <Rocket className="size-4" /> {busy ? 'Creating…' : 'Create poll'}
          </button>
        </div>
      </form>
    </div>
  )
}
