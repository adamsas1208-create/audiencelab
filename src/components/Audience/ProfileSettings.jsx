import { useState } from 'react'
import {
  AtSign,
  BadgeCheck,
  Check,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Lock,
  Play,
  Radio,
  Trash2,
  User,
} from 'lucide-react'
import { useData } from '../../context/data-context'

// Quick-select imagery so creators can spin up a visual poll instantly without
// hunting for URLs. Real, high-quality stock shots keyed to common content types.
const IMAGE_PRESETS = [
  {
    label: 'Gaming Thumbnail',
    url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=640&q=80&auto=format&fit=crop',
  },
  {
    label: 'Vlog Thumbnail',
    url: 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=640&q=80&auto=format&fit=crop',
  },
  {
    label: 'Tech Setup',
    url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=640&q=80&auto=format&fit=crop',
  },
]

// A, B, C… so each option reads like the familiar "Option A / Option B" poll.
const OPTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

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

// One option's image controls: a live preview, a URL field, quick presets, and
// a clear button. The image_url is optional — text-only options still work.
function OptionImageField({ letter, option, onChange }) {
  const [broken, setBroken] = useState(false)
  const url = option.image_url || ''
  const showPreview = url && !broken

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-6 items-center justify-center rounded-md bg-turquoise/15 text-xs font-bold text-turquoise">
          {letter}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-200">
          {option.label}
        </span>
      </div>

      {/* Preview / empty drop-zone */}
      <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black/40">
        {showPreview ? (
          <img
            src={url}
            alt={option.label}
            className="size-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 text-zinc-600">
            <ImageIcon className="size-5" />
            <span className="text-[11px]">{broken ? 'Image failed to load' : 'No image'}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setBroken(false)
            onChange(e.target.value)
          }}
          placeholder="https://…/option.jpg"
          className={inputCls}
        />
        {url && (
          <button
            type="button"
            onClick={() => {
              setBroken(false)
              onChange('')
            }}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:border-rose-400/40 hover:text-rose-400"
            title="Remove image"
            aria-label={`Remove image from option ${letter}`}
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      {/* Quick-select presets for fast testing with real imagery */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {IMAGE_PRESETS.map((preset) => {
          const selected = url === preset.url
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setBroken(false)
                onChange(preset.url)
              }}
              aria-pressed={selected}
              className={[
                'rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                selected
                  ? 'border-turquoise/50 bg-turquoise/15 text-turquoise'
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:border-turquoise/30 hover:text-zinc-100',
              ].join(' ')}
            >
              {preset.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function ProfileSettings() {
  // Edits write straight to the shared store, so the Public Profile view
  // (and any open /p/<handle> tab) updates instantly.
  const { profile, updateProfile, polls, setActivePoll, updatePollOption, toast } =
    useData()

  const activePoll = polls.find((p) => p.active) ?? null

  const set = (key) => (e) => updateProfile({ [key]: e.target.value })
  const togglePublic = () => updateProfile({ is_public: !profile.is_public })

  const choosePoll = (pollId) => {
    setActivePoll(pollId)
    toast('Your public page now shows this poll.', { title: 'Live poll updated' })
  }

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

        {/* Active live poll picker — drives the vote widget on the public page */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
            <div className="flex items-center gap-2">
              <Radio className="size-4 text-turquoise" />
              <h4 className="text-sm font-bold text-zinc-50">Live poll on your page</h4>
            </div>
            <p className="mt-0.5 text-sm text-zinc-500">
              Pick which poll your followers vote on. Switches instantly — votes
              feed your Poll Analytics dashboard.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {polls.map((poll) => {
                const total = poll.options.reduce((s, o) => s + (o.votes || 0), 0)
                const isActive = !!poll.active
                return (
                  <button
                    key={poll.id}
                    type="button"
                    onClick={() => choosePoll(poll.id)}
                    aria-pressed={isActive}
                    className={[
                      'rounded-xl border px-4 py-3 text-left transition-colors',
                      isActive
                        ? 'border-turquoise/50 bg-turquoise/10'
                        : 'border-white/10 bg-white/[0.03] hover:border-turquoise/30',
                    ].join(' ')}
                    style={isActive ? { boxShadow: '0 0 18px -6px #34e0a1' } : undefined}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-zinc-100">
                        {poll.question}
                      </span>
                      {isActive && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-turquoise">
                          <span className="size-1.5 animate-pulse rounded-full bg-turquoise" />
                          Live
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {poll.options.length} options · {total.toLocaleString()} votes
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Visual Image Polls — attach imagery to the live poll's options */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
            <div className="flex items-center gap-2">
              <ImageIcon className="size-4 text-turquoise" />
              <h4 className="text-sm font-bold text-zinc-50">Visual poll images</h4>
            </div>
            <p className="mt-0.5 text-sm text-zinc-500">
              Add an image to each option to let followers vote on thumbnails,
              merch, or video ideas. Pictures show on your public page instantly.
            </p>

            {!activePoll ? (
              <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-500">
                Pick a live poll above to add images to its options.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-turquoise/80">
                  {activePoll.question}
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {activePoll.options.map((option, i) => (
                    <OptionImageField
                      key={option.id}
                      letter={OPTION_LETTERS[i] ?? i + 1}
                      option={option}
                      onChange={(image_url) =>
                        updatePollOption({
                          pollId: activePoll.id,
                          optionId: option.id,
                          patch: { image_url },
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            )}
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
