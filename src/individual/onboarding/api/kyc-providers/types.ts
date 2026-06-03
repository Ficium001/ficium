// =============================================================
// Ficium KYC — Provider interface
// Every KYC provider must implement this contract.
// To swap providers, change one line in index.ts.
// =============================================================

export interface KycVerifyInput {
  userId:         string;
  documentType:   "national_id" | "passport" | "drivers_license" | "other";
  documentNumber: string;
  dateOfBirth:    string;
  addressLine1:   string;
  addressLine2?:  string;
  city:           string;
  postalCode?:    string;
  country:        string;
  /** Supabase Storage path for the uploaded ID document */
  idDocumentPath:      string;
  /** Supabase Storage path for the uploaded selfie */
  selfiePath:          string;
  /** Supabase Storage path for the uploaded proof of address */
  proofOfAddressPath:  string;
}

export interface KycVerifyResult {
  ok:           boolean;
  /** Reference ID from the provider for audit trails */
  referenceId?: string;
  /** Human-readable reason for rejection, if any */
  reason?:      string;
  /** Auto-computed risk score 0–100 (higher = more suspicious) */
  riskScore?:   number;
  /** Whether the submission needs human review */
  needsReview?: boolean;
  /** List of specific flags raised during verification */
  flags?:       string[];
}

export interface KycProvider {
  name: string;
  verify(input: KycVerifyInput): Promise<KycVerifyResult>;
}
