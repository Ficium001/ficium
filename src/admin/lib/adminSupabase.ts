// =============================================================
// Ficium 3 — Admin Supabase Clients
// Three schema-scoped clients for the admin panel.
// All use the same env vars as the main app.
// =============================================================
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL  as string ?? "";
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string ?? "";

// institution.* — read institution tables
export const institutionDb = createClient(URL, KEY, {
  db: { schema: "institution" },
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "ficium-admin-session" },
});

// admin.* — read admin views (institution_overview, unified_audit, etc.)
export const adminDb = createClient(URL, KEY, {
  db: { schema: "admin" },
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "ficium-admin-session" },
});

// public.* — read public tables (users, audit_logs)
export const publicDb = createClient(URL, KEY, {
  db: { schema: "public" },
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "ficium-admin-session" },
});
