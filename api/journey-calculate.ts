/**
 * api/journey-calculate.ts
 * POST /api/journey-calculate
 * Calculates real affordability metrics for a journey using Claude
 * with the user's actual financial profile injected.
 */
import Anthropic    from "@anthropic-ai/sdk";
import { Env }      from "./_lib/env.js";
import { Response } from "./_lib/response.js";
import { getServiceDb } from "./_lib/db.js";

export const config = { runtime: "nodejs" };

type Body = {
  userId:    string;
  type:      string;
  answers:   Record<string, unknown>;
};

export default async function handler(req: any, res: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (req.method !== "POST") return Response.methodNotAllowed(res, ["POST"]);

  const apiKey = Env.anthropicApiKey();
  if (!apiKey) return Response.error(res, "AI not configured", 503, "NO_API_KEY");

  const { userId, type, answers } = req.body as Body;
  if (!userId || !type || !answers) {
    return Response.error(res, "userId, type, answers required", 400, "INVALID_BODY");
  }

  // Fetch real user profile
  let profileContext = "Profile: not available.";
  try {
    const db = getServiceDb();
    const { data: p } = await db
      .from("client_profile_view")
      .select("monthly_income,total_assets,total_liabilities,net_worth,health_score,debt_to_income_ratio,employment_status,has_existing_loans,affordability_score,monthly_expenses,monthly_loan_payments")
      .eq("user_id", userId)
      .maybeSingle();

    if (p) {
      const fmt = (n: number | null) => n ? `MUR ${Number(n).toLocaleString()}` : "0";
      profileContext = [
        `Monthly income: ${fmt(p.monthly_income)}`,
        `Monthly expenses: ${fmt(p.monthly_expenses)}`,
        `Monthly loan payments: ${fmt(p.monthly_loan_payments)}`,
        `Total assets: ${fmt(p.total_assets)}`,
        `Total liabilities: ${fmt(p.total_liabilities)}`,
        `Net worth: ${fmt(p.net_worth)}`,
        `Debt-to-income: ${p.debt_to_income_ratio ?? 0}%`,
        `Health score: ${p.health_score ?? "unknown"}`,
        `Employment: ${p.employment_status ?? "unknown"}`,
        `Has existing loans: ${p.has_existing_loans ? "yes" : "no"}`,
      ].join(", ");
    }
  } catch { /* degrade */ }

  const prompt = `You are a Mauritius financial analyst. Calculate precise affordability metrics.

User's real financial profile: ${profileContext}

Journey type: ${type}
User's answers: ${JSON.stringify(answers, null, 2)}

Mauritius banking context:
- Mortgage rates: typically 4.5-7% APR, max 25-year term, 70-80% LTV
- Vehicle loans: typically 7-10% APR, max 7 years
- Personal loans: typically 8-14% APR, max 7 years
- Banks prefer debt-to-income ratio below 40%
- Monthly loan repayment should not exceed 40% of net monthly income
- Standard deposit requirement: 10-20% for mortgages, 10-20% for vehicles

Calculate and return ONLY a JSON object (no markdown, no explanation):
{
  "affordability": <0-100, based on income vs required repayment>,
  "eligibility": <0-100, based on profile completeness, health score, DTI>,
  "monthlyRepayment": <estimated MUR monthly payment, null if not applicable>,
  "depositGap": <MUR shortfall from recommended deposit, null if not applicable>,
  "fundingGap": <MUR total funding needed minus savings, null if not applicable>,
  "projectedValue": <MUR projected value at end of horizon for investments, null if not applicable>,
  "banksMatched": <realistic 1-6 based on eligibility score>,
  "summary": "<one specific sentence using real numbers from their profile>",
  "actionPlan": [
    "<specific step 1 with numbers>",
    "<specific step 2 with numbers>",
    "<specific step 3 with numbers>"
  ],
  "warnings": ["<any red flags based on their real profile, empty array if none>"]
}`;

  try {
    const anthropic  = new Anthropic({ apiKey });
    const completion = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 600,
      messages:   [{ role: "user", content: prompt }],
    });

    const text  = completion.content.map((c) => c.type === "text" ? c.text : "").join("").trim();
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) return Response.error(res, "Invalid AI response", 500, "AI_PARSE_ERROR");

    const result = JSON.parse(match[0]);
    return Response.ok(res, result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "AI error";
    return Response.error(res, msg, 503, "AI_ERROR");
  }
}
