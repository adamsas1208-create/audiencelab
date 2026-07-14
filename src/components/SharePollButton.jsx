import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'
import { useData } from '../context/data-context'
import { sharePoll } from '../lib/share'

// A single "Share poll" button. Opens the OS share sheet (mobile) so the
// creator can send the public poll link straight to people; falls back to
// copying the link on desktop. The link points at /p/<handle>, where anyone
// can vote without opening the full app.
//
// Disabled with a guiding tooltip until the profile is public and has a handle
// (otherwise the link would land on a "Profile not found" page).
export default function SharePollButton({ className = '', label = 'Share poll' }) {
  const { profile, polls, toast } = useData()
  const [justCopied, setJustCopied] = useState(false)

  const canShare = profile.is_public && !!profile.handle
  const activePoll = polls.find((p) => p.active) ?? polls[0] ?? null

  const onShare = async () => {
    if (!canShare) return
    const result = await sharePoll({
      handle: profile.handle,
      question: activePoll?.question,
      toast,
    })
    // Give the copy-fallback a brief visual confirmation on the button itself.
    if (result === 'copied') {
      setJustCopied(true)
      setTimeout(() => setJustCopied(false), 1600)
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      disabled={!canShare}
      title={
        canShare
          ? 'Send your live poll to people — they can vote without the app'
          : 'Make your profile public and add a handle first'
      }
      className={[
        'inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors',
        canShare
          ? 'border-turquoise/30 bg-turquoise/10 text-turquoise hover:bg-turquoise/15'
          : 'cursor-not-allowed border-white/10 bg-white/5 text-zinc-600',
        className,
      ].join(' ')}
      style={canShare ? { boxShadow: '0 0 22px -8px #34e0a1' } : undefined}
    >
      {justCopied ? (
        <>
          <Check className="size-4" /> Link copied
        </>
      ) : (
        <>
          <Share2 className="size-4" /> {label}
        </>
      )}
    </button>
  )
}
