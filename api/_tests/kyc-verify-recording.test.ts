import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// KYC outcomes are recorded by the SERVER for the signed-in user. Before
// 2026-10-30 the browser wrote kyc_submissions and clients.kyc_status itself
// (and the server trusted the body's clientId and fullName), so a borrower
// could mark themselves verified. These tests pin the server-side rules.

const UID = "11111111-1111-4111-8111-111111111111";
const writes: { fn: string; args: any }[] = [];
const calls: { fn: string; args: any }[] = [];
let ownName = "Asha Ramdin";
let faceScore = 97;

let ctxOk = true;
vi.mock("../_kyc/db.js", () => ({
  supabaseQuery: vi.fn(async () => []),
  supabaseInsert: vi.fn(async () => undefined),
  supabaseRpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
    if (fn === "kyc_server_context") {
      calls.push({ fn, args });
      return ctxOk ? { ok: true, data: { full_name: ownName, attempts_24h: 0, document_reused: false } } : { ok: false, data: null };
    }
    writes.push({ fn, args }); return { ok: true, data: "sub-id" };
  }),
}));
vi.mock("../_kyc/aws.js", () => ({
  detectText: vi.fn(async () => "REPUBLIC OF MAURITIUS ASHA RAMDIN"),
  detectFaces: vi.fn(async () => [{ Confidence: 99.9 }]),
  detectLabels: vi.fn(async () => [{ Name: "Id Cards", Confidence: 95 }, { Name: "Person", Confidence: 99 }]),
  compareFaces: vi.fn(async () => faceScore),
  searchFaceCollection: vi.fn(async () => ({ duplicate: false })),
  indexFace: vi.fn(async () => undefined),
}));

const body = (over: Record<string, unknown> = {}) => ({
  idB64: "aWQ=", selfieB64: "c2VsZmll", poaB64: "cG9h",
  clientId: "99999999-9999-4999-8999-999999999999",   // someone else: must be ignored
  fullName: "Whatever The ID Says",                      // must be ignored
  documentType: "national_id", documentNumber: "R1234567890123",
  idPath: `${UID}/id-1.jpg`, selfiePath: `${UID}/selfie-1.jpg`, poaPath: `${UID}/proof_of_address-1.jpg`,
  ...over,
});
function res() {
  const r: any = { code: 0, json(b: unknown) { r.body = b; return r; }, status(c: number) { r.code = c; return r; } };
  return r;
}

describe("KYC verify records the outcome server-side", () => {
  beforeEach(() => {
    writes.length = 0; calls.length = 0; ownName = "Asha Ramdin"; faceScore = 97; ctxOk = true;
    vi.stubEnv("AWS_ACCESS_KEY_ID", "test");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it("refuses without a signed-in user", async () => {
    const { verifyHandler } = await import("../_kyc/verify");
    const r = res(); await verifyHandler({ method: "POST", body: body() }, r);
    expect(r.code).toBe(401); expect(writes).toEqual([]);
  });

  it("refuses files outside the user's own folder", async () => {
    const { verifyHandler } = await import("../_kyc/verify");
    for (const p of [`99999999-9999-4999-8999-999999999999/id.jpg`, `${UID}/../other/id.jpg`]) {
      const r = res(); await verifyHandler({ method: "POST", authUserId: UID, body: body({ idPath: p }) }, r);
      expect(r.code).toBe(400);
    }
    expect(writes).toEqual([]);
  });

  it("records a pass for the signed-in user, ignoring the body's clientId and name", async () => {
    const { verifyHandler } = await import("../_kyc/verify");
    const r = res(); await verifyHandler({ method: "POST", authUserId: UID, body: body() }, r);
    expect(calls[0]?.args.p_client).toBe(UID);
    expect(writes).toHaveLength(1);
    const w = writes[0]!;
    expect(w.fn).toBe("kyc_record_outcome");
    expect(w.args.p_client).toBe(UID);
    expect(w.args.p_submission.id_document_path).toBe(`${UID}/id-1.jpg`);
    expect(["verified", "pending_review"]).toContain(w.args.p_status);
    expect(r.body.status).toBe(w.args.p_status);
  });

  it("a hard reject is recorded as rejected", async () => {
    faceScore = 0;  // selfie does not match the ID
    const { verifyHandler } = await import("../_kyc/verify");
    const r = res(); await verifyHandler({ method: "POST", authUserId: UID, body: body() }, r);
    expect(r.body.ok).toBe(false);
    expect(writes[0]?.args.p_status).toBe("rejected");
  });

  it("no context, no verification: 503 and nothing saved", async () => {
    ctxOk = false;
    const { verifyHandler } = await import("../_kyc/verify");
    const r = res(); await verifyHandler({ method: "POST", authUserId: UID, body: body() }, r);
    expect(r.code).toBe(503); expect(writes).toEqual([]);
  });
});
