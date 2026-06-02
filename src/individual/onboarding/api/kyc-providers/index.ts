// =============================================================
// Ficium KYC — Active Provider
//
// ✅ TO SWITCH PROVIDERS: change the import and activeProvider line.
// The rest of the codebase never changes.
//
// Available providers:
//   inhouseProvider       ← Google Vision OCR + liveness, ~$0.003/user ✅ ACTIVE
//   manualReviewProvider  ← $0, admin reviews manually, no automation
// =============================================================
import { inhouseProvider }      from "./inhouse";
// import { manualReviewProvider } from "./manual"; // fallback

import type { KycProvider } from "./types";

export const activeProvider: KycProvider = inhouseProvider;
export type { KycProvider, KycVerifyInput, KycVerifyResult } from "./types";
