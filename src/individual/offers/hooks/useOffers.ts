import { useQuery } from "@tanstack/react-query";
import { listOffers } from "../api/offers";
import type { Offer } from "../types";

const OfferQueryKeys = { list: ["offers", "list"] as const } as const;

export function useOffers() {
  return useQuery<Offer[]>({
    queryKey: OfferQueryKeys.list,
    queryFn: listOffers,
    staleTime: 5 * 60_000, // offers change rarely; RLS still hides expired rows on every fetch
  });
}
