import { useEffect, useState } from "react"
import { supabase } from "@/shared/lib/supabase"

type RiskCategory = "Investment Grade" | "Speculative Grade" | "Distressed"

interface CreditRating {
  id: string
  client_id: string
  rating: string
  pd: number
  pd_percent: string
  risk_category: RiskCategory
  recommendation: string
  pillar_scores: Record<string, number>
  audit_trail: Array<{ factor: string; note: string; impact: string }>
  input_snapshot: Record<string, any>
  rated_at: string
  rating_version: string
  clients: {
    id: string
    full_name: string
    user_type: string
    kyc_status: string
  }
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
  const [ratings, setRatings] = useState<CreditRating[]>([])
  const [unratedClients, setUnratedClients] = useState<any[]>([])
  const [openAudit, setOpenAudit] = useState<string | null>(null)
  const [filterRisk, setFilterRisk] = useState("all")
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel("credit_ratings_watch")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "credit_ratings" }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchData() {
    // Fetch all credit ratings with client info
    const { data: ratingData } = await supabase
      .from("credit_ratings")
      .select("*, clients(id, full_name, user_type, kyc_status)")
      .order("rated_at", { ascending: false })

    // Fetch verified clients without a rating yet
    const ratedClientIds = (ratingData || []).map((r: any) => r.client_id)
    const { data: unrated } = await supabase
      .from("clients")
      .select("id, full_name, user_type, kyc_status")
      .eq("kyc_status", "verified")
      .not("id", "in", ratedClientIds.length ? `(${ratedClientIds.join(",")})` : "(null)")

    setRatings(ratingData || [])
    setUnratedClients(unrated || [])
    setLoading(false)
  }

  async function triggerRating(client_id: string) {
    setTriggering(client_id)
    await fetch("/api/rate-applicant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id }),
    })
    setTriggering(null)
    fetchData()
  }

  const filtered = ratings.filter(r =>
    filterRisk === "all" || r.risk_category === filterRisk
  )

  const summary = {
    total: ratings.length + unratedClients.length,
    ig: ratings.filter(r => r.risk_category === "Investment Grade").length,
    sg: ratings.filter(r => r.risk_category === "Speculative Grade").length,
    dist: ratings.filter(r => r.risk_category === "Distressed").length,
    pending: unratedClients.length,
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">Admin · Credit Rating</p>
          <h2 className="text-xl font-medium">Credit Ratings</h2>
        </div>
        <select className="text-sm border rounded px-3 py-1.5" value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
          <option value="all">All risk tiers</option>
          <option value="Investment Grade">Investment Grade</option>
          <option value="Speculative Grade">Speculative Grade</option>
          <option value="Distressed">Distressed</option>
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Total clients", value: summary.total, color: "" },
          { label: "Investment grade", value: summary.ig, color: "text-green-700" },
          { label: "Speculative", value: summary.sg, color: "text-amber-700" },
          { label: "Distressed", value: summary.dist, color: "text-red-700" },
          { label: "Not yet rated", value: summary.pending, color: "text-gray-400" },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-medium ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Unrated verified clients */}
      {unratedClients.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">KYC verified — awaiting rating</p>
          <div className="space-y-2">
            {unratedClients.map(c => (
              <div key={c.id} className="bg-white border border-dashed border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500">
                    {c.full_name?.split(" ").map((w: string) => w[0]).slice(0, 2).join("") || "?"}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{c.full_name}</p>
                    <p className="text-xs text-gray-400">{c.user_type} · KYC verified</p>
                  </div>
                </div>
                <button
                  className="text-xs bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700 disabled:opacity-50"
                  onClick={() => triggerRating(c.id)}
                  disabled={triggering === c.id}
                >
                  {triggering === c.id ? "Rating..." : "Run rating"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rated clients */}
      <div>
        {unratedClients.length > 0 && <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Rated</p>}
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-xs font-medium text-blue-700 shrink-0">
                    {r.clients?.full_name?.split(" ").map((w: string) => w[0]).slice(0, 2).join("") || "?"}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{r.clients?.full_name}</p>
                    <p className="text-xs text-gray-400">{r.clients?.user_type} · v{r.rating_version} · {timeAgo(r.rated_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${RISK_STYLES[r.risk_category]}`}>
                    {r.rating}
                  </span>
                  <span className="text-xs text-gray-400">PD {r.pd_percent}</span>
                  <button
                    className="text-xs border rounded px-2.5 py-1 hover:bg-gray-50"
                    onClick={() => setOpenAudit(openAudit === r.id ? null : r.id)}
                  >
                    Audit trail {openAudit === r.id ? "▲" : "▼"}
                  </button>
                  <button
                    className="text-xs text-gray-400 border rounded px-2.5 py-1 hover:bg-gray-50"
                    onClick={() => triggerRating(r.client_id)}
                    disabled={triggering === r.client_id}
                  >
                    Re-rate
                  </button>
                </div>
              </div>

              {/* Pillar scores */}
              {Object.keys(r.pillar_scores).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(r.pillar_scores).map(([k, v]) => (
                      <div key={k}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-gray-400">{k}</span>
                          <span className="text-xs font-medium">{v}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full">
                          <div className="h-1.5 rounded-full" style={{ width: `${v}%`, background: PILLAR_COLOR[r.risk_category] || "#888" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">{r.recommendation}</p>
                </div>
              )}

              {/* Audit trail */}
              {openAudit === r.id && (
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
                      {r.audit_trail.map((row, i) => (
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
    </div>
  )
}
