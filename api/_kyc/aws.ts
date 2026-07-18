/**
 * api/_kyc/aws.ts
 * ─────────────────────────────────────────────────────────────
 * Shared AWS Rekognition primitives (SigV4 signing + thin wrappers).
 *
 * Extracted out of verify.ts so the lightweight document-scan
 * endpoint (scan.ts) can reuse DetectText without duplicating the
 * signing code. Behaviour is unchanged from the original inline
 * implementation — this is a mechanical extraction only.
 */

import { createHmac, createHash } from "crypto";
import { Env } from "../_lib/env.js";

export const AWS_REGION    = "ap-south-1";
export const COLLECTION_ID = "ficium-kyc-faces";

/* ── AWS Sig v4 ─────────────────────────────────────────────── */

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}
function hashHex(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}
function getSigningKey(secret: string, date: string, region: string, service: string): Buffer {
  return hmac(hmac(hmac(hmac("AWS4" + secret, date), region), service), "aws4_request");
}

export async function awsPost(service: string, target: string, body: object): Promise<unknown> {
  const accessKey = Env.awsAccessKeyId();
  const secretKey = Env.awsSecretAccessKey();
  const now       = new Date();
  const amzDate   = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);
  const host      = `${service}.${AWS_REGION}.amazonaws.com`;
  const bodyStr   = JSON.stringify(body);
  const bodyHash  = hashHex(bodyStr);
  const ch        = `content-type:application/x-amz-json-1.1\nhost:${host}\nx-amz-date:${amzDate}\nx-amz-target:${target}\n`;
  const sh        = "content-type;host;x-amz-date;x-amz-target";
  const cr        = ["POST", "/", "", ch, sh, bodyHash].join("\n");
  const cs        = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`;
  const sts       = ["AWS4-HMAC-SHA256", amzDate, cs, hashHex(cr)].join("\n");
  const sig       = hmac(getSigningKey(secretKey, dateStamp, AWS_REGION, service), sts).toString("hex");
  const auth      = `AWS4-HMAC-SHA256 Credential=${accessKey}/${cs}, SignedHeaders=${sh}, Signature=${sig}`;
  const res = await fetch(`https://${host}/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Date": amzDate, "X-Amz-Target": target, "Authorization": auth },
    body: bodyStr,
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`AWS ${service} ${target} ${res.status}: ${t}`); }
  return res.json();
}

/* ── Rekognition wrappers ───────────────────────────────────── */

export interface RekFace   { Confidence: number; BoundingBox: { Width: number; Height: number } }
export interface RekLabel  { Name: string; Confidence: number }
export interface FaceMatch { Similarity: number }
export interface FaceCollectionResult { duplicate: boolean; matchedClientId?: string; similarity?: number }

export async function detectText(b64: string): Promise<string> {
  const d = await awsPost("rekognition", "RekognitionService.DetectText", { Image: { Bytes: b64 } }) as
    { TextDetections?: Array<{ DetectedText: string; Type: string; Confidence: number }> };
  return (d.TextDetections ?? []).filter(b => b.Type === "LINE" && b.Confidence > 50).map(b => b.DetectedText).join("\n");
}
export async function detectFaces(b64: string): Promise<RekFace[]> {
  const d = await awsPost("rekognition", "RekognitionService.DetectFaces", { Image: { Bytes: b64 }, Attributes: ["DEFAULT"] }) as { FaceDetails?: RekFace[] };
  return d.FaceDetails ?? [];
}
export async function detectLabels(b64: string): Promise<RekLabel[]> {
  const d = await awsPost("rekognition", "RekognitionService.DetectLabels", { Image: { Bytes: b64 }, MaxLabels: 30, MinConfidence: 70 }) as { Labels?: RekLabel[] };
  return d.Labels ?? [];
}
export async function compareFaces(srcB64: string, tgtB64: string): Promise<number> {
  try {
    const d = await awsPost("rekognition", "RekognitionService.CompareFaces", {
      SourceImage: { Bytes: srcB64 }, TargetImage: { Bytes: tgtB64 }, SimilarityThreshold: 50,
    }) as { FaceMatches?: FaceMatch[] };
    return d.FaceMatches?.length ? d.FaceMatches[0].Similarity : 0;
  } catch { return -1; }
}
export async function searchFaceCollection(b64: string, clientId: string): Promise<FaceCollectionResult> {
  try {
    const d = await awsPost("rekognition", "RekognitionService.SearchFacesByImage", {
      CollectionId: COLLECTION_ID, Image: { Bytes: b64 }, MaxFaces: 5, FaceMatchThreshold: 90,
    }) as { FaceMatches?: Array<{ Face: { ExternalImageId: string }; Similarity: number }> };
    const matches = (d.FaceMatches ?? []).filter(m => m.Face.ExternalImageId !== clientId);
    if (matches.length > 0) {
      return { duplicate: true, matchedClientId: matches[0].Face.ExternalImageId, similarity: matches[0].Similarity };
    }
    return { duplicate: false };
  } catch (err) {
    if (String(err).includes("ResourceNotFoundException")) return { duplicate: false };
    return { duplicate: false }; // fail open — don't block on collection errors
  }
}
export async function indexFace(b64: string, clientId: string): Promise<void> {
  try {
    await awsPost("rekognition", "RekognitionService.IndexFaces", {
      CollectionId: COLLECTION_ID, Image: { Bytes: b64 },
      ExternalImageId: clientId, MaxFaces: 1, QualityFilter: "AUTO", DetectionAttributes: [],
    });
  } catch (err) {
    console.error("[kyc aws] IndexFaces error:", err);
  }
}
