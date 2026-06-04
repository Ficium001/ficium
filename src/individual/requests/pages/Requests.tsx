import React from "react";
import { Link } from "react-router-dom";
import {
  Plus, ChevronRight, CheckCircle2, Clock, Zap,
  FileText, TrendingUp, Bell, Brain, Activity,
  Building2, ArrowRight, MoreHorizontal,
} from "lucide-react";
import { useMyRequests, useBankReadiness } from "../../dashboard/hooks/useDashboard";
import { formatMUR, formatProductType } from "../../dashboard/api/profile";
import { BottomNav } from "../../../shared/ui";
import type { RequestSummary } from "@/individual/requests/api/requests";

/* ── Mock activity feed (replace with Supabase Realtime subscription) ── */
const MOCK_ACTIVITY = [
  { id: 1, text: "MCB submitted a new offer on your Personal Loan", time: "2 mins ago", dot: "bg-ficium" },
  { id: 2, text: "SBM reviewed your application", time: "1 hour ago", dot: "bg-amber-400" },
  { id: 3, text: "Your request entered bidding stage", time: "Today, 09:14", dot: "bg-emerald-400" },
  { id: 4, text: "ABSA placed a competitive bid", time: "Yesterday", dot: "bg-ficium" },
];

/* ── Journey steps ── */
const JOURNEY_STEPS = ["Submitted", "Under Review", "Banks Bidding", "Offer Ready"];

export default function Requests() {
  const { data: requests = [], isLoading } = useMyRequests();
  const { score: bankReadiness } = useBankReadiness();

  // expandedId reserved for future collapsible behaviour

  const openRequests = requests.filter((r) => r.status === "open");
  const totalBids = requests.reduce((s, r) => s + r.bidCount, 0);
  const bestRate = "8.2%";
  const pendingDocs = 0;

  return (
    <div className="min-h-screen pb-28 lg:pb-10">

      {/* ── GRADIENT BACKGROUND ── */}
      <div className="absolute top-0 left-0 right-0 h-[520px] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63]" />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 20% 40%, rgba(79,70,229,0.5) 0%, transparent 55%), radial-gradient(ellipse at 85% 60%, rgba(201,168,76,0.2) 0%, transparent 50%)"
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f8f7f4] to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10">

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between pt-10 pb-8 gap-4 flex-wrap">
          <div>
            <div className="text-[12px] font-bold text-white/50 uppercase tracking-widest mb-2">Your marketplace</div>
            <h1 className="font-display text-5xl sm:text-6xl font-extrabold text-white leading-tight tracking-tight">
              Requests
            </h1>
            <p className="text-white/50 text-[16px] mt-2 max-w-[460px] leading-relaxed">
              Track applications, compare bank offers, and monitor approvals in real time.
            </p>
          </div>
          <Link
            to="/requests/new"
            className="inline-flex items-center gap-2 bg-ficium text-white px-6 py-4 rounded-[22px] text-[15px] font-bold no-underline shadow-ficium hover:-translate-y-0.5 transition-transform flex-shrink-0 mt-2"
          >
            <Plus size={18} /> New Request
          </Link>
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {([
            { label: "Open Requests", value: isLoading ? "—" : String(openRequests.length), icon: FileText, color: "text-indigo-300" },
            { label: "Banks Interested", value: isLoading ? "—" : String(totalBids), icon: Building2, color: "text-amber-300" },
            { label: "Best Rate", value: bestRate, icon: TrendingUp, color: "text-emerald-300" },
            { label: "Pending Docs", value: String(pendingDocs), icon: Clock, color: "text-rose-300" },
          ] as { label: string; value: string; icon: (props: { size: number; className: string }) => React.ReactElement; color: string }[]).map((s) => (
            <div key={s.label} className="rounded-[22px] bg-white/[0.08] backdrop-blur-xl border border-white/[0.10] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] text-white/55 font-medium">{s.label}</span>
                <s.icon size={15} className={s.color} />
              </div>
              <div className="font-display text-[40px] font-extrabold text-white leading-none tracking-tight">{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

          {/* ── LEFT: Request list + detail ── */}
          <div>
            {isLoading ? (
              <SkeletonRequest />
            ) : requests.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex flex-col gap-5">
                {requests.map((r) => (
                  <RequestCard
                    key={r.id}
                    request={r}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Side panel ── */}
          <div className="flex flex-col gap-5">

            {/* Activity Feed */}
            <div className="bg-white rounded-[26px] border border-ink/[0.06] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Activity size={15} className="text-ficium" />
                  <span className="font-display text-[18px] font-bold">Activity Feed</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="flex flex-col gap-4">
                {MOCK_ACTIVITY.map((a) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className={["w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5", a.dot].join(" ")} />
                    <div>
                      <p className="text-[14px] text-ink/80 leading-snug">{a.text}</p>
                      <p className="text-[12px] text-muted mt-1">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Coach */}
            <div className="rounded-[26px] overflow-hidden bg-gradient-to-br from-[#0f0c29] to-[#302b63] p-6 border border-ficium/20">
              <div className="flex items-center gap-2 mb-1">
                <Brain size={15} className="text-white/70" />
                <span className="text-[12px] font-bold text-white/50 uppercase tracking-widest">Ficium AI</span>
              </div>
              <h3 className="font-display text-[22px] font-bold text-white leading-snug mb-3">
                Your profile is attractive to lenders
              </h3>
              <p className="text-[14px] text-white/60 leading-relaxed mb-5">
                Based on your financial health and income stability, you are likely to receive highly competitive offers within 24 hours.
              </p>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-2 bg-white/10 rounded-pill overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-indigo-400 to-emerald-400 rounded-pill" style={{ width: `${bankReadiness ?? 72}%` }} />
                </div>
                <span className="text-[13px] font-bold text-white">{bankReadiness ?? 72}%</span>
              </div>
              <Link
                to="/advisor"
                className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-colors text-white text-[13px] font-bold px-4 py-3 rounded-xl no-underline"
              >
                Open AI Analysis <ArrowRight size={13} />
              </Link>
            </div>

            {/* Quick links */}
            <div className="bg-white rounded-[26px] border border-ink/[0.06] p-5 shadow-sm">
              <div className="font-display text-[16px] font-bold mb-3">Quick actions</div>
              <div className="flex flex-col gap-2">
                {[
                  { label: "View all bids", to: "/requests", icon: Zap },
                  { label: "Update financial profile", to: "/onboarding/dossier", icon: FileText },
                  { label: "Check notifications", to: "/alerts", icon: Bell },
                ].map((q) => (
                  <Link key={q.label} to={q.to} className="no-underline flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-ink/[0.04] transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-ficium/10 grid place-items-center flex-shrink-0">
                      <q.icon size={14} className="text-ficium" />
                    </div>
                    <span className="text-[13px] font-semibold text-ink/80">{q.label}</span>
                    <ChevronRight size={13} className="text-muted ml-auto group-hover:text-ink transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

/* ============================================================
   REQUEST CARD — full detail inline
   ============================================================ */
function RequestCard({ request }: { request: RequestSummary }) {
  const MOCK_BIDS = [
    { bank: "MCB", rate: "8.2%", note: "Lowest monthly repayment", color: "text-ficium" },
    { bank: "SBM", rate: "8.4%", note: "Flexible repayment period", color: "text-amber-600" },
    { bank: "ABSA", rate: "8.7%", note: "Fastest approval timeline", color: "text-emerald-600" },
  ];

  const statusStyle = request.status === "open"
    ? "bg-emerald-50 text-emerald-700"
    : request.status === "accepted"
    ? "bg-ficium text-white"
    : "bg-ink/10 text-muted";

  /* Determine journey progress */
  const journeyProgress = request.status === "open" && request.bidCount > 0 ? 2
    : request.status === "open" ? 1
    : request.status === "accepted" ? 3
    : 0;

  return (
    <div className="bg-white rounded-[28px] border border-ficium/10 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md">
      <Link to={`/requests/${request.id}`} className="no-underline block p-6 sm:p-7 hover:bg-ink/[0.01] transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-ficium/10 text-ficium grid place-items-center flex-shrink-0">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] text-muted font-medium mb-1">{formatProductType(request.productType)}</div>
              <div className="font-display text-[36px] sm:text-[44px] font-extrabold text-ink leading-none tracking-tight">
                {formatMUR(request.amount)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={["text-[11px] font-bold px-3 py-1.5 rounded-pill uppercase tracking-wide", statusStyle].join(" ")}>
              {request.status}
            </span>
            <button className="w-8 h-8 rounded-full bg-ink/[0.05] grid place-items-center hover:bg-ink/10 transition-colors">
              <MoreHorizontal size={15} className="text-muted" />
            </button>
          </div>
        </div>

        {/* Mini bid count */}
        {request.bidCount > 0 && (
          <div className="flex items-center gap-2 mt-4">
            <div className="flex -space-x-2">
              {[...Array(Math.min(request.bidCount, 3))].map((_, i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-ficium/20 border-2 border-white grid place-items-center">
                  <Building2 size={10} className="text-ficium" />
                </div>
              ))}
            </div>
            <span className="text-[13px] font-semibold text-ficium">
              {request.bidCount} bank{request.bidCount !== 1 ? "s" : ""} competing for you
            </span>
          </div>
        )}
      </Link>

      {/* Expanded detail — always visible */}
      <div className="px-6 sm:px-7 pb-7 border-t border-ink/[0.05]">

          {/* Journey */}
          <div className="py-6">
            <div className="text-[12px] font-bold text-muted uppercase tracking-widest mb-4">Application journey</div>
            <div className="relative flex items-start justify-between">
              {/* Track */}
              <div className="absolute top-5 left-5 right-5 h-1 bg-ink/[0.08] rounded-pill" />
              <div
                className="absolute top-5 left-5 h-1 bg-ficium rounded-pill transition-all duration-700"
                style={{ width: `${(journeyProgress / (JOURNEY_STEPS.length - 1)) * 85}%` }}
              />
              {JOURNEY_STEPS.map((label, i) => {
                const done = i <= journeyProgress;
                return (
                  <div key={label} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                    <div className={[
                      "w-10 h-10 rounded-full grid place-items-center text-[13px] font-bold border-2 transition-all",
                      done ? "bg-ficium border-ficium text-white" : "bg-white border-ink/20 text-muted",
                    ].join(" ")}>
                      {done ? <CheckCircle2 size={16} /> : i + 1}
                    </div>
                    <span className={["text-[11px] font-semibold text-center leading-tight", done ? "text-ficium" : "text-muted"].join(" ")}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bank offers */}
          {request.bidCount > 0 && (
            <div>
              <div className="font-display text-[20px] font-bold mb-4">
                Banks competing for <span className="text-ficium">you</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {MOCK_BIDS.map((bid) => (
                  <div key={bid.bank} className="bg-[#F8F7FC] rounded-[20px] p-5 hover:-translate-y-0.5 transition-transform">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-[16px]">{bid.bank}</span>
                      <span className={["font-display text-[28px] font-extrabold", bid.color].join(" ")}>{bid.rate}</span>
                    </div>
                    <p className="text-[13px] text-muted mb-4">{bid.note}</p>
                    <Link
                      to={`/requests/${request.id}`}
                      className="block text-center bg-ink text-white py-3 rounded-[14px] text-[13px] font-bold no-underline hover:bg-ink/90 transition-colors"
                    >
                      View Offer
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA if no bids yet */}
          {request.bidCount === 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
              <Clock size={16} className="text-amber-600 flex-shrink-0" />
              <div>
                <div className="text-[14px] font-bold text-amber-800">Waiting for bids</div>
                <div className="text-[12px] text-amber-600 mt-0.5">Banks typically respond within 24 hours.</div>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */
function EmptyState() {
  return (
    <div className="bg-white rounded-[28px] border border-ink/[0.06] p-10 text-center shadow-sm">
      <div className="w-16 h-16 rounded-[22px] bg-ficium/10 text-ficium grid place-items-center mx-auto mb-4">
        <FileText size={28} />
      </div>
      <div className="font-display text-[24px] font-bold mb-2">No requests yet</div>
      <p className="text-[15px] text-muted mb-6 max-w-[300px] mx-auto leading-relaxed">
        Post your first request and let banks compete with their best offers.
      </p>
      <Link
        to="/requests/new"
        className="inline-flex items-center gap-2 bg-ficium text-white px-6 py-3.5 rounded-pill text-[14px] font-bold no-underline shadow-ficium"
      >
        <Plus size={16} /> New Request
      </Link>
    </div>
  );
}

/* ============================================================
   SKELETON
   ============================================================ */
function SkeletonRequest() {
  return (
    <div className="bg-white rounded-[28px] border border-ink/[0.06] p-7 shadow-sm">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-ink/10 animate-pulse" />
        <div>
          <div className="h-3 w-24 bg-ink/10 rounded animate-pulse mb-2" />
          <div className="h-8 w-40 bg-ink/10 rounded animate-pulse" />
        </div>
      </div>
      <div className="h-3 w-full bg-ink/10 rounded animate-pulse mb-2" />
      <div className="h-3 w-2/3 bg-ink/10 rounded animate-pulse" />
    </div>
  );
}