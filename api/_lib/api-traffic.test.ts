import { describe, expect, it, vi } from "vitest";
import { sign } from "@ficium/contract";
import {
  CHANNELS, CHANNEL_KEYS, bucketOf, createTraffic, guardInbound, inboundChannel, outcomeForStatus, pausedResponse, adminSnapshot,
} from "./api-traffic";
import { dispatchOnce, type OutboxStore } from "./integration/core";
import { receiveAdminApp } from "./integration/admin-app";

type Call = { fn: string; args: any };
function fakeDb(opts: { policies?: any[]; failRecord?: boolean; failPolicy?: boolean } = {}) {
  const calls: Call[] = [];
  const db: any = {
    rpc: async (fn: string, args?: any) => {
      calls.push({ fn, args });
      if (fn === "api_traffic_record") return opts.failRecord ? { error: { message: "down" } } : { data: 1, error: null };
      if (fn === "api_channel_policies") return opts.failPolicy ? { error: { message: "down" } } : { data: opts.policies ?? [], error: null };
      if (fn === "admin_api_traffic_stats") return { data: { channels: [] }, error: null };
      return { data: null, error: null };
    },
  };
  return { db, calls };
}
const clock = (start = 1_700_000_000_000) => { let t = start; return { now: () => t, advance: (ms: number) => { t += ms; } }; };

describe("catalogue and classification", () => {
  it("matches the channels the admin database seeds for the app site", () => {
    expect(CHANNEL_KEYS.sort()).toEqual([
      "admin.channel", "ai.advisor_out", "ai.documents_out", "integration.acceptance_out", "integration.documents_out", "integration.events_in",
      "integration.events_out", "internal.service_in", "kyc.aws_out", "kyc.vision_out",
    ]);
  });
  it("only the admin channel is locked", () => {
    expect(CHANNEL_KEYS.filter((k) => !CHANNELS[k].pausable)).toEqual(["admin.channel"]);
  });
  it.each([
    ["events", "POST", "integration.events_in"], ["admin-sync", "POST", "admin.channel"], ["admin-kyc", "POST", "admin.channel"],
    ["admin-clients", "POST", "admin.channel"], ["admin-app", "POST", "admin.channel"], [null, "POST", "internal.service_in"],
    ["dispatch", "POST", null], ["events", "OPTIONS", null],
  ])("op %s %s -> %s", (op, method, expected) => { expect(inboundChannel(op, method)).toBe(expected); });
  it("buckets latency by upper bound", () => {
    expect([0, 50, 51, 100, 5000, 5001].map(bucketOf)).toEqual([0, 0, 1, 1, 6, 7]);
    expect([200, 301, 404, 500, 503].map(outcomeForStatus)).toEqual(["ok", "ok", "client_error", "server_error", "server_error"]);
  });
});

describe("recorder", () => {
  it("batches counts per channel-hour and writes them in one call", async () => {
    const { db, calls } = fakeDb(); const c = clock();
    const t = createTraffic({ db: () => db, now: c.now });
    t.record("ai.advisor_out", "ok", 20); t.record("ai.advisor_out", "ok", 700);
    t.record("ai.advisor_out", "client_error", 5000); t.record("ai.advisor_out", "server_error", 9000, "HTTP 529");
    t.record("ai.advisor_out", "blocked");
    await t.flush();
    expect(calls).toHaveLength(1);
    const [row] = calls[0].args.p_rows;
    expect(row).toMatchObject({ channel: "ai.advisor_out", total: 5, ok: 2, client_errors: 1, server_errors: 1, blocked: 1 });
    expect(row.lat).toEqual([1, 0, 0, 0, 1, 0, 1, 1]);
    expect(calls[0].args.p_status[0]).toMatchObject({ channel: "ai.advisor_out", error: "HTTP 529" });
    expect(row.hour).toBe(new Date(c.now() - (c.now() % 3_600_000)).toISOString());
    await t.flush(); expect(calls).toHaveLength(1);   // nothing left to write
  });

  it("writes at once when idle, at most once per window when busy", async () => {
    const { db, calls } = fakeDb(); const c = clock();
    const t = createTraffic({ db: () => db, now: c.now });
    t.record("kyc.aws_out", "ok", 10); await t.flushIfDue();          // idle: written now
    expect(calls).toHaveLength(1);
    for (let i = 0; i < 50; i++) { c.advance(100); t.record("kyc.aws_out", "ok", 10); await t.flushIfDue(); }
    expect(calls.length).toBeLessThanOrEqual(1 + 1);                   // 5 s of traffic: still one window
    c.advance(10_000); t.record("kyc.aws_out", "ok", 10); await t.flushIfDue();
    expect(calls.length).toBeLessThanOrEqual(3);
  });

  it("keeps the counts when a write fails and sends them next time", async () => {
    const bad = fakeDb({ failRecord: true }); const c = clock();
    const t = createTraffic({ db: () => bad.db, now: c.now });
    t.record("kyc.vision_out", "ok", 10); await t.flush();
    const good = fakeDb();
    const t2 = createTraffic({ db: () => bad.db, now: c.now });
    t2.record("kyc.vision_out", "ok", 10); await t2.flush();
    t2.record("kyc.vision_out", "ok", 10);
    const orig = bad.db.rpc; bad.db.rpc = good.db.rpc;
    await t2.flush();
    expect(good.calls[0].args.p_rows[0].total).toBe(2);               // the failed write's count came back
    bad.db.rpc = orig;
  });

  it("survives a database that cannot even be constructed", async () => {
    const t = createTraffic({ db: () => { throw new Error("no creds"); } });
    t.record("ai.advisor_out", "ok", 1);
    await expect(t.flush()).resolves.toBeUndefined();
    await expect(t.flush()).resolves.toBeUndefined();                  // and is not stuck afterwards
  });

  it("scrubs: error text is capped and only failures set it", async () => {
    const { db, calls } = fakeDb(); const t = createTraffic({ db: () => db });
    t.record("ai.advisor_out", "client_error", 5, "secret-looking"); t.record("ai.advisor_out", "network_error", 5, "x".repeat(900));
    await t.flush();
    expect(calls[0].args.p_status[0].error).toHaveLength(300);
  });

  it("start() reports once, with status or error", async () => {
    const { db, calls } = fakeDb(); const t = createTraffic({ db: () => db });
    const a = t.start("integration.acceptance_out"); a.status(502); a.ok();
    const b = t.start("integration.acceptance_out"); b.fail(new TypeError("boom"));
    const d = t.start("integration.acceptance_out"); d.refused();
    await t.flush();
    expect(calls[0].args.p_rows[0]).toMatchObject({ total: 3, server_errors: 1, network_errors: 1, client_errors: 1, ok: 0 });
  });
});

describe("policy", () => {
  it("pauses only pausable channels, ignores older versions, refreshes at most every 5 s", async () => {
    const { db, calls } = fakeDb({ policies: [
      { channel: "ai.advisor_out", state: "paused", version: 3 }, { channel: "admin.channel", state: "paused", version: 9 },
    ] });
    const c = clock(); const t = createTraffic({ db: () => db, now: c.now });
    expect(await t.paused("ai.advisor_out")).toBe(true);
    expect(await t.paused("admin.channel")).toBe(false);
    expect(await t.paused("kyc.aws_out")).toBe(false);
    expect(calls.filter((x) => x.fn === "api_channel_policies")).toHaveLength(1);
    c.advance(6000); await t.paused("ai.advisor_out");
    expect(calls.filter((x) => x.fn === "api_channel_policies")).toHaveLength(2);
    t._policy.set("ai.advisor_out", { state: "enabled", version: 2 });  // stale write cannot win
  });

  it("keeps the last known state when the database cannot be read, and fails open before any read", async () => {
    const good = fakeDb({ policies: [{ channel: "ai.advisor_out", state: "paused", version: "4" }] });
    const c = clock(); let broken = false;
    const failing = fakeDb({ failPolicy: true });
    const t = createTraffic({ db: () => (broken ? failing.db : good.db), now: c.now });
    expect(await t.paused("ai.advisor_out")).toBe(true);
    broken = true; c.advance(6000);
    expect(await t.paused("ai.advisor_out")).toBe(true);               // still obeyed
    const cold = createTraffic({ db: () => failing.db });
    expect(await cold.paused("ai.advisor_out")).toBe(false);            // never read: enabled
  });
});

describe("inbound guard", () => {
  const res = () => { const r: any = { statusCode: 200, headers: {} as Record<string, string>, body: undefined as unknown };
    r.status = (n: number) => { r.statusCode = n; return r; }; r.json = (b: unknown) => { r.body = b; return r; };
    r.setHeader = (k: string, v: string) => { r.headers[k] = v; }; return r; };

  it("answers 503 channel_paused with Retry-After and never runs the handler", async () => {
    const { db, calls } = fakeDb({ policies: [{ channel: "integration.events_in", state: "paused", version: 1 }] });
    const t = createTraffic({ db: () => db }); const r = res(); const run = vi.fn();
    await guardInbound("integration.events_in", r, run, t);
    expect(run).not.toHaveBeenCalled();
    expect(r.statusCode).toBe(503); expect(r.body).toMatchObject({ error: "channel_paused" });
    expect(r.headers["Retry-After"]).toBe("30");
    expect(calls.find((x) => x.fn === "api_traffic_record")?.args.p_rows[0]).toMatchObject({ blocked: 1, total: 1 });
  });

  it("records the outcome of a handler that ran, and rethrows a crash after counting it", async () => {
    const { db, calls } = fakeDb(); const t = createTraffic({ db: () => db });
    const ok = res(); await guardInbound("internal.service_in", ok, async () => { ok.status(404).json({}); }, t);
    await expect(guardInbound("internal.service_in", res(), async () => { throw new RangeError("x"); }, t)).rejects.toThrow("x");
    await t.flush();
    const rows = calls.filter((x) => x.fn === "api_traffic_record").flatMap((x) => x.args.p_rows);
    expect(rows.reduce((n: number, r: any) => n + r.client_errors, 0)).toBe(1);
    expect(rows.reduce((n: number, r: any) => n + r.server_errors, 0)).toBe(1);
  });

  it("does nothing for a call that is not on a channel", async () => {
    const run = vi.fn(async () => {}); await guardInbound(null, res(), run); expect(run).toHaveBeenCalledOnce();
  });

  it("a paused response sets no-store", () => { const r = res(); pausedResponse(r); expect(r.headers["Cache-Control"]).toBe("no-store"); });
});

describe("dispatcher", () => {
  const env = { id: "evt_0123456789abcdef", type: "ping", version: 1, source: "borrower", occurred_at: "2026-10-01T09:00:00Z",
    aggregate_id: "ping", sequence: 1, data: {} } as any;
  const store = (over: Partial<OutboxStore> = {}): OutboxStore & Record<string, any> => ({
    claim: vi.fn(async () => [{ id: "e1", envelope: env }]), delivered: vi.fn(async () => {}), failed: vi.fn(async () => "pending"), ...over,
  });
  const reply = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

  it("claims nothing while paused", async () => {
    const s = store();
    const counts = await dispatchOnce(s, vi.fn() as any, "https://p", "k", 20, { isPaused: async () => true });
    expect(s.claim).not.toHaveBeenCalled(); expect(counts).toEqual({ delivered: 0, pending: 0, dead: 0 });
  });

  it("holds an event when the portal answers 503 channel_paused: no attempt used, not a failure", async () => {
    const s = store({ deferred: vi.fn(async () => {}) });
    const timer = { status: vi.fn(), fail: vi.fn() };
    const counts = await dispatchOnce(s, reply(503, { error: "channel_paused" }) as any, "https://p", "k", 20, { timer: () => timer });
    expect(counts.pending).toBe(1);
    expect(s.deferred).toHaveBeenCalledWith("e1"); expect(s.failed).not.toHaveBeenCalled(); expect(timer.status).not.toHaveBeenCalled();
  });

  it("any other 503 is an ordinary failure and is counted", async () => {
    const s = store({ deferred: vi.fn(async () => {}) });
    const timer = { status: vi.fn(), fail: vi.fn() };
    await dispatchOnce(s, reply(503, { error: "overloaded" }) as any, "https://p", "k", 20, { timer: () => timer });
    expect(s.deferred).not.toHaveBeenCalled(); expect(s.failed).toHaveBeenCalled(); expect(timer.status).toHaveBeenCalledWith(503);
  });

  it("reports a send that got no answer", async () => {
    const s = store(); const timer = { status: vi.fn(), fail: vi.fn() };
    await dispatchOnce(s, vi.fn(async () => { throw new TypeError("fetch failed"); }) as any, "https://p", "k", 20, { timer: () => timer });
    expect(timer.fail).toHaveBeenCalled(); expect(s.failed).toHaveBeenCalled();
  });
});

describe("fetch wrapper", () => {
  it("makes no request while paused and answers a synthetic 503 channel_paused", async () => {
    const { db, calls } = fakeDb({ policies: [{ channel: "kyc.aws_out", state: "paused", version: 1 }] });
    const t = createTraffic({ db: () => db }); const base = vi.fn();
    const r = await t.fetch("kyc.aws_out", base as any)("https://x");
    expect(base).not.toHaveBeenCalled();
    expect(r.status).toBe(503); expect(await r.json()).toEqual({ error: "channel_paused" }); expect(r.headers.get("Retry-After")).toBe("30");
    expect(calls.find((x) => x.fn === "api_traffic_record")?.args.p_rows[0]).toMatchObject({ blocked: 1 });
  });
  it("counts a real call by its status, and a network failure, and rethrows", async () => {
    const { db, calls } = fakeDb(); const t = createTraffic({ db: () => db });
    await t.fetch("ai.advisor_out", vi.fn(async () => new Response("", { status: 529 })) as any)("https://x");
    await expect(t.fetch("ai.advisor_out", vi.fn(async () => { throw new TypeError("down"); }) as any)("https://x")).rejects.toThrow("down");
    await t.flush();
    const rows = calls.filter((x) => x.fn === "api_traffic_record").flatMap((x) => x.args.p_rows);
    expect(rows.reduce((n: number, r: any) => n + r.server_errors, 0)).toBe(1);
    expect(rows.reduce((n: number, r: any) => n + r.network_errors, 0)).toBe(1);
  });
  it("never blocks the locked admin channel even if a pause for it exists", async () => {
    const { db } = fakeDb({ policies: [{ channel: "admin.channel", state: "paused", version: 5 }] });
    const t = createTraffic({ db: () => db });
    const base = vi.fn(async () => new Response("ok"));
    expect((await t.fetch("admin.channel", base as any)("https://x")).status).toBe(200);
  });
});

describe("admin read", () => {
  it("asks the database for exactly the catalogue", async () => {
    const { db, calls } = fakeDb(); await adminSnapshot(db);
    expect(calls[0]).toEqual({ fn: "admin_api_traffic_stats", args: { p_channels: CHANNEL_KEYS } });
  });
  it("is served over the signed admin-app channel as { traffic } and unknown actions stay refused", async () => {
    const KEY = "k"; const body = (o: unknown) => Buffer.from(JSON.stringify(o));
    const ask = (a: unknown, deps: any) => { const b = body(a); return receiveAdminApp(b, sign(b, Buffer.from(KEY)), [KEY], deps); };
    const traffic = vi.fn(async () => ({ channels: [] }));
    expect(await ask({ action: "traffic" }, { stats: vi.fn(), traffic })).toEqual({ status: 200, body: { traffic: { channels: [] } } });
    expect((await ask({ action: "traffic" }, { stats: vi.fn() })).status).toBe(422);
    expect((await ask({ action: "nope" }, { stats: vi.fn(), traffic })).status).toBe(422);
  });
});
