import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

const env = vi.hoisted(() => ({
  native: true,
  user: null as { id: string } | null,
  rpc: vi.fn(),
}));

vi.mock("@/features/auth/context/AuthContext", () => ({ useAuth: () => ({ user: env.user }) }));
vi.mock("@/shared/lib/supabase", () => ({ supabase: { rpc: env.rpc } }));
vi.mock("@/shared/platform", () => ({
  isNativeApp: () => env.native,
  getAppInfo: async () => ({ platform: "android", version: "1.2.0", build: "42" }),
}));

import { ErrorReporter, captureError, resetErrorReporter } from "./ErrorReporter";

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const mount = async () => { let view!: ReturnType<typeof render>; await act(async () => { view = render(<ErrorReporter />); }); return view; };

describe("ErrorReporter", () => {
  beforeEach(() => {
    env.native = true;
    env.user = { id: "u1" };
    env.rpc.mockReset().mockResolvedValue({ error: null });
    resetErrorReporter();
  });

  it("sends a scrubbed report with the installed version", async () => {
    await mount();
    captureError("error", new TypeError("Bad amount for jane@example.com"));
    await settle();
    expect(env.rpc).toHaveBeenCalledTimes(1);
    expect(env.rpc).toHaveBeenCalledWith("report_app_error", expect.objectContaining({
      p_platform: "android", p_version: "1.2.0", p_kind: "error",
      p_message: "TypeError: Bad amount for [email]", p_fingerprint: expect.stringMatching(/^[0-9a-f]{16}$/),
    }));
  });

  it("reports the same error once per launch, and stops after 10 distinct errors", async () => {
    await mount();
    captureError("error", new Error("same"));
    captureError("error", new Error("same"));
    await settle();
    expect(env.rpc).toHaveBeenCalledTimes(1);
    for (const word of ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"]) captureError("error", new Error(`distinct ${word}`));
    await settle(); await settle();
    expect(env.rpc).toHaveBeenCalledTimes(10);
  });

  it("holds errors from before sign-in and sends them once someone signs in", async () => {
    env.user = null;
    const view = await mount();
    captureError("rejection", new Error("early"));
    await settle();
    expect(env.rpc).not.toHaveBeenCalled();
    env.user = { id: "u1" };
    await act(async () => { view.rerender(<ErrorReporter />); });
    await settle();
    expect(env.rpc).toHaveBeenCalledTimes(1);
  });

  it("picks up uncaught errors and unhandled rejections from the window", async () => {
    await mount();
    window.dispatchEvent(new ErrorEvent("error", { error: new Error("from window") }));
    const rejection = new Event("unhandledrejection") as Event & { reason?: unknown };
    rejection.reason = new Error("from promise");
    window.dispatchEvent(rejection);
    await settle();
    expect(env.rpc.mock.calls.map((c) => c[1].p_kind)).toEqual(["error", "rejection"]);
  });

  it("never throws into the app when sending fails, and does nothing in a browser", async () => {
    env.rpc.mockRejectedValue(new Error("offline"));
    await mount();
    expect(() => captureError("error", new Error("boom"))).not.toThrow();
    await settle();

    resetErrorReporter();
    env.native = false;
    env.rpc.mockReset();
    await mount();
    captureError("error", new Error("on the web"));
    await settle();
    expect(env.rpc).not.toHaveBeenCalled();
  });
});
