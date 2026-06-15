import { useState, useMemo } from "react";
import { useAdminProducts, useToggleProduct } from "@/admin/hooks/useAdminData";
import { fmt } from "./AdminHelpers";

export function ProductsSection() {
  const { data: products = [], isLoading } = useAdminProducts();
  const toggleProduct = useToggleProduct();
  const [familyFilter, setFamilyFilter] = useState("all");

  const families = useMemo(() =>
    Array.from(new Set(products.map((p) => p.family_label ?? "Other"))),
    [products]
  );
  const filtered = products.filter((p) =>
    familyFilter === "all" || (p.family_label ?? "Other") === familyFilter
  );

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total products", value: products.length },
          { label: "Active",         value: products.filter((p) => p.active).length },
          { label: "Inactive",       value: products.filter((p) => !p.active).length },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-card">
            <div className="text-3xl font-bold text-ink tracking-tight mb-1">{isLoading ? "—" : s.value}</div>
            <div className="text-[13px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-ink/[0.07] flex items-center justify-between flex-wrap gap-3">
          <span className="font-display font-bold text-[16px] text-ink">Product catalogue</span>
          <div className="flex gap-2">
            {["all", ...families].map((f) => (
              <button key={f} onClick={() => setFamilyFilter(f)}
                className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${familyFilter === f ? "bg-ficium text-white border-ficium" : "bg-white border-ink/10 text-muted hover:border-ficium/40"}`}>
                {f === "all" ? "All families" : f}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-ficium border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink/[0.06]">
                {["Product","Family","Rate range","Amount range","Status",""].map((h) => (
                  <th key={h} className="px-5 pb-4 pt-5 text-left text-[12px] font-semibold text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-ink/[0.04] hover:bg-surface/60 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-[13px] text-ink">{p.label}</div>
                    <div className="text-[11px] text-muted font-mono mt-0.5">{p.code}</div>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-ficium font-medium">{p.family_label ?? "—"}</td>
                  <td className="px-5 py-4 text-[13px] font-mono text-green-700">
                    {fmt.rate(p.rate_config?.min_rate ?? null)} → {fmt.rate(p.rate_config?.max_rate ?? null)}
                  </td>
                  <td className="px-5 py-4 text-[13px] text-ink">
                    {fmt.amount(p.rate_config?.min_amount ?? null)} — {fmt.amount(p.rate_config?.max_amount ?? null)}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${p.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-400"}`}>
                      {p.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => toggleProduct.mutate({ id: p.id, active: !p.active })}
                      disabled={toggleProduct.isPending}
                      className={`text-[12px] font-semibold px-4 py-1.5 rounded-xl border transition-colors disabled:opacity-50 ${
                        p.active ? "border-red-200 text-red-500 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"
                      }`}>
                      {p.active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
