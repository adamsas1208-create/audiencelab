// Sharing helpers for the creator's public poll page.
//
// The public page at /p/<handle> renders the creator's LIVE poll and lets
// anyone vote without signing up (see PublicProfile → VoteSneakPeek). So
// "sharing the poll" is simply sharing that link: recipients land on the
// lightweight voting page and can cast a vote without opening the full app —
// but it's a real link into AudienceLab, so they can explore/join if they want.

// Where the live public page lives. Uses the current origin so it works in dev,
// preview, and production without hardcoding a domain.
export function liveUrl(handle) {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://audiencelab.ai'
  return `${origin}/p/${handle}`
}

// Share the public poll link. On devices that support it (mostly mobile) this
// opens the OS share sheet so the creator can send it straight to WhatsApp,
// Messages, X, etc. — the poll reaches people without them opening the app.
// Everywhere else it falls back to copying the link to the clipboard.
//
// Returns one of: 'shared' | 'copied' | 'cancelled' | 'failed'. `toast` is the
// optional useData() toast used to confirm the clipboard fallback.
export async function sharePoll({ handle, question, toast } = {}) {
  const url = liveUrl(handle)
  const title = 'Vote on my poll'
  const text = question
    ? `Which one? "${question}" — tap to cast your vote (no signup):`
    : 'Cast your vote — no signup needed:'

  // Native share sheet — the "send it to people" path.
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (err) {
      // User dismissed the sheet — not an error, and don't then copy behind their back.
      if (err && err.name === 'AbortError') return 'cancelled'
      // Any other failure (e.g. permission) falls through to the copy fallback.
    }
  }

  // Fallback: copy the link so it can be pasted anywhere.
  try {
    await navigator.clipboard.writeText(url)
    if (toast) toast('Public poll link copied — paste it anywhere.', { title: 'Link copied' })
    return 'copied'
  } catch {
    // Clipboard blocked (rare) — surface the raw link so it's still shareable.
    if (toast) toast(url, { title: 'Copy this link' })
    return 'failed'
  }
}
