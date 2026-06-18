import { supabase } from './supabaseClient'

// Data layer for the user's audience (contacts). Lives alongside the other
// lib helpers (rooms.js, supabaseClient.js) to match the project's structure.
// RLS on public.contacts scopes rows to the owner, but we still filter/stamp
// user_id explicitly for correctness and clear intent.

async function requireUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in to manage your audience.')
  return user.id
}

/** All contacts for the signed-in user, newest first. */
export async function fetchMyAudience() {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('contacts')
    .select('id, full_name, email, platform, engagement_score, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/** Insert a new contact for the signed-in user; returns the created row. */
export async function addContact({ full_name, email, platform }) {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('contacts')
    .insert({ user_id: userId, full_name, email, platform })
    .select('id, full_name, email, platform, engagement_score, created_at')
    .single()

  if (error) throw error
  return data
}
