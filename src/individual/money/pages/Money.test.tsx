import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

const snap = {
  cashSavings: 100_000, fixedDeposits: 0, investmentsValue: 50_000, propertyValue: 2_000_000,
  vehicleValue: 0, otherAssets: 0, mortgageBalance: 1_200_000, personalLoanBalance: 0,
  creditCardBalance: 20_000, vehicleLoanBalance: 0, otherLiabilities: 0,
  monthlyIncome: 80_000, monthlyExpenses: 40_000, monthlyLoanPayments: 15_000, monthlySavings: 25_000,
  totalAssets: 2_150_000, totalLiabilities: 1_220_000,
};

vi.mock("@/shared/ui", () => ({ PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/shared/ui/dashboard", () => ({ LineChart: () => <div data-testid="chart" /> }));
vi.mock("@/individual/money/networth/hooks/useSnapshot", () => ({
  useSnapshot: () => ({ data: snap, isLoading: false }),
  useUpsertSnapshot: () => ({ mutateAsync: vi.fn(async () => ({ ok: true })), isPending: false }),
  computeHealthMetrics: () => [],
}));
vi.mock("@/individual/dashboard/hooks/useDashboard", () => ({ useProfile: () => ({ data: { healthScore: 72 }, isLoading: false }) }));
vi.mock("@/individual/money/finance/hooks/useFinanceReporting", () => ({
  useNetWorthHistory: () => ({ data: [], isLoading: false }),
  useReportingCurrency: () => ({ data: "MUR", isLoading: false }),
  useSetReportingCurrency: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/individual/money/finance/hooks/useHoldings", () => ({ useHoldings: () => ({ data: [] }) }));
vi.mock("@/individual/money/finance/components/AccountsList", () => ({ default: () => <div>accounts-list</div> }));
vi.mock("@/individual/money/finance/components/HoldingsList", () => ({ default: () => <div>holdings-list</div> }));
vi.mock("@/individual/money/portfolio/hooks/usePortfolio", () => ({ usePortfolio: () => ({ data: [], isLoading: false }) }));
vi.mock("@/individual/money/tools/components/ROICalculator", () => ({ ROICalculator: () => <div>roi-calc</div> }));

import MoneyPage from "./Money";

function Where() { const l = useLocation(); return <div data-testid="where">{l.pathname + l.search}</div>; }
const renderAt = (url: string) => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes><Route path="/money" element={<><MoneyPage /><Where /></>} /></Routes>
  </MemoryRouter>,
);

describe("Money page", () => {
  it("shows one net worth headline: assets minus debts", () => {
    renderAt("/money");
    expect(screen.getByText(/930,000/)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  });

  it("opens the tab named in the URL and keeps the URL in sync", () => {
    renderAt("/money?tab=accounts");
    expect(screen.getByText("accounts-list")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Assets & debts" }));
    expect(screen.getByTestId("where").textContent).toBe("/money?tab=assets");
    expect(screen.getByText("What you owe")).toBeInTheDocument();
  });

  it("deep-links to a specific calculator", () => {
    renderAt("/money?tab=calculators&tool=roi");
    expect(screen.getByText("roi-calc")).toBeInTheDocument();
  });

  it("falls back to overview for an unknown tab", () => {
    renderAt("/money?tab=nope");
    expect(screen.getByText("Through Ficium")).toBeInTheDocument();
  });
});
