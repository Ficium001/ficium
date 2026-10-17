/**
 * Contract 1.5: a bank requests documents for a deal the borrower accepted. For each item the borrower either
 * shares a matching copy from their vault or uploads a new one.
 *
 * The age rule: a vault copy can be shared only if it has a date and that date is within the item's
 * max_age_days. Otherwise the borrower must upload new. Enforced here, again in the App DB
 * (integration_start_document_submission), and checkable by the bank from document_date.
 *
 * Everything goes through the institution's interface API (contract 1.6): the borrower side asks for a
 * one-time slot, PUTs the file to the interface's content endpoint (signed over the bytes, like every call),
 * then confirms with its SHA-256. Never to either side's storage. Pure: everything external is injected.
 */
import { createHash } from "node:crypto";
import {
  SIGNATURE_HEADER, sign,
  validateDocumentUploadRequest, validateDocumentUploadResponse,
  validateDocumentCompleteRequest, validateDocumentCompleteResponse,
} from "@ficium/contract";

export interface ChecklistItem {
  requirement_id: string;
  name: string;
  provided_by: "borrower" | "bank" | "third_party";
  status: "required" | "received" | "verified" | "rejected" | "waived";
  document_type?: string | null;
  max_age_days?: number | null;
}

export interface VaultDoc {
  id: string;
  doc_type: string;
  file_name: string;
  doc_date: string | null; // the document's own date, from extraction
  deleted_at?: string | null;
}

export type VaultOption =
  | { doc: VaultDoc; usable: true; ageDays: number }
  | { doc: VaultDoc; usable: false; reason: "undated" | "too_old"; ageDays?: number };

const DAY = 86_400_000;
const ageInDays = (date: string, today: Date): number =>
  Math.floor((Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - Date.parse(`${date}T00:00:00Z`)) / DAY);

/** Vault copies of the requested type, newest first, each marked usable or not (and why). */
export function vaultOptions(item: ChecklistItem, vault: VaultDoc[], today = new Date()): VaultOption[] {
  if (item.provided_by !== "borrower" || !item.document_type || item.document_type === "other") return [];
  return vault
    .filter((d) => !d.deleted_at && d.doc_type === item.document_type)
    .sort((a, b) => (b.doc_date ?? "").localeCompare(a.doc_date ?? ""))
    .map((doc): VaultOption => {
      if (!doc.doc_date) return { doc, usable: false, reason: "undated" };
      const ageDays = ageInDays(doc.doc_date, today);
      if (item.max_age_days != null && ageDays > item.max_age_days) {
        return { doc, usable: false, reason: "too_old", ageDays };
      }
      return { doc, usable: true, ageDays };
    });
}

/** Can this item still take a document from the borrower? */
export const awaitsBorrower = (i: ChecklistItem): boolean =>
  i.provided_by === "borrower" && (i.status === "required" || i.status === "rejected");

export interface PortalCallDeps {
  fetchFn: typeof fetch;
  uploadsUrl: string;  // .../integration/v1/deal-documents/uploads
  signingKey: string;
}

export class DocumentCallError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function signedPost(deps: PortalCallDeps, url: string, body: unknown): Promise<any> {
  const raw = JSON.stringify(body);
  const res = await deps.fetchFn(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", [SIGNATURE_HEADER]: sign(raw, deps.signingKey) },
    body: raw,
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) throw new DocumentCallError(res.status, text.slice(0, 500));
  return JSON.parse(text);
}

export interface SlotInput {
  pipeline_id: string;
  anon_borrower_id: string;
  requirement_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  source: "vault" | "new";
  document_date?: string | null;
}

export async function requestSlot(deps: PortalCallDeps, input: SlotInput) {
  const body: Record<string, unknown> = { ...input };
  if (input.source === "new" && !input.document_date) delete body.document_date;
  validateDocumentUploadRequest(body);
  const out = await signedPost(deps, deps.uploadsUrl, body);
  validateDocumentUploadResponse(out);
  return out as { upload_id: string; upload_url: string; expires_at: string };
}

export async function completeUpload(
  deps: PortalCallDeps,
  input: { upload_id: string; pipeline_id: string; anon_borrower_id: string; sha256: string },
) {
  validateDocumentCompleteRequest(input);
  const out = await signedPost(deps, `${deps.uploadsUrl}/${input.upload_id}/complete`, input);
  validateDocumentCompleteResponse(out);
  return out as { pipeline_id: string; document: ChecklistItem & { review_note?: string | null } };
}

export const sha256Hex = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

export interface ShareDeps extends PortalCallDeps {
  start(): Promise<string>; // integration_start_document_submission -> submission id (enforces the age rule)
  finish(submissionId: string, ok: boolean, uploadId: string | null, sha: string | null, err: string | null): Promise<void>;
  readVaultFile(): Promise<{ bytes: Uint8Array; mime_type: string }>;
}

/** Share one vault copy with the bank: record, slot, upload, confirm, record. */
export async function shareFromVault(
  deps: ShareDeps,
  input: Omit<SlotInput, "source" | "size_bytes" | "mime_type"> & { document_date: string },
) {
  const submissionId = await deps.start();
  let uploadId: string | null = null;
  let sha: string | null = null;
  try {
    const file = await deps.readVaultFile();
    sha = sha256Hex(file.bytes);
    const slot = await requestSlot(deps, {
      ...input, source: "vault", mime_type: file.mime_type, size_bytes: file.bytes.byteLength,
    });
    uploadId = slot.upload_id;
    const put = await deps.fetchFn(slot.upload_url, {
      method: "PUT",
      headers: { "Content-Type": file.mime_type, [SIGNATURE_HEADER]: sign(Buffer.from(file.bytes), deps.signingKey) },
      body: file.bytes,
      signal: AbortSignal.timeout(60_000),
    });
    if (!put.ok) throw new DocumentCallError(502, `upload failed: ${put.status}`);
    const done = await completeUpload(deps, {
      upload_id: slot.upload_id, pipeline_id: input.pipeline_id, anon_borrower_id: input.anon_borrower_id, sha256: sha,
    });
    await deps.finish(submissionId, true, uploadId, sha, null);
    return done;
  } catch (e) {
    await deps.finish(submissionId, false, uploadId, sha, e instanceof Error ? e.message : String(e));
    throw e;
  }
}
