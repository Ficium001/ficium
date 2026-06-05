// =============================================================
// Ficium — Journey Workspace (/journeys/:id)
// Tabs: Overview | Progress | Tasks | Documents | Offers | AI Coach
// =============================================================
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, Circle, Upload, Building2,
  Sparkles, FileText, TrendingUp, MessageCircle, Send, Loader2,
  Home, Car, GraduationCap, Plane, Briefcase,
} from "lucide-react";
import { useJourney, useJourneyTasks, useCompleteTask, type JourneyType } from "@/individual/journeys/hooks/useJourneys";
import { useDocuments, useUploadDocument } from "@/individual/documents/hooks/useDocuments";
import { BottomNav } from "@/shared/ui";
import { useProfile } from "@/individual/dashboard/hooks/useDashboard";
import { useMyRequests } from "@/individual/dashboard/hooks/useDashboard";
import { askClaude, type ClaudeMessage } from "@/shared/lib/claude";

type Tab = "overview" | "tasks" | "documents" | "offers" | "ai";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview",   label: "Overview",   icon: TrendingUp      },
  { id: "tasks",      label: "Tasks",      icon: CheckCircle2    },
  { id: "documents",  label: "Documents",  icon: FileText        },
  { id: "offers",     label: "Offers",     icon: Building2       },
  { id: "ai",         label: "AI Coach",   icon: MessageCircle   },
];

const TYPE_GRADIENT: Record<JourneyType, string> = {
  mortgage:   "from-[#c47b2b] to-[#7a4a1e]",
  vehicle:    "from-[#4b5563] to-[#1f2937]",
  investment: "from-[#0f0c29] to-[#2A1FE6]",
  education:  "from-[#059669] to-[#065f46]",
  travel:     "from-[#0ea5e9] to-[#0369a1]",
  business:   "from-[#7c3aed] to-[#4c1d95]",
};
const TYPE_ICON: Record<JourneyType, React.ElementType> = {
  mortgage: Home, vehicle: Car, investment: TrendingUp,
  education: GraduationCap, travel: Plane, business: Briefcase,
};
const TYPE_CTA: Record<JourneyType, { label: string; route: string }> = {
  mortgage:   { label: "Compare Mortgage Offers",  route: "/requests/new?type=mortgage"          },
  vehicle:    { label: "See Financing Options",     route: "/requests/new?type=leasing"           },
  investment: { label: "View Matched Products",     route: "/requests/new?type=investment_account"},
  education:  { label: "Find Education Financing",  route: "/requests/new?type=personal_loan"     },
  travel:     { label: "See Savings Options",       route: "/requests/new?type=personal_loan"     },
  business:   { label: "See SME Financing",         route: "/requests/new?type=business_loan"     },
};

export default function JourneyWorkspace() {
  const { id }    = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");

  const { data: journey, isLoading } = useJourney(id!);
  const { data: profile } = useProfile();
  const { data: requests = [] } = useMyRequests();

  if (isLoading) return <LoadingScreen />;
  if (!journey)  return <NotFound onBack={() => navigate("/journeys")} />;

  const gradient = TYPE_GRADIENT[journey.type] ?? "from-[#0f0c29] to-[#2A1FE6]";
  const Icon     = TYPE_ICON[journey.type] ?? Home;
  const cta      = TYPE_CTA[journey.type];
  const fmt      = (n?: number) => n ? `Rs ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}` : "—";
  const linkedRequest = journey.requestId ? requests.find(r => r.id === journey.requestId) : null;

  return (
    <div className="min-h-screen bg-cream pb-28">

      {/* Header */}
      <div className={`bg-gradient-to-br ${gradient}`}>
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 pt-8 pb-6">
          <button onClick={() => navigate("/journeys")}
            className="flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white mb-5">
            <ArrowLeft size={15} /> My journeys
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 grid place-items-center flex-shrink-0">
              <Icon size={26} className="text-white" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-0.5">{journey.type}</div>
              <h1 className="font-display text-[22px] sm:text-[28px] font-extrabold text-white">{journey.title}</h1>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-[900px] mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-px">
            {TABS.map(({ id: tid, label, icon: TIcon }) => (
              <button key={tid} onClick={() => setTab(tid)}
                className={["flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-[12px] font-semibold whitespace-nowrap transition-all",
                  tab === tid ? "bg-cream text-ficium" : "text-white/60 hover:text-white"].join(" ")}>
                <TIcon size={13} />{label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <>
            {/* AI Results grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {journey.aiResults.affordability !== undefined && (
                <MetricCard label="Affordability" value={`${journey.aiResults.affordability}%`} color="#2A1FE6" />
              )}
              {journey.aiResults.eligibility !== undefined && (
                <MetricCard label="Eligibility" value={`${journey.aiResults.eligibility}%`} color="#059669" />
              )}
              {journey.aiResults.monthlyRepayment && (
                <MetricCard label="Monthly Repayment" value={fmt(journey.aiResults.monthlyRepayment)} />
              )}
              {journey.aiResults.banksMatched !== undefined && (
                <MetricCard label="Banks Matched" value={`${journey.aiResults.banksMatched}`} color="#d97706" />
              )}
              {journey.aiResults.depositGap !== undefined && (
                <MetricCard label="Deposit Gap" value={fmt(journey.aiResults.depositGap)} />
              )}
              {journey.aiResults.fundingGap !== undefined && (
                <MetricCard label="Funding Gap" value={fmt(journey.aiResults.fundingGap)} />
              )}
              {journey.aiResults.projectedValue && (
                <MetricCard label="Projected Value" value={fmt(journey.aiResults.projectedValue)} color="#059669" />
              )}
            </div>

            {/* AI Summary */}
            {journey.aiResults.summary && (
              <div className="bg-ficium/[0.04] border border-ficium/[0.12] rounded-[18px] px-5 py-4 flex items-start gap-3">
                <Sparkles size={16} className="text-ficium flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-ink/80 leading-relaxed">{journey.aiResults.summary}</p>
              </div>
            )}

            {/* Action plan */}
            {journey.aiResults.actionPlan?.length && (
              <div className="bg-white rounded-[18px] border border-ink/[0.06] p-4">
                <div className="text-[11px] font-bold text-muted uppercase tracking-widest mb-3">Action Plan</div>
                <div className="space-y-2">
                  {journey.aiResults.actionPlan.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 text-[13px] text-ink/80">
                      <span className="w-6 h-6 rounded-full bg-ficium/10 text-ficium text-[11px] font-bold grid place-items-center flex-shrink-0 mt-0.5">{i+1}</span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Primary CTA */}
            {!linkedRequest && (
              <button onClick={() => navigate(cta.route)}
                className="w-full py-4 rounded-2xl text-[15px] font-bold text-white bg-ficium shadow-ficium hover:opacity-90">
                {cta.label}
              </button>
            )}
            {linkedRequest && (
              <button onClick={() => navigate(`/requests/${linkedRequest.id}`)}
                className="w-full py-4 rounded-2xl text-[15px] font-bold text-white bg-emerald-600 shadow-sm hover:opacity-90">
                View Bank Offers ({linkedRequest.bidCount} bids)
              </button>
            )}
          </>
        )}

        {/* ── TASKS ── */}
        {tab === "tasks" && <TasksTab journeyId={id!} onNavigate={navigate} />}

        {/* ── DOCUMENTS ── */}
        {tab === "documents" && <DocumentsTab journeyId={id!} />}

        {/* ── OFFERS ── */}
        {tab === "offers" && (
          <div className="bg-white rounded-[22px] border border-ink/[0.06] p-6 text-center">
            <Building2 size={32} className="text-ficium mx-auto mb-3" />
            <h3 className="font-display text-[18px] font-bold text-ink mb-2">
              {linkedRequest ? `${linkedRequest.bidCount} banks competing` : "No offers yet"}
            </h3>
            <p className="text-muted text-[13px] mb-5">
              {linkedRequest ? "Click below to compare all bank offers." : "Post your request to start receiving offers from banks."}
            </p>
            <button
              onClick={() => linkedRequest ? navigate(`/requests/${linkedRequest.id}`) : navigate(cta.route)}
              className="bg-ficium text-white px-6 py-3 rounded-xl text-[14px] font-bold shadow-ficium">
              {linkedRequest ? "Compare Offers" : cta.label}
            </button>
          </div>
        )}

        {/* ── AI COACH ── */}
        {tab === "ai" && <AICoachTab journeyTitle={journey.title} profile={profile} aiResults={journey.aiResults} />}

      </div>

      <BottomNav />
    </div>
  );
}

// ── Tasks tab ─────────────────────────────────────────────────
function TasksTab({ journeyId, onNavigate }: { journeyId: string; onNavigate: (to: string) => void }) {
  const { data: tasks = [], isLoading } = useJourneyTasks(journeyId);
  const { mutate: complete } = useCompleteTask(journeyId);
  const done = tasks.filter(t => t.status === "done").length;

  if (isLoading) return <div className="h-32 bg-white rounded-[18px] animate-pulse" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-muted">{done}/{tasks.length} completed</div>
        <div className="w-32 h-1.5 bg-ink/[0.07] rounded-full overflow-hidden">
          <div className="h-full bg-ficium rounded-full transition-all" style={{ width: `${tasks.length ? (done/tasks.length)*100 : 0}%` }} />
        </div>
      </div>
      {tasks.map((task) => (
        <div key={task.id} className={["bg-white rounded-[18px] border p-4 flex items-start gap-4",
          task.status === "done" ? "border-emerald-200 bg-emerald-50/50" : "border-ink/[0.06]"].join(" ")}>
          <button onClick={() => task.status !== "done" && complete(task.id)}
            className="mt-0.5 flex-shrink-0">
            {task.status === "done"
              ? <CheckCircle2 size={20} className="text-emerald-500" />
              : <Circle size={20} className="text-ink/30 hover:text-ficium transition-colors" />}
          </button>
          <div className="flex-1">
            <div className={["text-[13px] font-bold", task.status === "done" ? "text-muted line-through" : "text-ink"].join(" ")}>
              {task.title}
            </div>
            {task.description && <div className="text-[11px] text-muted mt-0.5">{task.description}</div>}
          </div>
          {task.type === "upload" && task.status !== "done" && (
            <button onClick={() => onNavigate("/documents")}
              className="flex items-center gap-1 text-[11px] font-semibold text-ficium bg-ficium/10 px-2.5 py-1.5 rounded-lg flex-shrink-0">
              <Upload size={11} /> Upload
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Documents tab ─────────────────────────────────────────────
function DocumentsTab({ journeyId }: { journeyId: string }) {
  const { data: docs = [] } = useDocuments(journeyId);
  const { mutate: upload, isPending } = useUploadDocument();

  return (
    <div className="space-y-3">
      <label className="flex items-center justify-center gap-2 w-full py-3.5 border-2 border-dashed border-ficium/30 rounded-[18px] bg-ficium/[0.03] text-ficium text-[13px] font-semibold cursor-pointer hover:bg-ficium/[0.06] transition-colors">
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
        {isPending ? "Uploading…" : "Upload document"}
        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload({ file, journeyId, type: "other", label: file.name });
          }}
        />
      </label>

      {docs.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-ink/[0.06] p-8 text-center">
          <FileText size={28} className="text-muted mx-auto mb-2" />
          <p className="text-[13px] text-muted">No documents uploaded yet.</p>
        </div>
      ) : (
        docs.map((doc) => (
          <div key={doc.id} className="bg-white rounded-[18px] border border-ink/[0.06] p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-ficium/10 grid place-items-center flex-shrink-0">
              <FileText size={18} className="text-ficium" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-ink truncate">{doc.label}</div>
              <div className="text-[11px] text-muted">{doc.type} · {new Date(doc.createdAt).toLocaleDateString("en-MU")}</div>
            </div>
            {doc.verified && <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />}
          </div>
        ))
      )}
    </div>
  );
}

// ── AI Coach tab ──────────────────────────────────────────────
function AICoachTab({ journeyTitle, profile, aiResults }: {
  journeyTitle: string;
  profile: ReturnType<typeof useProfile>["data"];
  aiResults: Record<string, unknown>;
}) {
  const [messages, setMessages] = useState<ClaudeMessage[]>([{
    role: "assistant",
    content: `I'm your AI coach for your "${journeyTitle}" journey. I have full visibility of your financial profile and journey calculations. What would you like to know?`,
  }]);
  const [input,    setInput]    = useState("");
  const [thinking, setThinking] = useState(false);

  const profileCtx = profile
    ? `User profile: Monthly income Rs ${profile.monthlyIncome ?? 0}, Health score: ${profile.healthScore ?? 0}, KYC: ${profile.kycStatus}. Journey: ${journeyTitle}. AI results: ${JSON.stringify(aiResults)}.`
    : "";

  const send = async () => {
    if (!input.trim() || thinking) return;
    const userMsg: ClaudeMessage = { role: "user", content: input };
    const history: ClaudeMessage[] = [
      { role: "user", content: `Context: ${profileCtx}` },
      { role: "assistant", content: "Understood. I'll use this context to provide personalized advice." },
      ...messages,
      userMsg,
    ];
    setMessages(p => [...p, userMsg]);
    setInput("");
    setThinking(true);
    try {
      const reply = await askClaude(history);
      setMessages(p => [...p, { role: "assistant", content: reply }]);
    } catch { setMessages(p => [...p, { role: "assistant", content: "Sorry, I couldn't connect right now." }]); }
    setThinking(false);
  };

  const CHIPS = ["Can I afford this?", "What documents do I need?", "Which bank is best for me?", "What are my next steps?"];

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-[22px] border border-ink/[0.06] overflow-hidden">
        <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={["flex gap-3", m.role === "user" ? "justify-end" : ""].join(" ")}>
              {m.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-ficium/10 grid place-items-center flex-shrink-0 mt-0.5">
                  <Sparkles size={14} className="text-ficium" />
                </div>
              )}
              <div className={["max-w-[80%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed",
                m.role === "user" ? "bg-ficium text-white rounded-tr-sm" : "bg-cream text-ink rounded-tl-sm"].join(" ")}>
                {m.content}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-ficium/10 grid place-items-center flex-shrink-0">
                <Sparkles size={14} className="text-ficium animate-pulse" />
              </div>
              <div className="bg-cream rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-ficium/40 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
              </div>
            </div>
          )}
        </div>

        {/* Quick chips */}
        <div className="flex gap-2 px-4 py-2 border-t border-ink/[0.05] overflow-x-auto scrollbar-hide">
          {CHIPS.map(c => (
            <button key={c} onClick={() => { setInput(c); }}
              className="text-[11px] font-semibold text-ficium bg-ficium/10 px-3 py-1.5 rounded-pill whitespace-nowrap flex-shrink-0 hover:bg-ficium/20">
              {c}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-ink/[0.05]">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Ask anything about your journey…"
            className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-muted/50 outline-none"
          />
          <button onClick={send} disabled={!input.trim() || thinking}
            className="w-8 h-8 rounded-full bg-ficium grid place-items-center disabled:opacity-40">
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Micro-components ──────────────────────────────────────────
function MetricCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-[18px] border border-ink/[0.06] p-4">
      <div className="text-[10px] text-muted font-semibold mb-1">{label}</div>
      <div className="font-display text-[20px] font-extrabold" style={{ color: color ?? "#0A0A1A" }}>{value}</div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <Loader2 size={32} className="text-ficium animate-spin" />
    </div>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted mb-4">Journey not found.</p>
        <button onClick={onBack} className="text-ficium font-semibold">← Back</button>
      </div>
    </div>
  );
}
