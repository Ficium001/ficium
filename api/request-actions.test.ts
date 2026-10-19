/** Tracker and relist run on the borrower side's own data: no direct link to the portal. */
import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("./_lib/auth.js", () => ({
  requireUser: vi.fn(async () => ({ id: "client-1" })),
  sendAuthError: vi.fn(() => false),
}));
vi.mock("./_lib/db.js", () => ({ getServiceDb: () => ({ rpc }) }));
import handler from "./request-actions";

function res() {
  const r: any = { statusCode: 0, body: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: unknown) => { r.body = b; return r; };
  r.setHeader = () => r;
  return r;
}

const fetchSpy = vi.spyOn(globalThis, "fetch");
beforeEach(() => { rpc.mockReset(); fetchSpy.mockReset(); });

describe("tracker", () => {
  it("reads the deal's progress from the borrower side's own copy, never the portal", async () => {
    rpc.mockResolvedValue({ data: { pipeline_id: "p1", status: "active", stages: [] }, error: null });
    const r = res();
    await handler({ method: "GET", query: { action: "tracker", requestId: "req-1" }, headers: {} }, r);
    expect(r.statusCode).toBe(200);
    expect(rpc).toHaveBeenCalledWith("integration_deal_progress_for", { p_client_id: "client-1", p_request_id: "req-1" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("is 'pending' until the bank's first progress event arrives", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const r = res();
    await handler({ method: "GET", query: { action: "tracker", requestId: "req-1" }, headers: {} }, r);
    expect(r.body.data).toMatchObject({ status: "pending", stages: [] });
  });
});

describe("relist", () => {
  it("relists on the borrower's own side, never calling the portal", async () => {
    rpc.mockResolvedValue({ data: { request_id: "req-1", status: "open" }, error: null });
    const r = res();
    await handler({ method: "POST", query: {}, body: { action: "relist", requestId: "req-1" }, headers: {} }, r);
    expect(r.statusCode).toBe(200);
    expect(rpc).toHaveBeenCalledWith("relist_request", { p_client_id: "client-1", p_request_id: "req-1" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([["RELIST_NOT_FOUND", 404], ["RELIST_NOT_ALLOWED", 409]])("maps %s", async (code, status) => {
    rpc.mockResolvedValue({ data: null, error: { message: code } });
    const r = res();
    await handler({ method: "POST", query: {}, body: { action: "relist", requestId: "req-1" }, headers: {} }, r);
    expect(r.statusCode).toBe(status);
  });
});

describe("chat-send", () => {
  const post = async (body: Record<string, unknown>, rpcResult: unknown = { data: { id: "m1" }, error: null }) => {
    rpc.mockResolvedValue(rpcResult);
    const r = res();
    await handler({ method: "POST", query: {}, body: { action: "chat-send", ...body }, headers: {} }, r);
    return r;
  };
  const ids = { requestId: "00000000-0000-4000-8000-000000000001", institutionId: "00000000-0000-4000-8000-000000000060" };

  it("renders a structured message on the server with the contract, never trusting a client body", async () => {
    const r = await post({ ...ids, templateCode: "q.fees_breakdown", body: "anything the browser says" });
    expect(r.statusCode).toBe(200);
    expect(rpc).toHaveBeenCalledWith("integration_send_borrower_message", expect.objectContaining({
      p_client_id: "client-1", p_template_code: "q.fees_breakdown",
      p_body: "Can you break down the fees on this offer?" }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses a bank's template from a borrower", async () => {
    expect((await post({ ...ids, templateCode: "a.rate_final" })).statusCode).toBe(422);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps the database rules (closed thread, free text too early) to 409", async () => {
    const r = await post({ ...ids, body: "hello" }, { data: null, error: { message: "This conversation is closed" } });
    expect(r.statusCode).toBe(409);
  });
});

describe("portfolio", () => {
  it("comes from this side's own deal progress, never the portal", async () => {
    rpc.mockResolvedValue({ data: [{ id: "p1" }], error: null });
    const r = res();
    await handler({ method: "GET", query: { action: "portfolio" }, headers: {} }, r);
    expect(r.statusCode).toBe(200);
    expect(r.body.data).toEqual({ facilities: [{ id: "p1" }] });
    expect(rpc).toHaveBeenCalledWith("integration_portfolio_for", { p_client_id: "client-1" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
