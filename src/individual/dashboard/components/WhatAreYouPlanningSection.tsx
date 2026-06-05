import { useState }    from "react";
import { useNavigate }  from "react-router-dom";
import { Home, Car, Plane, GraduationCap, TrendingUp, Briefcase, ArrowRight, Paperclip, Image, Camera, FileText, Monitor } from "lucide-react";

const CATEGORIES = [
  { id: "house",     icon: Home,          label: "Buy a House",    route: "/requests/new?type=mortgage",   iconColor: "#2A1FE6", bg: "rgba(42,31,230,0.10)"  },
  { id: "vehicle",   icon: Car,           label: "Buy a Vehicle",  route: "/requests/new?type=vehicle",    iconColor: "#2A1FE6", bg: "rgba(42,31,230,0.10)"  },
  { id: "education", icon: GraduationCap, label: "Education",      route: "/requests/new?type=education",  iconColor: "#059669", bg: "rgba(5,150,105,0.10)"  },
  { id: "travel",    icon: Plane,         label: "Travel",         route: "/requests/new?type=personal",   iconColor: "#d97706", bg: "rgba(217,119,6,0.10)"  },
  { id: "invest",    icon: TrendingUp,    label: "Invest Money",   route: "/requests/new?type=investment", iconColor: "#2A1FE6", bg: "rgba(42,31,230,0.10)"  },
  { id: "business",  icon: Briefcase,     label: "Start Business", route: "/requests/new?type=business",   iconColor: "#7c3aed", bg: "rgba(124,58,237,0.10)" },
] as const;

export function WhatAreYouPlanningSection() {
  const navigate = useNavigate();
  const [text,     setText]     = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [showMenu, setShowMenu]   = useState(false);

  const handleGenerate = () => {
    if (!text.trim() && !selected) return;
    const p = new URLSearchParams();
    if (text.trim()) p.set("goal", text.trim());
    if (selected)    p.set("category", selected);
    navigate(`/requests/new?${p.toString()}`);
  };

  return (
    <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-card p-5 sm:p-7">

      <h2 className="font-display text-[18px] sm:text-[22px] font-bold text-ink mb-1">
        What are you planning today?
      </h2>
      <p className="text-[12px] sm:text-[13px] text-muted mb-5">
        Tell us your goal and Ficium AI will create a personalized financial plan for you.
      </p>

      {/* Input */}
      <div className="rounded-xl border border-ink/[0.10] px-4 py-3 mb-2 bg-cream focus-within:border-ficium/50 focus-within:ring-2 focus-within:ring-ficium/10 transition-all">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Example: I want to buy a house in Flic en Flac for Rs 5M\nOr: I want to invest Rs 10k monthly for my retirement\nOr: I need a vehicle loan for Rs 600k"}
          rows={4}
          className="w-full text-[13px] text-ink placeholder:text-muted/50 bg-transparent outline-none resize-none leading-relaxed min-h-[90px] sm:min-h-[70px]"
        />
      </div>
      {/* Attach button + popover menu */}
      <div className="relative mb-5 sm:mb-6">
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-ficium hover:underline"
        >
          <Paperclip size={13} /> Add attachment
        </button>

        {showMenu && (
          <div className="absolute left-0 top-7 z-50 bg-white rounded-2xl shadow-card border border-ink/[0.08] py-2 w-52 animate-fade-in">
            {[
              { icon: <Image size={15} className="text-ficium" />,    label: "Upload photos",  accept: "image/*",       capture: undefined },
              { icon: <Camera size={15} className="text-emerald-600"/>,label: "Take a photo",   accept: "image/*",       capture: "environment" },
              { icon: <Monitor size={15} className="text-amber-600"/>, label: "Screenshot",     accept: "image/*",       capture: undefined },
              { icon: <FileText size={15} className="text-violet-600"/>,label: "Upload files",  accept: ".pdf,.doc,.docx", capture: undefined },
            ].map(({ icon, label, accept, capture }) => (
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
                  capture={capture as any}
                  className="hidden"
                  onChange={() => setShowMenu(false)}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Categories — 3-col grid on mobile, row on sm+ */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-3 sm:gap-5">
          {CATEGORIES.map(({ id, icon: Icon, label, route, iconColor, bg }) => {
            const isSelected = selected === id;
            return (
              <button
                key={id}
                onClick={() => { setSelected(id); navigate(route); }}
                className="flex flex-col items-center gap-2 transition-all"
                style={{ opacity: isSelected ? 1 : 0.8 }}
              >
                <div
                  className="w-12 h-12 rounded-xl grid place-items-center border-2 transition-all"
                  style={{
                    background: bg,
                    borderColor: isSelected ? iconColor : "transparent",
                    boxShadow: isSelected ? `0 0 0 3px ${iconColor}20` : "none",
                  }}
                >
                  <Icon size={20} style={{ color: iconColor }} />
                </div>
                <span className="text-[11px] font-semibold text-muted text-center leading-tight">
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Generate CTA — full width on mobile */}
        <button
          onClick={handleGenerate}
          className="flex items-center justify-center gap-2 text-white px-6 py-3.5 rounded-xl text-[13px] font-bold shadow-ficium hover:opacity-90 active:scale-[0.98] transition-all flex-shrink-0 w-full sm:w-auto"
          style={{ background: "linear-gradient(135deg, #2A1FE6, #3D32FF)" }}
        >
          ✦ Generate My Plan <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
