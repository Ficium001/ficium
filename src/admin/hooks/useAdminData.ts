// =============================================================
// Ficium 3 — Admin Panel Hooks
// TanStack Query hooks for all admin panel data.
// Reads from institution.*, admin.*, and public.* schemas.
// =============================================================
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { institutionDb, adminDb, publicDb } from "../lib/adminSupabase";

// ── Query keys ────────────────────────────────────────────────
export const AQK = {
  institutions:    ["admin", "institutions"]    as const,
  institution:     (id: string) => ["admin", "institution", id] as const,
  products:        ["admin", "products"]        as const,
  productFamilies: ["admin", "product-families"] as const,
  auditEvents:     ["admin", "audit-events"]    as const,
  pendingApprovals:["admin", "pending-approvals"] as const,
  webhookStats:    ["admin", "webhook-stats"]   as const,
  platformConfig:  ["admin", "platform-config"] as const,
} as const;

// ── Institution types ─────────────────────────────────────────
export interface AdminInstitution {
  id:                    string;
  name:                  string;
  legal_name:            string;
  institution_type:      string;
  deployment_model:      string;
  onboarding_stage:      string;
  compliance_status:     string;
  approved:              boolean;
  suspended_at:          string | null;
  modules:               string[];
  primary_contact_email: string | null;
  primary_contact_name:  string | null;
  created_at:            string;
  approved_at:           string | null;
  user_count?:           number;
  active_webhooks?:      number;
  total_bids?:           number;
  pending_actions?:      number;
  enabled_products?:     number;
}

export interface AdminProduct {
  id:          string;
  family_id:   string;
  code:        string;
  label:       string;
  description: string | null;
  active:      boolean;
  sort_order:  number;
  family_label?: string;
  rate_config?: {
    min_rate: number | null;
    max_rate: number | null;
    min_amount: number | null;
    max_amount: number | null;
  };
}

export interface AdminAuditEvent {
  id:               string;
  institution_id:   string | null;
  institution_name: string | null;
  actor_id:         string | null;
  actor_type:       string;
  actor_role:       string | null;
  action_category:  string | null;
  event_label:      string;
  resource_type:    string | null;
  resource_id:      string | null;
  outcome:          string;
  outcome_note:     string | null;
  actor_ip:         string | null;
  created_at:       string;
}

export interface PendingApproval {
  id:               string;
  action_category:  string;
  action_status:    string;
  maker_id:         string;
  maker_role:       string;
  institution_id:   string | null;
  institution_name: string | null;
  resource_type:    string;
  resource_id:      string | null;
  payload:          Record<string, unknown>;
  expires_at:       string;
  initiated_at:     string;
  expiring_soon:    boolean;
}

export interface PlatformConfig {
  id:          string;
  key:         string;
  value:       unknown;
  description: string | null;
  updated_at:  string;
}

// ── useAdminInstitutions ──────────────────────────────────────
export function useAdminInstitutions() {
  return useQuery<AdminInstitution[]>({
    queryKey: AQK.institutions,
    queryFn: async () => {
      // Use admin.institution_overview view — pre-joined with stats
      const { data, error } = await adminDb
        .from("institution_overview")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminInstitution[];
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// ── useApproveInstitution ─────────────────────────────────────
export function useApproveInstitution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, modules }: { id: string; modules: string[] }) => {
      // In production this goes through submit_for_approval() RPC
      // For admin actions, ficium_admin role can call approve_action() directly
      const { error } = await institutionDb.rpc("approve_action", {
        p_action_id: id,
        p_note: "Approved by Ficium admin",
      });
      if (error) {
        // Fallback: direct update for admin role
        const { error: updateErr } = await institutionDb
          .from("institutions")
          .update({
            approved:         true,
            onboarding_stage: "approved",
            approved_at:      new Date().toISOString(),
            modules,
          })
          .eq("id", id);
        if (updateErr) throw updateErr;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: AQK.institutions }),
  });
}

// ── useSuspendInstitution ─────────────────────────────────────
export function useSuspendInstitution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await institutionDb
        .from("institutions")
        .update({ suspended_at: new Date().toISOString(), suspension_reason: reason })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: AQK.institutions }),
  });
}

// ── useUpdateModules ──────────────────────────────────────────
export function useUpdateModules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, modules }: { id: string; modules: string[] }) => {
      const { error } = await institutionDb
        .from("institutions")
        .update({ modules })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: AQK.institutions }),
  });
}

// ── useAdminProducts ──────────────────────────────────────────
export function useAdminProducts() {
  return useQuery<AdminProduct[]>({
    queryKey: AQK.products,
    queryFn: async () => {
      const { data, error } = await institutionDb
        .from("products")
        .select("*, product_families(label), product_rate_config(*)")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map((p: Record<string, unknown>) => ({
        ...p,
        family_label: (p.product_families as { label: string } | null)?.label,
        rate_config:  p.product_rate_config,
      })) as AdminProduct[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── useToggleProduct ──────────────────────────────────────────
export function useToggleProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await institutionDb
        .from("products")
        .update({ active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: AQK.products }),
  });
}

// ── useAdminAudit ─────────────────────────────────────────────
export function useAdminAudit(limit = 100) {
  return useQuery<AdminAuditEvent[]>({
    queryKey: [...AQK.auditEvents, limit],
    queryFn: async () => {
      // Use admin.unified_audit view — cross-schema audit
      const { data, error } = await adminDb
        .from("unified_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AdminAuditEvent[];
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}

// ── useAdminPendingApprovals ──────────────────────────────────
export function useAdminPendingApprovals() {
  return useQuery<PendingApproval[]>({
    queryKey: AQK.pendingApprovals,
    queryFn: async () => {
      const { data, error } = await adminDb
        .from("pending_approvals")
        .select("*")
        .order("expires_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PendingApproval[];
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}

// ── usePlatformConfig ─────────────────────────────────────────
export function usePlatformConfig() {
  return useQuery<PlatformConfig[]>({
    queryKey: AQK.platformConfig,
    queryFn: async () => {
      const { data, error } = await adminDb
        .from("platform_config")
        .select("*")
        .order("key");
      if (error) throw error;
      return (data ?? []) as PlatformConfig[];
    },
    staleTime: 60 * 1000,
  });
}

// ── useUpdatePlatformConfig ───────────────────────────────────
export function useUpdatePlatformConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { error } = await adminDb
        .from("platform_config")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: AQK.platformConfig }),
  });
}
