/**
 * Schema drift: migrations this deployment was built with that the database has not applied.
 *
 * Migrations are applied by hand, and three times a merged one never was: the feature shipped and
 * failed in production. Every migration now records itself in the database's ledger
 * (admin.schema_migration). The keepalive compares that ledger with EXPECTED_MIGRATIONS and
 * answers 503 SCHEMA_DRIFT when one is missing, which fails the scheduled GitHub check.
 */
import { EXPECTED_MIGRATIONS } from "./expected-migrations.js";

/** Expected migrations missing from `applied`. `applied` is the ledger read; anything else counts as empty. */
export function missingMigrations(applied: unknown, expected: readonly string[] = EXPECTED_MIGRATIONS): string[] {
  const have = new Set(Array.isArray(applied) ? applied.filter((v): v is string => typeof v === "string") : []);
  return expected.filter((v) => !have.has(v));
}

/**
 * Reads the ledger and returns what is missing. Null when the database could not be asked
 * (network, timeout, 5xx): not knowing is not drift, and must not raise a false alarm.
 * A 404 means the ledger itself is not there yet, so everything expected is missing.
 */
export async function readDrift(url: string, serviceKey: string, f: typeof fetch = fetch): Promise<string[] | null> {
  try {
    const r = await f(`${url}/rest/v1/rpc/admin_schema_status`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(10_000),
    });
    if (r.status === 404) return [...EXPECTED_MIGRATIONS];
    if (!r.ok) return null;
    return missingMigrations(await r.json());
  } catch {
    return null;
  }
}
