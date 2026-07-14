// Frontend client for the "Video Autopsy" cinematic narrative feature.
//
// Streams plain text from /api/autopsy (powered by the hosted Claude Fable 5
// model) and calls onChunk(chunk, fullTextSoFar) as each piece arrives, so
// the UI can reveal the narration live instead of waiting for the whole
// response.
//
// Throws on any network / missing-body failure so the caller can surface the
// real error.

const AUTOPSY_ENDPOINT = '/api/autopsy'

export async function streamAutopsy({ query, theCoach, theCritic, verdict, frames } = {}, onChunk) {
  const res = await fetch(AUTOPSY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: (query || '').trim(),
      theCoach: (theCoach || '').trim(),
      theCritic: (theCritic || '').trim(),
      verdict: (verdict || '').trim(),
      frames: (frames || []).map((f) => ({
        label: f.label,
        t: f.t,
        note: f.note,
        scores: f.scores,
      })),
    }),
  })

  if (!res.ok || !res.body) {
    let detail = `Server responded ${res.status}`
    try {
      const e = await res.json()
      if (e && e.error) detail = e.error
    } catch {
      /* streamed plain-text error, not JSON */
    }
    throw new Error(detail)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    full += chunk
    if (onChunk) onChunk(chunk, full)
  }
  return full
}
