// =============================================================
// Ficium KYC — In-House Provider (AWS Rekognition + Textract)
//
// Pipeline (server-side via /api/kyc-verify):
//   1. Fetch signed URLs for all 3 uploaded files
//   2. Convert images to base64 in browser
//   3. POST to /api/kyc-verify (Vercel serverless function)
//   4. Server runs Textract OCR + Rekognition face/liveness
//   5. Returns scored result → DB write handled by orchestrator
//
// AWS keys never touch the browser.
// =============================================================

import { supabase } from "../../../../shared/lib/supabase";
import type { KycProvider, KycVerifyInput, KycVerifyResult } from "./types";

/* ---------- Helpers ---------- */

async function getSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from("kyc-documents")
    .createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

async function fetchAsBase64(signedUrl: string): Promise<string> {
  const res    = await fetch(signedUrl);
  const buffer = await res.arrayBuffer();
  const bytes  = new Uint8Array(buffer);
  let binary   = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/* ---------- Main provider ---------- */

export const inhouseProvider: KycProvider = {
  name: "inhouse_aws",

  async verify(input: KycVerifyInput): Promise<KycVerifyResult> {
    const referenceId = `aws-${Date.now()}`;

    try {
      // 1. Get signed URLs
      const [idUrl, selfieUrl, poaUrl] = await Promise.all([
        getSignedUrl(input.idDocumentPath),
        getSignedUrl(input.selfiePath),
        getSignedUrl(input.proofOfAddressPath),
      ]);

      if (!idUrl || !selfieUrl || !poaUrl) {
        return { ok: false, reason: "Could not access uploaded documents. Please try again.", referenceId };
      }

      // 2. Fetch images as base64
      const [idB64, selfieB64, poaB64] = await Promise.all([
        fetchAsBase64(idUrl),
        fetchAsBase64(selfieUrl),
        fetchAsBase64(poaUrl),
      ]);

      // 3. Call server-side verify endpoint
      const res = await fetch("/api/kyc-verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idB64,
          selfieB64,
          poaB64,
          clientId:       input.userId,
          fullName:       input.fullName,
          documentNumber: input.documentNumber,
          dateOfBirth:    input.dateOfBirth,
          country:        input.country,
          city:           input.city,
          addressLine1:   input.addressLine1,
          poaFileName:    input.proofOfAddressPath.split("/").pop() ?? "",
        }),
      });

      if (!res.ok) throw new Error(`kyc-verify endpoint error: ${res.status}`);
      const result = await res.json() as KycVerifyResult & { flags?: string[] };
      return result;

    } catch (err) {
      console.error("[KYC inhouse] error:", err);
      return {
        ok:          true,
        referenceId,
        riskScore:   50,
        needsReview: true,
        reason:      "Automated check unavailable — queued for manual review.",
      };
    }
  },
};
