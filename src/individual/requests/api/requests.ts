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
  | "business_loan";

export type RequestStatus = "open" | "closed" | "cancelled" | "accepted" | "expired";

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
  terms: string | null;           // legacy field
  conditions: Record<string, unknown> | null;
  status: "submitted" | "accepted" | "rejected" | "expired" | "withdrawn";
  submittedAt: string;
  createdAt: string;             // alias of submittedAt for legacy compatibility
  source: "legacy" | "institution"; // which schema the bid came from
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
