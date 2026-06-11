// =============================================================
// Ficium Admin — KYC Review Hooks
// TanStack Query hooks for the admin KYC review dashboard.
// Reads from public.clients + public.storage (signed URLs).
// =============================================================
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPost, apiGet } from "@/shared/lib/api";
import { supabase } from "../../shared/lib/supabase";

export const KQK = {
  queue:    ["admin", "kyc", "queue"]    as const,
  detail:   (id: string) => ["admin", "kyc", "detail", id] as const,
  stats:    ["admin", "kyc", "stats"]    as const,
} as const;

/* ---------- Types ---------- */

export type KycStatus = "pending_review" | "verified" | "rejected" | "not_submitted";

export interface KycQueueItem {
  id:                    string;
  email:                 string;
  full_name:             string | null;
  kyc_status:            KycStatus;
  kyc_provider:          string | null;
  kyc_risk_score:        number | null;
  kyc_submitted_at:      string | null;
  id_document_type:      string | null;
  id_document_number:    string | null;
  date_of_birth:         string | null;
  address_line_1:        string | null;
  address_line_2:        string | null;
  city:                  string | null;
  postal_code:           string | null;
  country:               string | null;
  id_document_path:      string | null;
  selfie_path:           string | null;
  proof_of_address_path: string | null;
  admin_review_note:     string | null;
  reviewed_by:           string | null;
  reviewed_at:           string | null;
  created_at:            string;
}

export interface KycStats {
  total:        number;
  pending:      number;
  verified:     number;
  rejected:     number;
  avgRiskScore: number | null;
}

/* ---------- Signed URL helper ---------- */

export async function getSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from("kyc-documents")
    .createSignedUrl(path, 60 * 10); // 10 min expiry
  return data?.signedUrl ?? null;
}

/* ---------- Email notification ---------- */

async function sendKycEmail(
  userId:   string,
  decision: "approved" | "rejected",
  note?:    string
): Promise<void> {
  try {
    await apiPost("/api/kyc-admin?action=notify", { userId, decision, note });
  } catch (err) {
    // Email failure should never block the admin action
    console.error("[KYC] Email notification failed:", err);
  }
}

/* ---------- Hooks ---------- */

export function useKycQueue(statusFilter: KycStatus | "all" = "pending_review") {
  return useQuery<KycQueueItem[]>({
    queryKey: [...KQK.queue, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("clients")
        .select(`
          id, email, full_name,
          kyc_status, kyc_provider, kyc_risk_score, kyc_submitted_at,
          id_document_type, id_document_number, date_of_birth,
          address_line_1, address_line_2, city, postal_code, country,
          id_document_path, selfie_path, proof_of_address_path,
          admin_review_note, reviewed_by, reviewed_at, created_at
        `)
        .order("kyc_submitted_at", { ascending: true });

      if (statusFilter !== "all") {
        q = q.eq("kyc_status", statusFilter);
      } else {
        q = q.in("kyc_status", ["pending_review", "verified", "rejected"]);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as KycQueueItem[];
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useKycStats() {
  return useQuery<KycStats>({
    queryKey: KQK.stats,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("kyc_status, kyc_risk_score")
        .in("kyc_status", ["pending_review", "verified", "rejected"]);
      if (error) throw error;
      const rows = data ?? [];
      const scores = rows
        .map((r: { kyc_risk_score: number | null }) => r.kyc_risk_score)
        .filter((s): s is number => s !== null);
      return {
        total:        rows.length,
        pending:      rows.filter((r: { kyc_status: string }) => r.kyc_status === "pending_review").length,
        verified:     rows.filter((r: { kyc_status: string }) => r.kyc_status === "verified").length,
        rejected:     rows.filter((r: { kyc_status: string }) => r.kyc_status === "rejected").length,
        avgRiskScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      };
    },
    staleTime: 20_000,
    refetchInterval: 60_000,
  });
}

export function useApproveKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, note }: { userId: string; note?: string }) => {
      const { error } = await supabase
        .from("clients")
        .update({
          kyc_status:        "verified",
          admin_review_note: note ?? null,
          reviewed_at:       new Date().toISOString(),
        })
        .eq("id", userId);
      if (error) throw error;

      // Send approval email (non-blocking)
      await sendKycEmail(userId, "approved", note);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KQK.queue });
      qc.invalidateQueries({ queryKey: KQK.stats });
    },
  });
}

export function useRejectKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase
        .from("clients")
        .update({
          kyc_status:        "rejected",
          admin_review_note: reason,
          reviewed_at:       new Date().toISOString(),
        })
        .eq("id", userId);
      if (error) throw error;

      // Send rejection email with reason (non-blocking)
      await sendKycEmail(userId, "rejected", reason);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KQK.queue });
      qc.invalidateQueries({ queryKey: KQK.stats });
    },
  });
}
