// Frontend client for the Instant "AI Growth-Hack" Engine.
//
// Calls the /api/growth endpoint with the completed review's Critic complaints
// PLUS the raw per-frame visual observations (the niche signal), and returns
// three concrete, ready-to-ship blueprints:
//
//   { curiosityHook, visualDirective, pacingSaver, niche }
//
// Throws on any network / shape failure so the caller can surface the real error.

const GROWTH_ENDPOINT = '/api/growth'

export async function fetchGrowthHacks({
  query,
  theCritic,
  theCoach,
  verdict,
  frameNotes,
  contentType,
  niche,
} = {}) {
  const res = await fetch(GROWTH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: (query || '').trim(),
      theCritic: (theCritic || '').trim(),
      theCoach: (theCoach || '').trim(),
      verdict: (verdict || '').trim(),
      contentType: (contentType || 'video').trim(),
      niche: (niche || '').trim(),
      // Per-frame notes are the strongest niche signal — they contain what the
      // vision model literally observed on screen (HUD, subject, gameplay UI…).
      frameNotes: Array.isArray(frameNotes)
        ? frameNotes.map((f) => ({
            label: (f && f.label) || '',
            t: Number(f && f.t) || 0,
            note: (f && f.note) || '',
          }))
        : [],
    }),
  })

  if (!res.ok) {
    let detail = `Server responded ${res.status}`
    try {
      const e = await res.json()
      if (e && e.error) detail = e.error
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail)
  }

  const data = await res.json()
  if (
    !data ||
    typeof data.curiosityHook !== 'string' ||
    typeof data.visualDirective !== 'string' ||
    typeof data.pacingSaver !== 'string'
  ) {
    throw new Error('Malformed growth-hack response')
  }
  return data
}
