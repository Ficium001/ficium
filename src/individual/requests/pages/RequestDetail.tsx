// =============================================================
// Ficium — Request Workspace (/requests/:id)
// Unified 7-tab workspace: Plan | Documents | Insights | Details | Bids | Progress | Chat
// =============================================================
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Lock, CheckCircle, Clock, TrendingDown,
  Building2, AlertCircle, MessageSquare, FileText,
  User, Percent, LayoutGrid, Sparkles,
  BarChart3, CheckCircle2, MapPin,
} from "lucide-react";
import { TrackerTab } from "../tracker/tabs/TrackerTab";
import { formatProductType } from "../api/requests";
import type { Bid, RequestDetail as RequestDetailType, Phase2Reveal } from "../api/requests";
import { Button, Card, BottomNav } from "../../../shared/ui";
import RequestChat from "../../../shared/components/RequestChat";
import { supabase } from "../../../shared/lib/supabase";
import { useProfile } from "../../dashboard/hooks/useDashboard";
import { useRequest, useRequestBids, useAcceptBid } from "../hooks/useRequests";

/* ── Tab definition ── */
type TabId = "plan" | "documents" | "insights" | "details" | "bids" | "tracker" | "chat";
const TABS: { id: TabId; label: string; icon: React.ElementType; acceptedOnly?: boolean }[] = [
  { id: "plan",      label: "Plan",      icon: LayoutGrid   },
  { id: "documents", label: "Documents", icon: FileText     },
  { id: "insights",  label: "Insights",  icon: Sparkles     },
  { id: "details",   label: "Details",   icon: FileText     },
  { id: "bids",      label: "Bids",      icon: TrendingDown },
  { id: "tracker",   label: "Progress",  icon: MapPin, acceptedOnly: true },
  { id: "chat",      label: "Chat",      icon: MessageSquare},
];


/* ── Journey steps for Plan tab ── */
const JOURNEY_STEPS = ["Submitted", "Under Review", "Providers Bidding", "Offer Ready"];

/* ── Helpers ── */
const fmt     = (v: number) => v >= 1_000_000 ? `MUR ${(v/1_000_000).toFixed(1)}M` : `MUR ${Number(v).toLocaleString()}`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-MU", { day: "numeric", month: "short", year: "numeric" });

function monthlyRepayment(principal: number, annualRate: number, months: number): number | null {
  if (!principal || !annualRate || !months) return null;
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

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
            <p className="text-[14px] text-ink/80 leading-relaxed bg-paper rounded-xl px-4 py-3">{request.purpose}</p>
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

  const isExpired = status === "expired";

  return (
    <div className="mt-5 space-y-3">
      {isExpired ? (
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
        <div className="px-4 py-3 bg-ink/[0.04] border border-ink/10 rounded-2xl">
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

/* ── Bids tab ── */
function BidsTab({ bids, request, isClosed, accepting, acceptingBid, onAccept }: {
  bids: Bid[];
  request: RequestDetailType;
  isClosed: boolean;
  accepting: boolean;
  acceptingBid: Bid | undefined;
  onAccept: (bid: Bid) => void;
}) {
  const acceptedBid = bids.find(b => b.status === "accepted");
  const deadline    = request.decisionDeadline
    ? new Date(request.decisionDeadline)
    : null;
  const deadlineMs  = deadline ? deadline.getTime() - Date.now() : null;
  const deadlineFmt = deadline ? fmtDate(request.decisionDeadline!) : null;

  return (
    <div>
      {/* Bid window banner */}
      {!isClosed && deadlineFmt && (
        <div className={`flex items-center gap-3 px-4 py-3 mb-4 rounded-2xl border text-[12px] ${
          deadlineMs !== null && deadlineMs < 2 * 3_600_000
            ? "bg-red-50 border-red-200 text-red-700"
            : "bg-amber-50 border-amber-100 text-amber-700"
        }`}>
          <Clock size={14} className="flex-shrink-0" />
          <span>
            Bidding closes <strong>{deadlineFmt}</strong>
            {deadlineMs !== null && deadlineMs > 0 && deadlineMs < 48 * 3_600_000 && (
              <> · {Math.ceil(deadlineMs / 3_600_000)}h remaining</>
            )}
          </span>
        </div>
      )}
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
              isAccepting={accepting && acceptingBid?.id === bid.id}
              onAccept={() => onAccept(bid)}
            />
          ))}
        </div>
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-[28px] shadow-2xl overflow-hidden">

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
                  <User size={14} className="text-ficium flex-shrink-0" />
                  <span className="text-[14px] font-semibold text-ink">{reveal.contact_person}</span>
                </div>
              )}
              {reveal.contact_email && (
                <a href={`mailto:${reveal.contact_email}`}
                  className="flex items-center gap-3 group">
                  <MessageSquare size={14} className="text-ficium flex-shrink-0" />
                  <span className="text-[13px] text-ficium group-hover:underline">{reveal.contact_email}</span>
                </a>
              )}
              {reveal.contact_phone && (
                <a href={`tel:${reveal.contact_phone}`}
                  className="flex items-center gap-3 group">
                  <AlertCircle size={14} className="text-ficium flex-shrink-0" />
                  <span className="text-[13px] text-ficium group-hover:underline">{reveal.contact_phone}</span>
                </a>
              )}
            </div>
          )}

          {/* What happens next */}
          <div className="bg-ficium/[0.04] border border-ficium/10 rounded-2xl px-4 py-3">
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
          <div className="flex border-t border-white/10 overflow-x-auto">
            {TABS.filter(t => !t.acceptedOnly || isAccepted).map(t => {
              const TabIcon = t.icon;
              const active  = tab === t.id;
              const badgeCount = t.id === "bids" ? bids.length : 0;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={["relative flex-shrink-0 flex flex-col items-center gap-1 py-3 px-3 text-[10px] font-bold uppercase tracking-widest transition-all",
                    active ? "text-white" : "text-white/40 hover:text-white/70"].join(" ")}>
                  <TabIcon size={14} />
                  {t.label}{badgeCount > 0 ? ` (${badgeCount})` : ""}
                  {active && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-pill"
                      style={{ background: "linear-gradient(90deg,#356EF4,#8231EC)" }} />
                  )}
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
            request={request}
            isClosed={isClosed}
            accepting={accepting}
            acceptingBid={acceptingBid}
            onAccept={handleAccept}
          />
        )}
        {tab === "tracker"   && <TrackerTab requestId={id!} />}
        {tab === "chat"      && (
          <div className="rounded-2xl overflow-hidden border border-ink/[0.08] bg-white" style={{ height: "520px", display: "flex", flexDirection: "column" }}>
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
                  <div className="bg-ficium/[0.06] border border-ficium/15 rounded-lg px-3 py-1.5">
                    <div className="text-[9px] text-ficium uppercase tracking-wide font-bold">Monthly</div>
                    <div className="text-[12px] font-bold text-ficium">MUR {Math.round(monthly).toLocaleString()}</div>
                  </div>
                )}
              </div>
            )}
            {typeof bid.conditions?.notes === "string" && bid.conditions.notes && (
              <p className="text-xs text-muted mt-1 leading-relaxed bg-paper rounded-lg px-3 py-2">{bid.conditions.notes}</p>
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
        <div className="h-4 w-16 bg-ink/10 rounded mb-6 animate-pulse" />
        <div className="h-8 w-40 bg-ink/10 rounded mb-2 animate-pulse" />
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
