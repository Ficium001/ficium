import { useNavigate } from "react-router-dom";
import { Plus, Home, Car, TrendingUp, GraduationCap, Plane, Briefcase, CheckCircle2 } from "lucide-react";
import { useJourneys, type Journey, type JourneyType } from "@/individual/journeys/hooks/useJourneys";
import { BottomNav } from "@/shared/ui";

const TYPE_STYLE: Record<JourneyType, { icon: React.ElementType; gradient: string }> = {
  mortgage:   { icon: Home,          gradient: "from-[#c47b2b] to-[#7a4a1e]" },
  vehicle:    { icon: Car,           gradient: "from-[#4b5563] to-[#1f2937]" },
  investment: { icon: TrendingUp,    gradient: "from-[#0f0c29] to-[#2A1FE6]" },
  education:  { icon: GraduationCap, gradient: "from-[#059669] to-[#065f46]" },
  travel:     { icon: Plane,         gradient: "from-[#0ea5e9] to-[#0369a1]" },
  business:   { icon: Briefcase,     gradient: "from-[#7c3aed] to-[#4c1d95]" },
};

export default function Journeys() {
  const navigate = useNavigate();
  const { data: journeys = [], isLoading } = useJourneys();

  return (
    <div className="min-h-screen bg-cream pb-28">
      <div className="bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-10 pb-8 flex items-end justify-between">
          <div>
            <div className="text-[12px] font-bold text-white/50 uppercase tracking-widest mb-2">Your goals</div>
            <h1 className="font-display text-[36px] sm:text-[48px] font-extrabold text-white">My Journeys</h1>
          </div>
          <button onClick={() => navigate("/journeys/new")}
            className="inline-flex items-center gap-2 bg-ficium text-white px-5 py-3.5 rounded-[18px] text-[14px] font-bold shadow-ficium hover:-translate-y-0.5 transition-transform">
            <Plus size={16} /> New Journey
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-48 bg-white rounded-[18px] animate-pulse border border-ink/[0.06]" />)}
          </div>
        ) : journeys.length === 0 ? (
          <EmptyState onNew={() => navigate("/journeys/new")} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {journeys.map(j => <JourneyCard key={j.id} journey={j} onClick={() => navigate(`/journeys/${j.id}`)} />)}
            <button onClick={() => navigate("/journeys/new")}
              className="min-h-[180px] rounded-[18px] border-2 border-dashed border-ink/[0.12] bg-white flex flex-col items-center justify-center gap-3 hover:border-ficium/40 hover:bg-ficium/[0.02] transition-all group">
              <div className="w-12 h-12 rounded-full bg-ficium grid place-items-center shadow-ficium group-hover:scale-110 transition-transform">
                <Plus size={20} className="text-white" />
              </div>
              <span className="text-[13px] font-bold text-ink">Start New Journey</span>
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function JourneyCard({ journey, onClick }: { journey: Journey; onClick: () => void }) {
  const style = TYPE_STYLE[journey.type] ?? TYPE_STYLE.mortgage;
  const Icon  = style.icon;
  const fmt   = (n?: number) => n ? `Rs ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}` : null;

  return (
    <div onClick={onClick} className="bg-white rounded-[18px] border border-ink/[0.06] shadow-sm overflow-hidden cursor-pointer hover:shadow-card hover:-translate-y-0.5 transition-all">
      <div className={`bg-gradient-to-br ${style.gradient} h-[100px] flex items-end p-4`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 grid place-items-center">
            <Icon size={20} className="text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{journey.type}</div>
            <div className="font-display text-[16px] font-bold text-white leading-tight">{journey.title}</div>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {journey.aiResults.affordability !== undefined && (
            <div className="bg-ficium/[0.06] rounded-lg px-3 py-2">
              <div className="text-[9px] text-muted font-semibold">Affordability</div>
              <div className="text-[16px] font-bold text-ficium">{journey.aiResults.affordability}%</div>
            </div>
          )}
          {journey.aiResults.eligibility !== undefined && (
            <div className="bg-emerald-50 rounded-lg px-3 py-2">
              <div className="text-[9px] text-muted font-semibold">Eligibility</div>
              <div className="text-[16px] font-bold text-emerald-700">{journey.aiResults.eligibility}%</div>
            </div>
          )}
          {fmt(journey.aiResults.monthlyRepayment) && (
            <div className="bg-cream rounded-lg px-3 py-2">
              <div className="text-[9px] text-muted font-semibold">Monthly</div>
              <div className="text-[13px] font-bold text-ink">{fmt(journey.aiResults.monthlyRepayment)}</div>
            </div>
          )}
          {journey.aiResults.banksMatched !== undefined && (
            <div className="bg-amber-50 rounded-lg px-3 py-2">
              <div className="text-[9px] text-muted font-semibold">Banks Ready</div>
              <div className="text-[16px] font-bold text-amber-700">{journey.aiResults.banksMatched}</div>
            </div>
          )}
        </div>
        <div className={["text-[11px] font-bold px-2 py-1 rounded-pill self-start inline-block",
          journey.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-ink/[0.05] text-muted"].join(" ")}>
          {journey.status === "active" ? "● Active" : journey.status}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="bg-white rounded-[22px] border border-ink/[0.06] p-12 text-center max-w-[460px] mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-ficium/10 grid place-items-center mx-auto mb-4">
        <CheckCircle2 size={28} className="text-ficium" />
      </div>
      <h2 className="font-display text-[22px] font-bold text-ink mb-2">No journeys yet</h2>
      <p className="text-muted text-[14px] mb-6 max-w-[280px] mx-auto leading-relaxed">
        Tell Ficium your goal. We'll calculate your affordability, match you with banks, and guide you every step.
      </p>
      <button onClick={onNew} className="inline-flex items-center gap-2 bg-ficium text-white px-6 py-3 rounded-pill text-[14px] font-bold shadow-ficium">
        <Plus size={16} /> Start my first journey
      </button>
    </div>
  );
}
