// =============================================================
// Ficium KYC — NIC scan client
//
// Calls the ?action=scan endpoint with just the ID photo to
// auto-fill identity fields — used at signup (pre-auth, name/sex/
// DOB) and again at the onboarding KYC step (authenticated,
// document number). This is a convenience pre-fill only — the
// full risk-scored verification pipeline (submitKyc) still runs
// independently at KYC submission time and is the source of truth.
// =============================================================
import { apiFetch } from "@/shared/lib/apiClient";
import { compressBlobToBase64 } from "./imageCompress";

export type ScanResult =
  | {
      found: true;
      documentType?: "national_id" | "passport";
      documentNumber?: string;
      documentNumberConfidence?: "high" | "low";
      firstName?: string;
      lastName?: string;
      sex?: "M" | "F";
      dateOfBirth?: string; // YYYY-MM-DD
      confidence: "high" | "medium" | "low";
    }
  | { found: false; reason?: string };

export async function scanIdDocument(file: File): Promise<ScanResult> {
  const idB64 = await compressBlobToBase64(file);

  const res = await apiFetch("/api/kyc?action=scan", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idB64 }),
  });

  if (res.status === 429) {
    const body = await res.json().catch(() => ({ error: "Too many attempts." }));
    return { found: false, reason: body.error ?? "Too many scan attempts. Please try again shortly." };
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Scan failed (${res.status}): ${errText.slice(0, 200)}`);
  }
  return res.json() as Promise<ScanResult>;
}
