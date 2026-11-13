import { vi, describe, it, expect, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("../../../shared/lib/supabase", () => ({
  supabase: { rpc: (...a: unknown[]) => rpc(...a) },
  getCachedUser: vi.fn(),
}));
vi.mock("../../../shared/lib/audit", () => ({ audit: {} }));

import { cancelRequest } from "./requests";

describe("cancelRequest", () => {
  beforeEach(() => rpc.mockReset());

  it("calls the database function with only the request id", async () => {
    rpc.mockResolvedValue({ data: { ok: true }, error: null });
    await expect(cancelRequest("r1")).resolves.toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("cancel_request", { p_request_id: "r1" });
  });

  it("explains a request that is no longer open", async () => {
    rpc.mockResolvedValue({ data: { ok: false, error: "request_not_open", status: "accepted" }, error: null });
    const res = await cancelRequest("r1");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/no longer open/);
  });

  it("never shows a raw database error", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "permission denied for function cancel_request" } });
    const res = await cancelRequest("r1");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).not.toMatch(/permission|function/);
  });

  it("falls back to a generic message for an unknown code", async () => {
    rpc.mockResolvedValue({ data: { ok: false, error: "something_new" }, error: null });
    const res = await cancelRequest("r1");
    if (!res.ok) expect(res.error).toMatch(/Try again/);
  });
});
