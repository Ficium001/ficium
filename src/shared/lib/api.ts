/**
 * src/shared/lib/api.ts
 * ─────────────────────────────────────────────────────────────
 * Thin wrapper around fetch() for calling our own /api/* routes.
 * Injects the current Supabase access token as a Bearer header so
 * the serverless route can verify the caller (see api/_lib/auth.ts).
 *
 * Use this for every same-origin /api/* call. Do NOT hand-roll
 * fetch("/api/...") — that bypasses auth and will now 401.
 */
import { supabase } from "./supabase";

async function withAuth(init?: RequestInit): Promise<RequestInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
}

/** Authenticated fetch to a same-origin /api route. */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(path, await withAuth(init));
}

/** Authenticated JSON POST. Sets Content-Type + serialises body. */
export async function apiPost(
  path: string,
  body: unknown,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  return apiFetch(path, { ...init, method: "POST", headers, body: JSON.stringify(body) });
}

/** Authenticated GET. */
export async function apiGet(path: string, init?: RequestInit): Promise<Response> {
  return apiFetch(path, { ...init, method: "GET" });
}
