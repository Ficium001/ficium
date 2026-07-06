import { useEffect, useState } from "react";
import { X, Check, Sparkles } from "lucide-react";
import { NEWS_CATEGORY_COLORS, NEWS_CATEGORY_BG } from "../config/tickers";
import type {
  MarketPreferences, NewsCategory, CurrencyCode, NewsScope,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// PreferenceSheet — bottom sheet (mobile) / centered dialog (desktop) letting
// the user pick what their market feed should prioritise. Controlled: parent
// owns open state and receives the final preferences on save.
// ─────────────────────────────────────────────────────────────────────────────

const ALL_CATEGORIES: NewsCategory[] = [
  "Interest Rates", "Currency", "Stock Market", "Savings", "Lending", "Economy",
];

const ALL_CURRENCIES: { code: CurrencyCode; label: string }[] = [
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "ZAR", label: "SA Rand" },
];

const ALL_SCOPES: { id: NewsScope; label: string; hint: string }[] = [
  { id: "local",  label: "Mauritius", hint: "BOM, banks, rupee, SEMDEX" },
  { id: "global", label: "World",     hint: "Fed, ECB, global markets" },
];

interface Props {
  open:        boolean;
  initial:     MarketPreferences;
  isSaving:    boolean;
  onClose:     () => void;
  onSave:      (prefs: MarketPreferences) => void;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function PreferenceSheet({ open, initial, isSaving, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<MarketPreferences>(initial);

  // Re-seed the draft each time the sheet opens with the latest saved prefs.
  useEffect(() => { if (open) setDraft(initial); }, [open, initial]);

  if (!open) return null;

  const scopesValid = draft.scopes.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Personalise your market feed"
    >
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
      />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-ink/8 shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/95 backdrop-blur px-5 pt-5 pb-3 flex items-start justify-between border-b border-ink/6">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-ficium" />
              <h2 className="text-[16px] font-bold text-ink">Personalise your feed</h2>
            </div>
            <p className="text-[12px] text-muted mt-1">
              Stories that match your picks rise to the top and get a "For you" tag.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 -mr-2 -mt-1 rounded-xl text-muted hover:text-ink hover:bg-ink/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Coverage */}
          <section>
            <h3 className="text-[11px] font-bold text-muted uppercase tracking-widest mb-2">Coverage</h3>
            <div className="grid grid-cols-2 gap-2">
              {ALL_SCOPES.map((s) => {
                const active = draft.scopes.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => setDraft((d) => ({ ...d, scopes: toggle(d.scopes, s.id) as NewsScope[] }))}
                    aria-pressed={active}
                    className={[
                      "text-left rounded-2xl border p-3 transition-all",
                      active
                        ? "border-ficium/40 bg-ficium/[0.04] shadow-[0_0_0_2px_rgba(42,31,230,0.08)]"
                        : "border-ink/8 hover:border-ink/[0.16]",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-ink">{s.label}</span>
                      {active && <Check size={13} className="text-ficium" />}
                    </div>
                    <p className="text-[11px] text-muted mt-0.5">{s.hint}</p>
                  </button>
                );
              })}
            </div>
            {!scopesValid && (
              <p className="text-[11px] text-bad mt-2">Pick at least one coverage area.</p>
            )}
          </section>

          {/* Topics */}
          <section>
            <h3 className="text-[11px] font-bold text-muted uppercase tracking-widest mb-2">Topics you care about</h3>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((c) => {
                const active = draft.categories.includes(c);
                const color  = NEWS_CATEGORY_COLORS[c] ?? "#64748b";
                const bg     = NEWS_CATEGORY_BG[c]     ?? "#f1f5f9";
                return (
                  <button
                    key={c}
                    onClick={() => setDraft((d) => ({ ...d, categories: toggle(d.categories, c) as NewsCategory[] }))}
                    aria-pressed={active}
                    className={[
                      "px-3 py-1.5 rounded-pill text-[12px] font-semibold border transition-all",
                      active ? "border-transparent" : "border-ink/10 text-muted hover:text-ink bg-white",
                    ].join(" ")}
                    style={active ? { background: bg, color } : undefined}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Currencies */}
          <section>
            <h3 className="text-[11px] font-bold text-muted uppercase tracking-widest mb-2">Currencies you follow</h3>
            <div className="flex flex-wrap gap-2">
              {ALL_CURRENCIES.map((c) => {
                const active = draft.currencies.includes(c.code);
                return (
                  <button
                    key={c.code}
                    onClick={() => setDraft((d) => ({ ...d, currencies: toggle(d.currencies, c.code) as CurrencyCode[] }))}
                    aria-pressed={active}
                    className={[
                      "px-3 py-1.5 rounded-pill text-[12px] font-semibold border transition-all",
                      active
                        ? "bg-ficium text-white border-transparent"
                        : "bg-white border-ink/10 text-muted hover:text-ink",
                    ].join(" ")}
                  >
                    {c.code} · {c.label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur px-5 py-4 border-t border-ink/6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-ink/10 text-[13px] font-semibold text-muted hover:text-ink transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(draft)}
            disabled={isSaving || !scopesValid}
            className="flex-1 py-2.5 rounded-xl bg-ficium text-white text-[13px] font-bold hover:bg-ficium-deep disabled:opacity-50 transition-colors"
          >
            {isSaving ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
