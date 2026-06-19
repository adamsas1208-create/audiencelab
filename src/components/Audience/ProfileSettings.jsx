import { useEffect, useState } from 'react'
import {
  AtSign,
  BadgeCheck,
  Check,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Loader2,
  Lock,
  Play,
  Save,
  User,
} from 'lucide-react'
import { fetchMyPublicProfile, saveMyPublicProfile } from '../../lib/profiles'

const EMPTY = {
  handle: '',
  display_name: '',
  bio: '',
  avatar_url: '',
  featured_video_url: '',
  is_public: false,
}

// Where the live profile lives. Uses the current origin so it works in dev,
// preview, and production without hardcoding the domain.
function liveUrl(handle) {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://audiencelab.ai'
  return `${origin}/p/${handle}`
}

function Field({ icon: Icon, label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zinc-200">
        {Icon && <Icon className="size-4 text-turquoise" />}
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  )
}

const inputCls =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-turquoise/40 focus:outline-none'

export default function ProfileSettings() {
  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const data = await fetchMyPublicProfile()
        if (!active) return
        setForm({ ...EMPTY, ...Object.fromEntries(
          Object.entries(data ?? {}).map(([k, v]) => [k, v ?? (k === 'is_public' ? false : '')]),
        ) })
        setStatus('ready')
      } catch (e) {
        if (!active) return
        setError(e?.message ?? 'Could not load your profile.')
        setStatus('error')
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const set = (key) => (e) => {
    const value = e?.target?.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const updated = await saveMyPublicProfile(form)
      setForm({ ...EMPTY, ...Object.fromEntries(
        Object.entries(updated ?? {}).map(([k, v]) => [k, v ?? (k === 'is_public' ? false : '')]),
      ) })
      setSaved(true)
    } catch (err) {
      setSaveError(err?.message ?? 'Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return (
      <p className="rounded-2xl border border-white/10 bg-zinc-950/60 p-8 text-center text-sm text-zinc-500">
        Loading your profile…
      </p>
    )
  }

  if (status === 'error') {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-sm text-rose-300">
        <p className="font-medium">Couldn’t load your public profile.</p>
        <p className="mt-1 text-rose-300/80">{error}</p>
        <p className="mt-3 text-xs text-rose-300/60">
          If this persists, the public-profile database migration
          (<code>0006_creator_public_profiles.sql</code>) may not be applied yet.
        </p>
      </div>
    )
  }

  const canViewLive = form.is_public && form.handle

  return (
    <div>
      <div className="flex items-start gap-3">
        <span
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-turquoise/10 ring-1 ring-turquoise/25"
          style={{ boxShadow: '0 0 22px -8px #34e0a1' }}
        >
          <Globe
            className="size-5 text-turquoise"
            style={{ filter: 'drop-shadow(0 0 6px #34e0a1)' }}
          />
        </span>
        <div>
          <h3 className="text-lg font-bold tracking-tight text-zinc-50">
            Public Profile & Link Hub
          </h3>
          <p className="mt-0.5 text-sm text-zinc-500">
            A gorgeous public page your followers reach from your bio link.
          </p>
        </div>
      </div>

      <form
        onSubmit={save}
        className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      >
        {/* Left: identity */}
        <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <Field icon={AtSign} label="Handle" hint="Your public URL: /p/your-handle">
            <input
              type="text"
              value={form.handle}
              onChange={set('handle')}
              placeholder="maya-creates"
              className={inputCls}
            />
          </Field>
          <Field icon={User} label="Display name">
            <input
              type="text"
              value={form.display_name}
              onChange={set('display_name')}
              placeholder="Maya Levin"
              className={inputCls}
            />
          </Field>
          <Field icon={ImageIcon} label="Profile picture URL">
            <input
              type="url"
              value={form.avatar_url}
              onChange={set('avatar_url')}
              placeholder="https://…/avatar.jpg"
              className={inputCls}
            />
          </Field>
        </div>

        {/* Right: content */}
        <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <Field icon={User} label="Bio">
            <textarea
              value={form.bio}
              onChange={set('bio')}
              rows={3}
              placeholder="Short, punchy intro your followers will read."
              className={`${inputCls} resize-none`}
            />
          </Field>
          <Field
            icon={Play}
            label="Featured Video / Channel Link"
            hint="YouTube, TikTok, or any URL — the big button on your page."
          >
            <input
              type="url"
              value={form.featured_video_url}
              onChange={set('featured_video_url')}
              placeholder="https://youtube.com/@you"
              className={inputCls}
            />
          </Field>

          {/* Make public toggle */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="flex items-center gap-2">
              {form.is_public ? (
                <BadgeCheck className="size-4 text-turquoise" />
              ) : (
                <Lock className="size-4 text-zinc-500" />
              )}
              <div>
                <p className="text-sm font-medium text-zinc-200">
                  Make profile public
                </p>
                <p className="text-xs text-zinc-500">
                  {form.is_public ? 'Live and reachable by anyone.' : 'Hidden from the public.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.is_public}
              onClick={() => set('is_public')({ target: { type: 'checkbox', checked: !form.is_public } })}
              className={[
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                form.is_public ? 'bg-turquoise' : 'bg-white/10',
              ].join(' ')}
              style={form.is_public ? { boxShadow: '0 0 16px -2px #34e0a1' } : undefined}
            >
              <span
                className={[
                  'inline-block size-5 transform rounded-full bg-white transition-transform',
                  form.is_public ? 'translate-x-5' : 'translate-x-0.5',
                ].join(' ')}
              />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="lg:col-span-2">
          {saveError && (
            <p className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-2.5 text-sm text-rose-300">
              {saveError}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-turquoise px-5 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110 disabled:opacity-60"
              style={{ boxShadow: '0 0 22px -4px #34e0a1aa' }}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saving…
                </>
              ) : saved ? (
                <>
                  <Check className="size-4" /> Saved
                </>
              ) : (
                <>
                  <Save className="size-4" /> Save profile
                </>
              )}
            </button>

            <a
              href={canViewLive ? liveUrl(form.handle) : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!canViewLive}
              onClick={(e) => {
                if (!canViewLive) e.preventDefault()
              }}
              className={[
                'inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors',
                canViewLive
                  ? 'border-turquoise/30 bg-turquoise/10 text-turquoise hover:bg-turquoise/15'
                  : 'cursor-not-allowed border-white/10 bg-white/5 text-zinc-600',
              ].join(' ')}
              title={canViewLive ? 'Open your live profile' : 'Save a handle and make it public first'}
            >
              <ExternalLink className="size-4" /> View Live Profile
            </a>

            {form.handle && (
              <span className="text-xs text-zinc-500">
                {liveUrl(form.handle).replace(/^https?:\/\//, '')}
              </span>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
