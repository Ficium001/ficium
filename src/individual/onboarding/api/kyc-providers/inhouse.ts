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

/**
 * Fetch image from URL, compress it to fit within Vercel's 4.5MB body limit,
 * and return as base64. PDFs are passed through uncompressed.
 *
 * Mobile cameras produce 5–12MB images which when base64-encoded exceed
 * Vercel's serverless limit, causing the pipeline to crash silently.
 * We resize to max 1600px and compress to JPEG @85% — more than enough
 * quality for Rekognition OCR and face detection.
 */
async function fetchAsBase64(signedUrl: string, isPdf = false): Promise<string> {
  const res = await fetch(signedUrl);
  const blob = await res.blob();

  // PDFs: pass through directly (Rekognition doesn't process them anyway)
  if (isPdf || blob.type === "application/pdf") {
    const buffer = await blob.arrayBuffer();
    const bytes  = new Uint8Array(buffer);
    let binary   = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  }

  // Images: compress via canvas to stay under ~1MB base64
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_DIM = 1600;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = Math.round(height * MAX_DIM / width);  width = MAX_DIM; }
        else                { width  = Math.round(width  * MAX_DIM / height); height = MAX_DIM; }
      }
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not available")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      // Export as JPEG @85% — sufficient for OCR + biometrics
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      resolve(dataUrl.split(",")[1]); // strip "data:image/jpeg;base64," prefix
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

/* ---------- Main provider ---------- */

export const inhouseProvider: KycProvider = {
  name: "inhouse_aws",

  async verify(input: KycVerifyInput): Promise<KycVerifyResult> {
    const referenceId = `aws-${Date.now()}`;

    try {
      // 1. Get signed URLs
      const [idUrl, selfieUrl, poaUrl, permitUrl] = await Promise.all([
        getSignedUrl(input.idDocumentPath),
        getSignedUrl(input.selfiePath),
        getSignedUrl(input.proofOfAddressPath),
        input.permitPath ? getSignedUrl(input.permitPath) : Promise.resolve(null),
      ]);

      if (!idUrl || !selfieUrl || !poaUrl) {
        return { ok: false, reason: "Could not access uploaded documents. Please try again.", referenceId };
      }

      // 2. Fetch images as base64 (with compression for images, passthrough for PDF)
      const poaFileName = input.proofOfAddressPath.split("/").pop() ?? "";
      const poaIsPdf    = poaFileName.toLowerCase().endsWith(".pdf");
      const permitIsPdf = (input.permitPath ?? "").toLowerCase().endsWith(".pdf");
      const [idB64, selfieB64, poaB64, permitB64] = await Promise.all([
        fetchAsBase64(idUrl),
        fetchAsBase64(selfieUrl),
        fetchAsBase64(poaUrl, poaIsPdf),
        permitUrl ? fetchAsBase64(permitUrl, permitIsPdf) : Promise.resolve(null),
      ]);

      // 3. Call server-side verify endpoint
      const res = await fetch("/api/kyc?action=verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(Object.entries({
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
          poaFileName,
          nationality:             input.nationality,
          residenceStatus:         input.residenceStatus,
          sameNationalityResidence: input.sameNationalityResidence,
          permitB64:               permitB64 ?? null,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        }).filter(([_k, v]) => v !== null && v !== undefined))),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`kyc-verify ${res.status}: ${errText.slice(0, 300)}`);
      }
      const result = await res.json() as KycVerifyResult & { flags?: string[] };
      return result;

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[KYC inhouse] error:", msg);
      if (msg.includes("413") || msg.toLowerCase().includes("too large") || msg.toLowerCase().includes("payload")) {
        return { ok: false, referenceId, reason: "Your photo files are too large. Please use smaller images and try again." };
      }
      return { ok: false, referenceId, reason: `Verification failed: ${msg}. Please try again or contact support.` };
    }
  },
};
