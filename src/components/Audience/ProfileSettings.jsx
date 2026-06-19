import {
  AtSign,
  BadgeCheck,
  Check,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Lock,
  Play,
  User,
} from 'lucide-react'
import { useData } from '../../context/data-context'

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
  // Edits write straight to the shared store, so the Public Profile view
  // (and any open /p/<handle> tab) updates instantly.
  const { profile, updateProfile, toast } = useData()

  const set = (key) => (e) => updateProfile({ [key]: e.target.value })
  const togglePublic = () => updateProfile({ is_public: !profile.is_public })

  const canViewLive = profile.is_public && profile.handle

  const save = () => {
    if (profile.is_public && !profile.handle.trim()) {
      toast('Add a handle so followers can reach your page.', {
        title: 'Handle needed',
      })
      return
    }
    // Persistence is automatic (store → localStorage); this just confirms it.
    toast('Your public profile is up to date.', { title: 'Profile saved' })
  }

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
            Edits sync to your live page instantly as you type.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Left: identity */}
        <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
          <Field icon={AtSign} label="Handle" hint="Your public URL: /p/your-handle">
            <input
              type="text"
              value={profile.handle}
              onChange={set('handle')}
              placeholder="maya-creates"
              className={inputCls}
            />
          </Field>
          <Field icon={User} label="Display name">
            <input
              type="text"
              value={profile.display_name}
              onChange={set('display_name')}
              placeholder="Maya Levin"
              className={inputCls}
            />
          </Field>
          <Field icon={ImageIcon} label="Profile picture URL">
            <input
              type="url"
              value={profile.avatar_url}
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
              value={profile.bio}
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
              value={profile.featured_video_url}
              onChange={set('featured_video_url')}
              placeholder="https://youtube.com/@you"
              className={inputCls}
            />
          </Field>

          {/* Make public toggle */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="flex items-center gap-2">
              {profile.is_public ? (
                <BadgeCheck className="size-4 text-turquoise" />
              ) : (
                <Lock className="size-4 text-zinc-500" />
              )}
              <div>
                <p className="text-sm font-medium text-zinc-200">
                  Make profile public
                </p>
                <p className="text-xs text-zinc-500">
                  {profile.is_public
                    ? 'Live and reachable by anyone.'
                    : 'Hidden from the public.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={profile.is_public}
              onClick={togglePublic}
              className={[
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                profile.is_public ? 'bg-turquoise' : 'bg-white/10',
              ].join(' ')}
              style={profile.is_public ? { boxShadow: '0 0 16px -2px #34e0a1' } : undefined}
            >
              <span
                className={[
                  'inline-block size-5 transform rounded-full bg-white transition-transform',
                  profile.is_public ? 'translate-x-5' : 'translate-x-0.5',
                ].join(' ')}
              />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={save}
              className="inline-flex items-center gap-2 rounded-xl bg-turquoise px-5 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110"
              style={{ boxShadow: '0 0 22px -4px #34e0a1aa' }}
            >
              <Check className="size-4" /> Save profile
            </button>

            <a
              href={canViewLive ? liveUrl(profile.handle) : undefined}
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
              title={
                canViewLive
                  ? 'Open your live profile'
                  : 'Add a handle and make it public first'
              }
            >
              <ExternalLink className="size-4" /> View Live Profile
            </a>

            {profile.handle && (
              <span className="text-xs text-zinc-500">
                {liveUrl(profile.handle).replace(/^https?:\/\//, '')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
