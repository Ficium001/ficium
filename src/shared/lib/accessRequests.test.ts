import { describe, it, expect, vi, afterEach } from "vitest";
import { submitAccessRequest, confirmAccessRequest } from "./accessRequests";

const input = {
  institution_name: "ZZ Bank", institution_type: "commercial_bank" as const, country: "MUS",
  contact_name: "Ada", contact_email: "ada@zzbank.mu",
};
const reply = (status: number, body: unknown) =>
  vi.stubGlobal("fetch", vi.fn(async () => ({ status, json: async () => body })));

afterEach(() => vi.unstubAllGlobals());

describe("institution applications", () => {
  it("posts to the portal API and returns the generic message", async () => {
    reply(202, { status: "received", message: "Check your email" });
    expect(await submitAccessRequest(input)).toEqual({ ok: true, message: "Check your email" });
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(String(url)).toMatch(/\/access-requests$/);
    expect(JSON.parse(init.body).contact_email).toBe("ada@zzbank.mu");
  });

  it("explains a rate limit and a validation error in plain words", async () => {
    reply(429, {});
    expect(await submitAccessRequest(input)).toEqual({ ok: false, error: "Too many attempts. Try again in an hour." });
    reply(422, { detail: [{ msg: "Value error, Enter a valid email address" }] });
    expect(await submitAccessRequest(input)).toEqual({ ok: false, error: "Enter a valid email address" });
  });

  it("reports an unreachable API without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network"); }));
    const r = await submitAccessRequest(input);
    expect(r.ok).toBe(false);
  });

  it("confirms a link once and surfaces a used or expired one", async () => {
    reply(200, { status: "submitted", reference: "AB12CD34EF", institution_name: "ZZ Bank" });
    expect(await confirmAccessRequest("t".repeat(43))).toEqual({ ok: true, reference: "AB12CD34EF", institution_name: "ZZ Bank" });
    reply(400, { detail: "This link is invalid or has expired. Submit the application again." });
    const bad = await confirmAccessRequest("t".repeat(43));
    expect(bad.ok).toBe(false);
  });
});
