// =============================================================
// Ficium — New Goal page (/goals/new)
// Form → createGoal() → Supabase client_goals → redirect to /goals
// =============================================================
import { useState }    from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useCreateGoal, type GoalType } from "@/individual/dashboard/hooks/useGoals";
import { BottomNav } from "@/shared/ui";

const GOAL_TYPES: { type: GoalType; label: string; emoji: string }[] = [
  { type: "mortgage",   label: "Buy a House",     emoji: "🏠" },
  { type: "vehicle",    label: "Buy a Vehicle",   emoji: "🚗" },
  { type: "education",  label: "Education",       emoji: "🎓" },
  { type: "personal",   label: "Travel / Other",  emoji: "✈️" },
  { type: "investment", label: "Invest Money",    emoji: "📈" },
  { type: "business",   label: "Start Business",  emoji: "💼" },
  { type: "savings",    label: "Build Savings",   emoji: "🐷" },
  { type: "other",      label: "Other",           emoji: "🎯" },
];

export default function NewGoal() {
  const navigate = useNavigate();
  const { mutateAsync: createGoal } = useCreateGoal();

  const [type,         setType]         = useState<GoalType | null>(null);
  const [title,        setTitle]        = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [savedAmount,  setSavedAmount]  = useState("0");
  const [targetDate,   setTargetDate]   = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [done,         setDone]         = useState(false);

  const handleSubmit = async () => {
    if (!type || !title || !targetAmount) return;
    setSubmitting(true);
    setError(null);
    const result = await createGoal({
      type,
      title,
      targetAmount: Number(targetAmount),
      savedAmount:  Number(savedAmount) || 0,
      targetDate:   targetDate || undefined,
    });
    if (!result.ok) { setError(result.error ?? "Something went wrong."); setSubmitting(false); return; }
    setDone(true);
    setTimeout(() => navigate("/goals"), 1500);
  };

  if (done) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 grid place-items-center mx-auto mb-4">
          <CheckCircle2 size={40} className="text-emerald-500" />
        </div>
        <h2 className="font-display text-2xl font-bold text-ink mb-1">Goal created!</h2>
        <p className="text-muted text-[14px]">Redirecting to your requests…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream pb-28">
      <div className="bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63] pb-8">
        <div className="max-w-[640px] mx-auto px-4 sm:px-6 pt-8">
          <button
            onClick={() => navigate("/goals")}
            className="flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white mb-6"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <h1 className="font-display text-[28px] font-extrabold text-white">New financial goal</h1>
          <p className="text-white/50 text-[13px] mt-1">Ficium AI will track your progress and match you with providers.</p>
        </div>
      </div>

      <div className="max-w-[640px] mx-auto px-4 sm:px-6 -mt-4 space-y-4 pb-10">

        {/* Goal type */}
        <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-sm p-5">
          <div className="text-[13px] font-bold text-ink mb-3">What's your goal?</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {GOAL_TYPES.map(({ type: t, label, emoji }) => (
              <button
                key={t}
                onClick={() => { setType(t); if (!title) setTitle(label); }}
                className={[
                  "flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-[12px] font-semibold transition-all",
                  type === t
                    ? "border-ficium bg-ficium/10 text-ficium"
                    : "border-ink/[0.08] text-muted hover:border-ficium/30 hover:bg-ficium/[0.03]",
                ].join(" ")}
              >
                <span className="text-[20px]">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Goal details */}
        <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-sm p-5 space-y-4">
          <Field label="Goal name" required>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Buy a house in Flic en Flac"
              className="input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Target amount (MUR)" required>
              <input
                type="number"
                value={targetAmount}
                onChange={e => setTargetAmount(e.target.value)}
                placeholder="e.g. 5000000"
                className="input"
              />
            </Field>
            <Field label="Already saved (MUR)">
              <input
                type="number"
                value={savedAmount}
                onChange={e => setSavedAmount(e.target.value)}
                placeholder="0"
                className="input"
              />
            </Field>
          </div>

          <Field label="Target date (optional)">
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="input"
            />
          </Field>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-600">{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || !type || !title || !targetAmount}
          className="w-full flex items-center justify-center gap-2 bg-ficium text-white py-4 rounded-2xl text-[15px] font-bold shadow-ficium disabled:opacity-50 hover:bg-ficium-bright transition-colors"
        >
          {submitting ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : "Create Goal"}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-ink mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
