// src/individual/networth/hooks/useSnapshot.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSnapshot, upsertSnapshot, type FinancialSnapshot, type SnapshotInput } from "@/individual/networth/api/snapshot";
import { DashboardQueryKeys } from "@/individual/dashboard/hooks/useDashboard";

export type { FinancialSnapshot, SnapshotInput };

const QK_SNAPSHOT = ["financial_snapshot"] as const;

export function useSnapshot() {
  return useQuery({
    queryKey: QK_SNAPSHOT,
    queryFn:  getSnapshot,
    staleTime: 5 * 60_000,
  });
}

export function useUpsertSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertSnapshot,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_SNAPSHOT });
      // Also invalidate profile so net worth updates in dashboard
      qc.invalidateQueries({ queryKey: DashboardQueryKeys.profile });
    },
  });
}

// ── Derived health metrics ────────────────────────────────────
export type HealthMetric = {
  label:       string;
  value:       string;
  score:       number;   // 0–100
  status:      "good" | "fair" | "poor";
  description: string;
  action:      string | null;
};

export function computeHealthMetrics(s: FinancialSnapshot, healthScore: number | null): HealthMetric[] {
  const dti = s.debtToIncomeRatio;
  const savingsRate = s.monthlyIncome > 0
    ? (s.monthlySavings / s.monthlyIncome) * 100
    : 0;
  const liquidityMonths = s.monthlyExpenses > 0
    ? s.cashSavings / s.monthlyExpenses
    : 0;
  const loanToIncome = s.monthlyIncome > 0
    ? (s.monthlyLoanPayments / s.monthlyIncome) * 100
    : 0;

  return [
    {
      label:       "Debt-to-Income Ratio",
      value:       `${dti.toFixed(1)}%`,
      score:       dti <= 20 ? 100 : dti <= 30 ? 80 : dti <= 40 ? 60 : dti <= 50 ? 40 : 20,
      status:      dti <= 30 ? "good" : dti <= 45 ? "fair" : "poor",
      description: `Your total debt is ${dti.toFixed(1)}% of your annual income. Banks prefer below 40%.`,
      action:      dti > 40 ? "Focus on reducing high-interest debt first." : null,
    },
    {
      label:       "Monthly Loan Burden",
      value:       `${loanToIncome.toFixed(1)}% of income`,
      score:       loanToIncome <= 20 ? 100 : loanToIncome <= 30 ? 75 : loanToIncome <= 40 ? 50 : 25,
      status:      loanToIncome <= 25 ? "good" : loanToIncome <= 35 ? "fair" : "poor",
      description: `You spend ${loanToIncome.toFixed(1)}% of monthly income on loan repayments. The safe threshold is 35%.`,
      action:      loanToIncome > 35 ? "Consider refinancing to a lower rate." : null,
    },
    {
      label:       "Emergency Fund",
      value:       `${liquidityMonths.toFixed(1)} months`,
      score:       liquidityMonths >= 6 ? 100 : liquidityMonths >= 3 ? 70 : liquidityMonths >= 1 ? 40 : 10,
      status:      liquidityMonths >= 6 ? "good" : liquidityMonths >= 3 ? "fair" : "poor",
      description: `Your cash savings cover ${liquidityMonths.toFixed(1)} months of expenses. Aim for 6+ months.`,
      action:      liquidityMonths < 3 ? `Save Rs ${Math.round((3 - liquidityMonths) * s.monthlyExpenses).toLocaleString()} more to reach 3 months.` : null,
    },
    {
      label:       "Savings Rate",
      value:       `${savingsRate.toFixed(1)}%`,
      score:       savingsRate >= 20 ? 100 : savingsRate >= 10 ? 70 : savingsRate >= 5 ? 40 : 10,
      status:      savingsRate >= 15 ? "good" : savingsRate >= 8 ? "fair" : "poor",
      description: `You save ${savingsRate.toFixed(1)}% of your income monthly. The recommended target is 20%.`,
      action:      savingsRate < 10 ? `Increase monthly savings by Rs ${Math.round(s.monthlyIncome * 0.1 - s.monthlySavings).toLocaleString()}.` : null,
    },
    {
      label:       "Net Worth",
      value:       `Rs ${s.netWorth.toLocaleString()}`,
      score:       s.netWorth > 0 ? Math.min(100, Math.round((s.netWorth / Math.max(s.monthlyIncome * 12, 1)) * 20)) : 0,
      status:      s.netWorth >= s.monthlyIncome * 12 ? "good" : s.netWorth >= 0 ? "fair" : "poor",
      description: `Assets of Rs ${s.totalAssets.toLocaleString()} minus liabilities of Rs ${s.totalLiabilities.toLocaleString()}.`,
      action:      s.netWorth < 0 ? "Your liabilities exceed your assets. Focus on debt reduction." : null,
    },
    {
      label:       "Overall Health Score",
      value:       healthScore != null ? `${healthScore}/100` : "—",
      score:       healthScore ?? 0,
      status:      (healthScore ?? 0) >= 70 ? "good" : (healthScore ?? 0) >= 50 ? "fair" : "poor",
      description: "Ficium's composite score based on all your financial indicators.",
      action:      (healthScore ?? 0) < 70 ? "Complete your financial profile to improve your score." : null,
    },
  ];
}
