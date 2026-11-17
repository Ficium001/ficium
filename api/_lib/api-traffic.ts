/**
 * API traffic: record, pause and report on every API channel of the borrower app.
 *
 * Every call into or out of this app belongs to a CHANNEL (CHANNELS below). The app admin site
 * (ficium-admin, "API traffic") shows how each one is doing and can pause one. Three parts:
 *
 *   recorder  each call is counted in memory (per channel, per hour: outcome and latency bucket) and
 *             written as one batch (`api_traffic_record`). A server writes at most once per FLUSH_MS
 *             while busy, and right away when it was idle, so a quiet channel is never left unwritten
 *             in a server that is about to be frozen. Writes depend on channels and servers, not on
 *             request volume. Only the counts of the last few seconds of a busy server can be lost.
 *   policy    the pause state per channel, set only by admin-sync (api.channel_policy_changed) and read
 *             back at most every POLICY_MS per server. If it cannot be read, the last known state stays
 *             in force; a server that has never read it treats every channel as enabled.
 *   guard     inbound: answer 503 channel_paused + Retry-After before doing any work. Outbound: ask
 *             `paused()` first and hold the work instead of failing it.
 *
 * What is recorded about a failure is a short reason (a status or an error class), never a body,
 * address, token or person. Channels with `pausable: false` are recorded but never paused: the admin
 * channel is the only way to resume anything.
 */
import { getServiceDb, type ServiceDb } from "./db.js";

export type Channel = { direction: "inbound" | "outbound"; pausable: boolean };

export const CHANNELS = {
  "integration.events_in":      { direction: "inbound",  pausable: true },   // portal -> app, signed events
  "internal.service_in":        { direction: "inbound",  pausable: true },   // this app's own database callbacks
  "admin.channel":              { direction: "inbound",  pausable: false },  // admin site sync and reads
  "integration.events_out":     { direction: "outbound", pausable: true },   // outbox -> portal
  "integration.acceptance_out": { direction: "outbound", pausable: true },   // bid acceptance call
  "integration.documents_out":  { direction: "outbound", pausable: true },   // document release to a bank
  "kyc.aws_out":                { direction: "outbound", pausable: true },   // Rekognition
  "kyc.vision_out":             { direction: "outbound", pausable: true },   // Claude Vision
  "ai.advisor_out":             { direction: "outbound", pausable: true },   // Fia
  "ai.documents_out":           { direction: "outbound", pausable: true },   // document reading (vault extract)
} as const satisfies Record<string, Channel>;

export type ChannelKey = keyof typeof CHANNELS;
export const CHANNEL_KEYS = Object.keys(CHANNELS) as ChannelKey[];

export type Outcome = "ok" | "client_error" | "server_error" | "network_error" | "blocked";

const COLUMN: Record<Outcome, string> = {
  ok: "ok", client_error: "client_errors", server_error: "server_errors", network_error: "network_errors", blocked: "blocked",
};
/** Upper bounds in ms of the first seven latency buckets; the eighth is everything slower. */
export const LATENCY_BOUNDS_MS = [50, 100, 250, 500, 1000, 2500, 5000] as const;

export const FLUSH_MS = 10_000;
export const POLICY_MS = 5_000;
export const RETRY_AFTER_S = "30";
const ERROR_MAX = 300;

export const outcomeForStatus = (status: number): Outcome => (status >= 500 ? "server_error" : status >= 400 ? "client_error" : "ok");
export const bucketOf = (ms: number): number => {
  const i = LATENCY_BOUNDS_MS.findIndex((b) => ms <= b);
  return i === -1 ? LATENCY_BOUNDS_MS.length : i;
};
const hourOf = (t: number): string => new Date(t - (t % 3_600_000)).toISOString();

type Row = { channel: string; hour: string; total: number; ok: number; client_errors: number; server_errors: number; network_errors: number; blocked: number; lat: number[] };
type Status = { channel: string; ok_at: string | null; error_at: string | null; error: string | null };

export type TrafficDeps = { db: () => ServiceDb; now?: () => number };

export function createTraffic(deps: TrafficDeps) {
  const now = deps.now ?? Date.now;
  let rows = new Map<string, Row>();
  let status = new Map<string, Status>();
  const policy = new Map<string, { state: string; version: number }>();
  let lastFlush = 0;
  let lastPolicy = 0;
  let flushing: Promise<void> | null = null;
  let reading: Promise<void> | null = null;

  /** Count one call. `ms` is how long it took (omit for a call that was blocked, not made). */
  function record(channel: ChannelKey, outcome: Outcome, ms?: number, error?: string): void {
    if (!(channel in CHANNELS)) return;
    const t = now();
    const hour = hourOf(t);
    const key = `${channel}|${hour}`;
    let r = rows.get(key);
    if (!r) rows.set(key, (r = { channel, hour, total: 0, ok: 0, client_errors: 0, server_errors: 0, network_errors: 0, blocked: 0, lat: new Array(8).fill(0) }));
    r.total += 1;
    (r as any)[COLUMN[outcome]] += 1;
    if (ms !== undefined && outcome !== "blocked") r.lat[bucketOf(ms)] += 1;
    const at = new Date(t).toISOString();
    const s = status.get(channel) ?? { channel, ok_at: null, error_at: null, error: null };
    if (outcome === "ok") s.ok_at = at;
    if (outcome === "server_error" || outcome === "network_error") { s.error_at = at; s.error = (error ?? outcome).slice(0, ERROR_MAX); }
    status.set(channel, s);
  }

  /** Write what has been counted. A failed write puts the counts back so a blip loses nothing. */
  async function flush(): Promise<void> {
    if (flushing) return flushing;
    if (rows.size === 0 && status.size === 0) return;
    const batch = [...rows.values()], st = [...status.values()];
    rows = new Map(); status = new Map();
    lastFlush = now();
    const work = (async () => {
      try {
        const { error } = await deps.db().rpc("api_traffic_record", { p_rows: batch, p_status: st });
        if (error) throw new Error(error.message);
      } catch (e) {
        restore(batch, st);
        console.warn(JSON.stringify({ evt: "api_traffic_flush_failed", error: e instanceof Error ? e.name : "error" }));
      }
    })();
    flushing = work.finally(() => { flushing = null; });
    return flushing;
  }

  function restore(batch: Row[], st: Status[]): void {
    for (const b of batch) {
      const key = `${b.channel}|${b.hour}`, cur = rows.get(key);
      if (!cur) { rows.set(key, b); continue; }
      for (const k of ["total", "ok", "client_errors", "server_errors", "network_errors", "blocked"] as const) cur[k] += b[k];
      b.lat.forEach((v, i) => (cur.lat[i] += v));
    }
    for (const s of st) {
      const cur = status.get(s.channel);
      if (!cur) { status.set(s.channel, s); continue; }
      if (s.ok_at && (!cur.ok_at || s.ok_at > cur.ok_at)) cur.ok_at = s.ok_at;
      if (s.error_at && (!cur.error_at || s.error_at > cur.error_at)) { cur.error_at = s.error_at; cur.error = s.error; }
    }
  }

  /** Call at the end of a request: writes now unless a write happened within FLUSH_MS. */
  async function flushIfDue(): Promise<void> {
    if (now() - lastFlush >= FLUSH_MS) await flush();
  }

  async function refreshPolicy(): Promise<void> {
    if (reading) return reading;
    lastPolicy = now();
    const work = (async () => {
      try {
        const { data, error } = await deps.db().rpc("api_channel_policies");
        if (error) throw new Error(error.message);
        for (const p of (data ?? []) as Array<{ channel: string; state: string; version: number | string }>) {
          const version = Number(p.version), cur = policy.get(p.channel);
          if (!cur || version >= cur.version) policy.set(p.channel, { state: p.state, version });
        }
      } catch (e) {
        console.warn(JSON.stringify({ evt: "api_traffic_policy_read_failed", error: e instanceof Error ? e.name : "error" }));
      }
    })();
    reading = work.finally(() => { reading = null; });
    return reading;
  }

  /** Is this channel paused? Reads the policy first if the copy is older than POLICY_MS. */
  async function paused(channel: ChannelKey): Promise<boolean> {
    if (!CHANNELS[channel]?.pausable) return false;
    if (now() - lastPolicy >= POLICY_MS) await refreshPolicy();
    return policy.get(channel)?.state === "paused";
  }

  /** Time one outbound call. `done` takes the HTTP status, or an error for a call that never got an answer. */
  function start(channel: ChannelKey) {
    const t0 = now();
    let finished = false;
    const once = (fn: () => void) => { if (!finished) { finished = true; fn(); } };
    return {
      status: (code: number) => once(() => record(channel, outcomeForStatus(code), now() - t0, code >= 500 ? `HTTP ${code}` : undefined)),
      ok: () => once(() => record(channel, "ok", now() - t0)),
      /** The caller's own mistake (bad input, not a fault of the peer). */
      refused: () => once(() => record(channel, "client_error", now() - t0)),
      fail: (e: unknown) => once(() => record(channel, "network_error", now() - t0, e instanceof Error ? e.name : "error")),
      blocked: () => once(() => record(channel, "blocked")),
    };
  }

  /**
   * A `fetch` that belongs to a channel: refuses with a synthetic 503 channel_paused while the channel
   * is paused (no request is made), otherwise makes the call and counts how it went. Callers that
   * already treat a failing peer as "try again shortly" need no change.
   */
  function fetchFor(channel: ChannelKey, base: typeof fetch = fetch): typeof fetch {
    return async (input, init) => {
      if (await paused(channel)) {
        record(channel, "blocked");
        await flushIfDue();
        return new Response(JSON.stringify({ error: "channel_paused" }), {
          status: 503, headers: { "Content-Type": "application/json", "Retry-After": RETRY_AFTER_S },
        });
      }
      const t = start(channel);
      try {
        const r = await base(input, init);
        t.status(r.status);
        return r;
      } catch (e) {
        t.fail(e);
        throw e;
      } finally { await flushIfDue(); }
    };
  }

  /** Test helper: forget everything. */
  function reset(): void { rows = new Map(); status = new Map(); policy.clear(); lastFlush = 0; lastPolicy = 0; }

  return { record, flush, flushIfDue, refreshPolicy, paused, start, fetch: fetchFor, reset, _policy: policy };
}

export const traffic = createTraffic({ db: getServiceDb });

/** Which channel an inbound request to /api/internal belongs to, or null for something not counted. */
export function inboundChannel(op: string | null, method: string | undefined): ChannelKey | null {
  if (method === "OPTIONS") return null;
  if (op === "events") return "integration.events_in";
  if (op === "admin-sync" || op === "admin-kyc" || op === "admin-clients" || op === "admin-app") return "admin.channel";
  if (op === "dispatch") return null;   // the cron tick that drives events_out; counted per event sent
  return "internal.service_in";
}

type Res = { status: (n: number) => Res; json: (b: unknown) => unknown; setHeader?: (k: string, v: string) => void; statusCode?: number };

/** The answer a paused inbound channel gives. Callers retry later; nothing was changed. */
export function pausedResponse(res: Res): void {
  res.setHeader?.("Retry-After", RETRY_AFTER_S);
  res.setHeader?.("Cache-Control", "no-store");
  res.status(503).json({ error: "channel_paused", detail: "This part of the service is paused by Ficium. Try again shortly." });
}

/** Run an inbound handler under the guard and record how it went. */
export async function guardInbound(
  channel: ChannelKey | null, res: Res, run: () => Promise<void>, t = traffic,
): Promise<void> {
  if (channel === null) return run();
  if (await t.paused(channel)) {
    t.record(channel, "blocked");
    pausedResponse(res);
    await t.flushIfDue();
    return;
  }
  const t0 = Date.now();
  try {
    await run();
  } catch (e) {
    t.record(channel, "server_error", Date.now() - t0, e instanceof Error ? e.name : "error");
    await t.flushIfDue();
    throw e;
  }
  const code = res.statusCode ?? 200;
  t.record(channel, outcomeForStatus(code), Date.now() - t0, code >= 500 ? `HTTP ${code}` : undefined);
  await t.flushIfDue();
}

/** The admin site's read: last 24 hours per channel, computed in the database. */
export async function adminSnapshot(db: ServiceDb): Promise<Record<string, unknown>> {
  const { data, error } = await db.rpc("admin_api_traffic_stats", { p_channels: CHANNEL_KEYS });
  if (error) throw new Error(`admin_api_traffic_stats: ${error.message}`);
  return (data ?? {}) as Record<string, unknown>;
}
