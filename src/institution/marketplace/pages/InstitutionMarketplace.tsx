// =============================================================
// Ficium 3 — Institution Marketplace
// - Bid button always shown (not gated on modules)
// - Card click opens full request detail drawer
// - Anonymous client profile in drawer (marker/checker/admin)
// - Date displayed on every card
// =============================================================
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Zap, Filter, Clock, X, AlertTriangle, Calendar,
  User, FileText, TrendingUp, DollarSign, MessageSquare, Download,
  BarChart2,
} from "lucide-react";
import {
  useMarketplace, useProducts, useSubmitBid, useMyInstitution,
} from "../../hooks/useInstitution";
import institutionSupabase from "../../lib/institutionSupabase";
import RequestChat from "../../../shared/components/RequestChat";
import { formatDistanceToNow } from "../../lib/utils";
import type { MarketplaceRequest } from "../../types/institution";
import { useIntelligence } from "../../../lib/intelligence";

const bidSchema = z.object({
  rate:           z.number().min(0.001).max(1),
  rate_type:      z.enum(["fixed", "variable"]),
  amount_offered: z.number().positive(),
  term_months:    z.number().int().positive(),
  notes:          z.string().optional(),
});
type BidForm = z.infer<typeof bidSchema>;

export default function InstitutionMarketplace() {
  const { data: institution }                       = useMyInstitution();
  const { data: requests = [], isLoading, refetch } = useMarketplace();
  const { data: products  = [] }                    = useProducts();
  const submitBid                                   = useSubmitBid();
  const { intel }                                   = useIntelligence();

  const [productFilter, setProductFilter]       = useState("all");
  const [detailRequest, setDetailRequest]       = useState<MarketplaceRequest | null>(null);
  const [biddingRequest, setBiddingRequest]     = useState<MarketplaceRequest | null>(null);
  const [bidSuccess, setBidSuccess]             = useState<string | null>(null);

  const filtered     = requests.filter(r => productFilter === "all" || r.product_type === productFilter);
  const productTypes = Array.from(new Set(requests.map(r => r.product_type)));

  const canBid = !!institution;

  const handleBidSubmit = async (data: BidForm) => {
    if (!biddingRequest) return;
    try {
      const id = await submitBid.mutateAsync({
        request_id:     biddingRequest.id,
        rate:           data.rate,
        rate_type:      data.rate_type,
        amount_offered: data.amount_offered,
        term_months:    data.term_months,
        conditions:     data.notes ? { notes: data.notes } : undefined,
        submitted_via:  "portal",
      });
      setBidSuccess(id as string);
      setBiddingRequest(null);
      setDetailRequest(null);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink tracking-tight">Marketplace</h1>
          <p className="text-muted mt-1.5">{filtered.length} open request{filtered.length !== 1 ? "s" : ""} · refreshes every 30s</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 font-bold text-[13px] px-4 py-2 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />LIVE
          </span>
          <button onClick={() => refetch()} className="border border-ink/10 text-muted text-[13px] font-medium px-4 py-2 rounded-full hover:bg-ink/[0.03] transition-colors">
            Refresh
          </button>
        </div>
      </div>

      {/* Maker-checker notice */}
      <div className="bg-ficium/5 border border-ficium/15 rounded-2xl px-5 py-3.5 flex items-center gap-3 mb-6">
        <AlertTriangle className="w-4 h-4 text-ficium flex-shrink-0" />
        <p className="text-[13px] text-ink/70">
          Bids require a second admin to approve in{" "}
          <span className="text-ficium font-semibold">Approvals</span> before submission.
        </p>
      </div>

      {/* ── Live market intelligence panel ── */}
      {intel?.marketRates && intel.marketRates.length > 0 && (
        <div className="bg-white border border-ink/[0.06] rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-ficium/10 grid place-items-center">
              <BarChart2 className="w-3.5 h-3.5 text-ficium" />
            </div>
            <span className="text-[12px] font-bold text-ficium uppercase tracking-widest">Live Market Intelligence</span>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-muted font-medium">Updated every 5 min</span>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {intel.marketRates.slice(0, 4).map((r) => {
              const win = intel.acceptanceIntel.find(a => a.product_type === r.product_type);
              const comp = intel.competitiveness.find(c => c.product_type === r.product_type);
              return (
                <div key={r.product_type} className="bg-cream rounded-xl p-3.5">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 capitalize">
                    {r.product_type.replace(/_/g, " ")}
                  </div>
                  <div className="font-display text-[20px] font-extrabold text-ficium leading-none mb-1">
                    {r.avg_rate_pct}%
                  </div>
                  <div className="text-[11px] text-muted">market avg APR</div>
                  <div className="mt-2 pt-2 border-t border-ink/[0.06] space-y-0.5">
                    <div className="text-[11px] text-ink/60">
                      Range: <span className="font-semibold text-ink">{r.min_rate_pct}–{r.max_rate_pct}%</span>
                    </div>
                    {win && (
                      <div className="text-[11px] text-ink/60">
                        Win avg: <span className="font-semibold text-emerald-600">{win.avg_winning_rate_pct}%</span>
                      </div>
                    )}
                    {comp && (
                      <div className="text-[11px] text-ink/60">
                        Avg bids/req: <span className="font-semibold text-ink">{comp.avg_bids_per_request}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Success toast */}
      {bidSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-3.5 flex items-center justify-between mb-6">
          <p className="text-[13px] text-green-700 font-medium">
            ✓ Bid submitted for approval — Action <code className="font-mono text-[12px]">{bidSuccess.slice(0,8)}…</code>
          </p>
          <button onClick={() => setBidSuccess(null)} className="text-green-400 hover:text-green-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Product filter */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Filter className="w-4 h-4 text-muted" />
        {["all", ...productTypes].map(pt => {
          const product = products.find(p => p.code === pt);
          const label   = pt === "all" ? "All products" : (product?.label ?? pt);
          return (
            <button key={pt} onClick={() => setProductFilter(pt)}
              className={`text-[13px] font-medium px-4 py-1.5 rounded-full border transition-colors ${
                productFilter === pt
                  ? "bg-ficium text-white border-ficium"
                  : "bg-white border-ink/10 text-muted hover:border-ficium/40 hover:text-ficium"
              }`}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-2 border-ficium border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl shadow-card">
          <p className="text-ink font-semibold mb-1">No open requests right now</p>
          <p className="text-muted text-[13px]">New requests appear automatically</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(req => (
            <RequestCard key={req.id} request={req}
              canBid={canBid}
              onOpen={() => setDetailRequest(req)}
              onBid={() => setBiddingRequest(req)} />
          ))}
        </div>
      )}

      {/* Request detail drawer */}
      {detailRequest && (
        <RequestDetailDrawer
          request={detailRequest}
          onClose={() => setDetailRequest(null)}
          onBid={() => { setBiddingRequest(detailRequest); }}
        />
      )}

      {/* Bid modal */}
      {biddingRequest && (
        <BidModal request={biddingRequest}
          onClose={() => setBiddingRequest(null)}
          onSubmit={handleBidSubmit}
          isSubmitting={submitBid.isPending}
          error={submitBid.error?.message} />
      )}
    </div>
  );
}

// ─── Request Card (click to open detail) ─────────────────────
function RequestCard({
  request, canBid, onOpen, onBid,
}: {
  request: MarketplaceRequest;
  canBid: boolean;
  onOpen: () => void;
  onBid: () => void;
}) {
  const isUrgent = new Date(request.bid_window_closes_at).getTime() - Date.now() < 60 * 60 * 1000;
  const fmt = (v: number) => v >= 1_000_000 ? `MUR ${(v/1_000_000).toFixed(1)}M` : `MUR ${Number(v).toLocaleString()}`;
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-MU", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div
      onClick={onOpen}
      className="bg-white rounded-2xl p-5 shadow-card hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[11px] font-bold text-ficium uppercase tracking-widest mb-1">{request.family_label ?? "Financial product"}</div>
          <div className="font-display font-bold text-[16px] text-ink">{request.product_label ?? request.product_type}</div>
        </div>
        <span className="bg-green-50 text-green-700 border border-green-200 text-[11px] font-semibold px-2.5 py-1 rounded-full">Open</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-cream rounded-xl p-3">
          <div className="text-[11px] text-muted mb-1">Amount</div>
          <div className="font-bold text-ink text-[14px]">{fmt(Number(request.amount))}</div>
        </div>
        {request.term_months && (
          <div className="bg-cream rounded-xl p-3">
            <div className="text-[11px] text-muted mb-1">Term</div>
            <div className="font-bold text-ink text-[14px]">{request.term_months} months</div>
          </div>
        )}
      </div>

      {request.purpose && <p className="text-[12px] text-muted mb-3 line-clamp-2">{request.purpose}</p>}

      {/* Date submitted */}
      <div className="flex items-center gap-1.5 text-[11px] text-muted mb-3">
        <Calendar className="w-3 h-3" />
        Submitted {fmtDate(request.created_at)}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-ink/[0.06]">
        <div className={`flex items-center gap-1.5 text-[12px] ${isUrgent ? "text-red-500 font-semibold" : "text-muted"}`}>
          <Clock className="w-3.5 h-3.5" />
          {formatDistanceToNow(request.bid_window_closes_at)}
        </div>
        {canBid && (
          <button
            onClick={e => { e.stopPropagation(); onBid(); }}
            className="flex items-center gap-1.5 bg-ficium text-white text-[12px] font-bold px-4 py-2 rounded-xl hover:bg-ficium-deep transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />Place bid
          </button>
        )}
      </div>
    </div>
  );
}

function RequestDetailDrawer({
  request, onClose, onBid,
}: {
  request: MarketplaceRequest;
  onClose: () => void;
  onBid: () => void;
}) {
  const [tab, setTab] = useState<"details" | "chat">("details");
  const [markerComment,   setMarkerComment]   = useState("");
  const [approverComment, setApproverComment] = useState("");

  const fmt      = (v: number) => v >= 1_000_000 ? `MUR ${(v/1_000_000).toFixed(1)}M` : `MUR ${Number(v).toLocaleString()}`;
  const fmtDate  = (s: string) => new Date(s).toLocaleDateString("en-MU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const fmtMoney = (v: number | null | undefined) => v != null && v > 0 ? fmt(v) : "—";
  const isUrgent = new Date(request.bid_window_closes_at).getTime() - Date.now() < 60 * 60 * 1000;

  const downloadPDF = () => {
    const lines: string[] = [];
    lines.push(`FICIUM — REQUEST DOSSIER`);
    lines.push(`Generated: ${new Date().toLocaleString("en-MU")}`);
    lines.push(`${"─".repeat(48)}`);
    lines.push(`Product:        ${request.product_label ?? request.product_type}`);
    lines.push(`Family:         ${request.family_label ?? "—"}`);
    lines.push(`Status:         Open`);
    lines.push(`Amount:         ${fmt(Number(request.amount))}`);
    lines.push(`Term:           ${request.term_months ? `${request.term_months} months` : "—"}`);
    lines.push(`Submitted:      ${fmtDate(request.created_at)}`);
    lines.push(`Bid window:     ${fmtDate(request.bid_window_closes_at)}`);
    lines.push(`Ref:            #${request.client_ref?.slice(0,8)}`);
    if (request.purpose) { lines.push(`Purpose:        ${request.purpose}`); }
    lines.push(`${"─".repeat(48)}`);
    lines.push(`ANONYMOUS CLIENT PROFILE`);
    lines.push(`Credit Score:   ${request.client_health_score != null ? `${request.client_health_score}/100` : "—"}`);
    lines.push(`Affordability:  ${request.client_affordability_score != null ? `${request.client_affordability_score}/100` : "—"}`);
    lines.push(`Risk Score:     ${request.client_risk_score != null ? `${request.client_risk_score}/100` : "—"}`);
    lines.push(`Monthly Income: ${fmtMoney(request.client_monthly_income)}`);
    lines.push(`Net Worth:      ${fmtMoney(request.client_net_worth)}`);
    lines.push(`Country:        ${request.client_country ?? "—"}`);
    lines.push(`Employment:     ${request.client_employment_status?.replace(/_/g, " ") ?? "—"}`);
    if (markerComment)   lines.push(`\nMarker note:    ${markerComment}`);
    if (approverComment) lines.push(`Approver note:  ${approverComment}`);
    lines.push(`${"─".repeat(48)}`);
    lines.push(`CONFIDENTIAL — For internal use only. Client identity not disclosed.`);

    const content = lines.join("\n");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Ficium Request Dossier #${request.client_ref?.slice(0,8)}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 13px; padding: 40px; max-width: 680px; margin: 0 auto; color: #1a1a2e; }
        .logo { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #2563eb; margin-bottom: 4px; }
        .subtitle { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 32px; }
        pre { white-space: pre-wrap; word-break: break-word; background: #f8f7f4; padding: 24px; border-radius: 8px; border: 1px solid #e5e5e0; }
        .footer { margin-top: 24px; font-size: 11px; color: #aaa; border-top: 1px solid #e5e5e0; padding-top: 12px; }
        @media print { body { padding: 20px; } }
      </style>
    </head><body>
      <div class="logo">Ficium</div>
      <div class="subtitle">Request Dossier — Confidential</div>
      <pre>${content}</pre>
      <div class="footer">This document is for internal use only. Generated by Ficium Institution Portal.</div>
      <script>window.onload = () => window.print();</script>
    </body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    /* ── Full-screen backdrop ── */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-ink/50 backdrop-blur-sm" onClick={onClose}>

      {/* ── Modal ── */}
      <div
        className="relative bg-white rounded-3xl shadow-[0_32px_80px_rgba(10,10,26,0.28)] w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >

        {/* ── Modal header ── */}
        <div className="flex items-start justify-between px-8 py-6 border-b border-ink/[0.07] flex-shrink-0">
          <div>
            <div className="text-[11px] font-bold text-ficium uppercase tracking-widest mb-1">
              {request.family_label ?? "Financial product"}
            </div>
            <h2 className="font-display font-bold text-[24px] text-ink leading-tight">
              {request.product_label ?? request.product_type}
            </h2>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={downloadPDF}
              title="Download dossier"
              className="flex items-center gap-1.5 text-[12px] font-semibold text-muted hover:text-ficium border border-ink/10 hover:border-ficium/30 px-3.5 py-2 rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-ink/[0.05] hover:bg-ink/10 grid place-items-center text-muted hover:text-ink transition-colors"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-ink/[0.07] flex-shrink-0 px-8">
          {(["details", "chat"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 py-3.5 mr-6 text-[13px] font-semibold transition-colors border-b-2 ${
                tab === t ? "border-ficium text-ficium" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t === "details" ? <FileText className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Scrollable body ── */}
        {tab === "details" ? (
          <div className="flex-1 overflow-y-auto">
            <div className="px-8 py-6 space-y-7">

              {/* Status grid */}
              <div className="grid grid-cols-3 gap-3">
                <DetailStat label="Status">
                  <span className="bg-green-50 text-green-700 border border-green-200 text-[11px] font-semibold px-2.5 py-1 rounded-full">Open</span>
                </DetailStat>
                <DetailStat label="Submitted" value={fmtDate(request.created_at)} />
                <DetailStat label="Ref" value={`#${request.client_ref?.slice(0,8)}`} />
                <DetailStat label="Amount" value={fmt(Number(request.amount))} bold />
                {request.term_months && <DetailStat label="Term" value={`${request.term_months} months`} bold />}
                {request.bid_window_closes_at && (
                  <DetailStat
                    label="Bid window closes"
                    value={fmtDate(request.bid_window_closes_at)}
                    accent={isUrgent ? "red" : undefined}
                  />
                )}
              </div>

              {/* Purpose */}
              {request.purpose && (
                <div>
                  <SectionLabel icon={<FileText className="w-3.5 h-3.5" />} text="Purpose" />
                  <p className="text-[14px] text-ink/80 bg-cream rounded-xl px-4 py-3 leading-relaxed">{request.purpose}</p>
                </div>
              )}

              {/* Two-col: client profile + amount/rate */}
              <div className="grid grid-cols-2 gap-6">

                {/* Client profile */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <SectionLabel icon={<User className="w-3.5 h-3.5" />} text="Client Profile" />
                    <span className="text-[10px] text-muted bg-ink/5 px-2 py-1 rounded-full">Anonymised</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <ProfileStat label="Credit Score"
                      value={request.client_health_score != null ? `${request.client_health_score}/100` : "—"}
                      accent={request.client_health_score != null ? (request.client_health_score >= 70 ? "green" : request.client_health_score >= 50 ? "amber" : "red") : undefined} />
                    <ProfileStat label="Affordability"
                      value={request.client_affordability_score != null ? `${request.client_affordability_score}/100` : "—"}
                      accent={request.client_affordability_score != null ? (request.client_affordability_score >= 70 ? "green" : request.client_affordability_score >= 50 ? "amber" : "red") : undefined} />
                    <ProfileStat label="Risk Score" value={request.client_risk_score != null ? `${request.client_risk_score}/100` : "—"} />
                    <ProfileStat label="Monthly Income" value={fmtMoney(request.client_monthly_income)} />
                    <ProfileStat label="Net Worth"      value={fmtMoney(request.client_net_worth)} />
                    <ProfileStat label="Country"        value={request.client_country ?? "—"} />
                    <ProfileStat label="Employment"     value={request.client_employment_status?.replace(/_/g, " ") ?? "—"} />
                  </div>
                  <p className="text-[10px] text-muted mt-2">Client identity not disclosed at this stage.</p>
                </div>

                {/* Amount + rate guidance */}
                <div className="space-y-4">
                  <div>
                    <SectionLabel icon={<DollarSign className="w-3.5 h-3.5" />} text="Requested Amount" />
                    <div className="bg-cream rounded-xl px-4 py-3">
                      <div className="font-display font-bold text-[24px] text-ink">{fmt(Number(request.amount))}</div>
                      {request.term_months && <div className="text-[13px] text-muted mt-0.5">over {request.term_months} months</div>}
                    </div>
                  </div>
                  <div>
                    <SectionLabel icon={<TrendingUp className="w-3.5 h-3.5" />} text="Rate Guidance" />
                    <div className="bg-cream rounded-xl px-4 py-3 text-[13px] text-ink/70 leading-relaxed">
                      Submit your most competitive rate. Clients compare all bids and are not shown your institution name until they choose to connect.
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Maker-checker comment boxes ── */}
              <div className="grid grid-cols-2 gap-4 pt-2">

                {/* Marker */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-md bg-ficium/10 grid place-items-center">
                      <MessageSquare className="w-3 h-3 text-ficium" />
                    </div>
                    <span className="text-[11px] font-bold text-ficium uppercase tracking-wider">Marker Comment</span>
                  </div>
                  <textarea
                    value={markerComment}
                    onChange={e => setMarkerComment(e.target.value)}
                    rows={4}
                    placeholder="Add your analysis or notes before submitting for approval…"
                    className="w-full bg-white border border-ink/[0.10] focus:border-ficium focus:ring-2 focus:ring-ficium/15 rounded-2xl px-4 py-3 text-[13px] text-ink placeholder:text-muted/60 outline-none resize-none transition-all"
                  />
                </div>

                {/* Approver */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-md bg-amber-100 grid place-items-center">
                      <MessageSquare className="w-3 h-3 text-amber-600" />
                    </div>
                    <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Approver Comment</span>
                  </div>
                  <textarea
                    value={approverComment}
                    onChange={e => setApproverComment(e.target.value)}
                    rows={4}
                    placeholder="Approver review notes — reasons for approval or rejection…"
                    className="w-full bg-white border border-ink/[0.10] focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 rounded-2xl px-4 py-3 text-[13px] text-ink placeholder:text-muted/60 outline-none resize-none transition-all"
                  />
                </div>

              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <RequestChat requestId={request.id} senderType="institution" client={institutionSupabase} />
          </div>
        )}

        {/* ── Sticky footer CTA ── */}
        {tab === "details" && (
          <div className="flex-shrink-0 bg-white border-t border-ink/[0.07] px-8 py-5 flex items-center gap-4">
            <button
              onClick={onBid}
              className="flex-1 flex items-center justify-center gap-2 bg-ficium hover:bg-ficium-deep text-white font-bold py-3.5 rounded-2xl transition-colors text-[15px] shadow-ficium"
            >
              <Zap className="w-5 h-5" />
              Place bid on this request
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3.5 rounded-2xl border border-ink/10 text-muted text-[14px] font-semibold hover:bg-ink/[0.03] transition-colors"
            >
              Close
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <span className="text-ficium">{icon}</span>
      <span className="text-[11px] font-bold text-ficium uppercase tracking-wider">{text}</span>
    </div>
  );
}

function DetailStat({
  label, value, children, bold, accent,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  bold?: boolean;
  accent?: "red" | "amber" | "green";
}) {
  const accentCls = accent === "red" ? "text-red-500" : accent === "amber" ? "text-amber-600" : accent === "green" ? "text-green-600" : "";
  return (
    <div className="bg-cream rounded-xl px-3 py-2.5">
      <div className="text-[10px] text-muted mb-0.5">{label}</div>
      {children ?? <div className={`text-[13px] ${bold ? "font-bold text-ink" : `font-medium text-ink/80 ${accentCls}`}`}>{value}</div>}
    </div>
  );
}

function ProfileStat({ label, value, accent }: { label: string; value: string; accent?: "green" | "amber" | "red" }) {
  const accentCls = accent === "green" ? "text-green-600 font-bold"
    : accent === "amber" ? "text-amber-600 font-bold"
    : accent === "red" ? "text-red-500 font-bold"
    : "font-bold text-ink";
  return (
    <div className="bg-white rounded-xl p-2.5 border border-ink/[0.06]">
      <div className="text-[10px] text-muted mb-0.5">{label}</div>
      <div className={`text-[13px] ${accentCls} capitalize`}>{value}</div>
    </div>
  );
}

// ─── Bid Modal ────────────────────────────────────────────────
function BidModal({ request, onClose, onSubmit, isSubmitting, error }: {
  request: MarketplaceRequest; onClose: () => void;
  onSubmit: (d: BidForm) => void; isSubmitting: boolean; error?: string;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<BidForm>({
    resolver: zodResolver(bidSchema),
    defaultValues: { rate_type: "fixed", amount_offered: request.amount, term_months: request.term_months ?? 12 },
  });
  const inputCls = (err?: boolean) =>
    `w-full bg-white border ${err ? "border-red-400 focus:ring-red-200" : "border-ink/[0.12] focus:border-ficium focus:ring-ficium/20"} rounded-xl px-4 py-3 text-[15px] outline-none transition-all focus:ring-2`;
  const fmt = (v: number) => v >= 1_000_000 ? `MUR ${(v/1_000_000).toFixed(1)}M` : `MUR ${Number(v).toLocaleString()}`;

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-6 border-b border-ink/[0.07]">
          <div>
            <h2 className="font-display font-bold text-[17px] text-ink">Place bid</h2>
            <p className="text-[13px] text-muted mt-0.5">{request.product_label ?? request.product_type} · {fmt(Number(request.amount))}{request.term_months ? ` · ${request.term_months}m` : ""}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-ink mb-1.5">Interest rate (%)</label>
              <input {...register("rate", { valueAsNumber: true, setValueAs: v => parseFloat(v) / 100 })} type="number" step="0.01" placeholder="8.75" className={inputCls(!!errors.rate)} />
              {errors.rate && <p className="text-[11px] text-red-500 mt-1">{errors.rate.message}</p>}
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-ink mb-1.5">Rate type</label>
              <select {...register("rate_type")} className={inputCls()}>
                <option value="fixed">Fixed</option>
                <option value="variable">Variable</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-ink mb-1.5">Amount offered (MUR)</label>
            <input {...register("amount_offered", { valueAsNumber: true })} type="number" className={inputCls(!!errors.amount_offered)} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-ink mb-1.5">Term (months)</label>
            <input {...register("term_months", { valueAsNumber: true })} type="number" className={inputCls(!!errors.term_months)} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-ink mb-1.5">Conditions (optional)</label>
            <textarea {...register("notes")} rows={2} className={`${inputCls()} resize-none`} placeholder="Any special conditions for the client..." />
          </div>
          <div className="bg-ficium/5 border border-ficium/15 rounded-xl p-3 text-[12px] text-ink/60">
            ⚠ This bid will be queued for maker-checker approval before reaching the client.
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[12px] text-red-600">{error}</div>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={isSubmitting} className="flex-1 flex items-center justify-center gap-2 bg-ficium hover:bg-ficium-deep disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors">
              {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Zap className="w-4 h-4" />}
              Submit for approval
            </button>
            <button type="button" onClick={onClose} className="px-5 text-[13px] font-semibold text-muted border border-ink/10 rounded-xl hover:bg-ink/[0.03] transition-colors">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
