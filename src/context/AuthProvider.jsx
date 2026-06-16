import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AuthContext } from './auth-context'

const REF_KEY = 'al_pending_ref'

/**
 * Reads a ?ref=CODE off the current URL (e.g. /signup?ref=ABCD1234) and
 * remembers it in localStorage so it survives navigation until the user
 * actually signs up. Returns the currently pending code (if any).
 */
function capturePendingRef() {
  try {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) localStorage.setItem(REF_KEY, ref.trim().toUpperCase())
    return localStorage.getItem(REF_KEY)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingRef, setPendingRef] = useState(() => capturePendingRef())

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, email, credits, referral_code, referred_by')
      .eq('id', userId)
      .maybeSingle()
    setProfile(data ?? null)
  }, [])

  // Claims a pending referral code on the backend. Used for OAuth signups
  // (Google), where the ref can't ride along in user metadata. Server-side
  // guards make it idempotent and abuse-resistant, so calling it twice is safe.
  const applyPendingReferral = useCallback(async (userId) => {
    if (!userId) return
    const ref = localStorage.getItem(REF_KEY)
    if (!ref) return
    try {
      await supabase.rpc('apply_referral', { p_code: ref })
    } catch {
      /* non-fatal: leave the rest of the flow intact */
    }
    localStorage.removeItem(REF_KEY)
    setPendingRef(null)
  }, [])

  useEffect(() => {
    let active = true

    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setSession(data.session)
      if (data.session?.user) await applyPendingReferral(data.session.user.id)
      await loadProfile(data.session?.user?.id)
      if (active) setLoading(false)
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'SIGNED_IN' && next?.user) {
        // New (or returning) sign-in — apply any pending ref, then refresh.
        applyPendingReferral(next.user.id).then(() => loadProfile(next.user.id))
      } else {
        loadProfile(next?.user?.id)
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile, applyPendingReferral])

  const signUp = useCallback(async ({ email, password }) => {
    const ref = localStorage.getItem(REF_KEY) || undefined
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Surfaced to the handle_new_user trigger as raw_user_meta_data->>'ref'
        data: ref ? { ref } : {},
        emailRedirectTo: window.location.origin,
      },
    })
    if (error) throw error
    // The referral code has been consumed — don't reapply it on a later signup.
    localStorage.removeItem(REF_KEY)
    setPendingRef(null)
    return data
  }, [])

  const signIn = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }, [])

  // Native Supabase Google OAuth (full-page redirect). The pending ref stays
  // in localStorage across the redirect and is claimed on return via
  // applyPendingReferral. `prompt: select_account` always shows the chooser.
  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const referralLink = useMemo(
    () =>
      profile?.referral_code
        ? `${window.location.origin}/signup?ref=${profile.referral_code}`
        : null,
    [profile],
  )

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      pendingRef,
      referralLink,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      refreshProfile: () => loadProfile(session?.user?.id),
    }),
    [
      session,
      profile,
      loading,
      pendingRef,
      referralLink,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      loadProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
