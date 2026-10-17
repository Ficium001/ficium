import { describe, it, expect, vi } from "vitest";
import { verify } from "@ficium/contract";
import { vaultOptions, awaitsBorrower, shareFromVault, sha256Hex, type ChecklistItem, type VaultDoc } from "./documents";

const TODAY = new Date("2026-10-17T10:00:00Z");
const item: ChecklistItem = {
  requirement_id: "00000000-0000-4000-8000-000000000040", name: "Proof of income", provided_by: "borrower",
  status: "required", document_type: "payslip", max_age_days: 90,
};
const v = (id: string, doc_date: string | null, doc_type = "payslip", deleted_at: string | null = null): VaultDoc =>
  ({ id, doc_type, file_name: `${id}.pdf`, doc_date, deleted_at });

describe("vaultOptions — the age rule", () => {
  it("offers only matching types, newest first, and blocks old or undated copies", () => {
    const out = vaultOptions(item, [
      v("old", "2026-05-31"), v("fresh", "2026-09-30"), v("undated", null),
      v("stmt", "2026-10-01", "bank_statement"), v("gone", "2026-10-01", "payslip", "2026-10-02T00:00:00Z"),
    ], TODAY);
    expect(out.map((o) => [o.doc.id, o.usable ? "ok" : (o as { reason: string }).reason])).toEqual([
      ["fresh", "ok"], ["old", "too_old"], ["undated", "undated"],
    ]);
  });

  it("exactly max_age_days old is still fine; one more day is not", () => {
    const edge = vaultOptions(item, [v("edge", "2026-07-19"), v("over", "2026-07-18")], TODAY);
    expect(edge.find((o) => o.doc.id === "edge")!.usable).toBe(true);
    expect(edge.find((o) => o.doc.id === "over")!.usable).toBe(false);
  });

  it("no max age: any dated copy works; undated still doesn't", () => {
    const out = vaultOptions({ ...item, max_age_days: null }, [v("a", "2020-01-01"), v("b", null)], TODAY);
    expect(out.map((o) => o.usable)).toEqual([true, false]);
  });

  it("nothing to offer for bank-provided, untyped or 'other' items", () => {
    expect(vaultOptions({ ...item, provided_by: "bank" }, [v("a", "2026-10-01")], TODAY)).toEqual([]);
    expect(vaultOptions({ ...item, document_type: null }, [v("a", "2026-10-01")], TODAY)).toEqual([]);
    expect(vaultOptions({ ...item, document_type: "other" }, [v("a", "2026-10-01", "other")], TODAY)).toEqual([]);
  });

  it("only required or rejected borrower items await the borrower", () => {
    expect(awaitsBorrower(item)).toBe(true);
    expect(awaitsBorrower({ ...item, status: "rejected" })).toBe(true);
    expect(awaitsBorrower({ ...item, status: "received" })).toBe(false);
    expect(awaitsBorrower({ ...item, provided_by: "bank" })).toBe(false);
  });
});

describe("shareFromVault", () => {
  const KEY = "k-borrower";
  const P = "00000000-0000-4000-8000-000000000030";
  const A = "00000000-0000-4000-8000-000000000099";
  const U = "00000000-0000-4000-8000-000000000050";
  const bytes = new TextEncoder().encode("%PDF-1.7 payslip");

  function deps(over: Partial<Record<string, unknown>> = {}) {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchFn = vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith("/uploads")) return new Response(JSON.stringify({
        upload_id: U, upload_url: "https://storage.example/slot?token=t", expires_at: "2026-10-17T10:10:00Z" }), { status: 201 });
      if (url.startsWith("https://storage.example")) return new Response("", { status: 200 });
      return new Response(JSON.stringify({ pipeline_id: P, document: { ...item, mandatory: true, status: "received" } }), { status: 200 });
    });
    const finish = vi.fn(async () => {});
    return {
      calls, finish,
      d: {
        fetchFn: fetchFn as unknown as typeof fetch, uploadsUrl: "https://portal.example/integration/v1/deal-documents/uploads",
        signingKey: KEY, start: vi.fn(async () => "sub-1"), finish,
        readVaultFile: vi.fn(async () => ({ bytes, mime_type: "application/pdf" })), ...over,
      },
    };
  }
  const input = { pipeline_id: P, anon_borrower_id: A, requirement_id: item.requirement_id, file_name: "payslip.pdf", document_date: "2026-09-30" };

  it("slot -> PUT bytes -> complete with the hash, all signed and in-contract", async () => {
    const { d, calls, finish } = deps();
    const out = await shareFromVault(d, input);
    expect(out.document.status).toBe("received");
    expect(calls.map((c) => c.url)).toEqual([
      d.uploadsUrl, "https://storage.example/slot?token=t", `${d.uploadsUrl}/${U}/complete`]);
    const slotBody = JSON.parse(calls[0].init.body as string);
    expect(slotBody).toMatchObject({ source: "vault", document_date: "2026-09-30", size_bytes: bytes.byteLength });
    const sig = (calls[0].init.headers as Record<string, string>)["Ficium-Signature"];
    expect(() => verify(sig, Buffer.from(calls[0].init.body as string), [KEY])).not.toThrow();
    expect(JSON.parse(calls[2].init.body as string).sha256).toBe(sha256Hex(bytes));
    expect(finish).toHaveBeenCalledWith("sub-1", true, U, sha256Hex(bytes), null);
  });

  it("a failure is recorded as failed and rethrown", async () => {
    const { d, finish } = deps({
      fetchFn: (async () => new Response("deal closed", { status: 409 })) as unknown as typeof fetch,
    });
    await expect(shareFromVault(d, input)).rejects.toThrow("deal closed");
    expect(finish).toHaveBeenCalledWith("sub-1", false, null, sha256Hex(bytes), "deal closed");
  });

  it("refuses to send anything when the App DB refuses the share (e.g. too old)", async () => {
    const { d, calls } = deps({ start: vi.fn(async () => { throw new Error("DOC_VAULT_TOO_OLD"); }) });
    await expect(shareFromVault(d, input)).rejects.toThrow("DOC_VAULT_TOO_OLD");
    expect(calls).toEqual([]);
  });
});
