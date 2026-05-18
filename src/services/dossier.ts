import { supabase } from "../lib/supabase";

/* ---------- Types ---------- */

export type DossierInput = {
  employmentStatus: string;
  monthlyIncome: number;
  totalAssets: number;
  existingLoans: "none" | "1" | "2-3" | "4+";
  creditHistory: "clean" | "mostly_clean" | "some_defaults" | "significant_issues";
  addressLine1: string;
  addressLine2?: string;
  city: string;
  country: string;
  postalCode?: string;
};

export type DossierResult =
  | { ok: true; healthScore: number }
  | { ok: false; error: string };

/* ---------- Health score ---------- */

/**
 * Compute a 0-100 financial health score from the dossier inputs.
 * Transparent for v1 — banks don't see the formula, but the client gets
 * an immediate signal of profile strength. Will move server-side later
 * once banks start using it for bid ranking.
 */
export function computeHealthScore(d: DossierInput): number {
  let score = 50; // baseline

  // Income: rough Mauritius brackets in MUR/month
  if (d.monthlyIncome >= 100000) score += 20;
  else if (d.monthlyIncome >= 50000) score += 12;
  else if (d.monthlyIncome >= 25000) score += 6;

  // Assets relative to income (months of buffer)
  if (d.monthlyIncome > 0) {
    const months = d.totalAssets / d.monthlyIncome;
    if (months >= 24) score += 12;
    else if (months >= 12) score += 7;
    else if (months >= 6) score += 3;
  }

  // Existing loan load
  const loanPenalty: Record<DossierInput["existingLoans"], number> = {
    none: 0,
    "1": -4,
    "2-3": -10,
    "4+": -18,
  };
  score += loanPenalty[d.existingLoans];

  // Credit history weight
  const creditDelta: Record<DossierInput["creditHistory"], number> = {
    clean: 12,
    mostly_clean: 6,
    some_defaults: -8,
    significant_issues: -20,
  };
  score += creditDelta[d.creditHistory];

  return Math.max(0, Math.min(100, Math.round(score)));
}

/* ---------- Submit dossier ---------- */

export async function submitDossier(input: DossierInput): Promise<DossierResult> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return { ok: false, error: "Not signed in." };

  const healthScore = computeHealthScore(input);

  // Upsert because the user might submit dossier multiple times (edit profile later).
  const { error } = await supabase
    .from("client_dossiers")
    .upsert(
      {
        user_id: userId,
        employment_status: input.employmentStatus,
        monthly_income: input.monthlyIncome,
        total_assets: input.totalAssets,
        existing_loans: input.existingLoans,
        credit_history: input.creditHistory,
        address_line_1: input.addressLine1,
        address_line_2: input.addressLine2 || null,
        city: input.city,
        country: input.country,
        postal_code: input.postalCode || null,
        health_score: healthScore,
      },
      { onConflict: "user_id" }
    );

  if (error) return { ok: false, error: error.message };

  return { ok: true, healthScore };
}