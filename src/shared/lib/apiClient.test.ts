import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted; use vi.hoisted so the mock fn exists when it runs.
const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("./supabase", () => ({ supabase: { auth: { getSession } } }));

import { apiFetch, ApiAuthError } from "./apiClient";

describe("apiFetch", () => {
  beforeEach(() => {
    getSession.mockReset();
    vi.restoreAllMocks();
  });

  it("attaches the bearer token when a session exists", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "tok123" } } });
    const fetchMock = vi.fn().mockResolvedValue(new globalThis.Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/market", { method: "POST", body: "{}" });

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer tok123");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("omits the Authorization header when signed out", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const fetchMock = vi.fn().mockResolvedValue(new globalThis.Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/intelligence");

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.has("Authorization")).toBe(false);
  });

  it("throws a typed ApiAuthError on 401/403", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
    const body = JSON.stringify({ error: "Forbidden", code: "FORBIDDEN" });
    const fetchMock = vi.fn().mockResolvedValue(new globalThis.Response(body, { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/api/kyc?action=settings")).rejects.toMatchObject({
      name: "ApiAuthError", status: 403, code: "FORBIDDEN",
    });
    await expect(apiFetch("/api/kyc?action=settings")).rejects.toBeInstanceOf(ApiAuthError);
  });
});
