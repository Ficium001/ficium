/** Supabase-backed stores for the integration core (service_role only). */
import type { ServiceDb } from "../db.js";
import type { Applier, Envelope, InboxOutcome, OutboxStore } from "./core.js";

export function outboxStore(db: ServiceDb): OutboxStore {
  return {
    async claim(limit) {
      const { data, error } = await db.rpc("integration_claim_batch", { p_limit: limit, p_lease_seconds: 60 });
      if (error) throw new Error(`claim_batch: ${error.message}`);
      return ((data ?? []) as Array<{ id: string; envelope: Envelope }>).map((r) => ({ id: r.id, envelope: r.envelope }));
    },
    async delivered(id) {
      const { error } = await db.rpc("integration_mark_delivered", { p_id: id });
      if (error) throw new Error(`mark_delivered: ${error.message}`);
    },
    async failed(id, err) {
      const { data, error } = await db.rpc("integration_mark_failed", { p_id: id, p_error: err });
      if (error) throw new Error(`mark_failed: ${error.message}`);
      return String(data);
    },
  };
}

/** Appliers per event type. Add one per type as each migration step lands. */
export function appliers(db: ServiceDb): Record<string, Applier> {
  return {
    ping: async (env) => {
      const { data, error } = await db.rpc("integration_record_inbox", {
        p_event_id: env.id,
        p_type: env.type,
        p_source: env.source,
        p_aggregate_id: env.aggregate_id,
        p_sequence: env.sequence,
      });
      if (error) throw new Error(`record_inbox: ${error.message}`);
      console.log(JSON.stringify({ evt: "integration_ping_received", id: env.id, sequence: env.sequence, outcome: data }));
      return data as InboxOutcome;
    },
    // Step 4 (shadow mode): bids published by the institution side. ONE RPC = one transaction, so the
    // inbox record and the change to integration.bid_shadow commit together or not at all.
    "bid.placed": (env) => applyBid(db, env),
    "bid.updated": (env) => applyBid(db, env),
    "bid.withdrawn": (env) => applyBid(db, env),
  };
}

async function applyBid(db: ServiceDb, env: Envelope): Promise<InboxOutcome> {
  const { data, error } = await db.rpc("integration_apply_bid_event", { p_env: env });
  if (error) throw new Error(`apply_bid_event: ${error.message}`);
  return data as InboxOutcome;
}
