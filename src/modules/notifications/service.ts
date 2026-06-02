/**
 * src/modules/notifications/service.ts
 * ─────────────────────────────────────────────────────────────
 * Notification fetching strategy — polling by default.
 *
 * WHY NOT WEBSOCKETS (for now):
 *   At 10M concurrent users, one Supabase Realtime WebSocket per user
 *   would require ~20,000 Realtime nodes. Current Supabase Realtime
 *   saturates at ~500K connections. We use polling instead.
 *
 * UPGRADE PATH (when you need <1s latency at scale):
 *   1. Swap `fetchUnreadCount` for an Ably/Pusher subscription
 *   2. Keep the rest of this file identical
 *   Only this file changes. AuthContext and hooks stay the same.
 *
 * CURRENT BEHAVIOUR:
 *   - Poll every 30 seconds when tab is visible
 *   - Poll every 5 minutes when tab is hidden (battery saving)
 *   - Instant refetch on tab focus (covers the gap)
 */
import { supabase } from "../../shared/lib/supabase";

export type NotificationCount = { unread: number };

export async function fetchUnreadCount(userId: string): Promise<NotificationCount> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) return { unread: 0 };
  return { unread: count ?? 0 };
}

export async function markAllRead(userId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
}

/** Returns the correct poll interval based on tab visibility */
export function getPollInterval(): number {
  if (typeof document === "undefined") return 30_000;
  return document.visibilityState === "visible" ? 30_000 : 5 * 60_000;
}
