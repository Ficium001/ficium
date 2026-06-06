import { useEffect, useState } from "react"
import { supabase } from "@/core/supabase"

type RiskCategory = "Investment Grade" | "Speculative Grade" | "Distressed" | null

interface Applicant {
  id: string
  full_name: string
  business_type: string
  kyc_status: string
  credit_rating: string | null
  credit_pd: number | null
  credit_pd_percent: string | null
  credit_risk_category: RiskCategory
  credit_pillar_scores: Record<string, number> | null
  credit_audit_trail: Array<{ factor: string; note: string; impact: string }> | null
  credit_recommendation: string | null
  credit_rated_at: string | null
}

const RISK_STYLES: Record<string, string> = {
  "Investment Grade": "bg-green-50 text-green-800 border border-green-200",
  "Speculative Grade": "bg-amber-50 text-amber-800 border border-amber-200",
  "Distressed": "bg-red-50 text-red-800 border border-red-200",
}

const PILLAR_COLOR: Record<string, string> = {
  "Investment Grade": "#16a34a",
  "Speculative Grade": "#d97706",
  "Distressed": "#dc2626",
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 60) return `${diff}m ago`
  return `${Math.floor(diff / 60)}h ago`
}

export default function ApplicantRatings() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [openAudit, setOpenAudit] = useState<string | null>(null)
  const [filterRisk, setFilterRisk] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState<string | null>(null)

  useEffect(() => {
    fetchApplicants()
    const channel = supabase
      .channel("kyc_ratings")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "kyc_submissions" }, fetchApplicants)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchApplicants() {
    const { data } = await supabase
      .from("kyc_submissions")
      .select("id, full_name, business_type, kyc_status, credit_rating, credit_pd, credit_pd_percent, credit_risk_category, credit_pillar_scores, credit_audit_trail, credit_recommendation, credit_rated_at")
      .order("created_at", { ascending: false })
    setApplicants(data || [])
    setLoading(false)
  }

  async function triggerRating(applicant_id: string) {
    setTriggering(applicant_id)
    await fetch("/api/rate-applicant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicant_id }),
    })
    setTriggering(null)
    fetchApplicants()
  }

  const filtered = applicants.filter(a => {
    const riskMatch = filterRisk === "all" || a.credit_risk_category === filterRisk
    const statusMatch = filterStatus === "all" || (filterStatus === "rated" ? !!a.credit_rating : !a.credit_rating)
    return riskMatch && statusMatch
  })

  const rated = applicants.filter(a => a.credit_rating)
  const summary = {
    total: applicants.length,
    ig: rated.filter(a => a.credit_risk_category === "Investment Grade").length,
    sg: rated.filter(a => a.credit_risk_category === "Speculative Grade").length,
    dist: rated.filter(a => a.credit_risk_category === "Distressed").length,
    pending: applicants.filter(a => !a.credit_rating).length,
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">Admin · Credit Rating</p>
          <h2 className="text-xl font-medium">Applicant Ratings</h2>
        </div>
        <div className="flex gap-2">
          <select className="text-sm border rounded px-3 py-1.5" value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
            <option value="all">All risk tiers</option>
            <option value="Investment Grade">Investment Grade</option>
            <option value="Speculative Grade">Speculative Grade</option>
            <option value="Distressed">Distressed</option>
          </select>
          <select className="text-sm border rounded px-3 py-1.5" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="rated">Rated</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Total", value: summary.total, color: "" },
          { label: "Investment grade", value: summary.ig, color: "text-green-700" },
          { label: "Speculative", value: summary.sg, color: "text-amber-700" },
          { label: "Distressed", value: summary.dist, color: "text-red-700" },
          { label: "Pending", value: summary.pending, color: "text-gray-400" },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-medium ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(a => (
          <div key={a.id} className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-xs font-medium text-blue-700 shrink-0">
                  {a.full_name?.split(" ").map((w: string) => w[0]).slice(0, 2).join("") || "?"}
                </div>
                <div>
                  <p className="font-medium text-sm">{a.full_name}</p>
                  <p className="text-xs text-gray-400">{a.business_type} · KYC {a.kyc_status}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {a.credit_rating ? (
                  <>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${RISK_STYLES[a.credit_risk_category!] || ""}`}>
                      {a.credit_rating}
                    </span>
                    <span className="text-xs text-gray-400">PD {a.credit_pd_percent}</span>
                    <span className="text-xs text-gray-400">{timeAgo(a.credit_rated_at!)}</span>
                    <button
                      className="text-xs border rounded px-2.5 py-1 hover:bg-gray-50"
                      onClick={() => setOpenAudit(openAudit === a.id ? null : a.id)}
                    >
                      Audit trail {openAudit === a.id ? "▲" : "▼"}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-gray-400 border rounded px-2.5 py-1">Not rated</span>
                    {a.kyc_status === "complete" && (
                      <button
                        className="text-xs bg-blue-600 text-white rounded px-2.5 py-1 hover:bg-blue-700 disabled:opacity-50"
                        onClick={() => triggerRating(a.id)}
                        disabled={triggering === a.id}
                      >
                        {triggering === a.id ? "Rating..." : "Run rating"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {a.credit_pillar_scores && Object.keys(a.credit_pillar_scores).length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(a.credit_pillar_scores).map(([k, v]) => (
                    <div key={k}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-gray-400">{k}</span>
                        <span className="text-xs font-medium">{v}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-1.5 rounded-full" style={{ width: `${v}%`, background: PILLAR_COLOR[a.credit_risk_category!] || "#888" }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">{a.credit_recommendation}</p>
              </div>
            )}

            {openAudit === a.id && a.credit_audit_trail && (
              <div className="mt-4 pt-4 border-t border-gray-50">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b">
                      <th className="text-left py-1.5 font-medium">Factor</th>
                      <th className="text-left py-1.5 font-medium">Note</th>
                      <th className="text-right py-1.5 font-medium">Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.credit_audit_trail.map((row, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 font-medium">{row.factor}</td>
                        <td className="py-2 text-gray-500">{row.note}</td>
                        <td className={`py-2 text-right font-medium ${row.impact.startsWith("+") ? "text-green-700" : row.impact === "0" ? "text-gray-400" : "text-red-600"}`}>
                          {row.impact}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
