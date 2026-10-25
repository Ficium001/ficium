// src/individual/money/portfolio/hooks/usePortfolio.ts
import { useQuery } from "@tanstack/react-query";
import { getPortfolio } from "@/individual/money/portfolio/api/portfolio";

const PortfolioQueryKeys = {
  facilities: ["portfolio", "facilities"] as const,
};

export function usePortfolio() {
  return useQuery({
    queryKey: PortfolioQueryKeys.facilities,
    queryFn:  getPortfolio,
    // Facilities change on institution action (stage advance), not borrower
    // action, so there's nothing in this app to invalidate on. A modest
    // staleTime keeps it fresh across navigations without polling.
    staleTime: 60_000,
    retry: false,
  });
}
