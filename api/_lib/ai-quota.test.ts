import { describe, it, expect, vi, beforeEach } from "vitest";
import { consumeAiQuota, quotaRefusal, DAILY_LIMIT } from "./ai-quota.js";

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as any;

describe("consumeAiQuota", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://db.example";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "svc";
  });

  it("asks the database with the caller, the kind and the daily limit", async () => {
    const f = vi.fn().mockResolvedValue(ok({ allowed: true }));
    await expect(consumeAiQuota("u1", "chat", f)).resolves.toEqual({ allowed: true });
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toMatch(/\/rest\/v1\/rpc\/consume_ai_quota$/);
    expect(JSON.parse(init.body)).toEqual({ p_client_id: "u1", p_kind: "chat", p_daily_limit: DAILY_LIMIT.chat });
  });

  it("refuses with 429 at the limit", async () => {
    const q = await consumeAiQuota("u1", "market", vi.fn().mockResolvedValue(ok({ allowed: false })));
    expect(q).toEqual({ allowed: false, reason: "limit" });
    if (!q.allowed) expect(quotaRefusal(q).status).toBe(429);
  });

  it.each([
    ["the database errors", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })],
    ["the database is unreachable", vi.fn().mockRejectedValue(new Error("down"))],
  ])("fails closed when %s", async (_label, f) => {
    const q = await consumeAiQuota("u1", "chat", f as any);
    expect(q).toEqual({ allowed: false, reason: "unavailable" });
    if (!q.allowed) expect(quotaRefusal(q).status).toBe(503);
  });

  it("fails closed without a user id", async () => {
    const f = vi.fn();
    expect(await consumeAiQuota("", "chat", f)).toEqual({ allowed: false, reason: "unavailable" });
    expect(f).not.toHaveBeenCalled();
  });
});
