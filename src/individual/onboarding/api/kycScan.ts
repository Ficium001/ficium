// =============================================================
// Ficium KYC — NIC scan client
//
// Calls the lightweight ?action=scan endpoint with just the ID
// photo to auto-fill the document number field on the KYC form.
// This is a convenience pre-fill only — the full risk-scored
// verification pipeline (submitKyc) still runs independently at
// submission time and is the source of truth.
// =============================================================
import { apiFetch } from "@/shared/lib/apiClient";
import { compressBlobToBase64 } from "../../../shared/lib/imageCompress";

export type ScanResult =
  | { found: true; documentType: "national_id" | "passport"; documentNumber: string; confidence: "high" | "low" }
  | { found: false; reason?: string };

export async function scanIdDocument(file: File): Promise<ScanResult> {
  const idB64 = await compressBlobToBase64(file);

  const res = await apiFetch("/api/kyc?action=scan", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idB64 }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Scan failed (${res.status}): ${errText.slice(0, 200)}`);
  }
  return res.json() as Promise<ScanResult>;
}
