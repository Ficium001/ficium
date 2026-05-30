// =============================================================
// Ficium — Supabase client (single source of truth)
//
// One GoTrueClient (one auth session, one storageKey) shared across
// every schema-scoped data client. Creating multiple createClient()
// instances with their own auth — as the codebase previously did in
// 8 places — produces divergent sessions where one client is signed
// in and another is anonymous, which silently breaks RLS-gated reads.
//
// Usage:
//   import { supabase }      from "@/shared/lib/supabase";  // public schema (default)
//   import { db }            from "@/shared/lib/supabase";  // db("institution"), db("admin")
// =============================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!URL || !KEY) {
  // Fail loud in dev, soft in prod — a missing key should surface immediately
  // during development but never hard-crash a deployed bundle on import.
  const msg = "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY";
  if (import.meta.env.DEV) throw new Error(msg);
  else console.error(msg);
}

const url = URL ?? "";
const key = KEY ?? "";

/** Shared auth configuration — one session persisted under one key. */
const AUTH_CONFIG = {
  persistSession:   true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
  storageKey:       "ficium-auth",
} as const;

/** Default client — public schema. This owns the auth session. */
export const supabase: SupabaseClient = createClient(url, key, {
  auth: AUTH_CONFIG,
});

export type SchemaName = "public" | "institution" | "admin";

// Schema-scoped clients are cached so we never spawn duplicates.
const schemaClients = new Map<SchemaName, SupabaseClient>();
schemaClients.set("public", supabase);

/**
 * Returns a Supabase client scoped to the given Postgres schema.
 * All clients share the same auth session as the default `supabase`
 * client, so RLS sees a consistent authenticated user everywhere.
 */
export function db(schema: SchemaName = "public"): SupabaseClient {
  const cached = schemaClients.get(schema);
  if (cached) return cached;

  const client = createClient(url, key, {
    auth: AUTH_CONFIG,
    db:   { schema },
  });
  schemaClients.set(schema, client);
  return client;
}

// Convenience named exports for the two non-public schemas.
export const institutionDb = db("institution");
export const adminDb       = db("admin");
