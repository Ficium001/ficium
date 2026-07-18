/**
 * api/_kyc/scan.ts
 * ─────────────────────────────────────────────────────────────
 * Lightweight document-scan endpoint for the "Scan NIC" capture
 * flow on the onboarding KYC form.
 *
 * Unlike verify.ts (which needs the ID + selfie + proof of address
 * together to run the full risk-scored pipeline), this endpoint
 * only needs the ID photo. It runs a single Rekognition DetectText
 * call and returns a best-effort document number so the form field
 * can be pre-filled — the user always sees and can correct the
 * result before continuing, and the full verify pipeline still runs
 * independently at submission time as the source of truth.
 *
 * Auth: gated at "user" level by api/kyc.ts (same as ?action=verify).
 */

import { detectText } from "./aws.js";
import { parseMrz, extractNic } from "./docExtract.js";

interface ScanInput {
  idB64?: string;
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

  try {
    const text = await detectText(input.idB64);

    if (!text || text.trim().length < 4) {
      return res.status(200).json({ found: false, reason: "No readable text detected. Try a clearer, well-lit photo." });
    }

    // Try Mauritius NIC pattern first (most common case for this app).
    const nic = extractNic(text);
    if (nic.found) {
      return res.status(200).json({
        found: true,
        documentType:   "national_id",
        documentNumber: nic.documentNumber,
        confidence:      nic.confidence,
      });
    }

    // Fall back to MRZ (passport, or NIC/driver's license with an MRZ strip).
    const mrz = parseMrz(text);
    if (mrz.found && mrz.docNumber) {
      return res.status(200).json({
        found: true,
        documentType:   "passport",
        documentNumber: mrz.docNumber,
        confidence:      mrz.valid ? "high" : "low",
      });
    }

    return res.status(200).json({ found: false, reason: "Could not find a document number on this photo. You can enter it manually." });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[kyc-scan] error:", msg);
    return res.status(500).json({ error: `Scan failed: ${msg}` });
  }
}
