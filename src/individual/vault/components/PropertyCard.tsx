/**
 * PropertyCard — shows a verified property record from client_vault_property.
 * Displays address, type, area, value, mortgage status.
 */
import { Home, CheckCircle2, AlertCircle } from "lucide-react";

interface Property {
  id:             string;
  address:        string | null;
  property_type:  string | null;
  land_area_sqm:  number | null;
  market_value:   number | null;
  valuation_date: string | null;
  is_mortgaged:   boolean;
  verified:       boolean;
}

function fmtMUR(n: number) {
  return `MUR ${new Intl.NumberFormat("en-MU").format(Math.round(n))}`;
}

export function PropertyCard({ property }: { property: Property }) {
  const typeLabel: Record<string, string> = {
    land:       "Land",
    apartment:  "Apartment",
    villa:      "Villa / House",
    commercial: "Commercial",
  };

  return (
    <div className="bg-white rounded-2xl border border-line p-5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Home size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-ink leading-snug">
              {property.address ?? "Address not extracted"}
            </p>
            <p className="text-[11px] text-muted mt-0.5">
              {property.property_type ? (typeLabel[property.property_type] ?? property.property_type) : "Property"}
              {property.land_area_sqm ? ` · ${property.land_area_sqm.toFixed(0)} m²` : ""}
            </p>
          </div>
        </div>

        {/* Verified badge */}
        {property.verified
          ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-pill bg-good/10 text-good text-[10px] font-bold flex-shrink-0">
              <CheckCircle2 size={10} /> Verified
            </span>
          : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-pill bg-warn/10 text-warn text-[10px] font-bold flex-shrink-0">
              <AlertCircle size={10} /> Pending valuation
            </span>
        }
      </div>

      {/* Value row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface rounded-xl px-4 py-3">
          <p className="text-[10px] text-muted font-medium uppercase tracking-wider mb-1">Market value</p>
          <p className="text-[15px] font-bold text-ink">
            {property.market_value ? fmtMUR(property.market_value) : "—"}
          </p>
          {property.valuation_date && (
            <p className="text-[10px] text-muted mt-0.5">
              as at {new Date(property.valuation_date).toLocaleDateString("en-MU", { month: "short", year: "numeric" })}
            </p>
          )}
        </div>
        <div className="bg-surface rounded-xl px-4 py-3">
          <p className="text-[10px] text-muted font-medium uppercase tracking-wider mb-1">Mortgage</p>
          <p className={`text-[15px] font-bold ${property.is_mortgaged ? "text-warn" : "text-good"}`}>
            {property.is_mortgaged ? "Mortgaged" : "Clear"}
          </p>
        </div>
      </div>
    </div>
  );
}
