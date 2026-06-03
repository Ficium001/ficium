/**
 * api/kyc-verify.ts
 * POST /api/kyc-verify
 *
 * SmileID/Sumsub-level KYC pipeline using AWS Rekognition:
 *   1. DetectText on ID doc → OCR cross-check (doc number, DOB, country)
 *   2. DetectFaces on selfie → face count + confidence
 *   3. CompareFaces (ID doc vs selfie) → face match score
 *   4. DetectLabels on selfie → targeted spoof detection (screens only)
 *   5. DetectText on proof of address → address cross-check
 *   6. MRZ pattern detection → passport/ID authenticity signal
 *
 * Risk scoring: 0–100. Hard reject ≥60 with critical flag.
 * Review threshold: ≥35. Clean pass: <35.
 */

import { createHmac, createHash } from "crypto";

export const config = { runtime: "nodejs" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getEnv = (k: string) => (globalThis as any).process?.env?.[k] ?? "";

/* ---------- AWS Sig v4 ---------- */

const AWS_REGION = "ap-south-1";

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function hashHex(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function getSigningKey(secret: string, date: string, region: string, service: string): Buffer {
  return hmac(hmac(hmac(hmac("AWS4" + secret, date), region), service), "aws4_request");
}

async function awsPost(service: string, target: string, body: object): Promise<unknown> {
  const accessKey = getEnv("AWS_ACCESS_KEY_ID")     || getEnv("VITE_AWS_ACCESS_KEY_ID");
  const secretKey = getEnv("AWS_SECRET_ACCESS_KEY") || getEnv("VITE_AWS_SECRET_ACCESS_KEY");

  const now       = new Date();
  const amzDate   = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);
  const host      = `${service}.${AWS_REGION}.amazonaws.com`;
  const bodyStr   = JSON.stringify(body);
  const bodyHash  = hashHex(bodyStr);

  const canonicalHeaders =
    `content-type:application/x-amz-json-1.1\nhost:${host}\nx-amz-date:${amzDate}\nx-amz-target:${target}\n`;
  const signedHeaders = "content-type;host;x-amz-date;x-amz-target";
  const canonicalRequest = ["POST", "/", "", canonicalHeaders, signedHeaders, bodyHash].join("\n");
  const credentialScope  = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`;
  const stringToSign     = ["AWS4-HMAC-SHA256", amzDate, credentialScope, hashHex(canonicalRequest)].join("\n");
  const signature        = hmac(getSigningKey(secretKey, dateStamp, AWS_REGION, service), stringToSign).toString("hex");
  const authHeader       = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}/`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/x-amz-json-1.1",
      "X-Amz-Date":    amzDate,
      "X-Amz-Target":  target,
      "Authorization": authHeader,
    },
    body: bodyStr,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AWS ${service} ${target} error ${res.status}: ${text}`);
  }
  return res.json();
}

/* ---------- Rekognition API wrappers ---------- */

async function detectText(imageB64: string): Promise<string> {
  const data = await awsPost("rekognition", "RekognitionService.DetectText", {
    Image: { Bytes: imageB64 },
  }) as { TextDetections?: Array<{ DetectedText: string; Type: string; Confidence: number }> };
  return (data.TextDetections ?? [])
    .filter(b => b.Type === "LINE" && b.Confidence > 50)
    .map(b => b.DetectedText)
    .join("\n");
}

interface RekFace  { Confidence: number; BoundingBox: { Width: number; Height: number } }
interface RekLabel { Name: string; Confidence: number }
interface FaceMatch { Similarity: number; Face: { Confidence: number } }

async function detectFaces(imageB64: string): Promise<RekFace[]> {
  const data = await awsPost("rekognition", "RekognitionService.DetectFaces", {
    Image: { Bytes: imageB64 }, Attributes: ["DEFAULT"],
  }) as { FaceDetails?: RekFace[] };
  return data.FaceDetails ?? [];
}

async function detectLabels(imageB64: string): Promise<RekLabel[]> {
  const data = await awsPost("rekognition", "RekognitionService.DetectLabels", {
    Image: { Bytes: imageB64 }, MaxLabels: 30, MinConfidence: 70,
  }) as { Labels?: RekLabel[] };
  return data.Labels ?? [];
}

async function compareFaces(sourceB64: string, targetB64: string): Promise<number> {
  // sourceB64 = selfie, targetB64 = ID doc
  try {
    const data = await awsPost("rekognition", "RekognitionService.CompareFaces", {
      SourceImage: { Bytes: sourceB64 },
      TargetImage: { Bytes: targetB64 },
      SimilarityThreshold: 50,
    }) as { FaceMatches?: FaceMatch[]; UnmatchedFaces?: unknown[] };
    if (data.FaceMatches && data.FaceMatches.length > 0) {
      return data.FaceMatches[0].Similarity;
    }
    return 0; // No match found
  } catch {
    return -1; // CompareFaces failed (e.g. no face on ID doc)
  }
}

/* ---------- DOB matching — handles all formats ---------- */

function dobFound(text: string, dateOfBirth: string): boolean {
  const t = text.toLowerCase();
  // Input is YYYY-MM-DD
  const [y, m, d] = dateOfBirth.split("-");
  const my = parseInt(m, 10).toString();   // month without leading zero
  const md = parseInt(d, 10).toString();   // day without leading zero

  const variants = [
    // DD/MM/YYYY and variants
    `${d}/${m}/${y}`, `${d}-${m}-${y}`, `${d} ${m} ${y}`,
    `${md}/${m}/${y}`, `${md}-${m}-${y}`,
    // MM/DD/YYYY (American — common on passports)
    `${m}/${d}/${y}`, `${m}-${d}-${y}`, `${m} ${d} ${y}`,
    `${my}/${d}/${y}`, `${my}-${d}-${y}`,
    // YYYY-MM-DD
    `${y}-${m}-${d}`, `${y}/${m}/${d}`,
    // Partial — just year + month or year alone
    `${y}`,
    // MRZ date format YYMMDD
    `${y.slice(2)}${m}${d}`,
  ];
  return variants.some(v => t.includes(v));
}

/* ---------- MRZ detection ---------- */

function hasMrzPattern(text: string): boolean {
  // MRZ lines are 44 chars (passport) or 30 chars (ID) of uppercase + digits + <
  const lines = text.split("\n");
  return lines.some(l => /^[A-Z0-9<]{20,44}$/.test(l.trim()));
}

/* ---------- Spoof detection — screens only, not portraits ---------- */

function scoreSpoofFromLabels(labels: RekLabel[]): { penalty: number; flag: string | null } {
  // Only flag actual digital reproduction devices — not "Photography" or "Portrait"
  const hardSpoofKw  = ["monitor", "screen", "display", "television", "computer monitor",
                        "laptop", "tablet", "ipad", "smartphone"];
  const softSpoofKw  = ["paper", "poster", "printed", "printout", "newspaper"];

  for (const l of labels) {
    const n = l.Name.toLowerCase();
    if (hardSpoofKw.some(k => n.includes(k)) && l.Confidence >= 75) {
      return { penalty: 40, flag: `Digital spoof detected: ${l.Name} (${l.Confidence.toFixed(0)}%)` };
    }
    if (softSpoofKw.some(k => n.includes(k)) && l.Confidence >= 85) {
      return { penalty: 20, flag: `Printed photo suspected: ${l.Name} (${l.Confidence.toFixed(0)}%)` };
    }
  }
  return { penalty: 0, flag: null };
}

/* ---------- OCR scoring ---------- */

interface KycInput {
  documentNumber?: string;
  dateOfBirth?:    string;
  country?:        string;
  city?:           string;
  addressLine1?:   string;
  idB64:           string;
  selfieB64:       string;
  poaB64:          string;
  poaMimeType?:    string;
  poaFileName?:    string;
}

function scoreIdOcr(text: string, input: KycInput): { penalty: number; flags: string[] } {
  const t = text.toLowerCase();
  const flags: string[] = [];
  let penalty = 0;

  if (input.documentNumber && !t.includes(input.documentNumber.toLowerCase())) {
    penalty += 15; flags.push("Document number not found in ID");
  }
  if (input.dateOfBirth && !dobFound(text, input.dateOfBirth)) {
    penalty += 8; flags.push("Date of birth not found in ID");
  }
  if (input.country) {
    const c = input.country.toLowerCase();
    if (!t.includes(c) && !(c === "mauritius" && t.includes("maurit"))) {
      penalty += 5; flags.push("Country not found in ID text");
    }
  }
  // Bonus: MRZ found → reduce penalty (document looks authentic)
  if (hasMrzPattern(text)) penalty = Math.max(0, penalty - 5);

  return { penalty: Math.min(penalty, 30), flags };
}

function scorePoaOcr(text: string, input: KycInput): { penalty: number; flags: string[] } {
  const t = text.toLowerCase();
  const flags: string[] = [];
  let penalty = 0;

  if (input.city && !t.includes(input.city.toLowerCase())) {
    penalty += 10; flags.push("City not found in proof of address");
  }
  if (input.addressLine1) {
    const firstWord = input.addressLine1.toLowerCase().split(" ")[0];
    if (firstWord.length > 2 && !t.includes(firstWord)) {
      penalty += 10; flags.push("Address not found in proof of address");
    }
  }
  return { penalty, flags };
}

/* ---------- Handler ---------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const accessKey = getEnv("AWS_ACCESS_KEY_ID") || getEnv("VITE_AWS_ACCESS_KEY_ID");
  if (!accessKey) return res.status(503).json({ error: "AWS credentials not configured" });

  const input = req.body as KycInput;
  if (!input.idB64 || !input.selfieB64 || !input.poaB64) {
    return res.status(400).json({ error: "idB64, selfieB64, poaB64 required" });
  }

  // Rekognition only supports JPEG/PNG — skip POA OCR if PDF
  const poaIsPdf = (input.poaMimeType ?? "").includes("pdf") || (input.poaFileName ?? "").endsWith(".pdf");

  const referenceId = `aws-${Date.now()}`;

  try {
    // Run all checks in parallel — skip POA OCR if PDF
    const [idText, poaText, selfieFaces, selfieLabels, faceMatchScore] = await Promise.all([
      detectText(input.idB64),
      poaIsPdf ? Promise.resolve("") : detectText(input.poaB64),
      detectFaces(input.selfieB64),
      detectLabels(input.selfieB64),
      compareFaces(input.selfieB64, input.idB64),
    ]);

    let riskScore = 0;
    const flags: string[] = [];

    // ── 1. ID OCR ────────────────────────────────────────────────
    let idOcrResult = { penalty: 0, flags: [] as string[], passed: false };
    if (!idText || idText.trim().length < 20) {
      riskScore += 25; flags.push("ID document text unreadable");
    } else {
      const { penalty, flags: f } = scoreIdOcr(idText, input);
      riskScore += penalty;
      flags.push(...f);
      idOcrResult = { penalty, flags: f, passed: penalty === 0 };
    }

    // ── 2. Selfie face detection ──────────────────────────────────
    let faceDetectResult = { count: selfieFaces.length, confidence: 0, passed: false };
    if (selfieFaces.length === 0) {
      riskScore += 35; flags.push("No face detected in selfie");
    } else if (selfieFaces.length > 1) {
      riskScore += 15; flags.push(`Multiple faces in selfie (${selfieFaces.length})`);
      faceDetectResult = { count: selfieFaces.length, confidence: selfieFaces[0].Confidence, passed: false };
    } else if (selfieFaces[0].Confidence < 80) {
      riskScore += 10; flags.push(`Low face confidence (${selfieFaces[0].Confidence.toFixed(0)}%)`);
      faceDetectResult = { count: 1, confidence: selfieFaces[0].Confidence, passed: false };
    } else {
      faceDetectResult = { count: 1, confidence: selfieFaces[0].Confidence, passed: true };
    }

    // ── 3. Face match: selfie vs ID document ─────────────────────
    let faceMatchResult = { similarity: faceMatchScore, passed: false };
    if (faceMatchScore === -1) {
      riskScore += 15; flags.push("Could not detect face on ID document");
    } else if (faceMatchScore === 0) {
      riskScore += 35; flags.push("Selfie does not match face on ID document");
    } else if (faceMatchScore < 80) {
      riskScore += 20; flags.push(`Weak face match: selfie vs ID (${faceMatchScore.toFixed(0)}% similarity)`);
    } else if (faceMatchScore < 90) {
      riskScore += 8;  flags.push(`Moderate face match (${faceMatchScore.toFixed(0)}% similarity)`);
      faceMatchResult = { similarity: faceMatchScore, passed: true };
    } else {
      faceMatchResult = { similarity: faceMatchScore, passed: true };
    }

    // ── 4. Spoof detection ────────────────────────────────────────
    const { penalty: sp, flag: sf } = scoreSpoofFromLabels(selfieLabels);
    riskScore += sp;
    if (sf) flags.push(sf);
    const spoofResult = { penalty: sp, passed: sp === 0, labels: selfieLabels.slice(0, 8).map(l => `${l.Name} (${l.Confidence.toFixed(0)}%)`) };

    // ── 5. Proof of address OCR ───────────────────────────────────
    let poaOcrResult = { penalty: 0, flags: [] as string[], passed: false, skipped: false };
    if (poaIsPdf) {
      // PDF uploaded — OCR skipped, flag for manual review only
      poaOcrResult = { penalty: 0, flags: [], passed: true, skipped: true };
      flags.push("Proof of address is PDF — address cross-check skipped, manual review required");
      riskScore += 10;
    } else if (!poaText || poaText.trim().length < 20) {
      riskScore += 15; flags.push("Proof of address text unreadable");
    } else {
      const { penalty, flags: f } = scorePoaOcr(poaText, input);
      riskScore += penalty;
      flags.push(...f);
      poaOcrResult = { penalty, flags: f, passed: penalty === 0, skipped: false };
    }

    // ── Final decision ────────────────────────────────────────────
    riskScore = Math.min(riskScore, 100);

    const hardReject =
      selfieFaces.length === 0 ||
      faceMatchScore === 0      ||
      sp >= 40;

    const details = {
      idOcr: {
        textExtracted: idText.slice(0, 500),
        hasMrz: hasMrzPattern(idText),
        ...idOcrResult,
      },
      faceDetection: faceDetectResult,
      faceMatch: faceMatchResult,
      spoofCheck: spoofResult,
      poaOcr: {
        textExtracted: poaText.slice(0, 300),
        ...poaOcrResult,
      },
    };

    if (hardReject && riskScore >= 55) {
      return res.status(200).json({
        ok: false, referenceId, riskScore, flags, details,
        reason: flags[0] ?? "Automated check failed. Please resubmit with clearer photos.",
      });
    }

    return res.status(200).json({
      ok:          true,
      referenceId,
      riskScore,
      flags,
      details,
      needsReview: riskScore >= 35,
      reason:      flags.length > 0 ? flags.join("; ") : undefined,
    });

  } catch (err) {
    console.error("[kyc-verify] AWS error:", err);
    return res.status(200).json({
      ok: true, referenceId, riskScore: 50, flags: [], needsReview: true,
      reason: "Automated check unavailable — queued for manual review.",
    });
  }
}
