import { describe, it, expect, vi } from "vitest";
import { serviceKeyFor, PRODUCTION_SUPABASE_REF } from "./env";

const PROD = `https://${PRODUCTION_SUPABASE_REF}.supabase.co`;

describe("serviceKeyFor", () => {
  it("gives production its key", () => {
    expect(serviceKeyFor("production", PROD, "svc")).toBe("svc");
  });
  it("refuses the key to a preview pointed at the production DB", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(serviceKeyFor("preview", PROD, "svc")).toBe("");
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
  it("lets a preview use a separate staging project", () => {
    expect(serviceKeyFor("preview", "https://stagingref.supabase.co", "svc")).toBe("svc");
  });
  it("works locally (no VERCEL_ENV)", () => {
    expect(serviceKeyFor("", PROD, "svc")).toBe("svc");
  });
  it("missing key stays missing", () => {
    expect(serviceKeyFor("production", PROD, "")).toBe("");
  });
});
