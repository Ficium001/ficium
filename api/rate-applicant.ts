import { createClient } from '@supabase/supabase-js'
import { requireService, asAuthError } from './_lib/auth'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RATING_ENGINE_URL = process.env.RATING_ENGINE_URL!

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end()

  // Internal/server-to-server only. No browser should reach this directly —
  // it uses the service-role key and bypasses RLS.
  try {
    requireService(req)
  } catch (e) {
    const ae = asAuthError(e)
    if (ae) return res.status(ae.status).json({ error: ae.message, code: ae.code })
    throw e
  }

  const { client_id } = req.body
  if (!client_id) return res.status(400).json({ error: 'client_id required' })

  // Fetch client + their financial profile
  const { data: client, error } = await supabase
    .from('clients')
    .select(`
      *,
      client_dossier (*),
      client_loan_details (*)
    `)
    .eq('id', client_id)
    .single()

  if (error || !client) return res.status(404).json({ error: 'Client not found' })

  // Only rate if KYC is complete
  if (client.kyc_status !== 'verified') {
    return res.status(400).json({ error: 'KYC must be verified before rating' })
  }

  const dossier = client.client_dossier?.[0] || {}
  const loan = client.client_loan_details?.[0] || {}

  const inputSnapshot = {
    type: client.user_type === 'business' ? 'sme' : 'individual',
    annual_income: dossier.annual_income,
    monthly_expenses: dossier.monthly_expenses,
    existing_debt: dossier.existing_debt,
    credit_history_years: dossier.credit_history_years,
    employment_status: dossier.employment_status,
    annual_revenue: dossier.annual_revenue,
    net_profit_margin: dossier.net_profit_margin,
    years_in_business: dossier.years_in_business,
    industry: dossier.industry,
    debt_service_coverage: dossier.debt_service_coverage,
    loan_amount_requested: loan.amount,
    loan_purpose: loan.purpose,
    collateral_value: loan.collateral_value,
  }

  // Call rating engine
  const ratingRes = await fetch(`${RATING_ENGINE_URL}/rate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.RATING_ENGINE_API_KEY!,
    },
    body: JSON.stringify({ client_id, ...inputSnapshot }),
  })

  if (!ratingRes.ok) return res.status(502).json({ error: 'Rating engine error' })

  const rating = await ratingRes.json() as {
    rating: string
    pd: number
    pd_percent: number
    risk_category: string
    recommendation: string
    pillar_scores: Record<string, number>
    audit_trail: unknown
  }

  // Store in credit_ratings table (separate from KYC)
  const { data: saved, error: saveError } = await supabase
    .from('credit_ratings')
    .insert({
      client_id,
      rating: rating.rating,
      pd: rating.pd,
      pd_percent: rating.pd_percent,
      risk_category: rating.risk_category,
      recommendation: rating.recommendation,
      pillar_scores: rating.pillar_scores,
      audit_trail: rating.audit_trail,
      input_snapshot: inputSnapshot,
      rated_at: new Date().toISOString(),
      rating_version: '1.0.0',
      rated_by: 'auto',
    })
    .select()
    .single()

  if (saveError) return res.status(500).json({ error: 'Failed to save rating' })

  return res.status(200).json(saved)
}
