import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { DataContext } from './data-context'
import { useAuth } from './auth-context'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { FREE_LIMITS } from '../lib/limits'
import { addContact as dbAddContact, fetchMyAudience } from '../lib/contacts'
import { fetchMyPublicProfile, saveMyPublicProfile } from '../lib/profiles'
import {
  createPoll as dbCreatePoll,
  fetchMyPolls,
  setActivePoll as dbSetActivePoll,
  updatePollOption as dbUpdatePollOption,
} from '../lib/polls'

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

  // ---- Real Supabase persistence (signed-in + configured) ----
  // Signed out, or no Supabase project configured, falls back to the
  // localStorage-only demo behavior above unchanged.
  const { user, profile: authProfile } = useAuth()
  const backed = isSupabaseConfigured && !!user
  // Client-side gate mirrored by DB triggers (0009_plan_limits.sql) — this
  // check is UX (a fast, friendly error before a round-trip), not security.
  const isPro = authProfile?.plan === 'pro'

  useEffect(() => {
    if (!backed) return
    let cancelled = false
    fetchMyAudience()
      .then((rows) => {
        if (!cancelled) setContacts(rows)
      })
      .catch((e) => console.error('Failed to load contacts:', e))
    return () => {
      cancelled = true
    }
  }, [backed, user?.id])

  useEffect(() => {
    if (!backed) return
    let cancelled = false
    fetchMyPublicProfile()
      .then((row) => {
        if (!cancelled && row) setProfile((p) => ({ ...p, ...row }))
      })
      .catch((e) => console.error('Failed to load public profile:', e))
    return () => {
      cancelled = true
    }
  }, [backed, user?.id])

  useEffect(() => {
    if (!backed) return
    let cancelled = false
    fetchMyPolls()
      .then(async (rows) => {
        if (cancelled) return
        if (rows.length) {
          setPolls(rows)
          return
        }
        // Brand-new account: seed the same starter polls the demo ships with,
        // as real per-user rows (votes start at 0 — no fake pre-loaded tallies).
        const created = []
        for (const seed of DEFAULT_POLLS) {
          created.push(await dbCreatePoll({ question: seed.question, options: seed.options }))
        }
        if (created[0]) await dbSetActivePoll(created[0].id)
        if (!cancelled) {
          setPolls(created.map((p, i) => ({ ...p, active: i === 0 })))
        }
      })
      .catch((e) => console.error('Failed to load polls:', e))
    return () => {
      cancelled = true
    }
  }, [backed, user?.id])

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
  // Local, instant edits as the creator types; saveProfile below is what
  // actually persists them to Supabase.
  const updateProfile = useCallback((patch) => {
    setProfile((p) => ({ ...p, ...patch }))
  }, [])

  // Explicit persist step (ProfileSettings' Save button) — not fired on every
  // keystroke, so typing stays instant and we don't hammer the RPC.
  const saveProfile = useCallback(async () => {
    if (!backed) return
    await saveMyPublicProfile(profile)
  }, [backed, profile])

  const addContact = useCallback(
    async ({ full_name, email, platform, source = 'manual', engagement_score = null }) => {
      if (!isPro && contacts.length >= FREE_LIMITS.contacts) {
        throw new Error(
          `Free plan is capped at ${FREE_LIMITS.contacts} contacts. Upgrade to Pro for unlimited.`,
        )
      }
      if (backed) {
        const row = await dbAddContact({
          full_name: (full_name || '').trim() || 'Unknown',
          email: (email || '').trim(),
          platform: platform || 'Other',
        })
        setContacts((prev) => [row, ...prev])
        return row
      }
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
    [backed, contacts.length, isPro],
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
      if (!isPro && hookTests.length >= FREE_LIMITS.hookTests) {
        toast(
          `Free plan is capped at ${FREE_LIMITS.hookTests} hook tests. Upgrade to Pro for unlimited.`,
          { title: 'Hook test limit reached' },
        )
        return null
      }
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
    [hookTests.length, isPro, toast],
  )

  // Patch a single poll option (e.g. attach/clear an image_url for a visual
  // poll). Merges the patch so existing fields like votes are preserved.
  const updatePollOption = useCallback(
    ({ pollId, optionId, patch }) => {
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
      if (backed) {
        dbUpdatePollOption({ optionId, patch }).catch((e) =>
          console.error('Failed to save poll option:', e),
        )
      }
    },
    [backed],
  )

  // Choose which poll is live on the public profile (one active at a time).
  const setActivePoll = useCallback(
    (pollId) => {
      setPolls((prev) => prev.map((p) => ({ ...p, active: p.id === pollId })))
      if (backed) {
        dbSetActivePoll(pollId).catch((e) => console.error('Failed to set active poll:', e))
      }
    },
    [backed],
  )

  // Leads = contacts that came in via the public-profile capture form.
  // localStorage-mode tags them with source='lead'; the Supabase capture_lead
  // RPC stamps platform='Profile' (see 0006 migration) — accept either so the
  // counter is honest in both modes.
  const leadsCaptured = useMemo(
    () => contacts.filter((c) => c.source === 'lead' || c.platform === 'Profile').length,
    [contacts],
  )

  // When Supabase-backed, votes arrive from anonymous visitors directly (never
  // through this browser), so the total is derived from the polls we last
  // fetched rather than a locally-incremented counter.
  const derivedTotalVotes = useMemo(
    () => polls.reduce((s, p) => s + p.options.reduce((s2, o) => s2 + (o.votes || 0), 0), 0),
    [polls],
  )
  const effectiveAnalytics = useMemo(
    () => (backed ? { totalVotes: derivedTotalVotes } : analytics),
    [backed, derivedTotalVotes, analytics],
  )

  const value = useMemo(
    () => ({
      profile,
      contacts,
      analytics: effectiveAnalytics,
      polls,
      hookTests,
      leadsCaptured,
      updateProfile,
      saveProfile,
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
      effectiveAnalytics,
      polls,
      hookTests,
      leadsCaptured,
      updateProfile,
      saveProfile,
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
          className="al-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-turquoise/30 al-glass-thick px-4 py-3"
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
