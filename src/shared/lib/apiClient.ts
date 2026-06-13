/**
 * @module shared/lib/apiClient
 * @description
 *   The single entry point for calling our serverless API routes.
 *   Auto-attaches the caller's Supabase access token as a Bearer header
 *   so the server-side auth gate (api/_lib/auth.ts → requireUser) can
 *   verify identity. One place to change auth transport for every call.
 *
 *   Usage:
 *     const res  = await apiFetch("/api/market", { method: "POST", body });
 *     const json = await apiJson<MyType>("/api/intelligence");
 *
 *   On 401/403 it surfaces a typed ApiAuthError so callers can react
 *   (e.g. prompt re-login) instead of silently failing.
 *
 * @owner Ficium Engineering
 */

import { supabase } from "./supabase";

export class ApiAuthError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code = "UNAUTHORIZED") {
    super(message);
    this.name = "ApiAuthError";
    this.status = status;
    this.code = code;
  }
}

/** Current access token, or null if signed out. */
async function accessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * fetch() wrapper that injects the Authorization header. Header casing and
 * existing options are preserved; callers can still pass method/body/etc.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await accessToken();
  const headers = new Headers(init.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(input, { ...init, headers });

  if (res.status === 401 || res.status === 403) {
    let code = "UNAUTHORIZED";
    let message = res.status === 403 ? "Forbidden" : "Not authenticated";
    try {
      const body = await res.clone().json();
      code = body?.code ?? code;
      message = body?.error ?? body?.message ?? message;
    } catch { /* non-JSON error body */ }
    throw new ApiAuthError(message, res.status, code);
  }

  return res;
}

/** apiFetch + JSON parse. Throws on non-OK (after the auth-error mapping above). */
export async function apiJson<T>(input: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(input, init);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
