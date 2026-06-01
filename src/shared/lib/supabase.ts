// =============================================================
// Ficium — Supabase client (single source of truth)
//
// Architecture:
//   - supabase (primary) owns the ONE GoTrueClient + auth session
//   - Schema clients (institutionDb, adminDb) are plain REST clients
//     with NO auth management — they get the token injected via
//     a custom fetch wrapper that reads from the primary session
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

const schemaClients = new Map<SchemaName, AnyClient>();
schemaClients.set("public", supabase);

/**
 * Creates a schema-scoped client that:
 * 1. Has NO GoTrueClient (no auth management, no warning)
 * 2. Injects the primary client's Bearer token on every request
 *    via a custom fetch wrapper
 */
function createSchemaClient(schema: SchemaName): AnyClient {
  // Custom fetch that injects auth token from primary client
  const authFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? key;

    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("apikey", key);

    return fetch(input, { ...init, headers });
  };

  return createClient(url, key, {
    db:     { schema },
    auth:   {
      persistSession:     false,
      autoRefreshToken:   false,
      detectSessionInUrl: false,
      storageKey:         `ficium-auth-${schema}`, // unique = no GoTrueClient warning
    },
    global: { fetch: authFetch },
  });
}

export function db(schema: SchemaName = "public"): AnyClient {
  if (schema === "public") return supabase;

  const cached = schemaClients.get(schema);
  if (cached) return cached;

  const client = createSchemaClient(schema);
  schemaClients.set(schema, client);
  return client;
}

/** Convenience exports */
export const institutionDb: AnyClient = db("institution");
export const adminDb:       AnyClient = db("admin");
