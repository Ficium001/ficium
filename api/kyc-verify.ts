/**
 * api/kyc-verify.ts
 * POST /api/kyc-verify
 *
 * Accepts base64-encoded images, runs them through:
 *   - AWS Textract (DetectDocumentText) for ID + proof of address OCR
 *   - AWS Rekognition (DetectFaces + DetectLabels) for face/liveness check
 *
 * Returns a structured KYC result (riskScore, flags, ok).
 * Runs server-side so AWS keys are never exposed to the browser.
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
  const kDate    = hmac("AWS4" + secret, date);
  const kRegion  = hmac(kDate,    region);
  const kService = hmac(kRegion,  service);
  return           hmac(kService, "aws4_request");
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

  const canonicalHeaders = [
    `content-type:application/x-amz-json-1.1`,
    `host:${host}`,
    `x-amz-date:${amzDate}`,
    `x-amz-target:${target}`,
  ].join("\n") + "\n";

  const signedHeaders = "content-type;host;x-amz-date;x-amz-target";

  const canonicalRequest = [
    "POST", "/", "",
    canonicalHeaders,
    signedHeaders,
    bodyHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`;
  const stringToSign    = ["AWS4-HMAC-SHA256", amzDate, credentialScope, hashHex(canonicalRequest)].join("\n");
  const signature       = hmac(getSigningKey(secretKey, dateStamp, AWS_REGION, service), stringToSign).toString("hex");
  const authHeader      = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}/`, {
    method:  "POST",
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

/* ---------- AWS helpers ---------- */

async function textractDetect(imageB64: string): Promise<string> {
  // Uses Rekognition DetectText — no subscription required, works in ap-south-1
  const data = await awsPost("rekognition", "RekognitionService.DetectText", {
    Image: { Bytes: imageB64 },
  }) as { TextDetections?: Array<{ DetectedText: string; Type: string; Confidence: number }> };

  return (data.TextDetections ?? [])
    .filter(b => b.Type === "LINE" && b.Confidence > 50)
    .map(b => b.DetectedText)
    .join("\n");
}

interface RekFace   { Confidence: number }
interface RekLabel  { Name: string; Confidence: number }

async function rekognitionFaces(imageB64: string): Promise<RekFace[]> {
  const data = await awsPost("rekognition", "RekognitionService.DetectFaces", {
    Image: { Bytes: imageB64 }, Attributes: ["DEFAULT"],
  }) as { FaceDetails?: RekFace[] };
  return data.FaceDetails ?? [];
}

async function rekognitionLabels(imageB64: string): Promise<RekLabel[]> {
  const data = await awsPost("rekognition", "RekognitionService.DetectLabels", {
    Image: { Bytes: imageB64 }, MaxLabels: 20, MinConfidence: 60,
  }) as { Labels?: RekLabel[] };
  return data.Labels ?? [];
}

/* ---------- Scoring ---------- */

interface KycInput {
  documentNumber?: string;
  dateOfBirth?:    string;
  country?:        string;
  city?:           string;
  addressLine1?:   string;
  idB64:           string;
  selfieB64:       string;
  poaB64:          string;
}

function scoreOcrMismatch(text: string, input: KycInput): number {
  const t = text.toLowerCase();
  let p = 0;
  if (input.documentNumber && !t.includes(input.documentNumber.toLowerCase())) p += 15;
  if (input.dateOfBirth) {
    const [y, m, d] = input.dateOfBirth.split("-");
    const variants  = [`${d}/${m}/${y}`, `${d}-${m}-${y}`, `${y}-${m}-${d}`, `${d} ${m} ${y}`];
    if (!variants.some(v => t.includes(v))) p += 10;
  }
  if (input.country && !t.includes(input.country.toLowerCase()) &&
      !(input.country === "Mauritius" && t.includes("maurit"))) p += 5;
  return Math.min(p, 30);
}

function scorePoaMismatch(text: string, input: KycInput): number {
  const t = text.toLowerCase();
  let p = 0;
  if (input.city        && !t.includes(input.city.toLowerCase()))                            p += 10;
  if (input.addressLine1 && !t.includes(input.addressLine1.toLowerCase().split(" ")[0]))     p += 10;
  return p;
}

function scoreSpoofFromLabels(labels: RekLabel[]): { penalty: number; flag: string | null } {
  const spoofKw = ["monitor","screen","display","television","computer","laptop",
                   "phone","tablet","paper","document","poster","photo","photograph","printed","text"];
  for (const l of labels) {
    const n = l.Name.toLowerCase();
    if (spoofKw.some(k => n.includes(k))) {
      if (l.Confidence >= 80) return { penalty: 35, flag: `Possible spoof: ${l.Name} (${l.Confidence.toFixed(0)}%)` };
      if (l.Confidence >= 65) return { penalty: 15, flag: `Possible spoof: ${l.Name} (${l.Confidence.toFixed(0)}%)` };
    }
  }
  return { penalty: 0, flag: null };
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

  const referenceId = `aws-${Date.now()}`;

  try {
    const [idText, poaText, faces, labels] = await Promise.all([
      textractDetect(input.idB64),
      textractDetect(input.poaB64),
      rekognitionFaces(input.selfieB64),
      rekognitionLabels(input.selfieB64),
    ]);

    let riskScore = 0;
    const flags: string[] = [];

    // ID OCR
    if (!idText || idText.trim().length < 20) {
      riskScore += 25; flags.push("ID document text unreadable");
    } else {
      const p = scoreOcrMismatch(idText, input);
      riskScore += p;
      if (p > 0) flags.push(`ID OCR mismatch (penalty: ${p})`);
    }

    // Face detection
    if (faces.length === 0) {
      riskScore += 30; flags.push("No face detected in selfie");
    } else if (faces.length > 1) {
      riskScore += 15; flags.push(`Multiple faces (${faces.length})`);
    } else if (faces[0].Confidence < 70) {
      riskScore += 10; flags.push("Low face confidence");
    }

    // Liveness / spoof
    const { penalty: sp, flag: sf } = scoreSpoofFromLabels(labels);
    riskScore += sp;
    if (sf) flags.push(sf);

    // POA OCR
    if (!poaText || poaText.trim().length < 20) {
      riskScore += 15; flags.push("Proof of address unreadable");
    } else {
      const p = scorePoaMismatch(poaText, input);
      riskScore += p;
      if (p > 0) flags.push(`POA mismatch (penalty: ${p})`);
    }

    riskScore = Math.min(riskScore, 100);

    const hardReject = faces.length === 0 || sp >= 35;

    if (hardReject && riskScore >= 60) {
      return res.status(200).json({
        ok: false, referenceId, riskScore,
        reason: flags[0] ?? "Automated check failed. Please resubmit with clearer photos.",
      });
    }

    return res.status(200).json({
      ok: true, referenceId, riskScore,
      needsReview: riskScore >= 40,
      reason: flags.length > 0 ? flags.join("; ") : undefined,
    });

  } catch (err) {
    console.error("[kyc-verify] AWS error:", err);
    return res.status(200).json({
      ok: true, referenceId, riskScore: 50, needsReview: true,
      reason: "Automated check unavailable — queued for manual review.",
    });
  }
}
