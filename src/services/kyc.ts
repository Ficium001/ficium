import { supabase } from "../lib/supabase";

/* ---------- Types ---------- */

export type KycInput = {
  documentType: "national_id" | "passport" | "drivers_license" | "other";
  documentNumber: string;
  dateOfBirth: string; // ISO date, YYYY-MM-DD
};

export type KycResult =
  | { ok: true }
  | { ok: false; error: string };

/* ---------- Stub: external KYC verification ---------- */

/**
 * STUB — replace with real Smile ID call when integrating.
 * Currently always succeeds. The real version would:
 *   1. Upload ID images + selfie to Smile ID
 *   2. Wait for verification result (face match, document authenticity, liveness)
 *   3. Return ok: true only if all checks pass
 */
async function verifyWithProvider(_input: KycInput): Promise<{ ok: boolean }> {
  await new Promise((r) => setTimeout(r, 900)); // simulate network latency
  return { ok: true };
}

/* ---------- Public API ---------- */

/**
 * Submit KYC: verify with provider (stubbed), then update the users row
 * with the verified ID document fields and flip kyc_status to 'verified'.
 */
export async function submitKyc(input: KycInput): Promise<KycResult> {
  // 1. Verify with external provider (stub)
  const verification = await verifyWithProvider(input);
  if (!verification.ok) {
    return { ok: false, error: "We could not verify your ID. Please try again." };
  }

  // 2. Get the current logged-in user (RLS uses this)
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) {
    return { ok: false, error: "Not signed in." };
  }

  // 3. Update our users row
  const { error } = await supabase
    .from("users")
    .update({
      id_document_type: input.documentType,
      id_document_number: input.documentNumber,
      date_of_birth: input.dateOfBirth,
      kyc_status: "verified",
    })
    .eq("id", userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}