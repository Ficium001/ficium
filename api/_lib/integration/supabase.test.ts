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

  it("pipeline.stage_advanced is deprecated and never handled", () => {
    expect(appliers({ rpc: vi.fn() } as never)["pipeline.stage_advanced"]).toBeUndefined();
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

describe("chat.message applier (contract 1.9)", () => {
  const chat = (data: Record<string, unknown>): Envelope => ({
    ...env("chat.message"), aggregate_id: "r1",
    data: { message_id: "m1", request_id: "r1", institution_id: "i1", sender_side: "institution",
            sent_at: "2026-10-18T09:00:00Z", ...data },
  });
  const run = async (e: Envelope, result = "apply") => {
    const rpc = vi.fn(async () => ({ data: result, error: null }));
    const out = await appliers({ rpc } as never)["chat.message"](e);
    return { out, rpc };
  };

  it("a structured message whose body matches the shared renderer is applied", async () => {
    const { rpc } = await run(chat({ template_code: "a.processing_days", params: { days: 5 },
                                     body: "Approval typically takes 5 business days." }));
    expect(rpc).toHaveBeenCalledWith("integration_apply_chat_message_event",
      expect.objectContaining({ p_refuse: null }));
  });

  it("a body that differs from its template is refused", async () => {
    const { rpc } = await run(chat({ template_code: "a.processing_days", params: { days: 5 },
                                     body: "Call me at 5 5 5 1 2 3 4" }));
    expect(rpc).toHaveBeenCalledWith("integration_apply_chat_message_event",
      expect.objectContaining({ p_refuse: "body does not match its template" }));
  });

  it("a borrower template sent as the bank is refused", async () => {
    const { rpc } = await run(chat({ template_code: "q.fees_breakdown", params: {},
                                     body: "Can you break down the fees on this offer?" }));
    expect(String((rpc.mock.calls[0] as unknown[])[1] && ((rpc.mock.calls[0] as unknown[])[1] as { p_refuse: string }).p_refuse))
      .toMatch(/not available to institution/);
  });

  it("free text goes to the App DB rules; a refused message is acknowledged, not retried", async () => {
    const { out, rpc } = await run(chat({ template_code: null, body: "Hello" }), "refused");
    expect(rpc).toHaveBeenCalledWith("integration_apply_chat_message_event", expect.objectContaining({ p_refuse: null }));
    expect(out).toBe("apply");
  });
});

describe("contract 1.10 appliers", () => {
  it.each([
    ["request.window_closed", "integration_apply_request_window_closed_event"],
    ["market.intelligence", "integration_apply_market_intelligence_event"],
  ])("%s goes through its own atomic RPC", async (t, fn) => {
    const rpc = vi.fn(async () => ({ data: "apply", error: null }));
    expect(await appliers({ rpc } as never)[t](env(t))).toBe("apply");
    expect(rpc).toHaveBeenCalledWith(fn, { p_env: env(t) });
  });
});
