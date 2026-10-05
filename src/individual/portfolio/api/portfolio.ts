// src/individual/portfolio/api/portfolio.ts
//
// Unlike every other api/ module in this app, portfolio data does NOT live in
// the App Supabase project. Accepted facilities live in `marketplace.loan_pipeline`
// in the Institution project, which the borrower's Supabase client has no route
// to. This calls ficium-portal-api instead, which reads that table with a
// service session under an explicit consumer_id guard.
//
// Auth: we send the borrower's own Supabase access token. portal-api verifies
// it against the App project's GoTrue (`/auth/v1/user`) — see its
// app/core/app_auth.py. Nothing here is trusted client-side; the token IS the
// identity claim and the API derives consumer_id from it, never from us.

import { supabase } from "@/shared/lib/supabase";
import type { Facility, FacilityStage } from "@/individual/portfolio/types";

const API_URL = import.meta.env.VITE_PORTAL_API_URL as string | undefined;

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapStage(row: Record<string, unknown>): FacilityStage {
  return {
    position:    Number(row.position ?? 0),
    status:      row.status as FacilityStage["status"],
    // borrower_label is the institution's plain-English name for the stage;
    // the internal label is the fallback when they haven't set one.
    label:       (row.borrower_label as string | null) ?? (row.label as string) ?? "Stage",
    startedAt:   (row.started_at   as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    slaDueAt:    (row.sla_due_at   as string | null) ?? null,
    slaBreached: Boolean(row.sla_breached),
  };
}

function mapFacility(row: Record<string, unknown>): Facility {
  return {
    id:                 row.id as string,
    requestId:          row.request_id as string,
    bidId:              row.bid_id as string,
    status:             row.status as Facility["status"],
    amount:             num(row.deal_amount),
    rate:               num(row.deal_rate),
    termMonths:         num(row.deal_term_months),
    currency:           (row.currency as string | null)?.trim() || "MUR",
    productLabel:       (row.product_label as string | null) ?? null,
    institutionName:    (row.institution_name as string | null) ?? null,
    institutionLogoUrl: (row.institution_logo_url as string | null) ?? null,
    startedAt:          (row.started_at   as string | null) ?? null,
    completedAt:        (row.completed_at as string | null) ?? null,
    stages:             ((row.stages as Record<string, unknown>[]) ?? []).map(mapStage),
  };
}

export async function getPortfolio(): Promise<Facility[]> {
  if (!API_URL) {
    throw new Error("Portfolio is unavailable: VITE_PORTAL_API_URL is not configured.");
  }

  // Real getSession (not getCachedUser) — we need the access_token itself to
  // forward, not just the user id, and it must be fresh enough for the remote
  // service to accept it.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return [];

  const resp = await fetch(`${API_URL.replace(/\/$/, "")}/marketplace/borrower/portfolio`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!resp.ok) {
    if (resp.status === 401) throw new Error("Your session expired. Please sign in again.");
    throw new Error(`Could not load your portfolio (${resp.status}).`);
  }

  const body = await resp.json() as { facilities?: Record<string, unknown>[] };
  return (body.facilities ?? []).map(mapFacility);
}
