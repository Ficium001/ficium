import { supabase } from "@/shared/lib/supabase";
import { audit } from "@/shared/lib/audit";
import { formatProductType } from "@/shared/lib/format";
export { formatProductType } from "@/shared/lib/format";

/* ---------- Types ---------- */

export type ProductType =
  | "sme_loan"
  | "personal_loan"
  | "mortgage"
  | "fixed_deposit"
  | "savings_account"
  | "credit_card"
  | "business_account"
  | "investment_account"
  | "leasing"
  | "overdraft"
  | "business_loan"
  | "equities"
  | "unit_trust"
  | "savings_plan"
  | "government_bonds"
  | "offshore_investment"
  | "mixed_portfolio";

export type RequestStatus = "open" | "closed" | "cancelled" | "accepted" | "expired" | "rejected";

export type CreateRequestInput = {
  productType: ProductType;
  amount: number;
  purpose: string;
  preferredTermMonths: number;
  maxRate?: number;
  decisionDeadline?: string;
};

export type CreateRequestResult =
  | { ok: true; requestId: string }
  | { ok: false; error: string };

export type RequestDetail = {
  id: string;
  productType: ProductType;
  amount: number;
  purpose: string;
  preferredTermMonths: number;
  maxRate: number | null;
  decisionDeadline: string | null;
  anonymizedBrief: string;
  status: RequestStatus;
  createdAt: string;
  allocations: AllocationLine[] | null; // present only for mixed_portfolio requests
};

export type BidBenefit = {
  title:        string;
  value_display: string | null;
  is_guaranteed: boolean;
  cat_code:     string | null;
};

export type Bid = {
  id: string;
  requestId: string;
  bankId: string;
  institutionName: string;
  rate: number;
  rateType: "fixed" | "variable";
  amountOffered: number;
  termMonths: number;
  terms: string | null;
  conditions: Record<string, unknown> | null;
  status: "submitted" | "accepted" | "rejected" | "expired" | "withdrawn";
  submittedAt: string;
  createdAt: string;
  source: "legacy" | "institution";
  benefits: BidBenefit[];
};

export type Phase2Reveal = {
  institution_id:   string;
  institution_name: string;
  legal_name:       string | null;
  contact_person:   string | null;
  contact_email:    string | null;
  contact_phone:    string | null;
  logo_url:         string | null;
};

export type AcceptBidResult =
  | { ok: true;  reveal: Phase2Reveal }
  | { ok: false; error: string };


/* ---------- Summary type (used by list views + dashboard) ---------- */

export type RequestSummary = {
  id:          string;
  productType: string;
  amount:      number;
  status:      RequestStatus;
  createdAt:   string;
  bidCount:    number;
  bestRate:    number | null;
};

/* ---------- Get my requests (list) ---------- */

export async function getMyRequests(): Promise<RequestSummary[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: requests, error } = await supabase
    .from("requests")
    .select("id, product_type, amount, status, created_at")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !requests?.length) return [];

  const ids = requests.map((r) => r.id);
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";

  const bidMap = new Map<string, { count: number; bestRate: number | null }>();
  for (const id of ids) bidMap.set(id, { count: 0, bestRate: null });

  try {
    const r = await fetch("/api/request-bids-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ requestIds: ids }),
    });
    if (r.ok) {
      const json = await r.json() as { ok: boolean; data?: Record<string, Array<{ rate: number }>> };
      const bulkData = json?.ok ? json.data : null;
      if (bulkData) {
        for (const [rid, bids] of Object.entries(bulkData)) {
          const entry = bidMap.get(rid);
          if (!entry) continue;
          entry.count = bids.length;
          for (const bid of bids) {
            const rate = Number(bid.rate);
            if (entry.bestRate === null || rate < entry.bestRate) entry.bestRate = rate;
          }
        }
      }
    }
  } catch { /* bids unavailable — requests still render */ }

  return requests.map((r) => ({
    id:          r.id,
    productType: r.product_type,
    amount:      r.amount,
    status:      r.status,
    createdAt:   r.created_at,
    bidCount:    bidMap.get(r.id)?.count    ?? 0,
    bestRate:    bidMap.get(r.id)?.bestRate ?? null,
  }));
}

/* ---------- Create request ---------- */

function generateAnonymizedBrief(input: CreateRequestInput): string {
  const product = formatProductType(input.productType);
  const amount  = new Intl.NumberFormat("en-MU", {
    style: "currency", currency: "MUR", maximumFractionDigits: 0,
  }).format(input.amount);
  const parts = [
    `Mauritius client seeking ${product} of ${amount}.`,
    `Preferred term: ${input.preferredTermMonths} months.`,
  ];
  if (input.maxRate)          parts.push(`Max rate: ${input.maxRate}% APR.`);
  if (input.purpose)          parts.push(`Purpose: ${input.purpose}.`);
  if (input.decisionDeadline) parts.push(`Decision needed by ${input.decisionDeadline}.`);
  return parts.join(" ");
}

export async function createRequest(input: CreateRequestInput): Promise<CreateRequestResult> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return { ok: false, error: "Not signed in." };

  const anonymizedBrief = generateAnonymizedBrief(input);
  const { data, error } = await supabase
    .from("requests")
    .insert({
      client_id:             userId,
      product_type:          input.productType,
      amount:                input.amount,
      purpose:               input.purpose,
      preferred_term_months: input.preferredTermMonths,
      max_rate:              input.maxRate ?? null,
      decision_deadline:     input.decisionDeadline ?? null,
      anonymized_brief:      anonymizedBrief,
      status:                "open",
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not create request." };
  await audit.requestCreated(data.id, input.amount, input.productType);
  return { ok: true, requestId: data.id };
}

/* ---------- Create multi-product (basket) request ---------- */

export type AllocationMode = "client_specified" | "institution_decides";

export type AllocationLine = {
  productType: ProductType;
  amount: number | null; // null = "institution decides this line"
};

export type CreateMultiProductRequestInput = {
  totalAmount: number;
  purpose: string;
  preferredTermMonths: number;
  maxRate?: number;
  decisionDeadline?: string;
  allocationMode: AllocationMode;
  allocations: AllocationLine[]; // must have >= 2 lines
};

function generateMultiProductAnonymizedBrief(input: CreateMultiProductRequestInput): string {
  const fmt = (n: number) => new Intl.NumberFormat("en-MU", {
    style: "currency", currency: "MUR", maximumFractionDigits: 0,
  }).format(n);

  const lines = input.allocations.map(a =>
    a.amount != null
      ? `${formatProductType(a.productType)}: ${fmt(a.amount)}`
      : `${formatProductType(a.productType)}: amount at institution's discretion`
  );

  const parts = [
    `Mauritius client seeking a mixed-portfolio placement totalling ${fmt(input.totalAmount)}.`,
    `Requested split — ${lines.join("; ")}.`,
    input.allocationMode === "institution_decides"
      ? "Client is open to the institution proposing the final split."
      : "Client has specified the exact split above.",
    `Preferred term: ${input.preferredTermMonths} months.`,
  ];
  if (input.maxRate)          parts.push(`Max rate: ${input.maxRate}% APR.`);
  if (input.purpose)          parts.push(`Purpose: ${input.purpose}.`);
  if (input.decisionDeadline) parts.push(`Decision needed by ${input.decisionDeadline}.`);
  return parts.join(" ");
}

export async function createMultiProductRequest(
  input: CreateMultiProductRequestInput
): Promise<CreateRequestResult> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user?.id) return { ok: false, error: "Not signed in." };

  if (input.allocations.length < 2) {
    return { ok: false, error: "A mixed portfolio needs at least 2 products." };
  }

  const anonymizedBrief = generateMultiProductAnonymizedBrief(input);
  const { data, error } = await supabase.rpc("create_multi_product_request", {
    p_amount:                 input.totalAmount,
    p_purpose:                input.purpose,
    p_anonymized_brief:       anonymizedBrief,
    p_preferred_term_months:  input.preferredTermMonths,
    p_max_rate:               input.maxRate ?? null,
    p_decision_deadline:      input.decisionDeadline ?? null,
    p_allocation_mode:        input.allocationMode,
    p_allocations:            input.allocations.map(a => ({
      product_type: a.productType,
      amount:       a.amount,
    })),
  });

  if (error || !data) return { ok: false, error: error?.message ?? "Could not create request." };
  await audit.requestCreated(data as string, input.totalAmount, "mixed_portfolio");
  return { ok: true, requestId: data as string };
}


/* ---------- Get single request ---------- */

export async function getRequest(id: string): Promise<RequestDetail | null> {
  const { data, error } = await supabase.from("requests").select("*").eq("id", id).single();
  if (error || !data) return null;

  let allocations: AllocationLine[] | null = null;
  if (data.product_type === "mixed_portfolio") {
    const { data: allocRows } = await supabase
      .from("request_allocations")
      .select("product_type, amount")
      .eq("request_id", id)
      .order("sort_order");
    allocations = (allocRows ?? []).map(r => ({ productType: r.product_type, amount: r.amount }));
  }

  return {
    id:                  data.id,
    productType:         data.product_type,
    amount:              data.amount,
    purpose:             data.purpose,
    preferredTermMonths: data.preferred_term_months,
    maxRate:             data.max_rate,
    decisionDeadline:    data.decision_deadline,
    anonymizedBrief:     data.anonymized_brief,
    status:              data.status,
    createdAt:           data.created_at,
    allocations,
  };
}

/* ---------- Get bids for many requests at once (bulk) ---------- */
// Used to avoid an N-request waterfall on the dashboard — one call fetches
// full Bid[] for every open request, instead of useRequestBids firing
// per-request after useMyRequests resolves.

export async function getBidsForRequests(
  requestIds: string[],
): Promise<Record<string, Bid[]>> {
  if (requestIds.length === 0) return {};

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";

  try {
    const r = await fetch("/api/request-bids-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ requestIds }),
    });
    if (!r.ok) return {};

    const json = await r.json() as { ok: boolean; data?: Record<string, Array<Record<string, unknown>>> };
    const bulkData = json?.ok ? json.data : null;
    if (!bulkData) return {};

    const out: Record<string, Bid[]> = {};
    for (const [rid, bids] of Object.entries(bulkData)) {
      out[rid] = bids.map((b) => ({
        id:              b.id as string,
        requestId:       b.request_id as string,
        bankId:          b.institution_id as string,
        institutionName: (b.institution_name as string) ?? "Institution",
        rate:            Number(b.rate) || 0,
        rateType:        (b.rate_type as "fixed" | "variable") ?? "fixed",
        amountOffered:   b.amount_offered as number,
        termMonths:      b.term_months as number,
        conditions:      b.conditions as Record<string, unknown> | null,
        terms:           null,
        status:          "submitted" as const,
        submittedAt:     b.submitted_at as string,
        createdAt:       b.submitted_at as string,
        source:          "institution" as const,
        benefits:        (b.benefits as BidBenefit[]) ?? [],
      }));
    }
    return out;
  } catch {
    return {};
  }
}

/* ---------- Get bids for a request ---------- */

export async function getRequestBids(requestId: string): Promise<Bid[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";

  let data: Array<Record<string, unknown>> | null = null;
  try {
    const r = await fetch(`/api/request-bids?requestId=${encodeURIComponent(requestId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) {
      const json = await r.json();
      data = json?.ok ? json.data : null;
    }
  } catch { data = null; }

  if (!data) return [];

  return data.map((b: Record<string, unknown>) => ({
    id:              b.id as string,
    requestId:       b.request_id as string,
    bankId:          b.institution_id as string,
    institutionName: (b.institution_name as string) ?? "Institution",
    rate:            Number(b.rate) || 0,
    rateType:        (b.rate_type as "fixed" | "variable") ?? "fixed",
    amountOffered:   b.amount_offered as number,
    termMonths:      b.term_months as number,
    conditions:      b.conditions as Record<string, unknown> | null,
    terms:           null,
    status:          "submitted" as const,
    submittedAt:     b.submitted_at as string,
    createdAt:       b.submitted_at as string,
    source:          "institution" as const,
    benefits:        (b.benefits as BidBenefit[]) ?? [],
  }));
}

/* ---------- Accept a bid ---------- */

export async function acceptBid(
  bidId:     string,
  requestId: string,
): Promise<AcceptBidResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";

  try {
    const res = await fetch("/api/accept-bid", {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify({ requestId, bidId }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      return { ok: false, error: body.error ?? `HTTP ${res.status}` };
    }

    const reveal = await res.json() as Phase2Reveal;
    await audit.bidAccepted(bidId, requestId);
    return { ok: true, reveal };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
