// =============================================================
// Ficium — Request Workspace (/requests/:id)
// Unified 7-tab workspace: Plan | Documents | Insights | Details | Bids | Progress | Chat
// =============================================================
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Lock, CheckCircle, Clock, TrendingDown,
  Building2, AlertCircle, MessageSquare, FileText,
  User, Percent, LayoutGrid, Sparkles,
  BarChart3, CheckCircle2, MapPin, Layers,
} from "lucide-react";
import { TrackerTab } from "../tracker/tabs/TrackerTab";
import { formatProductType } from "../api/requests";
import type { Bid, RequestDetail as RequestDetailType, Phase2Reveal } from "../api/requests";
import { Button, Card, BottomNav } from "../../../shared/ui";
import { monthlyRepayment } from "@/shared/lib/finance";
import RequestChat from "../../../shared/components/RequestChat";
import { supabase } from "../../../shared/lib/supabase";
import { useProfile } from "../../dashboard/hooks/useDashboard";
import { useRequest, useRequestBids, useAcceptBid } from "../hooks/useRequests";
import { useVault } from "../../vault/hooks/useVault";
import type { VaultDocType } from "../../vault/api/vault";

/* ── Tab definition ── */
type TabId = "plan" | "documents" | "insights" | "details" | "bids" | "tracker" | "chat";
const TABS: { id: TabId; label: string; icon: React.ElementType; acceptedOnly?: boolean; hot?: boolean }[] = [
  { id: "plan",      label: "Plan",      icon: LayoutGrid    },
  { id: "bids",      label: "Bids",      icon: TrendingDown, hot: true },
  { id: "tracker",   label: "Progress",  icon: MapPin       },
  { id: "chat",      label: "Chat",      icon: MessageSquare },
  { id: "details",   label: "Details",   icon: FileText      },
  { id: "documents", label: "Documents", icon: FileText      },
  { id: "insights",  label: "Insights",  icon: Sparkles      },
];


/* ── Journey steps for Plan tab ── */
const JOURNEY_STEPS = ["Submitted", "Under Review", "Providers Bidding", "Offer Ready"];

/* ── Helpers ── */
const fmt     = (v: number) => v >= 1_000_000 ? `MUR ${(v/1_000_000).toFixed(1)}M` : `MUR ${Number(v).toLocaleString()}`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-MU", { day: "numeric", month: "short", year: "numeric" });

/* ── Plan tab ── */
function PlanTab({ request, bidCount }: { request: RequestDetailType; bidCount: number }) {
  const journeyProgress = request.status === "accepted" ? 3
    : bidCount > 0 ? 2
    : request.status === "open" ? 1 : 0;

  // Parse purpose fields back into structured display
  const purposeFields = request.purpose
    ? request.purpose.split(" | ").map(part => {
        const idx = part.indexOf(": ");
        if (idx === -1) return { key: "notes", value: part };
        return { key: part.slice(0, idx), value: part.slice(idx + 2) };
      })
    : [];

  return (
    <div className="space-y-4">
      {/* Request summary */}
      <div className="bg-white rounded-[22px] border border-ink/6 shadow-xs p-5">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-[12px] text-muted font-semibold mb-0.5">Amount requested</div>
            <div className="font-display text-[40px] font-extrabold text-ficium leading-none">
              {fmt(request.amount)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[12px] text-muted font-semibold mb-0.5">Term</div>
            <div className="text-[16px] font-bold text-ink">{request.preferredTermMonths} months</div>
            {request.maxRate && (
              <div className="text-[12px] text-muted">Max {request.maxRate}% APR</div>
            )}
          </div>
        </div>
      </div>

      {/* Journey progress */}
      <div className="bg-white rounded-[22px] border border-ink/6 shadow-xs p-5">
        <div className="text-[12px] font-bold text-muted uppercase tracking-widest mb-4">Application journey</div>
        <div className="relative flex items-start justify-between">
          <div className="absolute top-5 left-5 right-5 h-1 bg-ink/8 rounded-pill" />
          <div className="absolute top-5 left-5 h-1 bg-ficium rounded-pill transition-all duration-700"
               style={{ width: `${(journeyProgress / (JOURNEY_STEPS.length - 1)) * 85}%` }} />
          {JOURNEY_STEPS.map((label, i) => {
            const done = i <= journeyProgress;
            return (
              <div key={label} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                <div className={["w-10 h-10 rounded-full grid place-items-center text-[12px] font-bold border-2 transition-all",
                  done ? "bg-ficium border-ficium text-white" : "bg-white border-ink/20 text-muted"].join(" ")}>
                  {done ? <CheckCircle2 size={16} /> : i + 1}
                </div>
                <span className={["text-[11px] font-semibold text-center leading-tight",
                  done ? "text-ficium" : "text-muted"].join(" ")}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Request answers */}
      {purposeFields.length > 0 && (
        <div className="bg-white rounded-[22px] border border-ink/6 shadow-xs p-5">
          <div className="text-[12px] font-bold text-muted uppercase tracking-widest mb-3">Your answers</div>
          <div className="space-y-2">
            {purposeFields.map(({ key, value }) => (
              <div key={key} className="flex items-start justify-between gap-4 py-2 border-b border-ink/5 last:border-0">
                <span className="text-[12px] text-muted font-medium capitalize w-36 shrink-0">{key}</span>
                <span className="text-[13px] font-semibold text-ink text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waiting / offers */}
      {bidCount === 0 ? (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <Clock size={16} className="text-amber-600 shrink-0" />
          <div>
            <div className="text-[14px] font-bold text-amber-800">Waiting for offers</div>
            <div className="text-[12px] text-amber-600 mt-0.5">Providers typically respond within 24 hours.</div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
          <Building2 size={16} className="text-emerald-600 shrink-0" />
          <div>
            <div className="text-[14px] font-bold text-emerald-800">{bidCount} offer{bidCount !== 1 ? "s" : ""} received</div>
            <div className="text-[12px] text-emerald-600 mt-0.5">Go to the Bids tab to compare and accept.</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Documents tab — real vault data ── */
function DocumentsTab() {
  const navigate = useNavigate();
  const { documents, loading } = useVault();

  // Required doc types for a loan request — map to friendly labels
  const REQUIRED_DOCS: { type: VaultDocType; label: string }[] = [
    { type: "payslip",          label: "Payslips (last 3)"         },
    { type: "bank_statement",   label: "Bank Statements (6 months)" },
    { type: "nic",              label: "NIC / Passport"             },
    { type: "employment_letter",label: "Employment Letter"          },
  ];

  const verified = (type: VaultDocType) =>
    documents.some(d => d.doc_type === type && (d.extract_status === "attested" || d.extract_status === "extracted"));

  const missingCount = REQUIRED_DOCS.filter(d => !verified(d.type)).length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-[22px] border border-ink/6 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[12px] font-bold text-muted uppercase tracking-widest">Document vault</div>
          {loading ? (
            <div className="h-3 w-16 bg-ink/10 rounded-sm animate-pulse" />
          ) : (
            <div className={`text-[11px] font-semibold ${missingCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {missingCount > 0 ? `${missingCount} missing` : "All verified"}
            </div>
          )}
        </div>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-12 bg-ink/5 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {REQUIRED_DOCS.map(doc => {
              const ok = verified(doc.type);
              return (
                <div key={doc.type} className={["flex items-center justify-between p-3 rounded-xl border",
                  ok ? "border-emerald-100 bg-emerald-50/50" : "border-amber-100 bg-amber-50/50"].join(" ")}>
                  <div className="flex items-center gap-3">
                    <FileText size={16} className={ok ? "text-emerald-600" : "text-amber-500"} />
                    <span className="text-[13px] font-medium text-ink">{doc.label}</span>
                  </div>
                  {ok
                    ? <span className="text-[11px] font-bold text-emerald-600">✓ Verified</span>
                    : <button onClick={() => navigate("/vault")} className="text-[11px] font-bold text-amber-600 underline">Upload</button>}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <button onClick={() => navigate("/vault")}
        className="w-full py-3.5 rounded-2xl text-[14px] font-semibold text-ficium border-2 border-ficium/20 hover:bg-ficium/4 transition-colors">
        Manage full vault →
      </button>
    </div>
  );
}

/* ── Insights tab — derived from real bids and profile ── */
function InsightsTab({ bids, request, profile }: {
  bids: Bid[];
  request: RequestDetailType;
  profile: ReturnType<typeof useProfile>["data"];
}) {
  const navigate = useNavigate();

  // Compute insights from real data
  const bidCount   = bids.length;
  const bestRate   = bids.length > 0
    ? Math.min(...bids.map(b => b.source === "institution" ? b.rate * 100 : b.rate))
    : null;
  const avgRate    = bids.length > 0
    ? bids.reduce((s, b) => s + (b.source === "institution" ? b.rate * 100 : b.rate), 0) / bids.length
    : null;
  const healthScore = profile?.healthScore ?? null;
  const dsr         = profile?.monthlyIncome && request.amount
    ? Math.round((request.amount / (request.preferredTermMonths * (profile.monthlyIncome))) * 100)
    : null;

  const coachInsight = (() => {
    if (bidCount === 0) return "Your request is live. Institutions typically review within 24 hours. Ensure your dossier is complete to attract better offers.";
    if (bidCount === 1) return `You have 1 offer so far. Waiting for the bid window to close often yields better competing rates.`;
    return `${bidCount} institutions are competing for you. The best rate is ${bestRate?.toFixed(2)}% APR — compare total cost, not just rate.`;
  })();

  return (
    <div className="space-y-4">
      <div className="bg-ficium/4 border border-ficium/12 rounded-[18px] px-5 py-4 flex items-start gap-3">
        <Sparkles size={18} className="text-ficium mt-0.5 shrink-0" />
        <div>
          <div className="text-[12px] font-bold text-ficium uppercase tracking-widest mb-1">AI Coach</div>
          <p className="text-[13px] text-ink/80 leading-relaxed">{coachInsight}</p>
        </div>
      </div>

      {/* Live bid signals */}
      {bidCount > 0 && (
        <div className="bg-white rounded-[22px] border border-ink/6 shadow-xs p-5 space-y-3">
          <div className="text-[12px] font-bold text-muted uppercase tracking-widest">Live bid signals</div>
          {bestRate !== null && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <BarChart3 size={16} className="text-emerald-600 shrink-0" />
              <span className="text-[13px] font-medium text-ink">
                Best rate so far: <strong>{bestRate.toFixed(2)}%</strong> APR
              </span>
            </div>
          )}
          {avgRate !== null && bestRate !== null && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <BarChart3 size={16} className="text-blue-600 shrink-0" />
              <span className="text-[13px] font-medium text-ink">
                Market avg: <strong>{avgRate.toFixed(2)}%</strong> — you are{" "}
                <strong className="text-emerald-600">{(avgRate - bestRate).toFixed(2)}%</strong> below average
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-ficium/4 border border-ficium/10">
            <Building2 size={16} className="text-ficium shrink-0" />
            <span className="text-[13px] font-medium text-ink">
              {bidCount} provider{bidCount !== 1 ? "s" : ""} competing for this request
            </span>
          </div>
        </div>
      )}

      {/* Profile signals */}
      {(healthScore !== null || dsr !== null) && (
        <div className="bg-white rounded-[22px] border border-ink/6 shadow-xs p-5 space-y-3">
          <div className="text-[12px] font-bold text-muted uppercase tracking-widest">Your profile signals</div>
          {healthScore !== null && (
            <div className={["flex items-center gap-3 p-3 rounded-xl border",
              healthScore >= 70 ? "bg-emerald-50 border-emerald-100" : healthScore >= 50 ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100"].join(" ")}>
              <span className="text-[13px] font-medium text-ink">
                Credit health score: <strong>{healthScore}/100</strong>
                {healthScore >= 70 ? " · Likely to attract competitive offers" : healthScore >= 50 ? " · Good — room to improve" : " · Consider building history first"}
              </span>
            </div>
          )}
          {dsr !== null && (
            <div className={["flex items-center gap-3 p-3 rounded-xl border",
              dsr <= 30 ? "bg-emerald-50 border-emerald-100" : dsr <= 50 ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100"].join(" ")}>
              <span className="text-[13px] font-medium text-ink">
                Estimated DSR: <strong>{dsr}%</strong>
                {dsr <= 30 ? " · Healthy — lenders prefer below 35%" : dsr <= 50 ? " · Moderate — may affect rates" : " · High — consider smaller amount"}
              </span>
            </div>
          )}
        </div>
      )}

      <button onClick={() => navigate("/advisor")}
        className="w-full py-4 rounded-2xl text-[15px] font-bold text-white bg-ficium shadow-ficium hover:opacity-90 transition-all">
        Open full AI Coach →
      </button>
    </div>
  );
}

/* ── Details tab ── */
function DetailsTab({ request, profile }: { request: RequestDetailType; profile: ReturnType<typeof useProfile>["data"] }) {
  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <FileText size={15} className="text-ficium" />
          <span className="text-[12px] font-bold text-ficium uppercase tracking-wider">Application</span>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <DetailRow label="Product"   value={formatProductType(request.productType)} />
          <DetailRow label="Amount"    value={fmt(request.amount)} bold />
          <DetailRow label="Term"      value={`${request.preferredTermMonths} months`} />
          {request.maxRate && <DetailRow label="Max rate"  value={`${request.maxRate}% APR`} />}
          <DetailRow label="Submitted" value={fmtDate(request.createdAt)} />
          {request.decisionDeadline && <DetailRow label="Deadline" value={fmtDate(request.decisionDeadline)} />}
          <DetailRow label="Status"    value={request.status} />
        </div>
        {request.purpose && (
          <div className="mt-4 pt-4 border-t border-ink/6">
            <div className="text-[11px] text-muted mb-1.5">Purpose</div>
            <p className="text-[14px] text-ink/80 leading-relaxed bg-paper rounded-xl px-4 py-3">{request.purpose}</p>
          </div>
        )}
      </Card>

      {request.allocations && request.allocations.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Layers size={15} className="text-ficium" />
            <span className="text-[12px] font-bold text-ficium uppercase tracking-wider">Portfolio breakdown</span>
          </div>
          <div className="space-y-2">
            {request.allocations.map(a => (
              <div key={a.productType} className="flex items-center justify-between px-3 py-2.5 bg-paper rounded-xl">
                <span className="text-[14px] font-medium text-ink">{formatProductType(a.productType)}</span>
                <span className="text-[14px] font-semibold text-ink">
                  {a.amount != null ? fmt(a.amount) : <span className="text-muted font-normal">Institution to decide</span>}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {profile && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <User size={15} className="text-ficium" />
            <span className="text-[12px] font-bold text-ficium uppercase tracking-wider">Your profile</span>
            <span className="ml-auto text-[10px] text-muted bg-ink/5 px-2 py-1 rounded-full">Shown anonymously to providers</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ProfileStat label="Credit Score"   value={profile.healthScore != null ? `${profile.healthScore}/100` : "—"} accent={profile.healthScore != null ? (profile.healthScore >= 70 ? "green" : profile.healthScore >= 50 ? "amber" : "red") : undefined} />
            <ProfileStat label="Affordability"  value={profile.affordabilityScore != null ? `${profile.affordabilityScore}/100` : "—"} accent={profile.affordabilityScore != null ? (profile.affordabilityScore >= 70 ? "green" : profile.affordabilityScore >= 50 ? "amber" : "red") : undefined} />
            <ProfileStat label="Monthly Income" value={profile.monthlyIncome ? fmt(profile.monthlyIncome) : "—"} />
            <ProfileStat label="Net Worth"      value={profile.totalNetWorth ? fmt(profile.totalNetWorth) : "—"} />
            <ProfileStat label="Country"        value={profile.country ?? "—"} />
            <ProfileStat label="Employment"     value={profile.employmentStatus?.replace(/_/g, " ") ?? "—"} />
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Percent size={15} className="text-ficium" />
          <span className="text-[12px] font-bold text-ficium uppercase tracking-wider">What to expect</span>
        </div>
        <div className="bg-paper rounded-xl px-4 py-4 text-[13px] text-ink/70 space-y-2">
          <p>Based on your profile, providers typically offer rates between <strong className="text-ink">7.5% – 12% APR</strong> for this product.</p>
          <p>A credit score above 70 usually attracts the most competitive offers.</p>
        </div>
      </Card>
    </div>
  );
}

/* ── No-bids / closed state ── */
function NoBidsState({
  requestId, status, bidCount,
}: {
  requestId: string; status: string; bidCount: number;
}) {
  const navigate = useNavigate();
  const [relisting, setRelisting] = useState(false);
  const [done, setDone]           = useState(false);

  const handleRelist = async () => {
    setRelisting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      const res = await fetch("/api/request-actions?action=relist", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId }),
      });
      if (res.ok) { setDone(true); setTimeout(() => navigate("/requests"), 2000); }
    } finally { setRelisting(false); }
  };

  if (done) return (
    <div className="mt-5 px-4 py-4 bg-green-50 border border-green-200 rounded-2xl text-center">
      <div className="text-[22px] mb-1">✓</div>
      <div className="font-semibold text-green-800 text-[13px]">Request relisted!</div>
      <div className="text-[12px] text-green-700 mt-0.5">Redirecting to your requests…</div>
    </div>
  );

  const isExpired  = status === "expired";
  const isRejected = status === "rejected";

  return (
    <div className="mt-5 space-y-3">
      {isRejected ? (
        <div className="px-4 py-4 bg-red-50 border border-red-200 rounded-2xl">
          <div className="font-semibold text-red-900 text-[14px] mb-1">Declined by the provider</div>
          <p className="text-[12px] text-red-800 leading-relaxed mb-3">
            The institution reviewing this request wasn't able to proceed with it.
            This isn't necessarily a reflection of your profile — you can post a
            similar request to reach other providers.
          </p>
          <button
            onClick={handleRelist}
            disabled={relisting}
            className="w-full py-3 rounded-xl text-[13px] font-bold text-white
                       transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#3536DC,#8231EC)" }}
          >
            {relisting ? "Relisting…" : "Try again with a new request"}
          </button>
        </div>
      ) : isExpired ? (
        <div className="px-4 py-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="font-semibold text-amber-900 text-[14px] mb-1">No bids received</div>
          <p className="text-[12px] text-amber-800 leading-relaxed mb-3">
            Your bid window closed without any offers. You can relist to give institutions
            another 72 hours to respond.
          </p>
          <ul className="text-[11px] text-amber-700 space-y-1 mb-4 pl-3">
            <li>• Consider increasing your max rate slightly</li>
            <li>• Complete any missing profile sections</li>
            <li>• Check that your dossier is fully verified</li>
          </ul>
          <button
            onClick={handleRelist}
            disabled={relisting}
            className="w-full py-3 rounded-xl text-[13px] font-bold text-white
                       transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#3536DC,#8231EC)" }}
          >
            {relisting ? "Relisting…" : "Relist my request"}
          </button>
        </div>
      ) : (
        <div className="px-4 py-3 bg-ink/4 border border-ink/10 rounded-2xl">
          <div className="font-semibold text-ink text-[13px] mb-0.5">Bid window closed</div>
          <p className="text-[12px] text-muted">
            {bidCount > 0
              ? `You have ${bidCount} offer${bidCount !== 1 ? "s" : ""} to review above.`
              : "No offers were received. You can relist to try again."}
          </p>
          {bidCount === 0 && (
            <button
              onClick={handleRelist}
              disabled={relisting}
              className="mt-3 w-full py-2.5 rounded-xl text-[12px] font-bold text-white
                         transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#3536DC,#8231EC)" }}
            >
              {relisting ? "Relisting…" : "Relist request"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Live countdown hook ── */
function useCountdown(deadline: string | null) {
  const [ms, setMs] = useState(() => deadline ? new Date(deadline).getTime() - Date.now() : null);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => setMs(new Date(deadline).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  if (ms === null || ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return { h, m, s, ms, urgent: ms < 2 * 3_600_000 };
}

/* ── Bids tab — side-by-side comparison + live countdown ── */
function BidsTab({ bids, request, isClosed, accepting, acceptingBid, onAccept }: {
  bids: Bid[];
  request: RequestDetailType;
  isClosed: boolean;
  accepting: boolean;
  acceptingBid: Bid | undefined;
  onAccept: (bid: Bid) => void;
}) {
  const [view, setView] = useState<"table" | "cards">(bids.length >= 2 ? "table" : "cards");
  const countdown  = useCountdown(request.decisionDeadline ?? null);
  const acceptedBid = bids.find(b => b.status === "accepted");

  // Sort bids: best rate first
  const sorted = [...bids].sort((a, b) => {
    const ra = a.source === "institution" ? a.rate * 100 : a.rate;
    const rb = b.source === "institution" ? b.rate * 100 : b.rate;
    return ra - rb;
  });

  return (
    <div>
      {/* Live countdown banner */}
      {!isClosed && countdown && (
        <div className={`flex items-center gap-3 px-4 py-3 mb-4 rounded-2xl border text-[12px] ${
          countdown.urgent
            ? "bg-red-50 border-red-200 text-red-700"
            : "bg-amber-50 border-amber-100 text-amber-700"
        }`}>
          <Clock size={14} className="shrink-0" />
          <span>Bidding closes in{" "}
            <strong className="tabular-nums">
              {countdown.h > 0 ? `${countdown.h}h ` : ""}{String(countdown.m).padStart(2,"0")}m {String(countdown.s).padStart(2,"0")}s
            </strong>
          </span>
        </div>
      )}
      {isClosed && !acceptedBid && (
        <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-2xl border bg-ink/4 border-ink/10 text-[12px] text-muted">
          <Clock size={14} className="shrink-0" />
          <span>Bid window closed</span>
        </div>
      )}

      {acceptedBid && (
        <div className="flex items-start gap-3 px-4 py-4 mb-5 bg-ficium/6 border border-ficium/20 rounded-2xl">
          <CheckCircle size={20} className="text-ficium shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold">Offer accepted</div>
            <div className="text-[13px] text-muted mt-0.5">
              You accepted {acceptedBid.institutionName}'s offer at{" "}
              {(acceptedBid.source === "institution" ? acceptedBid.rate * 100 : acceptedBid.rate).toFixed(2)}% APR.
            </div>
          </div>
        </div>
      )}

      {bids.length === 0 ? (
        <Card className="text-center py-10">
          <div className="w-12 h-12 rounded-2xl bg-ink/5 grid place-items-center mx-auto mb-3">
            <Clock size={22} className="text-muted" />
          </div>
          <div className="font-semibold mb-1">Awaiting offers</div>
          <div className="text-sm text-muted max-w-[240px] mx-auto">Providers will submit offers once they review your request.</div>
        </Card>
      ) : (
        <>
          {/* View toggle — only show if 2+ bids */}
          {bids.length >= 2 && (
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setView("table")}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all ${view === "table" ? "bg-ficium text-white" : "bg-ink/6 text-muted"}`}>
                Compare
              </button>
              <button onClick={() => setView("cards")}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all ${view === "cards" ? "bg-ficium text-white" : "bg-ink/6 text-muted"}`}>
                Cards
              </button>
            </div>
          )}

          {/* Comparison table */}
          {view === "table" && bids.length >= 2 ? (
            <div className="overflow-x-auto rounded-[18px] border border-ink/8 bg-white">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-ink/6">
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider">Provider</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider">Rate</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider">Amount</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider">Term</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider">Monthly</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider">Total cost</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((bid, i) => {
                    const annualRate  = bid.source === "institution" ? bid.rate : bid.rate / 100;
                    const monthly     = monthlyRepayment(bid.amountOffered, annualRate, bid.termMonths);
                    const totalCost   = monthly ? monthly * bid.termMonths : null;
                    const rateDisplay = (bid.source === "institution" ? bid.rate * 100 : bid.rate).toFixed(2);
                    const isBest      = i === 0;
                    const isAccepted  = bid.status === "accepted";
                    return (
                      <tr key={bid.id} className={`border-b border-ink/4 last:border-0 transition-colors ${isBest ? "bg-ficium/2" : "hover:bg-ink/2"}`}>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            {isBest && <span className="w-1.5 h-1.5 rounded-full bg-ficium shrink-0" />}
                            <span className="font-semibold text-ink">{bid.institutionName}</span>
                            {isBest && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-ficium text-white rounded-full">BEST</span>}
                            {isAccepted && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500 text-white rounded-full">ACCEPTED</span>}
                          </div>
                          <div className="text-[10px] text-muted mt-0.5 capitalize">{bid.rateType}</div>
                        </td>
                        <td className={`px-4 py-3.5 text-right font-bold ${isBest ? "text-ficium" : "text-ink"}`}>
                          {rateDisplay}%
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-ink">
                          {bid.amountOffered > 0 ? `MUR ${Number(bid.amountOffered).toLocaleString()}` : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-right text-muted">{bid.termMonths > 0 ? `${bid.termMonths}m` : "—"}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-ink">
                          {monthly ? `MUR ${Math.round(monthly).toLocaleString()}` : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-ink">
                          {totalCost ? `MUR ${Math.round(totalCost).toLocaleString()}` : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {!isClosed && !isAccepted && (
                            <Button size="sm" onClick={() => onAccept(bid)} loading={accepting && acceptingBid?.id === bid.id}>
                              Accept
                            </Button>
                          )}
                          {isAccepted && <span className="text-[11px] font-bold text-emerald-600">✓</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Card view */
            <div className="flex flex-col gap-3">
              {sorted.map((bid, i) => (
                <BidCard key={bid.id} bid={bid} rank={i + 1}
                  isBest={i === 0 && !isClosed} canAccept={!isClosed}
                  isAccepting={accepting && acceptingBid?.id === bid.id}
                  onAccept={() => onAccept(bid)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {isClosed && !acceptedBid && (
        <NoBidsState requestId={request.id} status={request.status} bidCount={bids.length} />
      )}
    </div>
  );
}

/* ── Phase 2 Reveal Modal ── */
function Phase2RevealModal({ reveal, onClose }: { reveal: Phase2Reveal; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-hero shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="relative px-6 pt-8 pb-6 text-center"
          style={{ background: "linear-gradient(135deg, #1B1B4B 0%, #3536DC 60%, #8231EC 100%)" }}>
          <div className="w-14 h-14 rounded-2xl bg-white/20 grid place-items-center mx-auto mb-4">
            <CheckCircle size={28} className="text-white" />
          </div>
          <h2 className="font-display text-[22px] font-extrabold text-white leading-tight">
            Offer accepted
          </h2>
          <p className="text-[13px] text-white/70 mt-1.5">
            Your identity has been securely shared with {reveal.institution_name}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Institution */}
          <div className="bg-paper rounded-2xl px-4 py-4">
            <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">
              Your new lender
            </div>
            <div className="font-display text-[18px] font-bold text-ink">
              {reveal.institution_name}
            </div>
            {reveal.legal_name && reveal.legal_name !== reveal.institution_name && (
              <div className="text-[12px] text-muted mt-0.5">{reveal.legal_name}</div>
            )}
          </div>

          {/* Contact details */}
          {(reveal.contact_person || reveal.contact_email || reveal.contact_phone) && (
            <div className="bg-paper rounded-2xl px-4 py-4 space-y-3">
              <div className="text-[10px] font-bold text-muted uppercase tracking-widest">
                Your relationship contact
              </div>
              {reveal.contact_person && (
                <div className="flex items-center gap-3">
                  <User size={14} className="text-ficium shrink-0" />
                  <span className="text-[14px] font-semibold text-ink">{reveal.contact_person}</span>
                </div>
              )}
              {reveal.contact_email && (
                <a href={`mailto:${reveal.contact_email}`}
                  className="flex items-center gap-3 group">
                  <MessageSquare size={14} className="text-ficium shrink-0" />
                  <span className="text-[13px] text-ficium group-hover:underline">{reveal.contact_email}</span>
                </a>
              )}
              {reveal.contact_phone && (
                <a href={`tel:${reveal.contact_phone}`}
                  className="flex items-center gap-3 group">
                  <AlertCircle size={14} className="text-ficium shrink-0" />
                  <span className="text-[13px] text-ficium group-hover:underline">{reveal.contact_phone}</span>
                </a>
              )}
            </div>
          )}

          {/* What happens next */}
          <div className="bg-ficium/4 border border-ficium/10 rounded-2xl px-4 py-3">
            <div className="text-[12px] text-ink/70 leading-relaxed">
              <strong className="text-ink">{reveal.institution_name}</strong> will contact
              you within <strong className="text-ink">2 business days</strong> to begin
              the loan processing. Please have your documents ready.
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl text-[15px] font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#3536DC,#8231EC)" }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main workspace ── */
export default function RequestDetail() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const [tab, setTab] = useState<TabId>("plan");
  const [reveal, setReveal] = useState<Phase2Reveal | null>(null);

  const { data: request, isLoading: reqLoading }    = useRequest(id!);
  const { data: bids = [], isLoading: bidsLoading } = useRequestBids(id!);
  const { data: profile }                            = useProfile();
  const { mutate: accept, isPending: accepting, variables: acceptingBid } = useAcceptBid(id!);
  useVault(); // preload vault docs so DocumentsTab renders instantly

  const isAccepted = request?.status === "accepted";

  const loading  = reqLoading || bidsLoading;
  const isClosed = request?.status !== "open";

  if (loading) return <LoadingSkeleton />;
  if (!request) return <NotFound />;

  const handleAccept = (bid: Bid) => {
    accept(bid, {
      onSuccess: (result) => {
        if (result.ok) setReveal(result.reveal);
      },
    });
  };

  return (
    <div className="min-h-screen bg-paper pb-28">

      {/* Hero header — brand ink radial + drifting blade */}
      <div className="relative overflow-hidden text-white" style={{ background: "radial-gradient(120% 160% at 8% 0%, #181842 0%, #0B0B1E 55%)" }}>
        <svg viewBox="0 0 310 153" aria-hidden
          className="absolute w-[300px] -top-12 -right-12 opacity-40 blur-[2px] motion-safe:animate-drift will-change-transform pointer-events-none">
          <defs>
            <linearGradient id="rdBladeB" x1="85" y1="79" x2="266" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#3536DC" /><stop offset="0.5" stopColor="#356EF4" /><stop offset="1" stopColor="#4C90F6" />
            </linearGradient>
            <linearGradient id="rdBladeP" x1="85" y1="141" x2="238" y2="91" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#3A148F" /><stop offset="1" stopColor="#8231EC" />
            </linearGradient>
          </defs>
          <path d="M 121.78,31.83 Q 131,20 146,20 L 251,20 Q 266,20 257.28,32.21 L 244.72,49.79 Q 236,62 221.09,63.68 L 99.91,77.32 Q 85,79 94.22,67.17 Z" fill="url(#rdBladeB)" />
          <path d="M 108.10,103.75 Q 116,91 131,91 L 223,91 Q 238,91 230.12,103.77 L 216.88,125.23 Q 209,138 194,138.36 L 100,140.64 Q 85,141 92.90,128.25 Z" fill="url(#rdBladeP)" />
        </svg>

        <div className="relative z-10 max-w-[680px] mx-auto px-4 sm:px-6 pt-8 pb-0">

          <button onClick={() => navigate("/requests")}
            className="flex items-center gap-1.5 text-[13px] text-white/70 hover:text-white mb-5">
            <ArrowLeft size={15} /> All requests
          </button>

          {/* Title */}
          <div className="flex items-center gap-3 mb-1">
            <div>
              <div className="text-[11px] font-bold text-white/60 uppercase tracking-widest">
                {formatProductType(request.productType)}
              </div>
              <h1 className="font-display text-[28px] sm:text-[34px] font-extrabold tracking-display leading-tight">
                {fmt(request.amount)}
              </h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className={["text-[11px] font-bold px-3 py-1.5 rounded-pill uppercase tracking-wide",
                request.status === "open" ? "bg-white/20 text-white" : "bg-white/10 text-white/60"].join(" ")}>
                {request.status}
              </span>
              <div className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-pill px-2.5 py-1">
                <Lock size={10} className="text-white/50" />
                <span className="text-[10px] text-white/50 font-medium">Anonymous</span>
              </div>
            </div>
          </div>
          <p className="text-[12px] text-white/50 mb-5">Submitted {fmtDate(request.createdAt)}</p>

          {/* Tabs */}
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6 pb-1">
            <div className="flex gap-1 border-t border-white/10 pt-2 w-max">
              {TABS.filter(t => !t.acceptedOnly || isAccepted).map(t => {
                const TabIcon = t.icon;
                const active  = tab === t.id;
                const badgeCount = t.id === "bids" ? bids.length : 0;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className="relative shrink-0 flex flex-col items-center gap-1.5 pt-2 pb-3 px-4 rounded-t-[10px] transition-all duration-200"
                    style={
                      active
                        ? { background: "rgba(255,255,255,0.10)", color: "#fff" }
                        : { background: "transparent", color: "rgba(255,255,255,0.38)" }
                    }
                  >
                    <div className="relative">
                      <TabIcon size={15} />
                      {badgeCount > 0 && (
                        <span className="absolute -top-1.5 -right-2.5 text-[9px] font-black px-1 py-0 rounded-full leading-tight"
                          style={{ background: "linear-gradient(135deg,#356EF4,#8231EC)", color: "#fff", minWidth: 14, textAlign: "center" }}>
                          {badgeCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">{t.label}</span>
                    {active && (
                      <span className="absolute bottom-0 left-3 right-3 h-[2.5px] rounded-pill"
                        style={{ background: "linear-gradient(90deg,#356EF4,#8231EC)" }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-[680px] mx-auto px-4 sm:px-6 pt-5">
        {tab === "plan"      && <PlanTab request={request} bidCount={bids.length} />}
        {tab === "documents" && <DocumentsTab />}
        {tab === "insights"  && <InsightsTab bids={bids} request={request} profile={profile} />}
        {tab === "details"   && <DetailsTab request={request} profile={profile} />}
        {tab === "bids"      && (
          <BidsTab
            bids={bids}
            request={request}
            isClosed={isClosed}
            accepting={accepting}
            acceptingBid={acceptingBid}
            onAccept={handleAccept}
          />
        )}
        {tab === "tracker"   && <TrackerTab requestId={id!} />}
        {tab === "chat"      && (
          <div className="rounded-2xl overflow-hidden border border-ink/8 bg-white" style={{ height: "520px", display: "flex", flexDirection: "column" }}>
            <RequestChat requestId={id!} senderType="client" client={supabase} height="flex-1" />
          </div>
        )}
      </div>

      <BottomNav />

      {reveal && (
        <Phase2RevealModal
          reveal={reveal}
          onClose={() => { setReveal(null); navigate("/requests"); }}
        />
      )}
    </div>
  );
}

/* ── Sub-components ── */
function BidCard({ bid, rank, isBest, canAccept, isAccepting, onAccept }: {
  bid: Bid; rank: number; isBest: boolean; canAccept: boolean; isAccepting: boolean; onAccept: () => void;
}) {
  const isAccepted  = bid.status === "accepted";
  const annualRate  = bid.source === "institution" ? bid.rate : bid.rate / 100;
  const monthly     = monthlyRepayment(bid.amountOffered, annualRate, bid.termMonths);

  return (
    <Card padded={false} className={["p-4", isBest ? "border-ficium/30 bg-ficium/2" : "", isAccepted ? "border-green-300 bg-green-50/50" : ""].join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={["w-8 h-8 rounded-full grid place-items-center text-xs font-bold shrink-0",
            isBest ? "bg-ficium text-white" : isAccepted ? "bg-green-500 text-white" : "bg-ink/10 text-muted"].join(" ")}>
            {isAccepted ? "✓" : `#${rank}`}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Building2 size={13} className="text-muted shrink-0" />
              <span className="text-[13px] font-semibold truncate">{bid.institutionName}</span>
              {isBest && <span className="text-[10px] font-bold px-2 py-0.5 bg-ficium text-white rounded-pill">Best rate</span>}
            </div>
            <div className="font-display text-2xl font-bold mt-0.5">
              {bid.source === "institution" ? (bid.rate * 100).toFixed(2) : bid.rate.toFixed(2)}%
              <span className="text-sm font-normal text-muted ml-1">{bid.rateType === "variable" ? "variable" : "fixed"} APR</span>
            </div>
            {bid.source === "institution" && bid.amountOffered > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                <div className="bg-paper rounded-lg px-3 py-1.5">
                  <div className="text-[9px] text-muted uppercase tracking-wide">Offered</div>
                  <div className="text-[12px] font-bold text-ink">MUR {Number(bid.amountOffered).toLocaleString()}</div>
                </div>
                {bid.termMonths > 0 && (
                  <div className="bg-paper rounded-lg px-3 py-1.5">
                    <div className="text-[9px] text-muted uppercase tracking-wide">Term</div>
                    <div className="text-[12px] font-bold text-ink">{bid.termMonths}m</div>
                  </div>
                )}
                {monthly !== null && (
                  <div className="bg-ficium/6 border border-ficium/15 rounded-lg px-3 py-1.5">
                    <div className="text-[9px] text-ficium uppercase tracking-wide font-bold">Monthly</div>
                    <div className="text-[12px] font-bold text-ficium">MUR {Math.round(monthly).toLocaleString()}</div>
                  </div>
                )}
              </div>
            )}
            {typeof bid.conditions?.notes === "string" && bid.conditions.notes && (
              <p className="text-xs text-muted mt-1 leading-relaxed bg-paper rounded-lg px-3 py-2">{bid.conditions.notes}</p>
            )}
            {/* Benefits */}
            {bid.benefits && bid.benefits.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {bid.benefits.map((benefit, idx) => (
                  <span
                    key={idx}
                    className={[
                      "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-pill",
                      benefit.is_guaranteed
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-surface text-muted border border-line",
                    ].join(" ")}
                  >
                    {benefit.is_guaranteed && <span className="text-amber-500">★</span>}
                    {benefit.title}
                    {benefit.value_display && (
                      <span className="font-normal opacity-70">· {benefit.value_display}</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {canAccept && !isAccepted && (
          <Button size="sm" onClick={onAccept} loading={isAccepting} className="shrink-0">Accept</Button>
        )}
        {isAccepted && (
          <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-pill shrink-0">Accepted</span>
        )}
      </div>
    </Card>
  );
}

function ProfileStat({ label, value, accent }: { label: string; value: string; accent?: "green" | "amber" | "red" }) {
  const valueCls = accent === "green" ? "text-green-600 font-bold" : accent === "amber" ? "text-amber-600 font-bold" : accent === "red" ? "text-red-500 font-bold" : "font-semibold text-ink";
  return (
    <div className="bg-paper rounded-xl px-3 py-2.5">
      <div className="text-[10px] text-muted mb-0.5">{label}</div>
      <div className={`text-[13px] capitalize ${valueCls}`}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted mb-0.5">{label}</div>
      <div className={bold ? "text-sm font-bold" : "text-sm font-semibold capitalize"}>{value}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-paper pb-24">
      <div className="mx-auto w-full max-w-[680px] px-5 py-6">
        <div className="h-4 w-16 bg-ink/10 rounded-sm mb-6 animate-pulse" />
        <div className="h-8 w-40 bg-ink/10 rounded-sm mb-2 animate-pulse" />
        {[0,1,2].map(i => <div key={i} className="h-24 bg-ink/10 rounded-xl mb-3 animate-pulse" />)}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3">🔍</div>
        <div className="font-display text-xl font-bold mb-2">Request not found</div>
        <Link to="/requests" className="text-sm text-ficium font-semibold no-underline">Back to requests</Link>
      </div>
    </div>
  );
}
