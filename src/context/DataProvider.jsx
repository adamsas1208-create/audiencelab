import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { DataContext } from './data-context'

// localStorage keys (versioned so the shape can evolve safely).
const LS = {
  profile: 'al_profile_v1',
  contacts: 'al_contacts_v1',
  analytics: 'al_analytics_v1',
  polls: 'al_polls_v1',
  hookTests: 'al_hooktests_v1',
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

// Seed polls so the Live Poll dashboard and the public-profile vote widget have
// content out of the box. The poll flagged `active` is the one shown on the
// public page; votes there flow back into these distributions in real time.
const DEFAULT_POLLS = [
  {
    id: 'poll-thumbnail',
    question: 'Which thumbnail is better?',
    active: true,
    created_at: '2026-06-18T09:00:00.000Z',
    options: [
      {
        id: 'opt-thumb-a',
        label: 'Bold red text + shocked face',
        votes: 128,
        image_url:
          'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=640&q=80&auto=format&fit=crop',
      },
      {
        id: 'opt-thumb-b',
        label: 'Clean minimal product shot',
        votes: 72,
        image_url:
          'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=640&q=80&auto=format&fit=crop',
      },
    ],
  },
  {
    id: 'poll-hook',
    question: 'Rate my next video hook',
    active: false,
    created_at: '2026-06-15T09:00:00.000Z',
    options: [
      { id: 'opt-hook-a', label: '“I quit my job to do this…”', votes: 64 },
      { id: 'opt-hook-b', label: '“Nobody talks about this, but…”', votes: 41 },
      { id: 'opt-hook-c', label: '“Watch before you buy ANY camera”', votes: 53 },
    ],
  },
  {
    id: 'poll-upload',
    question: 'Best day to drop my next upload?',
    active: false,
    created_at: '2026-06-10T09:00:00.000Z',
    options: [
      { id: 'opt-day-a', label: 'Friday evening', votes: 96 },
      { id: 'opt-day-b', label: 'Sunday morning', votes: 88 },
    ],
  },
]

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
  const [polls, setPolls] = useState(() => {
    const stored = load(LS.polls, null)
    return Array.isArray(stored) && stored.length ? stored : DEFAULT_POLLS
  })
  // Visual poll / hook tests created from the Creator Studio modal. Starts empty
  // and grows as the creator publishes tests.
  const [hookTests, setHookTests] = useState(() => load(LS.hookTests, []))
  const [toasts, setToasts] = useState([])

  // Persist each slice whenever it changes.
  useEffect(() => save(LS.profile, profile), [profile])
  useEffect(() => save(LS.contacts, contacts), [contacts])
  useEffect(() => save(LS.analytics, analytics), [analytics])
  useEffect(() => save(LS.polls, polls), [polls])
  useEffect(() => save(LS.hookTests, hookTests), [hookTests])

  // Cross-tab live sync: if another tab (e.g. the open /p/<handle> page) writes
  // to localStorage, mirror it here so views stay in lockstep.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LS.profile) setProfile({ ...DEFAULT_PROFILE, ...load(LS.profile, {}) })
      else if (e.key === LS.contacts) setContacts(load(LS.contacts, []))
      else if (e.key === LS.analytics)
        setAnalytics({ ...DEFAULT_ANALYTICS, ...load(LS.analytics, {}) })
      else if (e.key === LS.polls) {
        const stored = load(LS.polls, null)
        if (Array.isArray(stored) && stored.length) setPolls(stored)
      } else if (e.key === LS.hookTests) setHookTests(load(LS.hookTests, []))
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

  // A vote on a specific poll option from the public page. Bumps that option's
  // tally and the global vote counter so the dashboard updates in lockstep.
  const recordPollVote = useCallback(({ pollId, optionId }) => {
    setPolls((prev) =>
      prev.map((p) =>
        p.id === pollId
          ? {
              ...p,
              options: p.options.map((o) =>
                o.id === optionId ? { ...o, votes: (o.votes || 0) + 1 } : o,
              ),
            }
          : p,
      ),
    )
    setAnalytics((a) => ({ ...a, totalVotes: (a.totalVotes || 0) + 1 }))
  }, [])

  // Create a new visual poll / hook test from the Creator Studio modal. Stored
  // in its own slice (persisted to localStorage) and surfaced at the top of the
  // studio list so it appears instantly under the Testing/Live status.
  const addHookTest = useCallback(
    ({ question, options, platform = 'tiktok', status = 'testing' }) => {
      const test = {
        id: uid(),
        text: (question || '').trim() || 'Untitled hook test',
        platform,
        status,
        score: 0,
        votes: 0,
        winRate: 0,
        impressions: 0,
        trend: 'flat',
        created_at: new Date().toISOString(),
        options: (options || []).map((o) => ({
          id: uid(),
          label: (o.label || '').trim(),
          image_url: (o.image_url || '').trim(),
          votes: 0,
        })),
      }
      setHookTests((prev) => [test, ...prev])
      return test
    },
    [],
  )

  // Patch a single poll option (e.g. attach/clear an image_url for a visual
  // poll). Merges the patch so existing fields like votes are preserved.
  const updatePollOption = useCallback(({ pollId, optionId, patch }) => {
    setPolls((prev) =>
      prev.map((p) =>
        p.id === pollId
          ? {
              ...p,
              options: p.options.map((o) =>
                o.id === optionId ? { ...o, ...patch } : o,
              ),
            }
          : p,
      ),
    )
  }, [])

  // Choose which poll is live on the public profile (one active at a time).
  const setActivePoll = useCallback((pollId) => {
    setPolls((prev) => prev.map((p) => ({ ...p, active: p.id === pollId })))
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
      polls,
      hookTests,
      leadsCaptured,
      updateProfile,
      addContact,
      addLead,
      recordVote,
      recordPollVote,
      updatePollOption,
      addHookTest,
      setActivePoll,
      toast,
    }),
    [
      profile,
      contacts,
      analytics,
      polls,
      hookTests,
      leadsCaptured,
      updateProfile,
      addContact,
      addLead,
      recordVote,
      recordPollVote,
      updatePollOption,
      addHookTest,
      setActivePoll,
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
