import { supabase } from './supabaseClient'

// Data layer for the Creator Public Profile & Link Hub. Reads/writes the
// public-facing columns on public.profiles via the RPCs defined in
// supabase/migrations/0006_creator_public_profiles.sql.

const PUBLIC_COLS = 'handle, display_name, bio, avatar_url, featured_video_url, is_public'

/** The signed-in user's own public-profile fields (RLS: select own). */
export async function fetchMyPublicProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in.')

  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_COLS)
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data
}

/** Save the public-profile fields. Returns the updated row. */
export async function saveMyPublicProfile(fields) {
  const { data, error } = await supabase.rpc('update_my_public_profile', {
    p_handle: fields.handle ?? null,
    p_display_name: fields.display_name ?? null,
    p_bio: fields.bio ?? null,
    p_avatar_url: fields.avatar_url ?? null,
    p_featured_video_url: fields.featured_video_url ?? null,
    p_is_public: !!fields.is_public,
  })
  if (error) throw error
  return data
}

/** Public-safe profile for a handle, or null if not found / not public. */
export async function fetchPublicProfile(handle) {
  const { data, error } = await supabase.rpc('get_public_profile', {
    p_handle: handle,
  })
  if (error) throw error
  // RPC returns a set; take the first (and only) row.
  return Array.isArray(data) ? (data[0] ?? null) : (data ?? null)
}

/** Anonymous follower joins a creator's audience via the public form. */
export async function captureLead({ handle, full_name, email }) {
  const { error } = await supabase.rpc('capture_lead', {
    p_handle: handle,
    p_full_name: full_name,
    p_email: email,
  })
  if (error) throw error
  return true
}
