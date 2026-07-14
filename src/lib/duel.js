// Frontend client for the real AI critique duel.
//
// Calls the /api/duel serverless endpoint with the creator's question and the
// option thumbnails (base64 data URLs or remote URLs), and returns the clean
// Coach/Critic/Verdict report:
//
//   { analysis: [...parallel to options], theCoach, theCritic, verdict }
//
// Throws on any network / shape failure so the caller can fall back to the
// local mock (which keeps the review working in dev or unconfigured deploys).

const DUEL_ENDPOINT = '/api/duel'

export async function fetchDuelScript(question, options) {
  const payload = {
    question: (question || '').trim(),
    options: options.map((o) => ({
      label: (o.label || '').trim(),
      image_url: o.image_url || '',
    })),
  }

  const res = await fetch(DUEL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    // Surface the backend's exact error message (Ollama down, model missing,
    // timeout, unparseable JSON, …) instead of a generic status code.
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
    !Array.isArray(data.analysis) ||
    typeof data.theCoach !== 'string' ||
    typeof data.theCritic !== 'string' ||
    !data.verdict
  ) {
    throw new Error('Malformed duel response')
  }
  return data
}
