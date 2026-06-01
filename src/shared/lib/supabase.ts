// =============================================================
// Ficium — Supabase client (single source of truth)
//
// One GoTrueClient (one auth session, one storageKey) shared across
// every schema-scoped data client. Creating multiple createClient()
// instances with their own auth produces divergent sessions where
// one client is signed in and another is anonymous, silently
// breaking RLS-gated reads (the root cause of the empty marketplace).
//
// Usage:
//   import { supabase }      from "@/shared/lib/supabase"; // public schema
//   import { institutionDb } from "@/shared/lib/supabase"; // institution schema
//   import { adminDb }       from "@/shared/lib/supabase"; // admin schema
//   import { db }            from "@/shared/lib/supabase"; // db("institution")
// =============================================================
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = ReturnType<typeof createClient<any, any, any>>;

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!URL || !KEY) {
  const msg = "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY";
  if (import.meta.env.DEV) throw new Error(msg);
  else console.error(msg);
}

const url = URL ?? "";
const key = KEY ?? "";

/** Shared auth configuration — one session under one storageKey. */
const AUTH_CONFIG = {
  persistSession:     true,
  autoRefreshToken:   true,
  detectSessionInUrl: true,
  storageKey:         "ficium-auth",
} as const;

/** Default client — public schema. This owns the auth session. */
export const supabase: AnyClient = createClient(url, key, {
  auth: AUTH_CONFIG,
});

export type SchemaName = "public" | "institution" | "admin";

// Schema-scoped clients are cached — no duplicate instances.
const schemaClients = new Map<SchemaName, AnyClient>();
schemaClients.set("public", supabase);

/**
 * Returns a Supabase client scoped to the given Postgres schema.
 * All clients share the same auth session via the same storageKey,
 * so RLS sees a consistent authenticated user regardless of schema.
 */
export function db(schema: SchemaName = "public"): AnyClient {
  const cached = schemaClients.get(schema);
  if (cached) return cached;

  const client: AnyClient = createClient(url, key, {
    auth: AUTH_CONFIG,
    db:   { schema },
  });
  schemaClients.set(schema, client);
  return client;
}

/** Convenience exports for the two non-public schemas. */
export const institutionDb: AnyClient = db("institution");
export const adminDb:       AnyClient = db("admin");
