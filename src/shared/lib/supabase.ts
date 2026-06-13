// =============================================================
// Ficium — Supabase client (single source of truth)
//
// ONE active GoTrueClient — owned by `supabase` (public schema).
// Schema-scoped clients (institutionDb, adminDb) are created with
// a no-op in-memory storage so their GoTrueClient never touches
// localStorage and never collides with the primary session key.
// Auth tokens are injected per-request via a fetch interceptor
// that reads the live session from the primary client.
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

/** Primary client — public schema. Owns the ONE real GoTrueClient / auth session. */
export const supabase: AnyClient = createClient(url, key, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
    storageKey:         "ficium-auth",
  },
});

export type SchemaName = "public" | "institution" | "admin";

/**
 * A no-op storage adapter — schema clients use this so their internal
 * GoTrueClient never reads/writes localStorage and never triggers the
 * "multiple GoTrueClient instances" warning.
 */
const nullStorage = {
  getItem:    (_key: string) => null,
  setItem:    (_key: string, _val: string) => {},
  removeItem: (_key: string) => {},
};

// Schema-scoped clients are cached — no duplicate instances.
const schemaClients = new Map<SchemaName, AnyClient>();
schemaClients.set("public", supabase);

/**
 * Returns a Supabase client scoped to the given Postgres schema.
 * Uses a no-op storage + fetch interceptor so:
 *  - No extra GoTrueClient warnings
 *  - RLS always sees the authenticated user via injected Bearer token
 */
export function db(schema: SchemaName = "public"): AnyClient {
  if (schema === "public") return supabase;
  const cached = schemaClients.get(schema);
  if (cached) return cached;

  const client: AnyClient = createClient(url, key, {
    db:   { schema },
    auth: {
      persistSession:     false,
      autoRefreshToken:   false,
      detectSessionInUrl: false,
      storage:            nullStorage,
      // Unique per-schema key so each schema client's internal GoTrueClient
      // owns a distinct storageKey. Without this they all default to the same
      // key, which trips supabase-js's "multiple GoTrueClient instances"
      // warning. Combined with nullStorage, nothing is ever persisted.
      storageKey:         `ficium-${schema}-noauth`,
    },
    global: {
      fetch: async (input, init) => {
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
