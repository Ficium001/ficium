/**
 * Offers API — reads public.offer_listing only.
 *
 * Offers are curated and published by Ficium staff from ficium-admin. RLS on
 * the table returns only live rows (live_until > now()), so expired or
 * unverified offers never reach the client. The borrower app has no write path.
 */
import { supabase } from "@/shared/lib/supabase";
import type { Offer, OfferCategory, OfferFilter } from "../types";

const COLUMNS =
  "id, institution_name, category, product_type, caption, headline, terms, image_tag, image_url, image_alt, is_launch, launch_window_ends, published_at, verified_at, live_until";

type Row = {
  id: string; institution_name: string; category: OfferCategory; product_type: string;
  caption: string; headline: string; terms: string; image_tag: string | null;
  image_url: string | null; image_alt: string | null; is_launch: boolean;
  launch_window_ends: string | null; published_at: string; verified_at: string; live_until: string;
};

function toOffer(r: Row): Offer {
  return {
    id: r.id, institutionName: r.institution_name, category: r.category, productType: r.product_type,
    caption: r.caption, headline: r.headline, terms: r.terms, imageTag: r.image_tag,
    imageUrl: r.image_url, imageAlt: r.image_alt, isLaunch: r.is_launch,
    launchWindowEnds: r.launch_window_ends, publishedAt: r.published_at,
    verifiedAt: r.verified_at, liveUntil: r.live_until,
  };
}

/** Listing rule v1: newest first. Launches are badged, never boosted. */
export async function listOffers(): Promise<Offer[]> {
  const { data, error } = await supabase
    .from("offer_listing")
    .select(COLUMNS)
    .order("published_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data as Row[]).map(toOffer);
}

/** A launch counts as "new" only while its launch window is open. */
export function isOpenLaunch(o: Offer, now: number = Date.now()): boolean {
  return o.isLaunch && !!o.launchWindowEnds && new Date(o.launchWindowEnds).getTime() > now;
}

export function filterOffers(offers: Offer[], f: OfferFilter, now: number = Date.now()): Offer[] {
  if (f === "all") return offers;
  if (f === "new") return offers.filter((o) => isOpenLaunch(o, now));
  return offers.filter((o) => o.category === f);
}

/**
 * Only images served from the approved host render. Anything else falls back
 * to the placeholder: defence in depth on top of the CSP img-src allowlist.
 */
const IMAGE_HOST = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i;
export function safeImageUrl(url: string | null): string | null {
  return url && IMAGE_HOST.test(url) ? url : null;
}

/** product_type → NewRequest ?type= key. Unmapped types open the product picker. */
const REQUEST_TYPE: Record<string, string> = {
  mortgage: "mortgage", personal_loan: "personal", credit_card: "credit", leasing: "vehicle",
  business_loan: "business", fixed_deposit: "deposit", investment_account: "savings",
  equities: "equities", unit_trust: "unit_trust", savings_plan: "savings_plan",
  government_bonds: "government_bonds", offshore_investment: "offshore",
};
export function requestLinkFor(productType: string): string {
  const t = REQUEST_TYPE[productType];
  return t ? `/requests/new?type=${encodeURIComponent(t)}` : "/requests/new";
}

export function daysLeft(iso: string, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 86_400_000));
}
