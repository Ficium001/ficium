/** @type {import('tailwindcss').Config} */

/**
 * Ficium app — design tokens (2026 revamp).
 * Single source of truth. Change a value here and the whole app follows.
 * Legacy tokens (cream/accent/mint/peach) are retained so pre-revamp
 * screens keep working while they migrate to the new palette.
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ficium: {
          DEFAULT: "#2A1FE6",
          deep:    "#1A14A8",
          bright:  "#3D32FF",
        },
        // Revamp palette
        ink:    "#0B0B1E",
        paper:  "#FAFAFC",
        line:   "#ECECF2",
        muted:  "#6B6B85",
        good:   "#0FA47A",
        warn:   "#E8930C",
        bad:    "#E5484D",
        // Logo gradient stops
        gblue:   { from: "#3536DC", mid: "#356EF4", to: "#4C90F6" },
        gpurple: { from: "#3A148F", to: "#8231EC" },
        // Legacy (retained for unmigrated screens)
        cream:  "#FAF7F0",
        accent: "#FFD84D",
        mint:   "#7DF9C5",
        peach:  "#FF9F7A",
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", "sans-serif"],
        body:    ["'Inter Tight'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      borderRadius: {
        pill: "999px",
        card: "20px",
        hero: "28px",
      },
      boxShadow: {
        card:   "0 1px 2px rgba(11,11,30,.04), 0 8px 24px rgba(11,11,30,.05)",
        lift:   "0 2px 4px rgba(11,11,30,.06), 0 16px 40px rgba(42,31,230,.12)",
        ficium: "0 8px 24px rgba(124,58,237,.35)",
        phone:  "0 40px 80px -20px rgba(10,10,26,.45), 0 0 0 1px rgba(10,10,26,.1)",
      },
      letterSpacing: { display: "-0.035em" },
      transitionTimingFunction: { swift: "cubic-bezier(.22,1,.36,1)" },
      // ── Signature gradients (single source of truth for the skin) ──
      // Re-skin the whole app by editing these. Reference as bg-hero,
      // bg-brand, bg-accent (with bg-clip-text), bg-edge, etc. — never
      // hand-write gradient strings in components.
      backgroundImage: {
        "hero":       "radial-gradient(120% 160% at 8% 0%, #181842 0%, #0B0B1E 55%)",
        "hero-deep":  "linear-gradient(135deg, #0f0c29 0%, #302b63 60%, #24243e 100%)",
        "callout":    "radial-gradient(130% 150% at 100% 0%, #1A1448 0%, #0B0B1E 60%)",
        "mark":       "radial-gradient(135% 135% at 30% 22%, #23234F 0%, #0B0B1E 70%)",
        "brand":      "linear-gradient(135deg,#356EF4,#8231EC)",
        "brand-cta":  "linear-gradient(92deg,#1E6CF5,#7C3AED 90%)",
        "brand-soft": "linear-gradient(135deg,rgba(30,108,245,.10),rgba(124,58,237,.10))",
        "accent":     "linear-gradient(92deg,#62A8FF 0%,#22D3EE 40%,#A78BFA 75%,#E879F9 100%)",
        "edge":       "linear-gradient(180deg,#1E6CF5,#7C3AED)",
        "edge-h":     "linear-gradient(90deg,#1E6CF5,#7C3AED)",
        "rail":       "linear-gradient(90deg,#356EF4,#8231EC)",
      },
      keyframes: {
        pulseRing: {
          "0%":   { boxShadow: "0 0 0 0 rgba(192,38,211,.45)" },
          "70%":  { boxShadow: "0 0 0 8px rgba(192,38,211,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(192,38,211,0)" },
        },
        pulseRingGreen: {
          "0%":   { boxShadow: "0 0 0 0 rgba(15,164,122,.45)" },
          "70%":  { boxShadow: "0 0 0 8px rgba(15,164,122,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(15,164,122,0)" },
        },
        drift: {
          from: { transform: "translate3d(0,0,0) rotate(0deg)" },
          to:   { transform: "translate3d(-30px,22px,0) rotate(-6deg)" },
        },
      },
      animation: {
        "pulse-ring":       "pulseRing 2.4s infinite",
        "pulse-ring-green": "pulseRingGreen 2.4s infinite",
        drift:              "drift 14s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};
