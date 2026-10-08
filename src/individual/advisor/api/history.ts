/**
 * @module advisor/api/history
 * @description
 *   Persistence for FICO's conversation. Reads/writes `public.advisor_messages`
 *   straight from the browser; owner-only RLS scopes every call to the
 *   signed-in user, so no user id is ever trusted from the client.
 *
 * @owner Ficium Engineering
 */

import { supabase } from "@/shared/lib/supabase";

export type StoredMessage = {
  id:        string;
  role:      "user" | "assistant";
  content:   string;
  createdAt: string;
};

const TABLE = "advisor_messages";

/** Most recent `limit` messages, returned oldest → newest. Never throws. */
export async function loadHistory(limit = 50): Promise<StoredMessage[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("id, role, content, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return (data as Array<{ id: string; role: "user" | "assistant"; content: string; created_at: string }>)
      .map((r) => ({ id: r.id, role: r.role, content: r.content, createdAt: r.created_at }))
      .reverse();
  } catch {
    return [];
  }
}

/**
 * Appends one exchange. Timestamps are set explicitly so the pair keeps its
 * order (a single INSERT would otherwise give both rows the same now()).
 * Best-effort: a failed save must never break the conversation.
 */
export async function saveExchange(userText: string, assistantText: string, userSentAt: number): Promise<void> {
  if (!userText.trim() || !assistantText.trim()) return;
  try {
    await supabase.from(TABLE).insert([
      { role: "user",      content: userText.slice(0, 8000),      created_at: new Date(userSentAt).toISOString() },
      { role: "assistant", content: assistantText.slice(0, 8000), created_at: new Date(Math.max(Date.now(), userSentAt + 1)).toISOString() },
    ]);
  } catch { /* best-effort */ }
}

/** Deletes the signed-in user's entire FICO history. */
export async function clearHistory(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .gte("created_at", "1970-01-01T00:00:00Z");
    return !error;
  } catch {
    return false;
  }
}
