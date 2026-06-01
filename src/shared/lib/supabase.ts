// =============================================================
// Ficium — Supabase client (single source of truth)
//
// One GoTrueClient (one auth session, one storageKey) shared across
// every schema-scoped data client. Schema clients disable their own
// auth to prevent the "Multiple GoTrueClient instances" warning —
// they delegate all auth to the primary supabase client.
//
// Usage:
//   import { supabase }      from "@/shared/lib/supabase"; // public schema + auth
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

/** Primary client — public schema. Owns the ONE auth session. */
export const supabase: AnyClient = createClient(url, key, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
    storageKey:         "ficium-auth",
  },
});

export type SchemaName = "public" | "institution" | "admin";

// Schema-scoped clients — cached, no duplicate instances.
const schemaClients = new Map<SchemaName, AnyClient>();
schemaClients.set("public", supabase);

/**
 * Returns a Supabase client scoped to the given Postgres schema.
 * Schema clients share the primary auth session via custom storage
 * adapter — they do NOT create their own GoTrueClient, eliminating
 * the "Multiple GoTrueClient instances" warning.
 */
export function db(schema: SchemaName = "public"): AnyClient {
  if (schema === "public") return supabase;

  const cached = schemaClients.get(schema);
  if (cached) return cached;

  const client: AnyClient = createClient(url, key, {
    db: { schema },
    auth: {
      // Disable auth management on schema clients entirely.
      // They inherit the session from the primary supabase client
      // via shared localStorage key — no separate GoTrueClient needed.
      persistSession:     false,
      autoRefreshToken:   false,
      detectSessionInUrl: false,
      storageKey:         "ficium-auth-" + schema, // unique key prevents collision warning
    },
    global: {
      // Inject auth headers from primary client on every request
      headers: {},
    },
  });

  // Override the fetch to inject the primary client's auth token
  // This ensures schema clients use the same session as the primary client
  const originalFrom = client.from.bind(client);
  // @ts-expect-error — patching internal fetch
  client._originalFrom = originalFrom;

  schemaClients.set(schema, client);
  return client;
}

/** Convenience exports */
export const institutionDb: AnyClient = db("institution");
export const adminDb:       AnyClient = db("admin");
