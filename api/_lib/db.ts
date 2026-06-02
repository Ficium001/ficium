/**
 * api/_lib/db.ts
 * ─────────────────────────────────────────────────────────────
 * Server-side Supabase client factory (service role).
 * Uses connection pooling config for high concurrency.
 * Never exposed to the browser — service key stays server-side.
 */
import { createClient } from "@supabase/supabase-js";
import { Env } from "./env";

export type ServiceDb = ReturnType<typeof createClient>;

/**
 * Returns a service-role Supabase client.
 * In serverless functions, each invocation is isolated —
 * no shared state between requests, so no connection leaks.
 */
export function getServiceDb(): ServiceDb {
  const url = Env.supabaseUrl();
  const key = Env.supabaseServiceKey();

  if (!url || !key) {
    throw new Error("Supabase service role credentials not configured");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db:   { schema: "public" },
    global: {
      headers: { "x-ficium-source": "api-server" },
    },
  });
}

/** Schema-scoped variant — for institution/admin schema queries */
export function getServiceDbSchema(schema: "public" | "institution" | "admin"): ServiceDb {
  const url = Env.supabaseUrl();
  const key = Env.supabaseServiceKey();

  if (!url || !key) throw new Error("Supabase service role credentials not configured");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db:   { schema },
    global: { headers: { "x-ficium-source": "api-server" } },
  });
}
