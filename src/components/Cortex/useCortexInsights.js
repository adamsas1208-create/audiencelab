import { useEffect, useMemo, useState } from 'react'
import { useData } from '../../context/data-context'

// Compact, model-friendly view of the creator's data. Everything the /api/cortex
// endpoint reads to spot patterns and produce insight strings.
function buildSnapshot({ contacts, polls, hookTests, lastDuel, analytics }) {
  const byPlatform = {}
  let newestAt = null
  let oldestAt = null
  for (const c of contacts || []) {
    const p = (c.platform || 'Other').toString()
    byPlatform[p] = (byPlatform[p] || 0) + 1
    if (c.created_at) {
      if (!newestAt || c.created_at > newestAt) newestAt = c.created_at
      if (!oldestAt || c.created_at < oldestAt) oldestAt = c.created_at
    }
  }
  return {
    contacts: {
      total: (contacts || []).length,
      byPlatform,
      newestAt,
      oldestAt,
    },
    polls: (polls || []).map((p) => ({
      question: p.question,
      active: !!p.active,
      options: (p.options || []).map((o) => ({
        label: o.label,
        votes: o.votes || 0,
      })),
    })),
    hookTests: (hookTests || []).map((h) => ({
      text: h.text,
      platform: h.platform,
      status: h.status,
      created_at: h.created_at,
    })),
    lastDuel: lastDuel
      ? {
          question: lastDuel.question,
          winner: lastDuel.verdict?.winner || null,
          verdict: lastDuel.verdict?.summary || null,
        }
      : null,
    analytics: { totalVotes: analytics?.totalVotes || 0 },
  }
}

// Cheap change-detection fingerprint. useEffect only refires when the
// stringified snapshot actually differs.
function fingerprint(s) {
  return JSON.stringify(s)
}

// The full contract for the UI:
//   { loading, insights: [...] | null, error: string | null, niche: string | null,
//     degraded: boolean,     // true when the AI isn't reachable (hosted demo)
//     hasData: boolean }     // false for a brand-new creator with nothing yet
//
// Auto-fetches on mount + whenever the debounced tone or the snapshot content
// changes. Never fetches when the creator has no data — pointless model call.
export function useCortexInsights(tone) {
  const data = useData()
  const snapshot = useMemo(() => buildSnapshot(data), [data])
  const fp = useMemo(() => fingerprint(snapshot), [snapshot])

  const hasData =
    snapshot.contacts.total > 0 ||
    snapshot.polls.length > 0 ||
    snapshot.hookTests.length > 0 ||
    !!snapshot.lastDuel

  const [debouncedTone, setDebouncedTone] = useState(tone)

  // Debounce so a slider drag doesn't hit the model on every tick.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTone(tone), 400)
    return () => clearTimeout(t)
  }, [tone])

  // The fetch stores its outcome keyed by the (tone, snapshot-fingerprint)
  // request identity. `loading` is DERIVED from "does the last result's key
  // match the current request?" — no setState('loading: true') at effect top
  // (React Compiler flags that as a cascade), which keeps this hook clean
  // and matches the pattern used by PublicProfile's useRemoteProfile hook.
  const currentKey = `${debouncedTone}:${fp}`
  const [result, setResult] = useState(null)
  const loading = hasData && (!result || result.key !== currentKey)

  useEffect(() => {
    if (!hasData) return
    let cancelled = false
    const key = `${debouncedTone}:${fp}`
    fetch('/api/cortex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tone: debouncedTone, snapshot }),
    })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(body?.error || `Cortex request failed (${r.status})`)
        return body
      })
      .then((body) => {
        if (!cancelled)
          setResult({
            key,
            insights: body.insights || [],
            error: null,
            niche: body.niche || null,
            degraded: false,
          })
      })
      .catch((err) => {
        if (cancelled) return
        // The "not available on the hosted demo" message ships as an error
        // string from _ollama.js; treat it (and any local Ollama-not-running
        // variant) as a graceful degraded state rather than a hard failure.
        const msg = err?.message || 'Cortex unreachable'
        const isDegraded =
          /hosted demo|Ollama is not reachable|Model .* is not loaded/i.test(msg)
        setResult({ key, insights: null, error: msg, niche: null, degraded: isDegraded })
      })
    return () => {
      cancelled = true
    }
  }, [debouncedTone, fp, hasData, snapshot])

  const active = result && result.key === currentKey ? result : null
  return {
    loading,
    insights: active?.insights ?? null,
    error: active?.error ?? null,
    niche: active?.niche ?? null,
    degraded: active?.degraded ?? false,
    hasData,
    snapshot,
  }
}
