/**
 * api/_kyc/scan.ts
 * ─────────────────────────────────────────────────────────────
 * Lightweight document-scan endpoint for the "Scan NIC" capture
 * flow. Used in two places:
 *   - Signup (RegisterIndividual.tsx) — pre-auth, no account yet.
 *     Prefills first/last name, sex, and date of birth on the
 *     signup form.
 *   - Onboarding KYC (Kyc.tsx) — authenticated. Prefills the
 *     document number field.
 *
 * Unlike verify.ts (which needs the ID + selfie + proof of address
 * together to run the full risk-scored pipeline), this endpoint
 * only needs the ID photo. Every field it returns is a pre-fill
 * suggestion only — always shown as editable, never trusted
 * silently — and the full verify pipeline still runs independently
 * at KYC submission time as the source of truth for identity.
 *
 * Auth: gate is "none" at the router (api/kyc.ts) since signup
 * calls have no session yet. This handler does its own *optional*
 * auth check instead: an authenticated caller is rate-limited by
 * user id (generous), an anonymous caller by IP hash (stricter,
 * since it's pre-account and easier to abuse).
 */

import { createHash } from "crypto";
import { detectText } from "./aws.js";
import { parseMrz, extractNic } from "./docExtract.js";
import { extractIdFields } from "./claudeVision.js";
import { supabaseQuery, supabaseInsert } from "./db.js";
import { requireUser } from "../_lib/auth.js";

interface ScanInput {
  idB64?: string;
}

const ANON_LIMIT_PER_HOUR = 10;
const USER_LIMIT_PER_HOUR = 30;

function clientIp(req: any): string {
  const fwd = String(req.headers?.["x-forwarded-for"] ?? "");
  return fwd.split(",")[0].trim() || "unknown";
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

/** Pre-auth calls are keyed by hashed IP; authenticated calls by client id. */
async function tooManyAttempts(key: string, keyType: "ip_hash" | "client_id", limit: number): Promise<boolean> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const rows = await supabaseQuery(
    `kyc_scan_attempts?${keyType}=eq.${encodeURIComponent(key)}&created_at=gte.${since}&select=id`
  );
  return rows.length >= limit;
}

export async function scanHandler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!(globalThis as any).process?.env?.AWS_ACCESS_KEY_ID && !(globalThis as any).process?.env?.VITE_AWS_ACCESS_KEY_ID) {
    return res.status(503).json({ error: "AWS credentials not configured" });
  }

  let input: ScanInput;
  try {
    input = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as ScanInput;
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  if (!input?.idB64) return res.status(400).json({ error: "idB64 required" });

  // Optional auth: identify the caller if a valid token is present, but
  // never reject for missing/invalid one — signup has no session yet.
  let clientId: string | null = null;
  try {
    const user = await requireUser(req);
    clientId = user.id;
  } catch { /* anonymous caller — expected for signup-time scans */ }

  const ip = clientIp(req);

  const limited = clientId
    ? await tooManyAttempts(clientId, "client_id", USER_LIMIT_PER_HOUR)
    : await tooManyAttempts(hashIp(ip), "ip_hash",  ANON_LIMIT_PER_HOUR);
  if (limited) {
    return res.status(429).json({ error: "Too many scan attempts. Please wait a bit and try again, or enter your details manually." });
  }
  // Log the attempt (best-effort, never blocks the response).
  void supabaseInsert("kyc_scan_attempts", { ip_hash: hashIp(ip), client_id: clientId });

  try {
    const [text, claudeFields] = await Promise.all([
      detectText(input.idB64),
      extractIdFields(input.idB64),
    ]);

    // Document number: prefer the regex-matched Rekognition read (tighter
    // pattern match) over Claude's, falling back to Claude's or MRZ.
    let documentNumber: string | undefined;
    let documentType: "national_id" | "passport" = "national_id";
    let numberConfidence: "high" | "low" = "low";

    const nic = text ? extractNic(text) : { found: false as const };
    if (nic.found) {
      documentNumber   = nic.documentNumber;
      numberConfidence = nic.confidence!;
    } else {
      const mrz = text ? parseMrz(text) : { found: false, valid: false };
      if (mrz.found && mrz.docNumber) {
        documentNumber   = mrz.docNumber;
        documentType     = "passport";
        numberConfidence = mrz.valid ? "high" : "low";
      } else if (claudeFields.documentNumber) {
        documentNumber   = claudeFields.documentNumber;
        numberConfidence = claudeFields.confidence === "high" ? "high" : "low";
      }
    }

    const found = !!documentNumber || !!claudeFields.surname || !!claudeFields.firstName;
    if (!found) {
      return res.status(200).json({
        found: false,
        reason: "Couldn't read this ID clearly. Try a closer, well-lit, glare-free photo, or enter your details manually.",
      });
    }

    return res.status(200).json({
      found: true,
      documentType,
      documentNumber,
      documentNumberConfidence: documentNumber ? numberConfidence : undefined,
      firstName:   claudeFields.firstName,
      lastName:    claudeFields.surname,
      sex:         claudeFields.sex,
      dateOfBirth: claudeFields.dateOfBirth,
      confidence:  claudeFields.confidence,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[kyc-scan] error:", msg);
    return res.status(500).json({ error: `Scan failed: ${msg}` });
  }
}
