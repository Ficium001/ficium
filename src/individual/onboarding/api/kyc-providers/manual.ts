// =============================================================
// Ficium KYC — Manual Review Provider
//
// The in-house provider. Uploads are stored in Supabase Storage
// and the `kyc_status` is set to "pending_review". An admin
// then reviews via the KYC dashboard and approves/rejects.
//
// Cost: $0/user. Legally sufficient in Mauritius at startup stage.
// =============================================================
import type { KycProvider, KycVerifyInput, KycVerifyResult } from "./types";

export const manualReviewProvider: KycProvider = {
  name: "manual_review",

  async verify(_input: KycVerifyInput): Promise<KycVerifyResult> {
    // No external API call needed — the files are already in Supabase Storage.
    // The kyc.ts orchestrator sets kyc_status = "pending_review".
    // An admin will approve or reject via the KYC dashboard.
    return {
      ok:           true,
      referenceId:  `manual-${Date.now()}`,
      needsReview:  true,
      riskScore:    50, // neutral — admin will score
    };
  },
};
