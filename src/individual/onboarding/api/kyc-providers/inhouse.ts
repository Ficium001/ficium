// =============================================================
// Ficium KYC — In-House Provider (AWS Rekognition + Textract)
//
// Pipeline:
//   1. Get signed URLs for all 3 uploaded files
//   2. Textract: extract text from ID document → cross-check against form data
//   3. Textract: extract text from proof of address → cross-check
//   4. Rekognition: detect faces in selfie (count, confidence)
//   5. Rekognition: detect labels to catch printed/screen photos (liveness)
//   6. Auto-score 0–100 → flag for admin review if score ≥ 40
//
// Cost: ~$0.004 per KYC submission (2 Textract + 2 Rekognition calls).
// Region: ap-south-1 (Mumbai)
// =============================================================

import { supabase } from "../../../../shared/lib/supabase";
import type { KycProvider, KycVerifyInput, KycVerifyResult } from "./types";

const AWS_REGION = "ap-south-1";
const AWS_SERVICE_REKOGNITION = "rekognition";
const AWS_SERVICE_TEXTRACT    = "textract";

/* ---------- AWS Signature v4 helpers ---------- */

async function hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data).buffer as ArrayBuffer);
}

async function hash(data: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data).buffer as ArrayBuffer);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function getSigningKey(
  secret: string, date: string, region: string, service: string
): Promise<ArrayBuffer> {
  const kDate    = await hmac(new TextEncoder().encode("AWS4" + secret).buffer as ArrayBuffer, date);
  const kRegion  = await hmac(kDate,    region);
  const kService = await hmac(kRegion,  service);
  return         await hmac(kService, "aws4_request");
}

async function signedRequest(
  service: string,
  endpoint: string,
  target: string,
  body: object
): Promise<Response> {
  const accessKey = import.meta.env.VITE_AWS_ACCESS_KEY_ID as string;
  const secretKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY as string;

  const now        = new Date();
  const amzDate    = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp  = amzDate.slice(0, 8);

  const host       = `${service}.${AWS_REGION}.amazonaws.com`;
  const url        = `https://${host}/${endpoint}`;
  const bodyStr    = JSON.stringify(body);
  const bodyHash   = await hash(bodyStr);

  const headers = [
    `content-type:application/x-amz-json-1.1`,
    `host:${host}`,
    `x-amz-date:${amzDate}`,
    `x-amz-target:${target}`,
  ].join("\n");

  const signedHeaders = "content-type;host;x-amz-date;x-amz-target";

  const canonicalRequest = [
    "POST",
    `/${endpoint}`,
    "",
    headers + "\n",
    signedHeaders,
    bodyHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await hash(canonicalRequest),
  ].join("\n");

  const signingKey = await getSigningKey(secretKey, dateStamp, AWS_REGION, service);
  const sigBytes   = await hmac(signingKey, stringToSign);
  const signature  = Array.from(new Uint8Array(sigBytes)).map(b => b.toString(16).padStart(2, "0")).join("");

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type":    "application/x-amz-json-1.1",
      "X-Amz-Date":      amzDate,
      "X-Amz-Target":    target,
      "Authorization":   authHeader,
    },
    body: bodyStr,
  });
}

/* ---------- Supabase helpers ---------- */

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

/* ---------- AWS API calls ---------- */

/** Textract: extract raw text from a base64 image. */
async function textractDetect(imageB64: string): Promise<string> {
  const res = await signedRequest(
    AWS_SERVICE_TEXTRACT,
    "",
    "Textract.DetectDocumentText",
    { Document: { Bytes: imageB64 } }
  );
  if (!res.ok) throw new Error(`Textract error: ${res.status}`);
  const data = await res.json();
  const lines: string[] = (data.Blocks ?? [])
    .filter((b: { BlockType: string; Text?: string }) => b.BlockType === "LINE" && b.Text)
    .map((b: { Text: string }) => b.Text);
  return lines.join("\n");
}

interface RekognitionFace {
  Confidence: number;
  BoundingBox: { Width: number; Height: number };
}

/** Rekognition: detect faces in image. */
async function rekognitionDetectFaces(imageB64: string): Promise<RekognitionFace[]> {
  const res = await signedRequest(
    AWS_SERVICE_REKOGNITION,
    "",
    "RekognitionService.DetectFaces",
    {
      Image:      { Bytes: imageB64 },
      Attributes: ["DEFAULT"],
    }
  );
  if (!res.ok) throw new Error(`Rekognition DetectFaces error: ${res.status}`);
  const data = await res.json();
  return data.FaceDetails ?? [];
}

interface RekognitionLabel {
  Name: string;
  Confidence: number;
}

/** Rekognition: detect labels — used to catch screens/printed photos. */
async function rekognitionDetectLabels(imageB64: string): Promise<RekognitionLabel[]> {
  const res = await signedRequest(
    AWS_SERVICE_REKOGNITION,
    "",
    "RekognitionService.DetectLabels",
    {
      Image:           { Bytes: imageB64 },
      MaxLabels:       20,
      MinConfidence:   60,
    }
  );
  if (!res.ok) throw new Error(`Rekognition DetectLabels error: ${res.status}`);
  const data = await res.json();
  return data.Labels ?? [];
}

/* ---------- OCR cross-check ---------- */

function scoreOcrMismatch(ocrText: string, input: KycVerifyInput): number {
  const text = ocrText.toLowerCase();
  let penalty = 0;

  if (input.documentNumber && !text.includes(input.documentNumber.toLowerCase())) {
    penalty += 15;
  }

  if (input.dateOfBirth) {
    const [year, month, day] = input.dateOfBirth.split("-");
    const dobVariants = [
      `${day}/${month}/${year}`,
      `${day}-${month}-${year}`,
      `${year}-${month}-${day}`,
      `${day} ${month} ${year}`,
    ];
    if (!dobVariants.some((v) => text.includes(v))) penalty += 10;
  }

  if (
    input.country &&
    !text.includes(input.country.toLowerCase()) &&
    !(input.country === "Mauritius" && text.includes("maurit"))
  ) {
    penalty += 5;
  }

  return Math.min(penalty, 30);
}

function scorePoaMismatch(ocrText: string, input: KycVerifyInput): number {
  const text = ocrText.toLowerCase();
  let penalty = 0;

  if (input.city && !text.includes(input.city.toLowerCase())) penalty += 10;
  if (
    input.addressLine1 &&
    !text.includes(input.addressLine1.toLowerCase().split(" ")[0])
  ) penalty += 10;

  return penalty;
}

/* ---------- Liveness heuristic via labels ---------- */

/** Returns a spoof penalty (0–35) if labels suggest a screen or printed photo. */
function scoreSpoofFromLabels(labels: RekognitionLabel[]): { penalty: number; flag: string | null } {
  const spoofKeywords = ["monitor", "screen", "display", "television", "computer", "laptop",
                         "phone", "tablet", "paper", "document", "poster", "photo", "photograph",
                         "printed", "text"];
  for (const label of labels) {
    const name = label.Name.toLowerCase();
    if (spoofKeywords.some(kw => name.includes(kw)) && label.Confidence >= 80) {
      return { penalty: 35, flag: `Possible spoof — detected: ${label.Name} (${label.Confidence.toFixed(0)}%)` };
    }
    if (spoofKeywords.some(kw => name.includes(kw)) && label.Confidence >= 65) {
      return { penalty: 15, flag: `Possible spoof — detected: ${label.Name} (${label.Confidence.toFixed(0)}%)` };
    }
  }
  return { penalty: 0, flag: null };
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

      // 3. Run all AWS calls in parallel
      const [idText, poaText, faces, labels] = await Promise.all([
        textractDetect(idB64),
        textractDetect(poaB64),
        rekognitionDetectFaces(selfieB64),
        rekognitionDetectLabels(selfieB64),
      ]);

      let riskScore    = 0;
      const flags: string[] = [];

      // ── Textract: ID document ─────────────────────────────────
      if (!idText || idText.trim().length < 20) {
        riskScore += 25;
        flags.push("ID document text unreadable or too short");
      } else {
        const penalty = scoreOcrMismatch(idText, input);
        riskScore += penalty;
        if (penalty > 0) flags.push(`ID OCR mismatch (penalty: ${penalty})`);
      }

      // ── Rekognition: face detection ───────────────────────────
      if (faces.length === 0) {
        riskScore += 30;
        flags.push("No face detected in selfie");
      } else if (faces.length > 1) {
        riskScore += 15;
        flags.push(`Multiple faces detected (${faces.length})`);
      } else {
        if (faces[0].Confidence < 70) {
          riskScore += 10;
          flags.push("Low face detection confidence");
        }
      }

      // ── Rekognition: liveness / spoof via labels ──────────────
      const { penalty: spoofPenalty, flag: spoofFlag } = scoreSpoofFromLabels(labels);
      riskScore += spoofPenalty;
      if (spoofFlag) flags.push(spoofFlag);

      // ── Textract: Proof of address ────────────────────────────
      if (!poaText || poaText.trim().length < 20) {
        riskScore += 15;
        flags.push("Proof of address text unreadable");
      } else {
        const penalty = scorePoaMismatch(poaText, input);
        riskScore += penalty;
        if (penalty > 0) flags.push(`POA address mismatch (penalty: ${penalty})`);
      }

      // ── Final decision ────────────────────────────────────────
      riskScore = Math.min(riskScore, 100);

      const hardReject = faces.length === 0 || spoofPenalty >= 35;

      if (hardReject && riskScore >= 60) {
        return {
          ok:          false,
          referenceId,
          riskScore,
          reason:      flags[0] ?? "Automated check failed. Please resubmit with clearer photos.",
        };
      }

      return {
        ok:          true,
        referenceId,
        riskScore,
        needsReview: riskScore >= 40,
        reason:      flags.length > 0 ? flags.join("; ") : undefined,
      };

    } catch (err) {
      console.error("[KYC inhouse] AWS error:", err);
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
