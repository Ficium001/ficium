// src/individual/finance/components/HoldingsList.tsx
import { useState } from "react";
import { LineChart as StockIcon, Landmark, Bitcoin, PieChart, Plus, Pencil, Trash2, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { formatAmount } from "@/shared/lib/format";
import { useHoldings, useDeleteHolding } from "@/individual/finance/hooks/useHoldings";
import { ASSET_TYPE_LABELS } from "@/individual/finance/types";
import type { Holding, AssetType } from "@/individual/finance/types";
import HoldingFormModal from "@/individual/finance/components/HoldingFormModal";

const ICONS: Record<AssetType, React.ElementType> = {
  stock:  StockIcon,
  etf:    PieChart,
  bond:   Landmark,
  crypto: Bitcoin,
};

export default function HoldingsList({ reportingCurrency }: { reportingCurrency: string }) {
  const { data: holdings, isLoading } = useHoldings();
  const { mutateAsync: deleteHolding, isPending: deleting } = useDeleteHolding();
  const [editing, setEditing] = useState<Holding | null | "new">(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (h: Holding) => {
    if (!confirm(`Remove ${h.symbol}? This can't be undone.`)) return;
    setDeletingId(h.id);
    await deleteHolding(h.id);
    setDeletingId(null);
  };

  if (isLoading) {
    return <div className="py-10 grid place-items-center"><Loader2 size={24} className="text-ficium animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      {(!holdings || holdings.length === 0) && (
        <div className="bg-white rounded-[22px] border border-dashed border-ink/15 p-8 text-center">
          <StockIcon size={22} className="mx-auto text-muted mb-2" />
          <div className="text-[14px] font-semibold text-ink">No investments yet</div>
          <div className="text-[13px] text-muted mt-1">Add stocks, ETFs, bonds, or crypto to track their live value here.</div>
        </div>
      )}

      {holdings?.map((h) => {
        const Icon = ICONS[h.assetType];
        const hasPrice = h.price != null;
        const pl = h.unrealizedPlReporting;
        const plPct = h.unrealizedPlPct;
        return (
          <div key={h.id} className="bg-white rounded-[22px] border border-ink/6 shadow-xs px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-ficium/10 grid place-items-center shrink-0">
                <Icon size={17} className="text-ficium" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold text-ink truncate">
                  {h.symbol} {h.exchange ? <span className="text-[11px] font-normal text-muted">· {h.exchange}</span> : null}
                </div>
                <div className="text-[12px] text-muted">
                  {ASSET_TYPE_LABELS[h.assetType]} · {h.quantity.toLocaleString()} units
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[14px] font-bold text-ink">
                  {hasPrice ? formatAmount(h.marketValueReporting, reportingCurrency) : <span className="text-muted font-normal">Unpriced</span>}
                </div>
                {pl != null && plPct != null && (
                  <div className={["text-[11px] font-semibold flex items-center gap-0.5 justify-end", pl >= 0 ? "text-emerald-600" : "text-red-600"].join(" ")}>
                    {pl >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {pl >= 0 ? "+" : ""}{formatAmount(pl, reportingCurrency)} ({plPct >= 0 ? "+" : ""}{plPct}%)
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setEditing(h)} className="w-8 h-8 grid place-items-center rounded-full hover:bg-ink/5 text-muted">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(h)} disabled={deleting && deletingId === h.id}
                  className="w-8 h-8 grid place-items-center rounded-full hover:bg-red-50 text-muted hover:text-red-600">
                  {deleting && deletingId === h.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <button onClick={() => setEditing("new")}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-ink/15 hover:border-ficium/40 text-ink/70 hover:text-ficium py-3.5 rounded-2xl text-[13px] font-semibold transition-colors">
        <Plus size={15} /> Add investment
      </button>

      {editing && (
        <HoldingFormModal
          holding={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
