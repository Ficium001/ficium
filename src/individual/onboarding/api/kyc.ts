import { supabase } from "../../../shared/lib/supabase";
import { audit } from "../../../shared/lib/audit";

/* ---------- Types ---------- */

export type KycInput = {
  documentType: "national_id" | "passport" | "drivers_license" | "other";
  documentNumber: string;
  dateOfBirth: string;
  idFile: File;
  selfieFile: File;
  proofOfAddressFile: File;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode?: string;
  country: string;
};

export type KycResult =
  | { ok: true }
  | { ok: false; error: string };

/* ---------- Upload helper ---------- */

async function uploadKycFile(
  userId: string,
  file: File,
  label: "id" | "selfie" | "proof_of_address"
): Promise<{ path: string } | { error: string }> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${label}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("kyc-documents")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (error) return { error: error.message };
  return { path };
}

/* ---------- Stub: external KYC verification ---------- */

async function verifyWithProvider(
  _input: Omit<KycInput, "idFile" | "selfieFile" | "proofOfAddressFile">
): Promise<{ ok: boolean }> {
  await new Promise((r) => setTimeout(r, 900));
  return { ok: true };
}

/* ---------- Public API ---------- */

export async function submitKyc(input: KycInput): Promise<KycResult> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return { ok: false, error: "Not signed in." };

  // Upload ID document
  const idUpload = await uploadKycFile(userId, input.idFile, "id");
  if ("error" in idUpload) return { ok: false, error: `ID upload failed: ${idUpload.error}` };

  // Upload selfie
  const selfieUpload = await uploadKycFile(userId, input.selfieFile, "selfie");
  if ("error" in selfieUpload) return { ok: false, error: `Selfie upload failed: ${selfieUpload.error}` };

  // Upload proof of address
  const proofUpload = await uploadKycFile(userId, input.proofOfAddressFile, "proof_of_address");
  if ("error" in proofUpload) return { ok: false, error: `Proof of address upload failed: ${proofUpload.error}` };

  // Verify with provider (stubbed)
  const verification = await verifyWithProvider({
    documentType: input.documentType,
    documentNumber: input.documentNumber,
    dateOfBirth: input.dateOfBirth,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2,
    city: input.city,
    postalCode: input.postalCode,
    country: input.country,
  });
  if (!verification.ok) return { ok: false, error: "We could not verify your ID. Please try again." };

  // V2: update public.clients instead of public.users
  const { error } = await supabase
    .from("clients")
    .update({
      id_document_type: input.documentType,
      id_document_number: input.documentNumber,
      date_of_birth: input.dateOfBirth,
      kyc_status: "verified",
      id_document_path: idUpload.path,
      selfie_path: selfieUpload.path,
      address_line_1: input.addressLine1,
      address_line_2: input.addressLine2 || null,
      city: input.city,
      postal_code: input.postalCode || null,
      country: input.country,
    })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };

  await audit.kycSubmitted(userId);
  return { ok: true };
}
