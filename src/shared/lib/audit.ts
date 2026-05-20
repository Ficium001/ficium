import { supabase } from "./supabase";

/* ============================================================
   TYPES
   ============================================================ */

export type AuditEventType =
  | "auth"
  | "user"
  | "financial"
  | "document"
  | "admin"
  | "security"
  | "api";

export type AuditEventName =
  // Auth
  | "login"
  | "logout"
  | "login_failed"
  | "password_reset_requested"
  | "password_reset_completed"
  | "session_revoked"
  // User
  | "user_created"
  | "user_updated"
  | "role_changed"
  | "account_disabled"
  | "kyc_submitted"
  | "kyc_approved"
  | "kyc_rejected"
  // Financial
  | "financial_profile_created"
  | "financial_profile_updated"
  | "request_created"
  | "request_updated"
  | "request_cancelled"
  | "bid_placed"
  | "bid_accepted"
  | "bid_rejected"
  // Document
  | "document_uploaded"
  | "document_accessed"
  | "document_deleted"
  // Admin
  | "admin_login"
  | "bank_approved"
  | "bank_rejected"
  | "settings_changed"
  // Security
  | "suspicious_login"
  | "brute_force_detected"
  | "permission_escalation_attempt"
  | "invalid_token";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type AuditStatus = "success" | "failed" | "blocked";

export type AuditEvent = {
  eventType: AuditEventType;
  eventName: AuditEventName;
  entityType?: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  status?: AuditStatus;
  riskLevel?: RiskLevel;
  errorMessage?: string;
  endpoint?: string;
  httpMethod?: string;
};

/* ============================================================
   RISK LEVEL MAP
   Auto-assigns risk level if not provided
   ============================================================ */

const RISK_MAP: Partial<Record<AuditEventName, RiskLevel>> = {
  login: "low",
  logout: "low",
  login_failed: "medium",
  password_reset_requested: "medium",
  password_reset_completed: "medium",
  session_revoked: "high",
  user_created: "low",
  user_updated: "low",
  role_changed: "high",
  account_disabled: "high",
  kyc_submitted: "medium",
  kyc_approved: "medium",
  kyc_rejected: "medium",
  financial_profile_created: "low",
  financial_profile_updated: "low",
  request_created: "low",
  request_updated: "low",
  request_cancelled: "low",
  bid_placed: "low",
  bid_accepted: "medium",
  bid_rejected: "low",
  document_uploaded: "medium",
  document_accessed: "medium",
  document_deleted: "high",
  admin_login: "high",
  bank_approved: "high",
  bank_rejected: "high",
  settings_changed: "high",
  suspicious_login: "critical",
  brute_force_detected: "critical",
  permission_escalation_attempt: "critical",
  invalid_token: "high",
};

/* ============================================================
   DEVICE DETECTION
   ============================================================ */

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/i.test(ua)) return "mobile";
  return "desktop";
}

/* ============================================================
   CORE LOG FUNCTION
   ============================================================ */

/**
 * logAudit — fire-and-forget audit event logger.
 * Never throws — audit failures must not break user flows.
 */
export async function logAudit(event: AuditEvent): Promise<void> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id ?? null;

    // Get user role from metadata if available (avoids extra DB round-trip)
    const userRole = authData.user?.user_metadata?.role ?? null;

    const riskLevel = event.riskLevel ?? RISK_MAP[event.eventName] ?? "low";

    await supabase.from("audit_logs").insert({
      user_id: userId,
      user_role: userRole,
      event_type: event.eventType,
      event_name: event.eventName,
      entity_type: event.entityType ?? null,
      entity_id: event.entityId ?? null,
      old_value: event.oldValue ?? null,
      new_value: event.newValue ?? null,
      status: event.status ?? "success",
      risk_level: riskLevel,
      error_message: event.errorMessage ?? null,
      endpoint: event.endpoint ?? null,
      http_method: event.httpMethod ?? null,
      user_agent: navigator.userAgent,
      device_type: getDeviceType(),
    });
  } catch {
    // Silent fail — audit must never break user flows
    console.warn("[audit] Failed to log event:", event.eventName);
  }
}

/* ============================================================
   CONVENIENCE WRAPPERS
   ============================================================ */

export const audit = {
  login: () =>
    logAudit({ eventType: "auth", eventName: "login" }),

  loginFailed: (errorMessage: string) =>
    logAudit({ eventType: "auth", eventName: "login_failed", status: "failed", errorMessage, riskLevel: "medium" }),

  logout: () =>
    logAudit({ eventType: "auth", eventName: "logout" }),

  passwordResetRequested: (email: string) =>
    logAudit({ eventType: "auth", eventName: "password_reset_requested", newValue: { email } }),

  passwordResetCompleted: () =>
    logAudit({ eventType: "auth", eventName: "password_reset_completed" }),

  kycSubmitted: (userId: string) =>
    logAudit({ eventType: "user", eventName: "kyc_submitted", entityType: "user", entityId: userId }),

  financialProfileCreated: (userId: string) =>
    logAudit({ eventType: "financial", eventName: "financial_profile_created", entityType: "user", entityId: userId }),

  financialProfileUpdated: (userId: string) =>
    logAudit({ eventType: "financial", eventName: "financial_profile_updated", entityType: "user", entityId: userId }),

  requestCreated: (requestId: string, amount: number, productType: string) =>
    logAudit({
      eventType: "financial",
      eventName: "request_created",
      entityType: "request",
      entityId: requestId,
      newValue: { amount, productType },
    }),

  bidPlaced: (bidId: string, requestId: string, rate: number) =>
    logAudit({
      eventType: "financial",
      eventName: "bid_placed",
      entityType: "bid",
      entityId: bidId,
      newValue: { requestId, rate },
    }),

  bidAccepted: (bidId: string, requestId: string) =>
    logAudit({
      eventType: "financial",
      eventName: "bid_accepted",
      entityType: "bid",
      entityId: bidId,
      newValue: { requestId },
      riskLevel: "medium",
    }),

  documentUploaded: (userId: string, docType: "id" | "selfie") =>
    logAudit({
      eventType: "document",
      eventName: "document_uploaded",
      entityType: "document",
      entityId: userId,
      newValue: { docType },
    }),

  bankApproved: (bankUserId: string) =>
    logAudit({
      eventType: "admin",
      eventName: "bank_approved",
      entityType: "bank",
      entityId: bankUserId,
      riskLevel: "high",
    }),

  suspiciousLogin: (reason: string) =>
    logAudit({
      eventType: "security",
      eventName: "suspicious_login",
      status: "blocked",
      errorMessage: reason,
      riskLevel: "critical",
    }),
};