// =============================================================
// Ficium — request chat data layer
//
// Chat is scoped per lender: one thread per (request_id, institution_id).
// Before any bid is accepted the marketplace is still anonymous, so both
// sides may only send messages drawn from `request_message_template` —
// free text is an identity-leak channel ("I already bank with you,
// account 1234…"). Free text unlocks for the winning lender once their
// bid is accepted, at which point identity is revealed anyway.
//
// The database enforces all of this in a BEFORE trigger, not just RLS, so
// these helpers are a convenience layer — not the security boundary.
// =============================================================
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ChatMessage {
  id: string;
  request_id: string;
  institution_id: string;
  sender_type: "institution" | "client";
  sender_id: string;
  body: string;
  kind: "structured" | "free";
  template_code: string | null;
  params: Record<string, unknown>;
  created_at: string;
}

export interface MessageTemplate {
  code: string;
  sender_type: "institution" | "client";
  label: string;
  body_template: string;
  params_schema: Record<string, unknown>;
  sort_order: number;
}

/** Templates this sender is allowed to use, in display order. */
export async function getTemplates(
  client: SupabaseClient,
  senderType: "institution" | "client",
): Promise<MessageTemplate[]> {
  const { data, error } = await client
    .from("request_message_template")
    .select("code, sender_type, label, body_template, params_schema, sort_order")
    .eq("sender_type", senderType)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MessageTemplate[];
}

/** One lender's thread on one request. */
export async function getThread(
  client: SupabaseClient,
  requestId: string,
  institutionId: string,
): Promise<ChatMessage[]> {
  const { data, error } = await client
    .from("request_messages")
    .select("*")
    .eq("request_id", requestId)
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}

/**
 * Substitute {param} placeholders in a template body.
 *
 * The rendered text is what gets stored, so the thread stays readable
 * without re-resolving templates; `template_code` and `params` are kept
 * alongside it so the structured origin is still auditable.
 */
export function renderTemplate(
  tpl: MessageTemplate,
  params: Record<string, unknown> = {},
): string {
  return tpl.body_template.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const v = params[key];
    if (v === undefined || v === null) return whole;
    return Array.isArray(v) ? v.join(", ") : String(v);
  });
}

export async function sendStructured(
  client: SupabaseClient,
  args: {
    requestId: string;
    institutionId: string;
    senderType: "institution" | "client";
    senderId: string;
    template: MessageTemplate;
    params?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await client.from("request_messages").insert({
    request_id: args.requestId,
    institution_id: args.institutionId,
    sender_type: args.senderType,
    sender_id: args.senderId,
    body: renderTemplate(args.template, args.params ?? {}),
    kind: "structured",
    template_code: args.template.code,
    params: args.params ?? {},
  });
  if (error) throw error;
}

/** Only accepted by the DB for the winning lender, post-acceptance. */
export async function sendFree(
  client: SupabaseClient,
  args: {
    requestId: string;
    institutionId: string;
    senderType: "institution" | "client";
    senderId: string;
    body: string;
  },
): Promise<void> {
  const { error } = await client.from("request_messages").insert({
    request_id: args.requestId,
    institution_id: args.institutionId,
    sender_type: args.senderType,
    sender_id: args.senderId,
    body: args.body,
    kind: "free",
  });
  if (error) throw error;
}

/**
 * Institution whose bid the borrower accepted, or null while still open.
 *
 * Read from bid_acceptances — the same table the DB trigger consults — so the
 * UI's idea of "who won" cannot drift from what the database will actually
 * permit. Borrowers can read their own rows via the client_own_acceptances
 * policy.
 */
export async function getAcceptedInstitutionId(
  client: SupabaseClient,
  requestId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("bid_acceptances")
    .select("institution_id")
    .eq("request_id", requestId)
    .maybeSingle();
  if (error) return null;
  return (data?.institution_id as string | undefined) ?? null;
}
