import { createClient } from '@supabase/supabase-js'

// Vite exposes VITE_-prefixed env vars on import.meta.env (read from .env
// locally, or from the host's env vars in CI/Vercel).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const configured = Boolean(supabaseUrl && supabaseAnonKey)

if (!configured) {
  // Don't throw at import (that white-screens the whole app). Warn instead —
  // the UI still renders on demo data; auth + live rooms just stay offline
  // until VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are provided (locally via
  // .env, or in the Vercel project's Environment Variables for a deploy).
  console.warn(
    'Supabase env vars missing — running in offline/demo mode. Set ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable auth & live data.',
  )
}

// Harmless placeholders keep createClient() from throwing when unconfigured;
// any real call simply fails gracefully (callers already fall back to demo
// data / logged-out state).
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
)

export const isSupabaseConfigured = configured
