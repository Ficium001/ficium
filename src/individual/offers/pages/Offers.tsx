/**
 * /offers — curated provider offers, laid out as a feed of posts.
 * Listing rule v1: newest first, same layout for every provider, launches
 * badged but never pinned or boosted. No provider pays for placement.
 */
import { useEffect, useState } from "react";
import { PageShell } from "@/shared/ui";
import { useOffers } from "../hooks/useOffers";
import { filterOffers } from "../api/offers";
import { OfferPost } from "../components/OfferPost";
import type { Offer, OfferFilter } from "../types";

const FILTERS: { key: OfferFilter; label: string }[] = [
  { key: "all", label: "All" }, { key: "new", label: "New" },
  { key: "borrow", label: "Borrow" }, { key: "save", label: "Save" }, { key: "invest", label: "Invest" },
];

export default function Offers() {
  const { data: offers = [], isLoading, isError, refetch } = useOffers();
  const [filter, setFilter] = useState<OfferFilter>("all");
  const [notice, setNotice] = useState<string | null>(null);
  const shown = filterOffers(offers, filter);

  // Deep link: /offers#offer-<id> scrolls to that post once loaded.
  useEffect(() => {
    if (!offers.length || !window.location.hash) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [offers.length]);

  const share = async (o: Offer) => {
    const url = `${window.location.origin}/offers#offer-${o.id}`;
    const text = `${o.institutionName}: ${o.headline}`;
    try {
      if (navigator.share) { await navigator.share({ title: "Ficium offer", text, url }); return; }
      await navigator.clipboard.writeText(url);
      setNotice("Link copied");
    } catch {
      /* user cancelled the share sheet: nothing to do */
    }
  };

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  return (
    <PageShell max="max-w-[640px]">
      <div className="flex flex-col gap-3 -mx-4 sm:mx-0 pb-6">
        <div className="px-4 sm:px-0 pt-2">
          <h1 className="text-[28px] font-extrabold font-display text-ink tracking-tight">Offers</h1>
          <p className="text-[14px] text-muted mt-1">Listed by Ficium and verified with each provider.</p>
        </div>

        <div role="group" aria-label="Filter offers" className="flex gap-2 overflow-x-auto px-4 sm:px-0 pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={[
                "min-h-10 px-4 rounded-full text-[13px] font-semibold border shrink-0",
                filter === f.key ? "bg-ink text-white border-ink" : "bg-white text-ink border-line",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading offers">
            {[0, 1].map((i) => <div key={i} className="h-[520px] bg-white border-y sm:border sm:rounded-2xl border-line animate-pulse" />)}
          </div>
        )}

        {isError && (
          <div className="mx-4 sm:mx-0 bg-white border border-line rounded-2xl p-5 text-center">
            <p className="text-[14px] text-ink">Offers couldn’t load.</p>
            <button type="button" onClick={() => refetch()} className="mt-3 min-h-11 px-4 rounded-xl border border-line text-[14px] font-semibold">Try again</button>
          </div>
        )}

        {!isLoading && !isError && shown.length === 0 && (
          <div className="mx-4 sm:mx-0 bg-white border border-line rounded-2xl p-6 text-center">
            <p className="text-[15px] font-semibold text-ink">No offers here right now</p>
            <p className="text-[13px] text-muted mt-1">You can still post a request and let providers compete for it.</p>
          </div>
        )}

        {shown.map((o) => <OfferPost key={o.id} offer={o} onShare={share} />)}

        <details className="mx-4 sm:mx-0 text-[13px] text-muted">
          <summary className="min-h-11 flex items-center justify-center font-semibold text-ficium cursor-pointer">How we list offers</summary>
          <p className="leading-relaxed pb-2">
            Ficium lists offers from licensed providers that have agreed to be listed. Every offer and image is
            approved by Ficium, and rates are re-verified with the provider at least every 30 days or the offer is
            removed automatically. Offers appear newest first; no provider pays for placement. Offers are indicative —
            final terms depend on the provider’s assessment.
          </p>
        </details>

        <div role="status" aria-live="polite" className="sr-only">{notice}</div>
        {notice && (
          <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 bg-ink text-white text-[13px] font-semibold px-4 py-2 rounded-full" aria-hidden="true">
            {notice}
          </div>
        )}
      </div>
    </PageShell>
  );
}
