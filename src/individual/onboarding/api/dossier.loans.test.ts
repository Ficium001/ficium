import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression: loans used to be replaced by DELETE then INSERT as two calls with
// the delete unchecked, so a failed insert wiped the user's existing loans.
// They must now go through ONE atomic RPC, and a failure must be reported.

const calls: string[] = [];
let rpcResult: { error: { message: string } | null } = { error: null };

vi.mock("@/shared/lib/supabase", () => {
  const table = (name: string) => ({
    upsert: async () => { calls.push(`upsert:${name}`); return { error: null }; },
    insert: async () => { calls.push(`insert:${name}`); return { error: null }; },
    delete: () => { calls.push(`delete:${name}`); return { eq: async () => ({ error: null }) }; },
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
  });
  return {
    getCachedUser: async () => ({ data: { user: { id: "user-1" } } }),
    supabase: {
      from: (name: string) => table(name),
      rpc: async (fn: string, args: unknown) => { calls.push(`rpc:${fn}:${JSON.stringify(args)}`); return rpcResult; },
    },
  };
});
vi.mock("@/shared/lib/audit", () => ({ audit: new Proxy({}, { get: () => () => {} }) }));

import { submitDossier, type DossierInput } from "./dossier";

const input: DossierInput = {
  employmentStatus: "employed", monthlyIncome: 80000, additionalIncome: 0,
  employmentDetails: {},
  assets: { savings: 0, investments: 0, propertyValue: 0, vehicleValue: 0, businessAssets: 0, otherAssets: 0 },
  hasExistingLoans: true,
  loans: [{ loanType: "personal", outstandingAmount: 100000, monthlyRepayment: 5000, bankName: "Bank A", remainingMonths: 24 }],
  compliance: { isPep: false, taxResidency: "MU", missedRepayments: false, blacklisted: false, bankruptcy: false, legalDisputes: false },
};

describe("submitDossier loans", () => {
  beforeEach(() => { calls.length = 0; rpcResult = { error: null }; });

  it("replaces loans through one RPC and never touches the table directly", async () => {
    await submitDossier(input);
    const rpc = calls.filter((c) => c.startsWith("rpc:replace_client_loans"));
    expect(rpc).toHaveLength(1);
    expect(rpc[0]).toContain('"loan_type":"personal"');
    expect(calls).not.toContain("delete:client_loan_details");
    expect(calls).not.toContain("insert:client_loan_details");
  });

  it("clears loans through the same RPC when the user has none", async () => {
    await submitDossier({ ...input, hasExistingLoans: false, loans: [] });
    expect(calls.filter((c) => c.startsWith("rpc:replace_client_loans"))[0]).toContain('"p_loans":[]');
  });

  it("reports a loan failure instead of continuing", async () => {
    rpcResult = { error: { message: "boom" } };
    const res = await submitDossier(input);
    expect(res).toEqual({ ok: false, error: "Loans: boom" });
    expect(calls.some((c) => c.startsWith("upsert:compliance_details"))).toBe(false);
  });
});
