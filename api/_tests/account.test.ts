import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("../_lib/auth.js", async (orig) => ({
  ...(await orig<typeof import("../_lib/auth.js")>()),
  requireUser: vi.fn(async () => ({ id: "client-1", email: "a@b.c", role: null })),
}));
vi.mock("../_lib/db.js", () => ({ getServiceDb: () => ({ rpc }) }));
import handler from "../account";
import { passwordEnteredRecently } from "../_lib/recent-auth.js";

function jwt(payload: object): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256" })}.${b64(payload)}.sig`;
}
const now = () => Math.floor(Date.now() / 1000);
const fresh = () => jwt({ amr: [{ method: "password", timestamp: now() - 30 }] });
const stale = () => jwt({ amr: [{ method: "password", timestamp: now() - 3600 }] });

function res() {
  const r: any = { statusCode: 0, body: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: unknown) => { r.body = b; return r; };
  r.setHeader = () => r;
  r.end = () => r;
  return r;
}
const post = (token: string, body: object = { action: "close" }) =>
  ({ method: "POST", headers: { authorization: `Bearer ${token}` }, body });

const fetchSpy = vi.spyOn(globalThis, "fetch");
beforeEach(() => {
  rpc.mockReset();
  fetchSpy.mockReset();
  vi.stubEnv("ACCOUNT_CLOSURE_RETENTION_YEARS", "7");
  vi.stubEnv("SUPABASE_URL", "https://x.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "svc");
});

describe("passwordEnteredRecently", () => {
  it("accepts a password sign-in from the last 5 minutes", () => {
    expect(passwordEnteredRecently(fresh())).toBe(true);
  });
  it("rejects an old sign-in, a non-password method and garbage", () => {
    expect(passwordEnteredRecently(stale())).toBe(false);
    expect(passwordEnteredRecently(jwt({ amr: [{ method: "otp", timestamp: now() }] }))).toBe(false);
    expect(passwordEnteredRecently("not-a-jwt")).toBe(false);
  });
});

describe("GET /api/account", () => {
  it("reports closure off when retention is unset or under the legal minimum", async () => {
    for (const v of ["", "5", "seven"]) {
      vi.stubEnv("ACCOUNT_CLOSURE_RETENTION_YEARS", v);
      const r = res();
      await handler({ method: "GET", headers: {} }, r);
      expect(r.body.data).toEqual({ closureAvailable: false, retentionYears: null });
    }
  });
});

describe("POST /api/account close", () => {
  it("is refused while closure is switched off", async () => {
    vi.stubEnv("ACCOUNT_CLOSURE_RETENTION_YEARS", "");
    const r = res();
    await handler(post(fresh()), r);
    expect(r.statusCode).toBe(503);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("needs a fresh password, not just a valid session", async () => {
    const r = res();
    await handler(post(stale()), r);
    expect(r.statusCode).toBe(401);
    expect(r.body.code).toBe("REAUTH_REQUIRED");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("closes, signs out everywhere, then bans — in that order", async () => {
    rpc.mockResolvedValue({ data: { status: "closed", retain_until: "2033-11-07", open_requests_closed: 2 }, error: null });
    fetchSpy.mockResolvedValue(new globalThis.Response(null, { status: 204 }));
    const r = res();
    await handler(post(fresh()), r);
    expect(rpc).toHaveBeenCalledWith("close_account", { p_client_id: "client-1", p_retain_years: 7 });
    const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(urls[0]).toContain("/auth/v1/logout?scope=global");
    expect(urls[1]).toContain("/auth/v1/admin/users/client-1");
    expect(r.statusCode).toBe(200);
    expect(r.body.data).toEqual({ status: "closed", retainUntil: "2033-11-07", openRequestsClosed: 2 });
  });

  it("does not close under an offer acceptance in progress", async () => {
    rpc.mockResolvedValue({ data: { status: "acceptance_in_progress" }, error: null });
    const r = res();
    await handler(post(fresh()), r);
    expect(r.statusCode).toBe(409);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reports an incomplete sign-out so the user retries (retry is idempotent)", async () => {
    rpc.mockResolvedValue({ data: { status: "already_closed", retain_until: "2033-11-07" }, error: null });
    fetchSpy.mockResolvedValueOnce(new globalThis.Response(null, { status: 204 }))
            .mockResolvedValueOnce(new globalThis.Response(null, { status: 500 }));
    const r = res();
    await handler(post(fresh()), r);
    expect(r.statusCode).toBe(502);
    expect(r.body.code).toBe("SIGNOUT_INCOMPLETE");
  });
});
