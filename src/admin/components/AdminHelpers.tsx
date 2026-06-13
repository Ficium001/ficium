import { FiciumLogo } from "@/shared/ui/FiciumLogo";
// ── Constants ─────────────────────────────────────────────────────────────────

export const ALL_MODULES = ["marketplace", "credit", "ai_advisory", "analytics"] as const;

export const NAV = [
  { key: "institutions", label: "Institutions",     icon: "⬡" },
  { key: "kyc",          label: "KYC Review",        icon: "◉" },
  { key: "products",     label: "Product catalogue", icon: "◈" },
  { key: "audit",        label: "Audit log",         icon: "▣" },
  { key: "kyc_settings", label: "KYC Settings",       icon: "⚙" },
] as const;

// ── Formatters ────────────────────────────────────────────────────────────────

export const fmt = {
  date:   (s: string) => new Date(s).toLocaleDateString("en-MU",  { day: "2-digit", month: "short", year: "numeric" }),
  time:   (s: string) => new Date(s).toLocaleTimeString("en-MU",  { hour: "2-digit", minute: "2-digit" }),
  rate:   (r: number | null) => r != null ? (r * 100).toFixed(2) + "%" : "—",
  amount: (a: number | null) => a != null ? "MUR " + Number(a).toLocaleString() : "—",
};

// ── Status pills ──────────────────────────────────────────────────────────────

export function stagePill(stage: string) {
  const map: Record<string, string> = {
    registered:        "bg-ink/5 text-muted",
    commercial_review: "bg-ink/5 text-muted",
    pending_approval:  "bg-amber-50 text-amber-700",
    compliance_review: "bg-amber-50 text-amber-700",
    approved:          "bg-green-50 text-green-700",
    suspended:         "bg-red-50 text-red-500",
    technical_setup:   "bg-ficium/8 text-ficium",
  };
  const label = stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${map[stage] ?? "bg-ink/5 text-muted"}`}>{label}</span>;
}

export function deployPill(model: string) {
  const map: Record<string, string> = {
    saas:    "bg-ficium/8 text-ficium",
    paas:    "bg-purple-50 text-purple-700",
    on_prem: "bg-red-50 text-red-500",
  };
  return <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${map[model] ?? "bg-ink/5 text-muted"}`}>{model}</span>;
}

export function outcomePill(o: string) {
  const map: Record<string, string> = {
    success:  "bg-green-50 text-green-700",
    rejected: "bg-red-50 text-red-500",
    failed:   "bg-red-50 text-red-500",
    expired:  "bg-amber-50 text-amber-700",
    logged:   "bg-ink/5 text-muted",
  };
  return <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${map[o] ?? map.logged}`}>{o}</span>;
}

// ── FLogo ─────────────────────────────────────────────────────────────────────
// Thin wrapper over the shared FiciumLogo so admin call sites are unchanged.

export function FLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  const mono = className.includes("white") || className.includes("cream");
  return <FiciumLogo heightPx={size} mono={mono} className={className} />;
}
