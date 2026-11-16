import { describe, expect, it, vi } from "vitest";
import { sign } from "@ficium/contract";
import { receiveAdminApp, type AdminAppDeps } from "./admin-app";

const KEY = "admin-sync-test-key";
const raw = (b: unknown) => Buffer.from(JSON.stringify(b));
const signed = (b: Buffer, key = KEY) => sign(b, Buffer.from(key));
const STATS = { generated_at: "2026-11-16T08:00:00Z", policy: [], versions: [{ platform: "ios", app_version: "1.0.0", active_7d: 3, active_30d: 5 }] };
const deps = (): AdminAppDeps => ({ stats: vi.fn(async () => STATS) });

describe("admin app monitoring over HTTPS", () => {
  it("returns the stats for a correctly signed request", async () => {
    const d = deps(); const b = raw({ action: "stats" });
    const r = await receiveAdminApp(b, signed(b), [KEY], d);
    expect(r.status).toBe(200);
    expect((r.body as any).stats).toEqual(STATS);
  });

  it("refuses an unknown action without reading anything", async () => {
    const d = deps(); const b = raw({ action: "set-policy", min_version: "9.0.0" });
    const r = await receiveAdminApp(b, signed(b), [KEY], d);
    expect(r.status).toBe(422);
    expect((r.body as any).error).toBe("unknown_action");
    expect(d.stats).not.toHaveBeenCalled();
  });

  it("refuses a bad or missing signature, and a body signed with another key", async () => {
    const d = deps(); const b = raw({ action: "stats" });
    expect((await receiveAdminApp(b, "", [KEY], d)).status).toBe(401);
    expect((await receiveAdminApp(b, signed(b, "another-key"), [KEY], d)).status).toBe(401);
    expect((await receiveAdminApp(raw({ action: "stats", x: 1 }), signed(b), [KEY], d)).status).toBe(401);
    expect(d.stats).not.toHaveBeenCalled();
  });

  it("is off when no verification key is configured, and refuses an oversized body", async () => {
    const d = deps(); const b = raw({ action: "stats" });
    expect((await receiveAdminApp(b, signed(b), [], d)).status).toBe(503);
    const big = raw({ action: "stats", pad: "x".repeat(400) });
    expect((await receiveAdminApp(big, signed(big), [KEY], d)).status).toBe(413);
    expect(d.stats).not.toHaveBeenCalled();
  });
});
