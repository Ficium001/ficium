import { supabase } from "@/shared/lib/supabase";

/* ---------- Types ---------- */

export type InvitationPreview = {
  status: "pending" | "accepted" | "declined" | "expired" | "revoked";
  expiresAt: string;
  proposedRole: string;
  inviterFirstName: string;
  request: { productType: string; amount: number; purpose: string | null } | null;
};

export type CoupleData = {
  couple: {
    id: string;
    status: "pending_verification" | "verified" | "dissolved";
    verifiedAt: string | null;
    partner: { id: string; name: string } | null;
    relationshipDocument: {
      verification_status: "pending_ocr" | "verified" | "rejected";
      reject_reason: string | null;
      created_at: string;
    } | null;
  } | null;
  pendingInvitationsSent?: Array<{ id: string; request_id: string; invited_email: string; status: string; expires_at: string }>;
  pendingInvitationsReceived?: Array<{ id: string; request_id: string; inviter_client_id: string; status: string; expires_at: string }>;
  jointRequests?: Array<{ id: string; product_type: string; amount: number; status: string; created_at: string }>;
};

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

/* ---------- Helpers ---------- */

async function authedFetch(qs: string, init?: RequestInit): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";
  return fetch(`/api/request-actions${qs}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

/* ---------- Public preview (no auth) ---------- */

export async function previewInvitation(token: string): Promise<ApiResult<InvitationPreview>> {
  try {
    const r = await fetch(`/api/request-actions?action=invitation-preview&token=${encodeURIComponent(token)}`);
    const json = await r.json();
    if (!r.ok || !json.ok) return { ok: false, error: json.error ?? `HTTP ${r.status}` };
    return { ok: true, data: json.data as InvitationPreview };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/* ---------- Invite a co-applicant ---------- */

export async function createInvitation(input: {
  requestId: string;
  invitedEmail: string;
  proposedRole?: "co_applicant" | "guarantor";
  proposedLiability?: "joint_and_several" | "several" | "guarantor";
  proposedOwnershipBps?: number;
}): Promise<ApiResult<{ invitationId: string }>> {
  try {
    const r = await authedFetch("?action=invitation-create", {
      method: "POST",
      body: JSON.stringify(input),
    });
    const json = await r.json();
    if (!r.ok || !json.ok) return { ok: false, error: json.error ?? `HTTP ${r.status}` };
    return { ok: true, data: json.data };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/* ---------- Accept / decline ---------- */

export async function respondToInvitation(
  token: string,
  respondAction: "accept" | "decline",
): Promise<ApiResult<{ status: string; participantId?: string }>> {
  try {
    const r = await authedFetch("?action=invitation-respond", {
      method: "POST",
      body: JSON.stringify({ token, respondAction }),
    });
    const json = await r.json();
    if (!r.ok || !json.ok) return { ok: false, error: json.error ?? `HTTP ${r.status}` };
    return { ok: true, data: json.data };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/* ---------- Revoke ---------- */

export async function revokeInvitation(invitationId: string): Promise<ApiResult<{ status: string }>> {
  try {
    const r = await authedFetch("?action=invitation-revoke", {
      method: "POST",
      body: JSON.stringify({ invitationId }),
    });
    const json = await r.json();
    if (!r.ok || !json.ok) return { ok: false, error: json.error ?? `HTTP ${r.status}` };
    return { ok: true, data: json.data };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/* ---------- Fetch my couple ---------- */

export async function getCouple(): Promise<ApiResult<CoupleData>> {
  try {
    const r = await authedFetch("?action=couple");
    const json = await r.json();
    if (!r.ok || !json.ok) return { ok: false, error: json.error ?? `HTTP ${r.status}` };
    return { ok: true, data: json.data as CoupleData };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
