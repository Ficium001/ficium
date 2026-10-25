/** Offer as borrowers see it. Mirrors public.offer_listing (App DB). */
export type OfferCategory = "borrow" | "save" | "invest";

export interface Offer {
  id: string;
  institutionName: string;
  category: OfferCategory;
  productType: string;
  caption: string;
  headline: string;
  terms: string;
  imageTag: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  isLaunch: boolean;
  launchWindowEnds: string | null;
  publishedAt: string;
  verifiedAt: string;
  liveUntil: string;
}

export type OfferFilter = "all" | "new" | OfferCategory;
