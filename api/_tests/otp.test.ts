import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateCode, hashCode, toE164, maskEmail, maskPhone, sessionIdFromToken, isWellFormedCode,
} from "../_lib/otp/codes.js";

const SID = "11111111-2222-3333-4444-555555555555";
const rpc = vi.fn();
const maybeSingle = vi.fn();
vi.mock("../_lib/auth.js", async (orig) => ({
  ...(await orig<typeof import("../_lib/auth.js")>()),
  requireUser: vi.fn(async () => ({ id: "client-1", email: "kj@ficium.net", role: null })),
}));
vi.mock("../_lib/db.js", () => ({
  getServiceDb: () => ({ rpc, from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) }),
}));
import handler from "../account";

const jwt = (p: object) =>
  `${Buffer.from("{}").toString("base64url")}.${Buffer.from(JSON.stringify(p)).toString("base64url")}.sig`;
const TOKEN = jwt({ session_id: SID });

function res() {
  const r: any = { statusCode: 0, body: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: unknown) => { r.body = b; return r; };
  r.setHeader = () => r;
  r.end = () => r;
  return r;
}
const req = (method: string, body?: object) =>
  ({ method, query: { op: "otp" }, headers: { authorization: `Bearer ${TOKEN}`, "x-forwarded-for": "1.2.3.4" }, body });

const fetchSpy = vi.spyOn(globalThis, "fetch");
beforeEach(() => {
  rpc.mockReset();
  fetchSpy.mockReset();
  maybeSingle.mockResolvedValue({ data: { phone: "5712 3456" } });
  vi.stubEnv("OTP_PEPPER", "p".repeat(40));
  vi.stubEnv("RESEND_API_KEY", "re_x");
  vi.stubEnv("TWILIO_ACCOUNT_SID", "AC1");
  vi.stubEnv("TWILIO_API_KEY_SID", "SK1");
  vi.stubEnv("TWILIO_API_KEY_SECRET", "s");
  vi.stubEnv("TWILIO_SMS_FROM", "MG1");
  vi.stubEnv("TWILIO_WHATSAPP_FROM", "");
  vi.stubEnv("TWILIO_WHATSAPP_CONTENT_SID", "");
});

describe("otp codes", () => {
  it("generates uniform 6-digit codes", () => {
    for (let i = 0; i < 200; i++) expect(isWellFormedCode(generateCode())).toBe(true);
  });
  it("binds the hash to pepper, challenge and code", () => {
    const h = hashCode("pep", "c1", "123456");
    expect(h).toMatch(/^\\x[0-9a-f]{64}$/);
    expect(hashCode("pep", "c2", "123456")).not.toBe(h);
    expect(hashCode("pep2", "c1", "123456")).not.toBe(h);
    expect(hashCode("pep", "c1", "123457")).not.toBe(h);
  });
  it("normalises Mauritian and international numbers", () => {
    expect(toE164("5712 3456")).toBe("+23057123456");
    expect(toE164("230 5712 3456")).toBe("+23057123456");
    expect(toE164("+44 7700 900123")).toBe("+447700900123");
    expect(toE164("0044 7700 900123")).toBe("+447700900123");
    expect(toE164("123")).toBeNull();
    expect(toE164("")).toBeNull();
  });
  it("masks destinations", () => {
    expect(maskEmail("kj@ficium.net")).toBe("k••@ficium.net");
    expect(maskPhone("+23057123456")).toBe("+230 •••• 3456");
  });
  it("reads session_id only when it is a uuid", () => {
    expect(sessionIdFromToken(TOKEN)).toBe(SID);
    expect(sessionIdFromToken(jwt({ session_id: "x" }))).toBeNull();
    expect(sessionIdFromToken("garbage")).toBeNull();
  });
});

describe("/api/account?op=otp", () => {
  it("lists channels from the account, not the request", async () => {
    rpc.mockResolvedValue({ data: { enforced: true, verified: false, preferred: null } });
    const r = res();
    await handler(req("GET"), r);
    expect(r.statusCode).toBe(200);
    const ch = r.body.data.channels;
    expect(ch.find((c: any) => c.channel === "email")).toMatchObject({ available: true, destination: "k••@ficium.net" });
    expect(ch.find((c: any) => c.channel === "sms")).toMatchObject({ available: true, destination: "+230 •••• 3456" });
    expect(ch.find((c: any) => c.channel === "whatsapp")).toMatchObject({ available: false, reason: "not_configured" });
  });

  it("sends an SMS code and stores only its hash", async () => {
    rpc.mockResolvedValueOnce({ data: { ok: true, expires_in: 300, resend_in: 30 } });
    fetchSpy.mockResolvedValueOnce(new Response("{}", { status: 201 }));
    const r = res();
    await handler(req("POST", { action: "send", channel: "sms" }), r);
    expect(r.statusCode).toBe(200);
    const args = rpc.mock.calls[0][1];
    expect(args).toMatchObject({ p_user: "client-1", p_session: SID, p_channel: "sms", p_ip: "1.2.3.4" });
    const sentBody = String((fetchSpy.mock.calls[0][1] as RequestInit).body);
    const code = /Body=(\d{6})/.exec(decodeURIComponent(sentBody))![1];
    expect(args.p_code_hash).toBe(hashCode("p".repeat(40), args.p_challenge_id, code));
    expect(JSON.stringify(r.body)).not.toContain(code);
    expect(decodeURIComponent(sentBody)).toContain("To=+23057123456");
  });

  it("refuses a channel that is not configured", async () => {
    const r = res();
    await handler(req("POST", { action: "send", channel: "whatsapp" }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body.code).toBe("CHANNEL_UNAVAILABLE");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails closed without a pepper", async () => {
    vi.stubEnv("OTP_PEPPER", "");
    const r = res();
    await handler(req("POST", { action: "send", channel: "email" }), r);
    expect(r.statusCode).toBe(503);
  });

  it("releases the challenge when the provider refuses", async () => {
    rpc.mockResolvedValueOnce({ data: { ok: true } }).mockResolvedValueOnce({ data: null });
    fetchSpy.mockResolvedValueOnce(new Response("{}", { status: 400 }));
    const r = res();
    await handler(req("POST", { action: "send", channel: "email" }), r);
    expect(r.statusCode).toBe(502);
    expect(rpc.mock.calls[1][0]).toBe("otp_send_failed");
  });

  it("maps cooldown and wrong codes", async () => {
    rpc.mockResolvedValueOnce({ data: { ok: false, error: "cooldown", retry_in: 12 } });
    let r = res();
    await handler(req("POST", { action: "send", channel: "email" }), r);
    expect(r.statusCode).toBe(429);

    rpc.mockResolvedValueOnce({ data: { ok: false, error: "invalid_code", attempts_left: 2 } });
    r = res();
    await handler(req("POST", { action: "verify", challengeId: SID, code: "000000" }), r);
    expect(r.body).toMatchObject({ code: "OTP_INVALID" });
  });

  it("rejects malformed codes before touching the database", async () => {
    const r = res();
    await handler(req("POST", { action: "verify", challengeId: SID, code: "12ab" }), r);
    expect(r.statusCode).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});
