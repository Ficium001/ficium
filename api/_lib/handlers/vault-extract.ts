/**
 * api/vault-extract.ts
 * POST /api/vault-extract
 *
 * Triggered by vault_extract.dispatch() via pg_net immediately after a
 * client_vault_document INSERT. Downloads the file from Supabase Storage,
 * sends it to Claude Vision for structured data extraction, writes results
 * back into the DB, and attests verified fields into client_financial_snapshot.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  FLOW                                                           │
 * │  DB INSERT → pg_net trigger → this endpoint                     │
 * │    1. Download file from Storage                                │
 * │    2. Claude Vision → structured JSON (doc-type-aware prompt)   │
 * │    3. Score confidence                                          │
 * │    4. Attest → update snapshot / property / loan tables         │
 * │       (marriage_certificate → couple_relationship_document RPC) │
 * │    5. Write extraction result back to client_vault_document     │
 * │    6. Append audit log entry                                    │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Auth: X-Service-Secret (shared secret, same as marketplace sync).
 * Documents NEVER leave Ficium — institutions only see attested data points.
 *
 * Env required: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *               APP_SERVICE_SECRET
 */

import { Env }         from "../env.js";
import { getServiceDb, type ServiceDb } from "../db.js";

export const config = { runtime: "nodejs" };

// ── Types ──────────────────────────────────────────────────────────────────

type VaultDocType =
  | "nic" | "passport" | "birth_certificate" | "driving_licence"
  | "title_deed" | "valuation_report" | "land_registry_extract"
  | "payslip" | "employment_letter" | "tax_return"
  | "bank_statement" | "loan_statement" | "credit_card_statement"
  | "brn_certificate" | "audited_accounts" | "insurance_policy"
  | "marriage_certificate" | "other";

type ExtractStatus =
  | "pending" | "processing" | "extracted" | "attested" | "failed" | "manual_review";

interface VaultDocument {
  id:           string;
  client_id:    string;
  doc_type:     VaultDocType;
  storage_path: string;
  mime_type:    string | null;
}

// ── Extraction prompts (one per doc type — bank-grade specificity) ──────────

const PROMPTS: Partial<Record<VaultDocType, string>> = {
  payslip: `Extract from this payslip. Return ONLY valid JSON, no markdown.
{
  "employer_name":    string,
  "employee_name":    string,
  "gross_monthly":    number (MUR),
  "net_monthly":      number (MUR),
  "pay_period":       string (e.g. "June 2026"),
  "pay_date":         string (ISO date YYYY-MM-DD),
  "employment_type":  "permanent" | "contract" | "part_time"
}
Omit keys you cannot read.`,

  employment_letter: `Extract from this employment letter. Return ONLY valid JSON, no markdown.
{
  "employer_name":    string,
  "employee_name":    string,
  "position":         string,
  "gross_monthly":    number (MUR),
  "employment_type":  "permanent" | "contract",
  "start_date":       string (ISO date),
  "letter_date":      string (ISO date)
}
Omit keys you cannot read.`,

  bank_statement: `Extract from this bank statement. Return ONLY valid JSON, no markdown.
{
  "bank_name":              string,
  "account_holder":         string,
  "statement_period_from":  string (ISO date),
  "statement_period_to":    string (ISO date),
  "opening_balance":        number,
  "closing_balance":        number,
  "total_credits":          number,
  "total_debits":           number,
  "average_monthly_credit": number,
  "currency":               string (default "MUR")
}
Omit keys you cannot read.`,

  loan_statement: `Extract from this loan statement. Return ONLY valid JSON, no markdown.
{
  "lender_name":         string,
  "borrower_name":       string,
  "loan_type":           "personal_loan" | "mortgage" | "vehicle_loan" | "credit_card" | "overdraft" | "other",
  "outstanding_balance": number (MUR),
  "monthly_repayment":   number (MUR),
  "remaining_months":    number,
  "interest_rate":       number (percentage),
  "statement_date":      string (ISO date)
}
Omit keys you cannot read.`,

  credit_card_statement: `Extract from this credit card statement. Return ONLY valid JSON, no markdown.
{
  "lender_name":        string,
  "cardholder_name":    string,
  "outstanding_balance": number (MUR),
  "minimum_payment":    number (MUR),
  "credit_limit":       number (MUR),
  "statement_date":     string (ISO date)
}
Omit keys you cannot read.`,

  title_deed: `Extract from this Mauritius title deed / acte de vente. Return ONLY valid JSON, no markdown.
Note: convert toises→sqm (×3.8) and arpents→sqm (×4047) if needed.
{
  "registered_owner": string,
  "property_address": string,
  "land_area_sqm":    number,
  "property_type":    "land" | "apartment" | "villa" | "commercial" | "other",
  "deed_date":        string (ISO date),
  "deed_ref":         string (Registrar General reference),
  "is_mortgaged":     boolean,
  "mortgage_lender":  string (if mortgaged)
}
Omit keys you cannot read.`,

  valuation_report: `Extract from this property valuation report. Return ONLY valid JSON, no markdown.
{
  "property_address": string,
  "market_value":     number (MUR),
  "valuation_date":   string (ISO date),
  "valuer_name":      string,
  "property_type":    string,
  "land_area_sqm":    number
}
Omit keys you cannot read.`,

  tax_return: `Extract from this tax return. Return ONLY valid JSON, no markdown.
{
  "taxpayer_name":       string,
  "tax_year":            string (e.g. "2024/2025"),
  "gross_income":        number (MUR),
  "net_taxable_income":  number (MUR),
  "tax_paid":            number (MUR)
}
Omit keys you cannot read.`,

  insurance_policy: `Extract from this insurance policy. Return ONLY valid JSON, no markdown.
{
  "insurer_name":     string,
  "policy_holder":    string,
  "policy_type":      "life" | "property" | "vehicle" | "health" | "other",
  "sum_insured":      number (MUR),
  "premium_monthly":  number (MUR),
  "policy_start":     string (ISO date),
  "policy_expiry":    string (ISO date),
  "property_address": string (if property policy)
}
Omit keys you cannot read.`,

  marriage_certificate: `Extract from this marriage certificate. Return ONLY valid JSON, no markdown.
{
  "party_1_full_name": string (as printed on the certificate),
  "party_2_full_name": string (as printed on the certificate),
  "marriage_date":     string (ISO date),
  "registration_number": string,
  "registrar_office":  string,
  "issuing_country":   string
}
Omit keys you cannot read. If this document is not a marriage certificate, return {"error":"not_a_marriage_certificate"}.`,
};

const DEFAULT_PROMPT =
  `Extract all structured financial data from this document. ` +
  `Return ONLY valid JSON with snake_case keys. ` +
  `If you cannot extract meaningful data return {"error":"unable_to_extract"}.`;

// Expected field count per type — used for confidence scoring
const EXPECTED_FIELDS: Partial<Record<VaultDocType, number>> = {
  payslip: 7, employment_letter: 7, bank_statement: 9,
  loan_statement: 8, credit_card_statement: 6,
  title_deed: 8, valuation_report: 6, tax_return: 5, insurance_policy: 8,
  marriage_certificate: 4,
};

// ── Claude Vision call ──────────────────────────────────────────────────────

async function extractWithClaude(
  base64: string,
  mimeType: string,
  docType: VaultDocType,
): Promise<{ raw: Record<string, unknown>; confidence: number }> {
  const prompt    = PROMPTS[docType] ?? DEFAULT_PROMPT;
  const isPdf     = mimeType === "application/pdf";
  const mediaType = isPdf ? "application/pdf" : mimeType;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         Env.anthropicApiKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{
        role:    "user",
        content: [
          isPdf
            ? { type: "document", source: { type: "base64", media_type: mediaType, data: base64 } }
            : { type: "image",    source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: prompt },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API ${res.status}: ${body}`);
  }

  const json    = await res.json() as { content: Array<{ type: string; text?: string }> };
  const rawText = json.content.find((b) => b.type === "text")?.text ?? "{}";

  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(rawText.replace(/```json|```/g, "").trim());
  } catch {
    data = { error: "parse_failed", raw: rawText.slice(0, 500) };
  }

  const fieldCount    = Object.keys(data).filter((k) => k !== "error").length;
  const expectedCount = EXPECTED_FIELDS[docType] ?? 4;
  const confidence    = "error" in data ? 0 : Math.min(fieldCount / expectedCount, 1.0);

  return { raw: data, confidence };
}

// ── Attestation modules — one per document category ────────────────────────

async function attestIncome(
  db: ServiceDb,
  clientId: string,
  docType: VaultDocType,
  data: Record<string, unknown>,
  now: string,
): Promise<void> {
  const income = Number(data.gross_monthly ?? data.gross_income) || null;
  if (!income) return;

  // Priority order: payslip > employment_letter > tax_return > bank_statement
  const PRIORITY: VaultDocType[] = ["payslip", "employment_letter", "tax_return", "bank_statement"];
  const newPriority = PRIORITY.indexOf(docType);

  const { data: snap } = await (db as any)
    .from("client_financial_snapshot")
    .select("income_verified, income_verified_source")
    .eq("client_id", clientId)
    .single() as { data: { income_verified: boolean; income_verified_source: string } | null };

  const existingPriority = snap?.income_verified
    ? PRIORITY.indexOf((snap.income_verified_source ?? "") as VaultDocType)
    : 999;

  if (newPriority > existingPriority) return; // existing source is higher priority

  await (db as any).from("client_dossier")
    .update({ monthly_income: income, updated_at: now })
    .eq("client_id", clientId);

  await (db as any).from("client_financial_snapshot")
    .update({
      monthly_income:         income,
      income_verified:        true,
      income_verified_at:     now,
      income_verified_source: docType,
      updated_at:              now,
    })
    .eq("client_id", clientId);
}

async function attestLiabilities(
  db: ServiceDb,
  clientId: string,
  docType: VaultDocType,
  data: Record<string, unknown>,
  now: string,
): Promise<void> {
  const outstanding = Number(data.outstanding_balance) || null;
  const monthly     = Number(data.monthly_repayment ?? data.minimum_payment) || null;
  const loanType    = (data.loan_type as string)
    ?? (docType === "credit_card_statement" ? "credit_card" : "other");

  if (!outstanding) return;

  await (db as any).from("client_loan_details").upsert(
    {
      client_id:          clientId,
      loan_type:          loanType,
      outstanding_amount: outstanding,
      monthly_repayment:  monthly,
      bank_name:          (data.lender_name as string) ?? null,
      created_at:         now,
    },
    { onConflict: "client_id,loan_type" },
  );

  // Recalculate totals from all loan rows
  const { data: loans } = await (db as any)
    .from("client_loan_details")
    .select("outstanding_amount, monthly_repayment")
    .eq("client_id", clientId) as { data: Array<{ outstanding_amount: string; monthly_repayment: string }> | null };

  if (!loans?.length) return;

  const totalMonthlyPx = loans.reduce((s, l) => s + (Number(l.monthly_repayment) || 0), 0);

  await (db as any).from("client_financial_snapshot")
    .update({
      monthly_loan_payments:    totalMonthlyPx,
      liabilities_verified:     true,
      liabilities_verified_at:  now,
      updated_at:               now,
    })
    .eq("client_id", clientId);
}

async function attestProperty(
  db: ServiceDb,
  clientId: string,
  docType: "valuation_report" | "title_deed",
  data: Record<string, unknown>,
  documentId: string,
  now: string,
): Promise<void> {
  const address = (data.property_address as string) ?? null;

  const propertyRow = {
    client_id:        clientId,
    address,
    land_area_sqm:    Number(data.land_area_sqm) || null,
    property_type:    (data.property_type as string) ?? null,
    updated_at:       now,
    ...(docType === "valuation_report" ? {
      valuation_doc_id: documentId,
      market_value:     Number(data.market_value) || null,
      valuation_date:   (data.valuation_date as string) ?? null,
      valuer_name:      (data.valuer_name as string) ?? null,
      verified:         true,
    } : {
      deed_document_id: documentId,
      registered_owner: (data.registered_owner as string) ?? null,
      deed_date:        (data.deed_date as string) ?? null,
      deed_ref:         (data.deed_ref as string) ?? null,
      is_mortgaged:     Boolean(data.is_mortgaged),
      mortgage_lender:  (data.mortgage_lender as string) ?? null,
    }),
  };

  await (db as any).from("client_vault_property")
    .upsert(propertyRow, { onConflict: "client_id,address" });

  // Only update snapshot total if we have a verified value (valuation report)
  if (docType !== "valuation_report") return;

  const { data: props } = await (db as any)
    .from("client_vault_property")
    .select("market_value")
    .eq("client_id", clientId)
    .eq("verified", true) as { data: Array<{ market_value: string }> | null };

  if (!props?.length) return;

  const totalPropertyValue = props.reduce((s, p) => s + (Number(p.market_value) || 0), 0);

  await (db as any).from("client_financial_snapshot")
    .update({
      property_value:       totalPropertyValue,
      property_verified:    true,
      property_verified_at: now,
      updated_at:            now,
    })
    .eq("client_id", clientId);
}

/**
 * Marriage certificate → couple verification.
 *
 * Couple-only scope for now: at extraction time, the uploader has at most
 * one pending couple_link (created automatically on invitation acceptance —
 * see accept_request_invitation). We locate that link and hand the
 * structured extracted names to submit_couple_relationship_document, which
 * does the actual name cross-match against both clients' verified
 * full_name and flips couple_link.status -> 'verified' on a match.
 */
async function attestCoupleRelationship(
  db: ServiceDb,
  clientId: string,
  documentId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const { data: pendingCouple } = await (db as any)
    .from("couple_link")
    .select("id")
    .or(`client_a_id.eq.${clientId},client_b_id.eq.${clientId}`)
    .eq("status", "pending_verification")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pendingCouple?.id) {
    console.warn(`[vault-extract] marriage_certificate uploaded by ${clientId} but no pending couple_link found`);
    return;
  }

  // Structured names, not a raw OCR blob — submit_couple_relationship_document
  // does a containment + trigram match against this text.
  const nameText = [data.party_1_full_name, data.party_2_full_name]
    .filter(Boolean)
    .join(" \n ");

  const { error } = await (db as any).rpc("submit_couple_relationship_document", {
    p_couple_link_id: pendingCouple.id,
    p_vault_document_id: documentId,
    p_uploader_client_id: clientId,
    p_extracted_text: nameText || "",
  });

  if (error) console.error("[vault-extract] submit_couple_relationship_document error:", error);
}

// ── Routing: which attestation path for each doc type ────────────────────

async function attest(
  db: ServiceDb,
  doc: VaultDocument,
  data: Record<string, unknown>,
  now: string,
): Promise<void> {
  const { client_id: clientId, doc_type: docType, id: documentId } = doc;

  switch (docType) {
    case "payslip":
    case "employment_letter":
    case "tax_return":
    case "bank_statement":
      await attestIncome(db, clientId, docType, data, now);
      break;

    case "loan_statement":
    case "credit_card_statement":
      await attestLiabilities(db, clientId, docType, data, now);
      break;

    case "valuation_report":
    case "title_deed":
      await attestProperty(db, clientId, docType as "valuation_report" | "title_deed", data, documentId, now);
      break;

    case "marriage_certificate":
      await attestCoupleRelationship(db, clientId, documentId, data);
      break;

    // Identity docs and others: extracted for record, no snapshot attestation needed
    default:
      break;
  }
}

// ── Helper: pluck doc_date / doc_ref / expires_at from extracted data ───────

function pluckMeta(data: Record<string, unknown>): {
  doc_date: string | null;
  doc_ref:  string | null;
  expires_at: string | null;
} {
  return {
    doc_date:   (data.pay_date ?? data.deed_date ?? data.valuation_date
                  ?? data.statement_date ?? data.letter_date ?? data.marriage_date ?? null) as string | null,
    doc_ref:    (data.deed_ref ?? data.policy_number ?? data.registration_number ?? null) as string | null,
    expires_at: (data.policy_expiry ?? data.expiry_date ?? null) as string | null,
  };
}

// ── Handler ─────────────────────────────────────────────────────────────────

// ── Named export for internal router ──────────────────────────────────────
export async function handle(body: unknown, res: any): Promise<void> {
  const { document_id } = (body ?? {}) as { document_id?: string };
  if (!document_id) return res.status(400).json({ error: "document_id required" });

  const db = getServiceDb();

  const { data: docRaw, error: docErr } = await (db as any)
    .from("client_vault_document")
    .select("id, client_id, doc_type, storage_path, mime_type")
    .eq("id", document_id)
    .single() as { data: VaultDocument | null; error: unknown };

  if (docErr || !docRaw) {
    return res.status(404).json({ error: "Document not found" });
  }

  const doc = docRaw;
  const now = new Date().toISOString();

  try {
    const { data: fileData, error: dlErr } = await (db as any).storage
      .from("documents")
      .download(doc.storage_path) as { data: Blob | null; error: { message: string } | null };

    if (dlErr || !fileData) throw new Error(`Storage download: ${dlErr?.message ?? "no data"}`);

    const buffer   = Buffer.from(await fileData.arrayBuffer());
    const base64   = buffer.toString("base64");
    const mimeType = doc.mime_type ?? "image/jpeg";

    const { raw, confidence } = await extractWithClaude(base64, mimeType, doc.doc_type);

    const hasError      = "error" in raw;
    const lowConfidence = confidence < 0.4;
    const status: ExtractStatus = hasError
      ? "failed"
      : lowConfidence ? "manual_review" : "extracted";

    const meta = pluckMeta(raw);

    await (db as any).from("client_vault_document").update({
      extract_status: status,
      extract_raw:    raw,
      confidence,
      extracted_at:   now,
      doc_date:       meta.doc_date,
      doc_ref:        meta.doc_ref,
      expires_at:     meta.expires_at,
      extract_error:  hasError ? String(raw.error) : null,
      updated_at:     now,
    }).eq("id", document_id);

    if (!hasError && !lowConfidence) {
      await attest(db, doc, raw, now);

      await (db as any).from("client_vault_document").update({
        extract_status: "attested" as ExtractStatus,
        attested_at:    now,
        updated_at:     now,
      }).eq("id", document_id);
    }

    await (db as any).from("client_vault_access_log").insert({
      document_id,
      client_id: doc.client_id,
      action:    "extract",
      actor_id:  null,
    });

    return res.status(200).json({
      ok:         true,
      status:     hasError || lowConfidence ? status : "attested",
      confidence,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vault-extract]", message);

    await (db as any).from("client_vault_document").update({
      extract_status: "failed" as ExtractStatus,
      extract_error:  message,
      updated_at:     now,
    }).eq("id", document_id);

    return res.status(500).json({ ok: false, error: message });
  }
}
