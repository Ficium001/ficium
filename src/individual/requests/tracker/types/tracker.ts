export type TrackerStageStatus =
  | "pending"
  | "active"
  | "awaiting_approval"
  | "completed"
  | "skipped";

export type PipelineStatus = "active" | "completed" | "withdrawn" | "declined";

export interface TrackerStage {
  id:           string;
  position:     number;
  status:       TrackerStageStatus;
  label:        string;
  stage_key:    string;
  started_at:   string | null;
  completed_at: string | null;
  sla_due_at:   string | null;
}

export interface LoanTracker {
  pipeline_id:      string;
  status:           PipelineStatus;
  institution_name: string;
  deal_amount:      number;
  deal_rate:        number;
  deal_term_months: number;
  started_at:       string | null;
  completed_at:     string | null;
  stages:           TrackerStage[];
}

export type LoanTrackerResponse =
  | ({ status: "pending"; stages: []; message: string })
  | LoanTracker;
