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
