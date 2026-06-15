import { createClient } from '@supabase/supabase-js'

// Vite exposes env vars prefixed with VITE_ on import.meta.env.
// These are read from the project-root .env file.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loud during development so a missing/placeholder .env is obvious
  // instead of producing confusing network errors later.
  console.error(
    'Missing Supabase env vars. Add VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_ANON_KEY to your .env file, then restart the dev server.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
