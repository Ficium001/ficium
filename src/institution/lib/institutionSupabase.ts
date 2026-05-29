// =============================================================
// Ficium 3 — Institution Supabase Client
// Separate client scoped to institution.* schema.
// Import this (not the public client) in all institution pages.
// =============================================================
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

// Institution schema client — all queries default to institution.*
export const institutionSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'institution' },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'ficium-institution-session',
  },
})

// Public schema client — for cross-schema reads (client_requests etc.)
export const publicSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'public' },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'ficium-institution-session', // same session
  },
})

export default institutionSupabase
