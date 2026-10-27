import { describe, expect, it, vi } from "vitest";
import { sign } from "@ficium/contract";
import { receiveAdminSync, type SyncEvent } from "./admin-sync";

const KEY = "admin-sync-test-key";
const ev: SyncEvent = {
  event_id: "0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b", topic: "kyc.policy_changed", aggregate_type: "kyc_policy",
  aggregate_id: "kyc", aggregate_version: 7, payload: { face_match: true },
};
const raw = (e: unknown) => Buffer.from(JSON.stringify(e));
const signed = (b: Buffer, key = KEY) => sign(b, Buffer.from(key));

describe("admin sync over HTTPS", () => {
  it("applies a correctly signed event through the single apply function", async () => {
    const apply = vi.fn(async () => "applied");
    const b = raw(ev);
    const r = await receiveAdminSync(b, signed(b), [KEY], apply);
    expect(r).toEqual({ status: 200, body: { outcome: "applied" } });
    expect(apply).toHaveBeenCalledWith(ev);
  });

  it("passes duplicate and stale through (idempotent, versioned)", async () => {
    for (const o of ["duplicate", "stale"]) {
      const b = raw(ev);
      expect((await receiveAdminSync(b, signed(b), [KEY], async () => o)).body).toEqual({ outcome: o });
    }
  });

  it("is off without keys and refuses a wrong key or tampered body without touching the DB", async () => {
    const apply = vi.fn();
    const b = raw(ev);
    expect((await receiveAdminSync(b, signed(b), [], apply)).status).toBe(503);
    expect((await receiveAdminSync(b, signed(b, "other"), [KEY], apply)).status).toBe(401);
    const tampered = raw({ ...ev, payload: { face_match: false } });
    expect((await receiveAdminSync(tampered, signed(b), [KEY], apply)).status).toBe(401);
    expect(apply).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...ev, event_id: "nope" }],
    [{ ...ev, topic: "DROP TABLE" }],
    [{ ...ev, aggregate_version: 0 }],
    [{ ...ev, aggregate_version: 1.5 }],
    [{ ...ev, payload: [] }],
    [{ ...ev, aggregate_id: "" }],
  ])("rejects a malformed event %#", async (bad) => {
    const apply = vi.fn(); const b = raw(bad);
    expect((await receiveAdminSync(b, signed(b), [KEY], apply)).status).toBe(422);
    expect(apply).not.toHaveBeenCalled();
  });

  it("accepts rotated keys", async () => {
    const b = raw(ev);
    expect((await receiveAdminSync(b, signed(b, "new"), ["old", "new"], async () => "applied")).status).toBe(200);
  });
});
