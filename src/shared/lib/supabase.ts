// =============================================================
// Ficium — Supabase client (single source of truth)
//
// ONE GoTrueClient owned by `supabase` (public schema).
// Schema-scoped clients (institutionDb, adminDb) are created
// WITHOUT their own auth config — they inherit the session by
// reading the token from the primary client on every request
// via a custom global fetch interceptor.
//
// This eliminates the "Multiple GoTrueClient instances detected"
// warning and the 403s caused by RLS seeing an anonymous session
// on the secondary clients.
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

/** Primary client — public schema. Owns the ONE GoTrueClient / auth session. */
export const supabase: AnyClient = createClient(url, key, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
    storageKey:         "ficium-auth",
  },
});

export type SchemaName = "public" | "institution" | "admin";

// Schema-scoped clients are cached — no duplicate instances.
const schemaClients = new Map<SchemaName, AnyClient>();
schemaClients.set("public", supabase);

/**
 * Returns a Supabase client scoped to the given Postgres schema.
 *
 * Schema clients do NOT have their own GoTrueClient. Instead, a
 * custom global fetch interceptor injects the Authorization header
 * from the primary client's live session before every request,
 * so RLS sees the correct authenticated user.
 */
export function db(schema: SchemaName = "public"): AnyClient {
  if (schema === "public") return supabase;
  const cached = schemaClients.get(schema);
  if (cached) return cached;

  const client: AnyClient = createClient(url, key, {
    db:   { schema },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        // Inject the live session token from the primary client
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const headers = new Headers((init as RequestInit | undefined)?.headers);
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return fetch(input as RequestInfo, { ...(init as RequestInit | undefined), headers });
      },
    },
  });

  schemaClients.set(schema, client);
  return client;
}

/** Convenience exports for the two non-public schemas. */
export const institutionDb: AnyClient = db("institution");
export const adminDb:       AnyClient = db("admin");
