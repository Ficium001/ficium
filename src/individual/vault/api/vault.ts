/**
 * src/individual/vault/api/vault.ts
 *
 * Client-side vault API — upload, list, delete, get signed URL.
 * Extraction is handled server-side automatically after upload.
 */

import { supabase , getCachedUser } from "@/shared/lib/supabase";

export type VaultDocType =
  | "nic" | "passport" | "birth_certificate" | "driving_licence"
  | "title_deed" | "valuation_report" | "land_registry_extract"
  | "payslip" | "employment_letter" | "tax_return"
  | "bank_statement" | "loan_statement" | "credit_card_statement"
  | "brn_certificate" | "audited_accounts"
  | "insurance_policy" | "other";

export type ExtractStatus =
  | "pending" | "processing" | "extracted" | "attested" | "failed" | "manual_review";

export type VaultDocument = {
  id:              string;
  doc_type:        VaultDocType;
  file_name:       string;
  file_size_bytes: number | null;
  extract_status:  ExtractStatus;
  confidence:      number | null;
  doc_date:        string | null;
  expires_at:      string | null;
  created_at:      string;
  attested_at:     string | null;
};

export type VaultProperty = {
  id:             string;
  address:        string | null;
  property_type:  string | null;
  land_area_sqm:  number | null;
  market_value:   number | null;
  valuation_date: string | null;
  is_mortgaged:   boolean;
  verified:       boolean;
};

export type UploadResult =
  | { ok: true;  document: VaultDocument }
  | { ok: false; error: string };

export async function uploadVaultDocument(
  file: File,
  docType: VaultDocType,
): Promise<UploadResult> {
  const { data: { user } } = await getCachedUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const ext         = file.name.split(".").pop() ?? "bin";
  const storagePath = `${user.id}/${docType}/${Date.now()}.${ext}`;

  const { data: doc, error: insertErr } = await supabase
    .from("client_vault_document")
    .insert({
      client_id:       user.id,
      doc_type:        docType,
      storage_path:    storagePath,
      file_name:       file.name,
      file_size_bytes: file.size,
      mime_type:       file.type || "application/octet-stream",
      retain_until:    new Date(Date.now() + 5 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    })
    .select()
    .single();

  if (insertErr || !doc) {
    return { ok: false, error: insertErr?.message ?? "Failed to create document record" };
  }

  const { error: uploadErr } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadErr) {
    await supabase.from("client_vault_document").delete().eq("id", doc.id);
    return { ok: false, error: uploadErr.message };
  }

  await supabase.from("client_vault_access_log").insert({
    document_id: doc.id,
    client_id:   user.id,
    action:      "upload",
    actor_id:    user.id,
  });

  return { ok: true, document: doc as VaultDocument };
}

export async function listVaultDocuments(): Promise<VaultDocument[]> {
  const { data, error } = await supabase
    .from("client_vault_document")
    .select("id, doc_type, file_name, file_size_bytes, extract_status, confidence, doc_date, expires_at, created_at, attested_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as VaultDocument[];
}

export async function listVaultProperties(): Promise<VaultProperty[]> {
  const { data, error } = await supabase
    .from("client_vault_property")
    .select("id, address, property_type, land_area_sqm, market_value, valuation_date, is_mortgaged, verified")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as VaultProperty[];
}

export async function getVaultDocumentUrl(documentId: string): Promise<string | null> {
  const { data: doc } = await supabase
    .from("client_vault_document")
    .select("storage_path, client_id")
    .eq("id", documentId)
    .single();

  if (!doc) return null;

  const { data } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.storage_path, 60 * 15);

  const { data: { user } } = await getCachedUser();
  if (user) {
    await supabase.from("client_vault_access_log").insert({
      document_id: documentId,
      client_id:   doc.client_id,
      action:      "view",
      actor_id:    user.id,
    });
  }

  return data?.signedUrl ?? null;
}

export async function deleteVaultDocument(documentId: string): Promise<boolean> {
  const { error } = await supabase
    .from("client_vault_document")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", documentId);
  return !error;
}

export async function getExtractionStatus(documentId: string): Promise<ExtractStatus | null> {
  const { data } = await supabase
    .from("client_vault_document")
    .select("extract_status")
    .eq("id", documentId)
    .single();
  return (data?.extract_status as ExtractStatus) ?? null;
}

export const DOC_TYPE_LABELS: Record<VaultDocType, string> = {
  nic:                   "National Identity Card",
  passport:              "Passport",
  birth_certificate:     "Birth Certificate",
  driving_licence:       "Driving Licence",
  title_deed:            "Title Deed",
  valuation_report:      "Property Valuation Report",
  land_registry_extract: "Land Registry Extract",
  payslip:               "Payslip",
  employment_letter:     "Employment Letter",
  tax_return:            "Tax Return",
  bank_statement:        "Bank Statement",
  loan_statement:        "Loan Statement",
  credit_card_statement: "Credit Card Statement",
  brn_certificate:       "BRN Certificate",
  audited_accounts:      "Audited Accounts",
  insurance_policy:      "Insurance Policy",
  other:                 "Other Document",
};

export const EXTRACT_STATUS_LABELS: Record<ExtractStatus, string> = {
  pending:       "Queued",
  processing:    "Extracting data…",
  extracted:     "Data extracted",
  attested:      "Verified ✓",
  failed:        "Extraction failed",
  manual_review: "Needs review",
};
