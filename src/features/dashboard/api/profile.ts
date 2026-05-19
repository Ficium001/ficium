import { supabase } from "../../../shared/lib/supabase";

/* ---------- Types ---------- */

export type ProfileSummary = {
  userId: string;
  email: string;
  fullName: string | null;
  firstName: string | null;
  kycStatus: "pending" | "verified" | "rejected";
  healthScore: number | null;
  hasDossier: boolean;
};

export type RequestSummary = {
  id: string;
  productType: string;
  amount: number;
  status: "open" | "closed" | "accepted" | "expired";
  createdAt: string;
  bidCount: number;
  bestRate: number | null; // best interest_rate across bids on this request
};

/* ---------- Profile summary ---------- */

/**
 * Pull everything the dashboard greeting + stat tiles need in one go.
 * Combines the users row and the (optional) client_dossiers row.
 */
export async function getProfileSummary(): Promise<ProfileSummary | null> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return null;

  // RLS limits these to the logged-in user's own rows.
  const [{ data: user }, { data: dossier }] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, full_name, first_name, kyc_status")
      .eq("id", userId)
      .single(),
    supabase
      .from("client_dossiers")
      .select("health_score")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (!user) return null;

  return {
    userId: user.id,
    email: user.email,
    fullName: user.full_name,
    firstName: user.first_name,
    kycStatus: user.kyc_status,
    healthScore: dossier?.health_score ?? null,
    hasDossier: !!dossier,
  };
}

/* ---------- Requests summary ---------- */

/**
 * Pull the user's open + recently closed requests, with bid counts and best rate.
 * Two-query approach: get requests first, then aggregate bids per request id.
 * For a small-N client we can do this client-side; if it ever gets large
 * we'd push the aggregation into a Postgres view.
 */
export async function getMyRequests(): Promise<RequestSummary[]> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return [];

  const { data: requests, error: reqError } = await supabase
    .from("requests")
    .select("id, product_type, amount, status, created_at")
    .eq("client_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (reqError || !requests || requests.length === 0) return [];

  const ids = requests.map((r) => r.id);

  const { data: bids } = await supabase
    .from("bids")
    .select("request_id, interest_rate")
    .in("request_id", ids);

  // Aggregate by request_id
  const byRequest = new Map<string, { count: number; bestRate: number | null }>();
  for (const id of ids) byRequest.set(id, { count: 0, bestRate: null });
  for (const b of bids || []) {
    const entry = byRequest.get(b.request_id);
    if (!entry) continue;
    entry.count += 1;
    if (entry.bestRate === null || b.interest_rate < entry.bestRate) {
      entry.bestRate = b.interest_rate;
    }
  }

  return requests.map((r) => ({
    id: r.id,
    productType: r.product_type,
    amount: r.amount,
    status: r.status,
    createdAt: r.created_at,
    bidCount: byRequest.get(r.id)?.count ?? 0,
    bestRate: byRequest.get(r.id)?.bestRate ?? null,
  }));
}

/* ---------- Helpers ---------- */

export function formatMUR(amount: number): string {
  return new Intl.NumberFormat("en-MU", {
    style: "currency",
    currency: "MUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatProductType(t: string): string {
  const labels: Record<string, string> = {
    sme_loan: "SME Loan",
    personal_loan: "Personal Loan",
    mortgage: "Mortgage",
    fixed_deposit: "Fixed Deposit",
    savings_account: "Savings Account",
    credit_card: "Credit Card",
    business_account: "Business Account",
    investment_account: "Investment Account",
  };
  return labels[t] ?? t;
}