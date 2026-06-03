// =============================================================
// Ficium KYC — Orchestrator
//
// Handles: upload → provider.verify() → DB write → audit log.
// Writes full KYC detail to kyc_submissions table.
// Updates kyc_status summary on clients table.
// =============================================================
import { supabase } from "../../../shared/lib/supabase";
import { audit }    from "../../../shared/lib/audit";
import { activeProvider } from "./kyc-providers";

/* ---------- Types ---------- */

export type KycInput = {
  documentType:      "national_id" | "passport" | "drivers_license" | "other";
  documentNumber:    string;
  dateOfBirth:       string;
  idFile:            File;
  selfieFile:        File;
  proofOfAddressFile:File;
  addressLine1:      string;
  addressLine2?:     string;
  city:              string;
  postalCode?:       string;
  country:           string;
};

export type KycResult =
  | { ok: true;  needsReview: boolean }
  | { ok: false; error: string };

/* ---------- Upload helper ---------- */

async function uploadKycFile(
  userId: string,
  file:   File,
  label:  "id" | "selfie" | "proof_of_address"
): Promise<{ path: string } | { error: string }> {
  const ext  = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${label}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("kyc-documents")
    .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });

  if (error) return { error: error.message };
  return { path };
}

/* ---------- Public API ---------- */

export async function submitKyc(input: KycInput): Promise<KycResult> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return { ok: false, error: "Not signed in." };

  // 1. Upload all three documents in parallel
  const [idUpload, selfieUpload, proofUpload] = await Promise.all([
    uploadKycFile(userId, input.idFile,             "id"),
    uploadKycFile(userId, input.selfieFile,         "selfie"),
    uploadKycFile(userId, input.proofOfAddressFile, "proof_of_address"),
  ]);

  if ("error" in idUpload)    return { ok: false, error: `ID upload failed: ${idUpload.error}` };
  if ("error" in selfieUpload)return { ok: false, error: `Selfie upload failed: ${selfieUpload.error}` };
  if ("error" in proofUpload) return { ok: false, error: `Proof upload failed: ${proofUpload.error}` };

  // 2. Run provider verification
  const verification = await activeProvider.verify({
    userId,
    documentType:      input.documentType,
    documentNumber:    input.documentNumber,
    dateOfBirth:       input.dateOfBirth,
    addressLine1:      input.addressLine1,
    addressLine2:      input.addressLine2,
    city:              input.city,
    postalCode:        input.postalCode,
    country:           input.country,
    idDocumentPath:    idUpload.path,
    selfiePath:        selfieUpload.path,
    proofOfAddressPath:proofUpload.path,
  });

  if (!verification.ok) {
    return { ok: false, error: verification.reason ?? "We could not verify your ID. Please try again." };
  }

  const kycStatus = verification.needsReview ? "pending_review" : "verified";

  // 3. Insert into kyc_submissions
  const { error: submissionError } = await supabase
    .from("kyc_submissions")
    .insert({
      client_id:            userId,
      provider:             activeProvider.name,
      reference_id:         verification.referenceId ?? null,
      risk_score:           verification.riskScore   ?? null,
      status:               kycStatus,
      flags:                verification.flags        ?? [],
      details:              verification.details      ?? null,
      document_type:        input.documentType,
      document_number:      input.documentNumber,
      id_document_path:     idUpload.path,
      selfie_path:          selfieUpload.path,
      proof_of_address_path:proofUpload.path,
    });

  if (submissionError) return { ok: false, error: submissionError.message };

  // 4. Update kyc_status summary + address on clients
  const { error: clientError } = await supabase
    .from("clients")
    .update({
      kyc_status:   kycStatus,
      date_of_birth: input.dateOfBirth,
      address_line_1: input.addressLine1,
      address_line_2: input.addressLine2 || null,
      city:           input.city,
      postal_code:    input.postalCode   || null,
      country:        input.country,
    })
    .eq("id", userId);

  if (clientError) return { ok: false, error: clientError.message };

  await audit.kycSubmitted(userId);
  return { ok: true, needsReview: verification.needsReview ?? false };
}
