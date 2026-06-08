// =============================================================
// Ficium — WhatAreYouPlanningSection (v2)
// "What do you need financing for?" — provider-neutral language
// Two sections: I need financing / I have money to place
// AI classifies free-text → routes to correct wizard
// =============================================================
import { useState, useRef } from "react";
import { useNavigate }       from "react-router-dom";
import {
  Home, Car, CreditCard, GraduationCap, Briefcase, User,
  Building2, TrendingUp, ArrowRight, Paperclip,
  Image, Camera, FileText, Monitor,
} from "lucide-react";

const BORROW_CATEGORIES = [
  { id: "mortgage",   icon: Home,          label: "Home loan",       route: "/requests/new?type=mortgage",   iconBg: "#e8eaff", iconColor: "#2A1FE6" },
  { id: "personal",   icon: User,          label: "Personal loan",   route: "/requests/new?type=personal",   iconBg: "#e0f2fe", iconColor: "#0369a1" },
  { id: "credit",     icon: CreditCard,    label: "Credit card",     route: "/requests/new?type=credit",     iconBg: "#f3e8ff", iconColor: "#7c3aed" },
  { id: "vehicle",    icon: Car,           label: "Vehicle loan",    route: "/requests/new?type=vehicle",    iconBg: "#fef3c7", iconColor: "#d97706" },
  { id: "business",   icon: Briefcase,     label: "Business loan",   route: "/requests/new?type=business",   iconBg: "#ffe4e6", iconColor: "#e11d48" },
  { id: "education",  icon: GraduationCap, label: "Education loan",  route: "/requests/new?type=education",  iconBg: "#d1fae5", iconColor: "#059669" },
];

const SAVE_CATEGORIES = [
  { id: "deposit",    icon: Building2,     label: "Place a deposit", route: "/requests/new?type=deposit",    iconBg: "#ccfbf1", iconColor: "#0f766e" },
  { id: "savings",    icon: TrendingUp,    label: "Grow my savings", route: "/requests/new?type=savings",    iconBg: "#dcfce7", iconColor: "#16a34a" },
];

const ALL_CATEGORIES = [...BORROW_CATEGORIES, ...SAVE_CATEGORIES];

const TYPE_TO_ROUTE: Record<string, string> = Object.fromEntries(
  ALL_CATEGORIES.map((c) => [c.id, c.route])
);

const ATTACH_OPTIONS = [
  { icon: <Image    size={15} className="text-ficium"      />, label: "Upload photos",  accept: "image/*",         capture: undefined      },
  { icon: <Camera   size={15} className="text-emerald-600" />, label: "Take a photo",   accept: "image/*",         capture: "environment"  },
  { icon: <Monitor  size={15} className="text-amber-600"   />, label: "Screenshot",     accept: "image/*",         capture: undefined      },
  { icon: <FileText size={15} className="text-violet-600"  />, label: "Upload files",   accept: ".pdf,.doc,.docx", capture: undefined      },
];

async function classifyWithAI(text: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 50,
        system:
          "You are a financial intent classifier. Given a user's financing need, reply with ONLY one of these exact words: mortgage, personal, credit, vehicle, business, education, deposit, savings. No other text.",
        messages: [{ role: "user", content: text }],
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
  const navigate       = useNavigate();
  const [text,         setText]        = useState("");
  const [selectedId,   setSelectedId]  = useState<string | null>(null);
  const [showMenu,     setShowMenu]    = useState(false);
  const [loading,      setLoading]     = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handlePost = async () => {
    const cat = ALL_CATEGORIES.find((c) => c.id === selectedId);

    if (cat) {
      const url = text.trim()
        ? `${cat.route}&need=${encodeURIComponent(text.trim())}`
        : cat.route;
      navigate(url);
      return;
    }

    if (text.trim()) {
      setLoading(true);
      const type = await classifyWithAI(text.trim());
      setLoading(false);

      if (type && TYPE_TO_ROUTE[type]) {
        navigate(`${TYPE_TO_ROUTE[type]}&need=${encodeURIComponent(text.trim())}`);
      } else {
        navigate(`/requests/new?need=${encodeURIComponent(text.trim())}`);
      }
      return;
    }

    navigate("/requests/new");
  };

  const handleCategory = (id: string, route: string) => {
    setSelectedId(id);
    const url = text.trim() ? `${route}&need=${encodeURIComponent(text.trim())}` : route;
    navigate(url);
  };

  return (
    <div className="bg-white rounded-[22px] border border-ink/[0.06] shadow-card p-5 sm:p-7">

      {/* Badge */}
      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-pill mb-4">
        <TrendingUp size={11} /> Providers compete for you
      </div>

      <h2 className="font-display text-[18px] sm:text-[22px] font-bold text-ink mb-1">
        What do you need financing for?
      </h2>
      <p className="text-[12px] sm:text-[13px] text-muted mb-5">
        Post your need — providers review it and send you their best offer.
      </p>

      {/* Textarea */}
      <div className="rounded-xl border border-ink/[0.10] px-4 py-3 mb-2 bg-cream focus-within:border-ficium/50 focus-within:ring-2 focus-within:ring-ficium/10 transition-all">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            "e.g. Home loan of Rs 5M in Flic en Flac, 20yr term\n" +
            "e.g. Personal loan Rs 200k, salaried, need within 2 weeks\n" +
            "e.g. Rs 500k to place for 12 months, looking for best rate"
          }
          rows={4}
          className="w-full text-[13px] text-ink placeholder:text-muted/50 bg-transparent outline-none resize-none leading-relaxed min-h-[90px] sm:min-h-[70px]"
        />
      </div>

      {/* Attach */}
      <div className="relative mb-5 sm:mb-6" ref={menuRef}>
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-ficium hover:underline"
        >
          <Paperclip size={13} /> Add documents
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

      {/* I need financing */}
      <div className="mb-4">
        <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">I need financing</p>
        <div className="flex flex-wrap gap-3">
          {BORROW_CATEGORIES.map(({ id, icon: Icon, label, route, iconBg, iconColor }) => {
            const active = selectedId === id;
            return (
              <button
                key={id}
                onClick={() => handleCategory(id, route)}
                className="flex flex-col items-center gap-1.5 w-[72px] group transition-all"
              >
                <div
                  className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center transition-all"
                  style={{
                    background:   iconBg,
                    color:        iconColor,
                    border:       active ? `2px solid ${iconColor}` : "1.5px solid transparent",
                    transform:    active ? "translateY(-2px)" : undefined,
                  }}
                >
                  <Icon size={22} />
                </div>
                <span className={["text-[11px] text-center leading-tight", active ? "font-semibold text-ink" : "text-muted"].join(" ")}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* I have money to place */}
      <div className="mb-6">
        <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">I have money to place</p>
        <div className="flex flex-wrap gap-3">
          {SAVE_CATEGORIES.map(({ id, icon: Icon, label, route, iconBg, iconColor }) => {
            const active = selectedId === id;
            return (
              <button
                key={id}
                onClick={() => handleCategory(id, route)}
                className="flex flex-col items-center gap-1.5 w-[72px] group transition-all"
              >
                <div
                  className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center transition-all"
                  style={{
                    background:   iconBg,
                    color:        iconColor,
                    border:       active ? `2px solid ${iconColor}` : "1.5px solid transparent",
                    transform:    active ? "translateY(-2px)" : undefined,
                  }}
                >
                  <Icon size={22} />
                </div>
                <span className={["text-[11px] text-center leading-tight", active ? "font-semibold text-ink" : "text-muted"].join(" ")}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted/60">Your information is never shared without your consent</span>
        <button
          onClick={handlePost}
          disabled={loading}
          className="flex items-center gap-2 border border-ink/20 text-ink px-5 py-2.5 rounded-full text-[13px] font-semibold hover:bg-ink/[0.04] active:scale-[0.98] transition-all flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="animate-spin" width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="12" cy="12" r="10" strokeOpacity={0.3} />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              Reading your need…
            </>
          ) : (
            <>Post my need <ArrowRight size={14} /></>
          )}
        </button>
      </div>
    </div>
  );
}
