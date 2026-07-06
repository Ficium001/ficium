import { supabase } from "../../../shared/lib/supabase";

/* ---------- Types ---------- */

export type NotificationKind =
  | "kyc_verified"
  | "kyc_rejected"
  | "request_created"
  | "request_expiring"
  | "request_rejected"
  | "bid_received"
  | "bid_accepted"
  | "bid_expired"
  | "system";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

/* ---------- Fetch ---------- */

/**
 * Get the current user's notifications, newest first.
 * RLS limits this to rows where user_id = auth.uid().
 */
export async function getMyNotifications(limit = 50): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    link: row.link,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

/* ---------- Mark read ---------- */

export async function markAllRead(): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error; // let react-query roll back the optimistic update
}

export async function markOneRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null); // only update if still unread (idempotent)
  if (error) throw error;
}

/* ---------- Clear (delete) ---------- */

/**
 * Delete all of the current user's notifications.
 * RLS (`notifications_owner`, user_id = auth.uid()) already scopes the
 * delete; the explicit user_id filter is defence-in-depth and satisfies
 * supabase-js's requirement that DELETE carries a filter.
 */
export async function clearAllNotifications(): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Not authenticated");

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", user.id);
  if (error) throw error;
}

/* ---------- Helpers ---------- */

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}