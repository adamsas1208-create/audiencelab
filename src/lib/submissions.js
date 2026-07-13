import { supabase } from './supabaseClient'
import { getVoterId } from './voterId'

// Data layer for "Which One?" — posting ideas/thumbnails and voting on them.
// Backed by supabase/migrations/0008_public_voting.sql.

async function requireUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in to do that.')
  return user.id
}

// Nest each submission's options under it, ordered the way the UI expects.
function groupOptions(submissions, options) {
  return submissions.map((s) => ({
    ...s,
    options: options
      .filter((o) => o.submission_id === s.id)
      .sort((a, b) => a.sort_order - b.sort_order),
  }))
}

async function fetchOptionsFor(submissionIds) {
  if (!submissionIds.length) return []
  const { data, error } = await supabase
    .from('submission_options')
    .select('id, submission_id, label, image_url, votes, sort_order')
    .in('submission_id', submissionIds)
  if (error) throw error
  return data ?? []
}

/** The public feed — active submissions, newest first, with nested options. */
export async function fetchFeed({ limit = 40 } = {}) {
  const { data: rows, error } = await supabase
    .from('submissions')
    .select('id, prompt, status, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  if (!rows?.length) return []

  const options = await fetchOptionsFor(rows.map((s) => s.id))
  return groupOptions(rows, options)
}

/** One submission + its options, for the detail/vote page. Null if missing. */
export async function fetchSubmission(id) {
  const { data: row, error } = await supabase
    .from('submissions')
    .select('id, prompt, status, created_at')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!row) return null

  const options = await fetchOptionsFor([row.id])
  return groupOptions([row], options)[0]
}

/** Has the current anonymous voter already voted on this submission? */
export async function fetchMyVote(submissionId) {
  const { data, error } = await supabase
    .from('submission_votes')
    .select('option_id')
    .eq('submission_id', submissionId)
    .eq('voter_id', getVoterId())
    .maybeSingle()
  if (error) throw error
  return data?.option_id ?? null
}

/** Cast a vote for one option. Blocked server-side if this voter already voted. */
export async function castVote({ submissionId, optionId }) {
  const { error } = await supabase.from('submission_votes').insert({
    submission_id: submissionId,
    option_id: optionId,
    voter_id: getVoterId(),
  })
  if (error) throw error
}

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `f_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

/** Upload one option image to the public bucket; returns its public URL. */
async function uploadOptionImage(file, userId) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 8)
  const path = `${userId}/${uid()}.${ext}`
  const { error } = await supabase.storage
    .from('submission-images')
    .upload(path, file, { contentType: file.type || 'image/jpeg' })
  if (error) throw error
  const { data } = supabase.storage.from('submission-images').getPublicUrl(path)
  return data.publicUrl
}

/**
 * Create a submission with its options. `options` is an array of
 * { label?: string, imageFile?: File } — each needs a label, an image, or
 * both. Images upload to Storage first; the submission publishes atomically
 * from the caller's point of view (options are inserted right after).
 */
export async function createSubmission({ prompt, options }) {
  const userId = await requireUserId()
  const trimmedPrompt = (prompt || '').trim()
  if (!trimmedPrompt) throw new Error('Add a prompt or question.')

  const cleanOptions = (options || []).filter(
    (o) => (o.label || '').trim() || o.imageFile,
  )
  if (cleanOptions.length < 2) throw new Error('Add at least two options.')

  const { data: submission, error: subErr } = await supabase
    .from('submissions')
    .insert({ user_id: userId, prompt: trimmedPrompt })
    .select('id, prompt, status, created_at')
    .single()
  if (subErr) throw subErr

  const rows = []
  for (let i = 0; i < cleanOptions.length; i++) {
    const o = cleanOptions[i]
    const image_url = o.imageFile ? await uploadOptionImage(o.imageFile, userId) : null
    rows.push({
      submission_id: submission.id,
      label: (o.label || '').trim() || null,
      image_url,
      sort_order: i,
    })
  }

  const { data: savedOptions, error: optErr } = await supabase
    .from('submission_options')
    .insert(rows)
    .select('id, submission_id, label, image_url, votes, sort_order')
  if (optErr) throw optErr

  return { ...submission, options: savedOptions ?? [] }
}

/** The signed-in user's own submissions (with nested options), newest first. */
export async function fetchMySubmissions() {
  const userId = await requireUserId()
  const { data: rows, error } = await supabase
    .from('submissions')
    .select('id, prompt, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  if (!rows?.length) return []

  const options = await fetchOptionsFor(rows.map((s) => s.id))
  return groupOptions(rows, options)
}
