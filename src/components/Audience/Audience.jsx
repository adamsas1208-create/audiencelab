import { useEffect, useState } from 'react'
import { Mail, Plus, RefreshCw, UserPlus, Users, X } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { addContact, fetchMyAudience } from '../../lib/contacts'
import AuthPanel from '../Auth/AuthPanel'

const PLATFORMS = ['TikTok', 'YouTube', 'Instagram', 'X', 'LinkedIn', 'Other']
const PLATFORM_COLOR = {
  TikTok: '#34e0a1',
  YouTube: '#ef4444',
  Instagram: '#e879f9',
  X: '#94a3b8',
  LinkedIn: '#3b82f6',
  Other: '#a1a1aa',
}

function PlatformBadge({ platform }) {
  const color = PLATFORM_COLOR[platform] ?? PLATFORM_COLOR.Other
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300"
      style={{ boxShadow: `inset 0 0 0 1px ${color}33` }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {platform || '—'}
    </span>
  )
}

function AddContactModal({ onClose, onAdded }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [platform, setPlatform] = useState(PLATFORMS[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const created = await addContact({
        full_name: fullName.trim(),
        email: email.trim(),
        platform,
      })
      onAdded(created)
      onClose()
    } catch (err) {
      setError(err?.message ?? 'Could not add contact.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="inline-flex items-center gap-2 text-base font-semibold text-zinc-50">
            <UserPlus className="size-4 text-turquoise" /> Add contact
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <Field label="Full name">
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Maya Levin"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-turquoise/40 focus:outline-none"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maya@example.com"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-turquoise/40 focus:outline-none"
            />
          </Field>
          <Field label="Platform">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 focus:border-turquoise/40 focus:outline-none"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p} className="bg-zinc-900">
                  {p}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {error && <p className="mt-3 text-xs text-rose-400">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-zinc-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-black transition-all hover:brightness-110 disabled:opacity-50"
            style={{ boxShadow: '0 0 18px -4px #34e0a188' }}
          >
            {busy ? 'Adding…' : 'Add contact'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  )
}

export default function Audience() {
  const { user, loading: authLoading } = useAuth()
  const [contacts, setContacts] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (!user) return undefined
    let active = true

    const run = async () => {
      try {
        const data = await fetchMyAudience()
        if (!active) return
        setContacts(data)
        setStatus('ready')
      } catch (e) {
        if (!active) return
        setError(e?.message ?? 'Failed to load your audience.')
        setStatus('error')
      }
    }
    run()

    return () => {
      active = false
    }
  }, [user, reloadKey])

  // Signed out — prompt to authenticate (contacts are per-user).
  if (!authLoading && !user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center pt-10 text-center">
        <span
          className="inline-flex size-12 items-center justify-center rounded-2xl bg-turquoise/10 ring-1 ring-turquoise/25"
          style={{ boxShadow: '0 0 22px -8px #34e0a1' }}
        >
          <Users className="size-6 text-turquoise" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-zinc-50">Your Audience</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Sign in to view and manage your contacts.
        </p>
        <div className="mt-6 w-full">
          <AuthPanel />
        </div>
      </div>
    )
  }

  const refresh = () => {
    setStatus('loading')
    setReloadKey((k) => k + 1)
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-turquoise/25 bg-turquoise/10 px-2.5 py-1 text-[11px] font-semibold text-turquoise">
            <Users className="size-3" />
            Audience
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-50">
            Your contacts
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {status === 'ready'
              ? `${contacts.length} contact${contacts.length === 1 ? '' : 's'} in your audience.`
              : 'Manage the people in your audience.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:text-zinc-100"
            title="Refresh"
          >
            <RefreshCw className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-turquoise px-4 py-2 text-sm font-semibold text-black transition-all hover:brightness-110"
            style={{ boxShadow: '0 0 18px -4px #34e0a188' }}
          >
            <Plus className="size-4" /> Add contact
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="mt-7">
        {status === 'loading' && (
          <p className="rounded-2xl border border-white/10 bg-zinc-950/60 p-8 text-center text-sm text-zinc-500">
            Loading your audience…
          </p>
        )}

        {status === 'error' && (
          <p className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center text-sm text-rose-400">
            {error}
          </p>
        )}

        {status === 'ready' && contacts.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-10 text-center">
            <span className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-white/5">
              <UserPlus className="size-6 text-zinc-500" />
            </span>
            <p className="mt-4 text-sm font-medium text-zinc-300">
              No contacts yet
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Add your first contact to start building your audience.
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-turquoise px-4 py-2 text-sm font-semibold text-black transition-all hover:brightness-110"
            >
              <Plus className="size-4" /> Add contact
            </button>
          </div>
        )}

        {status === 'ready' && contacts.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Platform</th>
                  <th className="px-5 py-3 text-right font-semibold">Added</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-white/[0.06] transition-colors last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3.5 font-medium text-zinc-100">
                      {c.full_name || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="size-3.5 text-zinc-600" />
                        {c.email || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <PlatformBadge platform={c.platform} />
                    </td>
                    <td className="px-5 py-3.5 text-right text-zinc-500">
                      {c.created_at
                        ? new Date(c.created_at).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <AddContactModal
          onClose={() => setShowForm(false)}
          onAdded={(created) => setContacts((prev) => [created, ...prev])}
        />
      )}
    </div>
  )
}
