import { useEffect, useState } from 'react'
import { Check, KeyRound, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { supabase } from '../../lib/supabaseClient'

// Standalone, chrome-free page for the "set a new password" step of the
// forgot-password flow (mirrors PublicProfile.jsx's standalone pattern).
// Supabase can deliver the recovery session two different ways depending on
// the project's configured auth flow — a hash fragment
// (#access_token=...&type=recovery, picked up automatically by the client's
// detectSessionInUrl and surfaced as AuthProvider's PASSWORD_RECOVERY event)
// or a PKCE `?code=` query param (which needs an explicit exchange call).
// This page handles both rather than assuming one.
export default function ResetPasswordPage() {
  const { recoveryMode, completePasswordReset } = useAuth()
  // Only a `?code=` link needs the async exchange step — a hash-based
  // recovery link is already handled by AuthProvider before this component
  // ever mounts, so start "not exchanging" for that case (avoids a
  // setState-at-effect-start just to flip it back off on the next tick).
  const [exchanging, setExchanging] = useState(
    () => new URLSearchParams(window.location.search).has('code'),
  )
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) return
    supabase.auth
      .exchangeCodeForSession(window.location.href)
      .catch(() => {
        /* fall through to the invalid-link state below if this fails too */
      })
      .finally(() => setExchanging(false))
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords don’t match.')
      return
    }
    setBusy(true)
    try {
      await completePasswordReset({ password })
      setDone(true)
      setTimeout(() => {
        window.location.href = '/'
      }, 1500)
    } catch (err) {
      setError(err?.message ?? 'Could not update your password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-transparent px-5 text-zinc-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-32 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-turquoise/15 blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 al-glass p-6">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-turquoise/10 ring-1 ring-turquoise/25">
            <KeyRound className="size-4 text-turquoise" />
          </span>
          <h1 className="text-lg font-bold text-zinc-50">Set a new password</h1>
        </div>

        {exchanging ? (
          <div className="mt-6 flex items-center justify-center gap-2 py-6 text-sm text-zinc-500">
            <Loader2 className="size-4 animate-spin text-turquoise" /> Verifying your link…
          </div>
        ) : done ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-4 text-center">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-turquoise/15 text-turquoise">
              <Check className="size-5" />
            </span>
            <p className="text-sm font-semibold text-zinc-100">Password updated</p>
            <p className="text-xs text-zinc-500">Taking you back to AudienceLab…</p>
          </div>
        ) : !recoveryMode && !new URLSearchParams(window.location.search).get('code') ? (
          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-300">
              This link is invalid or has expired.
            </p>
            <a
              href="/"
              className="mt-4 inline-block text-sm font-semibold text-turquoise hover:underline"
            >
              Back to sign in
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <input
              type="password"
              required
              minLength={6}
              placeholder="New password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-turquoise/40 focus:outline-none"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-turquoise/40 focus:outline-none"
            />
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-turquoise px-3 py-2.5 text-sm font-semibold text-black transition-all hover:brightness-110 disabled:opacity-50"
              style={{ boxShadow: '0 0 18px -4px #34e0a188' }}
            >
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
