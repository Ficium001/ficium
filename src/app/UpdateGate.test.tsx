import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import type { UpdateCheck } from "@/shared/platform";

const platform = vi.hoisted(() => ({
  native: true,
  result: { required: false } as UpdateCheck,
  stateListener: null as ((active: boolean) => void) | null,
  checkForRequiredUpdate: vi.fn(),
  openStoreListing: vi.fn(),
}));

vi.mock("@/shared/platform", () => ({
  isNativeApp: () => platform.native,
  checkForRequiredUpdate: platform.checkForRequiredUpdate,
  openStoreListing: platform.openStoreListing,
  onAppStateChange: (listener: (active: boolean) => void) => {
    platform.stateListener = listener;
    return () => { platform.stateListener = null; };
  },
}));

import { UpdateGate } from "./UpdateGate";

const PLAY = "https://play.google.com/store/apps/details?id=net.ficium.app";

async function renderGate() {
  await act(async () => {
    render(<UpdateGate><p>the app</p></UpdateGate>);
  });
}

describe("UpdateGate", () => {
  beforeEach(() => {
    platform.native = true;
    platform.result = { required: false };
    platform.stateListener = null;
    platform.checkForRequiredUpdate.mockReset().mockImplementation(() => Promise.resolve(platform.result));
    platform.openStoreListing.mockReset();
    vi.useRealTimers();
  });

  it("does nothing in a browser", async () => {
    platform.native = false;
    await renderGate();
    expect(screen.getByText("the app")).toBeTruthy();
    expect(platform.checkForRequiredUpdate).not.toHaveBeenCalled();
  });

  it("shows the app when the installed version is supported", async () => {
    await renderGate();
    expect(screen.getByText("the app")).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("replaces the app with the update screen when an update is required", async () => {
    platform.result = { required: true, storeUrl: PLAY };
    await renderGate();
    expect(screen.queryByText("the app")).toBeNull();
    expect(screen.getByRole("alertdialog").textContent).toMatch(/update ficium to continue/i);
    screen.getByRole("button", { name: /update now/i }).click();
    expect(platform.openStoreListing).toHaveBeenCalledWith(PLAY);
  });

  it("blocks without a button when there is no safe store link", async () => {
    platform.result = { required: true, storeUrl: null };
    await renderGate();
    expect(screen.queryByText("the app")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("alertdialog").textContent).toMatch(/app store/i);
  });

  it("re-checks on return to the foreground, but not more than every 10 minutes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-16T10:00:00Z"));
    await renderGate();
    expect(platform.checkForRequiredUpdate).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-11-16T10:05:00Z"));
    await act(async () => { platform.stateListener?.(true); });
    expect(platform.checkForRequiredUpdate).toHaveBeenCalledTimes(1);

    platform.result = { required: true, storeUrl: PLAY };
    vi.setSystemTime(new Date("2026-11-16T10:11:00Z"));
    await act(async () => { platform.stateListener?.(false); });
    expect(platform.checkForRequiredUpdate).toHaveBeenCalledTimes(1);
    await act(async () => { platform.stateListener?.(true); });
    expect(platform.checkForRequiredUpdate).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });
});
