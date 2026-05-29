
// =============================================================
// Ficium 3 — Institution Bids
// Full bid history with status filter, withdraw action,
// and bid detail expand. All withdrawals go through
// maker-checker (pending_actions).
// =============================================================
import { useState } from "react";
import {
  FileText, Filter, CheckCircle,
  XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, X,
} from "lucide-react";
import { useMyBids, useMyInstitution, useSubmitBid } from "../../hooks/useInstitution";
import { formatDistanceToNow, formatRate, formatAmount } from "../../lib/utils";
import type { InstitutionBid } from "../../types/institution";

const STATUS_FILTERS = [
  { key: "all",       label: "All bids"  },
  { key: "submitted", label: "Active"    },
  { key: "accepted",  label: "Accepted"  },
  { key: "rejected",  label: "Rejected"  },
  { key: "expired",   label: "Expired"   },
  { key: "withdrawn", label: "Withdrawn" },
];

export default function InstitutionBids() {
  const { data: institution }      = useMyInstitution();
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: bids = [], isLoading } = useMyBids(
    statusFilter === "all" ? undefined : statusFilter
  );
  const submitBid   = useSubmitBid();
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [withdrawNote, setWithdrawNote] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const modules = institution?.modules ?? [];

  const handleWithdraw = async (bidId: string) => {
    if (!withdrawNote.trim()) return;
    await submitBid.mutateAsync({
      request_id:     bids.find(b => b.id === bidId)?.request_id ?? "",
      rate:           0,
      rate_type:      "fixed",
      amount_offered: 0,
      term_months:    0,
      conditions:     { withdraw_reason: withdrawNote },
      submitted_via:  "portal",
    });
    setWithdrawId(null);
    setWithdrawNote("");
    setWithdrawSuccess(true);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      submitted: "bg-[#0c1a2e] text-blue-400 border-[#1e3a5f]",
      accepted:  "bg-[#052e16] text-green-400 border-[#166534]",
      rejected:  "bg-[#1c0000] text-red-400 border-red-900",
      expired:   "bg-[#1c1208] text-amber-400 border-amber-900",
      withdrawn: "bg-[#111] text-slate-500 border-[#222]",
      draft:     "bg-[#111] text-slate-600 border-[#222]",
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${map[status] ?? map.draft}`}>
        {status}
      </span>
    );
  };

  // Summary stats
  const all       = bids.length;
  const active    = bids.filter(b => b.status === "submitted").length;
  const accepted  = bids.filter(b => b.status === "accepted").length;
  const winRate   = all > 0 ? Math.round((accepted / all) * 100) : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-slate-100 tracking-wide">My bids</h1>
          <p className="text-[11px] text-slate-600 mt-0.5 font-mono">
            {bids.length} bid{bids.length !== 1 ? "s" : ""} · win rate {winRate}%
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total bids",   value: all,      color: "text-blue-400",   bg: "bg-[#0c1a2e]" },
          { label: "Active",       value: active,   color: "text-purple-400", bg: "bg-[#120c2e]" },
          { label: "Accepted",     value: accepted, color: "text-green-400",  bg: "bg-[#052e16]" },
          { label: "Win rate",     value: `${winRate}%`, color: "text-amber-400", bg: "bg-[#1c1208]" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-[#141b27] rounded-xl p-5`}>
            <div className={`text-3xl font-bold ${s.color} tracking-tight mb-1`}>{s.value}</div>
            <div className="text-[10px] text-slate-600 uppercase tracking-widest">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Withdraw success */}
      {withdrawSuccess && (
        <div className="bg-[#052e16] border border-[#166534] rounded-lg px-4 py-3 flex items-center justify-between mb-5">
          <p className="text-[11px] text-green-400">✓ Withdrawal submitted for maker-checker approval.</p>
          <button onClick={() => setWithdrawSuccess(false)}><X className="w-3.5 h-3.5 text-green-700" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-slate-600" />
        {STATUS_FILTERS.map(f => (
          <button key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
              statusFilter === f.key
                ? "bg-[#0f1929] border-blue-500 text-blue-400"
                : "border-[#1e2d3d] text-slate-500 hover:text-slate-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Bids list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : bids.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-10 h-10 text-slate-800 mx-auto mb-3" />
          <p className="text-slate-600 text-sm">No bids found</p>
          {statusFilter !== "all" && (
            <button onClick={() => setStatusFilter("all")} className="text-[11px] text-blue-500 mt-2 hover:text-blue-400">
              Clear filter
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#0b0f18] border border-[#141b27] rounded-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["Product","Amount offered","Rate","Term","Via","Status","Submitted",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[9px] font-bold text-slate-700 uppercase tracking-widest border-b border-[#141b27] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bids.map(bid => {
                const isOpen = expanded === bid.id;
                return (
                  <>
                    <tr key={bid.id} className="border-b border-[#0d1420] hover:bg-[#0d1420] transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-[11px] font-semibold text-slate-300">{bid.product_label ?? bid.product_type}</div>
                        <div className="text-[9px] text-slate-600 font-mono mt-0.5">{bid.id.slice(0,8)}…</div>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-300 font-mono">{formatAmount(bid.amount_offered, bid.currency ?? "MUR")}</td>
                      <td className="px-4 py-3 text-[11px] text-green-400 font-mono font-bold">{formatRate(bid.rate)}</td>
                      <td className="px-4 py-3 text-[11px] text-slate-400 font-mono">{bid.term_months}m</td>
                      <td className="px-4 py-3">
                        <span className="text-[9px] text-slate-600 bg-[#070a0f] px-2 py-0.5 rounded font-mono">{bid.submitted_via}</span>
                      </td>
                      <td className="px-4 py-3">{statusBadge(bid.status)}</td>
                      <td className="px-4 py-3 text-[10px] text-slate-600 font-mono whitespace-nowrap">
                        {formatDistanceToNow(bid.submitted_at)} ago
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpanded(isOpen ? null : bid.id)}
                          className="text-slate-600 hover:text-slate-300 transition-colors"
                        >
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${bid.id}-detail`} className="bg-[#070a0f]">
                        <td colSpan={8} className="px-4 py-4">
                          <BidDetail
                            bid={bid}
                            canWithdraw={bid.status === "submitted" && modules.includes("marketplace")}
                            onWithdraw={() => setWithdrawId(bid.id)}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Withdraw modal */}
      {withdrawId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setWithdrawId(null)}>
          <div className="bg-[#0b0f18] border border-[#1e2d3d] rounded-xl w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-[13px] font-bold text-slate-100 mb-4">Withdraw bid</h2>
            <p className="text-[11px] text-slate-500 mb-4">
              This will submit a withdrawal request for maker-checker approval. Provide a reason below.
            </p>
            <textarea
              value={withdrawNote}
              onChange={e => setWithdrawNote(e.target.value)}
              rows={3}
              placeholder="Reason for withdrawal (required)..."
              className="w-full bg-[#070a0f] border border-[#1e2d3d] text-slate-200 rounded-lg px-3 py-2 text-[11px] font-mono focus:border-amber-500 outline-none resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => handleWithdraw(withdrawId)}
                disabled={!withdrawNote.trim() || submitBid.isPending}
                className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-[11px] font-bold py-2 rounded-lg transition-colors"
              >
                {submitBid.isPending ? "Submitting..." : "Submit withdrawal"}
              </button>
              <button
                onClick={() => { setWithdrawId(null); setWithdrawNote(""); }}
                className="px-4 text-[11px] text-slate-500 border border-[#1e2d3d] rounded-lg hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BidDetail({ bid, canWithdraw, onWithdraw }: {
  bid: InstitutionBid; canWithdraw: boolean; onWithdraw: () => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="space-y-2">
        <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-2">Bid details</div>
        {[
          ["Request ID",   bid.request_id?.slice(0,12) + "…"],
          ["Rate type",    bid.rate_type],
          ["Response time", bid.response_time_ms ? `${bid.response_time_ms}ms` : "—"],
          ["Expires",      bid.expires_at ? formatDistanceToNow(bid.expires_at) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between text-[10px]">
            <span className="text-slate-600">{k}</span>
            <span className="text-slate-400 font-mono">{v}</span>
          </div>
        ))}
      </div>
      <div>
        <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-2">Conditions</div>
        {bid.conditions ? (
          <pre className="text-[10px] text-slate-400 font-mono bg-[#0b0f18] rounded-lg p-2 overflow-auto max-h-24">
            {JSON.stringify(bid.conditions, null, 2)}
          </pre>
        ) : (
          <span className="text-[10px] text-slate-700">No conditions attached</span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-2">Actions</div>
        {canWithdraw && (
          <button
            onClick={onWithdraw}
            className="flex items-center gap-2 bg-[#1c1208] text-amber-400 border border-amber-900 text-[10px] font-bold px-3 py-2 rounded-lg hover:bg-amber-950 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" /> Withdraw bid
          </button>
        )}
        {bid.status === "accepted" && (
          <div className="flex items-center gap-2 text-[10px] text-green-400">
            <CheckCircle className="w-3.5 h-3.5" /> Bid accepted by client
          </div>
        )}
        {bid.status === "expired" && (
          <div className="flex items-center gap-2 text-[10px] text-amber-400">
            <Clock className="w-3.5 h-3.5" /> Bid expired
          </div>
        )}
        {bid.status === "rejected" && (
          <div className="flex items-center gap-2 text-[10px] text-red-400">
            <AlertTriangle className="w-3.5 h-3.5" /> Client chose another offer
          </div>
        )}
      </div>
    </div>
  );
}
