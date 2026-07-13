import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../context/auth-context'

// Google's multicolor "G" — lucide-react ships no brand logos.
function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}

/** Self-contained auth panel: signed-in summary + sign out, or a signup/signin form. */
export default function AuthPanel() {
  const { user, loading, signUp, signIn, signInWithGoogle, signOut } = useAuth()

  const [mode, setMode] = useState('signup') // 'signup' | 'signin'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (mode === 'signup') {
        const { session } = await signUp({ email, password })
        setNotice(session ? 'Account created!' : 'Check your email to confirm your account.')
      } else {
        await signIn({ email, password })
      }
    } catch (err) {
      setError(err?.message ?? 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const googleSignIn = async () => {
    setError(null)
    setBusy(true)
    try {
      // Redirects to Google; the page returns signed in.
      await signInWithGoogle()
    } catch (err) {
      setError(err?.message ?? 'Google sign-in failed.')
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-white/10 al-glass p-5 text-sm text-zinc-500">
        Loading…
      </div>
    )
  }

  if (user) {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-white/10 al-glass p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-semibold text-zinc-100">{user.email}</p>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-100"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm rounded-2xl border border-white/10 al-glass p-5"
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

      {/* Google OAuth */}
      <button
        type="button"
        onClick={googleSignIn}
        disabled={busy}
        className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-lg border border-white/15 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-800 transition-all hover:bg-zinc-100 disabled:opacity-50"
      >
        <GoogleIcon className="size-4" />
        Continue with Google
      </button>

      {/* divider */}
      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-600">
          or
        </span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <div className="space-y-3">
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
