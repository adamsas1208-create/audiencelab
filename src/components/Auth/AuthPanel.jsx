import { useState } from 'react'
import { Check, Coins, Copy, Gift, LogOut } from 'lucide-react'
import { useAuth } from '../../context/auth-context'

/**
 * Self-contained auth + credits + referral panel. Drop <AuthPanel /> anywhere
 * inside <AuthProvider>. Demonstrates the full referral flow:
 *  - shows the pending ?ref= bonus to a signing-up visitor
 *  - signs the user up (passing the ref to the backend trigger)
 *  - shows the signed-in user's credits and shareable referral link
 */
export default function AuthPanel() {
  const { user, profile, loading, pendingRef, referralLink, signUp, signIn, signOut } =
    useAuth()

  const [mode, setMode] = useState('signup') // 'signup' | 'signin'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [copied, setCopied] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (mode === 'signup') {
        const { session } = await signUp({ email, password })
        setNotice(
          session
            ? 'Account created — your credits are ready!'
            : 'Check your email to confirm your account.',
        )
      } else {
        await signIn({ email, password })
      }
    } catch (err) {
      setError(err?.message ?? 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const copyLink = async () => {
    if (!referralLink) return
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (loading) {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950/60 p-5 text-sm text-zinc-500">
        Loading…
      </div>
    )
  }

  // Signed in: credits + referral link.
  if (user) {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-100">
              {user.email}
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-turquoise">
              <Coins className="size-4" />
              {profile?.credits ?? '—'} credits
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-100"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>

        {referralLink && (
          <div className="mt-4">
            <p className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              <Gift className="size-3.5 text-turquoise" /> Invite & earn 100 credits
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={referralLink}
                className="w-full truncate rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-zinc-300"
              />
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-turquoise px-3 py-2 text-xs font-semibold text-black transition-all hover:brightness-110"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Signed out: signup / signin form.
  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950/60 p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-50">
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h3>
        <button
          type="button"
          onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
          className="text-xs font-medium text-turquoise hover:underline"
        >
          {mode === 'signup' ? 'Have an account?' : 'Need an account?'}
        </button>
      </div>

      {mode === 'signup' && pendingRef && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-turquoise/25 bg-turquoise/10 px-2.5 py-1.5 text-xs font-medium text-turquoise">
          <Gift className="size-3.5" />
          Referred by {pendingRef} — you'll get 200 credits!
        </p>
      )}

      <div className="mt-4 space-y-3">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-turquoise/40 focus:outline-none"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-turquoise/40 focus:outline-none"
        />
      </div>

      {error && <p className="mt-3 text-xs text-rose-400">{error}</p>}
      {notice && <p className="mt-3 text-xs text-turquoise">{notice}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-lg bg-turquoise px-3 py-2.5 text-sm font-semibold text-black transition-all hover:brightness-110 disabled:opacity-50"
        style={{ boxShadow: '0 0 18px -4px #34e0a188' }}
      >
        {busy ? 'Please wait…' : mode === 'signup' ? 'Sign up' : 'Sign in'}
      </button>
    </form>
  )
}
