/**
 * One offer, laid out as a social post: institution header, caption,
 * approved image, offer bar with the main action, then details/share.
 * Rates live only in the offer bar (text), never inside the image.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Clock, Share2, ChevronDown, ImageOff } from "lucide-react";
import type { Offer } from "../types";
import { daysLeft, isOpenLaunch, requestLinkFor, safeImageUrl } from "../api/offers";

const CATEGORY_LABEL: Record<Offer["category"], string> = { borrow: "Borrow", save: "Save", invest: "Invest" };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function OfferPost({ offer, onShare }: { offer: Offer; onShare: (o: Offer) => void }) {
  const [open, setOpen] = useState(false);
  const img = safeImageUrl(offer.imageUrl);
  const launch = isOpenLaunch(offer);
  const left = daysLeft(offer.liveUntil);

  return (
    <article id={`offer-${offer.id}`} className="bg-white border-y sm:border sm:rounded-2xl border-line overflow-hidden">
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="w-10 h-10 rounded-full bg-ink text-white grid place-items-center text-[13px] font-bold shrink-0" aria-hidden="true">
          {initials(offer.institutionName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-[15px] font-semibold text-ink truncate">
            {offer.institutionName}
            <BadgeCheck size={15} className="text-ficium shrink-0" aria-label="Verified by Ficium" />
          </div>
          <div className="text-[12px] text-muted">{CATEGORY_LABEL[offer.category]} · Verified {fmtDate(offer.verifiedAt)}</div>
        </div>
        {launch && <span className="text-[12px] font-semibold text-white bg-ficium px-2.5 py-1 rounded-full shrink-0">New</span>}
      </header>

      <p className={["px-4 pb-3 text-[15px] leading-relaxed text-ink", open ? "" : "line-clamp-3"].join(" ")}>{offer.caption}</p>

      <div className="relative w-full aspect-[4/3] bg-surface">
        {img ? (
          <img src={img} alt={offer.imageAlt ?? ""} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted" role="img" aria-label="Image unavailable">
            <ImageOff size={40} aria-hidden="true" />
          </div>
        )}
        {offer.imageTag && (
          <span className="absolute left-3 bottom-3 text-[12px] font-semibold text-white bg-ink/80 px-2.5 py-1 rounded-full">{offer.imageTag}</span>
        )}
      </div>

      <div className="flex items-center gap-3 px-4 py-3 bg-surface border-b border-line">
        <div className="flex-1 min-w-0">
          <div className="text-[19px] font-extrabold font-display text-ink leading-tight">{offer.headline}</div>
          <div className="text-[13px] text-muted">{offer.terms}</div>
        </div>
        <Link
          to={requestLinkFor(offer.productType)}
          className="shrink-0 min-h-11 px-4 inline-flex items-center rounded-xl bg-ficium text-white text-[14px] font-semibold no-underline hover:bg-ficium-deep"
        >
          Get this offer
        </Link>
      </div>

      {launch && offer.launchWindowEnds && (
        <div className="mx-4 mt-3 flex gap-2 items-start text-[12px] leading-snug text-ficium-deep bg-ficium/8 rounded-xl px-3 py-2">
          <Clock size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>Launch offer: only {offer.institutionName} handles requests until {fmtDate(offer.launchWindowEnds)}. After that, other providers can compete.</span>
        </div>
      )}

      <div className="px-4 pt-2.5 text-[13px] text-muted">{left === 0 ? "Ends today" : `Ends in ${left} day${left === 1 ? "" : "s"}`}</div>

      <div className="grid grid-cols-2 mx-2 mt-1 border-t border-line">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="min-h-11 inline-flex items-center justify-center gap-1.5 text-[14px] font-semibold text-ink/80"
        >
          <ChevronDown size={18} className={open ? "rotate-180 transition-transform" : "transition-transform"} aria-hidden="true" />
          {open ? "Less" : "Details"}
        </button>
        <button
          type="button"
          onClick={() => onShare(offer)}
          className="min-h-11 inline-flex items-center justify-center gap-1.5 text-[14px] font-semibold text-ink/80"
        >
          <Share2 size={18} aria-hidden="true" />
          Share
        </button>
      </div>
    </article>
  );
}
