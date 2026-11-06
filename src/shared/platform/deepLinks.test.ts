import { beforeEach, describe, expect, it, vi } from "vitest";

const setSession = vi.fn(async (..._a: unknown[]) => ({ error: null as null | { message: string } }));
vi.mock("@/shared/lib/supabase", () => ({ supabase: { auth: { setSession: (...a: unknown[]) => setSession(...a) } } }));
vi.mock("./endpoints", () => ({ trustedLinkOrigin: () => "https://ficium.vercel.app" }));

const { handleDeepLink } = await import("./deepLinks");

describe("handleDeepLink", () => {
  const navigate = vi.fn();
  beforeEach(() => { navigate.mockReset(); setSession.mockClear(); });

  it("routes a trusted https link in-app", async () => {
    await handleDeepLink("https://ficium.vercel.app/offers?x=1#offer-9", { navigate });
    expect(navigate).toHaveBeenCalledWith("/offers?x=1#offer-9", { replace: false });
  });

  it.each([
    "https://evil.example/offers",
    "http://ficium.vercel.app/offers",
    "ficium://offers",
    "https://ficium.vercel.app.evil.example/offers",
    "not a url",
  ])("ignores untrusted link %s", async (url) => {
    await handleDeepLink(url, { navigate });
    expect(navigate).not.toHaveBeenCalled();
    expect(setSession).not.toHaveBeenCalled();
  });

  it("exchanges a recovery link for a session and strips the tokens", async () => {
    await handleDeepLink(
      "https://ficium.vercel.app/auth/reset-password#access_token=a&refresh_token=r&type=recovery",
      { navigate },
    );
    expect(setSession).toHaveBeenCalledWith({ access_token: "a", refresh_token: "r" });
    expect(navigate).toHaveBeenCalledWith("/auth/reset-password", { replace: true });
  });

  it("sends an expired link to reset-password without a session", async () => {
    await handleDeepLink("https://ficium.vercel.app/#error=access_denied&error_code=otp_expired", { navigate });
    expect(setSession).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/auth/reset-password", { replace: true });
  });
});
