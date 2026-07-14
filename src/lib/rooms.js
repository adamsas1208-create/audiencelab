import { supabase } from './supabaseClient'

/**
 * A stable, anonymous voter id kept in localStorage so repeat votes from the
 * same browser are attributable without collecting any PII.
 */
export function getVoterId() {
  const KEY = 'al_voter_id'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    localStorage.setItem(KEY, id)
  }
  return id
}

/** Fetch the aggregated per-room stats powering the dashboard grid. */
export async function fetchRoomStats() {
  const { data, error } = await supabase
    .from('room_stats')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data ?? []
}

/** Cast a vote for a hook in a room. The DB trigger bumps hooks.votes. */
export async function castVote({ roomId, hookId }) {
  const { error } = await supabase.from('votes').insert({
    room_id: roomId,
    hook_id: hookId,
    voter_id: getVoterId(),
  })
  if (error) throw error
}
