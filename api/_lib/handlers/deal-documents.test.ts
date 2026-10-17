import { describe, it, expect, vi } from "vitest";
import { verify } from "@ficium/contract";
import { listDocuments, sendDocument, type DocumentsConfig } from "./deal-documents";

const CLIENT = "00000000-0000-4000-8000-0000000000c1";
const REQ = "00000000-0000-4000-8000-000000000001";
const P = "00000000-0000-4000-8000-000000000030";
const R = "00000000-0000-4000-8000-000000000040";
const U = "00000000-0000-4000-8000-000000000050";
const V = "00000000-0000-4000-8000-0000000000v1".replace("v", "a");
const ANON = "00000000-0000-4000-8000-000000000099";
const KEY = "k-borrower";
const recent = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);

const item = { requirement_id: R, name: "Proof of income", provided_by: "borrower", mandatory: true,
  status: "required", document_type: "payslip", max_age_days: 90 };
const checklist = { pipeline_id: P, request_id: REQ, updated_at: "2026-10-17T09:00:00Z",
  documents: [item, { ...item, requirement_id: "r2", name: "Valuation", provided_by: "bank", document_type: null }] };

function fakeDb(over: { vault?: any[]; doc?: any; startError?: string } = {}) {
  const rpc = vi.fn(async (fn: string) => {
    if (fn === "integration_deal_documents_for") return { data: checklist, error: null };
    if (fn === "integration_anon_borrower_id") return { data: ANON, error: null };
    if (fn === "integration_start_document_submission")
      return over.startError ? { data: null, error: { message: over.startError } } : { data: "sub-1", error: null };
    return { data: null, error: null };
  });
  const q: any = {};
  for (const m of ["select", "eq", "is", "in"]) q[m] = vi.fn(() => q);
  q.then = (r: any) => r({ data: over.vault ?? [], error: null });
  q.maybeSingle = vi.fn(async () => ({ data: over.doc === undefined
    ? { id: V, storage_path: "c/payslip/1.pdf", file_name: "payslip.pdf", mime_type: "application/pdf", doc_date: recent }
    : over.doc, error: null }));
  const bytes = new TextEncoder().encode("%PDF-1.7 payslip");
  const storage = { from: () => ({ download: async () => ({ data: new Blob([bytes]), error: null }) }) };
  return { db: { rpc, from: vi.fn(() => q), storage } as any, rpc, bytes };
}

function cfg(over: Partial<DocumentsConfig> = {}) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    if (url.endsWith("/uploads")) return new Response(JSON.stringify({ upload_id: U,
      upload_url: `https://portal.example/integration/v1/deal-documents/uploads/${U}/content`,
      expires_at: "2026-10-17T10:10:00Z" }), { status: 201 });
    if (url.endsWith("/content")) return new Response("{}", { status: 200 });
    return new Response(JSON.stringify({ pipeline_id: P, document: { ...item, status: "received" } }), { status: 200 });
  });
  return { calls, c: { enabled: true, uploadsUrl: "https://portal.example/integration/v1/deal-documents/uploads",
    signingKey: KEY, fetchFn: fetchFn as unknown as typeof fetch, ...over } };
}

const send = { requestId: REQ, requirementId: R, vaultDocumentId: V, source: "vault" as const };

describe("listDocuments", () => {
  it("offers vault copies only for items the borrower owes", async () => {
    const { db } = fakeDb({ vault: [
      { id: "fresh", doc_type: "payslip", file_name: "a.pdf", doc_date: recent, mime_type: "application/pdf" },
      { id: "word", doc_type: "payslip", file_name: "b.docx", doc_date: recent,
        mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    ] });
    const out = await listDocuments(db, CLIENT, REQ);
    const [mine, bank] = (out.body.checklist as any).items;
    expect(mine.awaiting_borrower).toBe(true);
    expect(mine.vault_options.map((o: any) => [o.id, o.usable, o.reason])).toEqual([
      ["fresh", true, null], ["word", false, "format"]]);
    expect(bank.awaiting_borrower).toBe(false);
    expect(bank.vault_options).toEqual([]);
  });
});

describe("sendDocument", () => {
  it("is off until switched on", async () => {
    const { db } = fakeDb();
    expect((await sendDocument(db, cfg({ enabled: false }).c, CLIENT, send)).status).toBe(503);
  });

  it("only from the borrower's own vault, in a format banks take", async () => {
    expect((await sendDocument(fakeDb({ doc: null }).db, cfg().c, CLIENT, send)).status).toBe(404);
    const word = { id: V, storage_path: "x", file_name: "x.docx", doc_date: recent,
      mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
    expect((await sendDocument(fakeDb({ doc: word }).db, cfg().c, CLIENT, send)).status).toBe(422);
  });

  it("maps the App DB's age refusal and sends nothing", async () => {
    const { db } = fakeDb({ startError: "DOC_VAULT_TOO_OLD" });
    const { c, calls } = cfg();
    const out = await sendDocument(db, c, CLIENT, send);
    expect(out.status).toBe(422);
    expect(String((out.body as any).error)).toMatch(/older than the bank accepts/);
    expect(calls).toEqual([]);
  });

  it("sends through the interface, every hop signed, with the vault copy's own date", async () => {
    const { db, rpc, bytes } = fakeDb();
    const { c, calls } = cfg();
    const out = await sendDocument(db, c, CLIENT, send);
    expect(out.status).toBe(200);
    expect(calls.map((x) => new URL(x.url).pathname.split("/").slice(-1)[0])).toEqual(["uploads", "content", "complete"]);
    for (const x of calls) {
      const sig = (x.init.headers as Record<string, string>)["Ficium-Signature"];
      const body = x.url.endsWith("/content") ? Buffer.from(bytes) : Buffer.from(x.init.body as string);
      expect(() => verify(sig, body, [KEY])).not.toThrow();
    }
    expect(JSON.parse(calls[0].init.body as string)).toMatchObject({
      source: "vault", document_date: recent, anon_borrower_id: ANON, pipeline_id: P });
    expect(rpc).toHaveBeenCalledWith("integration_finish_document_submission", expect.objectContaining({ p_ok: true }));
  });

  it("a new upload carries the date the borrower gave it", async () => {
    const { db } = fakeDb();
    const { c, calls } = cfg();
    await sendDocument(db, c, CLIENT, { ...send, source: "new", documentDate: "2026-10-01" });
    expect(JSON.parse(calls[0].init.body as string)).toMatchObject({ source: "new", document_date: "2026-10-01" });
  });
});
