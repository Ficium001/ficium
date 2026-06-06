import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RATING_ENGINE_URL = process.env.RATING_ENGINE_URL!

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end()

  const { applicant_id } = req.body
  if (!applicant_id) return res.status(400).json({ error: 'applicant_id required' })

  const { data: applicant, error } = await supabase
    .from('kyc_submissions')
    .select('*')
    .eq('id', applicant_id)
    .single()

  if (error || !applicant) return res.status(404).json({ error: 'Applicant not found' })

  const ratingPayload = {
    applicant_id,
    type: applicant.business_type === 'sme' ? 'sme' : 'individual',
    annual_income: applicant.annual_income,
    monthly_expenses: applicant.monthly_expenses,
    existing_debt: applicant.existing_debt,
    credit_history_years: applicant.credit_history_years,
    employment_status: applicant.employment_status,
    annual_revenue: applicant.annual_revenue,
    net_profit_margin: applicant.net_profit_margin,
    years_in_business: applicant.years_in_business,
    industry: applicant.industry,
    debt_service_coverage: applicant.debt_service_coverage,
    loan_amount_requested: applicant.loan_amount,
    loan_purpose: applicant.loan_purpose,
    collateral_value: applicant.collateral_value,
  }

  const ratingRes = await fetch(`${RATING_ENGINE_URL}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ratingPayload),
  })

  if (!ratingRes.ok) return res.status(502).json({ error: 'Rating engine error' })

  const rating = await ratingRes.json()

  await supabase
    .from('kyc_submissions')
    .update({
      credit_rating: rating.rating,
      credit_pd: rating.pd,
      credit_pd_percent: rating.pd_percent,
      credit_risk_category: rating.risk_category,
      credit_pillar_scores: rating.pillar_scores,
      credit_audit_trail: rating.audit_trail,
      credit_recommendation: rating.recommendation,
      credit_rated_at: new Date().toISOString(),
    })
    .eq('id', applicant_id)

  return res.status(200).json(rating)
}
