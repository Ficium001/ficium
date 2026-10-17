/** A bank's document request on an accepted deal (contract 1.6), as the borrower app serves it. */
export type BankDocStatus = "required" | "received" | "verified" | "rejected" | "waived";

export interface VaultOption {
  id: string;
  file_name: string;
  doc_date: string | null;
  usable: boolean;
  /** Why a vault copy can't be sent: no known date, older than the bank accepts, or a format banks don't take. */
  reason: "undated" | "too_old" | "format" | null;
  age_days: number | null;
}

export interface BankDocumentItem {
  requirement_id: string;
  name: string;
  description?: string | null;
  provided_by: "borrower" | "bank" | "third_party";
  mandatory: boolean;
  stage_label?: string | null;
  status: BankDocStatus;
  review_note?: string | null;
  document_type?: string | null;
  max_age_days?: number | null;
  awaiting_borrower: boolean;
  vault_options: VaultOption[];
}

export interface BankDocumentChecklist {
  pipeline_id: string;
  updated_at: string;
  items: BankDocumentItem[];
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
