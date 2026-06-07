// =============================================================
// Ficium — WhatAreYouPlanningSection
// Category chips → /requests/new?type=X (pre-selects product)
// "Generate My Plan" → /requests/new?goal=<text>&type=<selected>
// Attach button → file picker with photo/camera/file options
// =============================================================
import { useState, useRef } from "react";
import { useNavigate }       from "react-router-dom";
import {
  Home, Car, Plane, GraduationCap, TrendingUp, Briefcase,
  ArrowRight, Paperclip, Image, Camera, FileText, Monitor,
} from "lucide-react";

// Each category maps to an existing NewRequest product type
const CATEGORIES = [
  { id: "mortgage",         icon: Home,          label: "Buy a House",    iconColor: "#2A1FE6", bg: "rgba(42,31,230,0.10)",  route: "/journeys/new?type=mortgage"   },
  { id: "vehicle",          icon: Car,           label: "Buy a Vehicle",  iconColor: "#2A1FE6", bg: "rgba(42,31,230,0.10)",  route: "/journeys/new?type=vehicle"    },
  { id: "education",        icon: GraduationCap, label: "Education",      iconColor: "#059669", bg: "rgba(5,150,105,0.10)",  route: "/journeys/new?type=education"  },
  { id: "travel",           icon: Plane,         label: "Travel",         iconColor: "#d97706", bg: "rgba(217,119,6,0.10)",  route: "/journeys/new?type=travel"     },
  { id: "investment",       icon: TrendingUp,    label: "Invest Money",   iconColor: "#2A1FE6", bg: "rgba(42,31,230,0.10)",  route: "/journeys/new?type=investment" },
  { id: "business",         icon: Briefcase,     label: "Start Business", iconColor: "#7c3aed", bg: "rgba(124,58,237,0.10)", route: "/journeys/new?type=business"   },
];

const ATTACH_OPTIONS = [
  { icon: <Image    size={15} className="text-ficium"       />, label: "Upload photos",  accept: "image/*",          capture: undefined     },
  { icon: <Camera   size={15} className="text-emerald-600"  />, label: "Take a photo",   accept: "image/*",          capture: "environment" },
  { icon: <Monitor  size={15} className="text-amber-600"    />, label: "Screenshot",     accept: "image/*",          capture: undefined     },
  { icon: <FileText size={15} className="text-violet-600"   />, label: "Upload files",   accept: ".pdf,.doc,.docx",  capture: undefined     },
];

// Map journey type IDs to their routes
const TYPE_TO_ROUTE: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.route])
);

async function classifyGoalWithAI(goal: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 50,
        system:
          "You are a financial intent classifier. Given a user's goal, reply with ONLY one of these exact words: mortgage, vehicle, education, travel, investment, business. No other text.",
        messages: [{ role: "user", content: goal }],
      }),
    });
    const data = await res.json();
    const type = data?.content?.[0]?.text?.trim().toLowerCase();
    return TYPE_TO_ROUTE[type] ? type : null;
  } catch {
    return null;
  }
}

export function WhatAreYouPlanningSection() {
  const navigate      = useNavigate();
  const [text,        setText]        = useState("");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showMenu,    setShowMenu]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    const cat = selectedIdx !== null ? CATEGORIES[selectedIdx] : null;

    // If a chip is already selected, go straight there
    if (cat) {
      const url = text.trim()
        ? `${cat.route}&goal=${encodeURIComponent(text.trim())}`
        : cat.route;
      navigate(url);
      return;
    }

    // No chip selected — use AI to classify the free-text intent
    if (text.trim()) {
      setLoading(true);
      const type = await classifyGoalWithAI(text.trim());
      setLoading(false);

      if (type && TYPE_TO_ROUTE[type]) {
        navigate(`${TYPE_TO_ROUTE[type]}?goal=${encodeURIComponent(text.trim())}`);
      } else {
        // Fallback: generic journey page with correct ? separator
        navigate(`/journeys/new?goal=${encodeURIComponent(text.trim())}`);
      }
      return;
    }

    // Nothing typed, nothing selected — open journeys list
    navigate("/journeys/new");
  };

  const handleCategory = (idx: number) => {
    setSelectedIdx(idx);
    const cat = CATEGORIES[idx];
    let url = cat.route;
    if (text.trim()) url += `&goal=${encodeURIComponent(text.trim())}`;
    navigate(url);
  };

  return (
    <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-card p-5 sm:p-7">

      <h2 className="font-display text-[18px] sm:text-[22px] font-bold text-ink mb-1">
        What are you planning today?
      </h2>
      <p className="text-[12px] sm:text-[13px] text-muted mb-5">
        Tell us your goal and Ficium AI will create a personalized financial plan for you.
      </p>

      {/* Textarea */}
      <div className="rounded-xl border border-ink/[0.10] px-4 py-3 mb-2 bg-cream focus-within:border-ficium/50 focus-within:ring-2 focus-within:ring-ficium/10 transition-all">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Example: I want to buy a house in Flic en Flac for Rs 5M\nOr: I want to invest Rs 10k monthly for my retirement\nOr: I need a vehicle loan for Rs 600k"}
          rows={4}
          className="w-full text-[13px] text-ink placeholder:text-muted/50 bg-transparent outline-none resize-none leading-relaxed min-h-[90px] sm:min-h-[70px]"
        />
      </div>

      {/* Attach button + popover */}
      <div className="relative mb-5 sm:mb-6" ref={menuRef}>
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-ficium hover:underline"
        >
          <Paperclip size={13} /> Add attachment
        </button>

        {showMenu && (
          <div className="absolute left-0 top-7 z-50 bg-white rounded-2xl shadow-card border border-ink/[0.08] py-2 w-52">
            {ATTACH_OPTIONS.map(({ icon, label, accept, capture }) => (
              <label
                key={label}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-cream cursor-pointer transition-colors"
                onClick={() => setShowMenu(false)}
              >
                <span className="w-7 h-7 rounded-lg bg-ink/[0.04] grid place-items-center flex-shrink-0">{icon}</span>
                <span className="text-[13px] font-medium text-ink">{label}</span>
                <input
                  type="file"
                  accept={accept}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  capture={capture as any}
                  className="hidden"
                  onChange={() => setShowMenu(false)}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Category chips + Generate CTA */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-3 sm:gap-5">
          {CATEGORIES.map(({ icon: Icon, label, iconColor, bg }, idx) => {
            const isSelected = selectedIdx === idx;
            return (
              <button
                key={`${label}-${idx}`}
                onClick={() => handleCategory(idx)}
                className="flex flex-col items-center gap-2 transition-all"
                style={{ opacity: isSelected ? 1 : 0.75 }}
              >
                <div
                  className="w-12 h-12 rounded-xl grid place-items-center border-2 transition-all"
                  style={{
                    background:   bg,
                    borderColor:  isSelected ? iconColor : "transparent",
                    boxShadow:    isSelected ? `0 0 0 3px ${iconColor}20` : "none",
                  }}
                >
                  <Icon size={20} style={{ color: iconColor }} />
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-muted text-center leading-tight">
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center justify-center gap-2 text-white px-6 py-3.5 rounded-xl text-[13px] font-bold shadow-ficium hover:opacity-90 active:scale-[0.98] transition-all flex-shrink-0 w-full sm:w-auto disabled:opacity-70 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #2A1FE6, #3D32FF)" }}
        >
          {loading ? (
            <>
              <svg className="animate-spin" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="12" cy="12" r="10" strokeOpacity={0.3}/>
                <path d="M12 2a10 10 0 0 1 10 10"/>
              </svg>
              Reading your goal…
            </>
          ) : (
            <>✦ Generate My Plan <ArrowRight size={15} /></>
          )}
        </button>
      </div>
    </div>
  );
}

