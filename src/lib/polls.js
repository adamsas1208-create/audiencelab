import { supabase } from './supabaseClient'
import { getVoterId } from './rooms'

// Data layer for a creator's own polls (Poll Analytics / ProfileSettings) and
// for anonymous voting on a public creator's live poll (/p/<handle>). Backed
// by supabase/migrations/0007_contacts_and_polls.sql.

async function requireUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in to manage polls.')
  return user.id
}

// Nest each poll's options under it, ordered the way the UI expects.
function groupOptions(polls, options) {
  return polls.map((p) => ({
    ...p,
    options: options
      .filter((o) => o.poll_id === p.id)
      .sort((a, b) => a.sort_order - b.sort_order),
  }))
}

/** All of the signed-in user's polls (with nested options), newest first. */
export async function fetchMyPolls() {
  const userId = await requireUserId()
  const { data: polls, error: pollsErr } = await supabase
    .from('polls')
    .select('id, question, active, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (pollsErr) throw pollsErr
  if (!polls?.length) return []

  const { data: options, error: optsErr } = await supabase
    .from('poll_options')
    .select('id, poll_id, label, image_url, votes, sort_order')
    .in(
      'poll_id',
      polls.map((p) => p.id),
    )
  if (optsErr) throw optsErr

  return groupOptions(polls, options ?? [])
}

/** Create a poll with its options for the signed-in user. */
export async function createPoll({ question, options }) {
  const userId = await requireUserId()
  const { data: poll, error: pollErr } = await supabase
    .from('polls')
    .insert({ user_id: userId, question })
    .select('id, question, active, created_at')
    .single()
  if (pollErr) throw pollErr

  const rows = (options || []).map((o, i) => ({
    poll_id: poll.id,
    label: o.label || '',
    image_url: o.image_url || '',
    sort_order: i,
  }))
  const { data: savedOptions, error: optsErr } = await supabase
    .from('poll_options')
    .insert(rows)
    .select('id, poll_id, label, image_url, votes, sort_order')
  if (optsErr) throw optsErr

  return { ...poll, options: savedOptions ?? [] }
}

/** Patch one option (e.g. attach/clear an image_url). */
export async function updatePollOption({ optionId, patch }) {
  const { error } = await supabase.from('poll_options').update(patch).eq('id', optionId)
  if (error) throw error
}

/** Make one poll the live one on the public page; deactivates the rest. */
export async function setActivePoll(pollId) {
  const userId = await requireUserId()
  const { error: offErr } = await supabase
    .from('polls')
    .update({ active: false })
    .eq('user_id', userId)
    .neq('id', pollId)
  if (offErr) throw offErr

  const { error: onErr } = await supabase
    .from('polls')
    .update({ active: true })
    .eq('id', pollId)
  if (onErr) throw onErr
}

/** The public-safe live poll for a handle (flattened rows: one per option). */
export async function fetchPublicActivePoll(handle) {
  const { data, error } = await supabase.rpc('get_public_active_poll', {
    p_handle: handle,
  })
  if (error) throw error
  if (!data?.length) return null

  const { poll_id: id, question } = data[0]
  return {
    id,
    question,
    options: data.map((row) => ({
      id: row.option_id,
      label: row.label,
      image_url: row.image_url,
      votes: row.votes,
    })),
  }
}

/** Anonymous visitor casts a vote on a public creator's live poll. */
export async function castPublicPollVote({ handle, pollId, optionId }) {
  const { error } = await supabase.rpc('cast_public_poll_vote', {
    p_handle: handle,
    p_poll_id: pollId,
    p_option_id: optionId,
    p_voter_id: getVoterId(),
  })
  if (error) throw error
  return true
}
