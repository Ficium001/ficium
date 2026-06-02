// =============================================================
// Ficium KYC — In-House Provider (Google Vision)
//
// Pipeline:
//   1. Get signed URLs for all 3 uploaded files
//   2. OCR: extract text from ID document → cross-check against form data
//   3. OCR: extract name/address from proof of address → cross-check
//   4. Liveness: Safe Search on selfie → detect printed/screen photos
//   5. Face: detect exactly 1 face in selfie
//   6. Auto-score 0–100 → flag for admin review if score ≥ 40
//
// Cost: ~$0.003 per KYC submission (3 Vision API calls).
// =============================================================

import { supabase } from "../../../../shared/lib/supabase";
import type { KycProvider, KycVerifyInput, KycVerifyResult } from "./types";

const VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate";

/* ---------- Types ---------- */

type Likelihood = "UNKNOWN" | "VERY_UNLIKELY" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "VERY_LIKELY";

interface VisionAnnotateResponse {
  responses: Array<{
    textAnnotations?:       Array<{ description: string }>;
    fullTextAnnotation?:    { text: string };
    safeSearchAnnotation?:  {
      adult:    Likelihood;
      spoof:    Likelihood;
      violence: Likelihood;
    };
    faceAnnotations?: Array<{
      detectionConfidence: number;
      joyLikelihood:       Likelihood;
    }>;
    error?: { message: string };
  }>;
}

/* ---------- Helpers ---------- */

const LIKELIHOOD_SCORE: Record<Likelihood, number> = {
  UNKNOWN:      0,
  VERY_UNLIKELY: 0,
  UNLIKELY:     1,
  POSSIBLE:     2,
  LIKELY:       3,
  VERY_LIKELY:  4,
};

function likelihoodScore(l: Likelihood): number {
  return LIKELIHOOD_SCORE[l] ?? 0;
}

/** Fetch a signed URL for a Supabase Storage path (10 min expiry). */
async function getSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from("kyc-documents")
    .createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

/** Fetch image bytes as base64 via a signed URL. */
async function fetchAsBase64(signedUrl: string): Promise<string> {
  const res    = await fetch(signedUrl);
  const buffer = await res.arrayBuffer();
  const bytes  = new Uint8Array(buffer);
  let binary   = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** Call Google Vision API with multiple requests in one batch. */
async function callVision(
  requests: object[]
): Promise<VisionAnnotateResponse> {
  const apiKey = import.meta.env.VITE_GOOGLE_VISION_KEY as string;
  const res = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ requests }),
  });
  if (!res.ok) throw new Error(`Vision API error: ${res.status}`);
  return res.json();
}

/* ---------- OCR cross-check ---------- */

/**
 * Returns a score penalty (0–30) based on how poorly the OCR text
 * matches what the user entered in the form.
 */
function scoreOcrMismatch(ocrText: string, input: KycVerifyInput): number {
  const text = ocrText.toLowerCase();
  let penalty = 0;

  // Document number should appear in the ID text
  if (
    input.documentNumber &&
    !text.includes(input.documentNumber.toLowerCase())
  ) {
    penalty += 15;
  }

  // Date of birth — try both DD/MM/YYYY and YYYY-MM-DD formats
  if (input.dateOfBirth) {
    const [year, month, day] = input.dateOfBirth.split("-");
    const dobVariants = [
      `${day}/${month}/${year}`,
      `${day}-${month}-${year}`,
      `${year}-${month}-${day}`,
      `${day} ${month} ${year}`,
    ];
    const dobFound = dobVariants.some((v) => text.includes(v));
    if (!dobFound) penalty += 10;
  }

  // Country name should appear somewhere
  if (
    input.country &&
    !text.includes(input.country.toLowerCase()) &&
    !(input.country === "Mauritius" && text.includes("maurit"))
  ) {
    penalty += 5;
  }

  return Math.min(penalty, 30);
}

/**
 * Returns a score penalty (0–20) if proof of address doesn't
 * contain the user's city or address line.
 */
function scorePoaMismatch(ocrText: string, input: KycVerifyInput): number {
  const text = ocrText.toLowerCase();
  let penalty = 0;

  if (input.city && !text.includes(input.city.toLowerCase())) {
    penalty += 10;
  }
  if (
    input.addressLine1 &&
    !text.includes(input.addressLine1.toLowerCase().split(" ")[0])
  ) {
    penalty += 10;
  }

  return penalty;
}

/* ---------- Main provider ---------- */

export const inhouseProvider: KycProvider = {
  name: "inhouse_vision",

  async verify(input: KycVerifyInput): Promise<KycVerifyResult> {
    const referenceId = `vision-${Date.now()}`;

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

      // 3. Send all 3 requests to Vision API in one batch call
      const visionRes = await callVision([
        // Request 0 — ID document OCR
        {
          image:    { content: idB64 },
          features: [
            { type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 },
          ],
        },
        // Request 1 — Selfie: face detection + safe search (liveness)
        {
          image:    { content: selfieB64 },
          features: [
            { type: "FACE_DETECTION",         maxResults: 5 },
            { type: "SAFE_SEARCH_DETECTION",  maxResults: 1 },
          ],
        },
        // Request 2 — Proof of address OCR
        {
          image:    { content: poaB64 },
          features: [
            { type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 },
          ],
        },
      ]);

      const [idRes, selfieRes, poaRes] = visionRes.responses;

      // ── Score accumulator (0 = clean, 100 = very suspicious) ──
      let riskScore    = 0;
      const flags: string[] = [];

      // ── OCR: ID document ──────────────────────────────────────
      const idText = idRes?.fullTextAnnotation?.text ?? idRes?.textAnnotations?.[0]?.description ?? "";

      if (!idText || idText.trim().length < 20) {
        riskScore += 25;
        flags.push("ID document text unreadable or too short");
      } else {
        const ocrPenalty = scoreOcrMismatch(idText, input);
        riskScore += ocrPenalty;
        if (ocrPenalty > 0) flags.push(`ID OCR mismatch (penalty: ${ocrPenalty})`);
      }

      // ── Selfie: face detection ────────────────────────────────
      const faces = selfieRes?.faceAnnotations ?? [];

      if (faces.length === 0) {
        riskScore += 30;
        flags.push("No face detected in selfie");
      } else if (faces.length > 1) {
        riskScore += 15;
        flags.push(`Multiple faces detected (${faces.length})`);
      } else {
        const face = faces[0];
        if (face.detectionConfidence < 0.7) {
          riskScore += 10;
          flags.push("Low face detection confidence");
        }
      }

      // ── Selfie: liveness / spoof detection ───────────────────
      const safeSearch = selfieRes?.safeSearchAnnotation;
      if (safeSearch) {
        const spoofScore = likelihoodScore(safeSearch.spoof);
        if (spoofScore >= 3) {
          // LIKELY or VERY_LIKELY spoof
          riskScore += 35;
          flags.push(`Selfie spoof detected (${safeSearch.spoof})`);
        } else if (spoofScore === 2) {
          // POSSIBLE spoof
          riskScore += 15;
          flags.push(`Possible selfie spoof (${safeSearch.spoof})`);
        }
      }

      // ── OCR: Proof of address ─────────────────────────────────
      const poaText = poaRes?.fullTextAnnotation?.text ?? poaRes?.textAnnotations?.[0]?.description ?? "";

      if (!poaText || poaText.trim().length < 20) {
        riskScore += 15;
        flags.push("Proof of address text unreadable");
      } else {
        const poaPenalty = scorePoaMismatch(poaText, input);
        riskScore += poaPenalty;
        if (poaPenalty > 0) flags.push(`POA address mismatch (penalty: ${poaPenalty})`);
      }

      // ── Final decision ────────────────────────────────────────
      riskScore = Math.min(riskScore, 100);

      // Hard reject: spoof almost certain or no face at all
      const hardReject =
        (safeSearch && likelihoodScore(safeSearch.spoof) >= 4) ||
        faces.length === 0;

      if (hardReject && riskScore >= 60) {
        return {
          ok:          false,
          referenceId,
          riskScore,
          reason:      flags[0] ?? "Automated check failed. Please resubmit with clearer photos.",
        };
      }

      // Flag for human review if score ≥ 40
      const needsReview = riskScore >= 40;

      return {
        ok:          true,
        referenceId,
        riskScore,
        needsReview,
        reason:      flags.length > 0 ? flags.join("; ") : undefined,
      };

    } catch (err) {
      // Vision API failure — fall back to manual review
      console.error("[KYC inhouse] Vision API error:", err);
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
