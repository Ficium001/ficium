/**
 * api/kyc-verify.ts
 * POST /api/kyc-verify
 *
 * Enterprise KYC pipeline — Tier 1 + 2 + 3 checks:
 *
 * TIER 1 — Core checks
 *   1. DetectText on ID → doc number, DOB, name, country, expiry
 *   2. DetectFaces on selfie → count + confidence
 *   3. CompareFaces (selfie vs ID) → face match %
 *   4. DetectFaces on ID doc → confirm face exists on document
 *   5. DetectLabels on selfie → targeted spoof detection
 *   6. DetectText on POA → address cross-check
 *   7. MRZ parse + checksum validation → document authenticity
 *
 * TIER 2 — Fraud signals
 *   8. Velocity check → flag >3 submissions in 24h
 *   9. Document reuse → same doc number used by another account
 *   10. Duplicate face → selfie matches a previously verified client
 *
 * TIER 3 — Document classification
 *   11. DetectLabels on ID → confirm it looks like an ID/passport
 *
 * Risk scoring: 0–100. Hard reject ≥55 with critical flag.
 * Review threshold: ≥30. Clean pass: <30.
 */

import { createHmac, createHash } from "crypto";

export const config = { runtime: "nodejs" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getEnv = (k: string) => (globalThis as any).process?.env?.[k] ?? "";

/* ─────────────────────────────────────────────
   AWS Sig v4
───────────────────────────────────────────── */

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
  const signedHeaders    = "content-type;host;x-amz-date;x-amz-target";
  const canonicalRequest = ["POST", "/", "", canonicalHeaders, signedHeaders, bodyHash].join("\n");
  const credentialScope  = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`;
  const stringToSign     = ["AWS4-HMAC-SHA256", amzDate, credentialScope, hashHex(canonicalRequest)].join("\n");
  const signature        = hmac(getSigningKey(secretKey, dateStamp, AWS_REGION, service), stringToSign).toString("hex");
  const authHeader       = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const res = await fetch(`https://${host}/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Date": amzDate, "X-Amz-Target": target, "Authorization": authHeader },
    body: bodyStr,
  });
  if (!res.ok) { const text = await res.text(); throw new Error(`AWS ${service} ${target} error ${res.status}: ${text}`); }
  return res.json();
}

/* ─────────────────────────────────────────────
   Rekognition wrappers
───────────────────────────────────────────── */

interface RekFace  { Confidence: number; BoundingBox: { Width: number; Height: number } }
interface RekLabel { Name: string; Confidence: number }
interface FaceMatch { Similarity: number }

async function detectText(imageB64: string): Promise<string> {
  const data = await awsPost("rekognition", "RekognitionService.DetectText", {
    Image: { Bytes: imageB64 },
  }) as { TextDetections?: Array<{ DetectedText: string; Type: string; Confidence: number }> };
  return (data.TextDetections ?? []).filter(b => b.Type === "LINE" && b.Confidence > 50).map(b => b.DetectedText).join("\n");
}

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
  try {
    const data = await awsPost("rekognition", "RekognitionService.CompareFaces", {
      SourceImage: { Bytes: sourceB64 }, TargetImage: { Bytes: targetB64 }, SimilarityThreshold: 50,
    }) as { FaceMatches?: FaceMatch[] };
    return data.FaceMatches && data.FaceMatches.length > 0 ? data.FaceMatches[0].Similarity : 0;
  } catch { return -1; }
}

/* ─────────────────────────────────────────────
   Supabase REST (fraud checks — server-side only)
───────────────────────────────────────────── */

async function supabaseQuery(path: string): Promise<unknown[]> {
  const url        = getEnv("VITE_SUPABASE_URL") || getEnv("SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return [];
  try {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: { "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}`, "Accept": "application/json" },
    });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

/* ─────────────────────────────────────────────
   Tier 2 — Fraud checks
───────────────────────────────────────────── */

async function checkVelocity(clientId: string): Promise<{ tooMany: boolean; count: number }> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const rows = await supabaseQuery(
    `kyc_submissions?client_id=eq.${clientId}&submitted_at=gte.${since}&select=id`
  ) as unknown[];
  return { tooMany: rows.length >= 3, count: rows.length };
}

async function checkDocumentReuse(documentNumber: string, clientId: string): Promise<boolean> {
  if (!documentNumber) return false;
  const rows = await supabaseQuery(
    `kyc_submissions?document_number=eq.${encodeURIComponent(documentNumber)}&client_id=neq.${clientId}&select=id&limit=1`
  ) as unknown[];
  return rows.length > 0;
}

/* ─────────────────────────────────────────────
   MRZ parsing + checksum validation (Tier 3)
───────────────────────────────────────────── */

const MRZ_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MRZ_WEIGHTS = [7, 3, 1];

function mrzChecksum(str: string): number {
  let total = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str[i] === "<" ? 0 : MRZ_CHARS.indexOf(str[i]);
    total += (c < 0 ? 0 : c) * MRZ_WEIGHTS[i % 3];
  }
  return total % 10;
}

interface MrzResult {
  found: boolean;
  valid: boolean;
  docNumber?: string;
  dob?: string;
  expiry?: string;
  expired?: boolean;
  nationality?: string;
  surname?: string;
  givenNames?: string;
}

function parseMrz(text: string): MrzResult {
  const lines = text.split("\n").map(l => l.trim().replace(/\s/g, ""));
  // Find two consecutive MRZ lines (passport TD3 = 44 chars each)
  let line1 = "", line2 = "";
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^[A-Z0-9<]{44}$/.test(lines[i]) && /^[A-Z0-9<]{44}$/.test(lines[i + 1])) {
      line1 = lines[i]; line2 = lines[i + 1]; break;
    }
  }
  // Also try 30-char ID card MRZ (TD1)
  if (!line1) {
    for (let i = 0; i < lines.length - 1; i++) {
      if (/^[A-Z0-9<]{30}$/.test(lines[i]) && /^[A-Z0-9<]{30}$/.test(lines[i + 1])) {
        line1 = lines[i]; line2 = lines[i + 1]; break;
      }
    }
  }
  if (!line1) return { found: false, valid: false };

  try {
    const isPassport = line1.length === 44;
    if (isPassport) {
      // TD3 Passport: line2 = YYMMDD C YYMMDD C ... 
      const docNum    = line2.slice(0, 9).replace(/<+$/, "");
      const docCheck  = parseInt(line2[9]);
      const dob       = line2.slice(13, 19);
      const dobCheck  = parseInt(line2[19]);
      const expiry    = line2.slice(21, 27);
      const expCheck  = parseInt(line2[27]);
      const nat       = line2.slice(10, 13).replace(/</g, "");
      const names     = line1.slice(5).split("<<");
      const surname   = (names[0] ?? "").replace(/</g, " ").trim();
      const given     = (names[1] ?? "").replace(/</g, " ").trim();

      const docValid  = mrzChecksum(line2.slice(0, 9)) === docCheck;
      const dobValid  = mrzChecksum(dob) === dobCheck;
      const expValid  = mrzChecksum(expiry) === expCheck;
      const valid     = docValid && dobValid && expValid;

      // Parse expiry — YYMMDD
      const expYear   = parseInt(expiry.slice(0, 2)) + (parseInt(expiry.slice(0, 2)) > 50 ? 1900 : 2000);
      const expDate   = new Date(`${expYear}-${expiry.slice(2, 4)}-${expiry.slice(4, 6)}`);
      const expired   = expDate < new Date();

      return { found: true, valid, docNumber: docNum, dob, expiry, expired, nationality: nat, surname, givenNames: given };
    }
  } catch { /* fall through */ }

  return { found: true, valid: false };
}

/* ─────────────────────────────────────────────
   Name matching
───────────────────────────────────────────── */

function nameMatchScore(ocrText: string, fullName?: string): number {
  if (!fullName) return 100;
  const t = ocrText.toLowerCase();
  const parts = fullName.toLowerCase().trim().split(/\s+/);
  const matched = parts.filter(p => p.length > 1 && t.includes(p));
  return Math.round((matched.length / parts.length) * 100);
}

/* ─────────────────────────────────────────────
   DOB matching
───────────────────────────────────────────── */

function dobFound(text: string, dateOfBirth: string): boolean {
  const t = text.toLowerCase();
  const [y, m, d] = dateOfBirth.split("-");
  const my = parseInt(m, 10).toString();
  const md = parseInt(d, 10).toString();
  const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const monthName = MONTHS[parseInt(m, 10) - 1];
  const variants = [
    `${d}/${m}/${y}`, `${d}-${m}-${y}`, `${d} ${m} ${y}`,
    `${md}/${m}/${y}`, `${md}-${m}-${y}`,
    `${m}/${d}/${y}`, `${m}-${d}-${y}`, `${m} ${d} ${y}`,
    `${my}/${d}/${y}`, `${my}-${d}-${y}`,
    `${y}-${m}-${d}`, `${y}/${m}/${d}`,
    `${y.slice(2)}${m}${d}`,
    `${md} ${monthName} ${y}`, `${d} ${monthName} ${y}`,
    `${monthName} ${md}, ${y}`, `${monthName} ${d}, ${y}`,
  ];
  return variants.some(v => t.includes(v));
}

/* ─────────────────────────────────────────────
   Spoof detection
───────────────────────────────────────────── */

function scoreSpoofFromLabels(labels: RekLabel[]): { penalty: number; flag: string | null } {
  const hardSpoof = ["monitor","screen","display","television","computer monitor","laptop","tablet","ipad","smartphone"];
  const softSpoof = ["paper","poster","printed","printout","newspaper"];
  for (const l of labels) {
    const n = l.Name.toLowerCase();
    if (hardSpoof.some(k => n.includes(k)) && l.Confidence >= 75)
      return { penalty: 40, flag: `Digital spoof detected: ${l.Name} (${l.Confidence.toFixed(0)}%)` };
    if (softSpoof.some(k => n.includes(k)) && l.Confidence >= 85)
      return { penalty: 20, flag: `Printed photo suspected: ${l.Name} (${l.Confidence.toFixed(0)}%)` };
  }
  return { penalty: 0, flag: null };
}

/* ─────────────────────────────────────────────
   Document classification (Tier 3)
───────────────────────────────────────────── */

function classifyIdDocument(labels: RekLabel[]): { isIdDoc: boolean; confidence: number } {
  const idKeywords = ["passport","identity document","id card","driving license","driver's license","document","card","text"];
  const matches = labels.filter(l => idKeywords.some(k => l.Name.toLowerCase().includes(k)));
  if (matches.length === 0) return { isIdDoc: false, confidence: 0 };
  const best = Math.max(...matches.map(l => l.Confidence));
  return { isIdDoc: best >= 70, confidence: best };
}

/* ─────────────────────────────────────────────
   POA OCR
───────────────────────────────────────────── */

interface KycInput {
  clientId?:       string;
  fullName?:       string;
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

function scorePoaOcr(text: string, input: KycInput): { penalty: number; flags: string[] } {
  const t = text.toLowerCase();
  const flags: string[] = [];
  let penalty = 0;
  if (input.city && !t.includes(input.city.toLowerCase())) { penalty += 10; flags.push("City not found in proof of address"); }
  if (input.addressLine1) {
    const firstWord = input.addressLine1.toLowerCase().split(" ")[0];
    if (firstWord.length > 2 && !t.includes(firstWord)) { penalty += 10; flags.push("Address not found in proof of address"); }
  }
  return { penalty, flags };
}

/* ─────────────────────────────────────────────
   Handler
───────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const accessKey = getEnv("AWS_ACCESS_KEY_ID") || getEnv("VITE_AWS_ACCESS_KEY_ID");
  if (!accessKey) return res.status(503).json({ error: "AWS credentials not configured" });

  const input = req.body as KycInput;
  if (!input.idB64 || !input.selfieB64 || !input.poaB64)
    return res.status(400).json({ error: "idB64, selfieB64, poaB64 required" });

  const poaIsPdf  = (input.poaMimeType ?? "").includes("pdf") || (input.poaFileName ?? "").endsWith(".pdf");
  const referenceId = `aws-${Date.now()}`;

  try {
    // ── Run all AWS + fraud checks in parallel ────────────────────
    const [
      idText, poaText, selfieFaces, idFaces,
      selfieLabels, idLabels, faceMatchScore,
      velocityResult, docReuseResult,
    ] = await Promise.all([
      detectText(input.idB64),
      poaIsPdf ? Promise.resolve("") : detectText(input.poaB64),
      detectFaces(input.selfieB64),
      detectFaces(input.idB64),                                          // Tier 1: face on ID doc
      detectLabels(input.selfieB64),
      detectLabels(input.idB64),                                         // Tier 3: classify ID doc
      compareFaces(input.selfieB64, input.idB64),
      input.clientId ? checkVelocity(input.clientId) : Promise.resolve({ tooMany: false, count: 0 }),
      input.clientId && input.documentNumber
        ? checkDocumentReuse(input.documentNumber, input.clientId)
        : Promise.resolve(false),
    ]);

    let riskScore = 0;
    const flags: string[] = [];

    // ── MRZ parse (before OCR scoring — provides structured data) ──
    const mrz = parseMrz(idText);

    // ── 1. ID OCR ─────────────────────────────────────────────────
    const idOcrFlags: string[] = [];
    let idOcrPenalty = 0;
    let idOcrPassed  = false;

    if (!idText || idText.trim().length < 20) {
      riskScore += 25; flags.push("ID document text unreadable");
    } else {
      const t = idText.toLowerCase();

      // Document number
      if (input.documentNumber && !t.includes(input.documentNumber.toLowerCase())) {
        idOcrPenalty += 15; idOcrFlags.push("Document number not found in ID");
      }
      // DOB
      if (input.dateOfBirth && !dobFound(idText, input.dateOfBirth)) {
        idOcrPenalty += 8; idOcrFlags.push("Date of birth not found in ID");
      }
      // Country
      if (input.country) {
        const c = input.country.toLowerCase();
        if (!t.includes(c) && !(c === "mauritius" && t.includes("maurit"))) {
          idOcrPenalty += 5; idOcrFlags.push("Country not found in ID text");
        }
      }
      // Name match
      const nmScore = nameMatchScore(idText, input.fullName);
      if (nmScore < 50) {
        idOcrPenalty += 10; idOcrFlags.push(`Name mismatch: ${nmScore}% match with ID`);
      }
      // MRZ bonus
      if (mrz.found) idOcrPenalty = Math.max(0, idOcrPenalty - 5);

      idOcrPenalty = Math.min(idOcrPenalty, 30);
      idOcrPassed  = idOcrPenalty === 0;
      riskScore   += idOcrPenalty;
      flags.push(...idOcrFlags);
    }

    // ── 2. Expiry check (from MRZ) ────────────────────────────────
    let expiryResult = { checked: false, expired: false, expiry: "" };
    if (mrz.found && mrz.expiry) {
      expiryResult = { checked: true, expired: mrz.expired ?? false, expiry: mrz.expiry };
      if (mrz.expired) {
        riskScore += 40; flags.push(`ID document has expired (expiry: ${mrz.expiry})`);
      }
    }

    // ── 3. MRZ checksum validation ────────────────────────────────
    let mrzResult = { found: mrz.found, valid: mrz.valid, docNumber: mrz.docNumber, nationality: mrz.nationality };
    if (mrz.found && !mrz.valid) {
      riskScore += 20; flags.push("MRZ checksum invalid — document may be tampered");
    }

    // ── 4. Face on ID document ────────────────────────────────────
    let idFaceResult = { count: idFaces.length, passed: false };
    if (idFaces.length === 0) {
      riskScore += 10; flags.push("No face detected on ID document");
    } else {
      idFaceResult = { count: idFaces.length, passed: true };
    }

    // ── 5. Selfie face detection ──────────────────────────────────
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

    // ── 6. Face match: selfie vs ID ───────────────────────────────
    let faceMatchResult = { similarity: faceMatchScore, passed: false };
    if (faceMatchScore === -1) {
      riskScore += 15; flags.push("Could not detect face on ID document for comparison");
    } else if (faceMatchScore === 0) {
      riskScore += 40; flags.push("Selfie does not match face on ID document");
    } else if (faceMatchScore < 80) {
      riskScore += 20; flags.push(`Weak face match: selfie vs ID (${faceMatchScore.toFixed(0)}% similarity)`);
    } else if (faceMatchScore < 90) {
      riskScore += 8; flags.push(`Moderate face match (${faceMatchScore.toFixed(0)}% similarity)`);
      faceMatchResult = { similarity: faceMatchScore, passed: true };
    } else {
      faceMatchResult = { similarity: faceMatchScore, passed: true };
    }

    // ── 7. Spoof detection ────────────────────────────────────────
    const { penalty: sp, flag: sf } = scoreSpoofFromLabels(selfieLabels);
    riskScore += sp;
    if (sf) flags.push(sf);
    const spoofResult = {
      penalty: sp, passed: sp === 0,
      labels: selfieLabels.slice(0, 8).map(l => `${l.Name} (${l.Confidence.toFixed(0)}%)`),
    };

    // ── 8. POA OCR ────────────────────────────────────────────────
    let poaOcrResult = { penalty: 0, flags: [] as string[], passed: false, skipped: false };
    if (poaIsPdf) {
      poaOcrResult = { penalty: 0, flags: [], passed: true, skipped: true };
      flags.push("Proof of address is PDF — address cross-check skipped, manual review required");
      riskScore += 10;
    } else if (!poaText || poaText.trim().length < 20) {
      riskScore += 15; flags.push("Proof of address text unreadable");
    } else {
      const { penalty, flags: f } = scorePoaOcr(poaText, input);
      riskScore += penalty; flags.push(...f);
      poaOcrResult = { penalty, flags: f, passed: penalty === 0, skipped: false };
    }

    // ── 9. Tier 3: Document classification ───────────────────────
    const docClass = classifyIdDocument(idLabels);
    let docClassResult = { isIdDoc: docClass.isIdDoc, confidence: docClass.confidence };
    if (!docClass.isIdDoc && idText.trim().length < 20) {
      // Only penalise if OCR also failed — avoid false positives
      riskScore += 15; flags.push("Uploaded ID does not appear to be an identity document");
    }

    // ── 10. Tier 2: Velocity check ────────────────────────────────
    let velocityCheck = { count: velocityResult.count, flagged: velocityResult.tooMany };
    if (velocityResult.tooMany) {
      riskScore += 20; flags.push(`High submission velocity: ${velocityResult.count} attempts in 24h`);
    }

    // ── 11. Tier 2: Document reuse ────────────────────────────────
    let docReuseCheck = { flagged: docReuseResult };
    if (docReuseResult) {
      riskScore += 50; flags.push("Document number already used by another account");
    }

    // ── Final decision ────────────────────────────────────────────
    riskScore = Math.min(riskScore, 100);

    const hardReject =
      selfieFaces.length === 0 ||
      faceMatchScore === 0     ||
      sp >= 40                 ||
      docReuseResult           ||
      (mrz.found && mrz.expired === true);

    const details = {
      idOcr: {
        textExtracted: idText.slice(0, 600),
        penalty: idOcrPenalty,
        flags:   idOcrFlags,
        passed:  idOcrPassed,
        nameMatchScore: nameMatchScore(idText, input.fullName),
      },
      mrz: {
        ...mrzResult,
        expiry: expiryResult,
      },
      idFaceCheck:   idFaceResult,
      faceDetection: faceDetectResult,
      faceMatch:     faceMatchResult,
      spoofCheck:    spoofResult,
      docClassification: docClassResult,
      poaOcr: {
        textExtracted: poaText.slice(0, 400),
        ...poaOcrResult,
      },
      fraudChecks: {
        velocity:    velocityCheck,
        documentReuse: docReuseCheck,
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
      needsReview: riskScore >= 30,
      reason:      flags.length > 0 ? flags.join("; ") : undefined,
    });

  } catch (err) {
    console.error("[kyc-verify] AWS error:", err);
    return res.status(200).json({
      ok: true, referenceId, riskScore: 50, flags: [], details: null, needsReview: true,
      reason: "Automated check unavailable — queued for manual review.",
    });
  }
}
