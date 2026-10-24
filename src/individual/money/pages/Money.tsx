// src/individual/money/pages/Money.tsx
// One place for the borrower's own money. Replaces /finances, /networth,
// /portfolio, /health and /tools, which each showed a different slice (and a
// different headline number) of the same picture.
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { PageShell } from "@/shared/ui";
import { formatAmount } from "@/shared/lib/format";
import { useSnapshot } from "@/individual/money/networth/hooks/useSnapshot";
import { useProfile } from "@/individual/dashboard/hooks/useDashboard";
import { MONEY_TABS, parseMoneyTab, type MoneyTab } from "@/individual/money/lib/tabs";
import OverviewPanel from "@/individual/money/panels/OverviewPanel";
import AccountsPanel from "@/individual/money/panels/AccountsPanel";
import AssetsPanel from "@/individual/money/panels/AssetsPanel";
import HealthPanel from "@/individual/money/panels/HealthPanel";
import CalculatorsPanel from "@/individual/money/panels/CalculatorsPanel";

export default function MoneyPage() {
  const [params, setParams] = useSearchParams();
  const tab = parseMoneyTab(params.get("tab"));
  const { data: snap, isLoading } = useSnapshot();
  const { data: profile } = useProfile();

  const go = (next: MoneyTab) => {
    const p = new URLSearchParams(params);
    if (next === "overview") p.delete("tab"); else p.set("tab", next);
    p.delete("tool");
    setParams(p, { replace: true });
    window.scrollTo({ top: 0 });
  };

  const assets = snap?.totalAssets ?? 0;
  const debts  = snap?.totalLiabilities ?? 0;

  return (
    <PageShell max="900px">
      <section className="relative overflow-hidden rounded-hero bg-hero text-white px-5 sm:px-9 py-7 mt-1">
        <h1 className="text-[13px] font-semibold text-white/60 mb-1">Net worth</h1>
        <div className="font-display text-[40px] sm:text-[56px] font-extrabold leading-none">
          {isLoading ? <Loader2 size={28} className="animate-spin text-white/60" /> : formatAmount(Math.round(assets - debts), "MUR")}
        </div>
        <div className="flex gap-2 mt-5 flex-wrap text-[12px] font-semibold">
          <span className="px-3 py-1.5 rounded-pill bg-white/10 text-white/80">Assets {formatAmount(Math.round(assets), "MUR")}</span>
          <span className="px-3 py-1.5 rounded-pill bg-white/10 text-white/80">Debts {formatAmount(Math.round(debts), "MUR")}</span>
          {profile?.healthScore != null && (
            <button onClick={() => go("health")} className="px-3 py-1.5 rounded-pill bg-white/10 text-white/80 hover:bg-white/20">
              Health {profile.healthScore}/100
            </button>
          )}
        </div>
      </section>

      <nav
        aria-label="Money sections"
        className="sticky top-0 md:top-14 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-paper/90 backdrop-blur-xl overflow-x-auto"
      >
        <div role="tablist" className="flex gap-1 bg-white rounded-2xl border border-ink/6 p-1 w-max min-w-full">
          {MONEY_TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => go(t.key)}
              className={[
                "flex-1 whitespace-nowrap px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors",
                "focus-visible:outline-2 focus-visible:outline-ficium",
                tab === t.key ? "bg-ficium text-white" : "text-ink/60 hover:bg-ink/5",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <div role="tabpanel" className="pb-8 pt-2 space-y-5">
        {tab === "overview"    && <OverviewPanel onGo={go} />}
        {tab === "accounts"    && <AccountsPanel />}
        {tab === "assets"      && <AssetsPanel onGo={go} />}
        {tab === "health"      && <HealthPanel onGo={go} />}
        {tab === "calculators" && <CalculatorsPanel initialTool={params.get("tool")} />}
      </div>
    </PageShell>
  );
}
