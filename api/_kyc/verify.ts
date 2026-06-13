/**
 * api/kyc-verify.ts — Enterprise KYC Pipeline v3
 *
 * TIER 1 — Core biometric + document checks
 *   1. DetectText on ID → OCR (doc number, DOB, name, country, expiry)
 *   2. DetectFaces on selfie → count + confidence
 *   3. CompareFaces (selfie vs ID) → face match %
 *   4. DetectFaces on ID doc → confirm face on document
 *   5. DetectLabels on selfie → spoof detection
 *   6. DetectText on POA → address cross-check
 *   7. MRZ parse + checksum validation
 *
 * TIER 2 — Fraud signals
 *   8. Velocity check (>3 in 24h)
 *   9. Document reuse (same doc number on another account)
 *   10. Duplicate face search (Rekognition face collection)
 *
 * TIER 3 — ML + AI
 *   11. Document classification (DetectLabels on ID)
 *   12. Claude AI reasoning on OCR text — catches subtle inconsistencies
 *
 * POST-VERIFY
 *   13. Index verified face into collection (on clean pass)
 */

import { createHmac, createHash } from "crypto";


// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getEnv = (k: string) => (globalThis as any).process?.env?.[k] ?? "";

/* ── AWS Sig v4 ─────────────────────────────────────────────── */

const AWS_REGION    = "ap-south-1";
const COLLECTION_ID = "ficium-kyc-faces";

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

interface RekFace  { Confidence: number; BoundingBox: { Width: number; Height: number } }
interface RekLabel { Name: string; Confidence: number }
interface FaceMatch { Similarity: number }

async function detectText(b64: string): Promise<string> {
  const d = await awsPost("rekognition", "RekognitionService.DetectText", { Image: { Bytes: b64 } }) as
    { TextDetections?: Array<{ DetectedText: string; Type: string; Confidence: number }> };
  return (d.TextDetections ?? []).filter(b => b.Type === "LINE" && b.Confidence > 50).map(b => b.DetectedText).join("\n");
}
async function detectFaces(b64: string): Promise<RekFace[]> {
  const d = await awsPost("rekognition", "RekognitionService.DetectFaces", { Image: { Bytes: b64 }, Attributes: ["DEFAULT"] }) as { FaceDetails?: RekFace[] };
  return d.FaceDetails ?? [];
}
async function detectLabels(b64: string): Promise<RekLabel[]> {
  const d = await awsPost("rekognition", "RekognitionService.DetectLabels", { Image: { Bytes: b64 }, MaxLabels: 30, MinConfidence: 70 }) as { Labels?: RekLabel[] };
  return d.Labels ?? [];
}
async function compareFaces(srcB64: string, tgtB64: string): Promise<number> {
  try {
    const d = await awsPost("rekognition", "RekognitionService.CompareFaces", {
      SourceImage: { Bytes: srcB64 }, TargetImage: { Bytes: tgtB64 }, SimilarityThreshold: 50,
    }) as { FaceMatches?: FaceMatch[] };
    return d.FaceMatches?.length ? d.FaceMatches[0].Similarity : 0;
  } catch { return -1; }
}
interface FaceCollectionResult { duplicate: boolean; matchedClientId?: string; similarity?: number }
async function searchFaceCollection(b64: string, clientId: string): Promise<FaceCollectionResult> {
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
async function indexFace(b64: string, clientId: string): Promise<void> {
  try {
    await awsPost("rekognition", "RekognitionService.IndexFaces", {
      CollectionId: COLLECTION_ID, Image: { Bytes: b64 },
      ExternalImageId: clientId, MaxFaces: 1, QualityFilter: "AUTO", DetectionAttributes: [],
    });
  } catch (err) {
    console.error("[kyc-verify] IndexFaces error:", err);
  }
}

/* ── Supabase helpers (fraud checks) ───────────────────────── */

async function supabaseQuery(path: string): Promise<unknown[]> {
  const url = getEnv("VITE_SUPABASE_URL") || getEnv("SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return [];
  try {
    const r = await fetch(`${url}/rest/v1/${path}`, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Accept": "application/json" },
    });
    if (!r.ok) return [];
    return r.json() as Promise<unknown[]>;
  } catch { return []; }
}
interface KycCheckSettings {
  ai_analysis: boolean; face_match: boolean; duplicate_face: boolean;
  ocr_name_match: boolean; proof_of_address: boolean; velocity_check: boolean;
  document_reuse: boolean; liveness_check: boolean; mrz_validation: boolean;
  permit_check: boolean;
}
const DEFAULT_SETTINGS: KycCheckSettings = {
  ai_analysis: true, face_match: true, duplicate_face: true,
  ocr_name_match: true, proof_of_address: true, velocity_check: true,
  document_reuse: true, liveness_check: true, mrz_validation: true,
  permit_check: true,
};
async function loadKycSettings(): Promise<KycCheckSettings> {
  try {
    const rows = await supabaseQuery("kyc_settings?id=eq.1&select=*&limit=1");
    if (rows.length > 0) return { ...DEFAULT_SETTINGS, ...(rows[0] as KycCheckSettings) };
  } catch { /* fall through to defaults */ }
  return DEFAULT_SETTINGS;
}

async function checkVelocity(clientId: string): Promise<{ tooMany: boolean; count: number }> {
  const since = new Date(Date.now() - 86400000).toISOString();
  const rows  = await supabaseQuery(`kyc_submissions?client_id=eq.${clientId}&submitted_at=gte.${since}&select=id`);
  return { tooMany: rows.length >= 3, count: rows.length };
}
async function checkDocumentReuse(docNum: string, clientId: string): Promise<boolean> {
  if (!docNum) return false;
  const rows = await supabaseQuery(`kyc_submissions?document_number=eq.${encodeURIComponent(docNum)}&client_id=neq.${clientId}&select=id&limit=1`);
  return rows.length > 0;
}

/* ── Claude AI reasoning ────────────────────────────────────── */

interface AiAnalysis {
  suspicious:    boolean;
  confidence:    "high" | "medium" | "low";
  flags:         string[];
  summary:       string;
}

async function claudeAnalyzeOcr(
  idText: string, poaText: string,
  input: { documentNumber?: string; dateOfBirth?: string; country?: string; fullName?: string; city?: string; nationality?: string; residenceStatus?: string; sameNationalityResidence?: boolean },
  idB64?: string,
  residency?: { nationality?: string; residenceStatus?: string; sameNationalityResidence?: boolean }
): Promise<AiAnalysis> {
  const apiKey = getEnv("ANTHROPIC_API_KEY");
  if (!apiKey) return { suspicious: false, confidence: "low", flags: [], summary: "AI analysis unavailable" };

  const textPrompt = `KYC fraud check. User: name=${input.fullName??'?'} doc=${input.documentNumber??'?'} dob=${input.dateOfBirth??'?'} country=${input.country??'?'} city=${input.city??'?'}
ID OCR: ${idText.slice(0,250)}
POA OCR: ${poaText.slice(0,150)}
Also assess the ID document image for: tampering, fake/printed document, uneven fonts, photo substitution, glare obscuring fields, or poor quality that prevents verification.
Residency: status=${residency?.residenceStatus??'citizen'} nationality=${residency?.nationality??input.country??'?'} sameAsResidence=${residency?.sameNationalityResidence??true}
Check for name/doc/dob mismatches, nationality inconsistencies, and fraud. Reply ONLY JSON (no markdown): {"suspicious":false,"confidence":"high","flags":[],"summary":"one sentence"}`;

  // Build message content — include ID image if available
  const userContent: unknown[] = idB64
    ? [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: idB64 } },
        { type: "text",  text: textPrompt },
      ]
    : [{ type: "text", text: textPrompt }];

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 300,
        messages:   [{ role: "user", content: userContent }],
      }),
    });
    if (!r.ok) {
      const errBody = await r.text();
      throw new Error(`Anthropic API ${r.status}: ${errBody.slice(0, 200)}`);
    }
    const data = await r.json() as { content: Array<{ type: string; text: string }> };
    const text = data.content.find(c => c.type === "text")?.text ?? "{}";
    return JSON.parse(text.replace(/```json|```/g, "").trim()) as AiAnalysis;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[kyc-verify] Claude AI error:", msg);
    return { suspicious: false, confidence: "low", flags: [], summary: `AI error: ${msg}` };
  }
}

/* ── MRZ parsing ────────────────────────────────────────────── */

const MRZ_CHARS   = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MRZ_WEIGHTS = [7, 3, 1];
function mrzChecksum(str: string): number {
  let t = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str[i] === "<" ? 0 : MRZ_CHARS.indexOf(str[i]);
    t += (c < 0 ? 0 : c) * MRZ_WEIGHTS[i % 3];
  }
  return t % 10;
}
interface MrzResult { found: boolean; valid: boolean; docNumber?: string; expiry?: string; expired?: boolean; nationality?: string; surname?: string; givenNames?: string }
function parseMrz(text: string): MrzResult {
  const lines = text.split("\n").map(l => l.trim().replace(/\s/g, ""));
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^[A-Z0-9<]{44}$/.test(lines[i]) && /^[A-Z0-9<]{44}$/.test(lines[i + 1])) {
      const l1 = lines[i], l2 = lines[i + 1];
      try {
        const docNum   = l2.slice(0, 9).replace(/<+$/, "");
        const docCheck = parseInt(l2[9]);
        const dob      = l2.slice(13, 19);
        const dobCheck = parseInt(l2[19]);
        const expiry   = l2.slice(21, 27);
        const expCheck = parseInt(l2[27]);
        const nat      = l2.slice(10, 13).replace(/</g, "");
        const names    = l1.slice(5).split("<<");
        const surname  = (names[0] ?? "").replace(/</g, " ").trim();
        const given    = (names[1] ?? "").replace(/</g, " ").trim();
        const valid    = mrzChecksum(l2.slice(0, 9)) === docCheck && mrzChecksum(dob) === dobCheck && mrzChecksum(expiry) === expCheck;
        const expYear  = parseInt(expiry.slice(0, 2)) + (parseInt(expiry.slice(0, 2)) > 50 ? 1900 : 2000);
        const expired  = new Date(`${expYear}-${expiry.slice(2, 4)}-${expiry.slice(4, 6)}`) < new Date();
        return { found: true, valid, docNumber: docNum, expiry, expired, nationality: nat, surname, givenNames: given };
      } catch { return { found: true, valid: false }; }
    }
  }
  return { found: false, valid: false };
}

/* ── DOB matching ───────────────────────────────────────────── */

function dobFound(text: string, dob: string): boolean {
  const t = text.toLowerCase();
  const [y, m, d] = dob.split("-");
  const my = parseInt(m, 10).toString();
  const md = parseInt(d, 10).toString();
  const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const mn = MONTHS[parseInt(m, 10) - 1];
  return [
    `${d}/${m}/${y}`,`${d}-${m}-${y}`,`${d} ${m} ${y}`,`${md}/${m}/${y}`,`${md}-${m}-${y}`,
    `${m}/${d}/${y}`,`${m}-${d}-${y}`,`${m} ${d} ${y}`,`${my}/${d}/${y}`,`${my}-${d}-${y}`,
    `${y}-${m}-${d}`,`${y}/${m}/${d}`,`${y.slice(2)}${m}${d}`,
    `${md} ${mn} ${y}`,`${d} ${mn} ${y}`,`${mn} ${md}, ${y}`,`${mn} ${d}, ${y}`,
  ].some(v => t.includes(v));
}

/* ── Spoof detection ────────────────────────────────────────── */

function scoreSpoofFromLabels(labels: RekLabel[]): { penalty: number; flag: string | null } {
  const hard = ["monitor","screen","display","television","computer monitor","laptop","tablet","ipad","smartphone"];
  const soft = ["paper","poster","printed","printout","newspaper"];
  for (const l of labels) {
    const n = l.Name.toLowerCase();
    if (hard.some(k => n.includes(k)) && l.Confidence >= 75) return { penalty: 40, flag: `Digital spoof: ${l.Name} (${l.Confidence.toFixed(0)}%)` };
    if (soft.some(k => n.includes(k)) && l.Confidence >= 85) return { penalty: 20, flag: `Printed photo: ${l.Name} (${l.Confidence.toFixed(0)}%)` };
  }
  return { penalty: 0, flag: null };
}

/* ── Name match ─────────────────────────────────────────────── */

function nameMatchScore(text: string, name?: string): number {
  if (!name) return 100;
  const t = text.toLowerCase();
  const parts = name.toLowerCase().trim().split(/\s+/);
  return Math.round(parts.filter(p => p.length > 1 && t.includes(p)).length / parts.length * 100);
}

/* ── POA OCR ────────────────────────────────────────────────── */

function scorePoaOcr(text: string, city?: string, addr?: string): { penalty: number; flags: string[] } {
  const t = text.toLowerCase();
  const flags: string[] = [];
  let p = 0;
  if (city && !t.includes(city.toLowerCase())) { p += 10; flags.push("City not found in proof of address"); }
  if (addr) {
    const fw = addr.toLowerCase().split(" ")[0];
    if (fw.length > 2 && !t.includes(fw)) { p += 10; flags.push("Address not found in proof of address"); }
  }
  return { penalty: p, flags };
}

/* ── Doc classification ─────────────────────────────────────── */

function classifyIdDocument(labels: RekLabel[]): { isIdDoc: boolean; confidence: number } {
  const kw = ["passport","identity document","id card","driving license","driver's license","document","card","text"];
  const m  = labels.filter(l => kw.some(k => l.Name.toLowerCase().includes(k)));
  if (!m.length) return { isIdDoc: false, confidence: 0 };
  const best = Math.max(...m.map(l => l.Confidence));
  return { isIdDoc: best >= 70, confidence: best };
}

/* ── Input type ─────────────────────────────────────────────── */

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
  livenessSessionId?: string;
  livenessConfidence?: number;
  nationality?:        string;
  residenceStatus?:    string;
  sameNationalityResidence?: boolean;
  permitB64?:          string;
}

/* ── Handler ────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function verifyHandler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!getEnv("AWS_ACCESS_KEY_ID") && !getEnv("VITE_AWS_ACCESS_KEY_ID"))
    return res.status(503).json({ error: "AWS credentials not configured" });

  // Parse body — Vercel may pass it as a string if Content-Type header is missing
  let input: KycInput;
  try {
    input = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as KycInput;
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  if (!input || !input.idB64 || !input.selfieB64 || !input.poaB64)
    return res.status(400).json({ error: "idB64, selfieB64, poaB64 required — body keys received: " + Object.keys(input ?? {}).join(", ") });

  const poaIsPdf    = (input.poaMimeType ?? "").includes("pdf") || (input.poaFileName ?? "").endsWith(".pdf");
  const referenceId = `aws-${Date.now()}`;

  try {
    console.log("[kyc-verify] start", { clientId: input.clientId, hasPermit: !!input.permitB64, residenceStatus: input.residenceStatus });
    const cfg = await loadKycSettings();
    // ── Run all AWS + fraud checks in parallel ────────────────
    const [
      idText, poaText,
      selfieFaces, idFaces,
      selfieLabels, idLabels,
      faceMatchScore,
      duplicateFaceResult,
      velocityResult, docReuseResult,
    ] = await Promise.all([
      cfg.ocr_name_match  ? detectText(input.idB64)                                          : Promise.resolve(""),
      cfg.proof_of_address && !poaIsPdf ? detectText(input.poaB64)                         : Promise.resolve(""),
      detectFaces(input.selfieB64),
      cfg.ocr_name_match  ? detectFaces(input.idB64)                                        : Promise.resolve([]),
      detectLabels(input.selfieB64),
      detectLabels(input.idB64),
      cfg.face_match      ? compareFaces(input.selfieB64, input.idB64)                      : Promise.resolve(-2),
      cfg.duplicate_face && input.clientId
        ? searchFaceCollection(input.selfieB64, input.clientId)
        : Promise.resolve({ duplicate: false } as FaceCollectionResult),
      cfg.velocity_check && input.clientId ? checkVelocity(input.clientId)                 : Promise.resolve({ tooMany: false, count: 0 }),
      cfg.document_reuse && input.clientId && input.documentNumber
        ? checkDocumentReuse(input.documentNumber, input.clientId)
        : Promise.resolve(false),
    ]);

    // ── Claude AI analysis (after OCR, uses results + ID image) ─
    const aiAnalysis = cfg.ai_analysis ? await claudeAnalyzeOcr(idText, poaText, {
      documentNumber: input.documentNumber,
      dateOfBirth:    input.dateOfBirth,
      country:        input.country,
      fullName:       input.fullName,
      city:           input.city,
    }, input.idB64, {
      nationality:             input.nationality,
      residenceStatus:         input.residenceStatus,
      sameNationalityResidence: input.sameNationalityResidence,
    }) : { suspicious: false, confidence: "low" as const, flags: [], summary: "AI analysis disabled" };

    const mrz       = cfg.mrz_validation ? parseMrz(idText) : { found: false, valid: false, expired: false, expiry: "", docNumber: "", nationality: "", surname: "", givenNames: "" };
    let riskScore   = 0;
    const flags: string[] = [];

    // ── Permit document check (if provided) ──────────────────────
    if (cfg.permit_check && input.permitB64) {
      const [permitText] = await Promise.all([detectText(input.permitB64 ?? "")]);
      if (!permitText || permitText.trim().length < 20) {
        flags.push("Permit document text unreadable"); riskScore += 15;
      } else {
        const permitNameMatch = nameMatchScore(permitText, input.fullName);
        if (permitNameMatch < 50) {
          flags.push(`Name on permit does not match account holder (${permitNameMatch}% match)`);
          riskScore += 20;
        }
        const pt = permitText.toLowerCase();
        if (pt.includes("expired") || pt.includes("cancelled")) {
          flags.push("Permit may be expired or cancelled"); riskScore += 30;
        }
      }
    }

    // ── 1. ID OCR ─────────────────────────────────────────────
    const idOcrFlags: string[] = [];
    let idOcrPenalty = 0;
    let idOcrPassed  = false;
    if (!idText || idText.trim().length < 20) {
      riskScore += 25; flags.push("ID document text unreadable");
    } else {
      const t = idText.toLowerCase();
      if (input.documentNumber && !t.includes(input.documentNumber.toLowerCase()))
        { idOcrPenalty += 15; idOcrFlags.push("Document number not found in ID"); }
      if (input.dateOfBirth && !dobFound(idText, input.dateOfBirth))
        { idOcrPenalty += 8;  idOcrFlags.push("Date of birth not found in ID"); }
      if (input.country) {
        const c = input.country.toLowerCase();
        if (!t.includes(c) && !(c === "mauritius" && t.includes("maurit")))
          { idOcrPenalty += 5; idOcrFlags.push("Country not found in ID text"); }
      }
      const nm = cfg.ocr_name_match ? nameMatchScore(idText, input.fullName) : 100;
      if (cfg.ocr_name_match && nm === 0) { idOcrPenalty += 30; idOcrFlags.push('Name on ID does not match your details at all'); }
      else if (cfg.ocr_name_match && nm < 50) { idOcrPenalty += 10; idOcrFlags.push(`Name mismatch: ${nm}% match with ID`); }
      if (mrz.found) idOcrPenalty = Math.max(0, idOcrPenalty - 5);
      idOcrPenalty = Math.min(idOcrPenalty, 30);
      idOcrPassed  = idOcrPenalty === 0;
      riskScore   += idOcrPenalty;
      flags.push(...idOcrFlags);
    }

    // ── 2. Expiry (MRZ) ───────────────────────────────────────
    if (mrz.found && mrz.expired) { riskScore += 40; flags.push(`ID document has expired (${mrz.expiry})`); }
    if (mrz.found && !mrz.valid)  { riskScore += 20; flags.push("MRZ checksum invalid — possible tamper"); }

    // ── 3. Face on ID doc ─────────────────────────────────────
    if (idFaces.length === 0) { riskScore += 10; flags.push("No face detected on ID document"); }

    // ── 4. Selfie face detection ──────────────────────────────
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

    // ── 5. Face match: selfie vs ID ───────────────────────────
    let faceMatchResult = { similarity: faceMatchScore, passed: false };
    if      (faceMatchScore === -2) { /* face match disabled — skip */ }
    else if (faceMatchScore === -1) { riskScore += 15; flags.push("Could not detect face on ID for comparison"); }
    else if (faceMatchScore === 0)  { riskScore += 40; flags.push("Selfie does not match face on ID"); }
    else if (faceMatchScore < 80)   { riskScore += 20; flags.push(`Weak face match (${faceMatchScore.toFixed(0)}%)`); }
    else if (faceMatchScore < 90)   { riskScore += 8;  flags.push(`Moderate face match (${faceMatchScore.toFixed(0)}%)`); faceMatchResult = { similarity: faceMatchScore, passed: true }; }
    else                            { faceMatchResult = { similarity: faceMatchScore, passed: true }; }

    // ── 6. Liveness check (if session provided) ───────────────
    let livenessResult = { checked: false, passed: false, confidence: 0 };
    if (input.livenessSessionId) {
      const lc = input.livenessConfidence ?? 0;
      livenessResult = { checked: true, passed: lc >= 90, confidence: lc };
      if (lc < 90) { riskScore += 25; flags.push(`Liveness check failed (confidence: ${lc.toFixed(0)}%)`); }
    }

    // ── 7. Spoof detection ────────────────────────────────────
    const { penalty: sp, flag: sf } = scoreSpoofFromLabels(selfieLabels);
    riskScore += sp;
    if (sf) flags.push(sf);

    // ── 8. POA OCR ────────────────────────────────────────────
    let poaOcrResult = { penalty: 0, flags: [] as string[], passed: false, skipped: false };
    if (poaIsPdf) {
      poaOcrResult = { penalty: 0, flags: [], passed: true, skipped: true };
      flags.push("POA is PDF — cross-check skipped, manual review required");
      riskScore += 10;
    } else if (!poaText || poaText.trim().length < 20) {
      riskScore += 15; flags.push("Proof of address text unreadable");
    } else {
      const { penalty, flags: f } = scorePoaOcr(poaText, input.city, input.addressLine1);
      riskScore += penalty; flags.push(...f);
      poaOcrResult = { penalty, flags: f, passed: penalty === 0, skipped: false };
    }

    // ── 9. Doc classification ─────────────────────────────────
    const docClass = classifyIdDocument(idLabels);
    if (!docClass.isIdDoc && idText.trim().length < 20) {
      riskScore += 15; flags.push("Uploaded ID does not appear to be an identity document");
    }

    // ── 10. Duplicate face (cross-user) ───────────────────────
    if (duplicateFaceResult.duplicate) {
      riskScore += 60; flags.push(`Face matches another account (${duplicateFaceResult.similarity?.toFixed(0)}% similarity)`);
    }

    // ── 11. Velocity ──────────────────────────────────────────
    if (velocityResult.tooMany) {
      riskScore += 20; flags.push(`High submission velocity: ${velocityResult.count} attempts in 24h`);
    }

    // ── 12. Document reuse ────────────────────────────────────
    if (docReuseResult) {
      riskScore += 50; flags.push("Document number already used by another account");
    }

    // ── 13. Claude AI flags ───────────────────────────────────
    if (aiAnalysis.suspicious) {
      const aiPenalty = aiAnalysis.confidence === "high" ? 25 : aiAnalysis.confidence === "medium" ? 15 : 8;
      riskScore += aiPenalty;
      flags.push(...aiAnalysis.flags.map(f => `[AI] ${f}`));
    }

    // ── Final decision ────────────────────────────────────────
    riskScore = Math.min(riskScore, 100);

    // AI address flag = soft flag only (too many false positives for hard reject)
    const aiAddrFlag = aiAnalysis.flags.some((f) => f.toLowerCase().includes('address') && f.toLowerCase().includes('mismatch'));
    if (aiAddrFlag) { riskScore += 15; } // pushes toward pending_review but never hard rejects

    // AI-detected name mismatch = instant rejection (wrong person's ID)
    const aiNameMismatch = cfg.ai_analysis && aiAnalysis.suspicious && aiAnalysis.confidence === 'high' &&
      aiAnalysis.flags.some((f) => f.toLowerCase().includes('name_mismatch') || f.toLowerCase().includes('name mismatch'));
    const hardReject =
      selfieFaces.length === 0      ||
      (cfg.face_match && faceMatchScore === 0) ||
      sp >= 40                      ||
      docReuseResult                ||
      duplicateFaceResult.duplicate ||
      (mrz.found && mrz.expired === true) ||
      aiNameMismatch;

    const nm = nameMatchScore(idText, input.fullName);

    const details = {
      idOcr:          { textExtracted: idText.slice(0, 600), penalty: idOcrPenalty, flags: idOcrFlags, passed: idOcrPassed, nameMatchScore: nm },
      mrz:            { found: mrz.found, valid: mrz.valid, docNumber: mrz.docNumber, nationality: mrz.nationality, expiry: { checked: mrz.found, expired: mrz.expired ?? false, expiry: mrz.expiry ?? "" } },
      idFaceCheck:    { count: idFaces.length, passed: idFaces.length > 0 },
      faceDetection:  faceDetectResult,
      faceMatch:      faceMatchResult,
      liveness:       livenessResult,
      spoofCheck:     { penalty: sp, passed: sp === 0, labels: selfieLabels.slice(0, 8).map(l => `${l.Name} (${l.Confidence.toFixed(0)}%)`) },
      poaOcr:         { textExtracted: poaText.slice(0, 400), ...poaOcrResult },
      docClassification: docClass,
      fraudChecks:    { velocity: velocityResult, documentReuse: { flagged: docReuseResult }, duplicateFace: duplicateFaceResult },
      aiAnalysis,
    };

    // ── Index face on clean/review pass (not hard reject) ─────
    // AI suspicious:true with medium/high confidence always forces review
    const aiForceReview = aiAnalysis.suspicious && (aiAnalysis.confidence === 'high' || aiAnalysis.confidence === 'medium');
    const needsReview = riskScore >= 30 || aiForceReview;
    if (!hardReject && input.clientId && faceMatchScore >= 90) {
      // Only index high-confidence matches to keep collection clean
      indexFace(input.selfieB64, input.clientId).catch(() => {});
    }

    // Name/address mismatch: reject with a specific user-facing message
    if (aiNameMismatch) {
      return res.status(200).json({
        ok: false, referenceId, riskScore, flags, details,
        reason: "The name on your ID does not match the details you provided. Please ensure you are uploading your own ID document.",
      });
    }
    if (hardReject) {
      return res.status(200).json({
        ok: false, referenceId, riskScore, flags, details,
        reason: flags[0] ?? "Automated check failed. Please resubmit with clearer photos.",
      });
    }

    return res.status(200).json({
      ok: true, referenceId, riskScore, flags, details, needsReview,
      reason: flags.length > 0 ? flags.join("; ") : undefined,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[kyc-verify] PIPELINE ERROR:", msg);
    return res.status(200).json({
      ok: false, referenceId, riskScore: 50, flags: [], details: null,
      reason: `Pipeline error: ${msg}`,
    });
  }
}
