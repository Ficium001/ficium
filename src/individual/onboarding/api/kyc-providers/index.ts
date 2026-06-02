// =============================================================
// Ficium KYC — Active Provider
//
// ✅ TO SWITCH PROVIDERS: change the import and activeProvider line.
// The rest of the codebase (kyc.ts, admin dashboard) never changes.
//
// Available providers:
//   manualReviewProvider  ← in-house, $0/user, admin reviews uploads
//   (future) sumsub       ← global, document + liveness, ~$1–2/user
//   (future) onfido       ← document + biometric
// =============================================================
import { manualReviewProvider } from "./manual";
import type { KycProvider } from "./types";

export const activeProvider: KycProvider = manualReviewProvider;
export type { KycProvider, KycVerifyInput, KycVerifyResult } from "./types";
