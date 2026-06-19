import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { DataContext } from './data-context'

// localStorage keys (versioned so the shape can evolve safely).
const LS = {
  profile: 'al_profile_v1',
  contacts: 'al_contacts_v1',
  analytics: 'al_analytics_v1',
}

const DEFAULT_PROFILE = {
  handle: '',
  display_name: '',
  bio: '',
  avatar_url: '',
  featured_video_url: '',
  is_public: false,
}
const DEFAULT_ANALYTICS = { totalVotes: 0 }

// New leads start with a small engagement score so the Avg. Engagement metric
// moves the moment someone joins.
const LEAD_START_ENGAGEMENT = 10

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode / quota — degrade to in-memory only.
  }
}

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function DataProvider({ children }) {
  const [profile, setProfile] = useState(() => ({
    ...DEFAULT_PROFILE,
    ...load(LS.profile, {}),
  }))
  const [contacts, setContacts] = useState(() => load(LS.contacts, []))
  const [analytics, setAnalytics] = useState(() => ({
    ...DEFAULT_ANALYTICS,
    ...load(LS.analytics, {}),
  }))
  const [toasts, setToasts] = useState([])

  // Persist each slice whenever it changes.
  useEffect(() => save(LS.profile, profile), [profile])
  useEffect(() => save(LS.contacts, contacts), [contacts])
  useEffect(() => save(LS.analytics, analytics), [analytics])

  // Cross-tab live sync: if another tab (e.g. the open /p/<handle> page) writes
  // to localStorage, mirror it here so views stay in lockstep.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LS.profile) setProfile({ ...DEFAULT_PROFILE, ...load(LS.profile, {}) })
      else if (e.key === LS.contacts) setContacts(load(LS.contacts, []))
      else if (e.key === LS.analytics)
        setAnalytics({ ...DEFAULT_ANALYTICS, ...load(LS.analytics, {}) })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // ---- Toasts ----
  const timers = useRef(new Map())
  const dismissToast = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    const tm = timers.current.get(id)
    if (tm) {
      clearTimeout(tm)
      timers.current.delete(id)
    }
  }, [])
  const toast = useCallback(
    (message, opts = {}) => {
      const id = uid()
      setToasts((list) => [...list, { id, message, title: opts.title }])
      const tm = setTimeout(() => dismissToast(id), opts.duration ?? 3800)
      timers.current.set(id, tm)
      return id
    },
    [dismissToast],
  )
  useEffect(() => {
    const map = timers.current
    return () => map.forEach((tm) => clearTimeout(tm))
  }, [])

  // ---- Actions ----
  const updateProfile = useCallback((patch) => {
    setProfile((p) => ({ ...p, ...patch }))
  }, [])

  const addContact = useCallback(
    ({ full_name, email, platform, source = 'manual', engagement_score = null }) => {
      const contact = {
        id: uid(),
        full_name: (full_name || '').trim() || 'Unknown',
        email: (email || '').trim(),
        platform: platform || 'Other',
        engagement_score,
        source,
        created_at: new Date().toISOString(),
      }
      setContacts((prev) => [contact, ...prev])
      return contact
    },
    [],
  )

  // A follower joining from the public profile form. De-dupes by email.
  const addLead = useCallback(({ full_name, email, platform = 'Web' }) => {
    const lead = {
      id: uid(),
      full_name: (full_name || '').trim() || 'Profile lead',
      email: (email || '').trim(),
      platform: platform || 'Web',
      engagement_score: LEAD_START_ENGAGEMENT,
      source: 'lead',
      created_at: new Date().toISOString(),
    }
    setContacts((prev) => {
      const e = lead.email.toLowerCase()
      if (e && prev.some((c) => (c.email || '').toLowerCase() === e)) return prev
      return [lead, ...prev]
    })
    return lead
  }, [])

  const recordVote = useCallback((n = 1) => {
    setAnalytics((a) => ({ ...a, totalVotes: (a.totalVotes || 0) + n }))
  }, [])

  const leadsCaptured = useMemo(
    () => contacts.filter((c) => c.source === 'lead').length,
    [contacts],
  )

  const value = useMemo(
    () => ({
      profile,
      contacts,
      analytics,
      leadsCaptured,
      updateProfile,
      addContact,
      addLead,
      recordVote,
      toast,
    }),
    [
      profile,
      contacts,
      analytics,
      leadsCaptured,
      updateProfile,
      addContact,
      addLead,
      recordVote,
      toast,
    ],
  )

  return (
    <DataContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismissToast} />
    </DataContext.Provider>
  )
}

function Toaster({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="al-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-turquoise/30 bg-zinc-950/90 px-4 py-3 backdrop-blur-xl"
          style={{ boxShadow: '0 0 30px -8px #34e0a1' }}
        >
          <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-turquoise/15 text-turquoise">
            <Check className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            {t.title && <p className="text-sm font-bold text-zinc-50">{t.title}</p>}
            <p className="text-sm text-zinc-300">{t.message}</p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="shrink-0 text-zinc-500 transition-colors hover:text-zinc-200"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
