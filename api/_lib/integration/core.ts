/**
 * Integration contract v1 — borrower side core logic (no I/O of its own).
 * The only channel between the borrower app and the institution app.
 * Schemas + signing come from @ficium/contract; storage is injected so this
 * module is unit-testable without a database or network.
 */
import { ContractError, SIGNATURE_HEADER, sign, validateEvent, verify } from "@ficium/contract";

export interface Envelope {
  id: string;
  type: string;
  version: number;
  source: "borrower" | "institution";
  occurred_at: string;
  aggregate_id: string;
  sequence: number;
  data: Record<string, unknown>;
}

export type InboxOutcome = "apply" | "stale" | "duplicate";

/**
 * Applies one inbound event. MUST record it in integration.inbox and apply its
 * effect in ONE transaction, so a crash can never leave an event "seen" but
 * not applied. Each type is a SQL function that calls integration.record_inbox
 * itself; `ping` has no effect, so recording it is the whole job.
 */
export type Applier = (env: Envelope) => Promise<InboxOutcome>;

export interface OutboxRow {
  id: string;
  envelope: Envelope;
}

export interface OutboxStore {
  claim(limit: number): Promise<OutboxRow[]>;
  delivered(id: string): Promise<void>;
  failed(id: string, error: string): Promise<string>;
}

export interface Result {
  status: number;
  body: Record<string, unknown>;
}

const err = (status: number, error: string, detail = ""): Result => ({ status, body: { error, detail } });

export async function receive(
  raw: Buffer,
  signatureHeader: string,
  verifyKeys: string[],
  appliers: Record<string, Applier>,
  now?: number,
): Promise<Result> {
  if (verifyKeys.length === 0) return err(503, "integration_disabled");
  try {
    verify(signatureHeader, raw, verifyKeys, now);
  } catch (e) {
    if (e instanceof ContractError) return err(401, "bad_signature");
    throw e;
  }
  let env: Envelope;
  try {
    env = JSON.parse(raw.toString("utf8")) as Envelope;
    validateEvent(env);
  } catch (e) {
    return err(422, "contract_violation", e instanceof Error ? e.message.slice(0, 500) : "");
  }
  if (env.source !== "institution") return err(403, "wrong_source");
  const apply = appliers[env.type];
  // Not recorded: the sender keeps retrying until this side can handle it.
  if (!apply) return err(501, "not_handled_yet", env.type);
  const outcome = await apply(env);
  return { status: 200, body: { status: outcome, id: env.id } };
}

/** The exact bytes that are signed and sent. */
export const encode = (env: Envelope): Buffer => Buffer.from(JSON.stringify(env), "utf8");

export async function dispatchOnce(
  store: OutboxStore,
  fetchFn: typeof fetch,
  peerUrl: string,
  signingKey: string,
  limit = 20,
): Promise<Record<string, number>> {
  const counts: Record<string, number> = { delivered: 0, pending: 0, dead: 0 };
  for (const row of await store.claim(limit)) {
    // Never send anything that breaks the contract (e.g. an employer name in Phase 1). Events are built in SQL,
    // which cannot validate against the JSON Schema, so this is the gate. A violation is a failure like any other:
    // it is recorded and retried, and it blocks later events of the same aggregate (ordered delivery).
    try {
      validateEvent(row.envelope);
    } catch (e) {
      const reason = `contract violation: ${e instanceof Error ? e.message.slice(0, 300) : "invalid envelope"}`;
      const outcome = await store.failed(row.id, reason);
      counts[outcome] = (counts[outcome] ?? 0) + 1;
      console.warn(JSON.stringify({ evt: "integration_blocked_by_contract", id: row.id, type: row.envelope.type, outcome, reason }));
      continue;
    }
    const body = encode(row.envelope);
    let ok = false;
    let error = "";
    try {
      const r = await fetchFn(peerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", [SIGNATURE_HEADER]: sign(body, signingKey) },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      ok = r.status >= 200 && r.status < 300;
      if (!ok) error = `HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`;
    } catch (e) {
      error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }
    if (ok) {
      await store.delivered(row.id);
      counts.delivered += 1;
    } else {
      const outcome = await store.failed(row.id, error);
      counts[outcome] = (counts[outcome] ?? 0) + 1;
      console.warn(JSON.stringify({ evt: "integration_delivery_failed", id: row.id, type: row.envelope.type, outcome, error }));
    }
  }
  return counts;
}
