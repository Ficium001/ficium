// src/individual/money/portfolio/api/portfolio.ts
//
// The borrower's deals, from this side's own copy of each deal's progress (deal.progress_updated, contract
// 1.7+), served by /api/request-actions?action=portfolio. No direct link to the portal: this used to call
// ficium-portal-api from the browser, which verified this app's login there and compared a raw account id
// with a hashed one, so it never returned anything.

import { supabase } from "@/shared/lib/supabase";
import type { Facility, FacilityStage } from "@/individual/money/portfolio/types";


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
  const { data: { session } } = await supabase.auth.getSession();
  const resp = await fetch("/api/request-actions?action=portfolio", {
    headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
  });
  if (!resp.ok) throw new Error(`Could not load your portfolio (${resp.status}).`);
  const json = (await resp.json()) as { data?: { facilities?: Record<string, unknown>[] } };
  return (json.data?.facilities ?? []).map(mapFacility);
}
