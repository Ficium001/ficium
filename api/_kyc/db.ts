/**
 * api/_kyc/db.ts
 * ─────────────────────────────────────────────────────────────
 * Thin Supabase REST helpers using the service-role key, shared by
 * verify.ts (fraud checks) and scan.ts (pre-auth rate limiting).
 * supabaseQuery() is a mechanical extraction out of verify.ts —
 * behavior unchanged.
 */

import { Env } from "../_lib/env.js";

export async function supabaseQuery(path: string): Promise<unknown[]> {
  const url = Env.supabaseUrl();
  const key = Env.supabaseServiceKey();
  if (!url || !key) return [];
  try {
    const r = await fetch(`${url}/rest/v1/${path}`, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Accept": "application/json" },
    });
    if (!r.ok) return [];
    return r.json() as Promise<unknown[]>;
  } catch { return []; }
}

/** Fire-and-forget insert. Never throws — a logging failure should never block the caller. */
export async function supabaseInsert(table: string, row: Record<string, unknown>): Promise<void> {
  const url = Env.supabaseUrl();
  const key = Env.supabaseServiceKey();
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        "apikey": key, "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json", "Prefer": "return=minimal",
      },
      body: JSON.stringify(row),
    });
  } catch { /* best-effort — never block the request on a logging failure */ }
}
