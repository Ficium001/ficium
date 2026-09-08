// src/individual/portfolio/types/index.ts

/** Lifecycle of an accepted facility, mirrors marketplace.loan_pipeline.status. */
export type FacilityStatus = "active" | "completed" | "withdrawn" | "declined";

/** Stage progress state, mirrors marketplace.pipeline_stage_instance.status. */
export type StageStatus =
  | "pending"
  | "active"
  | "awaiting_approval"
  | "completed"
  | "skipped"
  | "blocked";

export interface FacilityStage {
  position:      number;
  status:        StageStatus;
  /** Borrower-friendly stage name where the institution set one; falls back to the internal label. */
  label:         string;
  startedAt:     string | null;
  completedAt:   string | null;
  slaDueAt:      string | null;
  slaBreached:   boolean;
}

export interface Facility {
  id:                  string;
  requestId:           string;
  bidId:               string;
  status:              FacilityStatus;
  amount:              number | null;
  /** Annual rate as a percentage, e.g. 7.5 — not a decimal fraction. */
  rate:                number | null;
  termMonths:          number | null;
  currency:            string;
  productLabel:        string | null;
  institutionName:     string | null;
  institutionLogoUrl:  string | null;
  startedAt:           string | null;
  completedAt:         string | null;
  stages:              FacilityStage[];
}
