import { describe, expect, it, vi } from "vitest";
import { sign, verify, SIGNATURE_HEADER } from "@ficium/contract";
import { dispatchOnce, encode, receive, type Envelope, type OutboxStore } from "./core";

const I2B = "i2b-test-key";
const B2I = "b2i-test-key";
const ping = (source: "borrower" | "institution" = "institution"): Envelope => ({
  id: "evt_0123456789abcdef", type: "ping", version: 1, source,
  occurred_at: "2026-10-01T09:00:00Z", aggregate_id: "ping", sequence: 1, data: {},
});
const body = (e: unknown) => Buffer.from(JSON.stringify(e));

describe("receive", () => {
  const apply = vi.fn(async () => "apply" as const);
  const appliers = { ping: apply };

  it("accepts a signed, valid ping from the institution side", async () => {
    apply.mockClear();
    const raw = body(ping());
    const r = await receive(raw, sign(raw, I2B), ["old", I2B], appliers);
    expect(r.status).toBe(200);
    expect(apply).toHaveBeenCalledOnce();
  });

  it("rejects bad, tampered and missing signatures without applying", async () => {
    apply.mockClear();
    const raw = body(ping());
    expect((await receive(raw, sign(raw, "wrong"), [I2B], appliers)).status).toBe(401);
    expect((await receive(raw, "", [I2B], appliers)).status).toBe(401);
    const tampered = body({ ...ping(), sequence: 9 });
    expect((await receive(tampered, sign(raw, I2B), [I2B], appliers)).status).toBe(401);
    expect(apply).not.toHaveBeenCalled();
  });

  it("rejects contract violations, wrong source and unhandled types", async () => {
    apply.mockClear();
    const v2 = body({ ...ping(), version: 2 });
    expect((await receive(v2, sign(v2, I2B), [I2B], appliers)).status).toBe(422);
    const fromBorrower = body(ping("borrower"));
    expect((await receive(fromBorrower, sign(fromBorrower, I2B), [I2B], appliers)).status).toBe(403);
    const r = await receive(body(ping()), sign(body(ping()), I2B), [I2B], {});
    expect(r.status).toBe(501);
    expect(apply).not.toHaveBeenCalled();
  });

  it("is disabled with no verify keys", async () => {
    expect((await receive(body(ping()), "", [], appliers)).status).toBe(503);
  });
});

describe("dispatchOnce", () => {
  const store = (): OutboxStore & { log: string[] } => {
    const log: string[] = [];
    return {
      log,
      claim: async () => [{ id: "evt_0123456789abcdef", envelope: ping("borrower") }],
      delivered: async (id) => void log.push(`delivered:${id}`),
      failed: async (id, e) => (log.push(`failed:${id}:${e.slice(0, 8)}`), "pending"),
    };
  };

  it("signs with the B2I key and marks delivered on 2xx", async () => {
    const s = store();
    const f = vi.fn(async (_u: string, init: RequestInit) => {
      const h = (init.headers as Record<string, string>)[SIGNATURE_HEADER];
      verify(h, init.body as Buffer, [B2I]);
      expect(JSON.parse((init.body as Buffer).toString())).toEqual(ping("borrower"));
      return new Response("{}", { status: 200 });
    });
    const counts = await dispatchOnce(s, f as unknown as typeof fetch, "https://portal.test", B2I);
    expect(counts.delivered).toBe(1);
    expect(s.log).toEqual(["delivered:evt_0123456789abcdef"]);
  });

  it("marks failed on non-2xx and on network errors", async () => {
    for (const f of [
      async () => new Response("no", { status: 503 }),
      async () => { throw new TypeError("fetch failed"); },
    ]) {
      const s = store();
      const counts = await dispatchOnce(s, f as unknown as typeof fetch, "https://portal.test", B2I);
      expect(counts.pending).toBe(1);
      expect(s.log[0]).toMatch(/^failed:/);
    }
  });

  it("encodes exactly the bytes it signs", () => {
    expect(encode(ping()).toString()).toBe(JSON.stringify(ping()));
  });
});
