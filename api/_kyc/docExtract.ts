/**
 * api/_kyc/docExtract.ts
 * ─────────────────────────────────────────────────────────────
 * Text-parsing helpers applied to Rekognition DetectText output.
 *
 * parseMrz() is moved verbatim out of verify.ts (passport / some
 * national-ID MRZ strip parsing) so it can be reused by the
 * lightweight scan endpoint. extractNic() is new — a best-effort
 * Mauritius NIC number reader for the "Scan NIC" capture flow.
 */

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
export interface MrzResult { found: boolean; valid: boolean; docNumber?: string; expiry?: string; expired?: boolean; nationality?: string; surname?: string; givenNames?: string }
export function parseMrz(text: string): MrzResult {
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

/* ── Mauritius NIC extraction ──────────────────────────────── */
//
// Mauritius NIC format printed on the card: 1 letter + 12 digits + 1
// letter (14 characters, sometimes grouped in 4s, e.g. "J280 8952
// 5013 1F"). There's no public checksum to validate against, so this
// is pattern extraction only — the UI always shows the result as an
// editable, user-confirmed field rather than trusting it silently.

const NIC_PATTERN = /([A-Z]\d{12}[A-Z])/;

export interface NicResult { found: boolean; documentNumber?: string; confidence?: "high" | "low" }

export function extractNic(text: string): NicResult {
  const upper = text.toUpperCase();

  // Pass 1 — match within a single OCR line (most reliable; avoids
  // accidentally splicing digits across unrelated lines).
  for (const line of upper.split("\n")) {
    const compact = line.replace(/[^A-Z0-9]/g, "");
    const m = compact.match(NIC_PATTERN);
    if (m) return { found: true, documentNumber: m[1], confidence: "high" };
  }

  // Pass 2 — the number was grouped/wrapped across two OCR lines
  // (Rekognition sometimes splits a long printed string). Lower
  // confidence since we're bridging line boundaries.
  const wholeCompact = upper.replace(/[^A-Z0-9\n]/g, "").replace(/\n/g, "");
  const m2 = wholeCompact.match(NIC_PATTERN);
  if (m2) return { found: true, documentNumber: m2[1], confidence: "low" };

  return { found: false };
}
