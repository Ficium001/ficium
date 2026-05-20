import { supabase } from "../../../shared/lib/supabase";

/* ---------- Types ---------- */

export type KycInput = {
  documentType: "national_id" | "passport" | "drivers_license" | "other";
  documentNumber: string;
  dateOfBirth: string;
  idFile: File;
  selfieFile: File;
};

export type KycResult =
  | { ok: true }
  | { ok: false; error: string };

/* ---------- Upload helper ---------- */

async function uploadKycFile(
  userId: string,
  file: File,
  label: "id" | "selfie"
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

async function verifyWithProvider(_input: Omit<KycInput, "idFile" | "selfieFile">): Promise<{ ok: boolean }> {
  await new Promise((r) => setTimeout(r, 900));
  return { ok: true };
}

/* ---------- Public API ---------- */

export async function submitKyc(input: KycInput): Promise<KycResult> {
  // 1. Get current user
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return { ok: false, error: "Not signed in." };

  // 2. Upload ID document
  const idUpload = await uploadKycFile(userId, input.idFile, "id");
  if ("error" in idUpload) {
    return { ok: false, error: `ID upload failed: ${idUpload.error}` };
  }

  // 3. Upload selfie
  const selfieUpload = await uploadKycFile(userId, input.selfieFile, "selfie");
  if ("error" in selfieUpload) {
    return { ok: false, error: `Selfie upload failed: ${selfieUpload.error}` };
  }

  // 4. Verify with external provider (stubbed)
  const verification = await verifyWithProvider({
    documentType: input.documentType,
    documentNumber: input.documentNumber,
    dateOfBirth: input.dateOfBirth,
  });
  if (!verification.ok) {
    return { ok: false, error: "We could not verify your ID. Please try again." };
  }

  // 5. Update users row with doc fields + file paths
  const { error } = await supabase
    .from("users")
    .update({
      id_document_type: input.documentType,
      id_document_number: input.documentNumber,
      date_of_birth: input.dateOfBirth,
      kyc_status: "verified",
      id_document_path: idUpload.path,
      selfie_path: selfieUpload.path,
    })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}