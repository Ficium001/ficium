import { useState }    from "react";
import { useNavigate }  from "react-router-dom";
import { Home, Car, Plane, GraduationCap, TrendingUp, Briefcase, ArrowRight, Upload } from "lucide-react";

const CATEGORIES = [
  { id: "house",     icon: Home,          label: "Buy a House",    route: "/requests/new?type=mortgage"   },
  { id: "vehicle",   icon: Car,           label: "Buy a Vehicle",  route: "/requests/new?type=vehicle"    },
  { id: "education", icon: GraduationCap, label: "Education",      route: "/requests/new?type=education"  },
  { id: "travel",    icon: Plane,         label: "Travel",         route: "/requests/new?type=personal"   },
  { id: "invest",    icon: TrendingUp,    label: "Invest Money",   route: "/requests/new?type=investment" },
  { id: "business",  icon: Briefcase,     label: "Start Business", route: "/requests/new?type=business"   },
] as const;

export function WhatAreYouPlanningSection() {
  const navigate = useNavigate();
  const [text,     setText]     = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!text.trim() && !selected) return;
    const p = new URLSearchParams();
    if (text.trim()) p.set("goal", text.trim());
    if (selected)    p.set("category", selected);
    navigate(`/requests/new?${p.toString()}`);
  };

  return (
    <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-card p-5 sm:p-7">

      {/* Heading */}
      <h2 className="font-display text-[18px] sm:text-[22px] font-bold text-ink mb-1">
        What are you planning today?
      </h2>
      <p className="text-[12px] sm:text-[13px] text-muted mb-5">
        Tell us your goal and Ficium AI will create a personalized financial plan for you.
      </p>

      {/* Input */}
      <div className="rounded-xl border border-ink/[0.10] px-4 py-3 mb-2 focus-within:border-ficium/50 focus-within:ring-2 focus-within:ring-ficium/10 transition-all bg-cream">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Example: I want to buy a house in Flic en Flac for Rs 5M"
          className="w-full text-[13px] text-ink placeholder:text-muted/50 bg-transparent outline-none"
        />
      </div>
      <button className="flex items-center gap-1.5 text-[12px] font-semibold text-ficium hover:underline mb-5 sm:mb-6">
        <Upload size={12} /> Upload image
      </button>

      {/* Chips + CTA — stacks on mobile, row on sm+ */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
        <div className="flex flex-wrap gap-4 sm:gap-5">
          {CATEGORIES.map(({ id, icon: Icon, label, route }) => (
            <button
              key={id}
              onClick={() => { setSelected(id); navigate(route); }}
              className={[
                "flex flex-col items-center gap-1.5 transition-opacity",
                selected === id ? "opacity-100" : "opacity-60 hover:opacity-100",
              ].join(" ")}
            >
              <div className={[
                "w-10 h-10 sm:w-11 sm:h-11 rounded-xl grid place-items-center border transition-all",
                selected === id
                  ? "bg-ficium/10 border-ficium/30"
                  : "bg-ink/[0.03] border-ink/[0.08] hover:bg-ficium/[0.05] hover:border-ficium/20",
              ].join(" ")}>
                <Icon size={17} className={selected === id ? "text-ficium" : "text-ink/55 group-hover:text-ficium"} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold text-muted text-center leading-tight max-w-[52px]">
                {label}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          className="flex items-center justify-center gap-2 bg-ficium text-white px-6 py-3.5 rounded-xl text-[13px] font-bold shadow-ficium hover:bg-ficium-bright active:scale-[0.98] transition-all flex-shrink-0 w-full sm:w-auto"
        >
          ✦ Generate My Plan <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
