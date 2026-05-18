/**
 * Ficium design tokens — single source of truth for brand styling.
 * Mirrors tailwind.config.js. If you change values here, mirror them there.
 * (Or extract into a shared file later; for now this duplication is intentional
 * since Tailwind needs raw values at config-build time.)
 */

export const colors = {
  ficium:       "#2A1FE6", // primary brand indigo
  ficiumDeep:   "#1A14A8", // darker indigo (gradients, hover)
  ficiumBright: "#3D32FF", // lighter indigo (decorative)
  ink:          "#0A0A1A", // near-black for text + dark sections
  cream:        "#FAF7F0", // warm off-white page background
  accent:       "#FFD84D", // yellow highlight
  mint:         "#7DF9C5", // green success / positive
  peach:        "#FF9F7A", // orange / warm accent
  muted:        "#6B6B85", // subdued text
  danger:       "#DC2626", // errors
  dangerSoft:   "#FEE2E2", // error background
  dangerInk:    "#991B1B", // error text dark
  borderSoft:   "rgba(10, 10, 26, 0.12)",
  borderHover:  "rgba(10, 10, 26, 0.2)",
} as const;

export const fonts = {
  display: "'Bricolage Grotesque', sans-serif",
  body:    "'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif",
} as const;

export const radius = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  pill: "999px",
} as const;

export const shadows = {
  // soft floating card
  card: "0 12px 30px rgba(10, 10, 26, 0.08)",
  // primary button glow
  ficium: "0 12px 32px rgba(42, 31, 230, 0.25)",
  // phone mockup
  phone: "0 40px 80px -20px rgba(10, 10, 26, 0.45), 0 0 0 1px rgba(10, 10, 26, 0.1)",
} as const;