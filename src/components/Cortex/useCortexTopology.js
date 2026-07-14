import { useEffect, useMemo, useRef } from 'react'
import { useData } from '../../context/data-context'

// Fixed order + tint per category. Colors are anchored to the app's brand
// (mint + periwinkle) with 3 supporting accents — the ring reads as one
// family, not five random hues. Angles arrange the ring clockwise from top.
// Ring angles are the standard math convention (0° right, 90° up), so a value
// of 90° puts the node at the TOP of the ring. Ordered clockwise starting from
// Audience-at-12 so the creator's community sits at the top of the room.
const CATEGORIES = [
  { id: 'audience', label: 'Audience', tint: '#34e0a1', angleDeg: 90 },
  { id: 'polls',    label: 'Polls',    tint: '#6ae0ff', angleDeg: 18 },
  { id: 'hooks',    label: 'Hooks',    tint: '#ffb476', angleDeg: 306 },
  { id: 'coach',    label: 'Coach',    tint: '#6260ff', angleDeg: 234 },
  { id: 'growth',   label: 'Growth',   tint: '#ff9cd8', angleDeg: 162 },
]

const RING_RADIUS = 3.5

function clamp01(n) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

// Derives node topology + a "pulseTrigger" ref that increments whenever an
// upstream count changes. The scene reads pulseTrigger via useFrame to flash
// the matching edge (see NeuralWebCanvas). This is the only "live" surface
// between React state and the R3F render loop.
export function useCortexTopology() {
  const { contacts, polls, hookTests, lastDuel, analytics } = useData()

  // Ring buffer for edge-flash triggers, keyed by category id.
  const pulseRef = useRef({ audience: 0, polls: 0, hooks: 0, coach: 0, growth: 0 })
  const prevCountsRef = useRef({ contacts: 0, polls: 0, pollVotes: 0, hooks: 0, coach: 0, growth: 0 })

  const derived = useMemo(() => {
    const activePoll = polls.find((p) => p.active) || null
    const activePollVotes = activePoll
      ? activePoll.options.reduce((s, o) => s + (o.votes || 0), 0)
      : 0
    const totalPollVotes = polls.reduce(
      (s, p) => s + p.options.reduce((ss, o) => ss + (o.votes || 0), 0),
      0,
    )

    // Distinct contact platforms → up to 6 motes.
    const platformCounts = new Map()
    for (const c of contacts) {
      const p = (c.platform || 'Other').toString()
      platformCounts.set(p, (platformCounts.get(p) || 0) + 1)
    }
    const audienceMotes = [...platformCounts.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([label, weight], i, arr) => ({
        id: `audience-${label}`,
        label,
        weight,
        angle: (i / Math.max(1, arr.length)) * Math.PI * 2,
      }))

    const pollOptions = activePoll?.options || []
    const pollMotes = pollOptions.slice(0, 6).map((o, i, arr) => ({
      id: `poll-${o.id ?? i}`,
      label: o.label || `Option ${i + 1}`,
      weight: (o.votes || 0) + 1,
      angle: (i / Math.max(1, arr.length)) * Math.PI * 2,
    }))

    const hookMotes = hookTests.slice(0, 6).map((h, i, arr) => ({
      id: `hook-${h.id ?? i}`,
      label: (h.text || `Hook ${i + 1}`).slice(0, 30),
      weight: (h.votes || 0) + 1,
      angle: (i / Math.max(1, arr.length)) * Math.PI * 2,
    }))

    const coachOptions = lastDuel?.analysis || []
    const coachMotes = coachOptions.slice(0, 6).map((a, i, arr) => ({
      id: `coach-${i}`,
      label: (a.label || `Option ${i + 1}`).slice(0, 30),
      weight: a.scores?.thumbStop ?? 5,
      angle: (i / Math.max(1, arr.length)) * Math.PI * 2,
    }))

    // Growth is aggregate. One mote is enough — it visualises the total pulse.
    const growthMotes = totalPollVotes > 0
      ? [{ id: 'growth-total', label: `${totalPollVotes} votes`, weight: totalPollVotes, angle: 0 }]
      : []

    const intensityByCategory = {
      audience: clamp01(contacts.length / 20),
      polls: clamp01(activePollVotes / 100),
      hooks: clamp01(hookTests.length / 6),
      coach: lastDuel ? 1 : 0,
      growth: clamp01((analytics.totalVotes || 0) / 200),
    }

    const motesByCategory = {
      audience: audienceMotes,
      polls: pollMotes,
      hooks: hookMotes,
      coach: coachMotes,
      growth: growthMotes,
    }

    const nodes = CATEGORIES.map((c) => {
      const angleRad = (c.angleDeg * Math.PI) / 180
      return {
        id: c.id,
        label: c.label,
        tint: c.tint,
        intensity: intensityByCategory[c.id],
        motes: motesByCategory[c.id],
        // World position of the node on the ring.
        position: [Math.cos(angleRad) * RING_RADIUS, Math.sin(angleRad) * RING_RADIUS, 0],
        angleRad,
      }
    })

    const isEmpty =
      contacts.length === 0 &&
      polls.length === 0 &&
      hookTests.length === 0 &&
      !lastDuel

    return {
      nodes,
      isEmpty,
      totalPollVotes,
      activePoll,
    }
  }, [contacts, polls, hookTests, lastDuel, analytics])

  // Bump pulse counters when upstream counts change. Kept in an effect (not
  // during render) so React 19 strict-mode double renders don't double-pulse.
  // The R3F scene reads pulseRef.current in useFrame and turns each bump into
  // a brief edge/node flash.
  useEffect(() => {
    const prev = prevCountsRef.current
    const next = {
      contacts: contacts.length,
      polls: polls.length,
      pollVotes: derived.totalPollVotes,
      hooks: hookTests.length,
      coach: lastDuel ? 1 : 0,
      growth: analytics.totalVotes || 0,
    }
    if (next.contacts !== prev.contacts) pulseRef.current.audience += 1
    if (next.polls !== prev.polls || next.pollVotes !== prev.pollVotes)
      pulseRef.current.polls += 1
    if (next.hooks !== prev.hooks) pulseRef.current.hooks += 1
    if (next.coach !== prev.coach) pulseRef.current.coach += 1
    if (next.growth !== prev.growth) pulseRef.current.growth += 1
    prevCountsRef.current = next
  }, [contacts, polls, hookTests, lastDuel, analytics, derived.totalPollVotes])

  return { ...derived, pulseRef, categories: CATEGORIES }
}
