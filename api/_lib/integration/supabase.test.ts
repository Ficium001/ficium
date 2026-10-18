import { describe, expect, it, vi } from "vitest";
import { appliers } from "./supabase";
import type { Envelope } from "./core";

const env = (type: string): Envelope => ({
  id: "evt_0123456789abcdef", type, version: 1, source: "institution",
  occurred_at: "2026-10-03T09:00:00Z", aggregate_id: "b1", sequence: 1, data: { bid_id: "b1" },
});

describe("bid appliers", () => {
  it.each(["bid.placed", "bid.updated", "bid.withdrawn"])("%s goes through ONE atomic RPC with the whole envelope", async (t) => {
    const rpc = vi.fn(async () => ({ data: "apply", error: null }));
    const out = await appliers({ rpc } as never)[t](env(t));
    expect(out).toBe("apply");
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("integration_apply_bid_event", { p_env: env(t) });
  });

  it("a database error is thrown, so the event is answered 5xx and the sender retries", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: "boom" } }));
    await expect(appliers({ rpc } as never)["bid.placed"](env("bid.placed"))).rejects.toThrow("apply_bid_event: boom");
  });

  it("chat and pipeline events are still not handled (sender keeps retrying until their step ships)", () => {
    const a = appliers({ rpc: vi.fn() } as never);
    expect(a["chat.message"]).toBeUndefined();
    expect(a["pipeline.stage_advanced"]).toBeUndefined();
  });
});

describe("Phase 2 and decline appliers", () => {
  it.each([
    ["request.declined", "integration_apply_request_declined_event"],
    ["deal.progress_updated", "integration_apply_deal_progress_event"],
    ["deal.documents_updated", "integration_apply_deal_documents_event"],
  ])("%s goes through its own atomic RPC", async (t, fn) => {
    const rpc = vi.fn(async () => ({ data: "apply", error: null }));
    expect(await appliers({ rpc } as never)[t](env(t))).toBe("apply");
    expect(rpc).toHaveBeenCalledWith(fn, { p_env: env(t) });
  });
});
