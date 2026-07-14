import { useState } from 'react'
import { Coins } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import AuthPanel from './AuthPanel'

/**
 * Compact top-bar auth control. Shows a "Sign in" button when signed out, or
 * the user's avatar + credits when signed in; either opens AuthPanel in a
 * dropdown. Drop-in replacement for the old placeholder avatar.
 */
export default function AuthMenu() {
  const { user, profile, loading } = useAuth()
  const [open, setOpen] = useState(false)

  const initial = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="relative">
      {user ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2"
        >
          {profile?.credits != null && (
            <span className="hidden items-center gap-1 rounded-lg border border-turquoise/20 bg-turquoise/10 px-2 py-1 text-xs font-semibold text-turquoise sm:inline-flex">
              <Coins className="size-3.5" />
              {profile.credits}
            </span>
          )}
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-turquoise to-periwinkle text-sm font-bold text-black">
            {initial}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={loading}
          className="inline-flex items-center rounded-xl bg-turquoise px-3.5 py-2 text-sm font-semibold text-black transition-all hover:brightness-110 disabled:opacity-50"
          style={{ boxShadow: '0 0 18px -4px #34e0a188' }}
        >
          Sign in
        </button>
      )}

      {open && (
        <>
          {/* click-away backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-80">
            <AuthPanel />
          </div>
        </>
      )}
    </div>
  )
}
