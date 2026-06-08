// =============================================================
// Ficium — Request Workspace (/requests/:id)
// Unified 6-tab workspace: Plan | Documents | Insights | Details | Bids | Chat
// =============================================================
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Lock, CheckCircle, Clock, TrendingDown,
  Building2, AlertCircle, MessageSquare, FileText,
  User, Percent, LayoutGrid, Sparkles, Send,
  BarChart3, CheckCircle2, Loader2,
} from "lucide-react";
import { useRequest, useRequestBids, useAcceptBid } from "../hooks/useRequests";
import { formatProductType } from "../api/requests";
import type { Bid, RequestDetail as RequestDetailType } from "../api/requests";
import { Button, Card, BottomNav } from "../../../shared/ui";
import RequestChat from "../../../shared/components/RequestChat";
import { supabase } from "../../../shared/lib/supabase";
import { useProfile } from "../../dashboard/hooks/useDashboard";

/* ── Tab definition ── */
type TabId = "plan" | "documents" | "insights" | "details" | "bids" | "chat";
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "plan",      label: "Plan",      icon: LayoutGrid   },
  { id: "documents", label: "Documents", icon: FileText     },
  { id: "insights",  label: "Insights",  icon: Sparkles     },
  { id: "details",   label: "Details",   icon: FileText     },
  { id: "bids",      label: "Bids",      icon: TrendingDown },
  { id: "chat",      label: "Chat",      icon: MessageSquare},
];

/* ── Product → gradient ── */
const PRODUCT_GRADIENT: Record<string, { from: string; to: string }> = {
  mortgage:           { from: "#c47b2b", to: "#7a4a1e" },
  personal_loan:      { from: "#0ea5e9", to: "#0369a1" },
  credit_card:        { from: "#db2777", to: "#9d174d" },
  leasing:            { from: "#4b5563", to: "#1f2937" },
  business_loan:      { from: "#7c3aed", to: "#4c1d95" },
  sme_loan:           { from: "#7c3aed", to: "#4c1d95" },
  fixed_deposit:      { from: "#d97706", to: "#92400e" },
  investment_account: { from: "#0f0c29", to: "#2A1FE6" },
  overdraft:          { from: "#dc2626", to: "#991b1b" },
};

function getGradient(type: string) {
  return PRODUCT_GRADIENT[type] ?? { from: "#6b7280", to: "#374151" };
}

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
      <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-sm p-5">
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
      <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-sm p-5">
        <div className="text-[12px] font-bold text-muted uppercase tracking-widest mb-4">Application journey</div>
        <div className="relative flex items-start justify-between">
          <div className="absolute top-5 left-5 right-5 h-1 bg-ink/[0.08] rounded-pill" />
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
        <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-sm p-5">
          <div className="text-[12px] font-bold text-muted uppercase tracking-widest mb-3">Your answers</div>
          <div className="space-y-2">
            {purposeFields.map(({ key, value }) => (
              <div key={key} className="flex items-start justify-between gap-4 py-2 border-b border-ink/[0.05] last:border-0">
                <span className="text-[12px] text-muted font-medium capitalize w-36 flex-shrink-0">{key}</span>
                <span className="text-[13px] font-semibold text-ink text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waiting / offers */}
      {bidCount === 0 ? (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <Clock size={16} className="text-amber-600 flex-shrink-0" />
          <div>
            <div className="text-[14px] font-bold text-amber-800">Waiting for offers</div>
            <div className="text-[12px] text-amber-600 mt-0.5">Providers typically respond within 24 hours.</div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
          <Building2 size={16} className="text-emerald-600 flex-shrink-0" />
          <div>
            <div className="text-[14px] font-bold text-emerald-800">{bidCount} offer{bidCount !== 1 ? "s" : ""} received</div>
            <div className="text-[12px] text-emerald-600 mt-0.5">Go to the Bids tab to compare and accept.</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Documents tab ── */
function DocumentsTab() {
  const navigate = useNavigate();
  const docs = [
    { label: "Payslips (last 3)",           status: "verified" as const },
    { label: "Bank Statements (6 months)",  status: "verified" as const },
    { label: "NIC / Passport",              status: "verified" as const },
    { label: "Proof of Address",            status: "missing"  as const },
  ];
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[12px] font-bold text-muted uppercase tracking-widest">Document vault</div>
          <div className="text-[11px] font-semibold text-amber-600">
            {docs.filter(d => d.status === "missing").length} missing
          </div>
        </div>
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.label} className={["flex items-center justify-between p-3 rounded-xl border",
              doc.status === "verified" ? "border-emerald-100 bg-emerald-50/50" : "border-amber-100 bg-amber-50/50"].join(" ")}>
              <div className="flex items-center gap-3">
                <FileText size={16} className={doc.status === "verified" ? "text-emerald-600" : "text-amber-500"} />
                <span className="text-[13px] font-medium text-ink">{doc.label}</span>
              </div>
              {doc.status === "verified"
                ? <span className="text-[11px] font-bold text-emerald-600">✓ Verified</span>
                : <button className="text-[11px] font-bold text-amber-600 underline">Upload</button>}
            </div>
          ))}
        </div>
      </div>
      <button onClick={() => navigate("/onboarding/dossier")}
        className="w-full py-3.5 rounded-2xl text-[14px] font-semibold text-ficium border-2 border-ficium/20 hover:bg-ficium/[0.04] transition-colors">
        Manage full dossier →
      </button>
    </div>
  );
}

/* ── Insights tab ── */
function InsightsTab() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div className="bg-ficium/[0.04] border border-ficium/[0.12] rounded-[18px] px-5 py-4 flex items-start gap-3">
        <Sparkles size={18} className="text-ficium mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-[12px] font-bold text-ficium uppercase tracking-widest mb-1">AI Coach</div>
          <p className="text-[13px] text-ink/80 leading-relaxed">
            Your debt-to-income ratio is healthy. Rates have dropped this month — now is a strong window to send your request to more providers.
          </p>
        </div>
      </div>
      <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-sm p-5 space-y-3">
        <div className="text-[12px] font-bold text-muted uppercase tracking-widest">Market signals</div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
          <BarChart3 size={16} className="text-emerald-600 flex-shrink-0" />
          <span className="text-[13px] font-medium text-ink">Mortgage rates dropped 0.25% this month</span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
          <Building2 size={16} className="text-blue-600 flex-shrink-0" />
          <span className="text-[13px] font-medium text-ink">MCB currently has the most competitive rates</span>
        </div>
      </div>
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
          <div className="mt-4 pt-4 border-t border-ink/[0.06]">
            <div className="text-[11px] text-muted mb-1.5">Purpose</div>
            <p className="text-[14px] text-ink/80 leading-relaxed bg-cream rounded-xl px-4 py-3">{request.purpose}</p>
          </div>
        )}
      </Card>

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
        <div className="bg-cream rounded-xl px-4 py-4 text-[13px] text-ink/70 space-y-2">
          <p>Based on your profile, providers typically offer rates between <strong className="text-ink">7.5% – 12% APR</strong> for this product.</p>
          <p>A credit score above 70 usually attracts the most competitive offers.</p>
        </div>
      </Card>
    </div>
  );
}

/* ── Bids tab ── */
function BidsTab({ bids, isClosed, accepting, acceptingBidId, onAccept }: {
  bids: Bid[];
  isClosed: boolean;
  accepting: boolean;
  acceptingBidId: string | undefined;
  onAccept: (bidId: string) => void;
}) {
  const acceptedBid = bids.find(b => b.status === "accepted");
  return (
    <div>
      {acceptedBid && (
        <div className="flex items-start gap-3 px-4 py-4 mb-5 bg-ficium/[0.06] border border-ficium/20 rounded-2xl">
          <CheckCircle size={20} className="text-ficium flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold">Offer accepted</div>
            <div className="text-[13px] text-muted mt-0.5">
              You accepted {acceptedBid.institutionName}'s offer at {acceptedBid.source === "institution" ? (acceptedBid.rate * 100).toFixed(2) : acceptedBid.rate.toFixed(2)}% APR.
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
        <div className="flex flex-col gap-3">
          {bids.map((bid, i) => (
            <BidCard key={bid.id} bid={bid} rank={i + 1}
              isBest={i === 0 && !isClosed} canAccept={!isClosed}
              isAccepting={accepting && acceptingBidId === bid.id}
              onAccept={() => onAccept(bid.id)}
            />
          ))}
        </div>
      )}
      {isClosed && !acceptedBid && (
        <div className="flex items-start gap-3 mt-5 px-4 py-3 bg-ink/[0.04] border border-ink/10 rounded-xl">
          <AlertCircle size={18} className="text-muted flex-shrink-0 mt-0.5" />
          <p className="text-[13px] text-muted">This request is closed.</p>
        </div>
      )}
    </div>
  );
}

/* ── Main workspace ── */
export default function RequestDetail() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const [tab, setTab] = useState<TabId>("plan");

  const { data: request, isLoading: reqLoading }    = useRequest(id!);
  const { data: bids = [], isLoading: bidsLoading } = useRequestBids(id!);
  const { data: profile }                            = useProfile();
  const { mutate: accept, isPending: accepting, variables: acceptingBidId } = useAcceptBid(id!);

  const loading  = reqLoading || bidsLoading;
  const isClosed = request?.status !== "open";
  const gradient = request ? getGradient(request.productType) : { from: "#6b7280", to: "#374151" };

  if (loading) return <LoadingSkeleton />;
  if (!request) return <NotFound />;

  return (
    <div className="min-h-screen bg-cream pb-28">

      {/* Gradient header */}
      <div style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}>
        <div className="max-w-[680px] mx-auto px-4 sm:px-6 pt-8 pb-0">

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
              <h1 className="font-display text-[28px] sm:text-[34px] font-extrabold text-white leading-tight">
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
          <div className="flex border-t border-white/10 overflow-x-auto">
            {TABS.map(t => {
              const TabIcon = t.icon;
              const active  = tab === t.id;
              const badgeCount = t.id === "bids" ? bids.length : 0;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={["flex-shrink-0 flex flex-col items-center gap-1 py-3 px-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2",
                    active ? "text-white border-white" : "text-white/40 border-transparent hover:text-white/70"].join(" ")}>
                  <TabIcon size={14} />
                  {t.label}{badgeCount > 0 ? ` (${badgeCount})` : ""}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-[680px] mx-auto px-4 sm:px-6 pt-5">
        {tab === "plan"      && <PlanTab request={request} bidCount={bids.length} />}
        {tab === "documents" && <DocumentsTab />}
        {tab === "insights"  && <InsightsTab />}
        {tab === "details"   && <DetailsTab request={request} profile={profile} />}
        {tab === "bids"      && (
          <BidsTab
            bids={bids}
            isClosed={isClosed}
            accepting={accepting}
            acceptingBidId={acceptingBidId}
            onAccept={(bidId) => accept(bidId, { onSuccess: () => navigate("/requests") })}
          />
        )}
        {tab === "chat"      && (
          <div className="rounded-2xl overflow-hidden border border-ink/[0.08] bg-white" style={{ height: "520px", display: "flex", flexDirection: "column" }}>
            <RequestChat requestId={id!} senderType="client" client={supabase} height="flex-1" />
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

/* ── Sub-components ── */
function BidCard({ bid, rank, isBest, canAccept, isAccepting, onAccept }: {
  bid: Bid; rank: number; isBest: boolean; canAccept: boolean; isAccepting: boolean; onAccept: () => void;
}) {
  const isAccepted = bid.status === "accepted";
  return (
    <Card padded={false} className={["p-4", isBest ? "border-ficium/30 bg-ficium/[0.02]" : "", isAccepted ? "border-green-300 bg-green-50/50" : ""].join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={["w-8 h-8 rounded-full grid place-items-center text-xs font-bold flex-shrink-0",
            isBest ? "bg-ficium text-white" : isAccepted ? "bg-green-500 text-white" : "bg-ink/10 text-muted"].join(" ")}>
            {isAccepted ? "✓" : `#${rank}`}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Building2 size={13} className="text-muted flex-shrink-0" />
              <span className="text-[13px] font-semibold truncate">{bid.institutionName}</span>
              {isBest && <span className="text-[10px] font-bold px-2 py-0.5 bg-ficium text-white rounded-pill">Best rate</span>}
            </div>
            <div className="font-display text-2xl font-bold mt-0.5">
              {bid.source === "institution" ? (bid.rate * 100).toFixed(2) : bid.rate.toFixed(2)}%
              <span className="text-sm font-normal text-muted ml-1">{bid.rateType === "variable" ? "variable" : "fixed"} APR</span>
            </div>
            {bid.source === "institution" && bid.amountOffered > 0 && (
              <div className="flex gap-3 mt-2">
                <div className="bg-cream rounded-lg px-3 py-1.5">
                  <div className="text-[9px] text-muted uppercase tracking-wide">Offered</div>
                  <div className="text-[12px] font-bold text-ink">MUR {Number(bid.amountOffered).toLocaleString()}</div>
                </div>
                {bid.termMonths > 0 && (
                  <div className="bg-cream rounded-lg px-3 py-1.5">
                    <div className="text-[9px] text-muted uppercase tracking-wide">Term</div>
                    <div className="text-[12px] font-bold text-ink">{bid.termMonths}m</div>
                  </div>
                )}
              </div>
            )}
            {typeof bid.conditions?.notes === "string" && bid.conditions.notes && (
              <p className="text-xs text-muted mt-1 leading-relaxed bg-cream rounded-lg px-3 py-2">{bid.conditions.notes}</p>
            )}
          </div>
        </div>
        {canAccept && !isAccepted && (
          <Button size="sm" onClick={onAccept} loading={isAccepting} className="flex-shrink-0">Accept</Button>
        )}
        {isAccepted && (
          <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-pill flex-shrink-0">Accepted</span>
        )}
      </div>
    </Card>
  );
}

function ProfileStat({ label, value, accent }: { label: string; value: string; accent?: "green" | "amber" | "red" }) {
  const valueCls = accent === "green" ? "text-green-600 font-bold" : accent === "amber" ? "text-amber-600 font-bold" : accent === "red" ? "text-red-500 font-bold" : "font-semibold text-ink";
  return (
    <div className="bg-cream rounded-xl px-3 py-2.5">
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
    <div className="min-h-screen bg-cream pb-24">
      <div className="mx-auto w-full max-w-[680px] px-5 py-6">
        <div className="h-4 w-16 bg-ink/10 rounded mb-6 animate-pulse" />
        <div className="h-8 w-40 bg-ink/10 rounded mb-2 animate-pulse" />
        {[0,1,2].map(i => <div key={i} className="h-24 bg-ink/10 rounded-xl mb-3 animate-pulse" />)}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3">🔍</div>
        <div className="font-display text-xl font-bold mb-2">Request not found</div>
        <Link to="/requests" className="text-sm text-ficium font-semibold no-underline">Back to requests</Link>
      </div>
    </div>
  );
}
