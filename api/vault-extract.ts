/**
 * api/vault-extract.ts
 *
 * Called by vault_extract.dispatch() via pg_net immediately after a
 * client_vault_document is inserted. Downloads the file from Supabase
 * Storage, sends it to Claude Vision for structured extraction, writes
 * the results back to the DB, and updates client_financial_snapshot.
 *
 * Auth: X-Service-Secret header (same shared secret as marketplace sync).
 * Never called directly by the client — only by the DB trigger.
 */

import { createClient } from "@supabase/supabase-js";
import { Env } from "./_lib/env.js";

const DOC_TYPE_PROMPTS: Record<string, string> = {
  payslip: `Extract from this payslip:
- employer_name (string)
- employee_name (string)
- gross_monthly (number, MUR)
- net_monthly (number, MUR)
- pay_period (string, e.g. "June 2026")
- pay_date (string, ISO date)
- employment_type (string: "permanent" | "contract" | "part_time")
Return ONLY valid JSON. If a field is not visible, omit it.`,

  employment_letter: `Extract from this employment letter:
- employer_name (string)
- employee_name (string)
- position (string)
- gross_monthly (number, MUR)
- employment_type (string: "permanent" | "contract")
- start_date (ISO date)
- letter_date (ISO date)
Return ONLY valid JSON. If a field is not visible, omit it.`,

  bank_statement: `Extract from this bank statement:
- bank_name (string)
- account_holder (string)
- statement_period_from (ISO date)
- statement_period_to (ISO date)
- opening_balance (number)
- closing_balance (number)
- total_credits (number)
- total_debits (number)
- average_monthly_credit (number, estimate if multi-month)
- currency (string, default "MUR")
Return ONLY valid JSON. If a field is not visible, omit it.`,

  loan_statement: `Extract from this loan statement:
- lender_name (string)
- borrower_name (string)
- loan_type (string: "personal_loan" | "mortgage" | "vehicle_loan" | "credit_card" | "overdraft" | "other")
- outstanding_balance (number, MUR)
- monthly_repayment (number, MUR)
- remaining_months (number)
- interest_rate (number, percentage)
- statement_date (ISO date)
Return ONLY valid JSON. If a field is not visible, omit it.`,

  credit_card_statement: `Extract from this credit card statement:
- lender_name (string)
- cardholder_name (string)
- outstanding_balance (number, MUR)
- minimum_payment (number, MUR)
- credit_limit (number, MUR)
- statement_date (ISO date)
Return ONLY valid JSON. If a field is not visible, omit it.`,

  title_deed: `Extract from this Mauritius title deed / acte de vente:
- registered_owner (string, as on deed)
- property_address (string)
- land_area_sqm (number, convert toises/arpents to sqm if needed: 1 toise = 3.8m², 1 arpent = 4047m²)
- property_type (string: "land" | "apartment" | "villa" | "commercial" | "other")
- deed_date (ISO date)
- deed_ref (string, Registrar General reference number)
- is_mortgaged (boolean)
- mortgage_lender (string, if mortgaged)
Return ONLY valid JSON. If a field is not visible, omit it.`,

  valuation_report: `Extract from this property valuation report:
- property_address (string)
- market_value (number, MUR)
- valuation_date (ISO date)
- valuer_name (string)
- property_type (string)
- land_area_sqm (number)
Return ONLY valid JSON. If a field is not visible, omit it.`,

  tax_return: `Extract from this tax return:
- taxpayer_name (string)
- tax_year (string, e.g. "2024/2025")
- gross_income (number, MUR)
- net_taxable_income (number, MUR)
- tax_paid (number, MUR)
Return ONLY valid JSON. If a field is not visible, omit it.`,

  insurance_policy: `Extract from this insurance policy:
- insurer_name (string)
- policy_holder (string)
- policy_type (string: "life" | "property" | "vehicle" | "health" | "other")
- sum_insured (number, MUR)
- premium_monthly (number, MUR)
- policy_start (ISO date)
- policy_expiry (ISO date)
- property_address (string, if property insurance)
Return ONLY valid JSON. If a field is not visible, omit it.`,
};

const DEFAULT_PROMPT = `Extract all structured financial data from this document.
Return ONLY valid JSON with snake_case keys and numeric values for all amounts.
If you cannot extract meaningful data, return {"error": "unable_to_extract"}.`;

// ---------------------------------------------------------------------------
// Attestation: write extracted data back into financial snapshot
// ---------------------------------------------------------------------------
async function attest(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  docType: string,
  data: Record<string, unknown>,
  documentId: string,
): Promise<void> {
  const now = new Date().toISOString();

  if (docType === "payslip" || docType === "employment_letter") {
    const income = Number(data.gross_monthly) || null;
    if (!income) return;

    // Update dossier monthly_income with verified figure
    await supabase.from("client_dossier").upsert(
      { client_id: clientId, monthly_income: income, updated_at: now },
      { onConflict: "client_id" }
    );

    // Update snapshot income + mark verified
    await supabase.from("client_financial_snapshot")
      .update({
        monthly_income:        income,
        income_verified:       true,
        income_verified_at:    now,
        income_verified_source: docType,
        updated_at:            now,
      })
      .eq("client_id", clientId);
  }

  if (docType === "bank_statement") {
    const income = Number(data.average_monthly_credit) || null;
    if (!income) return;
    // Only override if higher confidence income signal not already verified
    const { data: snap } = await supabase
      .from("client_financial_snapshot")
      .select("income_verified, income_verified_source")
      .eq("client_id", clientId)
      .single();
    const higherPriority = ["payslip", "employment_letter", "tax_return"];
    if (!snap?.income_verified || !higherPriority.includes(snap?.income_verified_source ?? "")) {
      await supabase.from("client_financial_snapshot")
        .update({
          monthly_income:        income,
          income_verified:       true,
          income_verified_at:    now,
          income_verified_source: "bank_statement",
          updated_at:            now,
        })
        .eq("client_id", clientId);
    }
  }

  if (docType === "loan_statement" || docType === "credit_card_statement") {
    const outstanding = Number(data.outstanding_balance) || null;
    const monthly     = Number(data.monthly_repayment ?? data.minimum_payment) || null;
    const loanType    = (data.loan_type as string) ?? (docType === "credit_card_statement" ? "credit_card" : "other");
    if (!outstanding) return;

    // Upsert into client_loan_details
    await supabase.from("client_loan_details").upsert(
      {
        client_id:          clientId,
        loan_type:          loanType,
        outstanding_amount: outstanding,
        monthly_repayment:  monthly,
        bank_name:          (data.lender_name as string) ?? null,
        created_at:         now,
      },
      { onConflict: "client_id,loan_type" }  // one row per loan type
    );

    // Recalculate total liabilities on snapshot
    const { data: loans } = await supabase
      .from("client_loan_details")
      .select("outstanding_amount, monthly_repayment")
      .eq("client_id", clientId);

    if (loans?.length) {
      const totalLiabilities = loans.reduce((s, l) => s + Number(l.outstanding_amount ?? 0), 0);
      const totalMonthlyPx   = loans.reduce((s, l) => s + Number(l.monthly_repayment ?? 0), 0);
      await supabase.from("client_financial_snapshot")
        .update({
          monthly_loan_payments:    totalMonthlyPx,
          liabilities_verified:     true,
          liabilities_verified_at:  now,
          updated_at:               now,
        })
        .eq("client_id", clientId);
    }
  }

  if (docType === "valuation_report") {
    const value = Number(data.market_value) || null;
    if (!value) return;

    // Upsert into client_vault_property matched by address
    await supabase.from("client_vault_property").upsert(
      {
        client_id:       clientId,
        valuation_doc_id: documentId,
        address:         (data.property_address as string) ?? null,
        market_value:    value,
        valuation_date:  (data.valuation_date as string) ?? null,
        valuer_name:     (data.valuer_name as string) ?? null,
        property_type:   (data.property_type as string) ?? null,
        land_area_sqm:   Number(data.land_area_sqm) || null,
        verified:        true,
        updated_at:      now,
      },
      { onConflict: "client_id,address" }
    );

    // Recalculate total property value on snapshot
    const { data: props } = await supabase
      .from("client_vault_property")
      .select("market_value")
      .eq("client_id", clientId)
      .eq("verified", true);

    if (props?.length) {
      const totalPropertyValue = props.reduce((s, p) => s + Number(p.market_value ?? 0), 0);
      await supabase.from("client_financial_snapshot")
        .update({
          property_value:         totalPropertyValue,
          property_verified:      true,
          property_verified_at:   now,
          updated_at:             now,
        })
        .eq("client_id", clientId);
    }
  }

  if (docType === "title_deed") {
    // Upsert property record — value filled later by valuation report
    await supabase.from("client_vault_property").upsert(
      {
        client_id:        clientId,
        deed_document_id: documentId,
        address:          (data.property_address as string) ?? null,
        registered_owner: (data.registered_owner as string) ?? null,
        land_area_sqm:    Number(data.land_area_sqm) || null,
        property_type:    (data.property_type as string) ?? null,
        deed_date:        (data.deed_date as string) ?? null,
        deed_ref:         (data.deed_ref as string) ?? null,
        is_mortgaged:     Boolean(data.is_mortgaged),
        mortgage_lender:  (data.mortgage_lender as string) ?? null,
        updated_at:       now,
      },
      { onConflict: "client_id,address" }
    );
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const secret = req.headers["x-service-secret"] ?? "";
  if (secret !== Env.appServiceSecret()) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { document_id } = req.body ?? {};
  if (!document_id) return res.status(400).json({ error: "document_id required" });

  const supabase = createClient(Env.supabaseUrl(), Env.supabaseServiceKey());

  // Fetch document record
  const { data: doc, error: docErr } = await supabase
    .from("client_vault_document")
    .select("id, client_id, doc_type, storage_path, mime_type")
    .eq("id", document_id)
    .single();

  if (docErr || !doc) {
    return res.status(404).json({ error: "Document not found" });
  }

  try {
    // Download file from Storage
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("documents")
      .download(doc.storage_path);

    if (dlErr || !fileData) throw new Error(`Storage download failed: ${dlErr?.message}`);

    // Convert to base64
    const buffer   = Buffer.from(await fileData.arrayBuffer());
    const base64   = buffer.toString("base64");
    const mimeType = doc.mime_type ?? "image/jpeg";
    const isPdf    = mimeType === "application/pdf";

    // Build Claude Vision request
    const prompt = DOC_TYPE_PROMPTS[doc.doc_type] ?? DEFAULT_PROMPT;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
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
              ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
              : { type: "image",    source: { type: "base64", media_type: mimeType,           data: base64 } },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      throw new Error(`Claude API error ${anthropicRes.status}: ${err}`);
    }

    const aiResponse = await anthropicRes.json() as { content: Array<{ type: string; text?: string }> };
    const rawText    = aiResponse.content.find((b) => b.type === "text")?.text ?? "{}";

    // Parse JSON from Claude output
    let extracted: Record<string, unknown> = {};
    let confidence = 0.5;
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      extracted  = JSON.parse(cleaned);
      // Estimate confidence: more fields extracted = higher confidence
      const fieldCount = Object.keys(extracted).filter(k => k !== "error").length;
      const expectedFields = (DOC_TYPE_PROMPTS[doc.doc_type] ?? "").split("\n").filter(l => l.includes("(")).length;
      confidence = expectedFields > 0 ? Math.min(fieldCount / expectedFields, 1.0) : 0.5;
    } catch {
      confidence = 0.1;
    }

    const hasError    = "error" in extracted;
    const lowConfidence = confidence < 0.4;
    const newStatus   = hasError ? "failed" : lowConfidence ? "manual_review" : "extracted";

    // Write extraction results back
    await supabase.from("client_vault_document").update({
      extract_status: newStatus,
      extract_raw:    extracted,
      confidence,
      extracted_at:   new Date().toISOString(),
      doc_date:       (extracted.pay_date ?? extracted.deed_date ?? extracted.valuation_date ?? extracted.statement_date ?? null) as string | null,
      doc_ref:        (extracted.deed_ref ?? extracted.policy_number ?? null) as string | null,
      expires_at:     (extracted.policy_expiry ?? null) as string | null,
      updated_at:     new Date().toISOString(),
    }).eq("id", document_id);

    // Attest into financial snapshot if confident enough
    if (!hasError && !lowConfidence) {
      await attest(supabase, doc.client_id, doc.doc_type, extracted, document_id);

      await supabase.from("client_vault_document").update({
        extract_status: "attested",
        attested_at:    new Date().toISOString(),
        updated_at:     new Date().toISOString(),
      }).eq("id", document_id);
    }

    // Audit log
    await supabase.from("client_vault_access_log").insert({
      document_id,
      client_id: doc.client_id,
      action:    "extract",
      actor_id:  null,
    });

    return res.status(200).json({ ok: true, status: newStatus, confidence });

  } catch (err) {
    const message = (err as Error).message ?? "Unknown error";
    await supabase.from("client_vault_document").update({
      extract_status: "failed",
      extract_error:  message,
      updated_at:     new Date().toISOString(),
    }).eq("id", document_id);

    console.error("[vault-extract]", message);
    return res.status(500).json({ ok: false, error: message });
  }
}
