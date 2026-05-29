// =============================================================
// Ficium 3 — Institution Supabase Client
// Uses same env vars as the main app (VITE_SUPABASE_URL +
// VITE_SUPABASE_PUBLISHABLE_KEY). Scoped to institution schema.
// =============================================================
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Graceful fallback — avoids hard crash on import if env vars missing
const url = SUPABASE_URL ?? "";
const key = SUPABASE_KEY ?? "";

// Institution schema client — all queries target institution.*
export const institutionSupabase = createClient(url, key, {
  db: { schema: "institution" },
  auth: {
    persistSession:   true,
    autoRefreshToken: true,
    storageKey:       "ficium-institution-session",
  },
});

// Public schema client — for cross-schema reads (client_requests etc.)
export const publicSupabase = createClient(url, key, {
  db: { schema: "public" },
  auth: {
    persistSession:   true,
    autoRefreshToken: true,
    storageKey:       "ficium-institution-session",
  },
});

export default institutionSupabase;
