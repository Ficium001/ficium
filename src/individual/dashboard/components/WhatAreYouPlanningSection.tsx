import { useState }   from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, Car, Plane, GraduationCap, TrendingUp, Briefcase, ArrowRight, Upload,
} from "lucide-react";

// ── Quick-select categories ───────────────────────────────────────────────────

const CATEGORIES = [
  { id: "house",     icon: Home,          label: "Buy a House",    route: "/requests/new?type=mortgage"   },
  { id: "vehicle",   icon: Car,           label: "Buy a Vehicle",  route: "/requests/new?type=vehicle"    },
  { id: "education", icon: GraduationCap, label: "Education",      route: "/requests/new?type=education"  },
  { id: "travel",    icon: Plane,         label: "Travel",         route: "/requests/new?type=personal"   },
  { id: "invest",    icon: TrendingUp,    label: "Invest Money",   route: "/requests/new?type=investment" },
  { id: "business",  icon: Briefcase,     label: "Start Business", route: "/requests/new?type=business"   },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export function WhatAreYouPlanningSection() {
  const navigate = useNavigate();
  const [text,     setText]     = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!text.trim() && !selected) return;
    const params = new URLSearchParams();
    if (text.trim()) params.set("goal",     text.trim());
    if (selected)    params.set("category", selected);
    navigate(`/requests/new?${params.toString()}`);
  };

  const handleCategoryClick = (id: string, route: string) => {
    setSelected(id);
    navigate(route);
  };

  return (
    <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-sm p-6 sm:p-7 mb-6">

      {/* Header — no AI icon, plain text */}
      <h2 className="font-display text-[20px] sm:text-[22px] font-bold text-ink mb-1">
        What are you planning today?
      </h2>
      <p className="text-[13px] text-muted mb-5">
        Tell us your goal and Ficium AI will create a personalized financial plan for you.
      </p>

      {/* Text input */}
      <div className="border border-ink/[0.10] rounded-2xl px-4 py-3 mb-2 focus-within:border-ficium/40 focus-within:ring-2 focus-within:ring-ficium/10 transition-all">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Example: I want to buy a house in Flic en Flac for Rs 5M"
          className="w-full text-[13px] text-ink placeholder:text-muted/60 bg-transparent outline-none"
        />
      </div>

      {/* Upload link */}
      <button className="flex items-center gap-1.5 text-[12px] font-semibold text-ficium hover:underline mb-6">
        <Upload size={13} />
        Upload image
      </button>

      {/* Category chips + Generate CTA on same row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-5">
          {CATEGORIES.map(({ id, icon: Icon, label, route }) => (
            <button
              key={id}
              onClick={() => handleCategoryClick(id, route)}
              className={[
                "flex flex-col items-center gap-2 group transition-all",
                selected === id ? "opacity-100" : "opacity-60 hover:opacity-100",
              ].join(" ")}
            >
              <div className={[
                "w-11 h-11 rounded-xl grid place-items-center border transition-all",
                selected === id
                  ? "bg-ficium/10 border-ficium/30"
                  : "bg-ink/[0.04] border-ink/[0.08] group-hover:bg-ficium/[0.06] group-hover:border-ficium/20",
              ].join(" ")}>
                <Icon size={18} className={selected === id ? "text-ficium" : "text-ink/60 group-hover:text-ficium"} />
              </div>
              <span className="text-[11px] font-semibold text-muted text-center leading-tight max-w-[56px]">
                {label}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          className="flex items-center gap-2 bg-ficium text-white px-6 py-3.5 rounded-xl text-[13px] font-bold shadow-ficium hover:opacity-90 active:scale-[0.98] transition-all flex-shrink-0"
        >
          ✦ Generate My Plan
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
