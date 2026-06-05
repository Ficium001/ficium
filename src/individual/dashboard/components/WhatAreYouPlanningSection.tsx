import { useState }   from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, Car, Plane, GraduationCap, TrendingUp, Briefcase,
  Sparkles, Upload, ArrowRight,
} from "lucide-react";

// ── Quick-select categories ───────────────────────────────────────────────────

const CATEGORIES = [
  { id: "house",     icon: Home,          label: "Buy a House",   route: "/requests/new?type=mortgage"   },
  { id: "vehicle",   icon: Car,           label: "Buy a Vehicle", route: "/requests/new?type=vehicle"    },
  { id: "education", icon: GraduationCap, label: "Education",     route: "/requests/new?type=education"  },
  { id: "travel",    icon: Plane,         label: "Travel",        route: "/requests/new?type=personal"   },
  { id: "invest",    icon: TrendingUp,    label: "Invest Money",  route: "/requests/new?type=investment" },
  { id: "business",  icon: Briefcase,     label: "Start Business",route: "/requests/new?type=business"   },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────
// Sits between FlipCards and SmartInsightsFeed in the dashboard layout.
// Matches the white-card, rounded-[22px], border-ink/[0.06] pattern used by
// FinancialToolsSection and AIFinancialCoach.

export function WhatAreYouPlanningSection() {
  const navigate = useNavigate();
  const [text,     setText]     = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!text.trim() && !selected) return;
    const params = new URLSearchParams();
    if (text.trim())  params.set("goal",     text.trim());
    if (selected)     params.set("category", selected);
    navigate(`/requests/new?${params.toString()}`);
  };

  const handleCategoryClick = (id: string, route: string) => {
    setSelected(id);
    navigate(route);
  };

  return (
    <div className="mb-6">
      <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-sm p-5 sm:p-6">

        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-ficium/10 grid place-items-center flex-shrink-0 mt-0.5">
            <Sparkles size={15} className="text-ficium" />
          </div>
          <div>
            <h3 className="font-display text-[17px] font-bold text-ink leading-tight">
              What are you planning today?
            </h3>
            <p className="text-[12px] text-muted mt-0.5">
              Tell us your goal and Ficium AI will create a personalized plan for you.
            </p>
          </div>
        </div>

        {/* Text input + upload */}
        <div className="mb-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Example: I want to buy a house in Flic en Flac for Rs 5M"
            rows={2}
            className="w-full bg-[#F7F6F3] border border-ink/[0.08] rounded-2xl px-4 py-3 text-[13px] text-ink placeholder:text-muted/60 resize-none outline-none focus:border-ficium/40 focus:ring-2 focus:ring-ficium/10 transition-all"
          />
          <button className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-ficium hover:underline">
            <Upload size={13} />
            Upload image
          </button>
        </div>

        {/* Category chips + Generate button */}
        <div className="flex flex-wrap items-end justify-between gap-4">

          {/* Quick-select category icons — mirrors the MarketTile icon style */}
          <div className="flex flex-wrap gap-4">
            {CATEGORIES.map(({ id, icon: Icon, label, route }) => (
              <button
                key={id}
                onClick={() => handleCategoryClick(id, route)}
                className={[
                  "flex flex-col items-center gap-1.5 group transition-all",
                  selected === id ? "opacity-100" : "opacity-70 hover:opacity-100",
                ].join(" ")}
              >
                <div className={[
                  "w-10 h-10 rounded-xl grid place-items-center border transition-all",
                  selected === id
                    ? "bg-ficium/10 border-ficium/30"
                    : "bg-ink/[0.04] border-ink/[0.08] group-hover:bg-ficium/[0.06] group-hover:border-ficium/20",
                ].join(" ")}>
                  <Icon size={17} className={selected === id ? "text-ficium" : "text-ink/60 group-hover:text-ficium"} />
                </div>
                <span className="text-[10px] font-semibold text-muted text-center leading-tight max-w-[52px]">
                  {label}
                </span>
              </button>
            ))}
          </div>

          {/* Generate CTA — matches the AIFinancialCoach button style */}
          <button
            onClick={handleGenerate}
            className="flex-shrink-0 flex items-center gap-2 bg-ficium text-white px-5 py-3 rounded-xl text-[13px] font-bold shadow-ficium hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <Sparkles size={14} />
            Generate
            <br className="sm:hidden" />
            My Plan
            <ArrowRight size={14} />
          </button>

        </div>
      </div>
    </div>
  );
}
