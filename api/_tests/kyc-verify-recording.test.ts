import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// KYC outcomes are recorded by the SERVER for the signed-in user. Before
// 2026-10-30 the browser wrote kyc_submissions and clients.kyc_status itself
// (and the server trusted the body's clientId and fullName), so a borrower
// could mark themselves verified. These tests pin the server-side rules.

const UID = "11111111-1111-4111-8111-111111111111";
const writes: { method: string; path: string; body: Record<string, unknown> }[] = [];
let ownName = "Asha Ramdin";
let faceScore = 97;

vi.mock("../_kyc/db.js", () => ({
  supabaseQuery: vi.fn(async (path: string) => {
    if (path.startsWith("clients?")) return [{ full_name: ownName }];
    if (path.startsWith("kyc_settings")) return [];
    return [];
  }),
  supabaseWrite: vi.fn(async (method: string, path: string, body: Record<string, unknown>) => {
    writes.push({ method, path, body }); return true;
  }),
  supabaseInsert: vi.fn(async () => undefined),
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
    writes.length = 0; ownName = "Asha Ramdin"; faceScore = 97;
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

  it("records a pass for the signed-in user, ignoring the body's clientId", async () => {
    const { verifyHandler } = await import("../_kyc/verify");
    const r = res(); await verifyHandler({ method: "POST", authUserId: UID, body: body() }, r);
    const sub = writes.find((w) => w.path === "kyc_submissions");
    const cli = writes.find((w) => w.path.startsWith("clients?"));
    expect(sub?.body.client_id).toBe(UID);
    expect(sub?.body.id_document_path).toBe(`${UID}/id-1.jpg`);
    expect(cli?.path).toBe(`clients?id=eq.${UID}`);
    expect(["verified", "pending_review"]).toContain(cli?.body.kyc_status);
    expect(r.body.status).toBe(cli?.body.kyc_status);
  });

  it("a hard reject is recorded but never changes the borrower's status", async () => {
    faceScore = 0;  // selfie does not match the ID
    const { verifyHandler } = await import("../_kyc/verify");
    const r = res(); await verifyHandler({ method: "POST", authUserId: UID, body: body() }, r);
    expect(r.body.ok).toBe(false);
    expect(writes.find((w) => w.path === "kyc_submissions")?.body.status).toBe("rejected");
    expect(writes.some((w) => w.path.startsWith("clients?"))).toBe(false);
  });
});
