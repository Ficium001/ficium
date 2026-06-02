/**
 * api/_lib/db.ts
 * Server-side Supabase client factory (service role).
 * Never exposed to the browser.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import { Env } from "./env";

export type ServiceDb = ReturnType<typeof createClient<any, any, any>>;

export function getServiceDb(): ServiceDb {
  const url = Env.supabaseUrl();
  const key = Env.supabaseServiceKey();
  if (!url || !key) throw new Error("Supabase service role credentials not configured");
  return createClient(url, key, {
    auth:   { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-ficium-source": "api-server" } },
  }) as ServiceDb;
}

export function getServiceDbSchema(schema: "public" | "institution" | "admin"): ServiceDb {
  const url = Env.supabaseUrl();
  const key = Env.supabaseServiceKey();
  if (!url || !key) throw new Error("Supabase service role credentials not configured");
  return createClient(url, key, {
    auth:   { persistSession: false, autoRefreshToken: false },
    db:     { schema: schema as any },
    global: { headers: { "x-ficium-source": "api-server" } },
  }) as ServiceDb;
}
