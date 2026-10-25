// src/individual/money/panels/OverviewPanel.tsx
// The whole picture at a glance: trend, where the money sits, health, and
// what the borrower already holds through Ficium.
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Briefcase } from "lucide-react";
import { LineChart } from "@/shared/ui/dashboard";
import { formatAmount } from "@/shared/lib/format";
import { useNetWorthHistory } from "@/individual/money/finance/hooks/useFinanceReporting";
import { useSnapshot } from "@/individual/money/networth/hooks/useSnapshot";
import { usePortfolio } from "@/individual/money/portfolio/hooks/usePortfolio";
import { useProfile } from "@/individual/dashboard/hooks/useDashboard";
import FacilityCard from "@/individual/money/portfolio/components/FacilityCard";
import type { MoneyTab } from "@/individual/money/lib/tabs";
import { ASSET_ROWS } from "./AssetsPanel";
import { Panel, LinkButton } from "./ui";

export default function OverviewPanel({ onGo }: { onGo: (t: MoneyTab) => void }) {
  const navigate = useNavigate();
  const { data: history, isLoading: historyLoading } = useNetWorthHistory(180);
  const { data: snap } = useSnapshot();
  const { data: profile } = useProfile();
  const { data: facilities, isLoading: facLoading } = usePortfolio();

  const trend = useMemo(() => (history ?? []).map((h) => ({
    label: new Date(h.snapshotDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    value: Math.round(h.netWorth),
  })), [history]);

  const allocation = useMemo(() => {
    const rows = ASSET_ROWS.map((r) => ({ ...r, value: (snap?.[r.key as keyof typeof snap] as number | undefined) ?? 0 }))
      .filter((r) => r.value > 0);
    const total = rows.reduce((s, r) => s + r.value, 0);
    return { rows, total };
  }, [snap]);

  const live = (facilities ?? []).filter((f) => f.status === "active" || f.status === "completed");
  const score = profile?.healthScore ?? null;

  return (
    <>
      <Panel title="Net worth over time">
        <div className="px-5 pb-5 pt-3">
          {historyLoading ? (
            <div className="py-10 grid place-items-center"><Loader2 size={22} className="text-ficium animate-spin" /></div>
          ) : trend.length < 2 ? (
            <p className="text-[13px] text-muted py-6 text-center">
              Your trend starts once you have a few days of history.{" "}
              <LinkButton onClick={() => onGo("accounts")}>Add an account</LinkButton>
            </p>
          ) : (
            <LineChart data={trend} unit="MUR" ariaLabel="Net worth over the last 6 months" />
          )}
        </div>
      </Panel>

      <Panel title="Where your money is" right={<LinkButton onClick={() => onGo("assets")}>Edit</LinkButton>}>
        {allocation.rows.length === 0 ? (
          <p className="text-[13px] text-muted p-5 text-center">
            Nothing recorded yet. <LinkButton onClick={() => onGo("assets")}>Add what you own</LinkButton>
          </p>
        ) : (
          <div className="divide-y divide-ink/4">
            {allocation.rows.map((r) => {
              const pct = allocation.total > 0 ? (r.value / allocation.total) * 100 : 0;
              return (
                <div key={r.key} className="px-5 py-3.5">
                  <div className="flex items-center justify-between mb-1.5 text-[13px]">
                    <span className="font-medium text-ink">{r.label}</span>
                    <span className="font-semibold text-ink">
                      {formatAmount(Math.round(r.value), "MUR")} <span className="text-muted font-normal">{pct.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-ink/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: r.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <button onClick={() => onGo("health")}
        className="w-full text-left bg-white rounded-[22px] border border-ink/6 shadow-xs p-5 flex items-center gap-4 hover:border-ficium/30">
        <span className="w-14 h-14 rounded-full border-4 border-ficium grid place-items-center shrink-0 font-display text-[18px] font-extrabold text-ficium">
          {score ?? "—"}
        </span>
        <span>
          <span className="block font-bold text-[15px] text-ink">Financial health</span>
          <span className="block text-[13px] text-muted mt-0.5">
            {score == null ? "See what banks will look at, and how to improve it."
              : score >= 70 ? "Good. You qualify for competitive offers."
              : score >= 50 ? "Fair. A few changes would unlock better rates."
              : "Needs work. See your action plan."}
          </span>
        </span>
      </button>

      <section className="space-y-3">
        <h2 className="font-bold text-[15px] text-ink px-1">Through Ficium</h2>
        {facLoading ? (
          <div className="py-8 grid place-items-center"><Loader2 size={22} className="text-ficium animate-spin" /></div>
        ) : live.length === 0 ? (
          <div className="bg-white rounded-[22px] border border-dashed border-ink/15 p-6 text-center">
            <Briefcase size={22} className="text-ink/25 mx-auto mb-2" />
            <p className="text-[13px] text-muted mb-4">Loans and savings you accept through Ficium appear here with their progress.</p>
            <button onClick={() => navigate("/requests/new")} className="px-4 py-2.5 bg-ficium text-white rounded-xl text-[13px] font-semibold">
              Post a request
            </button>
          </div>
        ) : (
          live.map((f) => <FacilityCard key={f.id} facility={f} />)
        )}
      </section>
    </>
  );
}
