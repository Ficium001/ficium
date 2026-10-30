import { describe, expect, it, vi } from "vitest";
import { sign } from "@ficium/contract";
import { receiveAdminKyc, type AdminKycDeps } from "./admin-kyc";

const KEY = "admin-sync-test-key";
const CID = "11111111-1111-4111-8111-111111111111";
const SID = "22222222-2222-4222-8222-222222222222";
const raw = (b: unknown) => Buffer.from(JSON.stringify(b));
const signed = (b: Buffer, key = KEY) => sign(b, Buffer.from(key));

function deps(over: Partial<AdminKycDeps> = {}): AdminKycDeps {
  return {
    list: vi.fn(async () => [{ submission_id: SID, document_last4: "6789" }]),
    getCase: vi.fn(async () => ({
      submission_id: SID, client_id: CID,
      paths: { id: `${CID}/id-1.jpg`, selfie: `${CID}/selfie-1.jpg`, proof_of_address: `${CID}/poa.jpg`,
               permit: "99999999-9999-4999-8999-999999999999/stolen.jpg" },
    })),
    signLink: vi.fn(async (p: string) => `https://storage.test/signed/${p}?exp=300`),
    ...over,
  };
}

describe("admin KYC reads over HTTPS", () => {
  it("lists the queue for a correctly signed request", async () => {
    const d = deps(); const b = raw({ action: "list" });
    const r = await receiveAdminKyc(b, signed(b), [KEY], d);
    expect(r.status).toBe(200);
    expect((r.body as any).cases[0].document_last4).toBe("6789");
  });

  it("returns a case with short-lived links only to the borrower's own files", async () => {
    const d = deps(); const b = raw({ action: "case", submission_id: SID });
    const r = await receiveAdminKyc(b, signed(b), [KEY], d);
    const c = (r.body as any).case;
    expect(r.status).toBe(200);
    expect(c.paths).toBeUndefined();                        // storage paths never leave
    expect(c.documents.id).toContain(`${CID}/id-1.jpg`);
    expect(c.documents.permit).toBeNull();                 // outside the borrower's folder
    expect(d.signLink).not.toHaveBeenCalledWith(expect.stringContaining("stolen"));
    expect(c.links_expire_in_s).toBe(300);
  });

  it("refuses without keys, with a wrong key, or a tampered body, before any read", async () => {
    const d = deps(); const b = raw({ action: "list" });
    expect((await receiveAdminKyc(b, signed(b), [], d)).status).toBe(503);
    expect((await receiveAdminKyc(b, signed(b, "other-key"), [KEY], d)).status).toBe(401);
    expect((await receiveAdminKyc(raw({ action: "case", submission_id: SID }), signed(b), [KEY], d)).status).toBe(401);
    expect(d.list).not.toHaveBeenCalled(); expect(d.getCase).not.toHaveBeenCalled();
  });

  it("validates the request", async () => {
    const d = deps({ getCase: vi.fn(async () => null) });
    for (const [body, code] of [[{ action: "case", submission_id: "x" }, 422], [{ action: "drop" }, 422],
                                [{ action: "case", submission_id: SID }, 404]] as const) {
      const b = raw(body);
      expect((await receiveAdminKyc(b, signed(b), [KEY], d)).status).toBe(code);
    }
  });
});
