import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

const env = vi.hoisted(() => ({
  native: true,
  user: { id: "u1" } as { id: string } | null,
  app: { platform: "ios", version: "1.2.0", build: "42" } as { platform: string; version: string; build: string } | null,
  rpc: vi.fn(),
}));

vi.mock("@/features/auth/context/AuthContext", () => ({ useAuth: () => ({ user: env.user }) }));
vi.mock("@/shared/lib/supabase", () => ({ supabase: { rpc: env.rpc } }));
vi.mock("@/shared/platform", () => ({ isNativeApp: () => env.native, getAppInfo: async () => env.app }));

import { AppClientReporter, reportMarker } from "./AppClientReporter";

const mount = async () => { await act(async () => { render(<AppClientReporter />); }); };

describe("AppClientReporter", () => {
  beforeEach(() => {
    env.native = true;
    env.user = { id: "u1" };
    env.app = { platform: "ios", version: "1.2.0", build: "42" };
    env.rpc.mockReset().mockResolvedValue({ error: null });
    window.localStorage.clear();
  });

  it("reports the installed version once a borrower is signed in", async () => {
    await mount();
    expect(env.rpc).toHaveBeenCalledWith("report_app_client", { p_platform: "ios", p_version: "1.2.0", p_build: "42" });
  });

  it("reports once a day per build, and again after an update", async () => {
    await mount();
    await mount();
    expect(env.rpc).toHaveBeenCalledTimes(1);
    env.app = { platform: "ios", version: "1.3.0", build: "50" };
    await mount();
    expect(env.rpc).toHaveBeenCalledTimes(2);
  });

  it("tries again next launch when the report fails", async () => {
    env.rpc.mockResolvedValueOnce({ error: { message: "offline" } });
    await mount();
    await mount();
    expect(env.rpc).toHaveBeenCalledTimes(2);
  });

  it("does nothing when signed out or in a browser", async () => {
    env.user = null;
    await mount();
    env.user = { id: "u1" };
    env.native = false;
    await mount();
    expect(env.rpc).not.toHaveBeenCalled();
  });

  it("marks by day, platform, version and build, with nothing about the user", () => {
    expect(reportMarker({ platform: "android", version: "1.0.0", build: "7" }, new Date("2026-11-16T23:59:00Z")))
      .toBe("2026-11-16|android|1.0.0|7");
  });
});
