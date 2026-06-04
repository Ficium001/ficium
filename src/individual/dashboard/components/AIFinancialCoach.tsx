import { useState } from "react";
import { Brain }     from "lucide-react";

// Self-contained — owns its own loading/message/action state.
// Wires to the real Claude API when /api/chat is ready.
// To upgrade: replace the setTimeout in handleAction with streamClaude().

const INITIAL_MESSAGE =
  "You are likely eligible for a lower-rate facility based on your income trend and improved debt ratio.";

const AI_RESPONSES: Record<string, string> = {
  score:
    "To optimize your score, focus on reducing your credit utilization below 30% and ensuring all EMIs are paid on time for the next 3 months.",
  liabilities:
    "Your highest-cost liability is your personal loan at 12.5%. Refinancing it could save you MUR 1,800/month based on current market rates.",
  eligibility:
    "You're 2 steps from top-tier eligibility: complete your financial dossier and add one more asset. This unlocks bids from all 14 institutions.",
};

const ACTIONS = [
  { id: "score",       label: "Optimize score",       color: "text-ficium bg-ficium/10 hover:bg-ficium/20"      },
  { id: "liabilities", label: "Reduce liabilities",   color: "text-red-600 bg-red-50 hover:bg-red-100"         },
  { id: "eligibility", label: "Improve eligibility",  color: "text-emerald-700 bg-emerald-50 hover:bg-emerald-100" },
];

export function AIFinancialCoach() {
  const [loading,      setLoading]      = useState(false);
  const [message,      setMessage]      = useState(INITIAL_MESSAGE);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const handleAction = (id: string) => {
    setActiveAction(id);
    setLoading(true);
    // TODO: replace with real Claude streaming call via streamClaude("/api/chat", ...)
    setTimeout(() => {
      setMessage(AI_RESPONSES[id] ?? INITIAL_MESSAGE);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="rounded-[22px] overflow-hidden border border-ficium/20 bg-white shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-[#0f0c29] to-[#302b63] flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center flex-shrink-0">
          <Brain size={18} className="text-white" />
        </div>
        <div>
          <div className="text-[16px] font-bold text-white leading-tight">Ficium AI Coach</div>
          <div className="text-[11px] text-white/50">Powered by Claude</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-white/50 font-medium">Live</span>
        </div>
      </div>

      {/* Message */}
      <div className="p-5">
        <div className="rounded-xl bg-ficium/[0.06] border border-ficium/10 p-4 mb-5 min-h-[90px]">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-ficium/40 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
              <span className="text-[13px] text-muted">Analysing your profile…</span>
            </div>
          ) : (
            <p className="text-[15px] text-ink/80 leading-relaxed font-medium">{message}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2.5">
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => handleAction(a.id)}
              className={[
                "w-full text-left px-4 py-3 rounded-xl text-[13px] font-bold transition-all",
                a.color,
                activeAction === a.id ? "ring-1 ring-current" : "",
              ].join(" ")}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
