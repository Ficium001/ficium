import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression: client_vault_access_log writes failed silently for weeks (Aug 2026)
// because the result was never read. A failed audit write must now be reported.

let insertError: { code: string; message: string } | null = null;

vi.mock("@/shared/lib/supabase", () => ({
  getCachedUser: async () => ({ data: { user: { id: "u1" } } }),
  supabase: {
    from: () => ({ insert: async () => ({ error: insertError }) }),
  },
}));

import { logVaultAccess } from "./vault";

const entry = { documentId: "d1", clientId: "u1", action: "view" as const, actorId: "u1" };

describe("logVaultAccess", () => {
  let errSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { insertError = null; errSpy = vi.spyOn(console, "error").mockImplementation(() => {}); });

  it("returns true and stays quiet when the log row is written", async () => {
    expect(await logVaultAccess(entry)).toBe(true);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it("returns false and reports an audit gap when the write fails", async () => {
    insertError = { code: "42501", message: "new row violates row-level security policy" };
    expect(await logVaultAccess(entry)).toBe(false);
    expect(errSpy).toHaveBeenCalledTimes(1);
    expect(String(errSpy.mock.calls[0][0])).toContain("audit gap");
  });
});
