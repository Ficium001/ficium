import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Internal detail (database errors, the bank side's messages, network errors) must stay in the
// logs. The borrower's browser only ever gets a generic message and a code.
const LEAK = "connect ECONNREFUSED 10.0.0.5:5432 password=hunter2";

vi.mock("../_lib/auth.js", () => ({
  requireUser: vi.fn(async () => ({ id: "11111111-1111-4111-8111-111111111111" })),
  requireOwnership: vi.fn(),
  sendAuthError: vi.fn(() => false),
}));
const rpc = vi.fn(async (..._a: unknown[]): Promise<{ error: { message: string } | null }> => ({ error: null }));
vi.mock("../_lib/db.js", () => ({ getServiceDb: vi.fn(() => ({ rpc })) }));
vi.mock("../_lib/handlers/bid-accepted.js", () => ({ writeBidAcceptedNotification: vi.fn(async () => undefined) }));
const acceptViaContract = vi.fn();
vi.mock("../_lib/integration/acceptance.js", () => ({ acceptViaContract: (...a: unknown[]) => acceptViaContract(...a) }));

function fakeRes() {
  const r: any = { statusCode: 0, body: undefined };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: unknown) => { r.body = b; return r; };
  r.setHeader = () => r;
  return r;
}
const req = { method: "POST", headers: {}, body: { requestId: "22222222-2222-4222-8222-222222222222", bidId: "33333333-3333-4333-8333-333333333333" } };

describe("POST /api/accept-bid never returns internal errors", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://db.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
    vi.stubEnv("INTEGRATION_ACCEPTANCE_ENABLED", "true");
    vi.stubEnv("INTEGRATION_ACCEPT_URL", "https://portal.test/integration/v1/acceptances");
    vi.stubEnv("INTEGRATION_ACCEPT_SIGNING_KEY", "k");
    vi.stubGlobal("fetch", vi.fn(async () => new globalThis.Response(
      JSON.stringify([{ client_id: "11111111-1111-4111-8111-111111111111", status: "open" }]), { status: 200 })));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); acceptViaContract.mockReset(); });

  it("the bank side's error text is logged, not shown (5xx becomes 502)", async () => {
    acceptViaContract.mockResolvedValue({ status: 500, error: LEAK });
    const { default: handler } = await import("../accept-bid");
    const res = fakeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(502);
    expect(res.body.code).toBe("ACCEPTANCE_FAILED");
    expect(JSON.stringify(res.body)).not.toContain("ECONNREFUSED");
    expect(JSON.stringify(res.body)).not.toContain("hunter2");
  });

  it("a refusal keeps its 4xx status but not its text", async () => {
    acceptViaContract.mockResolvedValue({ status: 409, error: `bid_not_open: ${LEAK}` });
    const { default: handler } = await import("../accept-bid");
    const res = fakeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(409);
    expect(JSON.stringify(res.body)).not.toContain("hunter2");
  });

  it("an unexpected exception is a generic 500", async () => {
    acceptViaContract.mockRejectedValue(new Error(LEAK));
    const { default: handler } = await import("../accept-bid");
    const res = fakeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe("UNEXPECTED");
    expect(JSON.stringify(res.body)).not.toContain("hunter2");
  });
});

describe("POST /api/accept-bid records the acceptance or says it didn't", () => {
  const reveal = { institution_id: "i", institution_name: "Bank", rate: 5, rate_type: "fixed", amount_offered: 1000, term_months: 12 };
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://db.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
    vi.stubEnv("INTEGRATION_ACCEPTANCE_ENABLED", "true");
    vi.stubEnv("INTEGRATION_ACCEPT_URL", "https://portal.test/integration/v1/acceptances");
    vi.stubEnv("INTEGRATION_ACCEPT_SIGNING_KEY", "k");
    vi.stubGlobal("fetch", vi.fn(async () => new globalThis.Response(
      JSON.stringify([{ client_id: "11111111-1111-4111-8111-111111111111", status: "open" }]), { status: 200 })));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); acceptViaContract.mockReset(); rpc.mockReset(); });

  // Simulates acceptViaContract: bank side accepts, then the App DB completion runs.
  const bankAccepts = async (deps: any) => { await deps.complete("consent_x", "accepted", "i"); return { status: 200, reveal }; };

  it("success only after the App DB recorded it, with no extra direct table writes", async () => {
    rpc.mockResolvedValue({ error: null });
    acceptViaContract.mockImplementation(bankAccepts);
    const { default: handler } = await import("../accept-bid");
    const res = fakeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(rpc).toHaveBeenCalledWith("integration_complete_acceptance", { p_consent_ref: "consent_x", p_outcome: "accepted", p_institution: "i" });
    // only the ownership lookup touches REST directly; bid_acceptances/requests are written by the RPC
    expect((globalThis.fetch as any).mock.calls).toHaveLength(1);
  });

  it("bank accepted but the App DB write failed: 503 asking for a retry, never 200", async () => {
    rpc.mockResolvedValue({ error: { message: LEAK } });
    acceptViaContract.mockImplementation(bankAccepts);
    const { default: handler } = await import("../accept-bid");
    const res = fakeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe("ACCEPTANCE_NOT_SAVED");
    expect(JSON.stringify(res.body)).not.toContain("hunter2");
  });
});
