/**
 * A bank's document request on a deal the borrower accepted (contract 1.6).
 *
 *   GET  ?action=documents&requestId=     the checklist, with matching vault copies per item
 *   POST { action: "document-send", requestId, requirementId, vaultDocumentId, source, documentDate? }
 *
 * The borrower answers each item by sending a document that is in their vault: an existing copy
 * (source "vault") or one they just uploaded for this request (source "new"; the browser saves it to the
 * vault first, so files never leave from the browser). Everything goes to the institution side through
 * the interface API (signed slot -> signed bytes -> signed confirm). Never to its storage or database.
 *
 * The age rule is enforced three times: here (vaultOptions), in the App DB
 * (integration_start_document_submission) and by the institution side.
 */
import type { ServiceDb } from "../db.js";
import {
  type ChecklistItem, type VaultDoc, awaitsBorrower, shareFromVault, vaultOptions, SENDABLE_MIME,
  DocumentCallError,
} from "../integration/documents.js";

export interface DocumentsConfig {
  enabled: boolean;
  uploadsUrl: string;   // https://<interface>/integration/v1/deal-documents/uploads
  signingKey: string;   // the acceptance call's key: same caller, same trust
  fetchFn: typeof fetch;
}

interface Checklist {
  pipeline_id: string;
  request_id: string;
  documents: ChecklistItem[];
  updated_at: string;
}

async function checklistFor(db: ServiceDb, clientId: string, requestId: string): Promise<Checklist | null> {
  const { data, error } = await (db as any).rpc("integration_deal_documents_for", {
    p_client_id: clientId, p_request_id: requestId,
  });
  if (error) throw new Error(`deal_documents_for: ${error.message}`);
  return (data as Checklist | null) ?? null;
}

async function vaultDocs(db: ServiceDb, clientId: string, types: string[]): Promise<VaultDoc[]> {
  if (!types.length) return [];
  const { data, error } = await db
    .from("client_vault_document")
    .select("id, doc_type, file_name, doc_date, mime_type, deleted_at")
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .in("doc_type", types);
  if (error) throw new Error(`vault: ${error.message}`);
  return (data ?? []) as VaultDoc[];
}

/** The checklist as the borrower sees it: each item they owe, with vault copies marked usable or why not. */
export async function listDocuments(db: ServiceDb, clientId: string, requestId: string) {
  const checklist = await checklistFor(db, clientId, requestId);
  if (!checklist) return { status: 200, body: { checklist: null } };
  const types = [...new Set(checklist.documents.map((d) => d.document_type).filter((t): t is string => !!t))];
  const vault = await vaultDocs(db, clientId, types);
  const today = new Date();
  return {
    status: 200,
    body: {
      checklist: {
        pipeline_id: checklist.pipeline_id,
        updated_at: checklist.updated_at,
        items: checklist.documents.map((item) => ({
          ...item,
          awaiting_borrower: awaitsBorrower(item),
          vault_options: awaitsBorrower(item)
            ? vaultOptions(item, vault, today).map((o) => ({
                id: o.doc.id, file_name: o.doc.file_name, doc_date: o.doc.doc_date,
                usable: o.usable, reason: o.usable ? null : o.reason, age_days: o.ageDays ?? null,
              }))
            : [],
        })),
      },
    },
  };
}

const REFUSALS: Record<string, [number, string]> = {
  DOC_NOT_REQUESTED: [404, "The bank hasn't requested this document."],
  DOC_NOT_FROM_BORROWER: [409, "The bank provides this document itself."],
  DOC_ALREADY_DONE: [409, "This document is already accepted."],
  DOC_VAULT_NOT_FOUND: [404, "That document isn't in your vault."],
  DOC_VAULT_UNDATED: [422, "We can't tell the date of that copy. Upload a new one."],
  DOC_VAULT_TOO_OLD: [422, "That copy is older than the bank accepts. Upload a new one."],
};

export interface SendInput {
  requestId: string;
  requirementId: string;
  vaultDocumentId: string;
  source: "vault" | "new";
  documentDate?: string | null;
}

export async function sendDocument(db: ServiceDb, cfg: DocumentsConfig, clientId: string, input: SendInput) {
  if (!cfg.enabled || !cfg.uploadsUrl || !cfg.signingKey) {
    return { status: 503, body: { error: "Sending documents to the bank isn't switched on yet." } };
  }
  const checklist = await checklistFor(db, clientId, input.requestId);
  const item = checklist?.documents.find((d) => d.requirement_id === input.requirementId);
  if (!checklist || !item) return { status: 404, body: { error: "The bank hasn't requested this document." } };

  const { data: doc, error: docErr } = await db
    .from("client_vault_document")
    .select("id, storage_path, file_name, mime_type, doc_date")
    .eq("id", input.vaultDocumentId).eq("client_id", clientId).is("deleted_at", null)
    .maybeSingle();
  if (docErr) throw new Error(`vault: ${docErr.message}`);
  if (!doc) return { status: 404, body: { error: "That document isn't in your vault." } };
  if (!SENDABLE_MIME.has(doc.mime_type)) {
    return { status: 422, body: { error: "Banks accept PDF, JPEG or PNG. Upload the document in one of those." } };
  }

  // A vault copy carries its own (extracted) date; a new upload, the date the borrower gave it.
  const documentDate = input.source === "vault" ? doc.doc_date : (input.documentDate ?? doc.doc_date ?? null);

  const { data: anon, error: anonErr } = await (db as any).rpc("integration_anon_borrower_id", { p_client_id: clientId });
  if (anonErr || !anon) throw new Error(`anon_borrower_id: ${anonErr?.message ?? "missing"}`);

  try {
    const out = await shareFromVault({
      fetchFn: cfg.fetchFn, uploadsUrl: cfg.uploadsUrl, signingKey: cfg.signingKey,
      async start() {
        const { data, error } = await (db as any).rpc("integration_start_document_submission", {
          p_client_id: clientId, p_pipeline_id: checklist.pipeline_id, p_requirement_id: input.requirementId,
          p_source: input.source, p_vault_document_id: doc.id, p_document_date: documentDate,
        });
        if (error) throw new Error(error.message);
        return data as string;
      },
      async finish(id, ok, uploadId, sha, err) {
        const { error } = await (db as any).rpc("integration_finish_document_submission", {
          p_submission_id: id, p_ok: ok, p_upload_id: uploadId, p_sha256: sha, p_error: err, p_bank_name: null,
        });
        if (error) console.error(JSON.stringify({ evt: "document_submission_finish_failed", id, error: error.message }));
      },
      async readVaultFile() {
        const { data, error } = await db.storage.from("documents").download(doc.storage_path);
        if (error || !data) throw new Error(`vault file: ${error?.message ?? "missing"}`);
        return { bytes: new Uint8Array(await data.arrayBuffer()), mime_type: doc.mime_type };
      },
    }, {
      pipeline_id: checklist.pipeline_id, anon_borrower_id: anon as string,
      requirement_id: input.requirementId, file_name: doc.file_name, source: input.source,
      document_date: documentDate,
    });
    return { status: 200, body: { document: out.document } };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    const hit = Object.keys(REFUSALS).find((k) => m.includes(k));
    if (hit) return { status: REFUSALS[hit][0], body: { error: REFUSALS[hit][1] } };
    if (e instanceof DocumentCallError) {
      console.error(JSON.stringify({ evt: "document_send_refused", status: e.status, detail: m.slice(0, 300) }));
      return { status: e.status >= 500 ? 502 : e.status, body: { error: "The bank couldn't take this document. Try again." } };
    }
    throw e;
  }
}
