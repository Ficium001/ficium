/**
 * The signed-in borrower's own account: closure status and closing it.
 * The server does the work and the checks (api/account.ts); this only carries
 * the request with a session token.
 */
import { supabase } from "@/shared/lib/supabase";
import { apiUrl } from "@/shared/platform";

export interface ClosureStatus {
  closureAvailable: boolean;
  retentionYears: number | null;
}

export type CloseAccountResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

async function token(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

export async function getClosureStatus(): Promise<ClosureStatus> {
  const res = await fetch(apiUrl("/api/account"), {
    headers: { Authorization: `Bearer ${await token()}` },
  });
  const body = await res.json().catch(() => null) as { ok?: boolean; data?: ClosureStatus } | null;
  if (!res.ok || !body?.ok || !body.data) throw new Error(`HTTP ${res.status}`);
  return body.data;
}

/**
 * Proves the password again: the server only closes an account for a session
 * whose password was entered in the last few minutes.
 */
export async function reauthenticate(email: string, password: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

export async function closeAccount(): Promise<CloseAccountResult> {
  try {
    const res = await fetch(apiUrl("/api/account"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ action: "close" }),
    });
    const body = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; code?: string };
    if (res.ok && body.ok) return { ok: true };
    return {
      ok: false,
      code: body.code ?? `HTTP_${res.status}`,
      message: body.error ?? "We couldn't close your account. Please try again.",
    };
  } catch {
    return { ok: false, code: "NETWORK", message: "No connection. Check your internet and try again." };
  }
}
