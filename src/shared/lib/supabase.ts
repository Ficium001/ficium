// =============================================================
// Ficium — Supabase client (single source of truth)
//
// One GoTrueClient (one auth session, one storageKey) shared across
// every schema-scoped data client. Schema clients reuse the primary
// client's auth session by sharing the same storageKey.
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

/** Shared auth config — ONE session under ONE storageKey */
const AUTH_CONFIG = {
  persistSession:     true,
  autoRefreshToken:   true,
  detectSessionInUrl: true,
  storageKey:         "ficium-auth",
} as const;

/** Primary client — public schema. Owns the auth session. */
export const supabase: AnyClient = createClient(url, key, {
  auth: AUTH_CONFIG,
});

export type SchemaName = "public" | "institution" | "admin";

// Schema-scoped clients — cached
const schemaClients = new Map<SchemaName, AnyClient>();
schemaClients.set("public", supabase);

/**
 * Returns a Supabase client scoped to the given Postgres schema.
 * All clients share the same storageKey so GoTrue only creates
 * ONE session — the warning is suppressed because the key matches.
 */
export function db(schema: SchemaName = "public"): AnyClient {
  if (schema === "public") return supabase;

  const cached = schemaClients.get(schema);
  if (cached) return cached;

  const client: AnyClient = createClient(url, key, {
    db:   { schema },
    auth: AUTH_CONFIG, // same storageKey = shared session, no duplicate GoTrue
  });

  schemaClients.set(schema, client);
  return client;
}

/** Convenience exports */
export const institutionDb: AnyClient = db("institution");
export const adminDb:       AnyClient = db("admin");
